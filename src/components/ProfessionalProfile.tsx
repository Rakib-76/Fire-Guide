import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { ChevronRight, Star, Award, Shield, Clock, MapPin, CheckCircle2, Phone, Mail, Calendar, ArrowLeft, Briefcase, Loader2, Send } from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { fetchProfessionalProfileCertifications, ProfessionalProfileCertificationItem } from "../api/qualificationsService";
import { fetchProfessionalProfileInsurance, ProfessionalProfileInsuranceData } from "../api/insuranceService";
import {
  fetchProfessionalProfileExperiences,
  normalizeProfessionalProfileExperience,
  ProfessionalProfileExperienceData,
} from "../api/experiencesService";
import { fetchProfessionalProfileReviews, ProfessionalProfileReviewItem } from "../api/reviewsService";
import { fetchProfessionalProfileAvailableDates, ProfessionalProfileAvailableDateItem } from "../api/availableDatesService";
import {
  fetchProfessionalProfileDetails,
  fetchProfessionalProfilePricing,
  fetchProfessionalDetailsPageGetAll,
  getProfessionalDetailsPageMemberships,
  fetchForUserWorkingHours,
  sendProfessionalMail,
  type ProfessionalProfileDetailsData,
  type ProfessionalProfilePricingItem,
  type ProfessionalDetailsPageMembershipItem,
  type WorkingDayHourRecord,
} from "../api/professionalsService";
import { getMembershipMediaUrlCandidates } from "../api/membershipService";
import { getApiToken } from "../lib/auth";
import {
  resolveProfessionalDisplayPhone,
  copyTextToClipboard,
  openTelDialer,
} from "../lib/phoneContact";
import { toast } from "sonner";

interface ProfessionalProfileProps {
  professional: any;
  /** Professional ID from URL (from Professional List API, passed when View Profile is clicked) */
  professionalIdFromUrl?: number;
  /** Optional; sticky “Book & Pay” bar was removed — kept for callers that still pass it */
  onBook?: () => void;
  onBack: () => void;
  /** e.g. "Back to Home" from landing, "Back to Results" from compare */
  backLabel?: string;
  /** When true, breadcrumb is Home → profile (no compare step) */
  fromFeatured?: boolean;
}

function MembershipLogoImage({
  logoPath,
  alt,
  className,
}: {
  logoPath: string;
  alt: string;
  className?: string;
}) {
  const token = getApiToken() ?? "";
  const urls = React.useMemo(
    () => getMembershipMediaUrlCandidates(logoPath, { apiToken: token }),
    [logoPath, token]
  );
  const [urlIndex, setUrlIndex] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const src = urls[urlIndex] ?? "";

  React.useEffect(() => {
    setUrlIndex(0);
    setLoaded(false);
    setFailed(false);
  }, [logoPath, urls]);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      title={alt}
      className={`${className ?? ""}${loaded ? "" : " opacity-0"}`}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setUrlIndex((current) => {
          if (current >= urls.length - 1) {
            setFailed(true);
            return current;
          }
          setLoaded(false);
          return current + 1;
        });
      }}
    />
  );
}

function formatMembershipSince(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 1971) return null;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isMembershipVerified(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").toLowerCase().trim();
  return normalized === "verified" || normalized === "approved";
}

export function ProfessionalProfile({
  professional,
  professionalIdFromUrl,
  onBook,
  onBack,
  backLabel = "Back to Results",
  fromFeatured = false,
}: ProfessionalProfileProps) {
  const { professionalId: urlProfessionalId } = useParams<{ professionalId?: string }>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [profileDetails, setProfileDetails] = useState<ProfessionalProfileDetailsData | null>(null);
  const [isLoadingProfileDetails, setIsLoadingProfileDetails] = useState(true);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [certificationsModalOpen, setCertificationsModalOpen] = useState(false);
  const [profileCertifications, setProfileCertifications] = useState<ProfessionalProfileCertificationItem[]>([]);
  const [isLoadingQualifications, setIsLoadingQualifications] = useState(true);
  const [profileInsurance, setProfileInsurance] = useState<ProfessionalProfileInsuranceData | null>(null);
  const [isLoadingInsurance, setIsLoadingInsurance] = useState(true);
  const [profileExperience, setProfileExperience] = useState<ProfessionalProfileExperienceData | null>(null);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(true);
  const [profileMemberships, setProfileMemberships] = useState<ProfessionalDetailsPageMembershipItem[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(true);
  const [reviews, setReviews] = useState<ProfessionalProfileReviewItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [availableDatesData, setAvailableDatesData] = useState<ProfessionalProfileAvailableDateItem[]>([]);
  const [isLoadingAvailableDates, setIsLoadingAvailableDates] = useState(true);
  const [workingHours, setWorkingHours] = useState<WorkingDayHourRecord[]>([]);
  const [isLoadingWorkingHours, setIsLoadingWorkingHours] = useState(true);
  const [profilePricing, setProfilePricing] = useState<ProfessionalProfilePricingItem[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [persistedProfessional, setPersistedProfessional] = useState<any>(null);
  const [pricingPageIndex, setPricingPageIndex] = useState(0);
  const [isCallNowBusy, setIsCallNowBusy] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [msgFullName, setMsgFullName] = useState("");
  const [msgEmail, setMsgEmail] = useState("");
  const [msgPhone, setMsgPhone] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Restore professional data from sessionStorage on mount if not provided in props
  useEffect(() => {
    if (!professional || !professional.name) {
      try {
        const stored = sessionStorage.getItem('fireguide_selected_professional');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.name) {
            setPersistedProfessional(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load professional from sessionStorage:', error);
      }
    }
  }, [professional]);

  // Resolve professional ID from URL (set when View Profile is clicked; ID comes from Professional List API)
  const professionalId =
    professionalIdFromUrl ??
    ((urlProfessionalId ? parseInt(urlProfessionalId, 10) : NaN) || professional?.id) ??
    professional?.professional_id ??
    persistedProfessional?.id ??
    persistedProfessional?.professional_id;
  const professionalIdNum =
    professionalId != null && !Number.isNaN(Number(professionalId)) ? Number(professionalId) : null;

  // Call pricing API immediately when profile loads — POST with professional_id from list
  useEffect(() => {
    if (professionalIdNum == null) {
      setIsLoadingPricing(false);
      return;
    }
    let cancelled = false;
    const loadPricing = async () => {
      try {
        setIsLoadingPricing(true);
        const data = await fetchProfessionalProfilePricing(professionalIdNum);
        if (!cancelled) setProfilePricing(data ?? []);
      } catch (error: any) {
        if (!cancelled) {
          console.error('Failed to load pricing:', error);
          setProfilePricing([]);
        }
      } finally {
        if (!cancelled) setIsLoadingPricing(false);
      }
    };
    loadPricing();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch single professional details when View Profile is clicked (professional-profile/details)
  useEffect(() => {
    if (professionalIdNum == null) {
      setProfileDetails(null);
      setIsLoadingProfileDetails(false);
      return;
    }
    let cancelled = false;
    const loadDetails = async () => {
      try {
        setIsLoadingProfileDetails(true);
        const data = await fetchProfessionalProfileDetails(professionalIdNum);
        if (!cancelled) setProfileDetails(data);
      } catch (error: any) {
        if (!cancelled) {
          setProfileDetails(null);
          toast.error(error?.message || 'Failed to load professional details');
        }
      } finally {
        if (!cancelled) setIsLoadingProfileDetails(false);
      }
    };
    loadDetails();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch reviews for this professional (professional-profile/reviews)
  useEffect(() => {
    if (professionalIdNum == null) {
      setReviews([]);
      setIsLoadingReviews(false);
      return;
    }
    let cancelled = false;
    const loadReviews = async () => {
      try {
        setIsLoadingReviews(true);
        const data = await fetchProfessionalProfileReviews(professionalIdNum);
        if (!cancelled) setReviews(data ?? []);
      } catch (error: any) {
        if (!cancelled) {
          setReviews([]);
          toast.error(error?.message || 'Failed to load reviews');
        }
      } finally {
        if (!cancelled) setIsLoadingReviews(false);
      }
    };
    loadReviews();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch insurance for this professional (professional-profile/insurance)
  useEffect(() => {
    if (professionalIdNum == null) {
      setProfileInsurance(null);
      setIsLoadingInsurance(false);
      return;
    }
    let cancelled = false;
    const loadInsurance = async () => {
      try {
        setIsLoadingInsurance(true);
        const data = await fetchProfessionalProfileInsurance(professionalIdNum);
        if (!cancelled) setProfileInsurance(data);
      } catch (error: any) {
        if (!cancelled) {
          setProfileInsurance(null);
          toast.error(error?.message || 'Failed to load insurance');
        }
      } finally {
        if (!cancelled) setIsLoadingInsurance(false);
      }
    };
    loadInsurance();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch experience for this professional (professional-profile/experiences)
  useEffect(() => {
    if (professionalIdNum == null) {
      setProfileExperience(null);
      setIsLoadingExperiences(false);
      return;
    }
    let cancelled = false;
    const loadExperience = async () => {
      try {
        setIsLoadingExperiences(true);
        const data = await fetchProfessionalProfileExperiences(professionalIdNum);
        if (!cancelled) setProfileExperience(data);
      } catch (error: any) {
        if (!cancelled) {
          setProfileExperience(null);
          toast.error(error?.message || 'Failed to load experience');
        }
      } finally {
        if (!cancelled) setIsLoadingExperiences(false);
      }
    };
    loadExperience();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch memberships for this professional (professional/details-page/get-all)
  useEffect(() => {
    if (professionalIdNum == null) {
      setProfileMemberships([]);
      setIsLoadingMemberships(false);
      return;
    }
    let cancelled = false;
    const loadMemberships = async () => {
      try {
        setIsLoadingMemberships(true);
        const data = await fetchProfessionalDetailsPageGetAll(professionalIdNum);
        if (!cancelled) {
          setProfileMemberships(getProfessionalDetailsPageMemberships(data));
        }
      } catch (error: any) {
        if (!cancelled) {
          setProfileMemberships([]);
          console.error("Failed to load professional memberships:", error);
        }
      } finally {
        if (!cancelled) setIsLoadingMemberships(false);
      }
    };
    loadMemberships();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch certifications for this professional (professional-profile/certifications)
  useEffect(() => {
    if (professionalIdNum == null) {
      setProfileCertifications([]);
      setIsLoadingQualifications(false);
      return;
    }
    let cancelled = false;
    const loadCertifications = async () => {
      try {
        setIsLoadingQualifications(true);
        const data = await fetchProfessionalProfileCertifications(professionalIdNum);
        if (!cancelled) setProfileCertifications(data ?? []);
      } catch (error: any) {
        if (!cancelled) {
          setProfileCertifications([]);
          toast.error(error?.message || 'Failed to load certifications');
        }
      } finally {
        if (!cancelled) setIsLoadingQualifications(false);
      }
    };
    loadCertifications();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch available dates for this professional (professional-profile/available-date)
  useEffect(() => {
    if (professionalIdNum == null) {
      setAvailableDatesData([]);
      setIsLoadingAvailableDates(false);
      return;
    }
    let cancelled = false;
    const loadAvailableDates = async () => {
      try {
        setIsLoadingAvailableDates(true);
        const { dates } = await fetchProfessionalProfileAvailableDates(professionalIdNum);
        if (!cancelled) setAvailableDatesData(dates ?? []);
      } catch (error: any) {
        if (!cancelled) {
          setAvailableDatesData([]);
          toast.error(error?.message || 'Failed to load available dates');
        }
      } finally {
        if (!cancelled) setIsLoadingAvailableDates(false);
      }
    };
    loadAvailableDates();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Fetch weekly working hours (for-user/get-working-hours)
  useEffect(() => {
    if (professionalIdNum == null) {
      setWorkingHours([]);
      setIsLoadingWorkingHours(false);
      return;
    }
    let cancelled = false;
    const loadWorkingHours = async () => {
      try {
        setIsLoadingWorkingHours(true);
        const data = await fetchForUserWorkingHours(professionalIdNum);
        if (!cancelled) setWorkingHours(data ?? []);
      } catch (error: unknown) {
        if (!cancelled) {
          setWorkingHours([]);
          const message =
            error && typeof error === 'object' && 'message' in error
              ? String((error as { message?: string }).message)
              : 'Failed to load working hours';
          toast.error(message);
        }
      } finally {
        if (!cancelled) setIsLoadingWorkingHours(false);
      }
    };
    loadWorkingHours();
    return () => { cancelled = true; };
  }, [professionalIdNum]);

  // Provide default professional data with proper fallbacks
  const defaultData = {
    name: "John Smith",
    rating: 4.9,
    reviewCount: 127,
    responseTime: "Within 1 hour",
    location: "London, UK",
    distance: 5.2,
    verified: true,
    price: "£350",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    bio: "Experienced fire safety professional with over 15 years in the industry. Specializing in comprehensive fire risk assessments for commercial and residential properties. Committed to ensuring your property meets all fire safety regulations.",
    insurance: {
      publicLiability: "£5M",
      professionalIndemnity: "£2M",
      provider: "AXA Insurance",
      validUntil: "Dec 2025"
    },
    services: ["Fire Risk Assessment", "Fire Safety Training", "Fire Door Inspection"],
    experience: {
      yearsActive: 15,
      assessmentsCompleted: 500,
      specializations: ["Commercial Properties", "Residential Buildings", "Industrial Sites", "Educational Facilities"]
    }
  };

  // Resolve professional data: props > persisted state > sessionStorage > defaults
  const getResolvedProfessional = () => {
    // First, try props
    if (professional && professional.name) {
      return professional;
    }
    
    // Then, try persisted state (from useEffect)
    if (persistedProfessional && persistedProfessional.name) {
      return persistedProfessional;
    }
    
    // Then, try sessionStorage directly (fallback)
    try {
      const stored = sessionStorage.getItem('fireguide_selected_professional');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.name) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load professional from sessionStorage:', error);
    }
    
    // Fallback to defaults
    return null;
  };

  const resolvedProfessionalData = getResolvedProfessional();
  const professionalToUse = resolvedProfessionalData || professional || defaultData;

  const compareExperienceLabels = useMemo(() => {
    const badges = (
      professionalToUse as {
        qualificationBadges?: { key: string; label: string }[];
      }
    ).qualificationBadges;
    if (!badges?.length) return [];
    return badges
      .filter((badge) => badge.key.startsWith("exp-"))
      .map((badge) => badge.label.trim())
      .filter(Boolean);
  }, [professionalToUse]);

  const displayExperience = useMemo(() => {
    if (!profileExperience) return null;
    return normalizeProfessionalProfileExperience(
      profileExperience,
      compareExperienceLabels
    );
  }, [profileExperience, compareExperienceLabels]);

  const professionalRecipientEmail = useMemo(() => {
    if (!profileDetails) return "";
    const email =
      typeof profileDetails.email === "string" ? profileDetails.email.trim() : "";
    return email.length > 0 ? email : "";
  }, [profileDetails]);

  const isSendMessageDisabled =
    isLoadingProfileDetails || professionalRecipientEmail.length === 0;

  const resetSendMessageForm = useCallback(() => {
    setMsgFullName("");
    setMsgEmail("");
    setMsgPhone("");
    setMsgSubject("");
    setMsgBody("");
    setIsSendingMessage(false);
  }, []);

  const onSendMessageModalOpenChange = useCallback(
    (open: boolean) => {
      setSendMessageOpen(open);
      if (!open) resetSendMessageForm();
    },
    [resetSendMessageForm]
  );

  const contactPhoneForCall = useMemo(() => {
    if (!profileDetails) return null;
    return resolveProfessionalDisplayPhone(profileDetails as Record<string, unknown>, null);
  }, [profileDetails]);

  const isCallNowDisabled =
    isLoadingProfileDetails || isCallNowBusy || contactPhoneForCall == null;

  const handleCallNow = useCallback(async () => {
    if (isCallNowBusy) return;

    if (isLoadingProfileDetails) {
      toast.message("Please wait", {
        description: "Loading contact details…",
      });
      return;
    }

    const phone = contactPhoneForCall;
    if (!phone) {
      toast.error("No phone number is available for this professional.");
      return;
    }

    setIsCallNowBusy(true);
    try {
      const copied = await copyTextToClipboard(phone);
      if (copied) {
        toast.success("Number copied");
      } else {
        toast.error("Could not copy the number. Opening your dialer so you can call manually.");
      }
      openTelDialer(phone);
    } finally {
      setIsCallNowBusy(false);
    }
  }, [contactPhoneForCall, isCallNowBusy, isLoadingProfileDetails]);

  // Merge professional data: API details (from View Profile) override list/defaults
  const prof = {
    ...defaultData,
    ...professionalToUse,
    name: profileDetails?.name ?? professionalToUse.name ?? defaultData.name,
    rating: profileDetails?.rating ?? professionalToUse.rating ?? defaultData.rating,
    reviewCount: profileDetails?.total_reviews ?? professionalToUse.reviewCount ?? defaultData.reviewCount,
    responseTime: profileDetails?.response_time ?? professionalToUse.responseTime ?? defaultData.responseTime,
    location: profileDetails?.location ?? professionalToUse.location ?? defaultData.location,
    distance: profileDetails ? undefined : (professionalToUse.distance ?? defaultData.distance),
    verified: profileDetails?.verified ?? (professionalToUse.verified !== undefined ? professionalToUse.verified : defaultData.verified),
    photo: profileDetails?.profile_image
      ? profileDetails.profile_image
      : profileDetails?.initials
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profileDetails.initials)}&background=EF4444&color=fff&size=256`
        : (professionalToUse.photo || defaultData.photo),
    bio: professionalToUse.bio || defaultData.bio,
    certifications: profileCertifications.length > 0
      ? profileCertifications.map((c) => ({
          id: c.id,
          name: c.name,
          year: new Date(c.created_at).getFullYear().toString(),
          description: c.description
        }))
      : (professionalToUse?.certifications || []),
    insurance: defaultData.insurance,
    experience: defaultData.experience
  };

  const handleSendMessageSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const name = msgFullName.trim();
      const email = msgEmail.trim();
      const subject = msgSubject.trim();
      const messageText = msgBody.trim();
      const phone = msgPhone.trim();

      if (!name) {
        toast.error("Please enter your full name.");
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Please enter a valid email address.");
        return;
      }
      if (!subject) {
        toast.error("Please enter a subject.");
        return;
      }
      if (!messageText) {
        toast.error("Please enter a message.");
        return;
      }

      if (!professionalRecipientEmail) {
        toast.error(
          "We could not find this professional's email. Please use Call Now or Book & Pay."
        );
        return;
      }

      setIsSendingMessage(true);
      try {
        const successText = await sendProfessionalMail({
          full_name: name,
          pro_email: professionalRecipientEmail,
          email,
          phone: phone || "",
          subject,
          message: messageText,
        });
        toast.success(successText);
        setSendMessageOpen(false);
        resetSendMessageForm();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send message. Please try again.";
        toast.error(message);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [
      msgFullName,
      msgEmail,
      msgPhone,
      msgSubject,
      msgBody,
      professionalRecipientEmail,
      resetSendMessageForm,
    ]
  );

  // Map API reviews to display format
  const formatReviewDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Show latest 3 reviews (most recent first); total count in title
  const mappedReviews = React.useMemo(() => {
    const sorted = [...reviews].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted.slice(0, 3).map((review) => ({
      id: review.id,
      author: review.name,
      date: formatReviewDate(review.created_at),
      rating: parseFloat(review.rating) || 0,
      text: review.feedback
    }));
  }, [reviews]);

  const reviewCount = reviews.length;

  // Pricing from API response: size, number_of_people, price (displayed in Pricing section)
  const pricing = useMemo(
    () =>
      profilePricing.map((item) => ({
        service: `${item.size.charAt(0).toUpperCase() + item.size.slice(1)} property (${item.people?.number_of_people ?? item.size})`,
        price: `£${(Number(item.price) || 0).toFixed(2)}`,
      })),
    [profilePricing]
  );

  const PRICING_PAGE_SIZE = 3;
  const pricingPageCount = Math.max(1, Math.ceil(pricing.length / PRICING_PAGE_SIZE));
  const pagedPricing = useMemo(() => {
    const start = pricingPageIndex * PRICING_PAGE_SIZE;
    return pricing.slice(start, start + PRICING_PAGE_SIZE);
  }, [pricing, pricingPageIndex]);

  useEffect(() => {
    setPricingPageIndex(0);
  }, [professionalIdNum]);

  useEffect(() => {
    setPricingPageIndex((prev) => Math.min(prev, Math.max(0, pricingPageCount - 1)));
  }, [pricingPageCount]);

  // Available dates from API: sort by date and show latest 3 (next 3 upcoming)
  const availableDates = useMemo(() => {
    if (!availableDatesData || availableDatesData.length === 0) return [];
    return [...availableDatesData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [availableDatesData]);

  // Latest 3 certifications for the section; all shown in View More modal
  const latestCertifications = useMemo(() => {
    if (!profileCertifications.length) return [];
    return [...profileCertifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [profileCertifications]);

  const displayMemberships = useMemo(
    () => profileMemberships.filter((item) => isMembershipVerified(item.status)),
    [profileMemberships]
  );

  const isCertificationVerified = (status: string | undefined | null): boolean => {
    const normalized = (status ?? "").toLowerCase().trim();
    return normalized === "verified" || normalized === "approved";
  };

  const renderCertificationStatusBadge = (status: string | undefined | null) =>
    isCertificationVerified(status) ? (
      <Badge className="mt-2 border border-green-200 bg-green-100 text-green-700 hover:bg-green-100">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    ) : (
      <Badge className="mt-2 border border-red-200 bg-red-100 text-red-700 hover:bg-red-100">
        Not Verified
      </Badge>
    );

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatWorkingDayLabel = (day?: string | null) => {
    if (!day) return 'Day';
    const normalized = day.trim().toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const formatWorkingTime = (value?: string | null) => {
    if (!value) return '';
    const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return value;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  };

  const formatWorkingHoursRange = (entry: WorkingDayHourRecord) => {
    const closed =
      entry.is_closed === true ||
      entry.is_closed === 1 ||
      (typeof entry.is_closed === 'string' && entry.is_closed === '1');
    if (closed) return 'Closed';
    const start = formatWorkingTime(entry.start_time);
    const end = formatWorkingTime(entry.end_time);
    if (start && end) return `${start} – ${end}`;
    if (start || end) return start || end;
    return 'Not set';
  };

  const handleBookNow = useCallback(async () => {
    if (!onBook) return;
    setIsBooking(true);
    try {
      await onBook();
    } finally {
      setIsBooking(false);
    }
  }, [onBook]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8 md:pb-12">
      {/* Header — same logo as compare / booking flow */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/" className="flex items-center hover:opacity-90 transition-opacity" aria-label="Go to home">
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="text-[#0A1A2F] shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white py-4 px-6 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <a href="/" className="hover:text-red-600 transition-colors">
              Home
            </a>
            {!fromFeatured && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button type="button" onClick={onBack} className="hover:text-red-600 transition-colors">
                  Compare Professionals
                </button>
              </>
            )}
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{prof.name}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6 lg:items-start">
            {/* Left column: profile header and detail cards */}
            <div className="lg:col-span-2">
              {/* Profile Header */}
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="relative">
                      <img
                        src={prof.photo}
                        alt={prof.name}
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                      {prof.verified && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                          <h1 className="text-[#0A1A2F] mb-2">{prof.name}</h1>
                          {prof.verified && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mb-3">
                              <Shield className="w-3 h-3 mr-1" />
                              Verified Professional
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        {renderStars(prof.rating)}
                        <span className="text-sm">
                          <span className="font-semibold">{prof.rating}</span>
                          <span className="text-gray-500"> ({prof.reviewCount} reviews)</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{prof.location}{prof.distance != null ? ` • ${prof.distance} miles` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-green-600">{prof.responseTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 space-y-6" aria-label="Professional profile details">
              {/* Bio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{prof.bio}</p>
                </CardContent>
              </Card>

              {/* Qualifications & Certifications — latest 3; View More opens scrollable modal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Qualifications & Certifications ({profileCertifications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingQualifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                      <span className="text-gray-600">Loading qualifications...</span>
                    </div>
                  ) : latestCertifications.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {latestCertifications.map((cert) => {
                          const year = new Date(cert.created_at).getFullYear();
                          return (
                            <div key={cert.id} className="flex items-start justify-between py-3 border-b last:border-0">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Award className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{cert.name}</p>
                                  {cert.description && (
                                    <p className="text-sm text-gray-600 mt-0.5">{cert.description}</p>
                                  )}
                                  <p className="text-sm text-gray-500 mt-1">Certified {year}</p>
                                  {renderCertificationStatusBadge(cert.status)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button variant="outline" className="w-full mt-4" onClick={() => setCertificationsModalOpen(true)}>
                        View More
                      </Button>
                      <Dialog open={certificationsModalOpen} onOpenChange={setCertificationsModalOpen}>
                        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0">
                          <DialogHeader className="shrink-0 border-b border-gray-100 text-left !m-0 !p-0">
                            <div className="px-6 pt-6 pb-5 pr-14 sm:px-8 sm:pt-7 sm:pb-5">
                              <DialogTitle className="text-base sm:text-lg font-semibold text-[#0A1A2F] leading-snug">
                                All Qualifications & Certifications ({profileCertifications.length})
                              </DialogTitle>
                            </div>
                          </DialogHeader>
                          <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 sm:px-6">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              {[...profileCertifications]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((cert) => {
                                  const year = new Date(cert.created_at).getFullYear();
                                  return (
                                    <div
                                      key={cert.id}
                                      className="rounded-lg border border-gray-200 p-3 h-full"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                          <Award className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-gray-900 break-words">{cert.name}</p>
                                          {cert.description && (
                                            <p className="text-sm text-gray-600 mt-0.5 break-words">{cert.description}</p>
                                          )}
                                          <p className="text-sm text-gray-500 mt-1">Certified {year}</p>
                                          {renderCertificationStatusBadge(cert.status)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No qualifications available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Insurance — professional-profile/insurance API; multiple coverage items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Insurance Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingInsurance ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                      <span className="text-gray-600">Loading insurance coverage...</span>
                    </div>
                  ) : profileInsurance && (profileInsurance.coverages?.length > 0 || profileInsurance.provider) ? (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        {profileInsurance.coverages?.map((item, index) => (
                          <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">{item.title}</p>
                            <p className="text-xl font-semibold text-gray-900">{item.price}</p>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-4" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Provider: {profileInsurance.provider}</span>
                        <span className="text-gray-600">Valid until: {profileInsurance.valid_until}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No insurance coverage available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Experience — professional-profile/experiences API */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingExperiences ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                      <span className="text-gray-600">Loading experience data...</span>
                    </div>
                  ) : displayExperience ? (
                    <>
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-3xl text-red-600 mb-1">{displayExperience.years_experience}</p>
                          <p className="text-sm text-gray-600">Years Experience</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-3xl text-red-600 mb-1">{displayExperience.assessments_completed}</p>
                          <p className="text-sm text-gray-600">Assessments Completed</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Briefcase className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No experience data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Professional memberships — professional/details-page/get-all API */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Professional Memberships ({displayMemberships.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMemberships ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                      <span className="text-gray-600">Loading memberships...</span>
                    </div>
                  ) : displayMemberships.length > 0 ? (
                    <div className="space-y-3">
                      {displayMemberships.map((membership) => {
                        const memberSince = formatMembershipSince(membership.member_since);
                        return (
                          <div
                            key={membership.id}
                            className="flex items-start gap-3 rounded-lg border border-gray-200 p-4"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                              {membership.logo?.trim() ? (
                                <MembershipLogoImage
                                  logoPath={membership.logo.trim()}
                                  alt={`${membership.organization_name} logo`}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Award className="h-6 w-6 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="font-medium text-gray-900 break-words">
                                  {membership.organization_name}
                                </p>
                                <Badge className="border border-green-200 bg-green-100 text-green-700 hover:bg-green-100 shrink-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              </div>
                              {membership.membership_type ? (
                                <p className="text-sm text-gray-700 mt-1">{membership.membership_type}</p>
                              ) : null}
                              <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                                {membership.reference_id ? (
                                  <p>Reference: {membership.reference_id}</p>
                                ) : null}
                                {memberSince ? <p>Member since: {memberSince}</p> : null}
                                {membership.note ? (
                                  <p className="text-gray-600 break-words">{membership.note}</p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No verified professional memberships available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Reviews ({reviewCount})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingReviews ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                      <span className="text-gray-600">Loading reviews...</span>
                    </div>
                  ) : mappedReviews.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {mappedReviews.map((review) => (
                          <div key={review.id} className="pb-4 border-b last:border-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-900">{review.author}</p>
                                <p className="text-sm text-gray-500">{review.date}</p>
                              </div>
                              {renderStars(review.rating)}
                            </div>
                            <p className="text-gray-700">{review.text}</p>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full mt-4" onClick={() => setReviewsModalOpen(true)}>
                        View More
                      </Button>
                      {/* All Reviews Modal — scrollable */}
                      <Dialog open={reviewsModalOpen} onOpenChange={setReviewsModalOpen}>
                        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
                          <DialogHeader className="flex-shrink-0 border-b pl-6 pr-14 py-4">
                            <DialogTitle className="text-[#0A1A2F]">All Reviews ({reviewCount})</DialogTitle>
                          </DialogHeader>
                          <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4 space-y-4">
                            {[...reviews]
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((review) => (
                                <div key={review.id} className="pb-4 border-b last:border-0 last:pb-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-gray-900">{review.name}</p>
                                      <p className="text-sm text-gray-500">{formatReviewDate(review.created_at)}</p>
                                    </div>
                                    {renderStars(parseFloat(review.rating) || 0)}
                                  </div>
                                  <p className="text-gray-700 text-sm">{review.feedback}</p>
                                </div>
                              ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No reviews available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>

            {/* Right Column - Booking Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6 lg:top-24">
                {onBook ? (
                  <Button
                    type="button"
                    className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
                    disabled={isBooking}
                    aria-busy={isBooking}
                    onClick={() => void handleBookNow()}
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                        Booking…
                      </>
                    ) : (
                      "Book Now"
                    )}
                  </Button>
                ) : null}

                {/* Pricing — API data (professional_id from Professional List → View Profile) */}
                {/* <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F]">Pricing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPricing ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                        <span className="text-gray-600">Loading pricing...</span>
                      </div>
                    ) : pricing.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-sm">
                        No pricing available
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {pagedPricing.map((item, index) => (
                            <div
                              key={pricingPageIndex * PRICING_PAGE_SIZE + index}
                              className="flex justify-between items-center py-2 border-b last:border-0"
                            >
                              <span className="text-sm text-gray-700">{item.service}</span>
                              <span className="font-semibold text-gray-900">{item.price}</span>
                            </div>
                          ))}
                        </div>
                        {pricing.length > PRICING_PAGE_SIZE && (
                          <div className="flex flex-col gap-2 mt-3">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                disabled={pricingPageIndex <= 0}
                                onClick={() => setPricingPageIndex((p) => Math.max(0, p - 1))}
                              >
                                Previous
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                disabled={pricingPageIndex >= pricingPageCount - 1}
                                onClick={() =>
                                  setPricingPageIndex((p) => Math.min(pricingPageCount - 1, p + 1))
                                }
                              >
                                Next
                              </Button>
                            </div>
                            <p className="text-center text-xs text-gray-500">
                              Page {pricingPageIndex + 1} of {pricingPageCount}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card> */}

                {/* Availability Calendar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F]">Available Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAvailableDates ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                        <span className="text-gray-600">Loading available dates...</span>
                      </div>
                    ) : availableDates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No available dates</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableDates.map((dateInfo) => (
                          <div
                            key={dateInfo.date}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedDate === dateInfo.date
                                ? "border-red-600 bg-red-50"
                                : "border-gray-200 hover:border-red-300"
                            }`}
                            onClick={() => setSelectedDate(dateInfo.date)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">
                                {formatDate(dateInfo.date)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {dateInfo.slots.length} slot{dateInfo.slots.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            {selectedDate === dateInfo.date && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {dateInfo.slots.map((slot, index) => (
                                  <button
                                    key={index}
                                    className="px-3 py-1 text-xs bg-white border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Working Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F]">Working Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingWorkingHours ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                        <span className="text-gray-600">Loading working hours...</span>
                      </div>
                    ) : workingHours.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No working hours available</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {workingHours.map((entry) => {
                          const dayKey = entry.day ?? entry.week_day ?? "day";
                          return (
                            <div
                              key={`${dayKey}-${entry.id ?? ""}`}
                              className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                            >
                              <span className="text-sm font-medium text-gray-900">
                                {formatWorkingDayLabel(dayKey)}
                              </span>
                              <span className="text-sm text-gray-600 text-right">
                                {formatWorkingHoursRange(entry)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F]">Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={isCallNowDisabled}
                        aria-busy={isCallNowBusy}
                        aria-label={
                          isCallNowDisabled && !isCallNowBusy
                            ? "Call now unavailable: no phone number on file"
                            : "Call now: copy number to clipboard and open phone dialer"
                        }
                        title={
                          isCallNowDisabled && !isLoadingProfileDetails && !isCallNowBusy
                            ? "No phone number available"
                            : undefined
                        }
                        onClick={() => void handleCallNow()}
                      >
                        {isCallNowBusy ? (
                          <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Phone className="w-4 h-4 mr-2 shrink-0" aria-hidden />
                        )}
                        Call Now
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={isSendMessageDisabled}
                        aria-label={
                          isSendMessageDisabled
                            ? "Send message unavailable: no email on file"
                            : "Send message to this professional"
                        }
                        title={
                          isSendMessageDisabled && !isLoadingProfileDetails
                            ? "No email address available"
                            : undefined
                        }
                        onClick={() => setSendMessageOpen(true)}
                      >
                        <Mail className="w-4 h-4 mr-2 shrink-0" aria-hidden />
                        Send Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={sendMessageOpen} onOpenChange={onSendMessageModalOpenChange}>
        <DialogContent
          className="max-w-md w-full max-h-[min(88vh,calc(100vh-7rem))] overflow-hidden p-0 flex flex-col rounded-2xl"
        >
          <form onSubmit={(e) => void handleSendMessageSubmit(e)} className="flex min-h-0 w-full flex-col">
            <DialogHeader className="flex-shrink-0 border-b border-gray-100 px-5 pt-5 pb-4 pr-12 sm:px-6 sm:pt-6">
              <DialogTitle className="text-lg sm:text-xl font-bold text-[#0A1A2F] tracking-tight leading-tight">
                Send Us a Message
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-gray-600 mt-2 max-w-prose">
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="contact-msg-name" className="text-sm font-semibold text-gray-900">
                    Full Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="contact-msg-name"
                    name="fullName"
                    autoComplete="name"
                    placeholder="John Smith"
                    value={msgFullName}
                    onChange={(e) => setMsgFullName(e.target.value)}
                    className="h-11 border-gray-300 text-base"
                    disabled={isSendingMessage}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="contact-msg-email" className="text-sm font-semibold text-gray-900">
                    Email Address <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="contact-msg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="john@example.com"
                    value={msgEmail}
                    onChange={(e) => setMsgEmail(e.target.value)}
                    className="h-11 border-gray-300 text-base"
                    disabled={isSendingMessage}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-msg-phone" className="text-sm font-semibold text-gray-900">
                  Phone Number <span className="font-normal text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="contact-msg-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="07123 456789"
                  value={msgPhone}
                  onChange={(e) => setMsgPhone(e.target.value)}
                  className="h-11 border-gray-300 text-base"
                  disabled={isSendingMessage}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-msg-subject" className="text-sm font-semibold text-gray-900">
                  Subject <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="contact-msg-subject"
                  name="subject"
                  placeholder="How can we help?"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  className="h-11 border-gray-300 text-base"
                  disabled={isSendingMessage}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-msg-body" className="text-sm font-semibold text-gray-900">
                  Message <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="contact-msg-body"
                  name="message"
                  placeholder="Tell us more about your inquiry..."
                  rows={7}
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  className="min-h-[11rem] sm:min-h-[12.5rem] max-h-[min(40vh,18rem)] border-gray-300 resize-y text-base leading-relaxed"
                  disabled={isSendingMessage}
                />
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-4 sm:px-6 space-y-2.5">
              <Button
                type="submit"
                disabled={isSendingMessage}
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold text-base gap-2 shadow-sm"
              >
                {isSendingMessage ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-5 w-5 shrink-0" aria-hidden />
                )}
                Send Message
              </Button>
              <p className="text-center text-xs text-gray-500 leading-relaxed">
                We typically respond within 24 hours during business days
              </p>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}