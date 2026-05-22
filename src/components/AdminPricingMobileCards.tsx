import React from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type {
  FraAllPricesProfessionalItem,
  AlarmAllPricesProfessionalItem,
  ExtinguisherAllPricesProfessionalItem,
  LightTestingAllPricesProfessionalItem,
  MarshalAllPricesProfessionalItem,
  ConsultationAllPricesProfessionalItem,
} from "../api/adminService";

export type PriceDetailRow = { key: string; label: string; price: string };
export type SystemOption = { value: string; label: string };
export type FraDisplayGroup = { groupLabel: string; rows: PriceDetailRow[] };

/** Human-readable label for system select value (e.g. property_type → Property type). */
export function getSystemOptionLabel(value: string, options: SystemOption[]): string {
  if (!value) return "";
  const match = options.find((o) => o.value === value);
  if (match?.label) return match.label;
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

type FraAddonField = "floors" | "people" | "durations";

function fraAddonItemLabel(
  item: FraAllPricesProfessionalItem["floors"][number] | FraAllPricesProfessionalItem["people"][number] | FraAllPricesProfessionalItem["durations"][number],
  field: FraAddonField
): string {
  if (field === "floors") return (item as FraAllPricesProfessionalItem["floors"][number]).floor;
  if (field === "people") {
    const p = item as FraAllPricesProfessionalItem["people"][number];
    return p.people_name ?? `People #${p.id}`;
  }
  return (item as FraAllPricesProfessionalItem["durations"][number]).duration_name;
}

/** Group FRA floor / people / duration rows under each property type (addon prices are per property type). */
export function buildFraAddonGroups(
  pro: FraAllPricesProfessionalItem,
  field: FraAddonField,
  catalogSize: number,
  formatPrice: (price: string) => string
): FraDisplayGroup[] {
  const items = [...(pro[field] ?? [])] as Array<{
    id: number;
    price: string;
    property_type_id?: number;
    property_type_name?: string;
  }>;
  const propertyTypes = pro.property_types ?? [];

  if (items.length === 0) {
    return [];
  }

  const resolveGroupLabel = (propertyTypeId?: number, propertyTypeName?: string) => {
    if (propertyTypeName?.trim()) return propertyTypeName.trim();
    if (propertyTypeId != null) {
      const pt = propertyTypes.find((p) => p.id === propertyTypeId);
      if (pt) return pt.property_type_name;
      return `Property type #${propertyTypeId}`;
    }
    return "";
  };

  if (items.some((i) => i.property_type_id != null || i.property_type_name)) {
    const order: string[] = [];
    const map = new Map<string, PriceDetailRow[]>();
    for (const item of items) {
      const groupLabel = resolveGroupLabel(item.property_type_id, item.property_type_name) || "Other";
      if (!map.has(groupLabel)) {
        map.set(groupLabel, []);
        order.push(groupLabel);
      }
      map.get(groupLabel)!.push({
        key: String(item.id),
        label: fraAddonItemLabel(item as never, field),
        price: formatPrice(item.price),
      });
    }
    for (const pt of propertyTypes) {
      if (!order.includes(pt.property_type_name)) {
        order.push(pt.property_type_name);
        map.set(pt.property_type_name, []);
      }
    }
    return order
      .map((groupLabel) => ({ groupLabel, rows: map.get(groupLabel) ?? [] }))
      .filter((g) => g.rows.length > 0);
  }

  if (propertyTypes.length > 0) {
    const tierSize =
      catalogSize > 0
        ? catalogSize
        : Math.max(1, Math.round(items.length / propertyTypes.length));
    const groups: FraDisplayGroup[] = [];
    let offset = 0;
    for (const pt of propertyTypes) {
      const chunk = items.slice(offset, offset + tierSize);
      offset += tierSize;
      if (chunk.length === 0) continue;
      groups.push({
        groupLabel: pt.property_type_name,
        rows: chunk.map((item) => ({
          key: String(item.id),
          label: fraAddonItemLabel(item as never, field),
          price: formatPrice(item.price),
        })),
      });
    }
    if (offset < items.length) {
      groups.push({
        groupLabel: "Other",
        rows: items.slice(offset).map((item) => ({
          key: String(item.id),
          label: fraAddonItemLabel(item as never, field),
          price: formatPrice(item.price),
        })),
      });
    }
    return groups;
  }

  return [
    {
      groupLabel: "",
      rows: items.map((item) => ({
        key: String(item.id),
        label: fraAddonItemLabel(item as never, field),
        price: formatPrice(item.price),
      })),
    },
  ];
}

export function FraGroupedAddonList({
  groups,
  emptyMessage,
}: {
  groups: FraDisplayGroup[];
  emptyMessage: string;
}) {
  if (groups.length === 0 || groups.every((g) => g.rows.length === 0)) {
    return <p className="text-sm text-gray-500 text-center py-3">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.groupLabel || "default"}>
          {group.groupLabel ? (
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 px-1">
              {group.groupLabel}
            </p>
          ) : null}
          <AdminPriceOptionList rows={group.rows} emptyMessage="No prices in this group" />
        </div>
      ))}
    </div>
  );
}

export function getFraAdminPriceGroups(
  pro: FraAllPricesProfessionalItem,
  system: string,
  catalogSize: number,
  formatPrice: (price: string) => string
): { groups: FraDisplayGroup[]; emptyMessage: string } {
  if (system === "floor") {
    return {
      groups: buildFraAddonGroups(pro, "floors", catalogSize, formatPrice),
      emptyMessage: "No floors configured",
    };
  }
  if (system === "people") {
    return {
      groups: buildFraAddonGroups(pro, "people", catalogSize, formatPrice),
      emptyMessage: "No people options configured",
    };
  }
  if (system === "duration") {
    return {
      groups: buildFraAddonGroups(pro, "durations", catalogSize, formatPrice),
      emptyMessage: "No durations configured",
    };
  }
  return { groups: [], emptyMessage: "Select a system" };
}

export function AdminPriceOptionList({
  rows,
  emptyMessage,
}: {
  rows: PriceDetailRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-3">{emptyMessage}</p>;
  }
  return (
    <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white"
        >
          <span className="text-sm text-gray-900 min-w-0 break-words flex-1">{row.label}</span>
          <span className="text-sm font-semibold text-gray-900 shrink-0">{row.price}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminProfessionalMobilePriceCard({
  reference,
  professionalName,
  systemOptions,
  selectedSystem,
  onSystemChange,
  expanded,
  onToggleExpand,
  onEdit,
  editAriaLabel,
  children,
}: {
  reference: string;
  professionalName: string;
  systemOptions: SystemOption[];
  selectedSystem: string;
  onSystemChange: (value: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  editAriaLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-red-50 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Reference</p>
            <p className="text-sm font-medium text-gray-900">{reference}</p>
          </div>
          <div className="min-w-0 col-span-2">
            <p className="text-xs text-gray-500">Professional</p>
            <p className="text-sm text-gray-900 break-words">{professionalName}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">System</p>
          <Select value={selectedSystem} onValueChange={onSystemChange}>
            <SelectTrigger className="w-full h-10 text-sm border-gray-200 bg-white">
              <SelectValue
                placeholder="Select system"
                label={getSystemOptionLabel(selectedSystem, systemOptions)}
              />
            </SelectTrigger>
            <SelectContent>
              {systemOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 border-gray-200 bg-white"
            onClick={onToggleExpand}
            disabled={!selectedSystem}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
            ) : (
              <ChevronUp className="h-4 w-4 mr-2 shrink-0" />
            )}
            {expanded ? "Hide prices" : "Show prices"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3 border-gray-200 bg-white shrink-0"
            onClick={onEdit}
            aria-label={editAriaLabel}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {selectedSystem && expanded && children ? (
        <div className="border-t border-gray-200 bg-white px-4 py-3">{children}</div>
      ) : null}
    </div>
  );
}

export const FRA_SYSTEM_OPTIONS: SystemOption[] = [
  { value: "property_type", label: "Property type" },
  { value: "floor", label: "Floor" },
  { value: "people", label: "People" },
  { value: "duration", label: "Duration" },
];

export const ALARM_SYSTEM_OPTIONS: SystemOption[] = [
  { value: "base_price", label: "Base price" },
  { value: "smoke_detectors", label: "Smoke detectors" },
  { value: "call_points", label: "Call points" },
  { value: "floors", label: "Floors" },
  { value: "panels", label: "Panels" },
  { value: "last_services", label: "Last services" },
  { value: "system_types", label: "System types" },
];

export const EXTINGUISHER_SYSTEM_OPTIONS: SystemOption[] = [
  { value: "base_price", label: "Base price" },
  { value: "extinguishers", label: "Extinguishers" },
  { value: "floors", label: "Floors" },
  { value: "last_services", label: "Last services" },
  { value: "extinguisher_types", label: "Extinguisher types" },
];

export const EMERGENCY_LIGHT_SYSTEM_OPTIONS: SystemOption[] = [
  { value: "base_price", label: "Base price" },
  { value: "lights", label: "Lights" },
  { value: "floors", label: "Floors" },
  { value: "light_tests", label: "Light tests" },
  { value: "light_types", label: "Light types" },
];

export const TRAINING_SYSTEM_OPTIONS: SystemOption[] = [
  { value: "base_price", label: "Base price" },
  { value: "people", label: "People" },
  { value: "places", label: "Places" },
  { value: "training_on", label: "Training On" },
  { value: "experience", label: "Experience" },
];

export const CONSULTATION_SYSTEM_OPTIONS: SystemOption[] = [
  { value: "base_price", label: "Base price" },
  { value: "modes", label: "Modes" },
  { value: "hours", label: "Hours" },
];

export function getFraAdminPriceRows(
  pro: FraAllPricesProfessionalItem,
  system: string,
  formatPrice: (price: string) => string
): { rows: PriceDetailRow[]; emptyMessage: string } {
  switch (system) {
    case "property_type":
      return {
        rows: pro.property_types.map((pt) => ({
          key: String(pt.id),
          label: pt.property_type_name,
          price: formatPrice(pt.price),
        })),
        emptyMessage: "No property types configured",
      };
    case "floor":
    case "people":
    case "duration": {
      const { groups, emptyMessage } = getFraAdminPriceGroups(pro, system, 0, formatPrice);
      return {
        rows: groups.flatMap((g) => g.rows),
        emptyMessage,
      };
    }
    default:
      return { rows: [], emptyMessage: "Select a system" };
  }
}

export function getAlarmAdminPriceRows(
  pro: AlarmAllPricesProfessionalItem,
  system: string,
  formatPrice: (price: string) => string
): { rows: PriceDetailRow[]; emptyMessage: string } {
  switch (system) {
    case "base_price":
      return {
        rows: (pro.base_prices ?? []).map((bp, idx) => ({
          key: `bp-${idx}`,
          label: "Base price",
          price: formatPrice(bp.price),
        })),
        emptyMessage: "No base price configured",
      };
    case "smoke_detectors":
      return {
        rows: (pro.smoke_detectors ?? []).map((s) => ({
          key: String(s.id),
          label: s.value,
          price: formatPrice(s.price),
        })),
        emptyMessage: "No smoke detectors configured",
      };
    case "call_points":
      return {
        rows: (pro.call_points ?? []).map((c) => ({
          key: String(c.id),
          label: c.value,
          price: formatPrice(c.price),
        })),
        emptyMessage: "No call points configured",
      };
    case "floors":
      return {
        rows: (pro.floors ?? []).map((f) => ({
          key: String(f.id),
          label: f.value,
          price: formatPrice(f.price),
        })),
        emptyMessage: "No floors configured",
      };
    case "panels":
      return {
        rows: (pro.panels ?? []).map((p) => ({
          key: String(p.id),
          label: p.value,
          price: formatPrice(p.price),
        })),
        emptyMessage: "No panels configured",
      };
    case "last_services":
      return {
        rows: (pro.last_services ?? []).map((l) => ({
          key: String(l.id),
          label: l.value,
          price: formatPrice(l.price),
        })),
        emptyMessage: "No last services configured",
      };
    case "system_types":
      return {
        rows: (pro.system_types ?? []).map((st) => ({
          key: String(st.id),
          label: st.value,
          price: formatPrice(st.price),
        })),
        emptyMessage: "No system types configured",
      };
    default:
      return { rows: [], emptyMessage: "Select a system" };
  }
}

export function getExtinguisherAdminPriceRows(
  pro: ExtinguisherAllPricesProfessionalItem,
  system: string,
  formatPrice: (price: string) => string
): { rows: PriceDetailRow[]; emptyMessage: string } {
  switch (system) {
    case "base_price":
      return {
        rows: (pro.base_prices ?? []).map((bp, idx) => ({
          key: `bp-${idx}`,
          label: "Base price",
          price: formatPrice(bp.price),
        })),
        emptyMessage: "No base price configured",
      };
    case "extinguishers":
      return {
        rows: (pro.extinguishers ?? []).map((e) => ({
          key: String(e.id),
          label: e.value,
          price: formatPrice(e.price),
        })),
        emptyMessage: "No extinguishers configured",
      };
    case "floors":
      return {
        rows: (pro.floors ?? []).map((f) => ({
          key: String(f.id),
          label: f.value,
          price: formatPrice(f.price),
        })),
        emptyMessage: "No floors configured",
      };
    case "last_services":
      return {
        rows: (pro.last_services ?? []).map((l) => ({
          key: String(l.id),
          label: l.value,
          price: formatPrice(l.price),
        })),
        emptyMessage: "No last services configured",
      };
    case "extinguisher_types":
      return {
        rows: (pro.extinguisher_types ?? []).map((t) => ({
          key: String(t.id),
          label: t.value,
          price: formatPrice(t.price),
        })),
        emptyMessage: "No extinguisher types configured",
      };
    default:
      return { rows: [], emptyMessage: "Select a system" };
  }
}

export function getEmergencyLightAdminPriceRows(
  pro: LightTestingAllPricesProfessionalItem,
  system: string,
  formatPrice: (price: string) => string
): { rows: PriceDetailRow[]; emptyMessage: string } {
  switch (system) {
    case "base_price":
      return {
        rows: (pro.base_prices ?? []).map((bp, idx) => ({
          key: `bp-${idx}`,
          label: "Base price",
          price: formatPrice(bp.price),
        })),
        emptyMessage: "No base price configured",
      };
    case "lights":
      return {
        rows: (pro.lights ?? []).map((l) => ({
          key: String(l.id),
          label: l.value,
          price: formatPrice(l.price),
        })),
        emptyMessage: "No lights configured",
      };
    case "floors":
      return {
        rows: (pro.floors ?? []).map((f) => ({
          key: String(f.id),
          label: f.value,
          price: formatPrice(f.price),
        })),
        emptyMessage: "No floors configured",
      };
    case "light_tests":
      return {
        rows: (pro.light_tests ?? []).map((t) => ({
          key: String(t.id),
          label: t.value,
          price: formatPrice(t.price),
        })),
        emptyMessage: "No light tests configured",
      };
    case "light_types":
      return {
        rows: (pro.light_types ?? []).map((t) => ({
          key: String(t.id),
          label: t.value,
          price: formatPrice(t.price),
        })),
        emptyMessage: "No light types configured",
      };
    default:
      return { rows: [], emptyMessage: "Select a system" };
  }
}

export function getTrainingAdminPriceRows(
  pro: MarshalAllPricesProfessionalItem,
  system: string,
  formatPrice: (price: string) => string
): { rows: PriceDetailRow[]; emptyMessage: string } {
  switch (system) {
    case "base_price":
      return {
        rows: (pro.base_prices ?? []).map((bp, idx) => ({
          key: `bp-${idx}`,
          label: "Base price",
          price: formatPrice(bp.price),
        })),
        emptyMessage: "No base price configured",
      };
    case "people":
      return {
        rows: (pro.people ?? []).map((p) => ({
          key: String(p.id),
          label: p.value,
          price: formatPrice(p.price),
        })),
        emptyMessage: "No people configured",
      };
    case "places":
      return {
        rows: (pro.places ?? []).map((p) => ({
          key: String(p.id),
          label: p.value,
          price: formatPrice(p.price),
        })),
        emptyMessage: "No places configured",
      };
    case "training_on":
      return {
        rows: (pro.training_on ?? []).map((t) => ({
          key: String(t.id),
          label: t.value,
          price: formatPrice(t.price),
        })),
        emptyMessage: "No training options configured",
      };
    case "experience":
      return {
        rows: (pro.experience ?? []).map((e) => ({
          key: String(e.id),
          label: e.value,
          price: formatPrice(e.price),
        })),
        emptyMessage: "No experience options configured",
      };
    default:
      return { rows: [], emptyMessage: "Select a system" };
  }
}

export function getConsultationAdminPriceRows(
  pro: ConsultationAllPricesProfessionalItem,
  system: string,
  formatPrice: (price: string) => string
): { rows: PriceDetailRow[]; emptyMessage: string } {
  switch (system) {
    case "base_price":
      return {
        rows: (pro.base_price ?? []).map((bp, idx) => ({
          key: `bp-${idx}`,
          label: "Base price",
          price: formatPrice(bp.price),
        })),
        emptyMessage: "No base price configured",
      };
    case "modes":
      return {
        rows: (pro.modes ?? []).map((m, idx) => ({
          key: `mode-${idx}`,
          label: m.value ?? `Mode ${idx + 1}`,
          price: formatPrice(m.price),
        })),
        emptyMessage: "No modes configured",
      };
    case "hours":
      return {
        rows: (pro.hours ?? []).map((h) => ({
          key: String(h.id),
          label: h.value,
          price: formatPrice(h.price),
        })),
        emptyMessage: "No hours configured",
      };
    default:
      return { rows: [], emptyMessage: "Select a system" };
  }
}
