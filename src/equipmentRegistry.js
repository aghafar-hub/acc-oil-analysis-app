import { DEFAULT_EQUIPMENT_REGISTRY } from "./equipmentRegistryDefault";

// Matches the original app's own architecture: the equipment registry is
// NOT part of the regular sample/action/oil-change sync. It's a hardcoded
// default list — pulled from the live "Equipment Registry" sheet tab
// (152 rows, all 10 columns including Area and Contractor) rather than the
// original bundle's own stale snapshot, which predated the Contractor
// column and had no Area data at all — that a user can override by
// explicitly running "Sync Equipment Registry" in Settings → Configuration,
// which persists the result under this same localStorage key so it
// survives across sessions independent of the sample/action cache.
const KEY = "oilapp_equipment_registry";

// The live "Equipment Registry" sheet has no Contractor column — it's an
// app-only field that starts out populated from the bundled default. A
// "Sync Equipment Registry" run in Settings used to overwrite each synced
// equipment with the sheet's own (contractor-less) record, silently wiping
// this field. That's fixed in Settings now, but browsers that already ran
// a sync before the fix are stuck with the emptied-out result in
// localStorage — this backfills any equipment missing its contractor from
// the bundled default, so those sessions repair themselves on next load
// without anyone having to notice or re-sync.
function backfillContractor(list) {
  const defaultByCode = new Map(DEFAULT_EQUIPMENT_REGISTRY.map((r) => [r.code, r]));
  let changed = false;
  const fixed = list.map((eq) => {
    if (eq.contractor) return eq;
    const fallback = defaultByCode.get(eq.code)?.contractor;
    if (!fallback) return eq;
    changed = true;
    return { ...eq, contractor: fallback };
  });
  return changed ? fixed : list;
}

export function loadEquipmentRegistry() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const healed = backfillContractor(parsed);
        if (healed !== parsed) saveEquipmentRegistry(healed);
        return healed;
      }
    }
  } catch {
    // ignore — fall through to default
  }
  return DEFAULT_EQUIPMENT_REGISTRY;
}

export function saveEquipmentRegistry(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore — localStorage may be unavailable
  }
}
