import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { 
  Calendar, 
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Loader2
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import type { BookingData } from "./BookingFlow";
import { storeProfessionalBooking, ProfessionalBookingStoreRequest } from "../api/bookingService";
import { storeCustomQuoteRequest } from "../api/customQuoteRequestsService";
import { toast } from "sonner";
import { getApiToken } from "../lib/auth";

const BOOKING_SESSION_ID_KEY = "fireguide_booking_session_id";

interface CustomerDetailsFormProps {
  service: BookingData["service"];
  professional: BookingData["professional"];
  professionalId?: number | null;
  /** Service ID from Book response (sent in professional_booking/store). */
  serviceId?: number | null;
  /** Session ID from selected_services/store (sent in professional_booking/store). */
  sessionId?: number | null;
  selectedDate: string;
  selectedTime: string;
  pricing: BookingData["pricing"];
  pricingErrorMessage?: string;
  initialData: BookingData["customer"];
  onContinue: (customerData: BookingData["customer"]) => void;
  onBack: () => void;
  isCustomQuote?: boolean;
  /** When true, this booking has real price from API — never use custom-quote flow (avoids backend "Custom quote request not found") */
  forceNormalBooking?: boolean;
  customQuoteRequestData?: { building_type: string; people_count: string; floors: number };
  serviceIdForQuote?: number;
}

export function CustomerDetailsForm({
  service,
  professional,
  professionalId,
  serviceId,
  sessionId,
  selectedDate,
  selectedTime,
  pricing,
  pricingErrorMessage,
  initialData,
  onContinue,
  onBack,
  isCustomQuote,
  forceNormalBooking,
  customQuoteRequestData,
  serviceIdForQuote,
}: CustomerDetailsFormProps) {
  const useCustomQuoteFlow = Boolean(isCustomQuote && !forceNormalBooking);
  const [formData, setFormData] = useState<BookingData["customer"]>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomQuoteWaiting, setShowCustomQuoteWaiting] = useState(false);


  const updateFormData = (field: keyof BookingData["customer"], value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s+()-]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.postcode.trim()) newErrors.postcode = "Postcode is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get coordinates from address (using default coordinates if geocoding fails)
  const getCoordinates = async (address: string, city: string, postcode: string): Promise<{ longitude: number; latitude: number }> => {
    // For now, use default coordinates (can be enhanced with geocoding API)
    // Default coordinates for UK (London area)
    const defaultCoords = { longitude: -0.1276, latitude: 51.5074 };
    
    // Try to get user's location if available
    if (navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              longitude: position.coords.longitude,
              latitude: position.coords.latitude
            });
          },
          () => resolve(defaultCoords),
          { timeout: 5000 }
        );
      });
    }
    
    return defaultCoords;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      return;
    }

    if (!professionalId) {
      toast.error("Professional ID is missing. Please try again.");
      return;
    }
    if (serviceId == null || serviceId === undefined) {
      toast.error("Service is missing. Please start from the service search and try again.");
      return;
    }

    const storedSessionRaw = (() => {
      try {
        return sessionStorage.getItem(BOOKING_SESSION_ID_KEY);
      } catch {
        return null;
      }
    })();
    const storedSessionId =
      storedSessionRaw != null && storedSessionRaw !== ""
        ? parseInt(storedSessionRaw, 10)
        : undefined;
    const effectiveSessionId =
      sessionId != null && !Number.isNaN(Number(sessionId))
        ? Number(sessionId)
        : storedSessionId != null && !Number.isNaN(storedSessionId)
          ? storedSessionId
          : undefined;

    if (effectiveSessionId == null || Number.isNaN(effectiveSessionId)) {
      toast.error(
        "Your booking session is missing. Please go back to Compare Professionals and click Book again, or refresh this page."
      );
      return;
    }

    setIsSubmitting(true);

    const CUSTOM_QUOTE_REQUEST_ID_KEY = "fireguide_custom_quote_request_id";

    try {
      // Get coordinates
      const coordinates = await getCoordinates(formData.address, formData.city, formData.postcode);
      
      const token = getApiToken();
      let customQuoteRequestId: number | undefined;

      // Custom quote: create quote first so backend can find it when creating the booking (only when not forceNormalBooking)
      if (useCustomQuoteFlow && customQuoteRequestData && serviceIdForQuote) {
        try {
          const quoteResponse = await storeCustomQuoteRequest(
            token || null,
            serviceIdForQuote,
            formData.firstName.trim(),
            formData.email.trim(),
            formData.phone.trim(),
            customQuoteRequestData
          );
          const raw = quoteResponse as { data?: { id?: number; custom_quote_request_id?: number; custom_quote_request?: { id?: number } } };
          customQuoteRequestId =
            raw.data?.id ??
            raw.data?.custom_quote_request_id ??
            raw.data?.custom_quote_request?.id;
          if (customQuoteRequestId != null) {
            try {
              localStorage.setItem(CUSTOM_QUOTE_REQUEST_ID_KEY, String(customQuoteRequestId));
            } catch (_) {}
          }
        } catch (quoteErr) {
          console.error("Custom quote request failed:", quoteErr);
          toast.error("Custom quote request failed. Please try again.");
          return;
        }
      }

      // Only treat as custom quote for booking payload when we have an ID (avoid "custom quote not found")
      const isCustomQuoteWithId = useCustomQuoteFlow && customQuoteRequestId != null;

      const bookingPayload: ProfessionalBookingStoreRequest = {
        service_id: serviceId,
        selected_date: selectedDate,
        // Backend (e.g. PHP Carbon) expects 12-hour time *with* AM/PM — 24h like "14:00:00" causes "A meridian could not be found".
        selected_time: selectedTime.trim(),
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        property_address: formData.address,
        longitude: coordinates.longitude,
        latitude: coordinates.latitude,
        city: formData.city,
        post_code: formData.postcode,
        additional_notes: formData.notes || "",
        professional_id: professionalId,
        price: isCustomQuoteWithId ? 0 : Number(pricing.total),
      };
      if (token) {
        bookingPayload.api_token = token;
      }
      bookingPayload.session_id = effectiveSessionId;
      if (isCustomQuoteWithId && customQuoteRequestId != null) {
        bookingPayload.custom_quote_request_id = customQuoteRequestId;
        bookingPayload.custom_quote_id = customQuoteRequestId;
      }

      if (useCustomQuoteFlow && !customQuoteRequestId) {
        toast.error("Custom quote could not be created. Please try again.");
        return;
      }

      const response = await storeProfessionalBooking(bookingPayload);
      if (response.status === "success") {
        try {
          const sid = professionalId;
          if (sid != null && !Number.isNaN(Number(sid))) {
            const key = `fireguide_session_booked_slots_${sid}`;
            const prev = JSON.parse(sessionStorage.getItem(key) || "[]") as { date: string; time: string }[];
            prev.push({ date: selectedDate, time: selectedTime.trim() });
            sessionStorage.setItem(key, JSON.stringify(prev));
          }
        } catch {
          /* ignore */
        }
        if (useCustomQuoteFlow) {
          try {
            localStorage.removeItem(CUSTOM_QUOTE_REQUEST_ID_KEY);
          } catch (_) {}
          setShowCustomQuoteWaiting(true);
          toast.success("Booking submitted successfully!");
          toast.info("Wait for admin assigned then you can payment.");
          return;
        }
        toast.success("Booking submitted successfully!");
        const bookingId =
          response.data?.booking?.id ??
          response.data?.id ??
          response.data?.booking_id ??
          null;
        const bookingApiToken =
          typeof response.data?.api_token === "string" ? response.data.api_token : null;
        const updatedFormData = {
          ...formData,
          longitude: coordinates.longitude,
          latitude: coordinates.latitude,
          professionalBookingId: bookingId,
          bookingApiToken: bookingApiToken ?? undefined,
        };
        onContinue(updatedFormData);
      } else {
        throw new Error(response.message || "Failed to submit booking");
      }
    } catch (error: any) {
      console.error("Booking submission error:", error);
      toast.error(error.message || "Failed to submit booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-600">Select Date & Time</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-sm font-medium text-red-600">Your Details</span>
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
            Back to Date Selection
          </Button>

          <h1 className="text-[#0A1A2F] mb-8">Your Contact Details</h1>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => updateFormData("firstName", e.target.value)}
                          className={errors.firstName ? "border-red-500" : ""}
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => updateFormData("lastName", e.target.value)}
                          className={errors.lastName ? "border-red-500" : ""}
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => updateFormData("email", e.target.value)}
                          className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.email}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">We'll send your booking confirmation here</p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="07123 456789"
                          value={formData.phone}
                          onChange={(e) => updateFormData("phone", e.target.value)}
                          className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.phone}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">The professional may call to confirm details</p>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label htmlFor="address">Property Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="address"
                          placeholder="Street address"
                          value={formData.address}
                          onChange={(e) => updateFormData("address", e.target.value)}
                          className={`pl-10 ${errors.address ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.address && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.address}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">Where the service will be performed</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => updateFormData("city", e.target.value)}
                          className={errors.city ? "border-red-500" : ""}
                        />
                        {errors.city && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.city}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postcode">Postcode *</Label>
                        <Input
                          id="postcode"
                          placeholder="SW1A 1AA"
                          value={formData.postcode}
                          onChange={(e) => updateFormData("postcode", e.target.value.toUpperCase())}
                          className={errors.postcode ? "border-red-500" : ""}
                        />
                        {errors.postcode && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.postcode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special requirements, access instructions, or specific areas of concern..."
                        value={formData.notes}
                        onChange={(e) => updateFormData("notes", e.target.value)}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-gray-500">Help the professional prepare for your appointment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                      {/* Service */}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Service</p>
                        <p className="font-semibold text-gray-900">{service.name}</p>
                      </div>

                      {/* Professional */}
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Professional</p>
                        <div className="flex items-center gap-3">
                          <img
                            src={professional.photo}
                            alt={professional.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{professional.name}</p>
                            <p className="text-xs text-gray-600">{professional.rating} ⭐</p>
                          </div>
                        </div>
                      </div>

                      {/* Appointment */}
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Appointment</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {new Date(selectedDate).toLocaleDateString('en-GB', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long'
                          })}
                        </p>
                        <p className="text-sm text-gray-700">{selectedTime}</p>
                      </div>

                      {/* Pricing */}
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

                {showCustomQuoteWaiting && (
                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Wait for admin assigned</p>
                      <p className="text-sm text-amber-800 mt-1">Your booking and custom quote request have been submitted. Once the admin assigns a price, you will be able to complete payment.</p>
                    </div>
                  </div>
                )}

                {!showCustomQuoteWaiting && (
                  <Button
                    onClick={handleContinue}
                    disabled={isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
