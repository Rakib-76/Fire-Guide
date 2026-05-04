import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Star, MapPin, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  fetchProfessionalsGet,
  formatProfessionalsGetFromPrice,
  type ProfessionalsGetItem,
} from "../api/professionalsService";

interface FeaturedProfessionalsProps {
  onViewProfile: () => void;
}

type FeaturedCardDisplay = {
  /** From API; null for static fallback — then card uses onViewProfile */
  professionalId: number | null;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  completedJobs: number;
  image: string;
  certifications: string[];
  responseTime: string;
  startingPrice: string;
};

const STATIC_TEMPLATES: Omit<FeaturedCardDisplay, "name" | "location" | "startingPrice">[] = [
  {
    specialty: "Fire Risk Assessment",
    rating: 4.9,
    reviews: 127,
    completedJobs: 450,
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    certifications: ["NEBOSH", "Fire Safety Level 4"],
    responseTime: "< 2 hours",
  },
  {
    specialty: "Fire Alarm Systems",
    rating: 5.0,
    reviews: 98,
    completedJobs: 320,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
    certifications: ["FIA Certified", "ECS Gold Card"],
    responseTime: "< 1 hour",
  },
  {
    specialty: "Fire Extinguisher Service",
    rating: 4.8,
    reviews: 156,
    completedJobs: 580,
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
    certifications: ["BAFE Approved", "CFPA Certified"],
    responseTime: "< 3 hours",
  },
  {
    specialty: "Fire Marshal Training",
    rating: 5.0,
    reviews: 84,
    completedJobs: 210,
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop",
    certifications: ["Accredited Trainer", "IOSH Certified"],
    responseTime: "< 2 hours",
  },
];

const STATIC_FALLBACK_PROFESSIONALS: FeaturedCardDisplay[] = STATIC_TEMPLATES.map((t, i) => ({
  ...t,
  professionalId: null,
  name: ["James Mitchell", "Emma Richardson", "Robert Davies", "Sophie Anderson"][i],
  location: ["London", "Manchester", "Birmingham", "Leeds"][i],
  startingPrice: ["£150.00", "£120.00", "£80.00", "£250.00"][i],
}));

function mergeApiWithTemplates(api: ProfessionalsGetItem[]): FeaturedCardDisplay[] {
  return api.map((p, i) => {
    const t = STATIC_TEMPLATES[i % STATIC_TEMPLATES.length];
    return {
      ...t,
      professionalId: p.id,
      name: p.name,
      image: p.image && p.image.trim() ? p.image : t.image,
      location: p.business_location,
      startingPrice: formatProfessionalsGetFromPrice(p.from_price),
    };
  });
}

export function FeaturedProfessionals({ onViewProfile }: FeaturedProfessionalsProps) {
  const navigate = useNavigate();
  const [apiList, setApiList] = useState<ProfessionalsGetItem[] | null>(null);

  const openProfessional = (professionalId: number | null) => {
    if (professionalId != null && Number.isFinite(professionalId) && professionalId > 0) {
      navigate(`/professionals/${professionalId}`);
      return;
    }
    onViewProfile();
  };

  useEffect(() => {
    let cancelled = false;
    fetchProfessionalsGet().then((list) => {
      if (!cancelled) setApiList(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const apiFeaturedSlice = useMemo(() => {
    if (apiList !== null && apiList.length > 0) return apiList.slice(0, 4);
    return null;
  }, [apiList]);

  const professionals = useMemo(() => {
    if (apiFeaturedSlice && apiFeaturedSlice.length > 0) {
      return mergeApiWithTemplates(apiFeaturedSlice);
    }
    return STATIC_FALLBACK_PROFESSIONALS;
  }, [apiFeaturedSlice]);

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[28px] md:text-[42px] font-[800] leading-[130%] tracking-[-0.01em] mt-3 mb-2">
            Featured Fire Safety Professionals
          </h2>
          <p className="text-[16px] leading-[140%] text-[#666] max-w-2xl mx-auto">
            Independent, experienced, and highly-rated experts ready to help with your fire safety needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {professionals.map((professional, index) => (
            <div
              key={professional.professionalId ?? (apiFeaturedSlice ? apiFeaturedSlice[index]?.id : index)}
              className="group grid h-full min-h-0 w-full cursor-pointer grid-rows-[auto_minmax(0,1fr)] transition-all"
              onClick={() => openProfessional(professional.professionalId)}
            >
              {/* Professional Image - Full Width Block */}
              <div className="relative w-full overflow-hidden">
                <ImageWithFallback
                  src={professional.image}
                  alt={professional.name}
                  className="block h-[200px] w-full object-cover md:h-48"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-lg">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{professional.rating}</span>
                </div>
              </div>

              {/* Body: top block grows so footer + button stay on one baseline across the row */}
              <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] border-2 border-transparent bg-white p-5 transition-all group-hover:border-red-100">
                <div className="min-h-0 w-full self-start">
                  <h3 className="mb-1 min-h-[3.5rem] text-lg leading-tight line-clamp-2 transition-colors group-hover:text-red-600">
                    {professional.name}
                  </h3>
                  <p className="mb-2 font-semibold text-red-600">{professional.specialty}</p>

                  <div className="mb-3 flex gap-2 text-gray-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-h-[4.5rem] text-sm leading-snug line-clamp-4">{professional.location}</span>
                  </div>

                  <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                    <span>{professional.reviews} reviews</span>
                    <span>{professional.completedJobs} jobs</span>
                  </div>

                  <div className="mb-4 flex min-h-[4.5rem] w-full flex-col items-stretch justify-start gap-2">
                    {professional.certifications.map((cert, i) => (
                      <div
                        key={i}
                        className="flex min-w-0 w-full flex-row items-center gap-1.5 rounded bg-green-50 px-2 py-1.5 text-xs text-green-700"
                      >
                        <CheckCircle className="h-3 w-3 shrink-0 text-green-600" aria-hidden />
                        <span className="min-w-0 leading-snug">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full shrink-0">
                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <p className="text-xs text-gray-500">Response time</p>
                      <p className="text-sm font-semibold">{professional.responseTime}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">From</p>
                      <p className="text-xl font-semibold text-red-600">{professional.startingPrice}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="mt-4 w-full bg-red-600 hover:bg-red-700 group-hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProfessional(professional.professionalId);
                    }}
                  >
                    View Profile <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button
            onClick={onViewProfile}
            variant="outline"
            className="border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-8 py-6 text-lg"
          >
            Browse All Professionals <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
