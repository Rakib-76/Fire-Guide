/**
 * FIRE GUIDE PAYMENT SYSTEM - MAIN EXPORT
 * 
 * This file exports all payment system modules for easy importing
 * throughout the Fire Guide application.
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Customer Payment Flow:
 * ```typescript
 * import { 
 *   validatePaymentConditions, 
 *   createStripeCheckoutSession,
 *   handlePaymentSuccess 
 * } from '@/lib/payment';
 * 
 * const validation = validatePaymentConditions(booking, true, true);
 * if (validation.valid) {
 *   const session = await createStripeCheckoutSession(booking, successUrl, cancelUrl);
 *   // Redirect to Stripe Checkout
 * }
 * ```
 * 
 * 2. Professional Payout Flow:
 * ```typescript
 * import { 
 *   checkPayoutEligibility, 
 *   createPayout 
 * } from '@/lib/payment';
 * 
 * const eligibility = checkPayoutEligibility(booking);
 * if (eligibility.eligible) {
 *   const result = await createPayout(booking, professionalStripeAccountId);
 * }
 * ```
 * 
 * 3. Admin Operations:
 * ```typescript
 * import { 
 *   adminApproveRefund, 
 *   adminForcePayout,
 *   updateCommissionPercent 
 * } from '@/lib/payment';
 * 
 * // Approve refund
 * const refundResult = await adminApproveRefund(booking, payment, refundRequest, adminId);
 * 
 * // Force payout
 * const payoutResult = await adminForcePayout(booking, stripeAccountId, adminId, reason);
 * 
 * // Update commission
 * const newConfig = updateCommissionPercent(ServiceType.FRA, 0.18, adminId);
 * ```
 * 
 * 4. Pricing Calculations:
 * ```typescript
 * import { 
 *   calculateFRAPrice, 
 *   calculateCommissionAndEarnings 
 * } from '@/lib/payment';
 * 
 * const pricing = calculateFRAPrice({
 *   basePrice: 250,
 *   propertySize: 'medium',
 *   riskLevel: 'high'
 * });
 * 
 * const earnings = calculateCommissionAndEarnings(pricing.finalPrice, 0.15);
 * ```
 * 
 * 5. Status Management:
 * ```typescript
 * import { 
 *   updateBookingWithStatusCascade,
 *   getWorkflowStage 
 * } from '@/lib/payment';
 * 
 * const result = updateBookingWithStatusCascade(booking, {
 *   bookingStatus: BookingStatus.Completed
 * });
 * 
 * const stage = getWorkflowStage(booking);
 * ```
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export * from "./types";

// ============================================
// CUSTOMER PAYMENT LOGIC
// ============================================

export {
  validatePaymentConditions,
  createStripeCheckoutSession,
  handlePaymentSuccess,
  handlePaymentFailure,
  checkRefundEligibility,
  processRefund,
  createRefundRequest
} from "./payment-logic";

// ============================================
// PROFESSIONAL PAYOUT LOGIC
// ============================================

export {
  checkPayoutEligibility,
  createPayout,
  markPayoutEligible,
  updateBookingWithPayout,
  checkDeliverablesComplete,
  addDeliverable
} from "./payout-logic";

// ============================================
// ADMIN CONTROLS
// ============================================

export {
  updateCommissionPercent,
  getCurrentCommissionRate,
  freezePayout,
  unfreezePayout,
  shouldBlockPayout,
  overrideBookingStatus,
  adminApproveRefund,
  adminDenyRefund,
  adminForcePayout,
  getAllPayments,
  getAllPayouts
} from "./admin-controls";

// ============================================
// PRICING CALCULATOR
// ============================================

export {
  calculateFRAPrice,
  calculateAlarmPrice,
  calculateExtinguisherPrice,
  calculateEmergencyLightingPrice,
  calculateTrainingPrice,
  calculateCustomQuotePrice,
  calculateServicePrice,
  calculateCommissionAndEarnings,
  validatePrice
} from "./pricing-calculator";

export type {
  FRAPricingInput,
  AlarmPricingInput,
  ExtinguisherPricingInput,
  EmergencyLightingPricingInput,
  TrainingPricingInput,
  CustomQuotePricingInput,
  ServicePricingInput
} from "./pricing-calculator";

// ============================================
// STATUS STATE MACHINE
// ============================================

export {
  canTransitionPaymentStatus,
  transitionPaymentStatus,
  canTransitionPayoutStatus,
  transitionPayoutStatus,
  canTransitionBookingStatus,
  transitionBookingStatus,
  updateBookingWithStatusCascade,
  createStatusHistoryEntry,
  isTerminalState,
  canModifyBooking,
  getWorkflowStage,
  PAYMENT_STATUS_TRANSITIONS,
  PAYOUT_STATUS_TRANSITIONS,
  BOOKING_STATUS_TRANSITIONS
} from "./status-machine";

export type {
  StatusHistoryEntry
} from "./status-machine";
