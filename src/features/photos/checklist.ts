/**
 * Photo checklist configuration + required-photo validation (requirements §8).
 * The lists are data (not hard-coded UI) so they can be changed without code
 * edits — the "configurable" requirement. Post-install is defined now for the
 * later box-installation phase but isn't surfaced by any screen this pass.
 */
import type { ChecklistItem, Photo, PhotoPhase } from '@/domain/types';

/**
 * Pre-install photo checklist.
 *
 * Meter, main electrical panel, utility equipment and drone overview were
 * removed after field testing — they aren't needed before installation.
 * Access limitations / obstructions became a text note on the farm record
 * (`Farm.obstructionNotes`) rather than a photo.
 */
export const DEFAULT_PRE_INSTALL_CHECKLIST: ChecklistItem[] = [
  { id: 'pi_front', phase: 'pre_install', key: 'FrontOfProperty', label: 'Front of property', required: true },
  { id: 'pi_address', phase: 'pre_install', key: 'AddressVerification', label: 'Address verification', required: true, description: 'House number / mailbox clearly visible' },
  { id: 'pi_roof', phase: 'pre_install', key: 'RoofOrPanelLocation', label: 'Roof / proposed panel location', required: true },
  { id: 'pi_overview', phase: 'pre_install', key: 'PropertyOverview', label: 'Property overview', required: true },
];

export const DEFAULT_POST_INSTALL_CHECKLIST: ChecklistItem[] = [
  { id: 'po_array', phase: 'post_install', key: 'SolarArray', label: 'Installed solar array', required: true },
  { id: 'po_inverter', phase: 'post_install', key: 'Inverter', label: 'Inverter', required: true },
  { id: 'po_meter', phase: 'post_install', key: 'Meter', label: 'Meter', required: true },
  { id: 'po_panel', phase: 'post_install', key: 'ElectricalPanel', label: 'Electrical panel', required: true },
  { id: 'po_box_mounted', phase: 'post_install', key: 'BoxMounted', label: 'Monitoring box mounted', required: true },
  { id: 'po_box_interior', phase: 'post_install', key: 'BoxInterior', label: 'Monitoring box interior', required: true },
  { id: 'po_ct', phase: 'post_install', key: 'CTPlacement', label: 'CT placement', required: true },
  { id: 'po_serial', phase: 'post_install', key: 'DeviceSerial', label: 'Device serial number', required: true },
  { id: 'po_connectivity', phase: 'post_install', key: 'ConnectivityTest', label: 'Connectivity-test evidence', required: true },
  { id: 'po_drone', phase: 'post_install', key: 'DroneOverview', label: 'Drone overview of completed system', required: false, allowDrone: true },
];

export function checklistFor(phase: PhotoPhase): ChecklistItem[] {
  return phase === 'pre_install'
    ? DEFAULT_PRE_INSTALL_CHECKLIST
    : DEFAULT_POST_INSTALL_CHECKLIST;
}

/**
 * The human name for a checklist key. Photos are stored against the key
 * (`RoofOrPanelLocation`), which is a filename component, not something to
 * show anyone — this is the single place that translates it. Unknown keys fall
 * back to their words rather than rendering raw camel case.
 */
export function checklistLabel(key: string): string {
  const item =
    DEFAULT_PRE_INSTALL_CHECKLIST.find((i) => i.key === key) ??
    DEFAULT_POST_INSTALL_CHECKLIST.find((i) => i.key === key);
  if (item) return item.label;
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

export interface ChecklistProgress {
  item: ChecklistItem;
  photos: Photo[];
  approvedCount: number;
  rejectedCount: number;
  /** At least one non-rejected photo present. */
  hasUsable: boolean;
  /** Required items need a usable photo; optional items are always satisfied. */
  satisfied: boolean;
  /** Has a rejected photo and no usable replacement yet. */
  needsRetake: boolean;
}

export function computeChecklistProgress(
  items: ChecklistItem[],
  photos: Photo[],
): ChecklistProgress[] {
  return items.map((item) => {
    const p = photos.filter((ph) => ph.checklistItemId === item.id);
    const usable = p.filter((ph) => ph.reviewState !== 'rejected');
    const approved = p.filter((ph) => ph.reviewState === 'approved');
    const rejected = p.filter((ph) => ph.reviewState === 'rejected');
    const hasUsable = usable.length > 0;
    return {
      item,
      photos: p,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      hasUsable,
      satisfied: item.required ? hasUsable : true,
      needsRetake: rejected.length > 0 && !hasUsable,
    };
  });
}

/** Required checklist items that still have no usable photo. */
export function missingRequired(items: ChecklistItem[], photos: Photo[]): ChecklistItem[] {
  return computeChecklistProgress(items, photos)
    .filter((pr) => pr.item.required && !pr.hasUsable)
    .map((pr) => pr.item);
}

/** A farm can be submitted only when every required photo is present. */
export function canSubmit(items: ChecklistItem[], photos: Photo[]): boolean {
  return missingRequired(items, photos).length === 0;
}
