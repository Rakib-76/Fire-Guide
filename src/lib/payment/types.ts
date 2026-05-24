/**
 * FIRE GUIDE PAYMENT SYSTEM - TYPE DEFINITIONS
 * Defines all payment-related types and interfaces
 */

// ============================================
// PAYMENT STATUS ENUMS
// ============================================

export enum PaymentStatus {
  Pending = "Pending",
  Paid = "Paid",
  Failed = "Failed",
  Refunded = "Refunded"
}

export enum PayoutStatus {
  Pending = "Pending",
  Eligible = "Eligible",
  Released = "Released",
  Failed = "Failed",
  OnHold = "On Hold"
}

export enum BookingStatus {
  Pending = "Pending",
  Booked = "Booked",
  Completed = "Completed",
  Cancelled = "Cancelled",
  Disputed = "Disputed"
}

export enum ServiceType {
  FRA = "FRA",
  Alarm = "Alarm",
  Extinguisher = "Extinguisher",
  EmergencyLighting = "Emergency Lighting",
  Training = "Training",
  CustomQuote = "Custom Quote"
}

// ============================================
// DELIVERABLE TYPES
// ============================================

export type DeliverableType = {
  FRA: "FRA report";
  Alarm: "alarm certificate";
  Extinguisher: "extinguisher report";
  EmergencyLighting: "EL certificate";
  Training: "attendance sheet";
};

export interface Deliverable {
  type: DeliverableType[keyof DeliverableType];
  uploaded: boolean;
  uploadedAt?: Date;
  fileUrl?: string;
  fileName?: string;
}

// ============================================
// PAYMENT RECORD
// ============================================

export interface Payment {
  payment_id: string;
  booking_id: string;
  customer_id: string;
  amount: number; // final_price
  commission_amount: number;
  pro_earnings: number;
  payment_intent_id?: string; // Stripe Payment Intent ID
  status: PaymentStatus;
  created_at: Date;
  updated_at: Date;
  refunded_at?: Date;
  refund_reason?: string;
}

// ============================================
// PAYOUT RECORD
// ============================================

export interface Payout {
  payout_id: string;
  booking_id: string;
  professional_id: string;
  amount: number; // pro_earnings
  commission_deducted: number;
  original_amount: number; // final_price
  payout_transfer_id?: string; // Stripe Transfer ID
  status: PayoutStatus;
  eligible_at?: Date;
  released_at?: Date;
  failed_at?: Date;
  failure_reason?: string;
  on_hold_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// BOOKING RECORD (Extended)
// ============================================

export interface BookingPaymentData {
  booking_id: string;
  customer_id: string;
  professional_id: string;
  service_type: ServiceType;
  final_price: number;
  commission_amount: number;
  pro_earnings: number;
  commission_percent: number; // e.g., 0.15 for 15%
  payment_intent_id?: string;
  payout_transfer_id?: string;
  payment_status: PaymentStatus;
  payout_status: PayoutStatus;
  booking_status: BookingStatus;
  deliverables: Deliverable[];
  dispute_open: boolean;
  payout_hold: boolean;
  payout_hold_reason?: string;
  service_date: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// REFUND REQUEST
// ============================================

export interface RefundRequest {
  refund_id: string;
  booking_id: string;
  payment_id: string;
  requester_id: string; // customer_id or admin_id
  requester_type: "customer" | "admin" | "professional";
  reason: RefundReason;
  custom_reason?: string;
  amount: number;
  status: "Pending" | "Approved" | "Denied" | "Processed";
  approved_by?: string; // admin_id
  processed_at?: Date;
  created_at: Date;
}

export enum RefundReason {
  CustomerCancelledBeforeService = "Customer cancelled before service date",
  ProfessionalCancelled = "Professional cancelled",
  ServiceNotDelivered = "Service cannot be delivered",
  DisputeResolvedInCustomerFavor = "Dispute resolved in customer favor",
  Other = "Other"
}

// ============================================
// COMMISSION CONFIGURATION
// ============================================

export interface CommissionConfig {
  config_id: string;
  service_type: ServiceType;
  commission_percent: number; // 0.15 = 15%
  effective_from: Date;
  created_by: string; // admin_id
  created_at: Date;
}

// ============================================
// STRIPE CHECKOUT SESSION
// ============================================

export interface StripeCheckoutSession {
  session_id: string;
  booking_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  payment_intent?: string;
  status: "pending" | "complete" | "expired";
  created_at: Date;
}

// ============================================
// PAYMENT VALIDATION
// ============================================

export interface PaymentValidation {
  valid: boolean;
  errors: string[];
  final_price?: number;
  property_complete: boolean;
  service_complete: boolean;
  professional_available: boolean;
  customer_logged_in: boolean;
}

// ============================================
// PAYOUT ELIGIBILITY CHECK
// ============================================

export interface PayoutEligibility {
  eligible: boolean;
  reasons: string[];
  booking_completed: boolean;
  deliverables_uploaded: boolean;
  no_dispute_open: boolean;
  no_payout_hold: boolean;
  missing_deliverables?: string[];
}
