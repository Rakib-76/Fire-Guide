import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, ArrowLeft, MapPin, Star, CheckCircle, Shield, Briefcase, Calendar, SlidersHorizontal, Loader2, Award } from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent } from "./ui/card";
import { useApp } from "../contexts/AppContext";
import { fetchProfessionals, ProfessionalResponse } from "../api/professionalsService";
import type {
  FilterProfessionalForFraItem,
  FilterProfessionalCertificateItem,
  FilterProfessionalExperienceItem,
} from "../api/servicesService";
import { toast } from "sonner";

interface Professional {
  id: number;
  name: string;
  photo: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  price: number;
  distance: number;
  nextAvailable: string;
  qualifications: string[];
  /** From filter API: certificates then experience — qualification pills when present. */
  qualificationBadges?: { key: string; label: string }[];
  responseTime: string;
  /** From filter-professional/for-fra (e.g. "From £1351 per assessment") */
  price_label?: string;
  location?: string;
  initials?: string;
  /** From filter API – used for Booking Summary when user clicks Book */
  service_price?: number;
  platform_fee_percent?: string;
  platform_fee_amount?: number;
  total_price?: number;
}

interface ComparisonResultsProps {
  onViewProfile: (professional: Professional) => void;
  onBookNow: (professional: Professional) => void;
  onBack: () => void;
}

function formatPreferredDate(value: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const d = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T12:00:00`);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function joinNonEmpty(parts: (string | undefined | null)[], sep: string): string {
  const filtered = parts.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean);
  return filtered.join(sep);
}

function getCompareHeadline(q: Record<string, unknown> | null | undefined, serviceIdNum: number): string {
  if (q?.isCustomQuote) return "Custom quote request";
  if (q?.is_fire_alarm) return "Fire Alarm Professionals";
  if (q?.is_fire_extinguisher) return "Fire Extinguisher Professionals";
  const emergency =
    serviceIdNum === 39 ||
    (q?.emergency_light_id != null && Number(q.emergency_light_id) !== 0) ||
    Boolean((q?.emergency_lights_count as string | undefined)?.trim());
  if (emergency) return "Emergency Lighting Professionals";
  const marshal =
    serviceIdNum === 45 ||
    (q?.people_id != null && Number(q.people_id) !== 0) ||
    Boolean((q?.training_people_count as string | undefined)?.trim());
  if (marshal) return "Fire Marshal / Warden Training Professionals";
  const consult =
    serviceIdNum === 46 ||
    q?.mode_id != null ||
    Boolean((q?.consultation_type as string | undefined)?.trim());
  if (consult) return "Fire Safety Consultation Professionals";
  return "Fire Risk Assessment Professionals";
}

function fraPropertyPeopleLine(q: Record<string, unknown>): string {
  const pt = (q.property_type_label as string | undefined)?.trim();
  const people = (q.approximate_people_label as string | undefined)?.trim();
  if (pt && people) return `${pt}, ${people}`;
  return joinNonEmpty([pt, people], ", ");
}

function getCompareDetailsLine(q: Record<string, unknown> | null | undefined, serviceIdNum: number): string {
  if (!q) return "";
  const rd = q.request_data as { building_type?: string; people_count?: string } | undefined;
  if (q.isCustomQuote && rd) {
    return joinNonEmpty([rd.building_type, rd.people_count], ", ");
  }
  if (q.is_fire_alarm) {
    const dc = (q.detector_count as string | undefined)?.trim();
    if (dc) return dc;
    return fraPropertyPeopleLine(q);
  }
  if (q.is_fire_extinguisher) {
    const ec = (q.extinguisher_count as string | undefined)?.trim();
    if (ec) return ec;
    return fraPropertyPeopleLine(q);
  }
  if (
    serviceIdNum === 39 ||
    (q.emergency_light_id != null && Number(q.emergency_light_id) !== 0) ||
    (q.emergency_lights_count as string | undefined)?.trim()
  ) {
    const elc = (q.emergency_lights_count as string | undefined)?.trim();
    if (elc) return elc;
    return fraPropertyPeopleLine(q);
  }
  if (
    serviceIdNum === 45 ||
    (q.people_id != null && Number(q.people_id) !== 0) ||
    (q.training_people_count as string | undefined)?.trim()
  ) {
    const marshalLine = joinNonEmpty(
      [q.training_people_count as string, q.building_type as string, q.training_location as string],
      " · "
    );
    if (marshalLine) return marshalLine;
    return fraPropertyPeopleLine(q);
  }
  if (serviceIdNum === 46 || q.mode_id != null || (q.consultation_type as string | undefined)?.trim()) {
    const consult = joinNonEmpty([q.consultation_type as string, q.consultation_hours as string], " · ");
    if (consult) return consult;
    return fraPropertyPeopleLine(q);
  }
  return fraPropertyPeopleLine(q);
}

/** When API omits names, map certificate ids here (admin catalog). */
const CERTIFICATE_ID_LABELS: Partial<Record<number, string>> = {};
/** When API omits names, map experience ids here. */
const EXPERIENCE_ID_LABELS: Partial<Record<number, string>> = {};

function buildQualificationBadges(
  certificates: FilterProfessionalCertificateItem[] | undefined,
  experience: FilterProfessionalExperienceItem[] | undefined
): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const seenCert = new Set<number>();
  if (certificates?.length) {
    for (const c of certificates) {
      if (seenCert.has(c.id)) continue;
      seenCert.add(c.id);
      const trimmed = c.certificate_name?.trim();
      const label = trimmed || CERTIFICATE_ID_LABELS[c.id] || `Certificate #${c.id}`;
      out.push({ key: `cert-${c.id}`, label });
    }
  }
  const seenExp = new Set<number>();
  if (experience?.length) {
    for (const e of experience) {
      if (seenExp.has(e.id)) continue;
      seenExp.add(e.id);
      const trimmed = e.experience_name?.trim();
      const label = trimmed || EXPERIENCE_ID_LABELS[e.id] || `Experience #${e.id}`;
      out.push({ key: `exp-${e.id}`, label });
    }
  }
  return out;
}

/** Map filter-professional/for-fra item to Professional for the list UI. Carries API pricing for Booking Summary when user clicks Book. */
function mapFilterItemToProfessional(
  item:
    | FilterProfessionalForFraItem
    | {
      id: number;
      name: string;
      initials?: string;
      profile_image?: string;
      verified?: boolean;
      rating?: number;
      total_reviews?: number;
      location?: string;
      response_time?: string;
      service_price?: number;
      price?: number;
      price_label?: string;
      platform_fee_percent?: string;
      platform_fee_amount?: number;
      total_price?: number;
      professional_certificates?: FilterProfessionalCertificateItem[];
      professional_experience?: FilterProfessionalExperienceItem[];
    }
): Professional {
  const servicePrice = item.service_price ?? item.price ?? 0;
  return {
    id: item.id,
    name: item.name,
    photo: (item as FilterProfessionalForFraItem).profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=EF4444&color=fff&size=400`,
    verified: (item as FilterProfessionalForFraItem).verified ?? true,
    rating: typeof item.rating === "number" ? item.rating : parseFloat(String(item.rating ?? 0)) || 0,
    reviewCount: item.total_reviews ?? 0,
    price: servicePrice,
    distance: 0,
    nextAvailable: "",
    qualifications: [],
    qualificationBadges: buildQualificationBadges(
      (item as FilterProfessionalForFraItem).professional_certificates,
      (item as FilterProfessionalForFraItem).professional_experience
    ),
    responseTime: item.response_time ?? "Responds within 2 hours",
    price_label: (item as FilterProfessionalForFraItem).price_label,
    location: item.location,
    initials: (item as FilterProfessionalForFraItem).initials,
    service_price: item.service_price ?? (item.price != null ? item.price : undefined),
    platform_fee_percent: item.platform_fee_percent,
    platform_fee_amount: item.platform_fee_amount,
    total_price: item.total_price,
  };
}

export function ComparisonResults({ onViewProfile, onBookNow, onBack }: ComparisonResultsProps) {
  const navigate = useNavigate();
  const { filteredProfessionalsFromFra, questionnaireData, locationSearchData, selectedService } = useApp();
  const filteredListRef = useRef(filteredProfessionalsFromFra);
  filteredListRef.current = filteredProfessionalsFromFra;

  const [sortBy, setSortBy] = useState("recommended");
  const [filterPrice, setFilterPrice] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterDistance, setFilterDistance] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [availableToday, setAvailableToday] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map API response to Professional interface (for professional/list fallback)
  const mapApiResponseToProfessional = (apiProfessional: ProfessionalResponse): Professional => {
    // Parse rating from string to number
    const rating = parseFloat(apiProfessional.rating ?? "0") || 0;

    // Generate placeholder photo based on name
    const photoPlaceholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(apiProfessional.name)}&background=EF4444&color=fff&size=400`;

    // Extract review count from review text or use default
    const reviewCount = apiProfessional.review ? parseInt(apiProfessional.review.match(/\d+/)?.[0] || "0") || 50 : 50;

    // Mock price based on rating (higher rating = higher price)
    const basePrice = 200;
    const price = Math.round(basePrice + (rating * 20));

    // Mock distance (could be calculated from lat/long if user location is available)
    // Using professional ID for deterministic distance calculation
    const distance = Math.round(((apiProfessional.id % 8) + 1) * 10) / 10;

    // Mock next available date
    const availableDates = ["Today, 2:00 PM", "Tomorrow, 10:00 AM", "Tomorrow, 1:00 PM", "Wed, 9:00 AM", "Thu, 10:30 AM"];
    const nextAvailable = availableDates[Math.floor(Math.random() * availableDates.length)];

    // Use about field for qualifications, split by common separators or use as single qualification
    const qualifications = apiProfessional.about
      ? apiProfessional.about.split(/[,;]/).map(q => q.trim()).filter(q => q.length > 0)
      : ["Fire Safety Certified"];

    // Ensure at least one qualification
    if (qualifications.length === 0) {
      qualifications.push("Fire Safety Certified");
    }

    return {
      id: apiProfessional.professional_id ?? apiProfessional.id,
      name: apiProfessional.name,
      photo: photoPlaceholder,
      verified: true, // Default to verified since API doesn't provide this field
      rating: rating,
      reviewCount: reviewCount,
      price: price,
      distance: distance,
      nextAvailable: nextAvailable,
      qualifications: qualifications.slice(0, 3), // Limit to 3 qualifications
      responseTime: apiProfessional.response_time || "Responds within 2 hours"
    };
  };

  // Use filter-professional/for-* response when set (including empty array after Find Professionals).
  // Do not fall back to professional/list when the filter returned [] — that hid "no matches in area".
  useEffect(() => {
    if (filteredProfessionalsFromFra != null) {
      setProfessionals(filteredProfessionalsFromFra.map(mapFilterItemToProfessional));
      setError(null);
      setIsLoading(false);
      return;
    }

    const loadProfessionals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiProfessionals = await fetchProfessionals(1);
        if (filteredListRef.current != null) return;
        const mappedProfessionals = apiProfessionals.map(mapApiResponseToProfessional);
        setProfessionals(mappedProfessionals);
      } catch (err: any) {
        if (filteredListRef.current != null) return;
        console.error('Failed to load professionals:', err);
        setError(err.message || 'Failed to load professionals. Please try again.');
        toast.error(err.message || 'Failed to load professionals');
      } finally {
        if (filteredListRef.current != null) return;
        setIsLoading(false);
      }
    };

    loadProfessionals();
  }, [filteredProfessionalsFromFra]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
          />
        ))}
      </div>
    );
  };

  // Filter professionals
  const filteredProfessionals = professionals.filter((professional) => {
    // Verified filter
    if (verifiedOnly && !professional.verified) return false;

    // Available today filter
    if (availableToday && !professional.nextAvailable.toLowerCase().includes("today")) return false;

    // Price filter
    if (filterPrice !== "all") {
      if (filterPrice === "0-250" && professional.price > 250) return false;
      if (filterPrice === "250-300" && (professional.price < 250 || professional.price > 300)) return false;
      if (filterPrice === "300+" && professional.price < 300) return false;
    }

    // Rating filter
    if (filterRating !== "all") {
      const minRating = parseFloat(filterRating);
      if (professional.rating < minRating) return false;
    }

    // Distance filter
    if (filterDistance !== "all") {
      const maxDistance = parseFloat(filterDistance);
      if (professional.distance > maxDistance) return false;
    }

    return true;
  });

  const q = questionnaireData as Record<string, unknown> | null | undefined;
  const serviceIdNum = Number(locationSearchData?.service_id ?? selectedService);
  const summaryHeadline = useMemo(() => getCompareHeadline(q, Number.isFinite(serviceIdNum) ? serviceIdNum : NaN), [q, serviceIdNum]);
  const detailsLine = useMemo(
    () => getCompareDetailsLine(q, Number.isFinite(serviceIdNum) ? serviceIdNum : NaN),
    [q, serviceIdNum]
  );
  const postcodeDisplay = (locationSearchData?.post_code as string | undefined)?.trim() ?? "";
  const preferredDateRaw = typeof q?.preferred_date === "string" ? q.preferred_date : "";
  const neededByDisplay = formatPreferredDate(preferredDateRaw);

  const handleChangeDetails = () => {
    const sid = locationSearchData?.service_id ?? selectedService;
    if (sid != null && String(sid).trim() !== "") {
      navigate(`/services/${sid}/location`);
    } else {
      navigate("/services");
    }
  };

  // Sort professionals
  const sortedProfessionals = [...filteredProfessionals].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      case "distance":
        return a.distance - b.distance;
      case "recommended":
      default:
        // Recommended is a combination of rating, reviews, and distance
        const scoreA = (a.rating * 10) + (a.reviewCount / 10) - (a.distance * 2);
        const scoreB = (b.rating * 10) + (b.reviewCount / 10) - (b.distance * 2);
        return scoreB - scoreA;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — logo only (back lives on breadcrumb row below) */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-2.5 sm:py-3 px-3 sm:px-4 md:px-6">
        <div className="flex w-full max-w-[1920px] items-center">
          <Link
            to="/"
            className="flex min-w-0 items-center cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-10 w-auto sm:h-12" />
          </Link>
        </div>
      </header>

      {/* Breadcrumb + icon-only back (left arrow, right) */}
      <div className="bg-white py-3 px-4 md:px-6 border-b">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-600">
            <a href="/" className="hover:text-red-600 transition-colors shrink-0">Home</a>
            <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
            <a href="/services" className="hover:text-red-600 transition-colors shrink-0">Select Service</a>
            <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
            <span className="text-gray-900 truncate">Compare Professionals</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 h-10 w-10 rounded-full border-0 bg-transparent text-[#0A1A2F] shadow-none hover:bg-transparent hover:text-red-600 active:bg-transparent sm:h-11 sm:w-11 focus-visible:ring-2 focus-visible:ring-red-500/25"
            aria-label="Back to previous page"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white py-6 px-4 md:px-6 border-b shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-[#0A1A2F] mb-2">{summaryHeadline}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{postcodeDisplay || "Postcode not set"}</span>
                </div>
                {detailsLine ? (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 shrink-0" />
                    <span>{detailsLine}</span>
                  </div>
                ) : null}
                {neededByDisplay ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Needed by: {neededByDisplay}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <Button type="button" variant="outline" className="whitespace-nowrap" onClick={handleChangeDetails}>
              Change Details
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                    <h3 className="text-[#0A1A2F]">Filters</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Sort By */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Sort by</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recommended">Recommended</SelectItem>
                          <SelectItem value="price-low">Price: Low to High</SelectItem>
                          <SelectItem value="price-high">Price: High to Low</SelectItem>
                          <SelectItem value="rating">Highest Rated</SelectItem>
                          <SelectItem value="distance">Nearest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Filter */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Price Range</label>
                      <Select value={filterPrice} onValueChange={setFilterPrice}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Prices</SelectItem>
                          <SelectItem value="0-250">£0 - £250</SelectItem>
                          <SelectItem value="250-300">£250 - £300</SelectItem>
                          <SelectItem value="300+">£300+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rating Filter */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Minimum Rating</label>
                      <Select value={filterRating} onValueChange={setFilterRating}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Ratings</SelectItem>
                          <SelectItem value="4.5">4.5+ Stars</SelectItem>
                          <SelectItem value="4.7">4.7+ Stars</SelectItem>
                          <SelectItem value="4.9">4.9+ Stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Distance Filter */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Maximum Distance</label>
                      <Select value={filterDistance} onValueChange={setFilterDistance}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Distance</SelectItem>
                          <SelectItem value="5">Within 5 miles</SelectItem>
                          <SelectItem value="10">Within 10 miles</SelectItem>
                          <SelectItem value="15">Within 15 miles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 border-t">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" checked={verifiedOnly} onChange={() => setVerifiedOnly(!verifiedOnly)} />
                        <span>Verified only</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm mt-3">
                        <input type="checkbox" className="rounded" checked={availableToday} onChange={() => setAvailableToday(!availableToday)} />
                        <span>Available today</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results List */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">
                  {sortedProfessionals.length === 0 ? (
                    <span className="font-semibold text-gray-900">No professionals found</span>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-900">{sortedProfessionals.length}</span>{" "}
                      {sortedProfessionals.length === 1 ? "professional" : "professionals"} found
                    </>
                  )}
                </p>
              </div>

              {/* Loading State */}
              {isLoading && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
                    <p className="text-gray-600">Loading professionals...</p>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="outline">
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Empty: filter API returned no matches in search area, or sidebar filters hide everyone */}
              {!isLoading && !error && sortedProfessionals.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center space-y-3">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300" aria-hidden />
                    {filteredProfessionalsFromFra != null && filteredProfessionalsFromFra.length === 0 ? (
                      <>
                        <p className="text-lg font-semibold text-[#0A1A2F]">
                          No professionals were found in this area
                        </p>
                        <p className="text-gray-600 max-w-md mx-auto">
                          Try widening your search radius or using a different postcode, then select{" "}
                          <span className="font-medium">Find Professionals</span> again.
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-600">
                        No professionals match your current filters. Try adjusting the filters on the left.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Professionals List */}
              {!isLoading &&
                !error &&
                sortedProfessionals.map((professional) => {
                  const qualificationBadges =
                    professional.qualificationBadges && professional.qualificationBadges.length > 0
                      ? professional.qualificationBadges
                      : professional.qualifications.map((label, i) => ({
                        key: `fallback-${i}`,
                        label,
                      }));
                  return (
                    <Card key={professional.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Profile Photo / Initials */}
                          <div className="flex-shrink-0">
                            <div className="relative">
                              {professional.photo ? (
                                <img
                                  src={professional.photo}
                                  alt={professional.name}
                                  className="w-24 h-24 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-24 h-24 rounded-lg bg-red-600 flex items-center justify-center text-white text-2xl font-semibold">
                                  {professional.initials || professional.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              {professional.verified && (
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1">
                                  <CheckCircle className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Professional Info */}
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-[#0A1A2F]">{professional.name}</h3>
                                  {professional.verified && (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                      <Shield className="w-3 h-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                  {renderStars(professional.rating)}
                                  <span className="text-sm">
                                    <span className="font-semibold">{professional.rating}</span>
                                    <span className="text-gray-500"> ({professional.reviewCount} reviews)</span>
                                  </span>
                                </div>
                                {professional.responseTime ? (
                                  <p className="text-sm text-gray-500">{professional.responseTime}</p>
                                ) : null}
                              </div>

                              {/* Price — API service_price is mapped to price; display it with optional price_label */}
                              <div className="text-right">
                                <div className="text-2xl text-[#0A1A2F]">£{professional.price}</div>
                                {professional.price_label ? (
                                  <div className="text-sm text-gray-500 mt-1">{professional.price_label}</div>
                                ) : (
                                  <div className="text-sm text-gray-500 mt-1">per assessment</div>
                                )}
                              </div>
                            </div>

                            {/* Qualification badges — certificates + experience from filter API, or list fallback */}
                            {qualificationBadges.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {qualificationBadges.map((b) => (
                                  <Badge
                                    key={`${professional.id}-${b.key}`}
                                    variant="custom"
                                    className="rounded-full border border-solid border-blue-200 bg-blue-50 px-3 py-1 text-sm font-normal text-blue-800 shadow-none"
                                  >
                                    <Award className="w-3.5 h-3.5 mr-1 shrink-0 text-blue-700" aria-hidden />
                                    {b.label}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Bottom Info — location from API, or distance/availability when available */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t">
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                {professional.location ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{professional.location}</span>
                                  </div>
                                ) : professional.distance > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{professional.distance} miles away</span>
                                  </div>
                                ) : null}
                                {professional.nextAvailable ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-medium text-green-600">{professional.nextAvailable}</span>
                                  </div>
                                ) : null}
                              </div>

                              {/* Action Buttons */}
                                <div className="flex gap-3">
                                  <Button variant="outline" className="flex-1 md:flex-none" onClick={() => onViewProfile(professional)}>
                                    View Profile
                                  </Button>
                                  <Button className="bg-red-600 hover:bg-red-700 flex-1 md:flex-none" onClick={() => onBookNow(professional)}>
                                    Book Now
                                  </Button>
                                </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}