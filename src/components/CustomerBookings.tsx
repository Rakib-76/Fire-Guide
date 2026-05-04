import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  FileText,
  Download,
  CheckCircle,
  Building2,
  Loader2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Booking } from "../App";
import { getCustomerAllBookings, CustomerAllBookingItem, cancelCustomerBooking, rescheduleCustomerBooking } from "../api/authService";
import { getApiToken } from "../lib/auth";
import {
  storePaymentInvoice,
  isPaymentInvoiceStoreSuccess,
  extractStripeCheckoutUrl,
  extractTxRefFromInvoiceResponse,
} from "../api/paymentService";
import {
  getStripeCheckoutSuccessUrl,
  getPaymentFailedPageUrl,
  PAYMENT_RETURN_STORAGE_KEY,
  type PaymentReturnContext,
} from "../lib/paymentAppUrls";

// Available time slots for rescheduling
const TIME_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM"
];

// Reschedule form data interface
interface RescheduleFormData {
  date: string;
  time: string;
  reason: string;
}

interface CustomerBookingsProps {
  bookings: Booking[];
  onUpdateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  onDeleteBooking: (bookingId: string) => void;
}

/** Laravel may send is_paid as bool, 1/0, or "1"/"0"; some rows use payment_status. */
function parseApiBookingPaid(apiBooking: CustomerAllBookingItem): boolean {
  const raw = apiBooking.is_paid;
  if (raw === true) return true;
  if (raw === false || raw === 0 || raw === "0") return false;
  if (raw === 1 || raw === "1") return true;
  if (typeof raw === "string" && ["true", "yes", "paid"].includes(raw.toLowerCase())) return true;

  const ps = (apiBooking.payment_status ?? "").toString().trim().toLowerCase();
  if (ps === "paid" || ps === "completed" || ps === "succeeded" || ps === "success") return true;

  return false;
}

// Transform API booking to local Booking format
const transformApiBooking = (apiBooking: CustomerAllBookingItem): Booking => {
  // Map API status to filter category (for filtering purposes)
  const mapStatusToCategory = (status: string): "upcoming" | "completed" | "cancelled" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'completed') return 'completed';
    if (lowerStatus === 'cancelled' || lowerStatus === 'canceled') return 'cancelled';
    // confirmed, pending, etc. are considered upcoming for filtering
    return 'upcoming';
  };

  // Format address
  const fullAddress = [
    apiBooking.property_address,
    apiBooking.city,
    apiBooking.post_code
  ].filter(Boolean).join(', ');

  // Get service name from API response, fallback to default
  const serviceName = apiBooking.service?.service_name || 'Fire Safety Service';

  // Get professional name - check both full_name and name fields
  const professionalName = apiBooking.professional?.full_name || apiBooking.professional?.name || 'Professional';

  return {
    id: apiBooking.id.toString(),
    service: serviceName,
    professional: professionalName,
    professionalEmail: apiBooking.email || '',
    professionalPhone: apiBooking.phone || '',
    date: apiBooking.selected_date,
    time: apiBooking.selected_time,
    location: fullAddress || 'Address not specified',
    price: `£${parseFloat(String(apiBooking.price ?? "0")).toFixed(2)}`,
    status: mapStatusToCategory(apiBooking.status),
    // Store the original API status for display
    displayStatus: apiBooking.status.charAt(0).toUpperCase() + apiBooking.status.slice(1).toLowerCase(),
    bookingRef: apiBooking.ref_code || `FG-${apiBooking.id}`,
    hasReport: apiBooking.status.toLowerCase() === 'completed',
    isPaid: parseApiBookingPaid(apiBooking),
  };
};

/** Show Pay when API reported the booking is not yet paid. */
const bookingNeedsPayment = (booking: Booking): boolean => booking.isPaid !== true;

/** Paid bookings should not offer customer self-service cancel (refund flows are separate). */
const bookingAllowsCustomerCancel = (booking: Booking): boolean =>
  booking.status === "upcoming" && booking.isPaid !== true;

const parseBookingPriceNumber = (priceLabel: string): number => {
  const n = parseFloat(String(priceLabel).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

function sanitizeReportFilenamePart(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "booking";
}

/** PDF summary for completed bookings (uses booking data from My Bookings). */
function downloadCustomerBookingReportPdf(booking: Booking): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const primary: [number, number, number] = [10, 26, 47];
  const gray: [number, number, number] = [100, 100, 100];

  doc.setFillColor(220, 38, 38);
  doc.rect(margin, 10, 14, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FG", margin + 3.5, 17);

  doc.setTextColor(...primary);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Fire Guide", margin + 18, 17);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text("Service completion report", pageWidth - margin, 14, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, pageWidth - margin, 20, { align: "right" });

  let y = 28;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const ref = booking.bookingRef || `FG-${booking.id}`;
  const labelX = margin;
  const valueX = margin + 46;
  const valueWidth = pageWidth - valueX - margin;

  const row = (label: string, value: string) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text(label, labelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(value || "—", valueWidth);
    doc.text(lines, valueX, y);
    y += Math.max(7, lines.length * 5 + 2);
  };

  row("Booking reference", ref);
  row("Service", booking.service);
  row("Professional", booking.professional);
  row("Professional email", booking.professionalEmail);
  row("Professional phone", booking.professionalPhone);
  row("Appointment date", new Date(booking.date).toLocaleDateString("en-GB"));
  row("Appointment time", booking.time);
  row("Service address", booking.location);
  row("Amount", booking.price);
  row("Booking status", booking.displayStatus || booking.status);
  row("Payment", booking.isPaid === true ? "Paid" : "Not recorded as paid");

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  const disclaimer = doc.splitTextToSize(
    "This PDF summarises your completed booking on Fire Guide. For full technical compliance documentation from your visit, contact your professional or Fire Guide support.",
    pageWidth - 2 * margin
  );
  if (y + disclaimer.length * 4 > 285) {
    doc.addPage();
    y = 20;
  }
  doc.text(disclaimer, margin, y);

  doc.save(`FireGuide-Report-${sanitizeReportFilenamePart(ref)}.pdf`);
}

export const CustomerBookings = React.memo(function CustomerBookings({ bookings: propBookings, onUpdateBooking, onDeleteBooking }: CustomerBookingsProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  
  // API data state
  const [apiBookings, setApiBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null); // Track which booking is being cancelled
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleFormData>({
    date: '',
    time: '',
    reason: ''
  });

  const fetchBookingsFromApi = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const token = getApiToken();
    if (!token) {
      console.log("No API token available for bookings");
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    try {
      const response = await getCustomerAllBookings(token);
      if (response.status === "success" && response.data?.bookings) {
        const transformedBookings = response.data.bookings.map(transformApiBooking);
        setApiBookings(transformedBookings);
      } else {
        console.error("Failed to fetch bookings:", response.message || response.error);
        setApiBookings([]);
      }
    } catch (error: unknown) {
      console.error("Error fetching bookings:", error);
      setApiBookings([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookingsFromApi();
  }, [fetchBookingsFromApi]);

  // After Stripe / webhook, `is_paid` updates on the server — refresh when user returns to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchBookingsFromApi({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchBookingsFromApi]);

  // Use API bookings
  const bookings = apiBookings;

  // Keep details modal in sync after silent refetch (e.g. `is_paid` from webhook).
  useEffect(() => {
    setSelectedBooking((prev) => {
      if (!prev) return null;
      const next = apiBookings.find((b) => b.id === prev.id);
      return next ?? prev;
    });
  }, [apiBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => 
      filter === "all" ? true : booking.status === filter
    );
  }, [bookings, filter]);

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
      case "upcoming":
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setIsCancelling(bookingId);
    try {
      const response = await cancelCustomerBooking(token, parseInt(bookingId));
      if (response.status === 'success') {
        toast.success(response.message || "Booking cancelled successfully. Refund will be processed within 5-7 days.");
        setSelectedBooking(null);
        // Remove the cancelled booking from the list or update its status
        setApiBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' as const, displayStatus: 'Cancelled' }
            : booking
        ));
        onDeleteBooking(bookingId);
      } else {
        toast.error(response.message || "Failed to cancel booking. Please try again.");
      }
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || "Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(null);
    }
  };

  const handleDownloadReport = (booking: Booking) => {
    try {
      downloadCustomerBookingReportPdf(booking);
      toast.success(`Report downloaded for ${booking.bookingRef || booking.id}`);
    } catch (e) {
      console.error("Report PDF error:", e);
      toast.error("Could not generate the PDF. Please try again.");
    }
  };

  const handlePayBooking = async (booking: Booking) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to complete payment.");
      return;
    }

    const professionalBookingId = parseInt(booking.id, 10);
    if (!Number.isFinite(professionalBookingId) || professionalBookingId <= 0) {
      toast.error("Invalid booking reference. Please refresh and try again.");
      return;
    }

    const price = parseBookingPriceNumber(booking.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Could not read the booking amount. Please contact support.");
      return;
    }

    setPayingBookingId(booking.id);
    try {
      const successUrl = getStripeCheckoutSuccessUrl();
      const failedUrl = getPaymentFailedPageUrl();

      const response = await storePaymentInvoice({
        api_token: token,
        professional_booking_id: professionalBookingId,
        price,
        success_url: successUrl,
        cancel_url: failedUrl,
        failure_url: failedUrl,
      });

      const checkoutUrl = extractStripeCheckoutUrl(response);
      const txRef = extractTxRefFromInvoiceResponse(response);

      const returnCtx: PaymentReturnContext = {
        amountPaid: price,
        totalAmount: price,
        paidIncentives: 0,
        paidBalance: 0,
        paidOnline: price,
        orderIds: [booking.bookingRef || `FG-${professionalBookingId}`],
        transactionId: txRef ?? "",
      };
      try {
        sessionStorage.setItem(PAYMENT_RETURN_STORAGE_KEY, JSON.stringify(returnCtx));
      } catch {
        /* ignore */
      }

      if (isPaymentInvoiceStoreSuccess(response) && checkoutUrl) {
        toast.success("Redirecting to secure payment…");
        window.location.assign(checkoutUrl);
        return;
      }
      if (isPaymentInvoiceStoreSuccess(response) && !checkoutUrl) {
        throw {
          message:
            (response as { message?: string })?.message ||
            "Could not start checkout: server did not return a Stripe link. Your booking has not been marked paid.",
        };
      }
      throw { message: (response as { message?: string })?.message || "Failed to start payment" };
    } catch (error: unknown) {
      console.error("Pay booking error:", error);
      const err = error as { message?: string; status?: number };
      toast.error(err.message || "Could not start payment. Please try again.");
      if (typeof err.status === "number" && err.status !== 401) {
        window.location.assign(getPaymentFailedPageUrl());
      }
    } finally {
      setPayingBookingId(null);
    }
  };

  // Open reschedule modal
  const handleOpenReschedule = (booking: Booking) => {
    // Close the Booking Details modal first
    setSelectedBooking(null);
    
    // Open the Reschedule modal
    setBookingToReschedule(booking);
    setRescheduleForm({
      date: '',
      time: '',
      reason: ''
    });
    setShowRescheduleModal(true);
  };

  // Close reschedule modal
  const handleCloseReschedule = () => {
    setShowRescheduleModal(false);
    setBookingToReschedule(null);
    setRescheduleForm({
      date: '',
      time: '',
      reason: ''
    });
  };

  // Format date for display (e.g., "Jan 20, 2026 at 10:30 AM")
  const formatAppointmentDate = (date: string, time: string) => {
    try {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${formattedDate} at ${time}`;
    } catch {
      return `${date} at ${time}`;
    }
  };

  // Convert 12-hour time to 24-hour format for API
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = modifier === 'AM' ? '00' : '12';
    } else if (modifier === 'PM') {
      hours = String(parseInt(hours, 10) + 12);
    }
    
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  };

  // Handle reschedule form submission
  const handleRescheduleSubmit = async () => {
    if (!bookingToReschedule) return;
    
    // Validate required fields
    if (!rescheduleForm.date || !rescheduleForm.time) {
      toast.error("Please select a new date and time.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    // Convert time to 24-hour format
    const formattedTime = convertTo24Hour(rescheduleForm.time);

    setIsRescheduling(true);
    try {
      const response = await rescheduleCustomerBooking(
        token,
        parseInt(bookingToReschedule.id),
        rescheduleForm.date,
        formattedTime,
        rescheduleForm.reason || 'Rescheduled by customer'
      );
      
      if (response.status === 'success') {
        toast.success(response.message || "Reschedule request sent successfully!");
        
        // Update the booking in the list with new date/time
        setApiBookings(prev => prev.map(booking => 
          booking.id === bookingToReschedule.id 
            ? { 
                ...booking, 
                date: rescheduleForm.date, 
                time: rescheduleForm.time,
                displayStatus: 'Pending'
              }
            : booking
        ));
        
        // Close both modals
        handleCloseReschedule();
        setSelectedBooking(null);
      } else {
        toast.error(response.message || "Failed to reschedule booking. Please try again.");
      }
    } catch (error: any) {
      console.error('Error rescheduling booking:', error);
      toast.error(error.message || "Failed to reschedule booking. Please try again.");
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          All Bookings ({bookings.length})
        </Button>
        <Button
          variant={filter === "upcoming" ? "default" : "outline"}
          onClick={() => setFilter("upcoming")}
          className={filter === "upcoming" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Upcoming ({bookings.filter(b => b.status === "upcoming").length})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
          className={filter === "completed" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Completed ({bookings.filter(b => b.status === "completed").length})
        </Button>
        <Button
          variant={filter === "cancelled" ? "default" : "outline"}
          onClick={() => setFilter("cancelled")}
          className={filter === "cancelled" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Cancelled ({bookings.filter(b => b.status === "cancelled").length})
        </Button>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading bookings...</p>
          </CardContent>
        </Card>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bookings found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[#0A1A2F] mb-1">{booking.service}</h3>
                        <p className="text-sm text-gray-600">Ref: {booking.bookingRef}</p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.displayStatus || booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{booking.professional}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.date).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{booking.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{booking.location}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-gray-900">
                        Total: <span className="font-semibold">{booking.price}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooking(booking)}
                      className="flex-1 md:flex-none"
                    >
                      View Details
                    </Button>
                    {bookingNeedsPayment(booking) && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 md:flex-none bg-red-600 hover:bg-red-700"
                        onClick={() => handlePayBooking(booking)}
                        disabled={payingBookingId === booking.id || isCancelling === booking.id}
                      >
                        {payingBookingId === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Redirecting…
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay
                          </>
                        )}
                      </Button>
                    )}
                    {bookingAllowsCustomerCancel(booking) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 md:flex-none text-red-600 hover:text-red-700"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={isCancelling === booking.id || payingBookingId === booking.id}
                      >
                        {isCancelling === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel'
                        )}
                      </Button>
                    )}
                    {booking.status === "completed" && booking.hasReport && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 md:flex-none"
                        onClick={() => handleDownloadReport(booking)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Report
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Details Dialog */}
      <Dialog open={selectedBooking !== null} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Reference: {selectedBooking?.bookingRef}
              </DialogDescription>
            </div>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[#0A1A2F]">{selectedBooking.service}</h3>
                <Badge className={getStatusColor(selectedBooking.status)}>
                  {selectedBooking.displayStatus || selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Date & Time</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(selectedBooking.date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{selectedBooking.time}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                      <span>{selectedBooking.location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Professional</p>
                    <div className="flex items-center gap-3 mb-3">
                      {selectedBooking.professionalImage ? (
                        <img
                          src={selectedBooking.professionalImage}
                          alt={selectedBooking.professional}
                          className={`w-12 h-12 object-cover ${
                            selectedBooking.professionalType === "company" 
                              ? "rounded-lg" 
                              : "rounded-full"
                          }`}
                        />
                      ) : (
                        <div className={`w-12 h-12 bg-gray-200 flex items-center justify-center ${
                          selectedBooking.professionalType === "company" 
                            ? "rounded-lg" 
                            : "rounded-full"
                        }`}>
                          {selectedBooking.professionalType === "company" ? (
                            <Building2 className="w-6 h-6 text-gray-500" />
                          ) : (
                            <User className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                      )}
                      <span>{selectedBooking.professional}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedBooking.professionalEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedBooking.professionalPhone}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Payment</p>
                    <p className="text-2xl font-bold text-[#0A1A2F]">{selectedBooking.price}</p>
                    {!selectedBooking.isPaid ? (
                      <p className="text-sm text-amber-700 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        Payment required — use Pay to complete checkout
                      </p>
                    ) : (
                      <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="w-4 h-4" />
                        Paid
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedBooking.status === "completed" && selectedBooking.hasReport && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Compliance Report Available</p>
                        <p className="text-sm text-green-700">Download your fire safety report</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownloadReport(selectedBooking)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {selectedBooking.status === "upcoming" && (
                <div className="space-y-2 pt-4 border-t">
                  {bookingNeedsPayment(selectedBooking) && (
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => handlePayBooking(selectedBooking)}
                      disabled={payingBookingId === selectedBooking.id || isCancelling === selectedBooking.id}
                    >
                      {payingBookingId === selectedBooking.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirecting…
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay now
                        </>
                      )}
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenReschedule(selectedBooking)}
                      className="flex-1"
                      disabled={isCancelling === selectedBooking.id || payingBookingId === selectedBooking.id}
                    >
                      Reschedule
                    </Button>
                    {bookingAllowsCustomerCancel(selectedBooking) && (
                      <Button
                        variant="outline"
                        onClick={() => handleCancelBooking(selectedBooking.id)}
                        className="flex-1 text-red-600 hover:text-red-700"
                        disabled={isCancelling === selectedBooking.id || payingBookingId === selectedBooking.id}
                      >
                        {isCancelling === selectedBooking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel Booking'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Appointment Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={handleCloseReschedule}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Request a new date and time for this booking
            </DialogDescription>
          </DialogHeader>

          {bookingToReschedule && (
            <div className="space-y-5">
              {/* Current Appointment Card */}
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Current Appointment</p>
                <p className="font-semibold text-gray-900">
                  {formatAppointmentDate(bookingToReschedule.date, bookingToReschedule.time)}
                </p>
                <p className="text-sm text-gray-600">{bookingToReschedule.professional}</p>
              </div>

              {/* New Date */}
              <div className="space-y-2">
                <Label htmlFor="reschedule-date" className="text-sm font-medium">
                  New Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleForm.date}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>

              {/* New Time */}
              <div className="space-y-2">
                <Label htmlFor="reschedule-time" className="text-sm font-medium">
                  New Time <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={rescheduleForm.time}
                  onValueChange={(value) => setRescheduleForm(prev => ({ ...prev, time: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="reschedule-reason" className="text-sm font-medium">
                  Reason (Optional)
                </Label>
                <Textarea
                  id="reschedule-reason"
                  placeholder="Let the customer know why you need to reschedule..."
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Info Message */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This will send a reschedule request to the customer. They must approve the new date and time.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleRescheduleSubmit}
                  disabled={isRescheduling || !rescheduleForm.date || !rescheduleForm.time}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isRescheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Send Reschedule Request
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseReschedule}
                  disabled={isRescheduling}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});