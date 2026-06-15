import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Calendar, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import {
  fetchProfessionalProfileAvailableDates,
  findAvailabilityEntryForDate,
  getBookableSlotsForDateEntry,
  type ProfessionalProfileAvailableDateItem,
} from "../api/availableDatesService";
import { getNoticeBlockedBookingDates } from "../api/professionalsService";
import { normalizeSlotForBookingComparison } from "../lib/bookingSlotNormalize";

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
 * - POST `block-professional/booking-days-list` with `{ professional_id }` (notice_blocked_dates + blocked_ranges)
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
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingAvailableDates(true);
      try {
        const { dates, blockedCalendarDates } = await fetchProfessionalProfileAvailableDates(pid);
        if (!cancelled) {
          setAvailableDatesData(dates ?? []);
          setBlockedDatesFromAvailabilityApi(new Set(blockedCalendarDates ?? []));
        }
      } catch {
        if (!cancelled) {
          setAvailableDatesData([]);
          setBlockedDatesFromAvailabilityApi(new Set());
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
        const blocked = await getNoticeBlockedBookingDates(pid);
        if (cancelled) return;
        setBlockedDatesSet(new Set(blocked));
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

  const selectedDateEntry = useMemo(
    () => findAvailabilityEntryForDate(availableDatesData, selectedDate),
    [availableDatesData, selectedDate]
  );

  const bookableTimeSlots = useMemo(
    () => getBookableSlotsForDateEntry(selectedDateEntry),
    [selectedDateEntry]
  );

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
                {bookableTimeSlots.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No time slots are available for this date. Please choose another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {bookableTimeSlots.map((slot) => {
                      const isSelected =
                        normalizeSlotForBookingComparison(selectedTime) ===
                        normalizeSlotForBookingComparison(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onSelectTime(slot)}
                          className={`p-2 text-center text-sm rounded-lg border transition-all ${
                            isSelected
                              ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                              : "border-gray-200 hover:border-red-300"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
