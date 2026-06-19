import React, { useState, useEffect } from "react";
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
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import type { BookingData } from "./BookingFlow";
import {
  storeProfessionalBooking,
  ProfessionalBookingStoreRequest,
  isBookingStoreSuccess,
  extractBookingStoreResult,
} from "../api/bookingService";
import { storeCustomQuoteRequest } from "../api/customQuoteRequestsService";
import { toast } from "sonner";
import { getApiToken } from "../lib/auth";
import { registerAndLoginCustomer } from "../lib/customerGuestAuth";
import { formatApiErrorMessage } from "../lib/apiValidationMessage";
import { useApp } from "../contexts/AppContext";
import { createBookingSelectedSession } from "../lib/createBookingSelectedSession";

const BOOKING_SESSION_ID_KEY = "fireguide_booking_session_id";
const QUESTIONNAIRE_STORAGE_KEY = "fireguide_questionnaire_data";

function readQuestionnaireData(contextData: unknown): Record<string, unknown> | null {
  if (contextData && typeof contextData === "object") {
    return contextData as Record<string, unknown>;
  }
  try {
    const stored = sessionStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

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
  const { setIsCustomerLoggedIn, setCurrentUser, locationSearchData, questionnaireData } = useApp();
  const useCustomQuoteFlow = Boolean(isCustomQuote && !forceNormalBooking && !(pricing.total > 0));
  const needsPasswordForBooking = !initialData.professionalBookingId;
  const [formData, setFormData] = useState<BookingData["customer"]>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomQuoteWaiting, setShowCustomQuoteWaiting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getApiToken()));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getApiToken()));
  }, []);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const updateFormData = (field: keyof BookingData["customer"], value: string) => {
    setFormData({ ...formData, [field]: value });
    clearError(field);
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
    if (needsPasswordForBooking && !password.trim()) newErrors.password = "Password is required";
    if (needsPasswordForBooking && !confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (needsPasswordForBooking && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

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

    if (initialData.professionalBookingId) {
      onContinue({
        ...formData,
        longitude: formData.longitude ?? initialData.longitude,
        latitude: formData.latitude ?? initialData.latitude,
        professionalBookingId: initialData.professionalBookingId,
        bookingApiToken: initialData.bookingApiToken ?? getApiToken() ?? undefined,
      });
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
    const wasGuest = !getApiToken();

    try {
      const coordinates = await getCoordinates(formData.address, formData.city, formData.postcode);

      let token = getApiToken();
      let signedInWithExistingAccount = false;
      if (!token) {
        const auth = await registerAndLoginCustomer(
          {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
          },
          password
        );
        token = auth.token;
        signedInWithExistingAccount = auth.usedExistingAccount;
        setIsLoggedIn(true);
        setIsCustomerLoggedIn(true);
        setCurrentUser({
          name: formData.firstName.trim() || formData.email.trim(),
          role: "customer",
        });
        toast.success(
          signedInWithExistingAccount
            ? "Signed in successfully. Saving your booking..."
            : "Account created and signed in. Saving your booking..."
        );
      }

      let bookingSessionId = effectiveSessionId;
      const shouldRefreshSession =
        Boolean(token) &&
        !initialData.professionalBookingId &&
        (wasGuest || isLoggedIn);
      if (shouldRefreshSession) {
        const qData = readQuestionnaireData(questionnaireData);
        if (qData && locationSearchData && professionalId && serviceId != null) {
          const refreshed = await createBookingSelectedSession({
            professionalId: Number(professionalId),
            serviceId: Number(serviceId),
            questionnaireData: qData,
            locationSearchData,
          });
          if (refreshed.sessionId != null) {
            bookingSessionId = refreshed.sessionId;
            try {
              sessionStorage.setItem(BOOKING_SESSION_ID_KEY, String(refreshed.sessionId));
            } catch {
              /* ignore */
            }
          } else if (refreshed.error) {
            console.warn("Could not refresh booking session after sign-in:", refreshed.error);
          }
        }
      }

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
          throw new Error("Custom quote request failed. Please try again.");
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
      if (password.trim()) {
        bookingPayload.password = password.trim();
      }
      if (token) {
        bookingPayload.api_token = token;
      }
      bookingPayload.session_id = bookingSessionId;
      if (isCustomQuoteWithId && customQuoteRequestId != null) {
        bookingPayload.custom_quote_request_id = customQuoteRequestId;
        bookingPayload.custom_quote_id = customQuoteRequestId;
      }

      if (useCustomQuoteFlow && !customQuoteRequestId) {
        throw new Error("Custom quote could not be created. Please try again.");
      }

      const response = await storeProfessionalBooking(bookingPayload);
      if (isBookingStoreSuccess(response)) {
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
        const { bookingId, bookingApiToken } = extractBookingStoreResult(response);
        if (!bookingId) {
          console.warn("Booking store response missing id:", response);
          throw new Error(
            response.message ||
              "Booking could not be confirmed. Please click Continue to Payment again."
          );
        }
        const updatedFormData = {
          ...formData,
          longitude: coordinates.longitude,
          latitude: coordinates.latitude,
          professionalBookingId: bookingId,
          bookingApiToken: bookingApiToken ?? token ?? undefined,
        };
        onContinue(updatedFormData);
      } else {
        const failMessage = formatApiErrorMessage(response, response.message || "Failed to submit booking");
        throw Object.assign(new Error(failMessage), { data: (response as { data?: unknown }).data });
      }
    } catch (error: unknown) {
      console.error("Booking submission error:", error);
      const message =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error
            ? formatApiErrorMessage(error, String((error as { message?: string }).message))
            : "Failed to submit booking. Please try again.";
      const fieldBag =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: unknown }).data
          : undefined;
      if (fieldBag && typeof fieldBag === "object" && !Array.isArray(fieldBag)) {
        const passwordErrors = (fieldBag as Record<string, unknown>).password;
        const passwordMsg = Array.isArray(passwordErrors)
          ? String(passwordErrors[0] ?? "")
          : typeof passwordErrors === "string"
            ? passwordErrors
            : "";
        if (passwordMsg.trim()) {
          setErrors((prev) => ({ ...prev, password: passwordMsg.trim() }));
        }
      }
      if (message.toLowerCase().includes("email or password is wrong")) {
        setErrors((prev) => ({
          ...prev,
          email: "Email or password is wrong.",
          password: "Email or password is wrong.",
        }));
      } else if (getApiToken() && wasGuest) {
        toast.error(
          `Booking could not be saved: ${message}. You're signed in — please click Continue to Payment again.`
        );
        return;
      }
      toast.error(message);
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
                    {isLoggedIn && needsPasswordForBooking ? (
                      <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                        You&apos;re signed in. Enter your password below to complete your booking.
                      </p>
                    ) : isLoggedIn && !needsPasswordForBooking ? (
                      <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                        You&apos;re signed in. Continue to payment when your details are correct.
                      </p>
                    ) : null}
                    {initialData.professionalBookingId ? (
                      <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        Your booking is saved. Click continue to return to payment.
                      </p>
                    ) : null}
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

                    {needsPasswordForBooking ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                clearError("password");
                                if (errors.confirmPassword) clearError("confirmPassword");
                              }}
                              className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {errors.password ? (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.password}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              {isLoggedIn
                                ? "Required by the booking system to complete your reservation"
                                : "We'll create your account when you continue to payment"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password *</Label>
                          <div className="relative">
                            <Input
                              id="confirm-password"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Re-enter your password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                clearError("confirmPassword");
                              }}
                              className={`pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </>
                    ) : null}

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
                        {isLoggedIn ? "Submitting..." : "Creating account & signing in..."}
                      </>
                    ) : (
                      <>
                        {initialData.professionalBookingId ? "Continue to Payment" : "Continue to Payment"}
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
