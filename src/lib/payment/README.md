# Fire Guide Payment System

## Overview

This payment system integrates into the existing Fire Guide booking engine, pricing engine, and user roles. It provides complete payment processing logic for Customers, Professionals, and Admins without modifying any UI or existing flows.

---

## Architecture

```
/lib/payment/
├── types.ts                 # Type definitions and interfaces
├── payment-logic.ts         # Customer payment processing
├── payout-logic.ts          # Professional payout processing
├── admin-controls.ts        # Admin payment controls
├── pricing-calculator.ts    # Service-level pricing calculations
├── status-machine.ts        # Payment/payout status state machine
├── index.ts                 # Main export file
└── README.md                # This file
```

---

## Section 1: Universal Payment Rules

### Core Principles

- **All services generate a `final_price` before checkout**
- **Customers ALWAYS pay upfront via Stripe Checkout**
- **Professionals NEVER receive payment directly from customers**
- **Fire Guide holds customer funds until job completion**
- **Commission is always deducted automatically**

### Formula

```typescript
commission_amount = final_price * commission_percent
pro_earnings = final_price - commission_amount
```

### Data Storage

All values are stored inside the booking record:

```typescript
interface BookingPaymentData {
  booking_id: string;
  customer_id: string;
  professional_id: string;
  service_type: ServiceType;
  final_price: number;
  commission_amount: number;
  pro_earnings: number;
  commission_percent: number;
  payment_intent_id?: string;
  payout_transfer_id?: string;
  payment_status: PaymentStatus;
  payout_status: PayoutStatus;
  booking_status: BookingStatus;
  // ... additional fields
}
```

---

## Section 2: Customer Payment Logic

### Trigger

Customer clicks "Book & Pay"

### Conditions Checked

1. ✅ `final_price` must exist and be validated server-side
2. ✅ Property + service details must be complete
3. ✅ Professional must be available for selected date
4. ✅ Customer must be logged in

### Usage Example

```typescript
import { validatePaymentConditions, createStripeCheckoutSession, handlePaymentSuccess } from '@/lib/payment';

// Step 1: Validate conditions
const validation = validatePaymentConditions(
  booking,
  customerLoggedIn,
  professionalAvailable
);

if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
  return;
}

// Step 2: Create Stripe Checkout Session
const session = await createStripeCheckoutSession(
  booking,
  "/booking/success",
  "/booking/cancel"
);

// Redirect user to Stripe Checkout
// window.location.href = session.checkout_url;

// Step 3: Handle successful payment (webhook/callback)
const { booking: updatedBooking, payment } = handlePaymentSuccess(
  booking,
  paymentIntentId
);

// Result:
// - booking.status = "Booked"
// - payment.status = "Paid"
// - commission_amount and pro_earnings stored
```

### Payment Failure Handling

```typescript
import { handlePaymentFailure } from '@/lib/payment';

const result = handlePaymentFailure(bookingId, "Card declined");
// Result: booking is not created, show message "Payment failed"
```

### Refund Conditions

| Condition | Refund Type |
|-----------|-------------|
| Customer cancels BEFORE service date | Full refund |
| Professional cancels | Full refund |
| Service cannot be delivered | Full refund |
| Dispute resolved in customer favor | Full refund |

### Refund Processing

```typescript
import { checkRefundEligibility, createRefundRequest, processRefund } from '@/lib/payment';

// Step 1: Check eligibility
const eligibility = checkRefundEligibility(
  booking,
  RefundReason.CustomerCancelledBeforeService,
  customerId,
  "customer"
);

if (!eligibility.eligible) {
  console.error("Refund not eligible:", eligibility.reason);
  return;
}

// Step 2: Create refund request
const refundRequest = createRefundRequest(
  booking.booking_id,
  payment.payment_id,
  customerId,
  "customer",
  RefundReason.CustomerCancelledBeforeService,
  booking.final_price
);

// Step 3: Process refund
const result = await processRefund(booking, payment, refundRequest);

if (result.success) {
  // Result:
  // - Stripe refund triggered on payment_intent
  // - payment.status = "Refunded"
  // - booking.status = "Cancelled"
}
```

---

## Section 3: Professional Payout Logic

### Payout Conditions

A payout becomes eligible ONLY when ALL are true:

1. ✅ `booking.status = "Completed"`
2. ✅ **Deliverables uploaded** (service-specific):
   - FRA → FRA report
   - Alarm → alarm certificate
   - Extinguishers → extinguisher report
   - Emergency Lighting → EL certificate
   - Training → attendance sheet
3. ✅ No dispute is open
4. ✅ Admin has not placed a payout hold

### Usage Example

```typescript
import { checkPayoutEligibility, createPayout, addDeliverable } from '@/lib/payment';

// Step 1: Upload deliverable
const updatedBooking = addDeliverable(
  booking,
  "FRA report",
  "https://storage.example.com/fra-report.pdf",
  "fra-report.pdf"
);

// Step 2: Mark booking as completed
updatedBooking.booking_status = BookingStatus.Completed;

// Step 3: Check payout eligibility
const eligibility = checkPayoutEligibility(updatedBooking);

if (!eligibility.eligible) {
  console.log("Payout not eligible:", eligibility.reasons);
  console.log("Missing deliverables:", eligibility.missing_deliverables);
  return;
}

// Step 4: Create payout (triggers Stripe Transfer)
const result = await createPayout(
  updatedBooking,
  professionalStripeAccountId
);

if (result.success && result.payout) {
  // Result:
  // - Stripe Transfer created
  // - payout.status = "Released"
  // - transfer_id saved in payout record
  console.log("Payout released:", result.payout.payout_transfer_id);
} else {
  // IF TRANSFER FAILS:
  // - payout.status = "Failed"
  // - Admin alert: "Manual payout required"
  console.error("Payout failed:", result.error);
}
```

---

## Section 4: Admin Payment Controls

### Admin Capabilities

Admins can:

- ✅ View and edit commission%
- ✅ Freeze or unfreeze payouts for any professional
- ✅ View all payments and payouts
- ✅ Trigger manual refunds
- ✅ Trigger manual payouts
- ✅ Override booking status
- ✅ Approve or deny refund requests

### Commission Management

```typescript
import { updateCommissionPercent, getCurrentCommissionRate } from '@/lib/payment';

// Update commission (applies to NEW bookings only)
const config = updateCommissionPercent(
  ServiceType.FRA,
  0.18, // 18%
  adminId
);

// Get current rate
const currentRate = getCurrentCommissionRate(ServiceType.FRA, commissionConfigs);
console.log(`Current commission: ${currentRate * 100}%`);
```

### Payout Freeze/Unfreeze

```typescript
import { freezePayout, unfreezePayout } from '@/lib/payment';

// Freeze payout
const frozenBooking = freezePayout(
  booking,
  "Professional has compliance issues",
  adminId
);
// Result: payout.status = "On Hold"

// Unfreeze payout
const unfrozenBooking = unfreezePayout(booking, adminId);
// Result: payout.status = "Pending"
```

### Booking Status Override

```typescript
import { overrideBookingStatus } from '@/lib/payment';

// Admin can set status to: Pending, Booked, Completed, Cancelled, Disputed
const updatedBooking = overrideBookingStatus(
  booking,
  BookingStatus.Completed,
  adminId,
  "Service verified as complete"
);
```

### Manual Refund

```typescript
import { adminApproveRefund } from '@/lib/payment';

const result = await adminApproveRefund(
  booking,
  payment,
  refundRequest,
  adminId
);

if (result.success) {
  // Result:
  // - Stripe refund triggered
  // - payment.status = "Refunded"
  // - booking.status = "Cancelled"
}
```

### Manual Payout

```typescript
import { adminForcePayout } from '@/lib/payment';

const result = await adminForcePayout(
  booking,
  professionalStripeAccountId,
  adminId,
  "Emergency payout requested by professional"
);

if (result.success) {
  // Result:
  // - Stripe Transfer created
  // - payout.status = "Released"
}
```

---

## Section 5: Service-Level Payment Rules

### FRA Payment

```typescript
import { calculateFRAPrice } from '@/lib/payment';

const pricing = calculateFRAPrice({
  basePrice: 250,
  propertySize: 'medium', // small | medium | large | xlarge
  riskLevel: 'high'       // low | medium | high
});

console.log(pricing.finalPrice);      // 425
console.log(pricing.breakdown);       // { basePrice: 250, sizeAddon: 100, riskAddon: 75 }
```

**Formula:** `final_price = fra_base_price + size_addon + risk_addon`

### Alarm Payment

```typescript
import { calculateAlarmPrice } from '@/lib/payment';

const pricing = calculateAlarmPrice({
  basePrice: 200,
  isAddressable: true,
  isOverdue: true
});

console.log(pricing.finalPrice);      // 350
console.log(pricing.breakdown);       // { basePrice: 200, addressableAddon: 100, overdueAddon: 50 }
```

**Formula:** `final_price = alarm_base_price + addressable_addon + overdue_addon`

### Extinguisher Payment

```typescript
import { calculateExtinguisherPrice } from '@/lib/payment';

const pricing = calculateExtinguisherPrice({
  basePrice: 150,
  numberOfUnits: 10
});

console.log(pricing.finalPrice);      // 150 (MVP simple model)
```

**Formula:** `final_price = extinguisher_base_price`

### Emergency Lighting Payment

```typescript
import { calculateEmergencyLightingPrice } from '@/lib/payment';

const pricing = calculateEmergencyLightingPrice({
  basePrice: 180
});

console.log(pricing.finalPrice);      // 180
```

**Formula:** `final_price = el_base_price`

### Training Payment

```typescript
import { calculateTrainingPrice } from '@/lib/payment';

const pricing = calculateTrainingPrice({
  numberOfAttendees: 8
});

console.log(pricing.finalPrice);      // 500 (6-10 people band)
console.log(pricing.breakdown);       // { bandPrice: 500, attendees: 8, pricePerPerson: 62.5 }
```

**Formula:** `final_price = training_band_price` (based on attendee count)

### Custom Quote Payment

```typescript
import { calculateCustomQuotePrice } from '@/lib/payment';

const pricing = calculateCustomQuotePrice({
  adminManualPrice: 999,
  description: "Custom fire safety audit"
});

console.log(pricing.finalPrice);      // 999
```

**Formula:** `final_price = admin_manual_price`

### Universal Calculator

```typescript
import { calculateServicePrice } from '@/lib/payment';

const pricing = calculateServicePrice({
  serviceType: ServiceType.FRA,
  input: {
    basePrice: 250,
    propertySize: 'large',
    riskLevel: 'medium'
  }
});
```

---

## Section 6: Payment Status Machine

### Payment Status States

```typescript
enum PaymentStatus {
  Pending = "Pending",
  Paid = "Paid",
  Failed = "Failed",
  Refunded = "Refunded"
}
```

**State Transitions:**

```
Pending → [Paid, Failed]
Paid → [Refunded]
Failed → [Pending] (retry)
Refunded → [] (terminal)
```

### Payout Status States

```typescript
enum PayoutStatus {
  Pending = "Pending",
  Eligible = "Eligible",
  Released = "Released",
  Failed = "Failed",
  OnHold = "On Hold"
}
```

**State Transitions:**

```
Pending → [Eligible, On Hold]
Eligible → [Released, Failed, On Hold]
Released → [] (terminal)
Failed → [Eligible] (retry)
On Hold → [Pending, Eligible]
```

### Booking Status Relationships

```typescript
// Paid → Booked
// Completed → Payout Eligible
// Cancelled → Refunded
// Disputed → Payout On Hold
```

### Usage Example

```typescript
import { updateBookingWithStatusCascade, getWorkflowStage } from '@/lib/payment';

// Update with cascading status changes
const result = updateBookingWithStatusCascade(booking, {
  paymentStatus: PaymentStatus.Paid
});

if (result.success && result.booking) {
  // Result:
  // - payment.status = "Paid"
  // - booking.status = "Booked" (auto-cascaded)
  console.log("Booking updated:", result.booking);
}

// Get workflow stage
const stage = getWorkflowStage(booking);
console.log(`Current stage: ${stage}`); // "Service Scheduled"
```

---

## Section 7: Required Data Fields

### Booking Record Fields

```typescript
{
  // Identifiers
  booking_id: string;
  customer_id: string;
  professional_id: string;
  
  // Service details
  service_type: ServiceType;
  service_date: Date;
  
  // Payment data
  final_price: number;
  commission_amount: number;
  pro_earnings: number;
  commission_percent: number;
  
  // Stripe references
  payment_intent_id?: string;
  payout_transfer_id?: string;
  
  // Status tracking
  payment_status: PaymentStatus;
  payout_status: PayoutStatus;
  booking_status: BookingStatus;
  
  // Deliverables
  deliverables: Deliverable[];
  
  // Flags
  dispute_open: boolean;
  payout_hold: boolean;
  payout_hold_reason?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

---

## Integration Guide

### Step 1: Import Payment System

```typescript
import { 
  validatePaymentConditions,
  createStripeCheckoutSession,
  handlePaymentSuccess,
  checkPayoutEligibility,
  createPayout,
  calculateServicePrice,
  updateBookingWithStatusCascade
} from '@/lib/payment';
```

### Step 2: Customer Books Service

```typescript
// 1. Calculate price
const pricing = calculateServicePrice({
  serviceType: ServiceType.FRA,
  input: { basePrice: 250, propertySize: 'medium', riskLevel: 'low' }
});

// 2. Validate payment
const validation = validatePaymentConditions(booking, true, true);
if (!validation.valid) return;

// 3. Create checkout session
const session = await createStripeCheckoutSession(booking, successUrl, cancelUrl);

// 4. Redirect to Stripe
// window.location.href = session.checkout_url;
```

### Step 3: Handle Payment Success (Webhook)

```typescript
// Stripe webhook endpoint
const { booking: updatedBooking, payment } = handlePaymentSuccess(
  booking,
  stripePaymentIntentId
);

// Save to database
// await db.bookings.update(updatedBooking);
// await db.payments.insert(payment);
```

### Step 4: Professional Completes Service

```typescript
// 1. Upload deliverable
const bookingWithDeliverable = addDeliverable(
  booking,
  "FRA report",
  fileUrl,
  fileName
);

// 2. Mark as completed
const result = updateBookingWithStatusCascade(bookingWithDeliverable, {
  bookingStatus: BookingStatus.Completed
});

// Result: payout.status automatically becomes "Eligible"
```

### Step 5: Process Payout

```typescript
// Check eligibility
const eligibility = checkPayoutEligibility(booking);

if (eligibility.eligible) {
  // Create payout
  const result = await createPayout(booking, professionalStripeAccountId);
  
  if (result.success) {
    // Payout released!
  }
}
```

---

## Error Handling

### Payment Validation Errors

```typescript
const validation = validatePaymentConditions(booking, true, true);

if (!validation.valid) {
  validation.errors.forEach(error => {
    console.error("Payment error:", error);
    // Show error to user
  });
}
```

### Payout Eligibility Errors

```typescript
const eligibility = checkPayoutEligibility(booking);

if (!eligibility.eligible) {
  eligibility.reasons.forEach(reason => {
    console.log("Payout blocked:", reason);
  });
  
  if (eligibility.missing_deliverables) {
    console.log("Missing:", eligibility.missing_deliverables);
  }
}
```

### Status Transition Errors

```typescript
const result = updateBookingWithStatusCascade(booking, {
  bookingStatus: BookingStatus.Completed
});

if (!result.success) {
  result.errors.forEach(error => {
    console.error("Status error:", error);
  });
}
```

---

## Testing

### Mock Payment Success

```typescript
const mockBooking: BookingPaymentData = {
  booking_id: "book_123",
  customer_id: "cust_456",
  professional_id: "pro_789",
  service_type: ServiceType.FRA,
  final_price: 350,
  commission_percent: 0.15,
  // ...
};

const { booking, payment } = handlePaymentSuccess(
  mockBooking,
  "pi_mock_stripe_intent"
);

expect(payment.status).toBe(PaymentStatus.Paid);
expect(booking.booking_status).toBe(BookingStatus.Booked);
expect(booking.commission_amount).toBe(52.5);
expect(booking.pro_earnings).toBe(297.5);
```

---

## Summary

The Fire Guide Payment System provides:

✅ **Complete payment processing logic**  
✅ **Automatic commission calculation**  
✅ **Payout eligibility checking**  
✅ **Refund processing**  
✅ **Admin controls**  
✅ **Service-level pricing**  
✅ **Status state machine**  
✅ **Type-safe interfaces**  

No UI changes required — pure logic ready for integration.
