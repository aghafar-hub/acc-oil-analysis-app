import { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Equipment from "./pages/Equipment";
import OilAnalysisReport from "./pages/OilAnalysisReport";
import ActionTracker from "./pages/ActionTracker";
import AddSample from "./pages/AddSample";
import OilChangeLog from "./pages/OilChangeLog";
import SampleTracker from "./pages/SampleTracker";
import HowToUse from "./pages/HowToUse";
import Settings from "./pages/Settings";
import { T } from "./theme";
import { loadConfig, saveConfig, readCache, writeCache } from "./config";
import * as api from "./api";

let toastId = 0;

export default function App() {
  const [config, setConfig] = useState(() => loadConfig());
  const [page, setPage] = useState("dashboard");
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const [samples, setSamples] = useState(() => readCache("samples")?.data || []);
  const [actions, setActions] = useState(() => readCache("actions")?.data || []);
  const [oilChanges, setOilChanges] = useState(() => readCache("oilChanges")?.data || []);
  const [equipmentRegistry, setEquipmentRegistry] = useState(() => readCache("equipmentRegistry")?.data || []);
  const [syncState, setSyncState] = useState("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = "info") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === "error" ? 8000 : 4000);
  }, []);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const runSync = useCallback(async () => {
    if (!config.webhookUrl) {
      pushToast("Add your Apps Script webhook URL in Settings first.", "error");
      return;
    }
    setSyncState("loading");
    setSyncMsg("Syncing from Google Sheets…");
    try {
      const [{ samples: s, actions: a, oilChanges: o }, registry] = await Promise.all([
        api.readAll(config.webhookUrl),
        api.getEquipmentRegistry(config.webhookUrl).catch(() => []), // optional sheet tab — don't fail sync if it's missing
      ]);
      setSamples(s);
      setActions(a);
      setOilChanges(o);
      setEquipmentRegistry(registry);
      writeCache("samples", s);
      writeCache("actions", a);
      writeCache("oilChanges", o);
      writeCache("equipmentRegistry", registry);
      const msg = `Synced — ${s.length} samples · ${a.length} actions · ${o.length} oil changes — ${new Date().toLocaleTimeString()}`;
      setSyncMsg(msg);
      setSyncState("idle");
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`);
      setSyncState("error");
      pushToast(`Sync failed: ${err.message}`, "error");
    }
  }, [config.webhookUrl, pushToast]);

  useEffect(() => {
    if (config.webhookUrl) runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.webhookUrl]);

  function updateConfig(patch) {
    const next = { ...config, ...patch };
    setConfig(next);
    saveConfig(next);
  }

  // ── Action CRUD, shared by Oil Analysis Report and Action Tracker ────────
  // Local state is only updated AFTER the server confirms the write — unlike
  // the original app, which updated the screen optimistically and could
  // silently drift from what was actually saved.
  const onAddAction = useCallback(
    async (action) => {
      try {
        const saved = await api.saveAction(config.webhookUrl, action, { isNew: true });
        setActions((prev) => {
          const next = [...prev, saved];
          writeCache("actions", next);
          return next;
        });
        pushToast("Action added.", "success");
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast]
  );

  const onUpdateAction = useCallback(
    async (action) => {
      try {
        const saved = await api.saveAction(config.webhookUrl, action, { isNew: false });
        setActions((prev) => {
          const next = prev.map((a) =>
            a._matchValues?.[0] === action._matchValues?.[0] && a._matchValues?.[1] === action._matchValues?.[1] ? saved : a
          );
          writeCache("actions", next);
          return next;
        });
        pushToast("Action saved.", "success");
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast]
  );

  const onDeleteAction = useCallback(
    async (action) => {
      try {
        await api.deleteAction(config.webhookUrl, action);
        setActions((prev) => {
          const next = prev.filter((a) => a._id !== action._id);
          writeCache("actions", next);
          return next;
        });
        pushToast("Action deleted.", "success");
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast]
  );

  const onSaveOilChange = useCallback(
    async (oilChange) => {
      try {
        const saved = await api.saveOilChange(config.webhookUrl, oilChange);
        setOilChanges((prev) => {
          const next = prev.map((o) => (o._id === oilChange._id ? saved : o));
          writeCache("oilChanges", next);
          return next;
        });
        pushToast("Oil change saved.", "success");
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast]
  );

  const onAddSample = useCallback(
    async (sample, headers) => {
      try {
        const saved = await api.saveSample(config.webhookUrl, sample, headers);
        setSamples((prev) => {
          const next = [...prev, saved];
          writeCache("samples", next);
          return next;
        });
        pushToast("Sample saved.", "success");
        return saved;
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast]
  );

  // Equipment Registry is the authoritative list (confirmed ~152 registered
  // equipment against the live sheet) — used when available so dropdowns
  // include equipment that has actions/oil-change records but no sample yet.
  // Falls back to samples + actions equipment codes if that sheet tab is
  // missing, so this still works against a sheet without a Registry tab.
  const equipmentOptions = useMemo(() => {
    if (equipmentRegistry.length > 0) {
      return equipmentRegistry
        .map((e) => e.code)
        .filter(Boolean)
        .sort();
    }
    const codes = new Set();
    samples.forEach((s) => s.unitId && codes.add(s.unitId));
    actions.forEach((a) => a.equipmentCode && codes.add(a.equipmentCode));
    return Array.from(codes).sort();
  }, [equipmentRegistry, samples, actions]);

  const openActionsCount = useMemo(
    () => actions.filter((a) => a.status === "Open" || a.status === "In Progress" || a.status === "Waiting Stoppage").length,
    [actions]
  );

  function goToReport(sample) {
    setSelectedEquipment(sample);
    setPage("report");
  }

  return (
    <div
      style={{
        display: "flex",
        background: T.appBg,
        minHeight: "100vh",
        color: T.textPrimary,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}"}</style>
      <Sidebar
        page={page}
        onNavigate={setPage}
        openActionsCount={openActionsCount}
        syncState={syncState}
        syncMsg={syncMsg}
        cacheInfo={{ hasCache: samples.length > 0, ageMinutes: 0 }}
        onFullSync={runSync}
      />
      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        {page === "dashboard" && (
          <Dashboard
            webhookUrl={config.webhookUrl}
            samples={samples}
            actions={actions}
            oilChanges={oilChanges}
            onSelectSample={goToReport}
          />
        )}
        {page === "equipment" && <Equipment samples={samples} actions={actions} oilChanges={oilChanges} onOpenReport={goToReport} />}
        {page === "report" && selectedEquipment && (
          <OilAnalysisReport
            sample={selectedEquipment}
            samples={samples}
            actions={actions}
            oilChanges={oilChanges}
            equipmentOptions={equipmentOptions}
            onAddAction={onAddAction}
            onUpdateAction={onUpdateAction}
            onDeleteAction={onDeleteAction}
          />
        )}
        {page === "report" && !selectedEquipment && (
          <div style={{ color: T.textSecondary }}>Select a sample from the Dashboard or Equipment page first.</div>
        )}
        {page === "upload" && <AddSample equipmentOptions={equipmentOptions} onAdd={onAddSample} />}
        {page === "actions" && (
          <ActionTracker
            actions={actions}
            samples={samples}
            oilChanges={oilChanges}
            equipmentOptions={equipmentOptions}
            onAddAction={onAddAction}
            onUpdateAction={onUpdateAction}
            onDeleteAction={onDeleteAction}
          />
        )}
        {page === "oilchange" && <OilChangeLog oilChanges={oilChanges} onSave={onSaveOilChange} />}
        {page === "tracker" && <SampleTracker samples={samples} />}
        {page === "howto" && <HowToUse />}
        {page === "settings" && <Settings config={config} onSave={updateConfig} onSync={runSync} syncState={syncState} syncMsg={syncMsg} />}
      </div>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
