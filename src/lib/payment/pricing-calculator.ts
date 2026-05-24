/**
 * FIRE GUIDE PAYMENT SYSTEM - SERVICE-LEVEL PRICING CALCULATOR
 * Calculates final_price for each service type based on existing pricing logic
 */

import { ServiceType } from "./types";

// ============================================
// SECTION 5 — SERVICE-LEVEL PAYMENT RULES
// ============================================

/**
 * Apply existing service pricing logic and then process payment
 */

// ============================================
// FRA PAYMENT CALCULATION
// ============================================

export interface FRAPricingInput {
  basePrice: number;
  propertySize: "small" | "medium" | "large" | "xlarge";
  riskLevel: "low" | "medium" | "high";
}

export interface FRAPricingAddons {
  sizeAddon: number;
  riskAddon: number;
}

/**
 * FRA PAYMENT:
 * final_price = fra_base_price + size_addon + risk_addon
 */
export function calculateFRAPrice(input: FRAPricingInput): {
  finalPrice: number;
  breakdown: FRAPricingAddons & { basePrice: number };
} {
  const sizeAddons = {
    small: 0,
    medium: 100,
    large: 200,
    xlarge: 350
  };

  const riskAddons = {
    low: 0,
    medium: 75,
    high: 150
  };

  const sizeAddon = sizeAddons[input.propertySize];
  const riskAddon = riskAddons[input.riskLevel];
  const finalPrice = input.basePrice + sizeAddon + riskAddon;

  return {
    finalPrice,
    breakdown: {
      basePrice: input.basePrice,
      sizeAddon,
      riskAddon
    }
  };
}

// ============================================
// ALARM PAYMENT CALCULATION
// ============================================

export interface AlarmPricingInput {
  basePrice: number;
  isAddressable: boolean;
  isOverdue: boolean;
}

export interface AlarmPricingAddons {
  addressableAddon: number;
  overdueAddon: number;
}

/**
 * ALARM PAYMENT:
 * final_price = alarm_base_price + addressable_addon + overdue_addon
 */
export function calculateAlarmPrice(input: AlarmPricingInput): {
  finalPrice: number;
  breakdown: AlarmPricingAddons & { basePrice: number };
} {
  const addressableAddon = input.isAddressable ? 100 : 0;
  const overdueAddon = input.isOverdue ? 50 : 0;
  const finalPrice = input.basePrice + addressableAddon + overdueAddon;

  return {
    finalPrice,
    breakdown: {
      basePrice: input.basePrice,
      addressableAddon,
      overdueAddon
    }
  };
}

// ============================================
// EXTINGUISHER PAYMENT CALCULATION
// ============================================

export interface ExtinguisherPricingInput {
  basePrice: number;
  numberOfUnits?: number;
}

/**
 * EXTINGUISHER PAYMENT:
 * final_price = extinguisher_base_price (MVP simple model)
 * 
 * Note: Can be expanded to include per-unit pricing:
 * final_price = base_price + (units * price_per_unit)
 */
export function calculateExtinguisherPrice(input: ExtinguisherPricingInput): {
  finalPrice: number;
  breakdown: { basePrice: number; units?: number };
} {
  // MVP: Simple flat rate
  // Future: basePrice + (numberOfUnits * pricePerUnit)
  const finalPrice = input.basePrice;

  return {
    finalPrice,
    breakdown: {
      basePrice: input.basePrice,
      units: input.numberOfUnits
    }
  };
}

// ============================================
// EMERGENCY LIGHTING PAYMENT CALCULATION
// ============================================

export interface EmergencyLightingPricingInput {
  basePrice: number;
  numberOfFixtures?: number;
}

/**
 * EMERGENCY LIGHTING PAYMENT:
 * final_price = el_base_price
 * 
 * Note: Can be expanded to include per-fixture pricing
 */
export function calculateEmergencyLightingPrice(input: EmergencyLightingPricingInput): {
  finalPrice: number;
  breakdown: { basePrice: number; fixtures?: number };
} {
  // MVP: Simple flat rate
  const finalPrice = input.basePrice;

  return {
    finalPrice,
    breakdown: {
      basePrice: input.basePrice,
      fixtures: input.numberOfFixtures
    }
  };
}

// ============================================
// TRAINING PAYMENT CALCULATION
// ============================================

export interface TrainingPricingInput {
  numberOfAttendees: number;
  trainingType?: "basic" | "advanced" | "refresher";
}

/**
 * TRAINING PAYMENT:
 * final_price = training_band_price
 * 
 * Pricing bands based on number of attendees
 */
export function calculateTrainingPrice(input: TrainingPricingInput): {
  finalPrice: number;
  breakdown: { bandPrice: number; attendees: number; pricePerPerson: number };
} {
  // Pricing bands
  const pricingBands = [
    { max: 5, price: 300, label: "1-5 people" },
    { max: 10, price: 500, label: "6-10 people" },
    { max: 20, price: 800, label: "11-20 people" },
    { max: Infinity, price: 1200, label: "20+ people" }
  ];

  const band = pricingBands.find(b => input.numberOfAttendees <= b.max);
  const bandPrice = band?.price || 1200;
  const pricePerPerson = bandPrice / input.numberOfAttendees;

  return {
    finalPrice: bandPrice,
    breakdown: {
      bandPrice,
      attendees: input.numberOfAttendees,
      pricePerPerson: Math.round(pricePerPerson * 100) / 100
    }
  };
}

// ============================================
// CUSTOM QUOTE PAYMENT CALCULATION
// ============================================

export interface CustomQuotePricingInput {
  adminManualPrice: number;
  description?: string;
}

/**
 * CUSTOM QUOTE PAYMENT:
 * final_price = admin_manual_price
 */
export function calculateCustomQuotePrice(input: CustomQuotePricingInput): {
  finalPrice: number;
  breakdown: { manualPrice: number; description?: string };
} {
  return {
    finalPrice: input.adminManualPrice,
    breakdown: {
      manualPrice: input.adminManualPrice,
      description: input.description
    }
  };
}

// ============================================
// UNIVERSAL PRICING CALCULATOR
// ============================================

export type ServicePricingInput = 
  | { serviceType: ServiceType.FRA; input: FRAPricingInput }
  | { serviceType: ServiceType.Alarm; input: AlarmPricingInput }
  | { serviceType: ServiceType.Extinguisher; input: ExtinguisherPricingInput }
  | { serviceType: ServiceType.EmergencyLighting; input: EmergencyLightingPricingInput }
  | { serviceType: ServiceType.Training; input: TrainingPricingInput }
  | { serviceType: ServiceType.CustomQuote; input: CustomQuotePricingInput };

/**
 * Universal pricing calculator
 * Calculates final_price for any service type
 */
export function calculateServicePrice(
  pricingInput: ServicePricingInput
): { finalPrice: number; breakdown: any } {
  switch (pricingInput.serviceType) {
    case ServiceType.FRA:
      return calculateFRAPrice(pricingInput.input);
    
    case ServiceType.Alarm:
      return calculateAlarmPrice(pricingInput.input);
    
    case ServiceType.Extinguisher:
      return calculateExtinguisherPrice(pricingInput.input);
    
    case ServiceType.EmergencyLighting:
      return calculateEmergencyLightingPrice(pricingInput.input);
    
    case ServiceType.Training:
      return calculateTrainingPrice(pricingInput.input);
    
    case ServiceType.CustomQuote:
      return calculateCustomQuotePrice(pricingInput.input);
    
    default:
      throw new Error(`Unknown service type: ${(pricingInput as any).serviceType}`);
  }
}

// ============================================
// COMMISSION CALCULATION
// ============================================

/**
 * Calculates commission and professional earnings
 * 
 * FORMULA:
 * commission_amount = final_price * commission_percent
 * pro_earnings = final_price - commission_amount
 */
export function calculateCommissionAndEarnings(
  finalPrice: number,
  commissionPercent: number
): {
  finalPrice: number;
  commissionAmount: number;
  proEarnings: number;
  commissionPercent: number;
} {
  const commissionAmount = Math.round(finalPrice * commissionPercent * 100) / 100;
  const proEarnings = Math.round((finalPrice - commissionAmount) * 100) / 100;

  return {
    finalPrice,
    commissionAmount,
    proEarnings,
    commissionPercent
  };
}

// ============================================
// PRICE VALIDATION
// ============================================

/**
 * Validates that a price is valid
 */
export function validatePrice(price: number): { valid: boolean; error?: string } {
  if (price < 0) {
    return { valid: false, error: "Price cannot be negative" };
  }

  if (price === 0) {
    return { valid: false, error: "Price cannot be zero" };
  }

  if (!Number.isFinite(price)) {
    return { valid: false, error: "Price must be a finite number" };
  }

  // Minimum price threshold (e.g., £10)
  const MIN_PRICE = 10;
  if (price < MIN_PRICE) {
    return { valid: false, error: `Price must be at least £${MIN_PRICE}` };
  }

  // Maximum price threshold (e.g., £10,000)
  const MAX_PRICE = 10000;
  if (price > MAX_PRICE) {
    return { valid: false, error: `Price cannot exceed £${MAX_PRICE}` };
  }

  return { valid: true };
}
