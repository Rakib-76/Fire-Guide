import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { BookingFlow } from "../BookingFlow";
import { createBookingSelectedSession } from "../../lib/createBookingSelectedSession";
import { fetchBookingPricing, type BookingPricing } from "../../lib/fetchBookingPricing";

const BOOKING_PROFESSIONAL_KEY = 'fireguide_booking_professional';
const BOOKING_PROFESSIONAL_ID_KEY = 'fireguide_booking_professional_id';
const BOOKING_SERVICE_ID_KEY = 'fireguide_booking_service_id';
/** AppContext persists this when user picks a service — fallback if booking key was never set (e.g. older profile → book navigation). */
const SELECTED_SERVICE_ID_KEY = 'fireguide_selected_service_id';
const BOOKING_SESSION_ID_KEY = 'fireguide_booking_session_id';
const BOOKING_PRICING_KEY = 'fireguide_booking_pricing';
const BOOKING_PRICING_ERROR_KEY = 'fireguide_booking_pricing_error';
const QUESTIONNAIRE_STORAGE_KEY = 'fireguide_questionnaire_data';

function getQuestionnaireData(questionnaireData: any) {
  if (questionnaireData != null) return questionnaireData;
  try {
    const stored = sessionStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return null;
}

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedService,
    selectedProfessional,
    selectedProfessionalId,
    bookingProfessional,
    questionnaireData: contextQuestionnaireData,
    locationSearchData,
    setBookingData,
    setBookingProfessional,
    setSelectedProfessionalId,
  } = useApp();
  const questionnaireData = getQuestionnaireData(contextQuestionnaireData);
  const [recoveredSessionId, setRecoveredSessionId] = useState<number | undefined>();
  const sessionRecoveryAttempted = useRef(false);

  const locationState = location.state as {
    bookingPricing?: BookingPricing;
    bookingPricingError?: string;
    serviceId?: number;
    sessionId?: number;
  } | null;

  const storedPricing = (() => {
    try {
      const stored = sessionStorage.getItem(BOOKING_PRICING_KEY);
      return stored ? (JSON.parse(stored) as BookingPricing) : undefined;
    } catch {
      return undefined;
    }
  })();
  const storedPricingError = (() => {
    try {
      return sessionStorage.getItem(BOOKING_PRICING_ERROR_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  })();

  const [bookingPricing, setBookingPricing] = useState<BookingPricing | undefined>(
    locationState?.bookingPricing ?? storedPricing
  );
  const [bookingPricingError, setBookingPricingError] = useState<string | undefined>(
    locationState?.bookingPricingError ?? storedPricingError
  );
  const [isPricingLoading, setIsPricingLoading] = useState(false);

  // Restore professional, service, and session data from sessionStorage or location state on mount/reload
  useEffect(() => {
    // First, try location state (from immediate navigation)
    const state = location.state as { professional?: any; professionalId?: number; serviceId?: number; sessionId?: number } | null;
    if (state?.professional) {
      setBookingProfessional(state.professional);
      setSelectedProfessionalId(state.professionalId ?? null);
      if (state.professionalId != null) {
        try {
          sessionStorage.setItem(BOOKING_PROFESSIONAL_ID_KEY, String(state.professionalId));
        } catch (_) {}
      }
      if (state.serviceId != null) {
        try {
          sessionStorage.setItem(BOOKING_SERVICE_ID_KEY, String(state.serviceId));
        } catch (_) {}
      }
      if (state.sessionId != null) {
        try {
          sessionStorage.setItem(BOOKING_SESSION_ID_KEY, String(state.sessionId));
        } catch (_) {}
      }
      return;
    }

    // Then, try sessionStorage (for browser reload)
    try {
      const storedProfessional = sessionStorage.getItem(BOOKING_PROFESSIONAL_KEY);
      const storedProfessionalId = sessionStorage.getItem(BOOKING_PROFESSIONAL_ID_KEY);
      if (storedProfessional) {
        const professional = JSON.parse(storedProfessional);
        setBookingProfessional(professional);
        if (storedProfessionalId) {
          setSelectedProfessionalId(parseInt(storedProfessionalId, 10));
        }
      }
    } catch (error) {
      console.error('Failed to load professional from sessionStorage:', error);
    }
  }, [location.state, setBookingProfessional, setSelectedProfessionalId]);

  // Resolve professional data: context > location state > sessionStorage
  const resolvedProfessional = bookingProfessional || 
    (location.state as { professional?: any } | null)?.professional ||
    (() => {
      try {
        const stored = sessionStorage.getItem(BOOKING_PROFESSIONAL_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();

  const resolvedProfessionalId = selectedProfessionalId !== null && selectedProfessionalId !== undefined
    ? selectedProfessionalId
    : (location.state as { professionalId?: number } | null)?.professionalId ||
      (() => {
        try {
          const stored = sessionStorage.getItem(BOOKING_PROFESSIONAL_ID_KEY);
          return stored ? parseInt(stored, 10) : null;
        } catch {
          return null;
        }
      })();

  const resolvedServiceId = locationState?.serviceId ?? (() => {
    try {
      const bookingStored = sessionStorage.getItem(BOOKING_SERVICE_ID_KEY);
      if (bookingStored) {
        const n = parseInt(bookingStored, 10);
        return Number.isNaN(n) ? undefined : n;
      }
      const selectedStored = sessionStorage.getItem(SELECTED_SERVICE_ID_KEY);
      if (selectedStored) {
        const n = parseInt(selectedStored, 10);
        return Number.isNaN(n) ? undefined : n;
      }
      return undefined;
    } catch {
      return undefined;
    }
  })();

  const storedSessionId = (() => {
    try {
      const stored = sessionStorage.getItem(BOOKING_SESSION_ID_KEY);
      if (!stored) return undefined;
      const n = parseInt(stored, 10);
      return Number.isNaN(n) ? undefined : n;
    } catch {
      return undefined;
    }
  })();
  const resolvedSessionId =
    locationState?.sessionId ?? recoveredSessionId ?? storedSessionId;

  useEffect(() => {
    if (sessionRecoveryAttempted.current) return;
    if (resolvedSessionId != null && !Number.isNaN(resolvedSessionId)) return;
    if (resolvedProfessionalId == null || resolvedServiceId == undefined) return;
    if (!questionnaireData || !locationSearchData) return;
    const profId =
      resolvedProfessional?.id ??
      resolvedProfessional?.professional_id ??
      resolvedProfessionalId;
    if (profId == null || Number.isNaN(Number(profId))) return;

    sessionRecoveryAttempted.current = true;
    let cancelled = false;
    void (async () => {
      const created = await createBookingSelectedSession({
        professionalId: Number(profId),
        serviceId: resolvedServiceId,
        questionnaireData: questionnaireData as Record<string, unknown>,
        locationSearchData,
      });
      if (cancelled || created.sessionId == null) return;
      try {
        sessionStorage.setItem(BOOKING_SESSION_ID_KEY, String(created.sessionId));
      } catch (_) {}
      setRecoveredSessionId(created.sessionId);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    resolvedSessionId,
    resolvedProfessionalId,
    resolvedServiceId,
    questionnaireData,
    locationSearchData,
    resolvedProfessional,
  ]);

  // Always fetch pricing from add-to-cart API on the booking page (all services).
  useEffect(() => {
    const isCustomQuote = Boolean(questionnaireData?.isCustomQuote);
    if (isCustomQuote) return;

    const profId =
      resolvedProfessional?.id ??
      resolvedProfessional?.professional_id ??
      resolvedProfessionalId;
    const sessId = resolvedSessionId;
    const svcId = resolvedServiceId;

    if (profId == null || sessId == null || svcId == null) return;
    if (Number.isNaN(Number(profId)) || Number.isNaN(Number(sessId))) return;

    let cancelled = false;
    setIsPricingLoading(true);

    void (async () => {
      const result = await fetchBookingPricing({
        professionalId: Number(profId),
        sessionId: Number(sessId),
        serviceId: svcId,
        questionnaireData: questionnaireData as Record<string, unknown> | null,
      });
      if (cancelled) return;

      if (result.pricing) {
        setBookingPricing(result.pricing);
        setBookingPricingError(undefined);
        try {
          sessionStorage.setItem(BOOKING_PRICING_KEY, JSON.stringify(result.pricing));
          sessionStorage.removeItem(BOOKING_PRICING_ERROR_KEY);
        } catch (_) {}
      } else if (result.error) {
        setBookingPricingError(result.error);
        try {
          sessionStorage.setItem(BOOKING_PRICING_ERROR_KEY, result.error);
        } catch (_) {}
      }

      setIsPricingLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    resolvedSessionId,
    resolvedProfessionalId,
    resolvedServiceId,
    questionnaireData,
    resolvedProfessional,
  ]);

  return (
    <BookingFlow
      onConfirm={(data) => {
        setBookingData(data);
        navigate("/booking/confirmation");
      }}
      onBack={() => navigate("/professionals/compare")}
      selectedService={selectedService}
      selectedProfessional={selectedProfessional}
      professionalId={resolvedProfessionalId}
      serviceId={resolvedServiceId}
      sessionId={resolvedSessionId}
      bookingProfessional={resolvedProfessional}
      initialPricing={bookingPricing}
      initialPricingError={bookingPricingError}
      isPricingLoading={isPricingLoading}
      questionnaireData={questionnaireData}
      isCustomQuote={questionnaireData?.isCustomQuote}
      customQuoteRequestData={questionnaireData?.request_data}
      serviceIdForQuote={questionnaireData?.service_id}
      serviceNameHint={
        typeof questionnaireData?.service_name === "string"
          ? questionnaireData.service_name
          : undefined
      }
    />
  );
}

