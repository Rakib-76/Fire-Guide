import React, { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { fetchFraDurations } from "../api/servicesService";

type RequestDataInput = string | Record<string, unknown> | null | undefined;

function parseRequestDataJson(requestData: RequestDataInput): Record<string, unknown> {
  try {
    if (requestData && typeof requestData === "object" && !Array.isArray(requestData)) {
      return requestData;
    }
    if (typeof requestData !== "string") return {};
    const parsed: unknown = JSON.parse(requestData);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
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

/**
 * `request_data` keys to show even when `access_note` / `extra_access_notes` drives the grid,
 * because they are usually omitted from that prose (e.g. `duration_id`).
 */
const JSON_KEYS_MERGED_WITH_ACCESS_NOTE: readonly string[] = ["duration_id"];

/**
 * Split on sentence boundaries and treat each `Label: value` segment as one row.
 * Segments without `:` become free-text for Notes.
 */
function parseAccessNoteClauses(text: string): { rows: InternalRow[]; unmatched: string[] } {
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], unmatched: [] };

  // Some payloads omit the space after "." between clauses ("...visit.Hours needed: 8") — restore so split works.
  const clauseBoundaryLabels =
    "Hours needed|Preferred date|Consultation type|Property type|People count|Floors|Detectors|Manual call points|Fire alarm panels|Alarm system|Last serviced|Fire extinguishers|Extinguisher type|Emergency lights|Lighting type|Test frequency|Assessment type|People for training|Training location|Building type|Staff training before";
  const normalizedClauses = trimmed.replace(
    new RegExp(`\\.(${clauseBoundaryLabels})`, "gi"),
    ". $1"
  );

  const segments = normalizedClauses
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const raw: InternalRow[] = [];
  const unmatched: string[] = [];
  let seq = 0;

  for (const seg of segments) {
    const cleanedSeg = seg.replace(/^[a-z]\.\s*/i, "").trim();
    const m = /^(.+?):\s*(.+)$/s.exec(cleanedSeg);
    if (m) {
      const label = m[1].trim().replace(/\s+/g, " ");
      const value = m[2].trim();
      if (!label || !isMeaningfulDisplayValue(value)) continue;
      const norm = normalizeLabelKey(label);
      raw.push({
        id: `clause-${seq++}`,
        label,
        value,
        norm,
      });
    } else if (cleanedSeg.length > 1 && isMeaningfulDisplayValue(cleanedSeg)) {
      unmatched.push(cleanedSeg);
    }
  }

  const seen = new Set<string>();
  const rows: InternalRow[] = [];
  for (const r of raw) {
    if (seen.has(r.norm)) continue;
    seen.add(r.norm);
    rows.push(r);
  }

  return { rows, unmatched };
}

function buildDetailRows(rd: Record<string, unknown>): InternalRow[] {
  const accessStr =
    (typeof rd.extra_access_notes === "string" && rd.extra_access_notes.trim()) ||
    (typeof rd.access_note === "string" && rd.access_note.trim()) ||
    "";

  // When access narrative exists, rows come from parsed clauses first, then a small set of JSON keys
  // that are not normally included in the prose (e.g. `duration_id`). Other top-level keys stay hidden
  // to avoid duplicating or contradicting the access note (e.g. default `floors: 1`).
  if (accessStr) {
    const { rows: fromNote, unmatched } = parseAccessNoteClauses(accessStr);
    const out: InternalRow[] = [...fromNote];
    const seenNorm = new Set(fromNote.map((r) => r.norm));

    const notesText = unmatched.map((s) => s.trim()).filter(Boolean).join(". ");
    if (notesText && isMeaningfulDisplayValue(notesText) && !seenNorm.has("notes")) {
      out.push({ id: "notes-free", label: "Notes", value: notesText, norm: "notes" });
      seenNorm.add("notes");
    }

    let mergeSeq = 0;
    for (const key of JSON_KEYS_MERGED_WITH_ACCESS_NOTE) {
      if (!(key in rd)) continue;
      const s = formatVal(rd[key]);
      if (!s || !isMeaningfulDisplayValue(s)) continue;
      const label = jsonKeyToLabel(key);
      const norm = normalizeLabelKey(label);
      if (seenNorm.has(norm)) continue;
      seenNorm.add(norm);
      out.push({ id: `json-with-access-${mergeSeq++}-${key}`, label, value: s, norm });
    }

    return out;
  }

  const skip = new Set(["access_note", "extra_access_notes"]);
  const entries = Object.entries(rd)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => {
      const s = formatVal(v);
      return s && isMeaningfulDisplayValue(s) ? ([k, s] as const) : null;
    })
    .filter((x): x is readonly [string, string] => x != null)
    .sort(([a], [b]) => a.localeCompare(b));

  const seenNorm = new Set<string>();
  const out: InternalRow[] = [];
  let j = 0;
  for (const [key, s] of entries) {
    const label = jsonKeyToLabel(key);
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
 * Request details: if `extra_access_notes` or `access_note` is set, rows come from that string (`Label: value` clauses + Notes),
 * plus selected JSON fields such as `duration_id` when present. If there is no access narrative, all meaningful `request_data` fields are shown.
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
  const accessStr =
    (typeof rd.extra_access_notes === "string" && rd.extra_access_notes.trim()) ||
    (typeof rd.access_note === "string" && rd.access_note.trim()) ||
    "";
  if (accessStr) {
    const single = accessStr.replace(/\s+/g, " ");
    return single.length > 120 ? `${single.slice(0, 117)}…` : single;
  }
  const parts = [
    rd.building_type,
    rd.people ?? rd.people_count,
    rd.floors != null && String(rd.floors) !== "" ? rd.floors : null,
    rd.training_people_count,
  ].filter((x) => x != null && String(x).trim() !== "");
  return parts.length ? parts.map(String).join(" • ") : null;
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
