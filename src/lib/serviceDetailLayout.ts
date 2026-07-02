import type { ServiceDetailContent, ServiceDetailSection } from "./serviceDetailContent";

export type ServiceDetailFaq = {
  question: string;
  answer: string;
};

export type ServiceDetailStep = {
  title: string;
  description: string;
};

export type ServiceDetailWhyBook = {
  title: string;
  description: string;
};

export type ServiceDetailTrustBadge = {
  line1: string;
  line2: string;
};

export const SERVICE_DETAIL_TRUST_BADGES: ServiceDetailTrustBadge[] = [
  { line1: "Qualifications", line2: "checked" },
  { line1: "Experience", line2: "reviewed" },
  { line1: "Insurance", line2: "confirmed" },
  { line1: "Secure", line2: "bookings" },
];

export const SERVICE_DETAIL_HOW_IT_WORKS: ServiceDetailStep[] = [
  {
    title: "Get your price",
    description: "Enter a few details for an instant price online.",
  },
  {
    title: "Book online",
    description: "Choose a date and time that works for you.",
  },
  {
    title: "Assessment",
    description: "Our assessor visits your premises and carries out a thorough assessment.",
  },
  {
    title: "Get your report",
    description: "Receive your detailed report with clear actions and next steps.",
  },
];

export const SERVICE_DETAIL_WHY_BOOK: ServiceDetailWhyBook[] = [
  {
    title: "Trusted & vetted assessors",
    description:
      "All assessors are fully qualified, experienced and background checked.",
  },
  {
    title: "Best price guarantee",
    description: "We compare local prices to ensure you get the best deal possible.",
  },
  {
    title: "Support when you need it",
    description: "Our team is here to help before, during and after your assessment.",
  },
  {
    title: "Local experts",
    description: "We work with trusted local professionals who know your area.",
  },
];

const FAQ_BY_SLUG: Record<string, ServiceDetailFaq[]> = {
  "fire-risk-assessment": [
    {
      question: "Is a fire risk assessment a legal requirement?",
      answer:
        "Yes. In England and Wales, the responsible person must carry out a suitable and sufficient fire risk assessment and keep it under review for most workplaces and non-domestic premises.",
    },
    {
      question: "How often should a fire risk assessment be carried out?",
      answer:
        "There is no fixed interval in law, but it should be reviewed regularly and whenever there are significant changes to the premises, occupancy or fire safety arrangements.",
    },
    {
      question: "What happens if I don't have a fire risk assessment?",
      answer:
        "You may be at risk of enforcement action, insurance issues and — most importantly — increased fire risk to occupants. A written assessment helps you manage risks properly.",
    },
  ],
};

export function getServiceDetailFaqs(content: ServiceDetailContent): ServiceDetailFaq[] {
  const bespoke = FAQ_BY_SLUG[content.slug];
  if (bespoke?.length) return bespoke;

  const name = content.h1.toLowerCase();
  return [
    {
      question: `Do I need ${name}?`,
      answer:
        "Most businesses and many landlords need appropriate fire safety measures for their premises. If you are unsure, book a consultation or speak to a qualified professional through Fire Guide.",
    },
    {
      question: "How quickly can I book?",
      answer:
        "Many professionals offer availability within a few days. Choose your preferred date during booking and your provider will confirm.",
    },
    {
      question: "What affects the final price?",
      answer:
        "Pricing depends on premises type, size, complexity, location and urgency. Answer the online questions for an accurate quote before you book.",
    },
  ];
}

export function getHeroBullets(content: ServiceDetailContent): string[] {
  const bespoke: Record<string, string[]> = {
    "fire-risk-assessment": [
      "Stay compliant with UK fire safety law",
      "Expert, vetted assessors in your area",
      "Clear written reports and action plans",
      "Competitive pricing with no hidden fees",
    ],
  };
  if (bespoke[content.slug]) return bespoke[content.slug];

  return [
    `Compare trusted professionals for ${content.h1.toLowerCase()}`,
    "See clear upfront pricing before you book",
    "Fully aligned with UK fire safety requirements",
    "Book online in under 2 minutes",
  ];
}

function truncateSummary(items: string[], max = 120): string {
  const text = items.slice(0, 2).join(". ");
  if (text.length <= max) return `${text}.`;
  return `${text.slice(0, max).trim()}…`;
}

export function getOverviewSummary(
  section: ServiceDetailSection,
  kind: "includes" | "whoNeeds" | "pricing" | "duration",
  content: ServiceDetailContent
): string {
  if (section.summary) return section.summary;

  switch (kind) {
    case "includes":
      return truncateSummary(section.items, 100);
    case "whoNeeds":
      return `Required for ${section.items.slice(0, 3).join(", ").toLowerCase()} and similar premises.`;
    case "pricing":
      return content.pricing.paragraphs[0] ?? "Transparent pricing based on your premises.";
    case "duration":
      return section.items[0] ?? "Typical visit and turnaround times vary by premises.";
    default:
      return "";
  }
}

export function getServiceDisplayName(content: ServiceDetailContent): string {
  return content.h1;
}
