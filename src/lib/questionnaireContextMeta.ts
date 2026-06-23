import {
  Building2,
  Calendar,
  Clock,
  Factory,
  GraduationCap,
  HelpCircle,
  Home,
  Layers,
  Shield,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PropertyTypeResponse } from "../api/servicesService";
import type { PanelIcon, QuestionnaireStepMeta } from "./questionnaireStepMeta";

export type QuestionnaireStepContext = {
  propertyTypeId?: string;
  propertyTypes?: PropertyTypeResponse[];
  approximatePeopleLabel?: string;
  showCustomPeopleInput?: boolean;
  customApproximatePeople?: string;
  floorLabel?: string;
  showCustomFloorsInput?: boolean;
  customFloorsCount?: string;
  durationLabel?: string;
};

function panelIcon(icon: LucideIcon, title: string): PanelIcon {
  return { icon, title };
}

function resolvePropertyTypePanelIcon(
  propertyTypeId: string,
  propertyTypes: PropertyTypeResponse[]
): PanelIcon | null {
  const selected = propertyTypes.find((item) => String(item.id) === propertyTypeId);
  if (!selected) return null;

  const name = selected.property_type_name.trim();
  const n = name.toLowerCase();

  if (n.includes("residential") || n.includes("flat") || n.includes("hmo") || n.includes("home")) {
    return panelIcon(Home, name);
  }
  if (n.includes("office") || n.includes("retail") || n.includes("shop")) {
    return panelIcon(Store, name);
  }
  if (n.includes("restaurant") || n.includes("café") || n.includes("cafe") || n.includes("pub")) {
    return panelIcon(Building2, name);
  }
  if (n.includes("warehouse") || n.includes("industrial") || n.includes("factory")) {
    return panelIcon(Factory, name);
  }
  if (n.includes("school") || n.includes("community") || n.includes("education")) {
    return panelIcon(GraduationCap, name);
  }
  if (n.includes("care") || n.includes("high-risk") || n.includes("hospital")) {
    return panelIcon(Shield, name);
  }
  if (n.includes("more") || n.includes("other") || n.includes("custom")) {
    return panelIcon(HelpCircle, name);
  }

  return panelIcon(Building2, name);
}

function resolvePeoplePanelIcon(context: QuestionnaireStepContext): PanelIcon | null {
  if (context.showCustomPeopleInput) {
    return panelIcon(Users, "Large occupancy");
  }

  const label = (context.approximatePeopleLabel ?? "").toLowerCase();
  if (!label) return null;

  if (/100\+|custom\s*quote|more than 500|500\+/.test(label)) {
    return panelIcon(Users, "Large occupancy");
  }

  return panelIcon(Users, context.approximatePeopleLabel ?? "Occupancy");
}

export function resolveContextualPanelIcon(
  base: PanelIcon,
  step: number,
  context: QuestionnaireStepContext
): PanelIcon {
  if (step === 1 && context.propertyTypeId && context.propertyTypes?.length) {
    return resolvePropertyTypePanelIcon(context.propertyTypeId, context.propertyTypes) ?? base;
  }

  if (step === 2 && (context.approximatePeopleLabel || context.showCustomPeopleInput)) {
    return resolvePeoplePanelIcon(context) ?? base;
  }

  if (step === 3 && context.showCustomFloorsInput) {
    return panelIcon(Layers, "Multi-storey building");
  }

  if (step === 4 && context.durationLabel) {
    const urgent = /same|urgent|next day|asap/i.test(context.durationLabel);
    return panelIcon(urgent ? Clock : Calendar, context.durationLabel);
  }

  return base;
}

function resolvePropertyTypeContextNote(
  propertyTypeId: string,
  propertyTypes: PropertyTypeResponse[]
): string | undefined {
  const selected = propertyTypes.find((item) => String(item.id) === propertyTypeId);
  if (!selected) return undefined;

  const name = selected.property_type_name.trim();
  const n = name.toLowerCase();

  if (n.includes("residential") || n.includes("flat") || n.includes("hmo")) {
    return "Flats and HMOs often need extra checks for communal areas, fire doors, and means of escape.";
  }
  if (n.includes("office") || n.includes("retail") || n.includes("shop")) {
    return "Retail and office spaces typically need clear escape routes and suitable alarm coverage for staff and visitors.";
  }
  if (n.includes("restaurant") || n.includes("café") || n.includes("cafe") || n.includes("pub")) {
    return "Hospitality sites often combine cooking risks with public occupancy — assessments usually cover both.";
  }
  if (n.includes("warehouse") || n.includes("industrial")) {
    return "Industrial units may need review of storage layouts, loading areas, and detection across large open spaces.";
  }
  if (n.includes("school") || n.includes("community")) {
    return "Educational and community buildings must plan for varied occupancy, including vulnerable users and assembly areas.";
  }
  if (n.includes("care") || n.includes("high-risk")) {
    return "Care settings usually require enhanced evacuation planning and staff training considerations.";
  }

  return `${name} properties have specific fire safety expectations — we'll match professionals familiar with this type.`;
}

function resolvePeopleContextNote(context: QuestionnaireStepContext): string | undefined {
  if (context.showCustomPeopleInput) {
    if (context.customApproximatePeople?.trim()) {
      return `Around ${context.customApproximatePeople.trim()} occupants means evacuation planning and staff training will be a key part of your assessment.`;
    }
    return "Large occupancies often need detailed escape planning — enter your best estimate so we can scope the work correctly.";
  }

  const label = (context.approximatePeopleLabel ?? "").toLowerCase();
  if (!label) return undefined;
  if (/100\+|custom\s*quote|more than 500|500\+/.test(label)) {
    return "High-occupancy buildings need robust evacuation strategies — we'll connect you with assessors experienced at this scale.";
  }
  if (/51|26/.test(label)) {
    return "At this occupancy, multiple escape routes and clear signage become especially important.";
  }
  return `For ${context.approximatePeopleLabel}, we'll factor typical escape capacity and staffing into your quote.`;
}

function resolveFloorsContextNote(context: QuestionnaireStepContext): string | undefined {
  if (context.showCustomFloorsInput) {
    if (context.customFloorsCount?.trim()) {
      return `A ${context.customFloorsCount.trim()}-floor layout usually needs a bespoke assessment — we'll match you with specialists for larger or complex buildings.`;
    }
    return "Enter the total number of floors, including basements and mezzanine levels used by occupants.";
  }

  const label = (context.floorLabel ?? "").toLowerCase();
  if (!label) return undefined;

  if (/1\s*floor|ground only|ground\s*only/i.test(label)) {
    return "Single-storey sites often have simpler escape routes, but sleeping accommodation above commercial units still needs careful review.";
  }
  if (/2\s*floor/i.test(label)) {
    return "Two-storey buildings often need linked detection between floors and protected routes between levels.";
  }
  if (/3\s*floor/i.test(label)) {
    return "Three-storey layouts may require additional compartmentation and escape-route planning.";
  }
  if (/4\s*floor/i.test(label)) {
    return "Four-storey buildings usually need a more detailed review of stairwells and fire separation between floors.";
  }
  if (/5\+|5\s*floor|6\s*floor/i.test(label)) {
    return "Taller buildings generally need longer on-site assessments and may require specialist equipment.";
  }
  if (/custom\s*quote|7\+|more than/i.test(label)) {
    return "For complex or high-rise layouts, we'll route your request to professionals who regularly assess larger sites.";
  }

  return `Your selection (${context.floorLabel}) helps us estimate assessment time and match the right professional.`;
}

function resolveDurationContextNote(durationLabel?: string): string | undefined {
  if (!durationLabel) return undefined;
  if (/same|urgent|next day|asap/i.test(durationLabel)) {
    return "Urgent turnaround may limit which professionals are available — we'll show the closest matches first.";
  }
  if (/week|7\+|flexible/i.test(durationLabel)) {
    return "A flexible timeline gives you more choice of professionals and often better pricing.";
  }
  return `Professionals who can meet a "${durationLabel}" turnaround will be prioritised in your results.`;
}

export function resolveContextualContextNote(
  step: number,
  baseNote: string | undefined,
  context: QuestionnaireStepContext
): string | undefined {
  if (step === 1 && context.propertyTypeId && context.propertyTypes?.length) {
    return resolvePropertyTypeContextNote(context.propertyTypeId, context.propertyTypes) ?? baseNote;
  }
  if (step === 2) {
    return resolvePeopleContextNote(context) ?? baseNote;
  }
  if (step === 3) {
    return resolveFloorsContextNote(context) ?? baseNote;
  }
  if (step === 4 && context.durationLabel) {
    return resolveDurationContextNote(context.durationLabel) ?? baseNote;
  }
  return baseNote;
}

export function resolveContextualStepMeta(
  meta: QuestionnaireStepMeta,
  step: number,
  context: QuestionnaireStepContext
): QuestionnaireStepMeta {
  return {
    ...meta,
    panelIcon: resolveContextualPanelIcon(meta.panelIcon, step, context),
    contextNote: resolveContextualContextNote(step, meta.contextNote, context),
  };
}
