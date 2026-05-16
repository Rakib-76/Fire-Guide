import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  CalendarX2,
  Clock, 
  X,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  getWorkingDays,
  WorkingDayHourRecord,
  saveWorkingHours,
  WorkingHourItem,
  getMonthlyAvailability,
  getMonthlyAvailabilitySummary,
  MonthlyAvailabilityData,
  MonthlyAvailabilitySummaryData,
  blockProfessionalBookingDays,
  getBlockedBookingDaysList,
  getBlockedBookingDaysListForProfessional,
  deleteBlockedBookingDay,
  updateBlockedBookingDay,
  BlockedBookingDayItem,
  getProfessionalNoticePeriod,
  createProfessionalNoticePeriod,
  getNoticeBlockedBookingDates,
} from "../api/professionalsService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { getUpcomingBookings, UpcomingBookingItem } from "../api/bookingService";
import { toast } from "sonner";

const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type WeekDay = (typeof WEEK_DAYS)[number];

type WorkingHourFormEntry = {
  day: WeekDay;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

function createDefaultWorkingHours(): WorkingHourFormEntry[] {
  return WEEK_DAYS.map((day) => ({
    day,
    start_time: "09:00",
    end_time: "17:00",
    is_closed: day === "saturday" || day === "sunday",
  }));
}

function normalizeDayKey(value?: string | number | null): WeekDay | null {
  if (value == null) return null;
  if (typeof value === "number" && value >= 1 && value <= 7) {
    return WEEK_DAYS[value - 1] ?? null;
  }
  const key = String(value).trim().toLowerCase();
  if (WEEK_DAYS.includes(key as WeekDay)) return key as WeekDay;
  const shortMap: Record<string, WeekDay> = {
    mon: "monday",
    tue: "tuesday",
    wed: "wednesday",
    thu: "thursday",
    fri: "friday",
    sat: "saturday",
    sun: "sunday",
  };
  return shortMap[key.slice(0, 3)] ?? null;
}

function parseIsClosed(value: unknown): boolean {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0" || value == null) return false;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return Boolean(value);
}

function normalizeWorkingHourRecord(raw: unknown): WorkingDayHourRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const day = normalizeDayKey(
    (record.day ?? record.week_day ?? record.weekday ?? record.day_name ?? record.day_of_week) as
      | string
      | number
      | undefined
  );
  if (!day) return null;
  return {
    id: typeof record.id === "number" ? record.id : undefined,
    day,
    week_day: day,
    start_time: (record.start_time ?? record.startTime ?? null) as string | null,
    end_time: (record.end_time ?? record.endTime ?? null) as string | null,
    is_closed: parseIsClosed(record.is_closed ?? record.isClosed ?? record.closed),
  };
}

function extractWorkingHourRecords(data: unknown): WorkingDayHourRecord[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map(normalizeWorkingHourRecord)
      .filter((record): record is WorkingDayHourRecord => record != null);
  }

  if (typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  const nestedKeys = ["hours", "working_hours", "workingHours", "data"];
  for (const key of nestedKeys) {
    if (key in obj) {
      const nested = extractWorkingHourRecords(obj[key]);
      if (nested.length > 0) return nested;
    }
  }

  const keyedRecords: WorkingDayHourRecord[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const day = normalizeDayKey(key);
    if (!day || value == null || typeof value !== "object" || Array.isArray(value)) continue;
    const record = normalizeWorkingHourRecord({ day, ...(value as Record<string, unknown>) });
    if (record) keyedRecords.push(record);
  }
  return keyedRecords;
}

function extractWorkingHourRecordsFromResponse(response: unknown): WorkingDayHourRecord[] {
  if (!response || typeof response !== "object") return [];
  const root = response as Record<string, unknown>;
  const fromData = extractWorkingHourRecords(root.data);
  if (fromData.length > 0) return fromData;
  return extractWorkingHourRecords(root);
}

function isWorkingHoursResponseOk(response: unknown): boolean {
  if (!response || typeof response !== "object") return false;
  const root = response as Record<string, unknown>;
  const status = root.status;
  if (
    status === true ||
    status === 1 ||
    status === "1" ||
    status === "success" ||
    status === "true" ||
    root.success === true ||
    root.success === 1
  ) {
    return true;
  }
  return extractWorkingHourRecordsFromResponse(response).length > 0;
}

function toTimeInputValue(value?: string | null): string {
  if (!value) return "";
  const parts = value.split(":");
  if (parts.length < 2) return "";
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

function toApiTimeValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function mapApiHoursToForm(records: WorkingDayHourRecord[]): WorkingHourFormEntry[] {
  const defaults = createDefaultWorkingHours();
  const byDay = new Map<WeekDay, WorkingDayHourRecord>();

  for (const record of records) {
    const day = normalizeDayKey(record.day ?? record.week_day);
    if (day) byDay.set(day, record);
  }

  return defaults.map((entry) => {
    const record = byDay.get(entry.day);
    if (!record) return entry;

    const isClosed = parseIsClosed(record.is_closed);
    return {
      day: entry.day,
      is_closed: isClosed,
      start_time: isClosed ? "" : toTimeInputValue(record.start_time) || entry.start_time,
      end_time: isClosed ? "" : toTimeInputValue(record.end_time) || entry.end_time,
    };
  });
}

function formatDayLabel(day: WeekDay): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Blocked ranges for the Availability page: POST booking-days-list with `{ professional_id }` only
 * when we have a stored professional id; otherwise token-only list for booking-days-delete ids.
 */
async function fetchBlockedBookingRangesForAvailability(apiToken: string): Promise<BlockedBookingDayItem[]> {
  const professionalId = getProfessionalId();
  if (professionalId != null) {
    return (await getBlockedBookingDaysListForProfessional(professionalId)) ?? [];
  }
  return (await getBlockedBookingDaysList(apiToken)) ?? [];
}

function parseDayOnly(s: string): string {
  if (!s) return "";
  return s.trim().split(/[\sT]/)[0];
}

function formatBlockDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.replace(" ", "T"));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function toDateInputValue(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.replace(" ", "T"));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatBlockedBookingRangeLine(item: BlockedBookingDayItem): string {
  const start = formatBlockDateDisplay(item.start_day);
  const startKey = parseDayOnly(item.start_day);
  const endKey = parseDayOnly(item.end_day || item.start_day);
  if (!endKey || endKey === startKey) return start;
  return `${start} – ${formatBlockDateDisplay(item.end_day)}`;
}

const longUkDateOpts: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

/** Single day or inclusive range, e.g. "Monday, 15 December 2025" or "Mon … – Thu …". */
function formatBlockedRangeHeadline(startStr: string, endStr: string): string {
  const start = parseDayOnly(startStr);
  const end = parseDayOnly(endStr || startStr);
  const d0 = new Date(`${start}T12:00:00`);
  if (!start || Number.isNaN(d0.getTime())) return formatBlockDateDisplay(startStr);
  if (!end || end === start) {
    return d0.toLocaleDateString("en-GB", longUkDateOpts);
  }
  const d1 = new Date(`${end}T12:00:00`);
  if (Number.isNaN(d1.getTime())) return d0.toLocaleDateString("en-GB", longUkDateOpts);
  return `${d0.toLocaleDateString("en-GB", longUkDateOpts)} – ${d1.toLocaleDateString("en-GB", longUkDateOpts)}`;
}

function blockedRangeSubtitle(item: BlockedBookingDayItem): string {
  const r = item.reason?.trim();
  if (r) return r;
  const start = parseDayOnly(item.start_day);
  const end = parseDayOnly(item.end_day || item.start_day);
  if (start === end) return "Unavailable for bookings";
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "Blocked period";
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return `${days} day${days === 1 ? "" : "s"} blocked`;
}

function isDateInBookingBlockRange(dateStr: string, item: BlockedBookingDayItem): boolean {
  const start = parseDayOnly(item.start_day);
  const end = parseDayOnly(item.end_day || item.start_day);
  return dateStr >= start && dateStr <= end;
}

function isDateBlockedByBookingDayList(items: BlockedBookingDayItem[], dateStr: string): boolean {
  return items.some((item) => isDateInBookingBlockRange(dateStr, item));
}

function countBookingBlockDaysInMonth(items: BlockedBookingDayItem[], year: number, month1to12: number): number {
  let c = 0;
  const dim = new Date(year, month1to12, 0).getDate();
  for (let day = 1; day <= dim; day++) {
    const dateStr = `${year}-${String(month1to12).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isDateBlockedByBookingDayList(items, dateStr)) c++;
  }
  return c;
}

/** Prefer stored id; else derive from blocked-booking rows (same professional as api_token). */
function resolveProfessionalIdForNoticeApi(blockedList: BlockedBookingDayItem[]): number | null {
  const stored = getProfessionalId();
  if (stored != null && !Number.isNaN(Number(stored))) return Number(stored);
  for (const row of blockedList) {
    const id = row?.professional?.id;
    if (id != null && !Number.isNaN(Number(id))) return Number(id);
  }
  return null;
}

interface Booking {
  id: string;
  date: string;
  time: string;
  service: string;
  client: string;
  status: "confirmed" | "pending" | "completed";
  additional_notes?: string;
}

export function ProfessionalAvailabilityContent() {
  const [blockedBookingDayList, setBlockedBookingDayList] = useState<BlockedBookingDayItem[]>([]);
  const [loadingBlockedDates, setLoadingBlockedDates] = useState(true);

  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  const [editingBookingDayId, setEditingBookingDayId] = useState<number | null>(null);
  const [blockStartDay, setBlockStartDay] = useState("");
  const [blockEndDay, setBlockEndDay] = useState("");
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BlockedBookingDayItem | null>(null);
  const [deletingBookingDayId, setDeletingBookingDayId] = useState<number | null>(null);

  const [workingHours, setWorkingHours] = useState<WorkingHourFormEntry[]>(createDefaultWorkingHours);
  const [loadingWorkingDays, setLoadingWorkingDays] = useState(true);
  const [savingWorkingHours, setSavingWorkingHours] = useState(false);

  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [monthlyAvailability, setMonthlyAvailability] = useState<MonthlyAvailabilityData | null>(null);
  const [loadingMonthlyAvailability, setLoadingMonthlyAvailability] = useState(true);
  
  const [monthlySummary, setMonthlySummary] = useState<MonthlyAvailabilitySummaryData | null>(null);
  const [loadingMonthlySummary, setLoadingMonthlySummary] = useState(true);

  const [noticePeriodDays, setNoticePeriodDays] = useState("");
  const [loadingNoticePeriod, setLoadingNoticePeriod] = useState(true);
  const [savingNoticePeriod, setSavingNoticePeriod] = useState(false);

  /** Dates blocked by notice period (from block-professional/booking-days-list + professional_id) */
  const [noticeBlockedDates, setNoticeBlockedDates] = useState<string[]>([]);
  const noticeBlockedDateSet = useMemo(() => new Set(noticeBlockedDates), [noticeBlockedDates]);
  
  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() }; // month: 1-12, year: e.g., 2026
  });
  
  const refreshBlockedBookingDaysAndCalendar = async () => {
    const apiToken = getApiToken();
    if (!apiToken) return;
    let blockedList: BlockedBookingDayItem[] = [];
    try {
      blockedList = await fetchBlockedBookingRangesForAvailability(apiToken);
      setBlockedBookingDayList(blockedList);
    } catch {
      setBlockedBookingDayList([]);
    }
    try {
      const professionalId = resolveProfessionalIdForNoticeApi(blockedList);
      if (professionalId != null) {
        const noticeDates = await getNoticeBlockedBookingDates(professionalId);
        setNoticeBlockedDates(noticeDates);
      }
    } catch {
      setNoticeBlockedDates([]);
    }
    try {
      const availabilityResponse = await getMonthlyAvailability({
        api_token: apiToken,
        month: currentMonth.month,
        year: currentMonth.year,
      });
      if (availabilityResponse.data) setMonthlyAvailability(availabilityResponse.data);
    } catch {
      /* keep previous calendar */
    }
    try {
      const summaryResponse = await getMonthlyAvailabilitySummary({
        api_token: apiToken,
        month: currentMonth.month,
        year: currentMonth.year,
      });
      if (summaryResponse.status === true && summaryResponse.data) {
        setMonthlySummary(summaryResponse.data);
      }
    } catch {
      /* keep previous summary */
    }
  };

  const resetAddBlockForm = () => {
    setEditingBookingDayId(null);
    setBlockStartDay("");
    setBlockEndDay("");
  };

  const openAddBlockModal = (prefillDate?: string) => {
    resetAddBlockForm();
    if (prefillDate) setBlockStartDay(prefillDate);
    setIsAddBlockModalOpen(true);
  };

  const handleEditBlockedBookingDay = (item: BlockedBookingDayItem) => {
    setEditingBookingDayId(item.id);
    setBlockStartDay(toDateInputValue(item.start_day));
    setBlockEndDay(toDateInputValue(item.end_day) || toDateInputValue(item.start_day));
    setIsAddBlockModalOpen(true);
  };

  const handleSubmitBlockBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = blockStartDay.trim();
    const end = blockEndDay.trim();
    if (!start) {
      toast.error("Please select a start date.");
      return;
    }
    const endDate = end || start;
    if (endDate < start) {
      toast.error("End date must be on or after start date.");
      return;
    }

    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setIsAddingBlock(true);
    try {
      if (editingBookingDayId !== null) {
        await updateBlockedBookingDay(apiToken, editingBookingDayId, start, endDate);
        toast.success("Block updated.");
      } else {
        await blockProfessionalBookingDays({
          api_token: apiToken,
          start_day: start,
          end_day: endDate,
        });
        toast.success("Booking days blocked successfully.");
      }
      resetAddBlockForm();
      setIsAddBlockModalOpen(false);
      await refreshBlockedBookingDaysAndCalendar();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save block.";
      toast.error(message);
    } finally {
      setIsAddingBlock(false);
    }
  };

  const handleConfirmDeleteBookingDay = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.synthetic || itemToDelete.id <= 0) {
      toast.error("This block cannot be removed from the list. Contact support if it should change.");
      setItemToDelete(null);
      return;
    }
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to delete.");
      setItemToDelete(null);
      return;
    }
    setDeletingBookingDayId(itemToDelete.id);
    try {
      await deleteBlockedBookingDay(apiToken, itemToDelete.id);
      toast.success("Blocked period removed.");
      setItemToDelete(null);
      await refreshBlockedBookingDaysAndCalendar();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete.";
      toast.error(message);
    } finally {
      setDeletingBookingDayId(null);
    }
  };

  const requestRemoveBlockedRow = (blocked: BlockedBookingDayItem) => {
    if (blocked.synthetic || blocked.id <= 0) return;
    setItemToDelete(blocked);
  };

  const handleCancelAddBlock = () => {
    resetAddBlockForm();
    setIsAddBlockModalOpen(false);
  };

  const handleSaveNoticePeriod = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Authentication required. Please log in again.");
      return;
    }
    const trimmed = noticePeriodDays.trim();
    const n = parseInt(trimmed, 10);
    if (trimmed === "" || Number.isNaN(n) || n < 0) {
      toast.error("Please enter a valid number of days.");
      return;
    }
    setSavingNoticePeriod(true);
    try {
      const res = await createProfessionalNoticePeriod({ api_token: apiToken, notice_days: n });
      if (res.status === true) {
        toast.success(res.message || "Notice period saved successfully");
        if (res.data?.notice_days != null) {
          setNoticePeriodDays(String(res.data.notice_days));
        }
        const professionalId =
          getProfessionalId() ?? resolveProfessionalIdForNoticeApi(blockedBookingDayList);
        if (professionalId != null) {
          try {
            const noticeDates = await getNoticeBlockedBookingDates(professionalId);
            setNoticeBlockedDates(noticeDates);
          } catch {
            /* keep previous notice-blocked dates */
          }
        }
      } else {
        toast.error(res.message || "Could not save notice period.");
      }
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not save notice period.";
      toast.error(errorMessage);
    } finally {
      setSavingNoticePeriod(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in again to save working hours.");
      return;
    }

    for (const entry of workingHours) {
      if (entry.is_closed) continue;
      if (!entry.start_time || !entry.end_time) {
        toast.error(`Please set start and end times for ${formatDayLabel(entry.day)}.`);
        return;
      }
      if (entry.start_time >= entry.end_time) {
        toast.error(`End time must be after start time for ${formatDayLabel(entry.day)}.`);
        return;
      }
    }

    const hours: WorkingHourItem[] = workingHours.map((entry) => ({
      day: entry.day,
      is_closed: entry.is_closed,
      start_time: entry.is_closed ? null : toApiTimeValue(entry.start_time),
      end_time: entry.is_closed ? null : toApiTimeValue(entry.end_time),
    }));

    try {
      setSavingWorkingHours(true);
      const response = await saveWorkingHours({ api_token: apiToken, hours });
      if (isWorkingHoursResponseOk(response)) {
        toast.success(response.message || "Working hours saved successfully");
        const records = extractWorkingHourRecordsFromResponse(response);
        if (records.length > 0) {
          setWorkingHours(mapApiHoursToForm(records));
        }
      } else {
        toast.error(response.message || "Could not save working hours.");
      }
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not save working hours.";
      toast.error(errorMessage);
    } finally {
      setSavingWorkingHours(false);
    }
  };

  const updateWorkingHour = (
    day: WeekDay,
    patch: Partial<Pick<WorkingHourFormEntry, "start_time" | "end_time" | "is_closed">>
  ) => {
    setWorkingHours((prev) =>
      prev.map((entry) => {
        if (entry.day !== day) return entry;
        const next = { ...entry, ...patch };
        if (patch.is_closed === true) {
          return { ...next, start_time: "", end_time: "" };
        }
        if (patch.is_closed === false && !next.start_time && !next.end_time) {
          return { ...next, start_time: "09:00", end_time: "17:00" };
        }
        return next;
      })
    );
  };


  // Fetch blocked booking days on mount (same API as Block Booking Day page)
  useEffect(() => {
    const fetchBlockedBookingDays = async () => {
      try {
        setLoadingBlockedDates(true);
        const apiToken = getApiToken();

        if (!apiToken) {
          setBlockedBookingDayList([]);
          setNoticeBlockedDates([]);
          return;
        }

        const list = await fetchBlockedBookingRangesForAvailability(apiToken);
        setBlockedBookingDayList(list);

        const professionalId = resolveProfessionalIdForNoticeApi(list);
        if (professionalId != null) {
          try {
            const noticeDates = await getNoticeBlockedBookingDates(professionalId);
            setNoticeBlockedDates(noticeDates);
          } catch {
            setNoticeBlockedDates([]);
          }
        }
        /* If professional id unknown here, keep notice-blocked dates from notice-period fetch */
      } catch (error: unknown) {
        console.error("Error fetching blocked booking days:", error);
        setBlockedBookingDayList([]);
        /* Do not clear notice_blocked_dates — notice-period effect may have populated them */
        const errorMessage =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
        if (
          errorMessage.toLowerCase().includes("invalid api token") ||
          errorMessage.toLowerCase().includes("unauthorized")
        ) {
          toast.error("Your session has expired. Please log in again.");
        }
      } finally {
        setLoadingBlockedDates(false);
      }
    };

    fetchBlockedBookingDays();
  }, []);

  // Fetch working days on mount
  useEffect(() => {
    const fetchWorkingDays = async () => {
      try {
        setLoadingWorkingDays(true);
        const apiToken = getApiToken();
        
        if (!apiToken) {
          setLoadingWorkingDays(false);
          return;
        }

        const response = await getWorkingDays({ api_token: apiToken });
        const records = extractWorkingHourRecordsFromResponse(response);
        if (records.length > 0) {
          setWorkingHours(mapApiHoursToForm(records));
        }
      } catch (error: any) {
        console.error("Error fetching working days:", error);
        const errorMessage = error?.message || error?.error || "";
        
        // Only show toast for authentication errors
        if (errorMessage.toLowerCase().includes("invalid api token") || 
            errorMessage.toLowerCase().includes("unauthorized") ||
            error?.status === 401) {
          toast.error("Your session has expired. Please log in again.");
        }
      } finally {
        setLoadingWorkingDays(false);
      }
    };

    fetchWorkingDays();
  }, []);

  useEffect(() => {
    const fetchNoticePeriod = async () => {
      try {
        setLoadingNoticePeriod(true);
        const apiToken = getApiToken();
        if (!apiToken) {
          return;
        }
        const response = await getProfessionalNoticePeriod(apiToken);
        if (response.status === true && response.data != null && typeof response.data.notice_days === "number") {
          setNoticePeriodDays(String(response.data.notice_days));
        } else {
          setNoticePeriodDays("");
        }
        const pid = response.data?.professional_id;
        if (typeof pid === "number" && !Number.isNaN(pid)) {
          try {
            const noticeDates = await getNoticeBlockedBookingDates(pid);
            setNoticeBlockedDates(noticeDates);
          } catch {
            /* leave existing notice-blocked dates */
          }
        }
      } catch (error: unknown) {
        console.error("Error fetching notice period:", error);
        const errorMessage =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
        if (
          errorMessage.toLowerCase().includes("invalid api token") ||
          errorMessage.toLowerCase().includes("unauthorized")
        ) {
          toast.error("Your session has expired. Please log in again.");
        }
      } finally {
        setLoadingNoticePeriod(false);
      }
    };

    fetchNoticePeriod();
  }, []);

  // Fetch upcoming bookings on mount
  useEffect(() => {
    const fetchUpcomingBookings = async () => {
      try {
        setLoadingBookings(true);
        const apiToken = getApiToken();
        
        if (!apiToken) {
          setLoadingBookings(false);
          return;
        }

        const response = await getUpcomingBookings(apiToken);
        
        if (response.status === true && response.data) {
          // Map API response to component Booking interface using exact API keys
          const mappedBookings: Booking[] = response.data.map((item: UpcomingBookingItem, index: number) => {
            // Get client name from available fields (API response may not always include client info)
            const clientName = item.client_name || 
                              (item.first_name && item.last_name 
                                ? `${item.first_name} ${item.last_name}` 
                                : item.first_name || item.email || "Client");

            // Map status - ensure it matches the Booking interface type
            let bookingStatus: "confirmed" | "pending" | "completed" = "pending";
            const statusLower = item.status?.toLowerCase() || "";
            if (statusLower === "confirmed") {
              bookingStatus = "confirmed";
            } else if (statusLower === "completed") {
              bookingStatus = "completed";
            } else {
              bookingStatus = "pending";
            }

            // Use exact API response keys: selected_date, selected_time, service_name, status, additional_notes
            // Handle null service_name - use fallback string if null
            const serviceName = item.service_name || "Service";

            return {
              id: item.id?.toString() || `booking-${index}`,
              date: item.selected_date, // Exact API key
              time: item.selected_time, // Exact API key
              service: serviceName, // Handle null service_name
              client: clientName,
              status: bookingStatus, // Mapped from API status
              additional_notes: item.additional_notes // Exact API key
            };
          });

          setUpcomingBookings(mappedBookings);
        }
      } catch (error: any) {
        console.error("Error fetching upcoming bookings:", error);
        const errorMessage = error?.message || error?.error || "";
        
        // Only show toast for authentication errors
        if (errorMessage.toLowerCase().includes("invalid api token") || 
            errorMessage.toLowerCase().includes("unauthorized") ||
            error?.status === 401) {
          toast.error("Your session has expired. Please log in again.");
        }
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchUpcomingBookings();
  }, []);

  // Fetch monthly availability on mount and when month changes
  useEffect(() => {
    const fetchMonthlyAvailability = async () => {
      try {
        setLoadingMonthlyAvailability(true);
        const apiToken = getApiToken();
        
        if (!apiToken) {
          console.warn("API token not found for monthly availability");
          setLoadingMonthlyAvailability(false);
          return;
        }

        const response = await getMonthlyAvailability({ 
          api_token: apiToken,
          month: currentMonth.month,
          year: currentMonth.year
        });
        
        // Check if response indicates failure
        if (response.status === false || !response.data) {
          const errorMsg = response.message || "Failed to load calendar data.";
          if (errorMsg.toLowerCase().includes("invalid api token")) {
            toast.error("Your session has expired. Please log in again.");
          } else {
            console.warn("Calendar loading error:", errorMsg);
          }
          return;
        }
        
        if (response.data) {
          console.log('Monthly availability received:', {
            month: response.data.month,
            pastCount: response.data.past?.length || 0,
            bookedCount: response.data.booked?.length || 0,
            blockedCount: response.data.blocked?.length || 0,
            availableCount: response.data.available?.length || 0,
            samplePast: response.data.past?.slice(0, 3),
            sampleBooked: response.data.booked?.slice(0, 3),
            sampleBlocked: response.data.blocked?.slice(0, 3),
            sampleAvailable: response.data.available?.slice(0, 3),
          });
          setMonthlyAvailability(response.data);
        } else if (response.message && response.message.toLowerCase().includes("invalid api token")) {
          toast.error("Your session has expired. Please log in again.");
        }
      } catch (error: any) {
        console.error("Error fetching monthly availability:", error);
        const errorMessage = error?.message || error?.error || "Failed to load calendar data.";
        
        // Check if it's an authentication error
        if (errorMessage.toLowerCase().includes("invalid api token") || 
            errorMessage.toLowerCase().includes("unauthorized") ||
            error?.status === 401) {
          toast.error("Your session has expired. Please log in again.");
        } else {
          // Don't show toast for calendar loading errors to avoid spam
          console.warn("Calendar loading error:", errorMessage);
        }
      } finally {
        setLoadingMonthlyAvailability(false);
      }
    };

    fetchMonthlyAvailability();
  }, [currentMonth]);

  // Fetch monthly availability summary on mount and when blocked dates or month changes
  useEffect(() => {
    const fetchMonthlySummary = async () => {
      try {
        setLoadingMonthlySummary(true);
        const apiToken = getApiToken();
        
        if (!apiToken) {
          console.warn("API token not found for monthly summary");
          setLoadingMonthlySummary(false);
          return;
        }

        const response = await getMonthlyAvailabilitySummary({ 
          api_token: apiToken,
          month: currentMonth.month,
          year: currentMonth.year
        });
        
        // Check if response indicates failure
        if (response.status === false || !response.data) {
          const errorMsg = response.message || "Failed to load summary data.";
          if (errorMsg.toLowerCase().includes("invalid api token")) {
            toast.error("Your session has expired. Please log in again.");
          } else {
            console.warn("Summary loading error:", errorMsg);
          }
          return;
        }
        
        if (response.data) {
          console.log('Monthly summary received:', response.data);
          setMonthlySummary(response.data);
        }
      } catch (error: any) {
        console.error("Error fetching monthly summary:", error);
        const errorMessage = error?.message || error?.error || "";
        
        // Check if it's an authentication error
        if (errorMessage.toLowerCase().includes("invalid api token") || 
            errorMessage.toLowerCase().includes("unauthorized") ||
            error?.status === 401) {
          toast.error("Your session has expired. Please log in again.");
        } else {
          console.warn("Summary loading error:", errorMessage);
        }
      } finally {
        setLoadingMonthlySummary(false);
      }
    };

    fetchMonthlySummary();
  }, [blockedBookingDayList, currentMonth]);

  // Use API summary data if available, otherwise fallback to calculated values
  const currentMonthBookings = monthlySummary?.book_count ?? upcomingBookings.filter(b => 
    new Date(b.date).getMonth() === new Date().getMonth()
  ).length;
  const currentMonthBlocked =
    monthlySummary?.block_count ??
    countBookingBlockDaysInMonth(blockedBookingDayList, currentMonth.year, currentMonth.month);
  const currentMonthAvailable = monthlySummary?.available_count ?? (30 - currentMonthBookings - currentMonthBlocked);

  // Navigation handlers
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 1) {
        return { month: 12, year: prev.year - 1 };
      } else {
        return { month: prev.month - 1, year: prev.year };
      }
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 12) {
        return { month: 1, year: prev.year + 1 };
      } else {
        return { month: prev.month + 1, year: prev.year };
      }
    });
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth({ month: now.getMonth() + 1, year: now.getFullYear() });
  };

  // Format month display
  const getMonthDisplay = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[currentMonth.month - 1]} ${currentMonth.year}`;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[#0A1A2F] mb-2">
          Manage Your Availability
        </h1>
        <p className="text-gray-600">
          Block days when you're unavailable and view your booked appointments
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Calendar Section - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">This Month</p>
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-semibold text-gray-900">
                  {loadingMonthlySummary ? '...' : currentMonthBookings}
                </p>
                <p className="text-sm text-gray-500">Bookings</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Blocked Days</p>
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-semibold text-gray-900">
                  {loadingMonthlySummary ? '...' : currentMonthBlocked}
                </p>
                <p className="text-sm text-gray-500">This Month</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-700">Available</p>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-semibold text-green-900">
                  {loadingMonthlySummary ? '...' : currentMonthAvailable}
                </p>
                <p className="text-sm text-green-700">Days Open</p>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousMonth}
                    className="h-8 w-8 p-0"
                    disabled={loadingMonthlyAvailability}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="mb-0 min-w-[200px] text-center">
                    {getMonthDisplay()}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                    className="h-8 w-8 p-0"
                    disabled={loadingMonthlyAvailability}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-sm"
                  disabled={loadingMonthlyAvailability}
                >
                  Today
                </Button>
              </div>
              <CardDescription className="mt-2">Click on dates to block or unblock availability</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMonthlyAvailability ? (
                <div className="bg-gray-50 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-spin" />
                    <p>Loading calendar...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      // Use currentMonth state to ensure correct month/year display
                      const year = currentMonth.year;
                      const month = currentMonth.month - 1; // Convert to 0-based index (0-11)
                      
                      // Get first day of month and number of days
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      
                      // Create array of all dates in the month
                      const dates: Array<{ day: number; dateStr: string; status: 'past' | 'booked' | 'blocked' | 'available' | 'empty' }> = [];
                      
                      // Add empty cells for days before the first day of the month
                      for (let i = 0; i < firstDay; i++) {
                        dates.push({ day: 0, dateStr: '', status: 'empty' });
                      }
                      
                      // Add all days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        let status: 'past' | 'booked' | 'blocked' | 'available' = 'available';
                        
                        // Check if date is in the past
                        const dateObj = new Date(year, month, day);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPastDate = dateObj < today;
                        
                        if (monthlyAvailability) {
                          // Check status in priority order: past > booked > blocked > available
                          const pastDates = monthlyAvailability.past || [];
                          const bookedDates = monthlyAvailability.booked || [];
                          const apiBlockedDates = monthlyAvailability.blocked || [];
                          const availableDates = monthlyAvailability.available || [];
                          
                          if (isPastDate || pastDates.includes(dateStr)) {
                            status = 'past';
                          } else if (bookedDates.includes(dateStr)) {
                            status = 'booked';
                          } else if (
                            apiBlockedDates.includes(dateStr) ||
                            isDateBlockedByBookingDayList(blockedBookingDayList, dateStr) ||
                            noticeBlockedDateSet.has(dateStr)
                          ) {
                            status = 'blocked';
                          } else if (availableDates.includes(dateStr)) {
                            status = 'available';
                          }
                        } else if (isPastDate) {
                          status = 'past';
                        } else if (
                          isDateBlockedByBookingDayList(blockedBookingDayList, dateStr) ||
                          noticeBlockedDateSet.has(dateStr)
                        ) {
                          status = 'blocked';
                        }
                        
                        dates.push({ day, dateStr, status });
                      }
                      
                      return dates.map((dateInfo, index) => {
                        if (dateInfo.status === 'empty') {
                          return <div key={`empty-${index}`} className="aspect-square"></div>;
                        }
                        
                        const { day, dateStr, status } = dateInfo;
                        const isPast = status === 'past';
                        const isBlocked = status === 'blocked';
                        const isBooked = status === 'booked';
                        const isAvailable = status === 'available';
                        
                        return (
                          <button
                            key={dateStr}
                            className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${
                              isPast
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : isBlocked
                                ? 'bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200'
                                : isBooked
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 cursor-default'
                                : isAvailable
                                ? 'bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                : 'bg-white border border-gray-200'
                            }`}
                            disabled={isPast || isBooked || isBlocked}
                            onClick={() => {
                              if (isAvailable && !isPast && !isBlocked) {
                                openAddBlockModal(dateStr);
                              }
                            }}
                          >
                            {day}
                          </button>
                        );
                      });
                    })()}
                  </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                    <span className="text-sm text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                    <span className="text-sm text-gray-600">Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                    <span className="text-sm text-gray-600">Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span className="text-sm text-gray-600">Past</span>
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Blocked Dates — matches design: white card, red Add Block, pale pink rows, circular X chip */}
          <Card className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-row items-start justify-between gap-4 border-b border-gray-100 px-6 pt-6 pb-5 sm:px-8">
              <div className="min-w-0 flex-1 pr-3">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">Blocked Dates</h2>
                <p className="mt-1 text-sm font-normal leading-relaxed text-gray-600">
                  Block specific days when you are not available for bookings.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 rounded-lg bg-red-600 px-4 font-medium text-white shadow-none hover:bg-red-700 cursor-pointer"
                onClick={() => openAddBlockModal()}
              >
                + Add Block
              </Button>
            </div>
            <CardContent className="p-0">
              {loadingBlockedDates ? (
                <div className="px-6 py-12 text-center text-gray-500 sm:px-8">
                  <CalendarX2 className="mx-auto mb-3 h-12 w-12 animate-spin text-gray-300" />
                  <p>Loading blocked dates...</p>
                </div>
              ) : blockedBookingDayList.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 sm:px-8">
                  <CalendarX2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>No blocked dates. Click &quot;Add Block&quot; to block unavailable days.</p>
                </div>
              ) : (
                <div className="space-y-3 px-6 pb-6 pt-3 sm:px-8">
                  {blockedBookingDayList.map((blocked, index) => {
                    const canRemove = !blocked.synthetic && blocked.id > 0;
                    const rowKey =
                      blocked.id > 0 ? String(blocked.id) : `block-${index}-${blocked.start_day}-${blocked.end_day}`;
                    return (
                      <div
                        key={rowKey}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 sm:px-5 sm:py-4 ${
                          canRemove ? "cursor-pointer" : ""
                        }`}
                        onDoubleClick={(e) => {
                          if (!canRemove) return;
                          if ((e.target as HTMLElement).closest("button")) return;
                          handleEditBlockedBookingDay(blocked);
                        }}
                        title={canRemove ? "Double-click to change dates" : undefined}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                          <button
                            type="button"
                            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 p-0 transition-colors hover:bg-red-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:hover:bg-gray-200"
                            disabled={!canRemove || deletingBookingDayId === blocked.id}
                            aria-label={canRemove ? "Remove blocked period" : "This block cannot be removed"}
                            title={canRemove ? "Remove this blocked period" : "This period cannot be removed from here"}
                            onClick={(e) => {
                              e.stopPropagation();
                              requestRemoveBlockedRow(blocked);
                            }}
                          >
                            <X
                              className="h-[15px] w-[15px] shrink-0 text-red-700 group-disabled:text-gray-500"
                              strokeWidth={2}
                              aria-hidden
                            />
                          </button>
                          <div className="min-w-0">
                            <p className="text-base font-medium leading-snug text-gray-900">
                              {formatBlockedRangeHeadline(blocked.start_day, blocked.end_day)}
                            </p>
                            <p className="mt-0.5 text-sm font-normal leading-snug text-gray-500">
                              {blockedRangeSubtitle(blocked)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center self-center sm:self-auto">
                          <button
                            type="button"
                            className={`text-sm font-normal cursor-pointer p-6 ${
                              canRemove
                                ? "text-red-600 underline-offset-2 "
                                : "cursor-not-allowed text-gray-400 no-underline"
                            } disabled:opacity-60`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canRemove) requestRemoveBlockedRow(blocked);
                            }}
                            disabled={!canRemove || deletingBookingDayId === blocked.id}
                            title={
                              canRemove
                                ? "Remove this blocked period"
                                : "This period cannot be removed from here"
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add / Edit — same contract as Block Booking Day (start_day / end_day) */}
          <Dialog
            open={isAddBlockModalOpen}
            onOpenChange={(open) => {
              setIsAddBlockModalOpen(open);
              if (!open) resetAddBlockForm();
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#0A1A2F]">
                  {editingBookingDayId !== null ? "Edit block" : "Block booking days"}
                </DialogTitle>
                <DialogDescription>
                  Choose a start date and optional end date. Customers cannot book on these days.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitBlockBooking} className="space-y-4">
                <div className="space-y-2 px-6">
                  <Label htmlFor="avail-block-start">Start date *</Label>
                  <Input
                    id="avail-block-start"
                    type="date"
                    required
                    value={blockStartDay}
                    onChange={(e) => setBlockStartDay(e.target.value)}
                    min={editingBookingDayId !== null ? undefined : new Date().toISOString().split("T")[0]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 px-6">
                  <Label htmlFor="avail-block-end">End date *</Label>
                  <Input
                    id="avail-block-end"
                    type="date"
                    value={blockEndDay}
                    min={blockStartDay || undefined}
                    onChange={(e) => setBlockEndDay(e.target.value)}
                    className="w-full"
                  />
                </div>
                <DialogFooter className="px-6 pb-6">
                  <Button type="button" variant="outline" onClick={handleCancelAddBlock} disabled={isAddingBlock}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isAddingBlock}>
                    {isAddingBlock
                      ? editingBookingDayId !== null
                        ? "Saving…"
                        : "Submitting…"
                      : editingBookingDayId !== null
                        ? "Update"
                        : "Block days"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#0A1A2F]">Remove blocked period?</DialogTitle>
              </DialogHeader>
              <p className="text-gray-600">
                {itemToDelete ? (
                  <>
                    Remove the block for{" "}
                    <strong>{formatBlockedBookingRangeLine(itemToDelete)}</strong>? This cannot be undone.
                  </>
                ) : (
                  "This blocked period will be removed."
                )}
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItemToDelete(null)}
                  disabled={deletingBookingDayId !== null}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleConfirmDeleteBookingDay}
                  disabled={deletingBookingDayId !== null}     
                >
                  {deletingBookingDayId === itemToDelete?.id ? "Deleting…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sidebar - Takes 1 column on desktop */}
        <div className="space-y-6">
          {/* Upcoming Bookings - Sticky on desktop */}
          <Card className="border-0 shadow-md sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Upcoming Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-gray-300 animate-spin" />
                  <p className="text-sm">Loading bookings...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm mb-1">
                            {booking.service}
                          </p>
                          <p className="text-sm text-gray-600">{booking.additional_notes}</p>
                        </div>
                        <Badge
                          variant={booking.status === "confirmed" ? "default" : "secondary"}
                          className={
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-700 text-xs"
                              : booking.status === "completed"
                              ? "bg-gray-100 text-gray-700 text-xs"
                              : "bg-yellow-100 text-yellow-700 text-xs"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(booking.date).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {booking.time}
                        </span>
                      </div>
                    
                    </div>
                  ))}

                  {upcomingBookings.length === 0 && !loadingBookings && (
                    <div className="text-center py-6 text-gray-500">
                      <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No upcoming bookings</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm">Notice period days</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingNoticePeriod ? (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-gray-300 animate-spin" />
                  <p className="text-sm">Loading notice period…</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Days"
                    value={noticePeriodDays}
                    onChange={(e) => setNoticePeriodDays(e.target.value)}
                    className="flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 shrink-0"
                    onClick={handleSaveNoticePeriod}
                    disabled={savingNoticePeriod}
                  >
                    {savingNoticePeriod ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm">Working Hours</CardTitle>
              <CardDescription className="text-xs">
                Set your weekly schedule. Closed days are sent with null times.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingWorkingDays ? (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-gray-300 animate-spin" />
                  <p className="text-sm">Loading working hours...</p>
                </div>
              ) : (
                <>
                  <div
                    className="space-y-2 overflow-y-auto rounded-md border border-gray-100 p-3"
                    style={{ maxHeight: 360 }}
                    aria-label="Weekly working hours"
                  >
                    {workingHours.map((entry) => (
                      <div
                        key={entry.day}
                        className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {formatDayLabel(entry.day)}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Label htmlFor={`closed-${entry.day}`} className="text-xs text-gray-500">
                              Closed
                            </Label>
                            <Switch
                              id={`closed-${entry.day}`}
                              checked={entry.is_closed}
                              onCheckedChange={(checked) =>
                                updateWorkingHour(entry.day, { is_closed: checked })
                              }
                            />
                          </div>
                        </div>

                        {entry.is_closed ? (
                          <p className="text-xs text-gray-400">Not available this day</p>
                        ) : (
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <div className="min-w-0">
                              <Label htmlFor={`start-${entry.day}`} className="text-xs text-gray-500 mb-1 block">
                                Start
                              </Label>
                              <Input
                                id={`start-${entry.day}`}
                                type="time"
                                value={entry.start_time}
                                onChange={(e) =>
                                  updateWorkingHour(entry.day, { start_time: e.target.value })
                                }
                                className="h-9 text-sm bg-white"
                              />
                            </div>
                            <span className="text-gray-400 text-sm pt-5">–</span>
                            <div className="min-w-0">
                              <Label htmlFor={`end-${entry.day}`} className="text-xs text-gray-500 mb-1 block">
                                End
                              </Label>
                              <Input
                                id={`end-${entry.day}`}
                                type="time"
                                value={entry.end_time}
                                onChange={(e) =>
                                  updateWorkingHour(entry.day, { end_time: e.target.value })
                                }
                                className="h-9 text-sm bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={handleSaveWorkingHours}
                    disabled={savingWorkingHours}
                  >
                    {savingWorkingHours ? "Saving…" : "Save Working Hours"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-0 shadow-md bg-blue-50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">Availability Tips</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Keep your calendar updated</li>
                    <li>• Block dates in advance</li>
                    <li>• Set realistic working hours</li>
                    <li>• Respond to bookings promptly</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
