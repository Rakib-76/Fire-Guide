import {
  addToCartFra,
  addToCartFireAlarm,
  addToCartFireExtinguisher,
  addToCartFireEmergencyLight,
  addToCartFireMarshal,
  addToCartFireConsultation,
  calculatePriceForBooking,
} from "../api/bookingService";
import { resolveBookingServiceKind } from "./bookingServiceKind";

export type BookingPricing = {
  servicePrice: number;
  platformFee: number;
  total: number;
  platformFeePercent?: string;
};

type AddToCartResponse = {
  status?: boolean;
  message?: string;
  data?: {
    service_price: number;
    platform_fee_amount?: number;
    total_price: number;
    platform_fee_percent?: string;
  };
};

function mapAddToCartResponse(res: AddToCartResponse): { pricing?: BookingPricing; error?: string } {
  if (res?.status && res?.data) {
    return {
      pricing: {
        servicePrice: res.data.service_price,
        platformFee: res.data.platform_fee_amount ?? 0,
        total: res.data.total_price,
        platformFeePercent: res.data.platform_fee_percent,
      },
    };
  }
  if (res?.status === false && res?.message) {
    return { error: res.message };
  }
  return { error: "Unable to load price. Please try again." };
}

/**
 * Fetches calculated booking price from the service-specific add-to-cart API.
 * Used on the booking page so pricing always comes from the backend.
 */
export async function fetchBookingPricing(params: {
  professionalId: number;
  sessionId: number;
  serviceId: number;
  questionnaireData?: Record<string, unknown> | null;
}): Promise<{ pricing?: BookingPricing; error?: string }> {
  const { professionalId, sessionId, serviceId, questionnaireData } = params;
  const kind = resolveBookingServiceKind(questionnaireData, serviceId);

  try {
    let res: AddToCartResponse;

    switch (kind) {
      case "fire-alarm":
        res = await addToCartFireAlarm({
          professional_id: professionalId,
          session_id: sessionId,
        });
        break;
      case "fire-extinguisher":
        res = await addToCartFireExtinguisher({
          professional_id: professionalId,
          session_id: sessionId,
        });
        break;
      case "emergency-light":
        res = await addToCartFireEmergencyLight({
          professional_id: professionalId,
          session_id: sessionId,
        });
        break;
      case "fire-marshal":
        res = await addToCartFireMarshal({
          professional_id: professionalId,
          session_id: sessionId,
        });
        break;
      case "fire-consultation":
        res = await addToCartFireConsultation({
          professional_id: professionalId,
          session_id: sessionId,
        });
        break;
      case "fra":
        res = await addToCartFra({
          professional_id: professionalId,
          session_id: sessionId,
        });
        break;
      default: {
        const generic = await calculatePriceForBooking({
          professional_id: professionalId,
          session_id: sessionId,
          service_id: serviceId,
        });
        return mapAddToCartResponse(generic);
      }
    }

    return mapAddToCartResponse(res);
  } catch (err: unknown) {
    const e = err as { message?: string; error?: string };
    return {
      error: e?.message || e?.error || "Unable to load price. Please try again.",
    };
  }
}
