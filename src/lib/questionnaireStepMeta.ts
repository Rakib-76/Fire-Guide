import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  Clock,
  Factory,
  FileText,
  Flame,
  GraduationCap,
  HelpCircle,
  Home,
  Layers,
  Lightbulb,
  Lock,
  MapPin,
  MessageSquare,
  Shield,
  Store,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";

export type QuestionnaireServiceKind =
  | "fra"
  | "generic"
  | "alarm"
  | "extinguisher"
  | "emergency"
  | "consultation"
  | "marshal";

export type WhyFeature = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export type PanelIcon = {
  icon: LucideIcon;
  title: string;
};

export type QuestionnaireStepMeta = {
  pageTitle: string;
  pageSubtitle: string;
  questionTitle: string;
  questionSubtitle: string;
  questionIcon: LucideIcon;
  whyIntro: string;
  panelIcon: PanelIcon;
  whyFeatures: WhyFeature[];
  contextNote?: string;
  estimatedLabel: string;
};

function whyFeature(icon: LucideIcon, title: string, text: string): WhyFeature {
  return { icon, title, text };
}

function panelIcon(icon: LucideIcon, title: string): PanelIcon {
  return { icon, title };
}

const DEFAULT_WHY_FEATURES: WhyFeature[] = [
  whyFeature(Shield, "Get accurate quotes", "We match you with services relevant to your property."),
  whyFeature(Clock, "Save time", "Quick and easy process in just a few steps."),
  whyFeature(UserCheck, "Expert support", "Our team is here to help you every step of the way."),
  whyFeature(Lock, "100% Secure", "Your information is safe and never shared."),
];

const DEFAULT_PANEL_ICON: PanelIcon = panelIcon(Shield, "Fire safety guidance");

export function getQuestionnaireServiceKind(args: {
  isFireAlarmService: boolean;
  isFireExtinguisherService: boolean;
  isEmergencyLightingService: boolean;
  isFireSafetyConsultationService: boolean;
  isFireMarshalTrainingService: boolean;
  isFireRiskAssessmentService: boolean;
}): QuestionnaireServiceKind {
  if (args.isFireAlarmService) return "alarm";
  if (args.isFireExtinguisherService) return "extinguisher";
  if (args.isEmergencyLightingService) return "emergency";
  if (args.isFireSafetyConsultationService) return "consultation";
  if (args.isFireMarshalTrainingService) return "marshal";
  if (args.isFireRiskAssessmentService) return "fra";
  return "generic";
}

/** Map property type / option labels to a relevant Lucide icon. */
export function getIconForOptionLabel(label: string): LucideIcon {
  const n = label.toLowerCase();
  if (n.includes("commercial") || n.includes("retail") || n.includes("office") || n.includes("shop")) return Store;
  if (n.includes("industrial") || n.includes("warehouse") || n.includes("factory")) return Factory;
  if (n.includes("residential") || n.includes("home") || n.includes("flat") || n.includes("hmo")) return Home;
  if (n.includes("education") || n.includes("school") || n.includes("college") || n.includes("university")) return GraduationCap;
  if (n.includes("health") || n.includes("hospital") || n.includes("care")) return Shield;
  if (n.includes("hospitality") || n.includes("hotel") || n.includes("restaurant")) return Building2;
  if (n.includes("alarm") || n.includes("detector") || n.includes("panel")) return Bell;
  if (n.includes("extinguisher")) return Flame;
  if (n.includes("light") || n.includes("emergency")) return Lightbulb;
  if (n.includes("consult") || n.includes("phone") || n.includes("video") || n.includes("visit")) return MessageSquare;
  if (n.includes("marshal") || n.includes("warden") || n.includes("training")) return GraduationCap;
  if (n.includes("floor") || n.includes("level")) return Layers;
  if (n.includes("people") || n.includes("staff") || n.includes("occupant")) return Users;
  if (n.includes("date") || n.includes("day") || n.includes("week")) return Calendar;
  if (n.includes("hour")) return Clock;
  if (n.includes("more") || n.includes("custom") || n.includes("other")) return HelpCircle;
  if (n.includes("skip") || n.includes("optional")) return FileText;
  if (n.includes("on-site") || n.includes("location") || n.includes("place")) return MapPin;
  if (n.includes("urgent") || n.includes("same")) return Zap;
  return ClipboardCheck;
}

function meta(
  partial: Partial<QuestionnaireStepMeta> & Pick<QuestionnaireStepMeta, "questionTitle" | "questionIcon">
): QuestionnaireStepMeta {
  return {
    pageTitle: partial.pageTitle ?? "Tell us about your property",
    pageSubtitle:
      partial.pageSubtitle ?? "This helps us match you with the right fire safety services.",
    questionSubtitle: partial.questionSubtitle ?? "Select the option that best describes your needs.",
    whyIntro:
      partial.whyIntro ??
      "Knowing your property and requirements helps us recommend the right fire safety services and trusted professionals.",
    panelIcon: partial.panelIcon ?? DEFAULT_PANEL_ICON,
    whyFeatures: partial.whyFeatures ?? DEFAULT_WHY_FEATURES,
    estimatedLabel: partial.estimatedLabel ?? "2 min to complete",
    ...partial,
  };
}

export function getQuestionnaireStepMeta(
  kind: QuestionnaireServiceKind,
  step: number,
  totalSteps: number
): QuestionnaireStepMeta {
  const remaining = Math.max(1, totalSteps - step + 1);
  const estimatedLabel = `${Math.max(1, Math.min(remaining, 3))} min to complete`;

  if (kind === "fra" || kind === "generic") {
    switch (step) {
      case 1:
        return meta({
          questionTitle: "What type of property is it?",
          questionSubtitle: "Select the option that best describes your property.",
          questionIcon: Building2,
          panelIcon: panelIcon(Building2, "Property type"),
          whyIntro: "Property type affects fire safety regulations, risk level, and which professionals are best suited to help you.",
          contextNote: "Different property types follow different fire safety rules — choosing the closest match gives you more accurate quotes.",
          estimatedLabel,
        });
      case 2:
        return meta({
          pageTitle: "Building occupancy",
          pageSubtitle: "Help us understand how many people use the building.",
          questionTitle: "How many people use the building?",
          questionSubtitle: "Choose the approximate number of occupants.",
          questionIcon: Users,
          panelIcon: panelIcon(Users, "Building occupancy"),
          whyIntro: "Occupancy levels influence evacuation planning and the scope of your fire risk assessment.",
          contextNote: "Higher occupancy usually means more escape routes, signage, and training to consider during the assessment.",
          estimatedLabel,
        });
      case 3:
        return meta({
          pageTitle: "Building layout",
          pageSubtitle: "Floors and levels help us estimate assessment time and complexity.",
          questionTitle: "How many floors does the building have?",
          questionSubtitle: "Include all levels, basements, and the ground floor.",
          questionIcon: Layers,
          panelIcon: panelIcon(Layers, "Building floors"),
          whyIntro: "Larger or multi-storey buildings often need more detailed assessments and specialist equipment.",
          contextNote: "Include basement and mezzanine levels if people work or visit there — they count toward the total.",
          estimatedLabel,
        });
      case 4:
        return meta({
          pageTitle: "Your timeline",
          pageSubtitle: "We'll prioritise professionals who can meet your schedule.",
          questionTitle: "When do you need it?",
          questionSubtitle: "Select your preferred turnaround time.",
          questionIcon: Clock,
          panelIcon: panelIcon(Clock, "Your timeline"),
          whyIntro: "Urgency helps us show professionals who are available when you need them.",
          contextNote: "Same-day or next-day requests may have fewer available professionals in your area.",
          estimatedLabel,
        });
      case 5:
        return meta({
          pageTitle: "Preferred date",
          pageSubtitle: "Pick a date that works for your site visit or assessment.",
          questionTitle: "When do you need the assessment?",
          questionSubtitle: "We'll show available professionals for this date.",
          questionIcon: Calendar,
          panelIcon: panelIcon(Calendar, "Preferred date"),
          whyIntro: "Your preferred date lets us match you with professionals who are free on that day.",
          contextNote: "You'll see availability for your chosen date on the next step.",
          estimatedLabel,
        });
      default:
        return meta({
          pageTitle: "Final details",
          questionTitle: "Any access notes or special requirements?",
          questionSubtitle: "Optional — share anything the professional should know before the visit.",
          questionIcon: FileText,
          panelIcon: panelIcon(FileText, "Access notes"),
          whyIntro: "Access details help professionals arrive prepared and complete the job efficiently.",
          contextNote: "Gate codes, parking, and site contacts save time on the day of the visit.",
          estimatedLabel,
        });
    }
  }

  if (kind === "alarm") {
    const titles = [
      "How many smoke / heat detectors?",
      "How many manual call points?",
      "How many floors does the building have?",
      "How many fire alarm panels?",
      "What type of fire alarm system?",
      "When was it last serviced?",
      "When do you need the assessment?",
      "Any access notes or special requirements?",
    ];
    const icons = [Bell, Bell, Layers, Bell, Bell, Clock, Calendar, FileText];
    const panelIcons: PanelIcon[] = [
      panelIcon(Bell, "Smoke detectors"),
      panelIcon(Bell, "Call points"),
      panelIcon(Layers, "Building floors"),
      panelIcon(Bell, "Alarm panels"),
      panelIcon(Bell, "Alarm system type"),
      panelIcon(Clock, "Last serviced"),
      panelIcon(Calendar, "Preferred date"),
      panelIcon(FileText, "Access notes"),
    ];
    const i = step - 1;
    return meta({
      pageTitle: "Fire alarm details",
      pageSubtitle: "Answer a few questions about your fire alarm system.",
      questionTitle: titles[i] ?? "Fire alarm question",
      questionIcon: icons[i] ?? Bell,
      panelIcon: panelIcons[i] ?? panelIcons[0],
      whyIntro: "System size and type determine the right engineer and an accurate quote for your alarm service.",
      estimatedLabel,
    });
  }

  if (kind === "extinguisher") {
    const titles = [
      "How many fire extinguishers?",
      "How many floors?",
      "What types of extinguishers?",
      "When were they last serviced?",
      "When do you need the assessment?",
      "Any access notes or special requirements?",
    ];
    const icons = [Flame, Layers, Flame, Clock, Calendar, FileText];
    const panelIcons: PanelIcon[] = [
      panelIcon(Flame, "Fire extinguishers"),
      panelIcon(Layers, "Building floors"),
      panelIcon(Flame, "Extinguisher types"),
      panelIcon(Clock, "Last serviced"),
      panelIcon(Calendar, "Preferred date"),
      panelIcon(FileText, "Access notes"),
    ];
    const i = step - 1;
    return meta({
      pageTitle: "Fire extinguisher details",
      pageSubtitle: "Tell us about your extinguisher setup.",
      questionTitle: titles[i] ?? "Extinguisher question",
      questionIcon: icons[i] ?? Flame,
      panelIcon: panelIcons[i] ?? panelIcons[0],
      whyIntro: "Equipment count and location help us match you with a qualified extinguisher service professional.",
      estimatedLabel,
    });
  }

  if (kind === "emergency") {
    const titles = [
      "How many emergency lights?",
      "How many floors?",
      "What type of emergency lighting? (optional)",
      "How often are lights tested? (optional)",
      "When do you need the assessment?",
      "Any access notes or special requirements?",
    ];
    const icons = [Lightbulb, Layers, Lightbulb, Clock, Calendar, FileText];
    const panelIcons: PanelIcon[] = [
      panelIcon(Lightbulb, "Emergency lights"),
      panelIcon(Layers, "Building floors"),
      panelIcon(Lightbulb, "Lighting type"),
      panelIcon(Clock, "Test frequency"),
      panelIcon(Calendar, "Preferred date"),
      panelIcon(FileText, "Access notes"),
    ];
    const i = step - 1;
    return meta({
      pageTitle: "Emergency lighting details",
      pageSubtitle: "Help us understand your emergency lighting setup.",
      questionTitle: titles[i] ?? "Emergency lighting question",
      questionIcon: icons[i] ?? Lightbulb,
      panelIcon: panelIcons[i] ?? panelIcons[0],
      whyIntro: "Lighting coverage and test history ensure we send the right specialist for your premises.",
      estimatedLabel,
    });
  }

  if (kind === "consultation") {
    const titles = [
      "How would you like the consultation?",
      "How many hours do you need?",
      "When do you need the assessment?",
      "Any access notes or special requirements?",
    ];
    const icons = [MessageSquare, Clock, Calendar, FileText];
    const panelIcons: PanelIcon[] = [
      panelIcon(MessageSquare, "Consultation mode"),
      panelIcon(Clock, "Consultation hours"),
      panelIcon(Calendar, "Preferred date"),
      panelIcon(FileText, "Access notes"),
    ];
    const i = step - 1;
    return meta({
      pageTitle: "Fire safety consultation",
      pageSubtitle: "Choose how and when you'd like expert advice.",
      questionTitle: titles[i] ?? "Consultation question",
      questionIcon: icons[i] ?? MessageSquare,
      panelIcon: panelIcons[i] ?? panelIcons[0],
      whyIntro: "Consultation format and duration determine pricing and which consultant we recommend.",
      estimatedLabel,
    });
  }

  if (kind === "marshal") {
    const titles = [
      "How many people need training?",
      "Where will training take place?",
      "What type of building is it?",
      "Has staff had fire training before? (optional)",
      "When do you need the assessment?",
      "Any access notes or special requirements?",
    ];
    const icons = [Users, MapPin, Building2, GraduationCap, Calendar, FileText];
    const panelIcons: PanelIcon[] = [
      panelIcon(Users, "Training group size"),
      panelIcon(MapPin, "Training location"),
      panelIcon(Building2, "Building type"),
      panelIcon(GraduationCap, "Prior training"),
      panelIcon(Calendar, "Preferred date"),
      panelIcon(FileText, "Access notes"),
    ];
    const i = step - 1;
    return meta({
      pageTitle: "Fire marshal training",
      pageSubtitle: "Tell us about your training requirements.",
      questionTitle: titles[i] ?? "Training question",
      questionIcon: icons[i] ?? GraduationCap,
      panelIcon: panelIcons[i] ?? panelIcons[0],
      whyIntro: "Group size and venue help us match you with an accredited fire marshal trainer.",
      estimatedLabel,
    });
  }

  return meta({
    questionTitle: "Tell us more",
    questionIcon: HelpCircle,
    estimatedLabel,
  });
}
