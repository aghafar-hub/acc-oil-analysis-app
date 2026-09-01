import { useEffect, useState, useCallback, useMemo } from "react";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { DEFAULT_THEME } from "./theme";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Toast from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Equipment from "./pages/Equipment";
import OilAnalysisReport from "./pages/OilAnalysisReport";
import OilReportSearch from "./pages/OilReportSearch";
import ActionTracker from "./pages/ActionTracker";
import AddSample from "./pages/AddSample";
import OilChangeLog from "./pages/OilChangeLog";
import SampleTracker from "./pages/SampleTracker";
import HowToUse from "./pages/HowToUse";
import Settings from "./pages/Settings";
import { loadConfig, saveConfig, readCache, writeCache } from "./config";
import { loadEquipmentRegistry } from "./equipmentRegistry";
import * as api from "./api";

let toastId = 0;

export default function App() {
  const [config, setConfig] = useState(() => loadConfig());
  return (
    <ThemeProvider themeName={config.themeName || DEFAULT_THEME}>
      <AppShell config={config} setConfig={setConfig} />
    </ThemeProvider>
  );
}

function AppShell({ config, setConfig }) {
  const { T } = useTheme();
  const [page, setPage] = useState("dashboard");
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [oilReportCode, setOilReportCode] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [samples, setSamples] = useState(() => readCache("samples")?.data || []);
  const [actions, setActions] = useState(() => readCache("actions")?.data || []);
  const [oilChanges, setOilChanges] = useState(() => readCache("oilChanges")?.data || []);
  const [trackerRaw, setTrackerRaw] = useState(() => readCache("trackerRaw")?.data || []);
  const [equipmentRegistry, setEquipmentRegistry] = useState(() => loadEquipmentRegistry());
  const [syncState, setSyncState] = useState("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = "info") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === "error" ? 8000 : 4000);
  }, []);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  // Matches the original app's own architecture: samples/actions/oil
  // changes sync together (Full Sync). The equipment registry does NOT —
  // it's synced separately and explicitly from Settings → Configuration
  // (see equipmentRegistry.js), so it's not part of this.
  const runSync = useCallback(async () => {
    if (!config.webhookUrl) {
      pushToast("Add your Apps Script webhook URL in Settings first.", "error");
      return;
    }
    setSyncState("loading");
    setSyncMsg("Syncing from Google Sheets…");
    try {
      const { samples: sm, actions: ac, oilChanges: oc, trackerRaw: tr } = await api.readAll(config.webhookUrl);
      setSamples(sm);
      setActions(ac);
      setOilChanges(oc);
      setTrackerRaw(tr);
      writeCache("samples", sm);
      writeCache("actions", ac);
      writeCache("oilChanges", oc);
      writeCache("trackerRaw", tr);
      setSyncMsg(`Synced — ${sm.length} samples · ${ac.length} actions · ${oc.length} oil changes — ${new Date().toLocaleTimeString()}`);
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

  useEffect(() => {
    if (!config.enableAutoSync || !config.webhookUrl) return;
    const minutes = Number(config.autoSyncMinutes) || 5;
    const id = setInterval(runSync, minutes * 60 * 1000);
    return () => clearInterval(id);
  }, [config.enableAutoSync, config.autoSyncMinutes, config.webhookUrl, runSync]);

  function updateConfig(patch) {
    const next = { ...config, ...patch };
    setConfig(next);
    saveConfig(next);
  }

  // ── Action CRUD, shared by Oil Analysis Report, Action Tracker, and the
  // Oil Analysis Report search page. Local state is only updated AFTER the
  // server confirms the write — unlike the original app, which updated the
  // screen optimistically and could silently drift from what was actually
  // saved.
  const applyOilChangeSideEffect = useCallback(
    async (action) => {
      if (!action._oilChangeTarget) return;
      try {
        const saved = await api.saveOilChange(config.webhookUrl, { ...action._oilChangeTarget, changeDate: action.lastChange });
        setOilChanges((prev) => {
          const next = prev.map((o) => (o._id === action._oilChangeTarget._id ? saved : o));
          writeCache("oilChanges", next);
          return next;
        });
      } catch (err) {
        pushToast(`Action saved, but the linked Oil Change Log entry wasn't: ${err.message}`, "error");
      }
    },
    [config.webhookUrl, pushToast]
  );

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
        await applyOilChangeSideEffect(action);
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast, applyOilChangeSideEffect]
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
        await applyOilChangeSideEffect(action);
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast, applyOilChangeSideEffect]
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

  const onEditSample = useCallback(
    async (original, updates) => {
      try {
        const saved = await api.updateSample(config.webhookUrl, { ...original, ...updates });
        setSamples((prev) => {
          const next = prev.map((s2) => (s2._id === original._id ? saved : s2));
          writeCache("samples", next);
          return next;
        });
        pushToast("Sample saved.", "success");
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast]
  );

  const onDeleteSample = useCallback(
    async (sample) => {
      try {
        await api.deleteSample(config.webhookUrl, sample);
        setSamples((prev) => {
          const next = prev.filter((s2) => s2._id !== sample._id);
          writeCache("samples", next);
          return next;
        });
        pushToast("Sample deleted.", "success");
      } catch (err) {
        pushToast(err.message, "error");
        throw err;
      }
    },
    [config.webhookUrl, pushToast]
  );

  // Equipment Registry (loaded from localStorage, or the app's built-in
  // default list — see equipmentRegistry.js) is the authoritative equipment
  // list, same as the original app: it always has entries, so dropdowns
  // include equipment that has actions/oil-change records but no sample yet.
  const equipmentOptions = useMemo(
    () =>
      equipmentRegistry
        .map((e) => e.code)
        .filter(Boolean)
        .sort(),
    [equipmentRegistry]
  );

  const alertCount = useMemo(() => samples.filter((sm) => sm.reportStatus === "Alert").length, [samples]);
  const openActionsCount = useMemo(() => actions.filter((a) => a.status === "Open" || a.status === "In Progress").length, [actions]);

  function goToReport(sample) {
    setSelectedEquipment(sample);
    setPage("report");
    setMobileNavOpen(false);
  }
  function goToOilReport(code) {
    setOilReportCode(code || "");
    setPage("oilreport");
    setMobileNavOpen(false);
  }

  function navigate(nextPage) {
    if (nextPage !== "equipment") setSelectedEquipment(null);
    setPage(nextPage);
    setMobileNavOpen(false);
  }

  const cacheInfo = readCache("samples");

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Inter',sans-serif",
        background: T.appBg,
        color: T.textPrimary,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/*
        Mobile layout + shared page classes, ported verbatim (selectors,
        breakpoints, transform, transition, shadow) from the original app's
        own <style> block. Do not restyle this without re-checking the
        original first.
      */}
      <style>{`
        *{box-sizing:border-box}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:${T.appBg}}
        ::-webkit-scrollbar-thumb{background:${T.scrollThumb};border-radius:3px}
        select option{background:${T.inputBg};color:${T.textPrimary}}
        textarea{background:${T.inputBg};color:${T.textPrimary};border:1px solid ${T.border};border-radius:6px;outline:none;font-family:inherit}

        .mobile-menu-btn { display: none; }
        .sidebar-backdrop { display: none; }

        @media (max-width: 860px) {
          .app-sidebar {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            height: 100vh !important; width: 220px !important;
            z-index: 500 !important;
            transform: translateX(-110%) !important;
            transition: transform 0.28s cubic-bezier(.4,0,.2,1) !important;
            box-shadow: 4px 0 32px rgba(0,0,0,0.55) !important;
          }
          .app-sidebar.open { transform: translateX(0) !important; }
          .sidebar-backdrop.open {
            display: block !important; position: fixed !important;
            inset: 0 !important; background: rgba(0,0,0,0.6) !important; z-index: 499 !important;
          }
          .mobile-menu-btn { display: inline-flex !important; }
          .app-main { width: 100% !important; flex: 1 1 100% !important; min-width: 0 !important; }
          .app-topbar { padding: 10px 12px !important; flex-wrap: wrap !important; gap: 8px !important; }
          .app-topbar-title { font-size: 14px !important; }
          .app-content { padding: 10px !important; }
          .topbar-date { display: none !important; }

          .report-layout { grid-template-columns: 1fr !important; }
          .report-layout > div:first-child { border-right: none !important; border-bottom: 1px solid ${T.border}; }
          .dash-table-desktop { display: none !important; }
          .dash-table-mobile { display: flex !important; }
        }
        @media (max-width: 480px) {
          .app-content { padding: 8px !important; }
          .topbar-actions .ti + span { display: none; }
        }
      `}</style>
      <div
        className={`app-sidebar${mobileNavOpen ? " open" : ""}`}
        style={{
          width: 220,
          background: T.sidebarBg,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <Sidebar
          page={page}
          onNavigate={navigate}
          alertCount={alertCount}
          openActionsCount={openActionsCount}
          syncState={syncState}
          syncMsg={syncMsg}
          logoUrl={config.logoUrl}
          hasCache={config.enableCache !== false && !!cacheInfo}
          cacheAgeMinutes={cacheInfo?.ageMinutes || 0}
          onFullSync={runSync}
          onQuickSync={runSync}
        />
      </div>
      <div className={`sidebar-backdrop${mobileNavOpen ? " open" : ""}`} onClick={() => setMobileNavOpen(false)} />
      <div className="app-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopBar
          page={page}
          sample={selectedEquipment}
          sheetUrl={config.sheetUrl}
          syncState={syncState}
          onSync={runSync}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onBack={() => navigate("equipment")}
        />
        <div className="app-content" style={{ flex: 1, overflowY: "auto", padding: 24, background: T.appBg }}>
          {page === "dashboard" && (
            <Dashboard
              samples={samples}
              actions={actions}
              oilChanges={oilChanges}
              equipmentRegistry={equipmentRegistry}
              onSelectSample={goToReport}
            />
          )}
          {page === "equipment" && (
            <Equipment
              samples={samples}
              equipmentRegistry={equipmentRegistry}
              onSelectSample={goToReport}
              onEditSample={onEditSample}
              onDeleteSample={onDeleteSample}
              onOpenReport={goToOilReport}
            />
          )}
          {page === "report" && selectedEquipment && (
            <OilAnalysisReport
              sample={selectedEquipment}
              samples={samples}
              actions={actions}
              oilChanges={oilChanges}
              equipmentOptions={equipmentOptions}
              equipmentRegistry={equipmentRegistry}
              onAddAction={onAddAction}
              onUpdateAction={onUpdateAction}
              onDeleteAction={onDeleteAction}
            />
          )}
          {page === "report" && !selectedEquipment && (
            <div style={{ color: T.textSecondary }}>Select a sample from the Dashboard or Equipment page first.</div>
          )}
          {page === "oilreport" && (
            <OilReportSearch
              samples={samples}
              oilChanges={oilChanges}
              actions={actions}
              equipmentRegistry={equipmentRegistry}
              onAddAction={onAddAction}
              onUpdateAction={onUpdateAction}
              initialCode={oilReportCode}
            />
          )}
          {page === "upload" && (
            <AddSample
              equipmentOptions={equipmentOptions}
              equipmentRegistry={equipmentRegistry}
              existingSamples={samples}
              onAdd={onAddSample}
            />
          )}
          {page === "actions" && (
            <ActionTracker
              actions={actions}
              samples={samples}
              oilChanges={oilChanges}
              equipmentRegistry={equipmentRegistry}
              onAddAction={onAddAction}
              onUpdateAction={onUpdateAction}
              onDeleteAction={onDeleteAction}
            />
          )}
          {page === "oilchange" && <OilChangeLog oilChanges={oilChanges} equipmentRegistry={equipmentRegistry} onSave={onSaveOilChange} />}
          {page === "tracker" && <SampleTracker trackerRaw={trackerRaw} oilChanges={oilChanges} equipmentRegistry={equipmentRegistry} />}
          {page === "howto" && <HowToUse />}
          {page === "settings" && (
            <Settings
              config={config}
              onSave={updateConfig}
              onSync={runSync}
              syncState={syncState}
              syncMsg={syncMsg}
              onRegistryChange={setEquipmentRegistry}
            />
          )}
        </div>
      </div>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
