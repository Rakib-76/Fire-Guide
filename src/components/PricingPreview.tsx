import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { fetchServices, formatServiceFromPrice, type ServiceResponse } from "../api/servicesService";

interface PricingPreviewProps {
  onGetQuote: () => void;
  /** "Contact Sales Team" — e.g. navigate to /about#contact */
  onContactSales?: () => void;
}

type CardMeta = {
  features: string[];
  popular?: boolean;
};

/** Feature bullets + “Most Popular” — keyed by substring of API `service_name`. */
const CARD_META_BY_NAME: Array<{ match: string; meta: CardMeta }> = [
  {
    match: "fire risk assessment",
    meta: {
      popular: true,
      features: [
        "Comprehensive site inspection",
        "Detailed risk assessment report",
        "Action plan with recommendations",
        "Compliance certificate",
        "Follow-up consultation",
      ],
    },
  },
  {
    match: "fire alarm",
    meta: {
      features: [
        "System inspection & testing",
        "Maintenance & repairs",
        "Compliance certification",
        "24/7 emergency support",
        "Annual service plan",
      ],
    },
  },
  {
    match: "fire extinguisher",
    meta: {
      features: [
        "Equipment inspection",
        "Pressure testing",
        "Replacement if needed",
        "Wall mounting service",
        "Certification & signage",
      ],
    },
  },
  {
    match: "fire door",
    meta: {
      features: [
        "Full door integrity check",
        "Hardware inspection",
        "Seal & gap testing",
        "Certification report",
        "Repair recommendations",
      ],
    },
  },
  {
    match: "marshal",
    meta: {
      features: [
        "Certified training course",
        "Up to 12 participants",
        "Course materials included",
        "Practical fire drills",
        "Official certification",
      ],
    },
  },
  {
    match: "warden",
    meta: {
      features: [
        "Certified training course",
        "Up to 12 participants",
        "Course materials included",
        "Practical fire drills",
        "Official certification",
      ],
    },
  },
  {
    match: "emergency lighting",
    meta: {
      features: [
        "System testing & inspection",
        "Battery replacement",
        "Fault diagnosis & repair",
        "Compliance documentation",
        "3-year service plan option",
      ],
    },
  },
];

const DEFAULT_FEATURES = [
  "Qualified fire safety professionals",
  "Transparent upfront pricing",
  "Compliance-focused delivery",
  "Digital booking & tracking",
  "UK-wide coverage",
];

const SERVICE_SORT_ORDER: Record<string, number> = {
  "fire risk assessment": 1,
  "fire alarm": 2,
  "fire extinguisher": 3,
  "fire door": 4,
  marshal: 5,
  warden: 5,
  "emergency lighting": 6,
};

function resolveCardMeta(serviceName: string): CardMeta {
  const lower = serviceName.toLowerCase();
  for (const { match, meta } of CARD_META_BY_NAME) {
    if (lower.includes(match)) return meta;
  }
  return { features: DEFAULT_FEATURES };
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
};

function mapApiServicesToCards(services: ServiceResponse[]): PricingCard[] {
  return [...services]
    .filter(isActiveService)
    .sort((a, b) => serviceSortKey(a.service_name) - serviceSortKey(b.service_name))
    .map((service) => {
      const meta = resolveCardMeta(service.service_name);
      return {
        id: service.id,
        title: service.service_name,
        price: formatServiceFromPrice(service),
        features: meta.features,
        popular: meta.popular === true,
      };
    });
}

/** Static fallback if GET /services is empty or unavailable. */
const FALLBACK_CARDS: PricingCard[] = [
  {
    id: 1,
    title: "Fire Risk Assessment",
    price: "£150",
    popular: true,
    features: CARD_META_BY_NAME[0].meta.features,
  },
  {
    id: 2,
    title: "Fire Alarm Service",
    price: "£120",
    features: CARD_META_BY_NAME[1].meta.features,
    popular: false,
  },
  {
    id: 3,
    title: "Fire Extinguisher Service",
    price: "£80",
    features: CARD_META_BY_NAME[2].meta.features,
    popular: false,
  },
  {
    id: 4,
    title: "Fire Door Inspection",
    price: "£95",
    features: CARD_META_BY_NAME[3].meta.features,
    popular: false,
  },
  {
    id: 5,
    title: "Fire Marshal Training",
    price: "£250",
    features: CARD_META_BY_NAME[4].meta.features,
    popular: false,
  },
  {
    id: 6,
    title: "Emergency Lighting",
    price: "£110",
    features: CARD_META_BY_NAME[6].meta.features,
    popular: false,
  },
];

function PricingCardSkeleton() {
  return (
    <Card className="relative border-2 border-gray-200 animate-pulse">
      <CardHeader className="pb-4">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-10 bg-gray-200 rounded w-1/2" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </ul>
        <div className="h-10 bg-gray-200 rounded w-full" />
      </CardContent>
    </Card>
  );
}

export function PricingPreview({ onGetQuote, onContactSales }: PricingPreviewProps) {
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
    <section id="pricing-preview" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[125%] tracking-[-0.01em] mb-6 max-w-4xl mx-auto">
            Transparent Pricing for Every Service
          </h2>
          <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] tracking-normal text-gray-600 max-w-2xl mx-auto px-4">
            Compare services and book with confidence. No hidden fees, instant quotes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <PricingCardSkeleton key={index} />)
            : cards.map((service) => (
                <Card
                  key={service.id}
                  className={`relative hover:shadow-2xl transition-all border-2 ${
                    service.popular
                      ? "border-red-600 shadow-lg"
                      : "border-gray-200 hover:border-red-100"
                  }`}
                >
                  {service.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <div className="flex items-baseline gap-2 mt-4">
                      <span className="text-gray-500">From</span>
                      <span className="text-4xl font-semibold text-red-600">{service.price}</span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={onGetQuote}
                      className={`w-full ${
                        service.popular
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-gray-900 hover:bg-gray-800"
                      }`}
                    >
                      Get Instant Quote <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Need a custom quote for multiple services?</p>
          <Button
            type="button"
            onClick={onContactSales ?? onGetQuote}
            variant="outline"
            className="border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-8 py-6 text-lg"
          >
            Contact Sales Team
          </Button>
        </div>
      </div>
    </section>
  );
}
