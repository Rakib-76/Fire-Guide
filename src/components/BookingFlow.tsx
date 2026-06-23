import React, { useState, useEffect } from "react";
import { AppointmentSelection } from "./AppointmentSelection";
import { CustomerDetailsForm } from "./CustomerDetailsForm";
import { PaymentPage } from "./PaymentPage";
import { BookingConfirmation } from "./BookingConfirmation";
import { buildBookingServiceDisplay } from "../lib/bookingServiceDetails";
import type { BookingServiceDetailRow } from "../lib/bookingServiceDetails";

/** Questionnaire payload may include display labels for service details (e.g. property_type_label, approximate_people_label). */
export type QuestionnaireDataForBooking = {
  property_type_label?: string;
  approximate_people_label?: string;
  number_of_floors?: string;
  [key: string]: unknown;
};

interface BookingFlowProps {
  onBack: () => void;
  onConfirm: () => void;
  selectedService?: string;
  selectedProfessional?: any;
  professionalId?: number | null;
  /** Service ID from Book response (for professional_booking/store). */
  serviceId?: number;
  /** Session ID from selected_services/store (for professional_booking/store). */
  sessionId?: number;
  bookingProfessional?: any;
  /** When user clicks Book Now, price is fetched and passed here so Booking Summary shows API values immediately */
  initialPricing?: { servicePrice: number; platformFee: number; total: number; platformFeePercent?: string };
  /** When price API fails on Book Now, pass message so summary can show it */
  initialPricingError?: string;
  /** True while add-to-cart pricing is loading on the booking page */
  isPricingLoading?: boolean;
  /** Questionnaire data with optional display labels (property_type_label, approximate_people_label, number_of_floors) for Service Details card */
  questionnaireData?: QuestionnaireDataForBooking | null;
  isCustomQuote?: boolean;
  customQuoteRequestData?: { building_type: string; people_count: string; floors: number };
  serviceIdForQuote?: number;
  /** Human-readable service name from selection / questionnaire */
  serviceNameHint?: string;
}

export type BookingStep = "appointment" | "details" | "payment" | "confirmation";

export interface BookingData {
  // Service info
  service: {
    name: string;
    details: BookingServiceDetailRow[];
    summaryLine: string;
    propertyType: string;
    floors: string | number;
    people: string;
  };
  // Professional info
  professional: {
    name: string;
    photo: string;
    verified: boolean;
    rating: number;
  };
  // Professional ID for API
  professionalId?: number | null;
  // Appointment
  selectedDate: string;
  selectedTime: string;
  // Customer details
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postcode: string;
    notes: string;
    longitude?: number;
    latitude?: number;
    professionalBookingId?: number | null;
    /** When user is not logged in, token from professional_booking/store response; used for payment_invoice/store */
    bookingApiToken?: string | null;
  };
  // Pricing (service_price, platform_fee_percent, total_price from add-to-cart/fra or calculate-price API)
  pricing: {
    servicePrice: number;
    platformFee: number;
    total: number;
    platformFeePercent?: string;
  };
  /** When set, API failed to get price (e.g. base price not configured); show in summary instead of amounts */
  pricingErrorMessage?: string;
  // Booking reference
  bookingReference?: string;
}

const defaultPricing = { servicePrice: 285, platformFee: 15, total: 300 };

function getInitialService(
  questionnaireData?: QuestionnaireDataForBooking | null,
  options?: {
    selectedService?: string;
    serviceId?: number;
    serviceNameHint?: string;
    isCustomQuote?: boolean;
    customQuoteRequestData?: { building_type?: string; people_count?: string; floors?: number };
  }
) {
  return buildBookingServiceDisplay(questionnaireData as Record<string, unknown> | null | undefined, {
    selectedService: options?.selectedService,
    serviceId: options?.serviceId,
    serviceNameHint:
      options?.serviceNameHint ??
      (questionnaireData?.service_name as string | undefined),
    isCustomQuote: options?.isCustomQuote,
    customQuoteRequestData: options?.customQuoteRequestData,
  });
}

export function BookingFlow({ onBack, onConfirm, professionalId, serviceId, sessionId, bookingProfessional, initialPricing, initialPricingError, isPricingLoading, questionnaireData, selectedService, isCustomQuote, customQuoteRequestData, serviceIdForQuote, serviceNameHint }: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>("appointment");
  
  // Default professional data (fallback)
  const defaultProfessional = {
    name: "Sarah Mitchell",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    verified: true,
    rating: 4.9
  };

  // Initialize professional data from bookingProfessional if available, otherwise use defaults
  const getInitialProfessional = () => {
    if (bookingProfessional) {
      return {
        name: bookingProfessional.name || defaultProfessional.name,
        photo: bookingProfessional.photo || defaultProfessional.photo,
        verified: bookingProfessional.verified !== undefined ? bookingProfessional.verified : defaultProfessional.verified,
        rating: bookingProfessional.rating || defaultProfessional.rating
      };
    }
    return defaultProfessional;
  };

  const [bookingData, setBookingData] = useState<BookingData>({
    service: getInitialService(questionnaireData, {
      selectedService,
      serviceId,
      serviceNameHint,
      isCustomQuote,
      customQuoteRequestData,
    }),
    professional: getInitialProfessional(),
    professionalId: professionalId || null,
    selectedDate: "",
    selectedTime: "",
    customer: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postcode: "",
      notes: ""
    },
    pricing: initialPricing ?? defaultPricing,
    pricingErrorMessage: initialPricingError
  });

  // Update booking data when professional data changes (e.g., loaded from sessionStorage)
  useEffect(() => {
    if (bookingProfessional) {
      const shouldUpdate = !bookingData.professional.name || 
                          bookingData.professional.name === defaultProfessional.name ||
                          bookingData.professional.name !== bookingProfessional.name;

      if (shouldUpdate) {
        setBookingData(prev => ({
          ...prev,
          professional: {
            name: bookingProfessional.name || prev.professional.name,
            photo: bookingProfessional.photo || prev.professional.photo,
            verified: bookingProfessional.verified !== undefined ? bookingProfessional.verified : prev.professional.verified,
            rating: bookingProfessional.rating || prev.professional.rating
          },
          professionalId: professionalId !== null && professionalId !== undefined ? professionalId : prev.professionalId
        }));
      }
    }
  }, [bookingProfessional, professionalId]);

  // Sync service details when questionnaire data becomes available (e.g. after restore from sessionStorage)
  useEffect(() => {
    const next = getInitialService(questionnaireData, {
      selectedService,
      serviceId,
      serviceNameHint,
      isCustomQuote,
      customQuoteRequestData,
    });
    setBookingData((prev) => {
      if (
        prev.service.name === next.name &&
        JSON.stringify(prev.service.details) === JSON.stringify(next.details)
      ) {
        return prev;
      }
      return { ...prev, service: next };
    });
  }, [questionnaireData, selectedService, serviceId, serviceNameHint, isCustomQuote, customQuoteRequestData]);

  // Sync pricing when fetched from add-to-cart on the booking page
  useEffect(() => {
    if (initialPricing == null && initialPricingError == null) return;
    setBookingData((prev) => ({
      ...prev,
      ...(initialPricing != null
        ? { pricing: initialPricing, pricingErrorMessage: undefined }
        : {}),
      ...(initialPricing == null && initialPricingError
        ? { pricingErrorMessage: initialPricingError }
        : {}),
    }));
  }, [initialPricing, initialPricingError]);

  const handleAppointmentSelected = (date: string, time: string) => {
    setBookingData(prev => ({ ...prev, selectedDate: date, selectedTime: time }));
    setCurrentStep("details");
  };

  const handleCustomerDetailsSubmitted = (customerData: BookingData["customer"]) => {
    setBookingData(prev => ({ ...prev, customer: customerData }));
    setCurrentStep("payment");
  };

  const handlePaymentCompleted = () => {
    const reference = `FG-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, "0")}`;
    setBookingData(prev => ({ ...prev, bookingReference: reference }));
    setCurrentStep("confirmation");
  };

  const handleBackFromDetails = () => {
    setCurrentStep("appointment");
  };

  const handleBackFromPayment = () => {
    setCurrentStep("details");
  };

  const renderStep = () => {
    switch (currentStep) {
      case "appointment":
        return (
          <AppointmentSelection
            service={bookingData.service}
            professional={bookingData.professional}
            professionalId={bookingData.professionalId}
            pricing={bookingData.pricing}
            pricingErrorMessage={bookingData.pricingErrorMessage}
            isPricingLoading={isPricingLoading}
            onContinue={handleAppointmentSelected}
            onBack={onBack}
          />
        );
      case "details":
        return (
          <CustomerDetailsForm
            service={bookingData.service}
            professional={bookingData.professional}
            professionalId={bookingData.professionalId}
            serviceId={serviceId}
            sessionId={sessionId}
            selectedDate={bookingData.selectedDate}
            selectedTime={bookingData.selectedTime}
            pricing={bookingData.pricing}
            pricingErrorMessage={bookingData.pricingErrorMessage}
            isPricingLoading={isPricingLoading}
            initialData={bookingData.customer}
            onContinue={handleCustomerDetailsSubmitted}
            onBack={handleBackFromDetails}
            isCustomQuote={isCustomQuote}
            forceNormalBooking={!!initialPricing}
            customQuoteRequestData={customQuoteRequestData}
            serviceIdForQuote={serviceIdForQuote}
          />
        );
      case "payment":
        return (
          <PaymentPage
            bookingData={bookingData}
            onPaymentComplete={handlePaymentCompleted}
            onBack={handleBackFromPayment}
          />
        );
      case "confirmation":
        return (
          <BookingConfirmation
            bookingData={bookingData}
            onDone={onConfirm}
          />
        );
      default:
        return null;
    }
  };

  return <>{renderStep()}</>;
}