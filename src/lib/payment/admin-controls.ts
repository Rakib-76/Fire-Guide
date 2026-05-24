/**
 * FIRE GUIDE PAYMENT SYSTEM - ADMIN PAYMENT CONTROLS
 * Handles all admin-level payment and payout operations
 */

import {
  BookingPaymentData,
  Payment,
  Payout,
  CommissionConfig,
  RefundRequest,
  RefundReason,
  BookingStatus,
  PaymentStatus,
  PayoutStatus,
  ServiceType
} from "./types";

// ============================================
// SECTION 4 — ADMIN PAYMENT CONTROLS
// ============================================

/**
 * ADMINS CAN:
 * • View and edit commission%
 * • Freeze or unfreeze payouts for any professional
 * • View all payments and payouts
 * • Trigger manual refunds
 * • Trigger manual payouts
 * • Override booking status
 * • Approve or deny refund requests
 */

// ============================================
// COMMISSION MANAGEMENT
// ============================================

/**
 * Updates commission percentage for a service type
 * 
 * ADMIN LOGIC RULE 1:
 * If admin changes commission percent:
 * - Only apply to NEW bookings
 */
export function updateCommissionPercent(
  serviceType: ServiceType,
  newCommissionPercent: number,
  adminId: string
): CommissionConfig {
  // Validate commission percent
  if (newCommissionPercent < 0 || newCommissionPercent > 1) {
    throw new Error("Commission percent must be between 0 and 1 (0% to 100%)");
  }

  const config: CommissionConfig = {
    config_id: `comm_${generateId()}`,
    service_type: serviceType,
    commission_percent: newCommissionPercent,
    effective_from: new Date(),
    created_by: adminId,
    created_at: new Date()
  };

  return config;
}

/**
 * Gets the current commission rate for a service type
 */
export function getCurrentCommissionRate(
  serviceType: ServiceType,
  commissionConfigs: CommissionConfig[]
): number {
  // Get the most recent config for this service type
  const configs = commissionConfigs
    .filter(c => c.service_type === serviceType)
    .sort((a, b) => b.effective_from.getTime() - a.effective_from.getTime());

  if (configs.length > 0) {
    return configs[0].commission_percent;
  }

  // Default commission rates by service type
  const defaultRates: Record<ServiceType, number> = {
    [ServiceType.FRA]: 0.15, // 15%
    [ServiceType.Alarm]: 0.15,
    [ServiceType.Extinguisher]: 0.15,
    [ServiceType.EmergencyLighting]: 0.15,
    [ServiceType.Training]: 0.20, // 20%
    [ServiceType.CustomQuote]: 0.15
  };

  return defaultRates[serviceType] || 0.15;
}

// ============================================
// PAYOUT CONTROLS
// ============================================

/**
 * Freezes payout for a professional
 */
export function freezePayout(
  booking: BookingPaymentData,
  reason: string,
  adminId: string
): BookingPaymentData {
  return {
    ...booking,
    payout_hold: true,
    payout_hold_reason: reason,
    payout_status: PayoutStatus.OnHold,
    updated_at: new Date()
  };
}

/**
 * Unfreezes payout for a professional
 */
export function unfreezePayout(
  booking: BookingPaymentData,
  adminId: string
): BookingPaymentData {
  return {
    ...booking,
    payout_hold: false,
    payout_hold_reason: undefined,
    payout_status: PayoutStatus.Pending,
    updated_at: new Date()
  };
}

/**
 * Checks if payout should be blocked
 * 
 * ADMIN LOGIC RULE 3:
 * Admin can block payout if:
 * - Professional has compliance issues
 * - Dispute opened
 * - Missing report
 */
export function shouldBlockPayout(
  booking: BookingPaymentData,
  professionalComplianceIssues: boolean
): { shouldBlock: boolean; reason?: string } {
  // Check for dispute
  if (booking.dispute_open) {
    return { shouldBlock: true, reason: "Dispute is open" };
  }

  // Check for payout hold
  if (booking.payout_hold) {
    return { shouldBlock: true, reason: booking.payout_hold_reason || "Payout on hold" };
  }

  // Check for compliance issues
  if (professionalComplianceIssues) {
    return { shouldBlock: true, reason: "Professional has compliance issues" };
  }

  // Check for missing deliverables
  const requiredDeliverables: Record<ServiceType, string> = {
    [ServiceType.FRA]: "FRA report",
    [ServiceType.Alarm]: "alarm certificate",
    [ServiceType.Extinguisher]: "extinguisher report",
    [ServiceType.EmergencyLighting]: "EL certificate",
    [ServiceType.Training]: "attendance sheet",
    [ServiceType.CustomQuote]: "FRA report"
  };

  const required = requiredDeliverables[booking.service_type];
  const uploaded = booking.deliverables.some(d => d.type === required && d.uploaded);

  if (!uploaded) {
    return { shouldBlock: true, reason: `Missing report: ${required}` };
  }

  return { shouldBlock: false };
}

// ============================================
// BOOKING STATUS OVERRIDE
// ============================================

/**
 * Allows admin to override booking status
 * 
 * ADMIN LOGIC RULE 2:
 * Admin can set booking.status to:
 * - Pending
 * - Booked
 * - Completed
 * - Cancelled
 * - Disputed
 */
export function overrideBookingStatus(
  booking: BookingPaymentData,
  newStatus: BookingStatus,
  adminId: string,
  reason?: string
): BookingPaymentData {
  const validStatuses = [
    BookingStatus.Pending,
    BookingStatus.Booked,
    BookingStatus.Completed,
    BookingStatus.Cancelled,
    BookingStatus.Disputed
  ];

  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid booking status: ${newStatus}`);
  }

  // Auto-update related fields based on status
  let updatedBooking = { ...booking, booking_status: newStatus };

  if (newStatus === BookingStatus.Disputed) {
    updatedBooking.dispute_open = true;
    updatedBooking.payout_status = PayoutStatus.OnHold;
  }

  if (newStatus === BookingStatus.Completed) {
    updatedBooking.dispute_open = false;
  }

  if (newStatus === BookingStatus.Cancelled) {
    updatedBooking.payout_status = PayoutStatus.OnHold;
  }

  updatedBooking.updated_at = new Date();

  return updatedBooking;
}

// ============================================
// MANUAL REFUND
// ============================================

/**
 * Admin triggers manual refund
 * 
 * ADMIN REFUND ACTION:
 * • If admin approves refund:
 *   - Trigger Stripe refund
 *   - Set payment.status = "Refunded"
 *   - Set booking.status = "Cancelled"
 */
export async function adminApproveRefund(
  booking: BookingPaymentData,
  payment: Payment,
  refundRequest: RefundRequest,
  adminId: string
): Promise<{
  success: boolean;
  booking?: BookingPaymentData;
  payment?: Payment;
  refundRequest?: RefundRequest;
  error?: string;
}> {
  // Validate payment status
  if (payment.status !== PaymentStatus.Paid) {
    return {
      success: false,
      error: `Cannot refund payment with status: ${payment.status}`
    };
  }

  // Validate payment intent
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

    // Update payment
    const updatedPayment: Payment = {
      ...payment,
      status: PaymentStatus.Refunded,
      refunded_at: new Date(),
      refund_reason: refundRequest.reason,
      updated_at: new Date()
    };

    // Update booking
    const updatedBooking: BookingPaymentData = {
      ...booking,
      payment_status: PaymentStatus.Refunded,
      booking_status: BookingStatus.Cancelled,
      payout_status: PayoutStatus.OnHold,
      updated_at: new Date()
    };

    // Update refund request
    const updatedRefundRequest: RefundRequest = {
      ...refundRequest,
      status: "Approved",
      approved_by: adminId,
      processed_at: new Date()
    };

    return {
      success: true,
      booking: updatedBooking,
      payment: updatedPayment,
      refundRequest: updatedRefundRequest
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Refund failed"
    };
  }
}

/**
 * Admin denies refund request
 */
export function adminDenyRefund(
  refundRequest: RefundRequest,
  adminId: string,
  reason: string
): RefundRequest {
  return {
    ...refundRequest,
    status: "Denied",
    approved_by: adminId,
    custom_reason: reason,
    processed_at: new Date()
  };
}

// ============================================
// MANUAL PAYOUT
// ============================================

/**
 * Admin forces manual payout
 * 
 * ADMIN MANUAL PAYOUT:
 * • If admin forces payout:
 *   - Create Stripe Transfer
 *   - payout.status = "Released"
 */
export async function adminForcePayout(
  booking: BookingPaymentData,
  professionalStripeAccountId: string,
  adminId: string,
  reason: string
): Promise<{
  success: boolean;
  payout?: Payout;
  booking?: BookingPaymentData;
  error?: string;
}> {
  try {
    // In production, create Stripe Transfer
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const transfer = await stripe.transfers.create({
    //   amount: Math.round(booking.pro_earnings * 100),
    //   currency: 'gbp',
    //   destination: professionalStripeAccountId,
    //   transfer_group: booking.booking_id,
    //   metadata: {
    //     booking_id: booking.booking_id,
    //     forced_by_admin: adminId,
    //     reason: reason
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
      on_hold_reason: `Manual payout by admin: ${reason}`,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Update booking
    const updatedBooking: BookingPaymentData = {
      ...booking,
      payout_transfer_id: transferId,
      payout_status: PayoutStatus.Released,
      updated_at: new Date()
    };

    return {
      success: true,
      payout,
      booking: updatedBooking
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Manual payout failed"
    };
  }
}

// ============================================
// VIEW OPERATIONS
// ============================================

/**
 * Get all payments with filters
 */
export function getAllPayments(
  payments: Payment[],
  filters?: {
    status?: PaymentStatus;
    customerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Payment[] {
  let filtered = [...payments];

  if (filters?.status) {
    filtered = filtered.filter(p => p.status === filters.status);
  }

  if (filters?.customerId) {
    filtered = filtered.filter(p => p.customer_id === filters.customerId);
  }

  if (filters?.dateFrom) {
    filtered = filtered.filter(p => p.created_at >= filters.dateFrom!);
  }

  if (filters?.dateTo) {
    filtered = filtered.filter(p => p.created_at <= filters.dateTo!);
  }

  return filtered;
}

/**
 * Get all payouts with filters
 */
export function getAllPayouts(
  payouts: Payout[],
  filters?: {
    status?: PayoutStatus;
    professionalId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Payout[] {
  let filtered = [...payouts];

  if (filters?.status) {
    filtered = filtered.filter(p => p.status === filters.status);
  }

  if (filters?.professionalId) {
    filtered = filtered.filter(p => p.professional_id === filters.professionalId);
  }

  if (filters?.dateFrom) {
    filtered = filtered.filter(p => p.created_at >= filters.dateFrom!);
  }

  if (filters?.dateTo) {
    filtered = filtered.filter(p => p.created_at <= filters.dateTo!);
  }

  return filtered;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
