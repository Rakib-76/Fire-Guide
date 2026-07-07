import React, { useState, useEffect, useMemo } from "react";
import { Search, Calendar, MoreVertical, Eye, XCircle, CheckCircle, Clock, AlertCircle, MapPin, User, Briefcase, Mail, Phone, FileText, RefreshCw, Loader2, Home } from "lucide-react";
import { getApiToken } from "../lib/auth";
import {
  getAdminBookings,
  AdminBookingListItem,
  getAdminBookingsSummary,
  cancelAdminBooking,
} from "../api/adminService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import {
  getBookingPaymentStatusKey,
  getBookingPaymentStatusLabel,
} from "../lib/bookingPaymentStatus";
import { buildBookingServiceDetailsFromApiBooking } from "../lib/bookingServiceDetails";
import {
  getCustomQuoteRequestDisplayRows,
  loadQuoteRequestDurationLabelMap,
} from "./CustomQuoteRequestDetailsPanel";

type BookingDisplay = {
  id: number;
  reference: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  professional: string;
  professionalEmail: string;
  professionalPhone: string;
  professionalImage: string;
  professionalType: string;
  service: string;
  date: string;
  time: string;
  location: string;
  amount: string;
  commission: number;
  professionalPayout: number;
  status: string;
  createdAt: string;
  paymentStatus: string;
  notes: string;
  serviceDetails: Array<{ label: string; value: string }>;
  customQuoteRequestData?: string | Record<string, unknown>;
};

function formatBookingDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatAppointmentDisplay(dateStr: string, timeStr: string): { date: string; time: string } {
  try {
    const date = new Date(dateStr + "T00:00:00");
    const dateFormatted = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return { date: dateFormatted, time: timeStr || "—" };
  } catch {
    return { date: "—", time: timeStr || "—" };
  }
}

function formatLocation(addr: string, city: string, postCode: string): string {
  const parts = [addr, city, postCode].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

const BOOKING_FILTER_LABELS: Record<string, string> = {
  all: "All Status",
  confirmed: "Confirmed",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function AdminBookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    "Search reference, customer, or professional..."
  );
  const [compactLayout, setCompactLayout] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingDisplay | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationNote, setCancellationNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [bookingsList, setBookingsList] = useState<AdminBookingListItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsSummary, setBookingsSummary] = useState<{
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);
  const [fraDurationLabels, setFraDurationLabels] = useState<ReadonlyMap<number, string>>(
    () => new Map()
  );

  useEffect(() => {
    loadQuoteRequestDurationLabelMap().then(setFraDurationLabels);
  }, []);

  const selectedBookingServiceDetails = useMemo(() => {
    if (!selectedBooking) return [];
    if (selectedBooking.customQuoteRequestData) {
      return getCustomQuoteRequestDisplayRows(
        selectedBooking.customQuoteRequestData,
        fraDurationLabels
      );
    }
    return (selectedBooking.serviceDetails ?? []).map((row, index) => ({
      id: `service-${index}`,
      label: row.label,
      value: row.value,
    }));
  }, [selectedBooking, fraDurationLabels]);

  const loadBookings = async () => {
    const token = getApiToken();
    if (!token) return;
    setBookingsLoading(true);
    try {
      const res = await getAdminBookings({ api_token: token });
      if (res.success && Array.isArray(res.data)) setBookingsList(res.data);
      else setBookingsList([]);
    } catch {
      setBookingsList([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadBookingsSummary = async () => {
    const token = getApiToken();
    if (!token) return;
    setSummaryLoading(true);
    try {
      const res = await getAdminBookingsSummary({ api_token: token });
      if (res.success && res.data?.data) {
        const d = res.data.data;
        setBookingsSummary({
          total: d.total_booking ?? 0,
          confirmed: d.confirmed_booking ?? 0,
          pending: d.pending_booking ?? 0,
          completed: d.completed_booking ?? 0,
          cancelled: d.cancel_booking ?? 0,
        });
      } else {
        setBookingsSummary(null);
      }
    } catch {
      setBookingsSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const updateLayout = () => {
      const narrow = mq.matches;
      setCompactLayout(narrow);
      setSearchPlaceholder(
        narrow ? "Search" : "Search reference, customer, or professional..."
      );
    };
    updateLayout();
    mq.addEventListener("change", updateLayout);
    return () => mq.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    void loadBookings();
    void loadBookingsSummary();
  }, []);

  const mapApiToDisplay = (b: AdminBookingListItem): BookingDisplay => {
    const { date, time } = formatAppointmentDisplay(b.selected_date, b.selected_time);
    const selectedServiceDetails = buildBookingServiceDetailsFromApiBooking(b);
    const customQuoteRequestData = b.custom_quote_details?.request_data;
    const serviceDetails =
      selectedServiceDetails.length > 0
        ? selectedServiceDetails
        : customQuoteRequestData
          ? getCustomQuoteRequestDisplayRows(customQuoteRequestData).map(({ label, value }) => ({
              label,
              value,
            }))
          : [];

    return {
      id: b.id,
      reference: b.ref_code ?? "—",
      customer: [b.first_name, b.last_name].filter(Boolean).join(" ") || "—",
      customerEmail: b.email ?? "—",
      customerPhone: b.phone ?? "—",
      professional: b.professional_name ?? "—",
      professionalEmail: b.professional_email ?? "—",
      professionalPhone: b.professional_phone ?? "—",
      professionalImage: "",
      professionalType: "individual",
      service: b.service_name ?? "—",
      date,
      time,
      location: formatLocation(b.property_address, b.city, b.post_code),
      amount: b.price != null ? String(b.price) : "0",
      commission:
        b.platform_commission != null && b.platform_commission !== ""
          ? Number(b.platform_commission) || 0
          : 0,
      professionalPayout:
        b.professional_payout != null && b.professional_payout !== ""
          ? Number(b.professional_payout) || 0
          : 0,
      status: b.status ?? "pending",
      createdAt: formatBookingDate(b.created_at),
      paymentStatus: String(b.payment_status ?? "").trim()
        ? getBookingPaymentStatusKey({ payment_status: b.payment_status })
        : "",
      notes: "",
      serviceDetails,
      customQuoteRequestData:
        selectedServiceDetails.length === 0 && customQuoteRequestData
          ? customQuoteRequestData
          : undefined,
    };
  };

  const bookings: BookingDisplay[] = bookingsList.map(mapApiToDisplay);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = booking.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.professional.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: summaryLoading ? "—" : (bookingsSummary?.total ?? bookings.length),
    confirmed: summaryLoading ? "—" : (bookingsSummary?.confirmed ?? bookings.filter(b => b.status === "confirmed").length),
    pending: summaryLoading ? "—" : (bookingsSummary?.pending ?? bookings.filter(b => b.status === "pending").length),
    completed: summaryLoading ? "—" : (bookingsSummary?.completed ?? bookings.filter(b => b.status === "completed").length),
    cancelled: summaryLoading ? "—" : (bookingsSummary?.cancelled ?? bookings.filter(b => b.status === "cancelled").length),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const base =
      "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium";
    switch (String(status ?? "").trim().toLowerCase()) {
      case "confirmed":
        return `${base} bg-green-100 text-green-700 border-green-200`;
      case "pending":
        return `${base} bg-yellow-100 text-yellow-700 border-yellow-200`;
      case "completed":
        return `${base} bg-blue-100 text-blue-700 border-blue-200`;
      case "cancelled":
        return `${base} bg-red-100 text-red-700 border-red-200`;
      default:
        return `${base} bg-gray-100 text-gray-700 border-gray-200`;
    }
  };

  const getPaymentStatusBadgeClass = (paymentStatus: string) => {
    const base =
      "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium capitalize";
    switch (String(paymentStatus ?? "").trim().toLowerCase()) {
      case "paid":
        return `${base} bg-green-100 text-green-700 border-green-200`;
      case "pending":
        return `${base} bg-yellow-100 text-yellow-700 border-yellow-200`;
      case "failed":
        return `${base} bg-red-100 text-red-700 border-red-200`;
      case "refunded":
        return `${base} bg-purple-100 text-purple-700 border-purple-200`;
      case "unpaid":
        return `${base} bg-orange-100 text-orange-700 border-orange-200`;
      default:
        return `${base} bg-gray-100 text-gray-700 border-gray-200`;
    }
  };

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setDetailsModalOpen(true);
  };

  const canCancelBooking = (status: string) =>
    status === "pending" || status === "confirmed";

  const handleCancelBooking = (booking: BookingDisplay) => {
    setSelectedBooking(booking);
    setCancelModalOpen(true);
  };

  const renderCompactBookingActions = (booking: BookingDisplay) => (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-full"
        onClick={() => handleViewDetails(booking)}
      >
        <Eye className="mr-2 h-4 w-4 shrink-0" />
        View Details
      </Button>
      {canCancelBooking(booking.status) && (
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-full border-red-600 text-red-600 hover:bg-red-50"
          disabled={cancellingBookingId === booking.id}
          onClick={() => handleCancelBooking(booking)}
        >
          {cancellingBookingId === booking.id ? (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4 shrink-0" />
          )}
          Cancel Booking
        </Button>
      )}
    </div>
  );

  const handleReschedule = (booking: any) => {
    setSelectedBooking(booking);
    setRescheduleModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (!cancellationReason) {
      toast.error("Please select a cancellation reason");
      return;
    }
    const token = getApiToken();
    if (!token || !selectedBooking) {
      toast.error("Not authenticated");
      return;
    }

    setCancellingBookingId(selectedBooking.id);
    try {
      const response = await cancelAdminBooking({
        api_token: token,
        booking_id: selectedBooking.id,
        cancellation_reason: cancellationReason,
        cancellation_note: cancellationNote,
      });
      const ok =
        response.success === true ||
        response.status === "success" ||
        response.status === true;
      if (!ok) {
        toast.error(response.message || "Failed to cancel booking");
        return;
      }
      toast.success(
        response.message ||
          `Booking ${selectedBooking.reference} cancelled. Refund processed and parties notified.`
      );
      setCancelModalOpen(false);
      setCancellationReason("");
      setCancellationNote("");
      setDetailsModalOpen(false);
      await Promise.all([loadBookings(), loadBookingsSummary()]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to cancel booking");
    } finally {
      setCancellingBookingId(null);
    }
  };

  const confirmReschedule = () => {
    if (!newDate || !newTime) {
      toast.error("Please select new date and time");
      return;
    }
    toast.success(`Booking ${selectedBooking?.reference} rescheduled. Both parties have been notified.`);
    setRescheduleModalOpen(false);
    setNewDate("");
    setNewTime("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Booking Management</h1>
        <p className="text-gray-600">View and manage all platform bookings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl text-[#0A1A2F] mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Confirmed</p>
            <p className="text-2xl text-green-600 mt-1">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl text-yellow-600 mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl text-blue-600 mt-1">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Cancelled</p>
            <p className="text-2xl text-red-600 mt-1">{stats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div
            className={
              compactLayout
                ? "flex w-full flex-col gap-3"
                : "flex w-full items-center gap-4"
            }
          >
            <div className={compactLayout ? "relative w-full" : "relative min-w-0 flex-1"}>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full pl-10"
              />
            </div>

            <div className={compactLayout ? "w-full shrink-0" : "w-[180px] shrink-0"}>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 w-full px-4">
                  <SelectValue
                    placeholder="All Status"
                    label={BOOKING_FILTER_LABELS[filterStatus] ?? "All Status"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookingsLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Loading bookings...</p>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex items-start justify-between gap-3 lg:hidden">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg text-[#0A1A2F] break-words">{booking.reference}</h3>
                        <p className="mt-1 text-sm text-gray-600">Created {booking.createdAt}</p>
                      </div>
                      <Badge variant="custom" className={getStatusBadgeClass(booking.status)}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1">{booking.status}</span>
                      </Badge>
                    </div>

                    <div className="mb-3 hidden lg:block">
                      <div>
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="text-lg text-[#0A1A2F]">{booking.reference}</h3>
                          <Badge variant="custom" className={getStatusBadgeClass(booking.status)}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1">{booking.status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Created {booking.createdAt}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-medium text-gray-900">{booking.customer}</p>
                        <p className="text-sm text-gray-500 break-all">{booking.customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Professional</p>
                        <p className="font-medium text-gray-900">{booking.professional}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Service</p>
                        <p className="font-medium text-gray-900">{booking.service}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Appointment</p>
                        <p className="flex items-center gap-2 font-medium text-gray-900">
                          <Calendar className="h-4 w-4 shrink-0" />
                          {booking.date} at {booking.time}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="text-sm text-gray-900">{booking.location}</p>
                      </div>
                    </div>
                  </div>
                  </div>

                  {compactLayout ? (
                    <div className="w-full border-t border-gray-100 pt-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="text-2xl font-semibold text-[#0A1A2F]">£{booking.amount}</p>
                      </div>
                      {renderCompactBookingActions(booking)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 lg:items-end">
                      <div className="text-center lg:text-right">
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="text-2xl font-semibold text-[#0A1A2F]">£{booking.amount}</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          hideBackdrop
                          sideOffset={12}
                          alignOffset={10}
                        >
                          <DropdownMenuItem onClick={() => handleViewDetails(booking)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {canCancelBooking(booking.status) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleCancelBooking(booking)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Booking
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!bookingsLoading && filteredBookings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No bookings found matching your criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">Booking Details</DialogTitle>
            <DialogDescription>Complete booking information</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Booking Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-xl text-[#0A1A2F] mb-1">{selectedBooking?.reference}</h3>
                <p className="text-sm text-gray-600">Created on {selectedBooking?.createdAt}</p>
              </div>
              <Badge variant="custom" className={getStatusBadgeClass(selectedBooking?.status ?? "")}>
                {getStatusIcon(selectedBooking?.status)}
                <span className="ml-1">{selectedBooking?.status}</span>
              </Badge>
            </div>

            {/* Customer Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h4>
              <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm text-gray-600">Name</Label>
                  <p className="font-medium text-gray-900 mt-1">{selectedBooking?.customer}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Email</Label>
                  <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedBooking?.customerEmail}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Phone</Label>
                  <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedBooking?.customerPhone}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Professional Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Professional Information
              </h4>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  {selectedBooking?.professionalImage ? (
                    <img
                      src={selectedBooking.professionalImage}
                      alt={selectedBooking.professional}
                      className={`w-12 h-12 object-cover ${selectedBooking.professionalType === "individual"
                        ? "rounded-full"
                        : "rounded-lg"
                        }`}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedBooking?.professional}</p>
                    <p className="text-sm text-gray-600">{selectedBooking?.professionalEmail}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Phone</Label>
                    <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedBooking?.professionalPhone}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Booking Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointment Details
              </h4>
              <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="text-sm text-gray-600">Service</Label>
                  <p className="font-medium text-gray-900 mt-1">{selectedBooking?.service}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Date & Time</Label>
                  <p className="font-medium text-gray-900 mt-1">
                    {selectedBooking?.date} at {selectedBooking?.time}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm text-gray-600">Location</Label>
                  <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedBooking?.location}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm text-gray-600">Special Notes</Label>
                  <p className="text-gray-900 mt-1">{selectedBooking?.notes}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Service details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Home className="w-5 h-5 shrink-0" />
                Service details
              </h4>
              {selectedBookingServiceDetails.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg space-y-1.5 text-sm text-gray-600">
                  {selectedBookingServiceDetails.map((row) => (
                    <p key={row.id}>
                      {row.label}: <span className="text-gray-900">{row.value}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No additional service details.</p>
              )}
            </div>

            <Separator />

            {/* Payment Details */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold text-gray-900">£{selectedBooking?.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Commission (15%)</span>
                  <span className="font-semibold text-gray-900">£{selectedBooking?.commission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Professional Payout</span>
                  <span className="font-semibold text-gray-900">£{selectedBooking?.professionalPayout}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-600">Payment Status</span>
                  {selectedBooking?.paymentStatus ? (
                    <Badge
                      variant="custom"
                      className={getPaymentStatusBadgeClass(selectedBooking.paymentStatus)}
                    >
                      {getBookingPaymentStatusLabel(selectedBooking.paymentStatus)}
                    </Badge>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
            {/* Cancel Booking from details modal — hidden by request
            {(selectedBooking?.status === "confirmed" || selectedBooking?.status === "pending") && (
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => {
                setDetailsModalOpen(false);
                handleCancelBooking(selectedBooking);
              }}>
                Cancel Booking
              </Button>
            )}
            */}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Cancel booking {selectedBooking?.reference} and process refund
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cancellation-reason">Cancellation Reason *</Label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer-request">Customer Request</SelectItem>
                  <SelectItem value="professional-unavailable">Professional Unavailable</SelectItem>
                  <SelectItem value="duplicate-booking">Duplicate Booking</SelectItem>
                  <SelectItem value="payment-issue">Payment Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cancellation-note">Additional Notes (Optional)</Label>
              <Textarea
                id="cancellation-note"
                value={cancellationNote}
                onChange={(e) => setCancellationNote(e.target.value)}
                placeholder="Add any additional information..."
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Refund will be processed</p>
                <p className="text-sm text-red-700 mt-1">
                  The customer will be refunded £{selectedBooking?.amount} and both parties will be notified via email.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void confirmCancellation()}
              disabled={cancellingBookingId === selectedBooking?.id}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {cancellingBookingId === selectedBooking?.id
                ? "Cancelling..."
                : "Cancel Booking & Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-blue-600" />
              Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              Change the date and time for booking {selectedBooking?.reference}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Current Appointment</p>
              <p className="font-medium text-gray-900 mt-1">
                {selectedBooking?.date} at {selectedBooking?.time}
              </p>
            </div>

            <div>
              <Label htmlFor="new-date">New Date *</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="new-time">New Time *</Label>
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-700">
                Both the customer and professional will be notified of the schedule change via email.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={confirmReschedule}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}