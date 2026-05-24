/**
 * FIRE GUIDE PAYMENT SYSTEM - CUSTOMER PAYMENT LOGIC
 * Handles all customer payment processing, validation, and refunds
 */

import {
  BookingPaymentData,
  Payment,
  PaymentStatus,
  PaymentValidation,
  RefundRequest,
  RefundReason,
  BookingStatus,
  PayoutStatus,
  StripeCheckoutSession
} from "./types";

// ============================================
// SECTION 2 — CUSTOMER PAYMENT LOGIC
// ============================================

/**
 * TRIGGER: Customer clicks "Book & Pay"
 * 
 * Validates all payment conditions before creating Stripe Checkout
 */
export function validatePaymentConditions(
  booking: Partial<BookingPaymentData>,
  customerLoggedIn: boolean,
  professionalAvailable: boolean
): PaymentValidation {
  const errors: string[] = [];

  // Condition 1: final_price must exist and be validated
  if (!booking.final_price || booking.final_price <= 0) {
    errors.push("Final price is missing or invalid");
  }

  // Condition 2: Property + service details must be complete
  const propertyComplete = Boolean(
    booking.service_type &&
    booking.service_date &&
    booking.customer_id &&
    booking.professional_id
  );

  if (!propertyComplete) {
    errors.push("Property and service details are incomplete");
  }

  // Condition 3: Professional must be available for selected date
  if (!professionalAvailable) {
    errors.push("Professional is not available for the selected date");
  }

  // Condition 4: Customer must be logged in
  if (!customerLoggedIn) {
    errors.push("Customer must be logged in");
  }

  return {
    valid: errors.length === 0,
    errors,
    final_price: booking.final_price,
    property_complete: propertyComplete,
    service_complete: Boolean(booking.service_type && booking.service_date),
    professional_available: professionalAvailable,
    customer_logged_in: customerLoggedIn
  };
}

/**
 * Creates a Stripe Checkout Session
 * 
 * ACTION 1: Create Stripe Checkout Session
 */
export async function createStripeCheckoutSession(
  booking: BookingPaymentData,
  successUrl: string,
  cancelUrl: string
): Promise<StripeCheckoutSession> {
  // In production, this would call Stripe API
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.create({...});

  const session: StripeCheckoutSession = {
    session_id: `cs_${generateId()}`,
    booking_id: booking.booking_id,
    customer_id: booking.customer_id,
    amount: booking.final_price,
    currency: "gbp",
    success_url: successUrl,
    cancel_url: cancelUrl,
    status: "pending",
    created_at: new Date()
  };

  return session;
}

/**
 * Handles successful payment
 * 
 * ACTION 2: If payment succeeds:
 * - Set booking.status = "Booked"
 * - Set payment.status = "Paid"
 * - Store commission_amount and pro_earnings
 */
export function handlePaymentSuccess(
  booking: BookingPaymentData,
  paymentIntentId: string
): { booking: BookingPaymentData; payment: Payment } {
  // Calculate commission and pro earnings
  const commission_amount = booking.final_price * booking.commission_percent;
  const pro_earnings = booking.final_price - commission_amount;

  // Update booking
  const updatedBooking: BookingPaymentData = {
    ...booking,
    payment_intent_id: paymentIntentId,
    payment_status: PaymentStatus.Paid,
    booking_status: BookingStatus.Booked,
    commission_amount,
    pro_earnings,
    updated_at: new Date()
  };

  // Create payment record
  const payment: Payment = {
    payment_id: `pay_${generateId()}`,
    booking_id: booking.booking_id,
    customer_id: booking.customer_id,
    amount: booking.final_price,
    commission_amount,
    pro_earnings,
    payment_intent_id: paymentIntentId,
    status: PaymentStatus.Paid,
    created_at: new Date(),
    updated_at: new Date()
  };

  return { booking: updatedBooking, payment };
}

/**
 * Handles payment failure
 * 
 * ACTION 3: If payment fails:
 * - booking is not created
 * - show message "Payment failed"
 */
export function handlePaymentFailure(
  bookingId: string,
  reason?: string
): { success: false; message: string; reason?: string } {
  return {
    success: false,
    message: "Payment failed",
    reason: reason || "Unknown payment error"
  };
}

// ============================================
// REFUND CONDITIONS & ACTIONS
// ============================================

/**
 * Checks if a refund is eligible based on conditions
 * 
 * REFUND CONDITIONS:
 * • If customer cancels BEFORE service date → full refund
 * • If professional cancels → full refund
 * • If service cannot be delivered → full refund
 * • If dispute resolved in customer favor → full refund
 */
export function checkRefundEligibility(
  booking: BookingPaymentData,
  reason: RefundReason,
  requesterId: string,
  requesterType: "customer" | "admin" | "professional"
): { eligible: boolean; reason?: string } {
  const now = new Date();
  const serviceDate = new Date(booking.service_date);

  switch (reason) {
    case RefundReason.CustomerCancelledBeforeService:
      // Customer can only cancel before service date
      if (requesterType === "customer" && now < serviceDate) {
        return { eligible: true };
      }
      return { eligible: false, reason: "Service date has passed" };

    case RefundReason.ProfessionalCancelled:
      // Professional or admin can trigger this refund
      if (requesterType === "professional" || requesterType === "admin") {
        return { eligible: true };
      }
      return { eligible: false, reason: "Only professional or admin can trigger this refund" };

    case RefundReason.ServiceNotDelivered:
      // Admin can manually approve this
      if (requesterType === "admin") {
        return { eligible: true };
      }
      return { eligible: false, reason: "Requires admin approval" };

    case RefundReason.DisputeResolvedInCustomerFavor:
      // Admin resolves disputes
      if (requesterType === "admin" && booking.dispute_open) {
        return { eligible: true };
      }
      return { eligible: false, reason: "No active dispute or not an admin" };

    default:
      return { eligible: false, reason: "Unknown refund reason" };
  }
}

/**
 * Processes a refund
 * 
 * REFUND ACTION:
 * • Trigger Stripe refund on the payment_intent
 * • payment.status = "Refunded"
 * • booking.status = "Cancelled"
 */
export async function processRefund(
  booking: BookingPaymentData,
  payment: Payment,
  refundRequest: RefundRequest
): Promise<{
  success: boolean;
  booking?: BookingPaymentData;
  payment?: Payment;
  error?: string;
}> {
  // Check if payment is in paid status
  if (payment.status !== PaymentStatus.Paid) {
    return {
      success: false,
      error: `Cannot refund payment with status: ${payment.status}`
    };
  }

  // Check if payment intent exists
  if (!payment.payment_intent_id) {
    return {
      success: false,
      error: "Payment intent ID is missing"
    };
  }

  try {
    // In production, trigger Stripe refund
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const refund = await stripe.refunds.create({
    //   payment_intent: payment.payment_intent_id,
    // });

    // Update payment record
    const updatedPayment: Payment = {
      ...payment,
      status: PaymentStatus.Refunded,
      refunded_at: new Date(),
      refund_reason: refundRequest.reason,
      updated_at: new Date()
    };

    // Update booking record
    const updatedBooking: BookingPaymentData = {
      ...booking,
      payment_status: PaymentStatus.Refunded,
      booking_status: BookingStatus.Cancelled,
      payout_status: PayoutStatus.OnHold, // Prevent payout
      updated_at: new Date()
    };

    return {
      success: true,
      booking: updatedBooking,
      payment: updatedPayment
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Refund failed"
    };
  }
}

/**
 * Creates a refund request
 */
export function createRefundRequest(
  bookingId: string,
  paymentId: string,
  requesterId: string,
  requesterType: "customer" | "admin" | "professional",
  reason: RefundReason,
  amount: number,
  customReason?: string
): RefundRequest {
  return {
    refund_id: `ref_${generateId()}`,
    booking_id: bookingId,
    payment_id: paymentId,
    requester_id: requesterId,
    requester_type: requesterType,
    reason,
    custom_reason: customReason,
    amount,
    status: "Pending",
    created_at: new Date()
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
