/**
 * FIRE GUIDE PAYMENT SYSTEM - PROFESSIONAL PAYOUT LOGIC
 * Handles all professional payout processing and eligibility checks
 */

import {
  BookingPaymentData,
  Payout,
  PayoutStatus,
  PayoutEligibility,
  BookingStatus,
  ServiceType,
  Deliverable,
  DeliverableType
} from "./types";

// ============================================
// SECTION 3 — PROFESSIONAL PAYMENT LOGIC
// ============================================

/**
 * Required deliverables for each service type
 */
const REQUIRED_DELIVERABLES: Record<ServiceType, DeliverableType[keyof DeliverableType]> = {
  [ServiceType.FRA]: "FRA report",
  [ServiceType.Alarm]: "alarm certificate",
  [ServiceType.Extinguisher]: "extinguisher report",
  [ServiceType.EmergencyLighting]: "EL certificate",
  [ServiceType.Training]: "attendance sheet",
  [ServiceType.CustomQuote]: "FRA report" // Default, can be customized
};

/**
 * Checks if payout is eligible
 * 
 * PAYOUT CONDITIONS:
 * A payout becomes eligible ONLY when ALL are true:
 * • booking.status = "Completed"
 * • Deliverables uploaded (service-specific)
 * • No dispute is open
 * • Admin has not placed a payout hold
 */
export function checkPayoutEligibility(
  booking: BookingPaymentData
): PayoutEligibility {
  const reasons: string[] = [];
  const missingDeliverables: string[] = [];

  // Condition 1: booking.status = "Completed"
  const bookingCompleted = booking.booking_status === BookingStatus.Completed;
  if (!bookingCompleted) {
    reasons.push(`Booking status is "${booking.booking_status}", must be "Completed"`);
  }

  // Condition 2: Deliverables uploaded
  const requiredDeliverable = REQUIRED_DELIVERABLES[booking.service_type];
  const deliverableUploaded = booking.deliverables.some(
    (d) => d.type === requiredDeliverable && d.uploaded === true
  );

  if (!deliverableUploaded) {
    missingDeliverables.push(requiredDeliverable);
    reasons.push(`Required deliverable "${requiredDeliverable}" not uploaded`);
  }

  // Condition 3: No dispute is open
  const noDisputeOpen = !booking.dispute_open;
  if (!noDisputeOpen) {
    reasons.push("Dispute is currently open");
  }

  // Condition 4: Admin has not placed a payout hold
  const noPayoutHold = !booking.payout_hold;
  if (!noPayoutHold) {
    reasons.push(`Payout hold active: ${booking.payout_hold_reason || "Reason not specified"}`);
  }

  const eligible = 
    bookingCompleted && 
    deliverableUploaded && 
    noDisputeOpen && 
    noPayoutHold;

  return {
    eligible,
    reasons: eligible ? [] : reasons,
    booking_completed: bookingCompleted,
    deliverables_uploaded: deliverableUploaded,
    no_dispute_open: noDisputeOpen,
    no_payout_hold: noPayoutHold,
    missing_deliverables: missingDeliverables.length > 0 ? missingDeliverables : undefined
  };
}

/**
 * Creates a payout record when eligible
 * 
 * PAYOUT ACTION:
 * • Create Stripe Transfer to professional's connected account
 * • payout.status = "Released"
 * • Save transfer_id in payout record
 */
export async function createPayout(
  booking: BookingPaymentData,
  professionalStripeAccountId: string
): Promise<{
  success: boolean;
  payout?: Payout;
  error?: string;
}> {
  // First check eligibility
  const eligibility = checkPayoutEligibility(booking);
  
  if (!eligibility.eligible) {
    return {
      success: false,
      error: `Payout not eligible: ${eligibility.reasons.join(", ")}`
    };
  }

  try {
    // In production, create Stripe Transfer
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const transfer = await stripe.transfers.create({
    //   amount: Math.round(booking.pro_earnings * 100), // Convert to pence
    //   currency: 'gbp',
    //   destination: professionalStripeAccountId,
    //   transfer_group: booking.booking_id,
    //   metadata: {
    //     booking_id: booking.booking_id,
    //     service_type: booking.service_type
    //   }
    // });

    // Simulate transfer ID
    const transferId = `tr_${generateId()}`;

    // Create payout record
    const payout: Payout = {
      payout_id: `payout_${generateId()}`,
      booking_id: booking.booking_id,
      professional_id: booking.professional_id,
      amount: booking.pro_earnings,
      commission_deducted: booking.commission_amount,
      original_amount: booking.final_price,
      payout_transfer_id: transferId,
      status: PayoutStatus.Released,
      eligible_at: new Date(),
      released_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    return {
      success: true,
      payout
    };
  } catch (error) {
    // IF TRANSFER FAILS:
    // • payout.status = "Failed"
    // • Add admin alert: "Manual payout required."
    
    const failedPayout: Payout = {
      payout_id: `payout_${generateId()}`,
      booking_id: booking.booking_id,
      professional_id: booking.professional_id,
      amount: booking.pro_earnings,
      commission_deducted: booking.commission_amount,
      original_amount: booking.final_price,
      status: PayoutStatus.Failed,
      eligible_at: new Date(),
      failed_at: new Date(),
      failure_reason: error instanceof Error ? error.message : "Unknown error",
      created_at: new Date(),
      updated_at: new Date()
    };

    return {
      success: false,
      payout: failedPayout,
      error: `Transfer failed: ${failedPayout.failure_reason}. Manual payout required.`
    };
  }
}

/**
 * Marks payout as eligible (not yet released)
 * 
 * This sets payout.status = "Eligible" and waits for manual or automatic release
 */
export function markPayoutEligible(
  booking: BookingPaymentData
): Payout | null {
  const eligibility = checkPayoutEligibility(booking);
  
  if (!eligibility.eligible) {
    return null;
  }

  const payout: Payout = {
    payout_id: `payout_${generateId()}`,
    booking_id: booking.booking_id,
    professional_id: booking.professional_id,
    amount: booking.pro_earnings,
    commission_deducted: booking.commission_amount,
    original_amount: booking.final_price,
    status: PayoutStatus.Eligible,
    eligible_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  };

  return payout;
}

/**
 * Updates booking with payout transfer ID
 */
export function updateBookingWithPayout(
  booking: BookingPaymentData,
  payoutTransferId: string
): BookingPaymentData {
  return {
    ...booking,
    payout_transfer_id: payoutTransferId,
    payout_status: PayoutStatus.Released,
    updated_at: new Date()
  };
}

/**
 * Checks if all deliverables for a service are uploaded
 */
export function checkDeliverablesComplete(
  serviceType: ServiceType,
  deliverables: Deliverable[]
): { complete: boolean; missing: string[] } {
  const required = REQUIRED_DELIVERABLES[serviceType];
  const uploaded = deliverables.find(d => d.type === required && d.uploaded);
  
  return {
    complete: Boolean(uploaded),
    missing: uploaded ? [] : [required]
  };
}

/**
 * Adds a deliverable to a booking
 */
export function addDeliverable(
  booking: BookingPaymentData,
  deliverableType: DeliverableType[keyof DeliverableType],
  fileUrl: string,
  fileName: string
): BookingPaymentData {
  const newDeliverable: Deliverable = {
    type: deliverableType,
    uploaded: true,
    uploadedAt: new Date(),
    fileUrl,
    fileName
  };

  // Remove any existing deliverable of the same type
  const filteredDeliverables = booking.deliverables.filter(
    d => d.type !== deliverableType
  );

  return {
    ...booking,
    deliverables: [...filteredDeliverables, newDeliverable],
    updated_at: new Date()
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
