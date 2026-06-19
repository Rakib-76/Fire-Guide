import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  AlertCircle,
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { storeCustomQuoteRequest } from "../../api/customQuoteRequestsService";
import {
  getApiToken,
  getUserEmail,
  getUserFullName,
  getUserPhone,
} from "../../lib/auth";
import {
  clearPendingCustomQuote,
  readPendingCustomQuote,
  type PendingCustomQuoteContact,
} from "../../lib/pendingCustomQuote";
import { registerAndLoginCustomer } from "../../lib/customerGuestAuth";

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function buildAccessNote(existingNote: string | undefined, userNotes: string): string | undefined {
  const existing = existingNote?.trim() ?? "";
  const extra = userNotes.trim();
  const combined = [existing, extra].filter(Boolean).join("\n\n");
  return combined || undefined;
}

export default function CustomQuoteDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId: serviceIdParam } = useParams<{ serviceId: string }>();
  const serviceId =
    serviceIdParam && /^\d+$/.test(serviceIdParam) ? parseInt(serviceIdParam, 10) : null;
  const serviceNameFromState = (location.state as { serviceName?: string } | null)?.serviceName;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [resolvedServiceName, setResolvedServiceName] = useState<string | undefined>(
    serviceNameFromState
  );

  useEffect(() => {
    if (!serviceId) {
      navigate("/services", { replace: true });
      return;
    }
    const draft = readPendingCustomQuote();
    if (!draft || draft.serviceId !== serviceId) {
      navigate(`/services/${serviceId}/questionnaire`, {
        replace: true,
        state: serviceNameFromState ? { serviceName: serviceNameFromState } : undefined,
      });
      return;
    }

    setResolvedServiceName(draft.serviceName ?? serviceNameFromState);
    setIsLoggedIn(Boolean(getApiToken()));

    if (draft.contactDetails) {
      const contact = draft.contactDetails;
      setFirstName(contact.firstName);
      setLastName(contact.lastName);
      setEmail(contact.email);
      setPhone(contact.phone);
      setAddress(contact.property_address);
      setCity(contact.city);
      setPostcode(contact.post_code);
      setNotes(contact.notes ?? "");
    } else {
      const { firstName: fn, lastName: ln } = splitFullName(getUserFullName() ?? "");
      setFirstName(fn);
      setLastName(ln);
      setEmail(getUserEmail() ?? "");
      setPhone(getUserPhone() ?? "");
      setAddress(draft.requestData.property_address?.trim() ?? "");
      setCity(draft.requestData.city?.trim() ?? "");
      setPostcode(draft.requestData.post_code?.trim() ?? "");
    }

    setDraftReady(true);
  }, [serviceId, navigate, serviceNameFromState]);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      next.email = "Please enter a valid email";
    }
    if (!phone.trim()) {
      next.phone = "Phone number is required";
    } else if (!/^[\d\s+()-]+$/.test(phone)) {
      next.phone = "Please enter a valid phone number";
    }
    if (!address.trim()) next.address = "Address is required";
    if (!city.trim()) next.city = "City is required";
    if (!postcode.trim()) next.postcode = "Postcode is required";
    if (!isLoggedIn && !password.trim()) next.password = "Password is required";
    if (!isLoggedIn && !confirmPassword.trim()) {
      next.confirmPassword = "Please confirm your password";
    } else if (!isLoggedIn && password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildContactDetails = (): PendingCustomQuoteContact => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    property_address: address.trim(),
    city: city.trim(),
    post_code: postcode.trim(),
    ...(notes.trim() ? { notes: notes.trim() } : {}),
  });

  const handleSubmit = async () => {
    if (!serviceId) return;
    const pending = readPendingCustomQuote();
    if (!pending || pending.serviceId !== serviceId) {
      toast.error("Your custom quote session expired. Please complete the questionnaire again.");
      navigate(`/services/${serviceId}/questionnaire`, {
        state: resolvedServiceName ? { serviceName: resolvedServiceName } : undefined,
      });
      return;
    }
    if (!validate()) return;

    const contact = buildContactDetails();
    const customerName = `${contact.firstName} ${contact.lastName}`.trim();
    const access_note = buildAccessNote(pending.requestData.access_note, contact.notes ?? "");
    const requestData = {
      ...pending.requestData,
      property_address: contact.property_address,
      city: contact.city,
      post_code: contact.post_code,
      ...(access_note ? { access_note } : {}),
    };

    const token = getApiToken();
    const wasGuest = !token;

    setSubmitting(true);
    try {
      let apiToken = token;
      let signedInWithExistingAccount = false;

      if (!apiToken) {
        const auth = await registerAndLoginCustomer(contact, password);
        apiToken = auth.token;
        signedInWithExistingAccount = auth.usedExistingAccount;
        setIsLoggedIn(true);
      }

      await storeCustomQuoteRequest(
        apiToken,
        serviceId,
        customerName,
        contact.email,
        contact.phone,
        requestData
      );
      clearPendingCustomQuote();
      toast.success(
        wasGuest
          ? signedInWithExistingAccount
            ? "Signed in successfully. Your custom quote request has been submitted."
            : "Account created and signed in. Your custom quote request has been submitted."
          : "Your custom quote request has been submitted."
      );
      navigate("/customer/dashboard/quote-requests");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : err instanceof Error
            ? err.message
            : "Failed to submit custom quote request.";
      if (message.toLowerCase().includes("email or password is wrong")) {
        setErrors((prev) => ({
          ...prev,
          email: "Email or password is wrong.",
          password: "Email or password is wrong.",
        }));
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!draftReady || !serviceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white py-3 px-4 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl items-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity" aria-label="Go to home">
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      <div className="border-b bg-gray-50 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2 text-sm text-gray-600">
          <Link to="/" className="hover:text-red-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/services" className="hover:text-red-600 transition-colors">
            Select Service
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">Contact details</span>
        </div>
      </div>

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-[#0A1A2F]">Your Contact Details</h1>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#0A1A2F]">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name *</Label>
                    <Input
                      id="first-name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearError("firstName");
                      }}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && (
                      <p className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name *</Label>
                    <Input
                      id="last-name"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearError("lastName");
                      }}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && (
                      <p className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError("email");
                      }}
                      className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.email ? (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">We&apos;ll send your booking confirmation here</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07123 456789"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearError("phone");
                      }}
                      className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.phone ? (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.phone}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">The professional may call to confirm details</p>
                  )}
                </div>

                {!isLoggedIn ? (
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
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password ? (
                        <p className="flex items-center gap-1 text-sm text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          {errors.password}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          We&apos;ll create your account when you submit this quote request
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
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="flex items-center gap-1 text-sm text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="property-address">Property Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="property-address"
                      placeholder="Street address"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        clearError("address");
                      }}
                      className={`pl-10 ${errors.address ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.address ? (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.address}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">Where the service will be performed</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="property-city">City *</Label>
                    <Input
                      id="property-city"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        clearError("city");
                      }}
                      className={errors.city ? "border-red-500" : ""}
                    />
                    {errors.city && (
                      <p className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {errors.city}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="property-postcode">Postcode *</Label>
                    <Input
                      id="property-postcode"
                      placeholder="SW1A 1AA"
                      value={postcode}
                      onChange={(e) => {
                        setPostcode(e.target.value.toUpperCase());
                        clearError("postcode");
                      }}
                      className={errors.postcode ? "border-red-500" : ""}
                    />
                    {errors.postcode && (
                      <p className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {errors.postcode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requirements, access instructions, or specific areas of concern..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500">Help the professional prepare for your appointment</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-6"
                  onClick={() =>
                    navigate(`/services/${serviceId}/questionnaire`, {
                      state: resolvedServiceName ? { serviceName: resolvedServiceName } : undefined,
                    })
                  }
                  disabled={submitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  className="h-11 bg-red-600 px-8 hover:bg-red-700"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLoggedIn ? "Submitting..." : "Creating account & signing in..."}
                    </>
                  ) : (
                    "Submit custom quote"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
