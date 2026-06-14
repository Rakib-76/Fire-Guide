import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { storeCustomQuoteRequest } from "../../api/customQuoteRequestsService";
import { getApiToken, getUserEmail, getUserFullName, getUserPhone } from "../../lib/auth";
import {
  clearPendingCustomQuote,
  customQuoteDetailsPath,
  readPendingCustomQuote,
  savePendingCustomQuote,
} from "../../lib/pendingCustomQuote";
import { CustomQuoteSubmittedModal } from "../CustomQuoteSubmittedModal";

export default function CustomQuoteDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId: serviceIdParam } = useParams<{ serviceId: string }>();
  const serviceId =
    serviceIdParam && /^\d+$/.test(serviceIdParam) ? parseInt(serviceIdParam, 10) : null;
  const serviceNameFromState = (location.state as { serviceName?: string } | null)?.serviceName;

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
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
    setDraftReady(true);
  }, [serviceId, navigate, serviceNameFromState]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!address.trim()) next.address = "Property address is required";
    if (!city.trim()) next.city = "City is required";
    if (!postcode.trim()) next.postcode = "Postcode is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

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

    const name = getUserFullName()?.trim() ?? "";
    const email = getUserEmail()?.trim() ?? "";
    const phone = getUserPhone()?.trim() ?? "";
    const token = getApiToken();

    if (!token || !name || !email || !phone) {
      savePendingCustomQuote({
        ...pending,
        returnPath: customQuoteDetailsPath(serviceId),
      });
      navigate("/customer/auth", { state: { pendingCustomQuote: true } });
      return;
    }

    setSubmitting(true);
    try {
      await storeCustomQuoteRequest(token, serviceId, name, email, phone, {
        ...pending.requestData,
        property_address: address.trim(),
        city: city.trim(),
        post_code: postcode.trim(),
      });
      clearPendingCustomQuote();
      setSuccessModalOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit custom quote request.");
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
          <span className="text-gray-900">Property details</span>
        </div>
      </div>

      <main className="px-4 pt-14 pb-10 md:px-6">
        <div className="mx-auto max-w-3xl pt-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#0A1A2F]">
                <MapPin className="h-5 w-5 text-red-600" />
                Property details
              </CardTitle>
              <CardDescription className="text-gray-600">
                {resolvedServiceName
                  ? `Tell us where the ${resolvedServiceName} service is needed. We will use this for your custom quote request.`
                  : "Tell us where the service is needed. We will use this for your custom quote request."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="property-address" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Property address
                </Label>
                <Input
                  id="property-address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors((prev) => ({ ...prev, address: "" }));
                  }}
                  placeholder="e.g. 123 Business Park, Unit 4"
                  className="h-11"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>

              <div>
                <Label htmlFor="property-city" className="mb-1.5 block text-sm font-medium text-gray-700">
                  City
                </Label>
                <Input
                  id="property-city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
                  }}
                  placeholder="e.g. London"
                  className="h-11"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              <div>
                <Label htmlFor="property-postcode" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Postcode
                </Label>
                <Input
                  id="property-postcode"
                  value={postcode}
                  onChange={(e) => {
                    setPostcode(e.target.value);
                    if (errors.postcode) setErrors((prev) => ({ ...prev, postcode: "" }));
                  }}
                  placeholder="e.g. SW1A 1AA"
                  className="h-11"
                />
                {errors.postcode && <p className="mt-1 text-sm text-red-600">{errors.postcode}</p>}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
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
                      Submitting...
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

      <CustomQuoteSubmittedModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        onViewQuoteRequests={() => {
          setSuccessModalOpen(false);
          navigate("/customer/dashboard/quote-requests");
        }}
        onBrowseServices={() => {
          setSuccessModalOpen(false);
          navigate("/services");
        }}
      />
    </div>
  );
}
