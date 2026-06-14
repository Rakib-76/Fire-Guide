import React, { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { fetchFraDurations } from "../api/servicesService";
import { parseCustomQuoteRequestData } from "../lib/parseCustomQuoteRequestData";

type RequestDataInput = string | Record<string, unknown> | null | undefined;

function parseRequestDataJson(requestData: RequestDataInput): Record<string, unknown> {
  return parseCustomQuoteRequestData(requestData);
}

function formatVal(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object") return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function normalizeLabelKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Values that should not appear as real answers in the grid. */
function isMeaningfulDisplayValue(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (lower === "not specified" || lower === "n/a" || lower === "na") return false;
  if (lower === "-" || lower === "—") return false;
  return true;
}

function jsonKeyToLabel(key: string): string {
  const map: Record<string, string> = {
    preferred_date: "Preferred date",
    floors: "Floors",
    people: "People",
    people_count: "People count",
    building_type: "Building / system type",
    smoke_detectors: "Smoke detectors",
    call_point: "Manual call points",
    panels: "Fire alarm panels",
    extinguisher: "Fire extinguishers",
    training_people_count: "Training people count",
    duration_id: "Duration",
    fra_assessment_type: "Assessment type",
    emergency_light: "Emergency lights",
    consultation_mode: "Consultation type",
    consultation_hours: "Hours needed",
    access_note: "Access notes",
    address: "Property address",
    city: "City",
    post_code: "Postcode",
    postcode: "Postcode",
  };
  if (map[key]) return map[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type InternalRow = { id: string; label: string; value: string; norm: string };

const DURATION_ROW_NORM = normalizeLabelKey("Duration");

let fraDurationLabelsPromise: Promise<ReadonlyMap<number, string>> | null = null;

/** Cached map of FRA `duration_id` → human label from GET /fra-durations (same as questionnaire). */
export function loadQuoteRequestDurationLabelMap(): Promise<ReadonlyMap<number, string>> {
  if (!fraDurationLabelsPromise) {
    fraDurationLabelsPromise = fetchFraDurations()
      .then((list) => new Map(list.map((d) => [Number(d.id), d.duration])))
      .catch(() => new Map<number, string>());
  }
  return fraDurationLabelsPromise;
}

function enrichRowsWithDurationLabels(
  rows: InternalRow[],
  durationById: ReadonlyMap<number, string>
): InternalRow[] {
  if (durationById.size === 0) return rows;
  return rows.map((row) => {
    if (row.norm !== DURATION_ROW_NORM) return row;
    const trimmed = row.value.trim();
    if (!/^\d+$/.test(trimmed)) return row;
    const id = Number.parseInt(trimmed, 10);
    const text = durationById.get(id);
    if (!text) return row;
    return { ...row, value: text };
  });
}

const CONSULTATION_TYPE_ROW_NORM = normalizeLabelKey("Consultation type");
const HOURS_NEEDED_ROW_NORM = normalizeLabelKey("Hours needed");

/**
 * Replace numeric consultation / hour ids in display rows with human labels stored on the same JSON
 * (`consultation_mode`, `consultation_hours`) — e.g. access_note clause "Consultation type: 2" + JSON mode "On-site visit".
 */
function enrichRowsWithConsultationLabelsFromJson(
  rows: InternalRow[],
  rd: Record<string, unknown>
): InternalRow[] {
  const modeLabel = formatVal(rd.consultation_mode);
  const hoursLabel = formatVal(rd.consultation_hours);
  return rows.map((row) => {
    const trimmed = row.value.trim();
    if (row.norm === CONSULTATION_TYPE_ROW_NORM && /^\d+$/.test(trimmed) && modeLabel) {
      return { ...row, value: modeLabel };
    }
    if (row.norm === HOURS_NEEDED_ROW_NORM && /^\d+$/.test(trimmed) && hoursLabel) {
      return { ...row, value: hoursLabel };
    }
    return row;
  });
}

function formatPreferredDateValue(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(s.trim())) return s;
  const d = Date.parse(s.trim());
  if (Number.isNaN(d)) return s;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildDetailRows(rd: Record<string, unknown>): InternalRow[] {
  const skip = new Set(["extra_access_notes"]);
  const entries = Object.entries(rd)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => {
      let s = formatVal(v);
      if (!s || !isMeaningfulDisplayValue(s)) return null;
      if (k === "preferred_date") s = formatPreferredDateValue(s);
      return [k, s] as const;
    })
    .filter((x): x is readonly [string, string] => x != null)
    .sort(([a], [b]) => {
      const order = [
        "building_type",
        "people_count",
        "people",
        "floors",
        "smoke_detectors",
        "call_point",
        "panels",
        "extinguisher",
        "emergency_light",
        "preferred_date",
        "property_address",
        "city",
        "post_code",
        "postcode",
        "fra_assessment_type",
        "duration_id",
        "consultation_mode",
        "consultation_hours",
        "access_note",
      ];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      return a.localeCompare(b);
    });

  const seenNorm = new Set<string>();
  const out: InternalRow[] = [];
  let j = 0;
  for (const [key, s] of entries) {
    let label = jsonKeyToLabel(key);
    if (key === "people_count" && rd.emergency_light != null) {
      label = "Test frequency";
    }
    const norm = normalizeLabelKey(label);
    if (seenNorm.has(norm)) continue;
    seenNorm.add(norm);
    out.push({ id: `json-${j++}-${key}`, label, value: s, norm });
  }

  return out;
}

export type CustomQuoteRequestDetailsPanelProps = {
  requestData: RequestDataInput;
};

/**
 * Request details: all meaningful `request_data` fields (structured JSON from the API).
 */
export function CustomQuoteRequestDetailsPanel({ requestData }: CustomQuoteRequestDetailsPanelProps) {
  const [durationById, setDurationById] = useState<ReadonlyMap<number, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    loadQuoteRequestDurationLabelMap().then((m) => {
      if (!cancelled) setDurationById(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const rd = parseRequestDataJson(requestData);
    const built = buildDetailRows(rd);
    const afterDuration = enrichRowsWithDurationLabels(built, durationById);
    return enrichRowsWithConsultationLabelsFromJson(afterDuration, rd);
  }, [requestData, durationById]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 md:p-6">
      <div className="flex items-center gap-2 mb-5 md:mb-6">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-purple-600" />
        </div>
        <p className="font-semibold text-gray-800 text-[15px] tracking-tight">Request Details</p>
      </div>

      {/* Two-column details grid for better readability in modal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-md border border-gray-200 bg-white/80 px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide break-words [overflow-wrap:anywhere]">
              {row.label}
            </p>
            <p className="text-sm text-gray-900 font-medium mt-1.5 leading-snug break-words [overflow-wrap:anywhere]">
              {row.value}
            </p>
          </div>
        ))}
        {rows.length % 2 === 1 && (
          <div className="hidden sm:block rounded-md border border-transparent" aria-hidden="true" />
        )}
      </div>
      {rows.length > 6 && (
        <p className="mt-3 text-xs text-gray-500">
          Scroll to view all request details.
        </p>
      )}
    </div>
  );
}

/** One-line preview for table/card when `extra_access_notes` / `access_note` exists; else building • people. */
export function customQuoteRequestListSubtitle(requestData: RequestDataInput): string | null {
  const rd = parseRequestDataJson(requestData);
  const parts = [
    rd.building_type,
    rd.emergency_light != null ? rd.emergency_light : null,
    rd.people ?? rd.people_count,
    rd.floors != null && String(rd.floors) !== "" ? rd.floors : null,
    rd.property_address,
    rd.city,
    rd.post_code ?? rd.postcode,
  ].filter((x) => x != null && String(x).trim() !== "");
  if (parts.length) return parts.map(String).join(" • ");
  const accessStr =
    (typeof rd.extra_access_notes === "string" && rd.extra_access_notes.trim()) ||
    (typeof rd.access_note === "string" && rd.access_note.trim()) ||
    "";
  if (accessStr) {
    const single = accessStr.replace(/\s+/g, " ");
    return single.length > 120 ? `${single.slice(0, 117)}…` : single;
  }
  return null;
}

/** Same row model as the admin/customer details panel, for list cards (parsed clauses + JSON fallback). */
export type CustomQuoteRequestDisplayRow = { id: string; label: string; value: string };

export function getCustomQuoteRequestDisplayRows(
  requestData: RequestDataInput,
  durationById?: ReadonlyMap<number, string>
): CustomQuoteRequestDisplayRow[] {
  const rd = parseRequestDataJson(requestData);
  const base = buildDetailRows(rd);
  const afterDuration =
    durationById && durationById.size > 0 ? enrichRowsWithDurationLabels(base, durationById) : base;
  const final = enrichRowsWithConsultationLabelsFromJson(afterDuration, rd);
  return final.map(({ id, label, value }) => ({ id, label, value }));
}
