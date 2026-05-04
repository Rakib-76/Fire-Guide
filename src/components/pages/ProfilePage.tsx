import React, { useEffect, startTransition } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { ProfessionalProfile } from "../ProfessionalProfile";
import { createBookingSelectedSession } from "../../lib/createBookingSelectedSession";
import {
  calculatePriceForBooking,
  addToCartFra,
  addToCartFireAlarm,
  addToCartFireExtinguisher,
  addToCartFireEmergencyLight,
  addToCartFireMarshal,
  addToCartFireConsultation,
} from "../../api/bookingService";
import { toast } from "sonner";

const SELECTED_PROFESSIONAL_KEY = 'fireguide_selected_professional';
const SELECTED_PROFESSIONAL_ID_KEY = 'fireguide_selected_professional_id';
const BOOKING_SERVICE_ID_KEY = 'fireguide_booking_service_id';
const BOOKING_SESSION_ID_KEY = 'fireguide_booking_session_id';
const BOOKING_PROFESSIONAL_KEY = 'fireguide_booking_professional';
const BOOKING_PROFESSIONAL_ID_KEY = 'fireguide_booking_professional_id';
const BOOKING_PRICING_KEY = 'fireguide_booking_pricing';
const BOOKING_PRICING_ERROR_KEY = 'fireguide_booking_pricing_error';
const QUESTIONNAIRE_STORAGE_KEY = 'fireguide_questionnaire_data';

function getIsCustomQuoteFromStorage(): boolean {
  try {
    const stored = sessionStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return Boolean(data?.isCustomQuote);
    }
  } catch (_) {
    /* ignore */
  }
  return false;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedProfessional,
    setSelectedProfessional,
    setBookingProfessional,
    setSelectedProfessionalId,
    locationSearchData,
    selectedServiceId,
    questionnaireData,
  } = useApp();
  const { professionalId } = useParams<{ professionalId: string }>();

  // Restore professional data from sessionStorage or location state on mount/reload
  useEffect(() => {
    // First, try location state (from immediate navigation)
    const locationState = location.state as { professional?: any; professionalId?: number } | null;
    if (locationState?.professional) {
      setSelectedProfessional(locationState.professional);
      return;
    }

    // Then, try sessionStorage (for browser reload)
    try {
      const storedProfessional = sessionStorage.getItem(SELECTED_PROFESSIONAL_KEY);
      const storedProfessionalId = sessionStorage.getItem(SELECTED_PROFESSIONAL_ID_KEY);
      
      if (storedProfessional) {
        const professional = JSON.parse(storedProfessional);
        setSelectedProfessional(professional);
      } else if (storedProfessionalId && professionalId && storedProfessionalId === professionalId) {
        // If we have matching ID but no full professional data, try to restore from context or use ID
        // The professional data might be in context already
      }
    } catch (error) {
      console.error('Failed to load selected professional from sessionStorage:', error);
    }
  }, [location.state, professionalId, setSelectedProfessional]);

  // Resolve professional data: context > location state > sessionStorage > ID only
  const resolvedProfessional = selectedProfessional || 
    (location.state as { professional?: any } | null)?.professional ||
    (() => {
      try {
        const stored = sessionStorage.getItem(SELECTED_PROFESSIONAL_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })() ||
    (professionalId ? { id: parseInt(professionalId, 10) } : null);

  const professionalIdNum = professionalId ? parseInt(professionalId, 10) : null;

  return (
    <ProfessionalProfile
      professional={resolvedProfessional}
      professionalIdFromUrl={professionalIdNum ?? undefined}
      onBook={async () => {
        const id =
          professionalIdNum ??
          resolvedProfessional?.id ??
          (resolvedProfessional as { professional_id?: number } | null)?.professional_id ??
          null;
        if (resolvedProfessional) {
          setBookingProfessional(resolvedProfessional);
          setSelectedProfessionalId(id ?? undefined);
          try {
            sessionStorage.setItem(BOOKING_PROFESSIONAL_KEY, JSON.stringify(resolvedProfessional));
            if (id != null) sessionStorage.setItem(BOOKING_PROFESSIONAL_ID_KEY, String(id));
          } catch (_) {
            /* ignore */
          }
        }
        const qSid = questionnaireData?.service_id;
        const rawServiceId =
          locationSearchData?.service_id ??
          selectedServiceId ??
          (typeof qSid === "number" ? qSid : qSid != null ? Number(qSid) : null);
        const serviceIdNum =
          rawServiceId != null && !Number.isNaN(Number(rawServiceId)) ? Number(rawServiceId) : undefined;
        if (serviceIdNum != null) {
          try {
            sessionStorage.setItem(BOOKING_SERVICE_ID_KEY, String(serviceIdNum));
          } catch (_) {}
        }

        let sessionIdForBooking: number | undefined;
        if (
          id != null &&
          serviceIdNum != null &&
          questionnaireData &&
          locationSearchData
        ) {
          const created = await createBookingSelectedSession({
            professionalId: Number(id),
            serviceId: serviceIdNum,
            questionnaireData: questionnaireData as Record<string, unknown>,
            locationSearchData,
          });
          if (created.error) {
            toast.error(created.error);
            return;
          }
          sessionIdForBooking = created.sessionId;
        }
        if (serviceIdNum != null && sessionIdForBooking == null) {
          toast.error(
            "Could not start your booking session. Please use Compare Professionals and click Book, or complete the service questionnaire first."
          );
          return;
        }
        if (sessionIdForBooking != null) {
          try {
            sessionStorage.setItem(BOOKING_SESSION_ID_KEY, String(sessionIdForBooking));
          } catch (_) {}
        }

        // Match ComparisonPage: call add-to-cart (e.g. POST /add-to-cart/fra) so Booking Summary shows correct calculated price
        const isCustomQuote = Boolean(questionnaireData?.isCustomQuote) || getIsCustomQuoteFromStorage();
        const professional = resolvedProfessional as {
          id?: number;
          service_price?: number | string;
          price?: number | string;
          platform_fee_amount?: number | string;
          total_price?: number | string;
          platform_fee_percent?: string;
        } | null;
        const serviceId = serviceIdNum;
        const isFireAlarm = Boolean((questionnaireData as { is_fire_alarm?: boolean })?.is_fire_alarm);
        const isFireExtinguisher = Boolean((questionnaireData as { is_fire_extinguisher?: boolean })?.is_fire_extinguisher);
        const isEmergencyLighting =
          serviceId === 39 ||
          Boolean(
            (questionnaireData as { emergency_light_id?: number })?.emergency_light_id != null ||
              (questionnaireData as { emergency_lights_count?: string })?.emergency_lights_count
          );
        const isFireMarshal =
          serviceId === 45 ||
          Boolean(
            (questionnaireData as { people_id?: number })?.people_id != null ||
              (questionnaireData as { training_people_count?: string })?.training_people_count
          );
        const isFireConsultation =
          serviceId === 46 ||
          Boolean(
            (questionnaireData as { mode_id?: number })?.mode_id != null ||
              (questionnaireData as { consultation_type?: string })?.consultation_type
          );
        const isFRA =
          !isFireAlarm && !isFireExtinguisher && !isEmergencyLighting && !isFireMarshal && !isFireConsultation;

        let bookingPricing:
          | { servicePrice: number; platformFee: number; total: number; platformFeePercent?: string }
          | undefined;
        let bookingPricingError: string | undefined;

        const servicePriceFromCard = professional?.service_price ?? professional?.price;
        if (
          servicePriceFromCard != null &&
          Number(servicePriceFromCard) > 0 &&
          !isCustomQuote &&
          professional?.platform_fee_amount != null &&
          professional?.total_price != null
        ) {
          const platformFee = Number(professional.platform_fee_amount);
          const total = Number(professional.total_price);
          bookingPricing = {
            servicePrice: Number(servicePriceFromCard),
            platformFee: Math.round(platformFee * 100) / 100,
            total: Math.round(total * 100) / 100,
            platformFeePercent: professional.platform_fee_percent,
          };
        }

        if (bookingPricing == null && serviceId != null && sessionIdForBooking != null && id != null) {
          try {
            if (isFRA) {
              const res = await addToCartFra({
                professional_id: Number(id),
                session_id: Number(sessionIdForBooking),
              });
              if (res?.status && res?.data) {
                bookingPricing = {
                  servicePrice: res.data.service_price,
                  platformFee: res.data.platform_fee_amount ?? 0,
                  total: res.data.total_price,
                  platformFeePercent: res.data.platform_fee_percent,
                };
              } else if (res?.status === false && res?.message) {
                bookingPricingError = res.message;
              }
            } else if (isFireAlarm) {
              const res = await addToCartFireAlarm({
                professional_id: Number(id),
                session_id: Number(sessionIdForBooking),
              });
              if (res?.status && res?.data) {
                bookingPricing = {
                  servicePrice: res.data.service_price,
                  platformFee: res.data.platform_fee_amount ?? 0,
                  total: res.data.total_price,
                  platformFeePercent: res.data.platform_fee_percent,
                };
              } else if (res?.status === false && res?.message) {
                bookingPricingError = res.message;
              }
            } else if (isFireExtinguisher) {
              const res = await addToCartFireExtinguisher({
                professional_id: Number(id),
                session_id: Number(sessionIdForBooking),
              });
              if (res?.status && res?.data) {
                bookingPricing = {
                  servicePrice: res.data.service_price,
                  platformFee: res.data.platform_fee_amount ?? 0,
                  total: res.data.total_price,
                  platformFeePercent: res.data.platform_fee_percent,
                };
              } else if (res?.status === false && res?.message) {
                bookingPricingError = res.message;
              }
            } else if (isEmergencyLighting) {
              const res = await addToCartFireEmergencyLight({
                professional_id: Number(id),
                session_id: Number(sessionIdForBooking),
              });
              if (res?.status && res?.data) {
                bookingPricing = {
                  servicePrice: res.data.service_price,
                  platformFee: res.data.platform_fee_amount ?? 0,
                  total: res.data.total_price,
                  platformFeePercent: res.data.platform_fee_percent,
                };
              } else if (res?.status === false && res?.message) {
                bookingPricingError = res.message;
              }
            } else if (isFireMarshal) {
              const res = await addToCartFireMarshal({
                professional_id: Number(id),
                session_id: Number(sessionIdForBooking),
              });
              if (res?.status && res?.data) {
                bookingPricing = {
                  servicePrice: res.data.service_price,
                  platformFee: res.data.platform_fee_amount ?? 0,
                  total: res.data.total_price,
                  platformFeePercent: res.data.platform_fee_percent,
                };
              } else if (res?.status === false && res?.message) {
                bookingPricingError = res.message;
              }
            } else if (isFireConsultation) {
              const res = await addToCartFireConsultation({
                professional_id: Number(id),
                session_id: Number(sessionIdForBooking),
              });
              if (res?.status && res?.data) {
                bookingPricing = {
                  servicePrice: res.data.service_price,
                  platformFee: res.data.platform_fee_amount ?? 0,
                  total: res.data.total_price,
                  platformFeePercent: res.data.platform_fee_percent,
                };
              } else if (res?.status === false && res?.message) {
                bookingPricingError = res.message;
              }
            } else {
              const res = await calculatePriceForBooking({
                professional_id: Number(id),
                session_id: sessionIdForBooking,
                service_id: serviceId,
              });
              if (res?.status && res?.data) {
                bookingPricing = {
                  servicePrice: res.data.service_price,
                  platformFee: res.data.platform_fee_amount,
                  total: res.data.total_price,
                  platformFeePercent: res.data.platform_fee_percent,
                };
              } else if (res?.status === false && res?.message) {
                bookingPricingError = res.message;
              }
            }
          } catch (err: unknown) {
            const e = err as { message?: string; error?: string };
            bookingPricingError = e?.message || e?.error || "Unable to load price. Please try again.";
          }
        } else if (serviceId == null) {
          bookingPricingError = "Service not selected. Please start from the service search.";
        }

        startTransition(() => {
          try {
            if (bookingPricing && !isCustomQuote) {
              sessionStorage.setItem(BOOKING_PRICING_KEY, JSON.stringify(bookingPricing));
              sessionStorage.removeItem(BOOKING_PRICING_ERROR_KEY);
            } else if (bookingPricingError) {
              sessionStorage.setItem(BOOKING_PRICING_ERROR_KEY, bookingPricingError);
            }
          } catch (_) {
            /* ignore */
          }
          navigate("/booking", {
            state: {
              professional: resolvedProfessional,
              professionalId: id ?? undefined,
              ...(serviceIdNum != null ? { serviceId: serviceIdNum } : {}),
              ...(sessionIdForBooking != null ? { sessionId: sessionIdForBooking } : {}),
              ...(bookingPricing && !isCustomQuote && { bookingPricing }),
              ...(bookingPricingError && { bookingPricingError }),
            },
          });
        });
      }}
      onBack={() => navigate("/professionals/compare")}
    />
  );
}

