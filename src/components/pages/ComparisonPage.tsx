import { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { ComparisonResults } from "../ComparisonResults";
import { calculatePriceForBooking, addToCartFra, addToCartFireAlarm, addToCartFireExtinguisher, addToCartFireEmergencyLight, addToCartFireMarshal, addToCartFireConsultation } from "../../api/bookingService";
import { toast } from "sonner";
import { createBookingSelectedSession } from "../../lib/createBookingSelectedSession";

const BOOKING_PROFESSIONAL_KEY = 'fireguide_booking_professional';
const BOOKING_PROFESSIONAL_ID_KEY = 'fireguide_booking_professional_id';
const BOOKING_SESSION_ID_KEY = 'fireguide_booking_session_id';
const BOOKING_PRICING_KEY = 'fireguide_booking_pricing';
const BOOKING_PRICING_ERROR_KEY = 'fireguide_booking_pricing_error';
const SELECTED_PROFESSIONAL_KEY = 'fireguide_selected_professional';
const SELECTED_PROFESSIONAL_ID_KEY = 'fireguide_selected_professional_id';

const QUESTIONNAIRE_STORAGE_KEY = 'fireguide_questionnaire_data';

function getIsCustomQuote() {
  try {
    const stored = sessionStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return Boolean(data?.isCustomQuote);
    }
  } catch (_) {}
  return false;
}

export default function ComparisonPage() {
  const navigate = useNavigate();
  const { setSelectedProfessional, setBookingProfessional, setSelectedProfessionalId, questionnaireData, locationSearchData } = useApp();
  const isCustomQuote = Boolean(questionnaireData?.isCustomQuote) || getIsCustomQuote();

  return (
    <ComparisonResults
      onViewProfile={(professional) => {
        // Update context state
        setSelectedProfessional(professional);
        
        // Use professional ID from list (id or professional_id) for pricing API on profile page
        const professionalId = professional.id ?? (professional as { professional_id?: number }).professional_id;
        // Persist to sessionStorage for browser reload
        try {
          sessionStorage.setItem(SELECTED_PROFESSIONAL_KEY, JSON.stringify(professional));
          sessionStorage.setItem(SELECTED_PROFESSIONAL_ID_KEY, String(professionalId));
        } catch (error) {
          console.error('Failed to save selected professional to sessionStorage:', error);
        }
        startTransition(() => {
          navigate(`/professionals/${professionalId}`, { state: { professional, professionalId } });
        });
      }}
      onBookNow={async (professional) => {
        setBookingProfessional(professional);
        setSelectedProfessionalId(professional.id);
        try {
          sessionStorage.setItem(BOOKING_PROFESSIONAL_KEY, JSON.stringify(professional));
          sessionStorage.setItem(BOOKING_PROFESSIONAL_ID_KEY, professional.id.toString());
        } catch (error) {
          console.error('Failed to save professional to sessionStorage:', error);
        }

        // 1) Call store API only when Book Now is clicked (with selected professional's ID). Use Fire Alarm endpoint for Fire Alarm service, else selected_services/store.
        let sessionId: number | string | undefined;
        const serviceId = locationSearchData?.service_id;
        const serviceIdNum = Number(serviceId);
        const isFireAlarm = Boolean((questionnaireData as { is_fire_alarm?: boolean })?.is_fire_alarm);
        const isFireExtinguisher = Boolean((questionnaireData as { is_fire_extinguisher?: boolean })?.is_fire_extinguisher);
        const isEmergencyLighting = serviceIdNum === 39 || Boolean((questionnaireData as { emergency_light_id?: number })?.emergency_light_id != null || (questionnaireData as { emergency_lights_count?: string })?.emergency_lights_count);
        const isFireMarshal = serviceIdNum === 45 || Boolean((questionnaireData as { people_id?: number })?.people_id != null || (questionnaireData as { training_people_count?: string })?.training_people_count);
        const isFireConsultation = serviceIdNum === 46 || Boolean((questionnaireData as { mode_id?: number })?.mode_id != null || (questionnaireData as { consultation_type?: string })?.consultation_type);
        if (questionnaireData && locationSearchData && serviceId != null) {
          const created = await createBookingSelectedSession({
            professionalId: professional.id,
            serviceId: serviceIdNum,
            questionnaireData: questionnaireData as Record<string, unknown>,
            locationSearchData,
          });
          if (created.error) {
            console.error("Failed to create selected service session:", created.error);
            toast.error(created.error || "Could not complete. Please try again.");
          }
          if (created.sessionId != null) {
            sessionId = created.sessionId;
          }
        }

        // 2) Pricing for Booking Summary: prefer filter-professional/for-fra API response (the card) so Service Fee = card price, platform_fee_amount and total_price from API
        const isFRA = !isFireAlarm && !isFireExtinguisher && !isEmergencyLighting && !isFireMarshal && !isFireConsultation;
        let bookingPricing: { servicePrice: number; platformFee: number; total: number; platformFeePercent?: string } | undefined;
        let bookingPricingError: string | undefined;
        const servicePriceFromCard = professional.service_price ?? professional.price;
        if (servicePriceFromCard != null && Number(servicePriceFromCard) > 0 && !isCustomQuote &&
            professional.platform_fee_amount != null && professional.total_price != null) {
          // Use filter API response so Booking Summary matches the book card (price, platform_fee_amount, total_price)
          const platformFee = Number(professional.platform_fee_amount);
          const total = Number(professional.total_price);
          bookingPricing = {
            servicePrice: Number(servicePriceFromCard),
            platformFee: Math.round(platformFee * 100) / 100,
            total: Math.round(total * 100) / 100,
            platformFeePercent: professional.platform_fee_percent,
          };
        }
        // When we don't have full pricing from the card, get from add-to-cart (or show error)
        if (bookingPricing == null && serviceId != null && sessionId != null) {
          try {
            if (isFRA) {
              const res = await addToCartFra({
                professional_id: professional.id,
                session_id: Number(sessionId),
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
                professional_id: professional.id,
                session_id: Number(sessionId),
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
                professional_id: professional.id,
                session_id: Number(sessionId),
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
                professional_id: professional.id,
                session_id: Number(sessionId),
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
                professional_id: professional.id,
                session_id: Number(sessionId),
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
                professional_id: professional.id,
                session_id: Number(sessionId),
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
                professional_id: professional.id,
                session_id: sessionId,
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
          } catch (err: any) {
            bookingPricingError = err?.message || err?.error || "Unable to load price. Please try again.";
          }
        } else if (serviceId == null) {
          bookingPricingError = "Service not selected. Please start from the service search.";
        } else {
          // Session creation failed; use professional's price from filter API (price, platform_fee_amount, total_price) so Booking Summary shows API values
          const servicePrice = professional.service_price ?? professional.price;
          if (servicePrice != null && Number(servicePrice) > 0 && !isCustomQuote) {
            const platformFeeAmount = professional.platform_fee_amount ?? (Number(servicePrice) * 0.2);
            const totalPrice = professional.total_price ?? (Number(servicePrice) + platformFeeAmount);
            bookingPricing = {
              servicePrice: Number(servicePrice),
              platformFee: Number(platformFeeAmount),
              total: Number(totalPrice),
              platformFeePercent: professional.platform_fee_percent,
            };
          } else {
            bookingPricingError = "Could not create booking session. Please try again.";
          }
        }

        if (serviceId != null && sessionId == null) {
          toast.error("Could not create a booking session. Please try Book again from the list.");
          return;
        }

        startTransition(() => {
          try {
            if (sessionId != null) sessionStorage.setItem(BOOKING_SESSION_ID_KEY, String(sessionId));
            if (bookingPricing && !isCustomQuote) {
              sessionStorage.setItem(BOOKING_PRICING_KEY, JSON.stringify(bookingPricing));
              sessionStorage.removeItem(BOOKING_PRICING_ERROR_KEY);
            } else if (bookingPricingError) {
              sessionStorage.setItem(BOOKING_PRICING_ERROR_KEY, bookingPricingError);
            }
          } catch (_) {}
          navigate("/booking", {
            state: {
              professional,
              professionalId: professional.id,
              serviceId: serviceId != null ? Number(serviceId) : undefined,
              sessionId: sessionId != null ? Number(sessionId) : undefined,
              ...(bookingPricing && !isCustomQuote && { bookingPricing }),
              ...(bookingPricingError && { bookingPricingError }),
            },
          });
        });
      }}
      onBack={() => {
        startTransition(() => {
          navigate(-1);
        });
      }}
    />
  );
}

