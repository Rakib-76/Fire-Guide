import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { 
  Calendar, 
  Clock, 
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Loader2
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { fetchProfessionalProfileAvailableDates, ProfessionalProfileAvailableDateItem } from "../api/availableDatesService";
import { getNoticeBlockedBookingDates } from "../api/professionalsService";
import { normalizeSlotForBookingComparison, parseBookingDateKey } from "../lib/bookingSlotNormalize";
import type { BookingData } from "./BookingFlow";
import { BookingServiceDetailsLines } from "./BookingServiceDetailsLines";

/** Parse API date string to YYYY-MM-DD. Handles "2026-03-28 00:00:00" and "2026-03-28T00:00:00.000000Z". */
function parseDateOnly(dateStr: string): string {
  if (!dateStr) return "";
  const s = dateStr.replace(" ", "T").slice(0, 10);
  return s;
}

interface AppointmentSelectionProps {
  service: BookingData["service"];
  professional: BookingData["professional"];
  professionalId?: number | null;
  pricing: BookingData["pricing"];
  pricingErrorMessage?: string;
  onContinue: (date: string, time: string) => void;
  onBack: () => void;
}

function readSessionBookedSlotKeysByDate(professionalId: number): Record<string, string[]> {
  try {
    const raw = sessionStorage.getItem(`fireguide_session_booked_slots_${professionalId}`);
    const arr = JSON.parse(raw || "[]") as { date?: string; time?: string }[];
    const rec: Record<string, string[]> = {};
    for (const x of arr) {
      if (!x?.date || !x?.time) continue;
      const dk = parseBookingDateKey(x.date);
      const tk = normalizeSlotForBookingComparison(x.time);
      if (!rec[dk]) rec[dk] = [];
      if (!rec[dk].includes(tk)) rec[dk].push(tk);
    }
    return rec;
  } catch {
    return {};
  }
}

function mergeBookedSlotRecords(
  fromApi: Record<string, string[]>,
  fromSession: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = { ...fromApi };
  for (const [d, list] of Object.entries(fromSession)) {
    out[d] = [...new Set([...(out[d] || []), ...list])];
  }
  return out;
}

export function AppointmentSelection({
  service,
  professional,
  professionalId,
  pricing,
  pricingErrorMessage,
  onContinue,
  onBack
}: AppointmentSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDatesData, setAvailableDatesData] = useState<ProfessionalProfileAvailableDateItem[]>([]);
  const [isLoadingAvailableDates, setIsLoadingAvailableDates] = useState(false);
  const [blockedDatesSet, setBlockedDatesSet] = useState<Set<string>>(new Set());
  /** Blocked days returned inside POST available-date (blocked_ranges / notice), merged into calendar. */
  const [blockedDatesFromAvailabilityApi, setBlockedDatesFromAvailabilityApi] = useState<Set<string>>(new Set());
  /** Normalized slot keys already taken per YYYY-MM-DD (API + this browser session after a successful booking). */
  const [bookedSlotKeysByDate, setBookedSlotKeysByDate] = useState<Record<string, string[]>>({});
  const [availabilityRefreshTick, setAvailabilityRefreshTick] = useState(0);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setAvailabilityRefreshTick((t) => t + 1);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Fetch available dates for this professional when we have professional_id
  useEffect(() => {
    if (professionalId == null || Number.isNaN(Number(professionalId))) {
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
          await fetchProfessionalProfileAvailableDates(Number(professionalId));
        if (!cancelled) {
          setAvailableDatesData(dates ?? []);
          setBlockedDatesFromAvailabilityApi(new Set(blockedCalendarDates ?? []));
          const sessionBooked = readSessionBookedSlotKeysByDate(Number(professionalId));
          setBookedSlotKeysByDate(mergeBookedSlotRecords(apiBooked ?? {}, sessionBooked));
        }
      } catch (err) {
        if (!cancelled) {
          setAvailableDatesData([]);
          setBlockedDatesFromAvailabilityApi(new Set());
          setBookedSlotKeysByDate({});
        }
      } finally {
        if (!cancelled) setIsLoadingAvailableDates(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [professionalId, availabilityRefreshTick]);

  // Fetch blocked booking days: notice_blocked_dates + blocked_ranges from booking-days-list.
  useEffect(() => {
    if (professionalId == null || Number.isNaN(Number(professionalId))) {
      setBlockedDatesSet(new Set());
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const blocked = await getNoticeBlockedBookingDates(Number(professionalId));
        if (cancelled) return;
        setBlockedDatesSet(new Set(blocked));
      } catch {
        if (!cancelled) setBlockedDatesSet(new Set());
      }
    };
    load();
    return () => { cancelled = true; };
  }, [professionalId]);

  // Clear selected time when date changes (slots may differ)
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  type DayInfo = {
    date: string;
    day: number;
    isAvailable: boolean;
    isBlocked: boolean;
  } | null;

  // Generate calendar days for current month
  const generateCalendarDays = (): DayInfo[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: DayInfo[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month — use local YYYY-MM-DD so selectedDate matches API (e.g. 2026-03-10)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const notPast = date >= today;
      const isBlocked =
        blockedDatesSet.has(dateStr) || blockedDatesFromAvailabilityApi.has(dateStr);
      const isAvailable = notPast && !isBlocked;

      days.push({
        date: dateStr,
        day,
        isAvailable,
        isBlocked
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
  ];

  // For the selected date, which slots the API lists as bookable (before removing taken times).
  const availableSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    const entry = availableDatesData.find((d) => parseDateOnly(d.date) === parseDateOnly(selectedDate));
    if (!entry || !entry.slots || !Array.isArray(entry.slots)) return new Set<string>();
    return new Set(entry.slots.map((s) => normalizeSlotForBookingComparison(s)));
  }, [selectedDate, availableDatesData]);

  const bookedSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    const keys = bookedSlotKeysByDate[selectedDate] ?? bookedSlotKeysByDate[parseDateOnly(selectedDate)] ?? [];
    return new Set(keys);
  }, [selectedDate, bookedSlotKeysByDate]);

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onContinue(selectedDate, selectedTime);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthName = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link
            to="/"
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white py-6 px-4 md:px-6 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="text-sm font-medium text-red-600">Select Date & Time</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-sm text-gray-500">Your Details</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-sm text-gray-500">Payment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>

          <h1 className="text-[#0A1A2F] mb-8">Select Your Appointment</h1>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Calendar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Service Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                      <BookingServiceDetailsLines service={service} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Your Professional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <img
                      src={professional.photo}
                      alt={professional.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{professional.name}</h3>
                        {professional.verified && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Rating: {professional.rating} ⭐ • Verified Professional</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendar */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Choose a Date
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={previousMonth}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[150px] text-center">{monthName}</span>
                      <Button variant="outline" size="sm" onClick={nextMonth}>
                        <ChevronRightIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((dayInfo, index) => (
                      <div key={index}>
                        {dayInfo ? (
                          <button
                            onClick={() => dayInfo.isAvailable && handleSelectDate(dayInfo.date)}
                            disabled={!dayInfo.isAvailable}
                            title={dayInfo.isBlocked ? "Blocked – not available" : dayInfo.isAvailable ? undefined : "Past date"}
                            className={`w-full aspect-square rounded-lg text-sm transition-all ${
                              selectedDate === dayInfo.date
                                ? "bg-red-600 text-white font-semibold"
                                : dayInfo.isAvailable
                                ? "bg-white border-2 border-gray-200 hover:border-red-300 text-gray-900"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            {dayInfo.day}
                          </button>
                        ) : (
                          <div className="w-full aspect-square" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Select any available date. Appointments must be booked at least 24 hours in advance.
                  </p>
                </CardContent>
              </Card>

              {/* Time Slots — only enable slots returned by API for the selected date */}
              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Choose a Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAvailableDates ? (
                      <div className="flex items-center justify-center py-6 text-gray-600">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Loading time slots…
                      </div>
                    ) : (
                      <>
                        <Label className="mb-3 block">
                          Available time slots for {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {timeSlots.map((slot) => {
                            const slotKey = normalizeSlotForBookingComparison(slot);
                            const isAvailable =
                              availableSlotsForSelectedDate.has(slotKey) &&
                              !bookedSlotsForSelectedDate.has(slotKey);
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => isAvailable && setSelectedTime(slot)}
                                disabled={!isAvailable}
                                className={`p-3 text-center rounded-lg border-2 transition-all ${
                                  !isAvailable
                                    ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                                    : selectedTime === slot
                                    ? "border-red-600 bg-red-50 text-red-600 font-semibold"
                                    : "border-gray-200 hover:border-red-300"
                                }`}
                              >
                                <Clock className="w-4 h-4 inline mr-2" />
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

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F]">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedDate && selectedTime ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Appointment Selected</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {new Date(selectedDate).toLocaleDateString('en-GB', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-700">{selectedTime}</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Select a date and time to continue</p>
                        </div>
                      )}

                      {pricingErrorMessage ? (
                        <div className="pt-4 border-t rounded-lg border-amber-200 bg-amber-50 p-3">
                          <p className="text-sm text-amber-800">{pricingErrorMessage}</p>
                          <p className="text-xs text-amber-700 mt-1">Contact the professional or support for pricing.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-4 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Service fee</span>
                            <span className="text-gray-900">£{pricing.servicePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Platform fee{pricing.platformFeePercent != null && pricing.platformFeePercent !== "" ? ` (${pricing.platformFeePercent}%)` : ""}
                            </span>
                            <span className="text-gray-900">£{pricing.platformFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="text-xl font-semibold text-gray-900">£{pricing.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleContinue}
                  disabled={!selectedDate || !selectedTime}
                  className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg"
                >
                  Continue to Details
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
