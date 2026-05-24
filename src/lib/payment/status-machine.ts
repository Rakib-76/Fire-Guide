/**
 * FIRE GUIDE PAYMENT SYSTEM - STATUS STATE MACHINE
 * Manages state transitions for payments, payouts, and bookings
 */

import { 
  PaymentStatus, 
  PayoutStatus, 
  BookingStatus,
  BookingPaymentData 
} from "./types";

// ============================================
// SECTION 6 — PAYMENT STATUS MACHINE
// ============================================

/**
 * payment.status possible states:
 * • Pending
 * • Paid
 * • Failed
 * • Refunded
 */

export const PAYMENT_STATUS_TRANSITIONS: Record<
  PaymentStatus,
  PaymentStatus[]
> = {
  [PaymentStatus.Pending]: [PaymentStatus.Paid, PaymentStatus.Failed],
  [PaymentStatus.Paid]: [PaymentStatus.Refunded],
  [PaymentStatus.Failed]: [PaymentStatus.Pending], // Can retry
  [PaymentStatus.Refunded]: [] // Terminal state
};

/**
 * Validates if a payment status transition is allowed
 */
export function canTransitionPaymentStatus(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): boolean {
  const allowedTransitions = PAYMENT_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Transitions payment status with validation
 */
export function transitionPaymentStatus(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): { success: boolean; status?: PaymentStatus; error?: string } {
  if (currentStatus === newStatus) {
    return { success: true, status: currentStatus };
  }

  if (!canTransitionPaymentStatus(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}`
    };
  }

  return { success: true, status: newStatus };
}

// ============================================
// PAYOUT STATUS MACHINE
// ============================================

/**
 * payout.status states:
 * • Pending
 * • Eligible
 * • Released
 * • Failed
 * • On Hold
 */

export const PAYOUT_STATUS_TRANSITIONS: Record<
  PayoutStatus,
  PayoutStatus[]
> = {
  [PayoutStatus.Pending]: [PayoutStatus.Eligible, PayoutStatus.OnHold],
  [PayoutStatus.Eligible]: [PayoutStatus.Released, PayoutStatus.Failed, PayoutStatus.OnHold],
  [PayoutStatus.Released]: [], // Terminal state
  [PayoutStatus.Failed]: [PayoutStatus.Eligible], // Can retry
  [PayoutStatus.OnHold]: [PayoutStatus.Pending, PayoutStatus.Eligible]
};

/**
 * Validates if a payout status transition is allowed
 */
export function canTransitionPayoutStatus(
  currentStatus: PayoutStatus,
  newStatus: PayoutStatus
): boolean {
  const allowedTransitions = PAYOUT_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Transitions payout status with validation
 */
export function transitionPayoutStatus(
  currentStatus: PayoutStatus,
  newStatus: PayoutStatus
): { success: boolean; status?: PayoutStatus; error?: string } {
  if (currentStatus === newStatus) {
    return { success: true, status: currentStatus };
  }

  if (!canTransitionPayoutStatus(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}`
    };
  }

  return { success: true, status: newStatus };
}

// ============================================
// BOOKING STATUS MACHINE
// ============================================

/**
 * booking.status relationships:
 * • Paid → Booked
 * • Completed → Payout Eligible
 * • Cancelled → Refunded
 * • Disputed → Payout On Hold
 */

export const BOOKING_STATUS_TRANSITIONS: Record<
  BookingStatus,
  BookingStatus[]
> = {
  [BookingStatus.Pending]: [BookingStatus.Booked, BookingStatus.Cancelled],
  [BookingStatus.Booked]: [BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.Disputed],
  [BookingStatus.Completed]: [BookingStatus.Disputed], // Disputes can open after completion
  [BookingStatus.Cancelled]: [], // Terminal state
  [BookingStatus.Disputed]: [BookingStatus.Completed, BookingStatus.Cancelled]
};

/**
 * Validates if a booking status transition is allowed
 */
export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): boolean {
  const allowedTransitions = BOOKING_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Transitions booking status with validation
 */
export function transitionBookingStatus(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): { success: boolean; status?: BookingStatus; error?: string } {
  if (currentStatus === newStatus) {
    return { success: true, status: currentStatus };
  }

  if (!canTransitionBookingStatus(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${currentStatus} → ${newStatus}`
    };
  }

  return { success: true, status: newStatus };
}

// ============================================
// COMBINED STATUS UPDATES
// ============================================

/**
 * Updates booking with cascading status changes
 * 
 * booking.status relationships:
 * • Paid → Booked
 * • Completed → Payout Eligible
 * • Cancelled → Refunded
 * • Disputed → Payout On Hold
 */
export function updateBookingWithStatusCascade(
  booking: BookingPaymentData,
  updates: {
    paymentStatus?: PaymentStatus;
    payoutStatus?: PayoutStatus;
    bookingStatus?: BookingStatus;
  }
): { 
  success: boolean; 
  booking?: BookingPaymentData; 
  errors: string[] 
} {
  const errors: string[] = [];
  let updatedBooking = { ...booking };

  // Validate and apply payment status change
  if (updates.paymentStatus) {
    const transition = transitionPaymentStatus(
      booking.payment_status,
      updates.paymentStatus
    );
    
    if (transition.success && transition.status) {
      updatedBooking.payment_status = transition.status;
      
      // Cascade: Paid → Booked
      if (transition.status === PaymentStatus.Paid) {
        const bookingTransition = transitionBookingStatus(
          updatedBooking.booking_status,
          BookingStatus.Booked
        );
        if (bookingTransition.success && bookingTransition.status) {
          updatedBooking.booking_status = bookingTransition.status;
        }
      }
      
      // Cascade: Refunded → Cancelled
      if (transition.status === PaymentStatus.Refunded) {
        const bookingTransition = transitionBookingStatus(
          updatedBooking.booking_status,
          BookingStatus.Cancelled
        );
        if (bookingTransition.success && bookingTransition.status) {
          updatedBooking.booking_status = bookingTransition.status;
        }
        updatedBooking.payout_status = PayoutStatus.OnHold;
      }
    } else {
      errors.push(transition.error || "Payment status transition failed");
    }
  }

  // Validate and apply payout status change
  if (updates.payoutStatus) {
    const transition = transitionPayoutStatus(
      booking.payout_status,
      updates.payoutStatus
    );
    
    if (transition.success && transition.status) {
      updatedBooking.payout_status = transition.status;
    } else {
      errors.push(transition.error || "Payout status transition failed");
    }
  }

  // Validate and apply booking status change
  if (updates.bookingStatus) {
    const transition = transitionBookingStatus(
      booking.booking_status,
      updates.bookingStatus
    );
    
    if (transition.success && transition.status) {
      updatedBooking.booking_status = transition.status;
      
      // Cascade: Completed → Payout Eligible
      if (transition.status === BookingStatus.Completed) {
        updatedBooking.payout_status = PayoutStatus.Eligible;
      }
      
      // Cascade: Disputed → Payout On Hold
      if (transition.status === BookingStatus.Disputed) {
        updatedBooking.payout_status = PayoutStatus.OnHold;
        updatedBooking.dispute_open = true;
      }
      
      // Cascade: Cancelled → Payout On Hold
      if (transition.status === BookingStatus.Cancelled) {
        updatedBooking.payout_status = PayoutStatus.OnHold;
      }
    } else {
      errors.push(transition.error || "Booking status transition failed");
    }
  }

  updatedBooking.updated_at = new Date();

  return {
    success: errors.length === 0,
    booking: errors.length === 0 ? updatedBooking : undefined,
    errors
  };
}

// ============================================
// STATUS HISTORY TRACKING
// ============================================

export interface StatusHistoryEntry {
  timestamp: Date;
  previousStatus: string;
  newStatus: string;
  statusType: "payment" | "payout" | "booking";
  changedBy?: string; // user_id or "system"
  reason?: string;
}

/**
 * Creates a status history entry
 */
export function createStatusHistoryEntry(
  previousStatus: string,
  newStatus: string,
  statusType: "payment" | "payout" | "booking",
  changedBy?: string,
  reason?: string
): StatusHistoryEntry {
  return {
    timestamp: new Date(),
    previousStatus,
    newStatus,
    statusType,
    changedBy,
    reason
  };
}

// ============================================
// STATUS VALIDATION HELPERS
// ============================================

/**
 * Checks if a booking is in a terminal state
 */
export function isTerminalState(booking: BookingPaymentData): boolean {
  return (
    booking.booking_status === BookingStatus.Cancelled ||
    (booking.booking_status === BookingStatus.Completed && 
     booking.payout_status === PayoutStatus.Released)
  );
}

/**
 * Checks if a booking can be modified
 */
export function canModifyBooking(booking: BookingPaymentData): boolean {
  return !isTerminalState(booking);
}

/**
 * Gets the current workflow stage
 */
export function getWorkflowStage(booking: BookingPaymentData): string {
  if (booking.payment_status === PaymentStatus.Pending) {
    return "Awaiting Payment";
  }
  
  if (booking.payment_status === PaymentStatus.Paid && 
      booking.booking_status === BookingStatus.Booked) {
    return "Service Scheduled";
  }
  
  if (booking.booking_status === BookingStatus.Completed && 
      booking.payout_status === PayoutStatus.Eligible) {
    return "Awaiting Payout";
  }
  
  if (booking.payout_status === PayoutStatus.Released) {
    return "Completed";
  }
  
  if (booking.booking_status === BookingStatus.Cancelled) {
    return "Cancelled";
  }
  
  if (booking.booking_status === BookingStatus.Disputed) {
    return "In Dispute";
  }
  
  return "Unknown";
}
