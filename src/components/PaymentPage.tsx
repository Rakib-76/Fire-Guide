import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  CreditCard, 
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  Lock,
  AlertCircle,
  Calendar,
  User,
  Loader2
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import type { BookingData } from "./BookingFlow";
import {
  storePaymentInvoice,
  isPaymentInvoiceStoreSuccess,
  extractStripeCheckoutUrl,
  extractTxRefFromInvoiceResponse,
} from "../api/paymentService";
import { toast } from "sonner";
import { getApiToken } from "../lib/auth";
import {
  getStripeCheckoutSuccessUrl,
  getPaymentFailedPageUrl,
  PAYMENT_RETURN_STORAGE_KEY,
  type PaymentReturnContext,
} from "../lib/paymentAppUrls";

interface PaymentPageProps {
  bookingData: BookingData;
  onPaymentComplete: () => void;
  onBack: () => void;
}

export function PaymentPage({
  bookingData,
  onPaymentComplete,
  onBack
}: PaymentPageProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isTermsAccepted, setIsTermsAccepted] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const formatted = digits.match(/.{1,4}/g)?.join(" ") || digits;
    return formatted.substring(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 2) {
      return digits.substring(0, 2) + "/" + digits.substring(2, 4);
    }
    return digits;
  };

  const updateCardNumber = (value: string) => {
    setCardNumber(formatCardNumber(value));
    if (errors.cardNumber) setErrors({ ...errors, cardNumber: "" });
  };

  const updateExpiryDate = (value: string) => {
    setExpiryDate(formatExpiryDate(value));
    if (errors.expiryDate) setErrors({ ...errors, expiryDate: "" });
  };

  const updateCvv = (value: string) => {
    const digits = value.replace(/\D/g, "").substring(0, 3);
    setCvv(digits);
    if (errors.cvv) setErrors({ ...errors, cvv: "" });
  };

  const validateForm = () => {
    setErrors({});
    return true;
  };

  // Convert MM/YY to YYYY-MM-DD format for API
  const convertExpiryDate = (mmYY: string): string => {
    if (!mmYY.match(/^\d{2}\/\d{2}$/)) {
      return "";
    }
    const [month, year] = mmYY.split("/");
    const fullYear = `20${year}`; // Assuming 20XX format
    // Set to last day of the month
    const lastDay = new Date(parseInt(fullYear), parseInt(month), 0).getDate();
    return `${fullYear}-${month}-${lastDay}`;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    if (!bookingData.customer.professionalBookingId) {
      toast.error("Booking ID is missing. Please try again.");
      return;
    }

    const token = getApiToken() ?? bookingData.customer.bookingApiToken ?? null;
    if (!token) {
      toast.error("Please log in to continue, or complete your booking again to process payment.");
      return;
    }

    setProcessing(true);

    try {
      const successUrl = getStripeCheckoutSuccessUrl();
      const failedUrl = getPaymentFailedPageUrl();
      const bookingId = bookingData.customer.professionalBookingId;
      const total = bookingData.pricing.total;

      const paymentData = {
        api_token: token,
        professional_booking_id: bookingId,
        price: total,
        success_url: successUrl,
        cancel_url: failedUrl,
        failure_url: failedUrl,
      };

      const response = await storePaymentInvoice(paymentData);
      const checkoutUrl = extractStripeCheckoutUrl(response);
      const txRef = extractTxRefFromInvoiceResponse(response);

      const returnCtx: PaymentReturnContext = {
        amountPaid: total,
        totalAmount: total,
        paidIncentives: 0,
        paidBalance: 0,
        paidOnline: total,
        orderIds: [`FG-${bookingId}`],
        transactionId: txRef ?? "",
      };
      try {
        sessionStorage.setItem(PAYMENT_RETURN_STORAGE_KEY, JSON.stringify(returnCtx));
      } catch {
        /* ignore quota / private mode */
      }

      if (isPaymentInvoiceStoreSuccess(response) && checkoutUrl) {
        toast.success("Redirecting to secure payment...");
        window.location.assign(checkoutUrl);
        return;
      }
      // Never advance the booking flow as "paid" without a Stripe redirect — success + no URL means misconfigured API or unpaid session.
      if (isPaymentInvoiceStoreSuccess(response) && !checkoutUrl) {
        throw {
          message:
            response.message ||
            "Payment could not be started: no checkout link from server. Nothing has been charged.",
          status: 502,
        };
      }
      throw {
        message: response.message || "Failed to initiate payment",
        status: 400,
      };
    } catch (error: any) {
      console.error("Payment processing error:", error);
      toast.error(error.message || "Failed to process payment. Please try again.");
      const httpStatus = typeof error?.status === "number" ? error.status : undefined;
      if (httpStatus !== 401) {
        window.location.assign(getPaymentFailedPageUrl());
      }
    } finally {
      setProcessing(false);
    }
  };

  const { service, professional, selectedDate, selectedTime, customer, pricing, pricingErrorMessage } = bookingData;

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
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-600">Your Details</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-sm font-medium text-red-600">Payment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Details
          </Button>

          <h1 className="text-[#0A1A2F] mb-8">Order Summary</h1>

          <div className="w-full max-w-3xl">
            {/* Order Summary - full width */}
            <div className="w-full">
              <div className="sticky top-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F]">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Service */}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Service</p>
                        <p className="font-semibold text-gray-900">{service.name}</p>
                        <p className="text-sm text-gray-600">{service.propertyType}</p>
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
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Appointment</p>
                        <p className="font-medium text-gray-900 text-sm">
                          {new Date(selectedDate).toLocaleDateString('en-GB', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short'
                          })}
                        </p>
                        <p className="text-sm text-gray-700">{selectedTime}</p>
                      </div>

                      {/* Customer */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Customer</p>
                        <p className="font-medium text-gray-900 text-sm">{customer.firstName} {customer.lastName}</p>
                        <p className="text-xs text-gray-600">{customer.email}</p>
                      </div>

                      {/* Pricing */}
                      {pricingErrorMessage ? (
                        <div className="pt-4 border-t rounded-lg border-amber-200 bg-amber-50 p-3">
                          <p className="text-sm text-amber-800">{pricingErrorMessage}</p>
                          <p className="text-xs text-amber-700 mt-1">Payment is not available. Contact the professional or support.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-4 border-t">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Service fee</span>
                            <span className="text-gray-900">£{pricing.servicePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Platform fee</span>
                            <span className="text-gray-900">£{pricing.platformFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-3 border-t">
                            <span className="font-semibold text-gray-900">Total to pay</span>
                            <span className="text-2xl font-semibold text-gray-900">£{pricing.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handlePayment}
                  disabled={processing || !!pricingErrorMessage}
                  className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      {pricingErrorMessage ? "Payment unavailable" : `Pay £${pricing.total.toFixed(2)}`}
                    </>
                  )}
                </Button>

                {/* Money Back Guarantee */}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900 text-sm mb-1">100% Money-back guarantee</p>
                        <p className="text-xs text-green-700">
                          If you're not satisfied with the service, we'll refund you in full.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
