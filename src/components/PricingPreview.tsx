import { Fragment, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Check,
  ClipboardCheck,
  FireExtinguisher,
  Info,
  Lightbulb,
  Lock,
  MessageSquare,
  ShieldCheck,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { fetchServices, formatServiceFromPrice, type ServiceResponse } from "../api/servicesService";

interface PricingPreviewProps {
  onGetQuote: () => void;
  onContactSales?: () => void;
}

type CardMeta = {
  icon: LucideIcon;
  features: string[];
  popular?: boolean;
};

const CARD_META_BY_NAME: Array<{ match: string; meta: CardMeta }> = [
  {
    match: "fire risk assessment",
    meta: {
      icon: ClipboardCheck,
      popular: true,
      features: [
        "Detailed site inspection",
        "Risk assessment report",
        "Action plan & recommendations",
        "Compliance certificate",
      ],
    },
  },
  {
    match: "fire alarm",
    meta: {
      icon: Bell,
      features: [
        "System inspection & testing",
        "Maintenance & repairs",
        "Compliance certification",
        "24/7 emergency support",
      ],
    },
  },
  {
    match: "fire extinguisher",
    meta: {
      icon: FireExtinguisher,
      features: [
        "Equipment inspection",
        "Pressure testing",
        "Replacement if needed",
        "Certification & tagging",
      ],
    },
  },
  {
    match: "marshal",
    meta: {
      icon: Users,
      features: [
        "Certified training course",
        "Up to 12 participants",
        "Practical fire drills & materials",
        "Official certification",
      ],
    },
  },
  {
    match: "warden",
    meta: {
      icon: Users,
      features: [
        "Certified training course",
        "Up to 12 participants",
        "Practical fire drills & materials",
        "Official certification",
      ],
    },
  },
  {
    match: "emergency lighting",
    meta: {
      icon: Lightbulb,
      features: [
        "System testing & inspection",
        "Battery replacement",
        "Fault diagnosis & repair",
        "3-year service plan option",
      ],
    },
  },
  {
    match: "consultation",
    meta: {
      icon: MessageSquare,
      features: [
        "Qualified fire safety experts",
        "Transparent upfront pricing",
        "Compliance-focused advice",
        "Digital booking & tracking",
      ],
    },
  },
];

const DEFAULT_META: CardMeta = {
  icon: ShieldCheck,
  features: [
    "Qualified fire safety professionals",
    "Transparent upfront pricing",
    "Compliance-focused delivery",
    "Digital booking & tracking",
  ],
};

const SERVICE_SORT_ORDER: Record<string, number> = {
  "fire risk assessment": 1,
  "fire alarm": 2,
  "fire extinguisher": 3,
  marshal: 4,
  warden: 4,
  "emergency lighting": 5,
  consultation: 6,
};

const bottomFeatures = [
  {
    icon: ShieldCheck,
    title: "No Hidden Fees",
    subtitle: "What you see is what you pay",
  },
  {
    icon: Zap,
    title: "Instant Quotes",
    subtitle: "Get prices in seconds",
  },
  {
    icon: ShieldCheck,
    title: "Verified Professionals",
    subtitle: "Qualified & background checked",
  },
  {
    icon: Lock,
    title: "Secure Booking",
    subtitle: "Safe payments & data protection",
  },
];

function resolveCardMeta(serviceName: string): CardMeta {
  const lower = serviceName.toLowerCase();
  for (const { match, meta } of CARD_META_BY_NAME) {
    if (lower.includes(match)) return meta;
  }
  return DEFAULT_META;
}

function serviceSortKey(name: string | undefined): number {
  const lower = name?.toLowerCase() ?? "";
  for (const [key, order] of Object.entries(SERVICE_SORT_ORDER)) {
    if (lower.includes(key)) return order;
  }
  return 99;
}

function isActiveService(service: ServiceResponse): boolean {
  const status = String(service.status ?? "")
    .trim()
    .toLowerCase();
  if (!status) return true;
  return status === "active" || status === "1" || status === "enabled" || status === "published";
}

type PricingCard = {
  id: number;
  title: string;
  price: string;
  features: string[];
  popular: boolean;
  icon: LucideIcon;
};

function mapApiServicesToCards(services: ServiceResponse[]): PricingCard[] {
  return [...services]
    .filter(isActiveService)
    .sort((a, b) => serviceSortKey(a.service_name) - serviceSortKey(b.service_name))
    .slice(0, 6)
    .map((service) => {
      const meta = resolveCardMeta(service.service_name);
      return {
        id: service.id,
        title: service.service_name,
        price: formatServiceFromPrice(service),
        features: meta.features,
        popular: meta.popular === true,
        icon: meta.icon,
      };
    });
}

const FALLBACK_CARDS: PricingCard[] = [
  {
    id: 1,
    title: "Fire Risk Assessment",
    price: "£99",
    popular: true,
    icon: ClipboardCheck,
    features: CARD_META_BY_NAME[0].meta.features,
  },
  {
    id: 2,
    title: "Fire Alarm Service",
    price: "£79",
    icon: Bell,
    features: CARD_META_BY_NAME[1].meta.features,
    popular: false,
  },
  {
    id: 3,
    title: "Fire Extinguisher Service",
    price: "£49",
    icon: FireExtinguisher,
    features: CARD_META_BY_NAME[2].meta.features,
    popular: false,
  },
  {
    id: 4,
    title: "Fire Marshal / Warden Training",
    price: "£149",
    icon: Users,
    features: CARD_META_BY_NAME[3].meta.features,
    popular: false,
  },
  {
    id: 5,
    title: "Emergency Lighting Test",
    price: "£79",
    icon: Lightbulb,
    features: CARD_META_BY_NAME[5].meta.features,
    popular: false,
  },
  {
    id: 6,
    title: "Fire Safety Consultation",
    price: "£99",
    icon: MessageSquare,
    features: CARD_META_BY_NAME[6].meta.features,
    popular: false,
  },
];

function PricingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1">
          <div className="h-5 w-3/4 rounded bg-gray-200" />
          <div className="mt-1 h-3 w-8 rounded bg-gray-200" />
          <div className="mt-1 h-8 w-16 rounded bg-gray-200" />
        </div>
      </div>
      <ul className="mb-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="h-4 w-full rounded bg-gray-200" />
        ))}
      </ul>
      <div className="h-11 w-full rounded-lg bg-gray-200" />
    </div>
  );
}

export function PricingPreview({ onGetQuote }: PricingPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<PricingCard[]>(FALLBACK_CARDS);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const list = await fetchServices();
        if (cancelled) return;
        const mapped = mapApiServicesToCards(Array.isArray(list) ? list : []);
        setCards(mapped.length > 0 ? mapped : FALLBACK_CARDS);
      } catch {
        if (!cancelled) setCards(FALLBACK_CARDS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="pricing-preview" className="bg-white px-6 py-16 md:py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center md:mb-12">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-red-600">
            <Tag className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="text-[12px] font-bold tracking-[0.1em]">TRANSPARENT PRICING</span>
          </div>
          <h2 className="mx-auto mb-4 max-w-5xl text-[48px] font-bold leading-[1.15] tracking-[-0.02em] text-[#0A1A2F] md:text-[44px]">
            Clear Prices. No Surprises.{" "} 
            <span className="text-red-600">Just Confidence.</span>
            
          </h2>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-gray-500 md:text-[16px] font-bold mb-5">
            Compare services, view upfront prices and book with trusted professionals. No hidden fees.
            No waiting. Just peace of mind.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="mb-10 grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <PricingCardSkeleton key={index} />)
            : cards.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.id}
                    className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
                      service.popular ? "border-red-500" : "border-gray-200"
                    }`}
                  >
                    {service.popular && (
                      <div className="absolute left-5 top-0 -translate-y-1/2 rounded bg-red-600 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                        MOST POPULAR
                      </div>
                    )}

                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                        <Icon className="h-6 w-6 text-red-600" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-bold leading-tight text-[#0A1A2F]">
                          {service.title}
                        </h3>
                        <p className="mt-1 text-[13px] leading-none text-gray-500">From</p>
                        <p className="mt-0.5 text-4xl font-bold leading-none text-red-600">
                          {service.price}
                        </p>
                      </div>
                    </div>

                    <ul className="mb-6 flex-1 space-y-2.5">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" strokeWidth={2.5} />
                          <span className="text-[14px] leading-snug text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={onGetQuote}
                      className={`h-11 w-full rounded-lg font-semibold text-[14px] ${
                        service.popular
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-[#0A1A2F] text-white hover:bg-[#152238]"
                      }`}
                    >
                      Get Instant Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
        </div>

        {/* Bottom features bar */}
        <div className="mt-6 mb-6 rounded-2xl bg-white px-4 py-6 shadow-md md:px-8 md:py-7">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            {bottomFeatures.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <Fragment key={feature.title}>
                  {index > 0 && (
                    <>
                      <div
                        className="h-px w-full lg:hidden"
                        style={{ backgroundColor: "#e2e8f0" }}
                        aria-hidden="true"
                      />
                      <div
                        className="hidden shrink-0 lg:block"
                        style={{
                          width: 1,
                          alignSelf: "stretch",
                          backgroundColor: "#e2e8f0",
                        }}
                        aria-hidden="true"
                      />
                    </>
                  )}
                  <div className="flex flex-1 items-center gap-3 px-2 py-2 lg:py-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                      <FeatureIcon className="h-[18px] w-[18px] text-red-600" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#0A1A2F]">{feature.title}</p>
                      <p className="text-[12px] leading-snug text-gray-500">{feature.subtitle}</p>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[12px] leading-relaxed text-gray-400">
          <Info className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
          <span>
            Final price may vary based on property size, location and specific requirements.
          </span>
          <span className="hidden sm:inline">|</span>
          <span>All prices exclude VAT.</span>
        </p>
      </div>
    </section>
  );
}
