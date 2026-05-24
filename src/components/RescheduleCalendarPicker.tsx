import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Calendar, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { fetchProfessionalProfileAvailableDates, type ProfessionalProfileAvailableDateItem } from "../api/availableDatesService";
import { getBlockedBookingDaysListForProfessional } from "../api/professionalsService";
import { normalizeSlotForBookingComparison, parseBookingDateKey } from "../lib/bookingSlotNormalize";

function parseDateOnly(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.replace(" ", "T").slice(0, 10);
}

function datesInRange(startStr: string, endStr: string): string[] {
  const start = parseDateOnly(startStr);
  const end = parseDateOnly(endStr);
  if (!start || !end) return [];
  const out: string[] = [];
  const d = new Date(start + "T12:00:00");
  const endD = new Date(end + "T12:00:00");
  while (d <= endD) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

type DayInfo = { date: string; day: number; isAvailable: boolean; isBlocked: boolean } | null;

export interface RescheduleCalendarPickerProps {
  professionalId: number | null | undefined;
  selectedDate: string;
  selectedTime: string;
  onSelectDate: (isoDate: string) => void;
  onSelectTime: (slotLabel: string) => void;
}

/**
 * Calendar + time slots for customer reschedule — same APIs as booking flow:
 * - POST `block-professional/booking-days-list` with `{ professional_id }` (blocked ranges on calendar)
 * - POST `professional-profile/available-date` with `{ professional_id }` (slots per date + extra blocked dates)
 */
export function RescheduleCalendarPicker({
  professionalId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: RescheduleCalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [availableDatesData, setAvailableDatesData] = useState<ProfessionalProfileAvailableDateItem[]>([]);
  const [isLoadingAvailableDates, setIsLoadingAvailableDates] = useState(false);
  const [blockedDatesSet, setBlockedDatesSet] = useState<Set<string>>(new Set());
  const [blockedDatesFromAvailabilityApi, setBlockedDatesFromAvailabilityApi] = useState<Set<string>>(new Set());
  const [bookedSlotKeysByDate, setBookedSlotKeysByDate] = useState<Record<string, string[]>>({});
  const [availabilityRefreshTick, setAvailabilityRefreshTick] = useState(0);

  const pid = professionalId != null && !Number.isNaN(Number(professionalId)) ? Number(professionalId) : null;

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setAvailabilityRefreshTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (pid == null) {
      setAvailableDatesData([]);
      setBlockedDatesFromAvailabilityApi(new Set());
      setBookedSlotKeysByDate({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingAvailableDates(true);
      try {
        const { dates, blockedCalendarDates, bookedSlotKeysByDate: apiBooked } =
          await fetchProfessionalProfileAvailableDates(pid);
        if (!cancelled) {
          setAvailableDatesData(dates ?? []);
          setBlockedDatesFromAvailabilityApi(new Set(blockedCalendarDates ?? []));
          setBookedSlotKeysByDate(apiBooked ?? {});
        }
      } catch {
        if (!cancelled) {
          setAvailableDatesData([]);
          setBlockedDatesFromAvailabilityApi(new Set());
          setBookedSlotKeysByDate({});
        }
      } finally {
        if (!cancelled) setIsLoadingAvailableDates(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pid, availabilityRefreshTick]);

  useEffect(() => {
    if (pid == null) {
      setBlockedDatesSet(new Set());
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const list = await getBlockedBookingDaysListForProfessional(pid);
        if (cancelled) return;
        const set = new Set<string>();
        for (const item of list ?? []) {
          for (const d of datesInRange(item.start_day, item.end_day)) {
            set.add(d);
          }
        }
        setBlockedDatesSet(set);
      } catch {
        if (!cancelled) setBlockedDatesSet(new Set());
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pid]);

  const generateCalendarDays = (): DayInfo[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: DayInfo[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const notPast = date >= today;
      const isBlocked = blockedDatesSet.has(dateStr) || blockedDatesFromAvailabilityApi.has(dateStr);
      const isAvailable = notPast && !isBlocked;
      days.push({ date: dateStr, day, isAvailable, isBlocked });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  ];

  const availableSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    const entry = availableDatesData.find((d) => parseDateOnly(d.date) === parseDateOnly(selectedDate));
    if (!entry?.slots || !Array.isArray(entry.slots)) return new Set<string>();
    return new Set(entry.slots.map((s) => normalizeSlotForBookingComparison(s)));
  }, [selectedDate, availableDatesData]);

  const bookedSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    const keys =
      bookedSlotKeysByDate[selectedDate] ??
      bookedSlotKeysByDate[parseBookingDateKey(selectedDate)] ??
      [];
    return new Set(keys);
  }, [selectedDate, bookedSlotKeysByDate]);

  if (pid == null) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
        Calendar could not be loaded (missing professional). Use another way to contact support to reschedule.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base text-[#0A1A2F] flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Choose a date
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium min-w-[120px] text-center">{monthName}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="text-center text-[10px] font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayInfo, index) => (
              <div key={index} className="aspect-square">
                {dayInfo ? (
                  <button
                    type="button"
                    onClick={() => dayInfo.isAvailable && onSelectDate(dayInfo.date)}
                    disabled={!dayInfo.isAvailable}
                    title={dayInfo.isBlocked ? "Not available" : dayInfo.isAvailable ? undefined : "Past date"}
                    className={`w-full h-full min-h-[2rem] rounded-md text-xs transition-all ${
                      selectedDate === dayInfo.date
                        ? "bg-red-600 text-white font-semibold"
                        : dayInfo.isAvailable
                          ? "bg-white border border-gray-200 hover:border-red-300 text-gray-900"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {dayInfo.day}
                  </button>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Unavailable days match the professional&apos;s blocked dates and notice rules. At least 24 hours ahead.
          </p>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#0A1A2F] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Choose a time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoadingAvailableDates ? (
              <div className="flex items-center justify-center py-6 text-gray-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading time slots…
              </div>
            ) : (
              <>
                <Label className="mb-2 block text-xs text-gray-600">
                  Available slots for{" "}
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {timeSlots.map((slot) => {
                    const slotKey = normalizeSlotForBookingComparison(slot);
                    const isAvailable =
                      availableSlotsForSelectedDate.has(slotKey) && !bookedSlotsForSelectedDate.has(slotKey);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => isAvailable && onSelectTime(slot)}
                        disabled={!isAvailable}
                        className={`p-2 text-center text-sm rounded-lg border transition-all ${
                          !isAvailable
                            ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                            : selectedTime === slot
                              ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                              : "border-gray-200 hover:border-red-300"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
