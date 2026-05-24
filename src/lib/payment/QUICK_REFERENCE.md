# Fire Guide Payment System - Quick Reference

## 🚀 Quick Start

```typescript
import { 
  validatePaymentConditions,
  handlePaymentSuccess,
  checkPayoutEligibility,
  calculateServicePrice 
} from '@/lib/payment';
```

---

## 📋 Common Use Cases

### 1️⃣ Process Customer Payment

```typescript
// Validate
const validation = validatePaymentConditions(booking, true, true);
if (!validation.valid) return;

// Create Stripe session
const session = await createStripeCheckoutSession(booking, successUrl, cancelUrl);

// Handle success
const { booking, payment } = handlePaymentSuccess(booking, paymentIntentId);
```

### 2️⃣ Check Payout Eligibility

```typescript
const eligibility = checkPayoutEligibility(booking);

if (eligibility.eligible) {
  const result = await createPayout(booking, stripeAccountId);
}
```

### 3️⃣ Calculate Service Price

```typescript
// FRA
const price = calculateFRAPrice({
  basePrice: 250,
  propertySize: 'medium',
  riskLevel: 'high'
});

// Alarm
const price = calculateAlarmPrice({
  basePrice: 200,
  isAddressable: true,
  isOverdue: true
});

// Training
const price = calculateTrainingPrice({
  numberOfAttendees: 8
});
```

### 4️⃣ Process Refund

```typescript
const eligibility = checkRefundEligibility(
  booking,
  RefundReason.CustomerCancelledBeforeService,
  customerId,
  "customer"
);

if (eligibility.eligible) {
  const result = await processRefund(booking, payment, refundRequest);
}
```

### 5️⃣ Admin Operations

```typescript
// Update commission
updateCommissionPercent(ServiceType.FRA, 0.18, adminId);

// Freeze payout
freezePayout(booking, "Compliance issue", adminId);

// Approve refund
adminApproveRefund(booking, payment, refundRequest, adminId);

// Force payout
adminForcePayout(booking, stripeAccountId, adminId, "Emergency payout");
```

---

## 📊 Status Flow

### Payment Flow
```
Pending → Paid → [Service Delivered] → Payout Eligible → Payout Released
                ↓
            Refunded (if cancelled)
```

### Booking Flow
```
Pending → Booked → Completed → [Payout Released]
            ↓           ↓
        Cancelled   Disputed
```

---

## 🔑 Key Formulas

```typescript
// Commission
commission_amount = final_price * commission_percent
pro_earnings = final_price - commission_amount

// FRA Pricing
final_price = base_price + size_addon + risk_addon

// Alarm Pricing
final_price = base_price + addressable_addon + overdue_addon

// Training Pricing
final_price = training_band_price (based on attendees)
```

---

## ✅ Payout Checklist

1. ☑️ Booking status = "Completed"
2. ☑️ Deliverables uploaded
3. ☑️ No dispute open
4. ☑️ No payout hold

---

## 🎯 Status Values

### PaymentStatus
- `Pending` - Awaiting payment
- `Paid` - Payment successful
- `Failed` - Payment failed
- `Refunded` - Payment refunded

### PayoutStatus
- `Pending` - Awaiting completion
- `Eligible` - Ready for payout
- `Released` - Payout sent
- `Failed` - Payout failed
- `On Hold` - Admin hold

### BookingStatus
- `Pending` - Not yet paid
- `Booked` - Paid and scheduled
- `Completed` - Service delivered
- `Cancelled` - Booking cancelled
- `Disputed` - In dispute

---

## 📦 Required Deliverables

| Service | Deliverable |
|---------|-------------|
| FRA | FRA report |
| Alarm | alarm certificate |
| Extinguisher | extinguisher report |
| Emergency Lighting | EL certificate |
| Training | attendance sheet |

---

## 🛡️ Error Handling

```typescript
// Payment validation
if (!validation.valid) {
  console.error(validation.errors);
}

// Payout eligibility
if (!eligibility.eligible) {
  console.error(eligibility.reasons);
  console.error(eligibility.missing_deliverables);
}

// Status transitions
if (!result.success) {
  console.error(result.errors);
}
```

---

## 🔗 Integration Points

### Customer Portal
- `validatePaymentConditions()` - Before checkout
- `createStripeCheckoutSession()` - Start payment
- `handlePaymentSuccess()` - After payment

### Professional Portal
- `addDeliverable()` - Upload report
- `checkPayoutEligibility()` - Check status
- `markPayoutEligible()` - When eligible

### Admin Portal
- `getAllPayments()` - View all payments
- `getAllPayouts()` - View all payouts
- `adminApproveRefund()` - Process refunds
- `adminForcePayout()` - Manual payouts
- `overrideBookingStatus()` - Change status

---

## 💡 Pro Tips

1. **Always validate** before creating checkout sessions
2. **Use status machine** for proper state transitions
3. **Check eligibility** before attempting payouts
4. **Store commission_percent** at booking time (rate changes don't affect existing bookings)
5. **Upload deliverables** before marking as completed
6. **Handle webhook events** asynchronously

---

## 🔧 Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 📞 Support

For issues or questions:
1. Check README.md for detailed docs
2. Review type definitions in types.ts
3. See usage examples in index.ts

---

**Last Updated:** December 2024  
**Version:** 1.0.0
