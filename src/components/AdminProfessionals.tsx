import React, { useState, useEffect, useRef } from "react";
import { Search, Star, MoreVertical, Mail, Phone, MapPin, CheckCircle, Clock, XCircle, Eye, Ban, Award, FileText, Download, AlertCircle, Edit2, Image, File, Loader2, Upload, MessageSquare } from "lucide-react";
import { getApiToken, getUserEmail, getUserFullName } from "../lib/auth";
import { resolveApiBaseUrl } from "../lib/apiBaseUrl";
import { getAdminProfessionalSummary, AdminProfessionalSummaryData, getAdminProfessionals, AdminProfessionalListItem, adminProfessionalTakeAction, AdminProfessionalStatus, getAdminProfessionalSingle, AdminProfessionalSingleData, AdminProfessionalExperience, AdminProfessionalMembershipItem, adminProfessionalUpdate, adminProfessionalUploadProfileImage, adminProfessionalChangeCertificateStatus, adminProfessionalChangeServiceStatus, adminProfessionalChangeExperienceStatus, adminApproveInsuranceCoverage, adminRejectInsuranceCoverage, adminApproveProfessionalIdentity, adminRejectProfessionalIdentity, adminApproveMembership, adminRejectMembership } from "../api/adminService";
import { createReview } from "../api/reviewsService";
import { buildMembershipEvidenceViewUrls, buildMembershipLogoViewUrls, getMembershipMediaUrlCandidates } from "../api/membershipService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import axios from "axios";

function MembershipMediaImage({
  path,
  alt,
  className,
  onExhausted,
}: {
  path: string;
  alt: string;
  className?: string;
  onExhausted?: () => void;
}) {
  const token = getApiToken() ?? "";
  const urls = React.useMemo(
    () => getMembershipMediaUrlCandidates(path, { apiToken: token }),
    [path, token]
  );
  const [urlIndex, setUrlIndex] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const src = urls[urlIndex] ?? "";

  React.useEffect(() => {
    setUrlIndex(0);
    setLoaded(false);
    setFailed(false);
  }, [path, urls]);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={`${className ?? ""}${loaded ? "" : " opacity-0"}`}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setUrlIndex((current) => {
          if (current >= urls.length - 1) {
            setFailed(true);
            onExhausted?.();
            return current;
          }
          setLoaded(false);
          return current + 1;
        });
      }}
    />
  );
}

export function AdminProfessionals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    "Search professionals by name or email..."
  );
  const [filterStatus, setFilterStatus] = useState("all");
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  // const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDetailLoading, setEditDetailLoading] = useState(false);
  const [editDetail, setEditDetail] = useState<AdminProfessionalSingleData | null>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [pendingEditImageFile, setPendingEditImageFile] = useState<File | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    business_name: "",
    email: "",
    phone: "",
    location: "",
    post_code: "",
    bio: "",
    responseTime: "",
    status: "pending" as "approved" | "pending" | "suspended",
  });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  // const [rejectionReason, setRejectionReason] = useState("");
  // const [rejectionMessage, setRejectionMessage] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [serviceRejectModalOpen, setServiceRejectModalOpen] = useState(false);
  const [serviceReuploadModalOpen, setServiceReuploadModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [serviceRejectionNote, setServiceRejectionNote] = useState("");
  const [serviceReuploadNote, setServiceReuploadNote] = useState("");
  const [filePreviewModalOpen, setFilePreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [filePreviewUrlIndex, setFilePreviewUrlIndex] = useState(0);
  const [filePreviewFailed, setFilePreviewFailed] = useState(false);
  const [evidenceStatuses, setEvidenceStatuses] = useState<{ [key: string]: string }>({});
  const [professionalSummary, setProfessionalSummary] = useState<AdminProfessionalSummaryData | null>(null);
  const [professionalSummaryLoading, setProfessionalSummaryLoading] = useState(false);
  const [professionalsList, setProfessionalsList] = useState<AdminProfessionalListItem[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [profileDetail, setProfileDetail] = useState<AdminProfessionalSingleData | null>(null);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);
  const [certificateUpdatingId, setCertificateUpdatingId] = useState<string | null>(null);
  const [experienceStatuses, setExperienceStatuses] = useState<{ [key: string]: string }>({});
  const [experienceUpdatingId, setExperienceUpdatingId] = useState<string | null>(null);
  const [insuranceStatuses, setInsuranceStatuses] = useState<{ [key: string]: string }>({});
  const [insuranceUpdatingId, setInsuranceUpdatingId] = useState<string | null>(null);
  const [identityStatuses, setIdentityStatuses] = useState<{ [key: string]: string }>({});
  const [identityUpdatingId, setIdentityUpdatingId] = useState<string | null>(null);
  const [membershipStatuses, setMembershipStatuses] = useState<{ [key: string]: string }>({});
  const [membershipUpdatingId, setMembershipUpdatingId] = useState<string | null>(null);
  const [serviceUpdatingId, setServiceUpdatingId] = useState<number | string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackRating, setFeedbackRating] = useState("");
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const updatePlaceholder = () => {
      setSearchPlaceholder(
        mq.matches ? "Search" : "Search professionals by name or email..."
      );
    };
    updatePlaceholder();
    mq.addEventListener("change", updatePlaceholder);
    return () => mq.removeEventListener("change", updatePlaceholder);
  }, []);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setProfessionalSummaryLoading(true);
    getAdminProfessionalSummary({ api_token: token })
      .then((res) => {
        if (!cancelled && res.success && res.data?.data) setProfessionalSummary(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setProfessionalSummary(null);
      })
      .finally(() => {
        if (!cancelled) setProfessionalSummaryLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setProfessionalsLoading(true);
    getAdminProfessionals({ api_token: token })
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.data)) setProfessionalsList(res.data);
        else if (!cancelled) setProfessionalsList([]);
      })
      .catch(() => {
        if (!cancelled) setProfessionalsList([]);
      })
      .finally(() => {
        if (!cancelled) setProfessionalsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const formatJoinDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return "—";
    }
  };

  const DEFAULT_AVATAR = "https://via.placeholder.com/96?text=No+Photo";
  const EVIDENCE_BASE_URL = resolveApiBaseUrl().replace(/\/api\/?$/, "");

  const resolveEvidenceUrl = (evidence: string | null | undefined): string | null => {
    if (!evidence?.trim()) return null;
    const e = evidence.trim();
    if (e.startsWith("http://") || e.startsWith("https://")) return e;
    if (e.startsWith("/")) return `${EVIDENCE_BASE_URL}${e}`;
    return `${EVIDENCE_BASE_URL}/certificates/${encodeURIComponent(e)}`;
  };

  const mapVerificationUiStatus = (status: unknown): "approved" | "rejected" | "pending" => {
    const normalized = String(status ?? "pending").toLowerCase();
    if (normalized === "verified" || normalized === "approved") return "approved";
    if (normalized === "rejected") return "rejected";
    return "pending";
  };

  const getProfessionalExperiences = (
    data: AdminProfessionalSingleData | null | undefined
  ): AdminProfessionalExperience[] => {
    if (!data) return [];
    return data.experience ?? data.experiences ?? [];
  };

  const getProfessionalMemberships = (
    data: AdminProfessionalSingleData | null | undefined
  ): AdminProfessionalMembershipItem[] => {
    if (!data) return [];
    return data.membership ?? data.memberships ?? [];
  };

  const formatMemberSince = (value: string | null | undefined): string => {
    if (!value?.trim()) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 1971) return "—";
    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const verificationStatusLabel = (status: "approved" | "rejected" | "pending"): string => {
    if (status === "approved") return "Verified";
    if (status === "rejected") return "Rejected";
    return "Pending";
  };

  const profileModalStatusBadgeClass = (
    variant: "approved" | "rejected" | "pending"
  ): string => {
    const base = "rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0";
    if (variant === "approved") {
      return `${base} border-green-200 bg-green-100 text-green-700`;
    }
    if (variant === "rejected") {
      return `${base} border-red-200 bg-red-100 text-red-700`;
    }
    return `${base} border-yellow-200 bg-yellow-100 text-yellow-700`;
  };

  const isAdminActionSuccess = (res: { success?: boolean; status?: boolean | string } | null | undefined): boolean => {
    if (!res) return false;
    if (res.success === true) return true;
    if (res.status === true) return true;
    if (typeof res.status === "string" && res.status.toLowerCase() === "success") return true;
    return false;
  };

  const filePreviewDisplayName = (name: string | undefined | null): string => {
    const n = (name ?? "").trim();
    if (!n) return "Document";
    if (/^https?:\/\//i.test(n)) {
      try {
        const last = new URL(n).pathname.split("/").filter(Boolean).pop();
        return last ? decodeURIComponent(last) : "Document";
      } catch {
        return "Document";
      }
    }
    return n;
  };

  type ProfessionalDisplay = {
    id: number;
    name: string;
    email: string;
    phone: string;
    location: string;
    photo: string;
    rating: number;
    reviewCount: number;
    totalBookings: number;
    completedBookings: number;
    responseTime: string;
    status: string;
    joinDate: string;
    /** List card: certificate names from API `certificates` */
    certificateNames: string[];
    /** List card: experience / expertise labels from API `experience` */
    experienceNames: string[];
    /** Legacy: selected service names from API `services` (modals / actions still use where needed) */
    qualifications: string[];
    raw?: AdminProfessionalListItem;
  };

  // Mock services data for professionals
  const professionalServices = {
    1: [ // Sarah Mitchell's services
      {
        id: "s1",
        name: "Fire Risk Assessment",
        status: "approved",
        evidenceFile: "Fire_Risk_Assessment_Certificate.pdf",
        evidenceType: "pdf",
        uploadDate: "15 Oct 2024",
        verifiedDate: "18 Oct 2024",
        verifiedBy: "Admin Team"
      },
      {
        id: "s2",
        name: "Fire Safety Training",
        status: "approved",
        evidenceFile: "Training_License.pdf",
        evidenceType: "pdf",
        uploadDate: "15 Oct 2024",
        verifiedDate: "18 Oct 2024",
        verifiedBy: "Admin Team"
      },
      {
        id: "s3",
        name: "Emergency Evacuation Planning",
        status: "pending",
        evidenceFile: "Evacuation_Certificate.jpg",
        evidenceType: "image",
        uploadDate: "5 Dec 2024",
        verifiedDate: null,
        verifiedBy: null
      }
    ],
    2: [ // James Patterson's services
      {
        id: "s4",
        name: "Fire Risk Assessment",
        status: "approved",
        evidenceFile: "FRA_Certificate_2024.pdf",
        evidenceType: "pdf",
        uploadDate: "20 Mar 2024",
        verifiedDate: "22 Mar 2024",
        verifiedBy: "Admin Team"
      },
      {
        id: "s5",
        name: "Fire Alarm Installation",
        status: "rejected",
        evidenceFile: "Fire_Alarm_License_Old.pdf",
        evidenceType: "pdf",
        uploadDate: "20 Mar 2024",
        rejectedDate: "25 Mar 2024",
        rejectionReason: "Certificate expired. Please upload current certification."
      }
    ],
    3: [ // David Chen's services
      {
        id: "s6",
        name: "Fire Risk Assessment",
        status: "approved",
        evidenceFile: "FRA_Qualification.pdf",
        evidenceType: "pdf",
        uploadDate: "10 Dec 2023",
        verifiedDate: "12 Dec 2023",
        verifiedBy: "Admin Team"
      },
      {
        id: "s7",
        name: "Fire Safety Audit",
        status: "approved",
        evidenceFile: "Audit_Certificate.pdf",
        evidenceType: "pdf",
        uploadDate: "10 Dec 2023",
        verifiedDate: "12 Dec 2023",
        verifiedBy: "Admin Team"
      }
    ],
    4: [ // Emily Roberts's services (pending professional)
      {
        id: "s8",
        name: "Fire Risk Assessment",
        status: "pending",
        evidenceFile: "FRA_Certificate_New.pdf",
        evidenceType: "pdf",
        uploadDate: "1 Nov 2025",
        verifiedDate: null,
        verifiedBy: null
      },
      {
        id: "s9",
        name: "Fire Safety Training",
        status: "pending",
        evidenceFile: null,
        evidenceType: null,
        uploadDate: null,
        verifiedDate: null,
        verifiedBy: null
      }
    ],
    5: [ // Robert Taylor's services
      {
        id: "s10",
        name: "Fire Risk Assessment",
        status: "approved",
        evidenceFile: "FRA_License.pdf",
        evidenceType: "pdf",
        uploadDate: "10 Jun 2024",
        verifiedDate: "12 Jun 2024",
        verifiedBy: "Admin Team"
      }
    ]
  };

  // Mock qualifications evidence data
  const qualificationsEvidence: { [key: number]: any[] } = {
    1: [ // Sarah Mitchell's evidence
      {
        id: "e1",
        fileName: "NEBOSH_Certificate_2024.pdf",
        fileType: "pdf",
        uploadDate: "Oct 15, 2024",
        status: "approved",
        approvedDate: "Oct 18, 2024",
        approvedBy: "Admin Team"
      },
      {
        id: "e2",
        fileName: "Fire_Safety_Level4_Certificate.jpg",
        fileType: "image",
        uploadDate: "Oct 15, 2024",
        status: "approved",
        approvedDate: "Oct 18, 2024",
        approvedBy: "Admin Team"
      },
      {
        id: "e3",
        fileName: "Insurance_Certificate_2024.pdf",
        fileType: "pdf",
        uploadDate: "Dec 5, 2024",
        status: "pending",
        approvedDate: null,
        approvedBy: null
      }
    ],
    4: [ // Emily Roberts's evidence (pending professional)
      {
        id: "e4",
        fileName: "Level3_Fire_Safety_Certificate.pdf",
        fileType: "pdf",
        uploadDate: "Nov 1, 2025",
        status: "pending",
        approvedDate: null,
        approvedBy: null
      },
      {
        id: "e5",
        fileName: "5_Years_Experience_Letter.pdf",
        fileType: "pdf",
        uploadDate: "Nov 1, 2025",
        status: "pending",
        approvedDate: null,
        approvedBy: null
      },
      {
        id: "e6",
        fileName: "ID_Proof.jpg",
        fileType: "image",
        uploadDate: "Nov 1, 2025",
        status: "approved",
        approvedDate: "Nov 3, 2025",
        approvedBy: "Admin Team"
      }
    ]
  };

  const parseProfessionalCount = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  };

  const formatResponseTime = (value: string | null | undefined): string => {
    if (value == null || String(value).trim() === "") return "N/A";
    return String(value);
  };

  // API returns "rejected"; UI shows "suspended" for the same state
  const mapListToDisplay = (list: AdminProfessionalListItem[]): ProfessionalDisplay[] =>
    list.map((p) => ({
      id: p.id,
      name: p.name ?? "—",
      email: p.email ?? "—",
      phone: p.number ?? "—",
      location: p.business_location ?? "—",
      photo: p.professional_image ?? DEFAULT_AVATAR,
      rating: p.rating ?? 0,
      reviewCount: p.review ?? 0,
      totalBookings: parseProfessionalCount(p.booking),
      completedBookings: parseProfessionalCount(p.completed_booking),
      responseTime: formatResponseTime(p.response_time),
      status: (p.status === "rejected" ? "suspended" : p.status) ?? "pending",
      joinDate: formatJoinDate(p.created_at),
      certificateNames: Array.isArray(p.certificates)
        ? p.certificates
            .map((c) => (typeof c?.name === "string" ? c.name.trim() : ""))
            .filter((s) => s.length > 0)
        : [],
      experienceNames: Array.isArray(p.experience)
        ? p.experience
            .map((e) => {
              const n = e?.experience_name;
              return typeof n === "string" ? n.trim() : "";
            })
            .filter((s) => s.length > 0)
        : [],
      qualifications: Array.isArray(p.services) ? p.services : [],
      raw: p,
    }));

  const [professionals, setProfessionals] = useState<ProfessionalDisplay[]>([]);

  useEffect(() => {
    setProfessionals(mapListToDisplay(professionalsList));
  }, [professionalsList]);

  // Fetch professional profile detail when modal opens
  useEffect(() => {
    if (!profileModalOpen || !selectedProfessional?.id) {
      setProfileDetail(null);
      return;
    }
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setProfileDetailLoading(true);
    setProfileDetail(null);
    getAdminProfessionalSingle({ api_token: token, professional_id: selectedProfessional.id })
      .then((res) => {
        if (!cancelled && res.success && res.data) setProfileDetail(res.data);
      })
      .catch(() => {
        if (!cancelled) setProfileDetail(null);
      })
      .finally(() => {
        if (!cancelled) setProfileDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [profileModalOpen, selectedProfessional?.id]);

  useEffect(() => {
    if (!editModalOpen || !selectedProfessional?.id) {
      setEditDetail(null);
      setEditImagePreview(null);
      setPendingEditImageFile(null);
      return;
    }
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setEditDetailLoading(true);
    setEditDetail(null);
    getAdminProfessionalSingle({ api_token: token, professional_id: selectedProfessional.id })
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const data = res.data;
        setEditDetail(data);
        const uiStatus =
          data.status === "rejected" ? "suspended" : data.status === "approved" ? "approved" : "pending";
        setEditForm({
          name: data.name ?? "",
          business_name: data.business_name ?? "",
          email: data.email ?? "",
          phone: data.number ?? "",
          location: data.business_location ?? "",
          post_code: data.post_code ?? "",
          bio: data.about ?? "",
          responseTime: data.response_time ?? "",
          status: uiStatus as "approved" | "pending" | "suspended",
        });
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load professional details");
        }
      })
      .finally(() => {
        if (!cancelled) setEditDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editModalOpen, selectedProfessional?.id]);

  const refetchProfessionalsList = () => {
    const token = getApiToken();
    if (!token) return;
    getAdminProfessionals({ api_token: token })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setProfessionalsList(res.data);
      })
      .catch(() => setProfessionalsList([]));
  };

  const filteredProfessionals = professionals.filter((professional) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !search ||
      professional.name.toLowerCase().includes(search) ||
      professional.email.toLowerCase().includes(search);
    const matchesFilter = filterStatus === "all" || professional.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const derivedStats = {
    total: professionals.length,
    approved: professionals.filter((p) => p.status === "approved").length,
    pending: professionals.filter((p) => p.status === "pending").length,
    suspended: professionals.filter((p) => p.status === "suspended").length,
  };
  const stats = {
    total: professionalSummary != null ? professionalSummary.total_professional : derivedStats.total,
    approved: professionalSummary != null ? professionalSummary.approved_professional : derivedStats.approved,
    pending: professionalSummary != null ? professionalSummary.pending_professional : derivedStats.pending,
    suspended: professionalSummary != null ? professionalSummary.suspend_professional : derivedStats.suspended,
  };

  const refetchSummary = () => {
    const token = getApiToken();
    if (!token) return;
    getAdminProfessionalSummary({ api_token: token })
      .then((res) => { if (res.success && res.data?.data) setProfessionalSummary(res.data.data); })
      .catch(() => setProfessionalSummary(null));
  };

  const handleUpdateProfessionalStatus = async (professional: ProfessionalDisplay, status: AdminProfessionalStatus) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setStatusUpdatingId(professional.id);
    try {
      const res = await adminProfessionalTakeAction({
        api_token: token,
        professional_id: professional.id,
        status,
      });
      if (res.success && res.data) {
        const newStatus = res.data.new_status;
        setProfessionalsList((prev) =>
          prev.map((p) => (p.id === professional.id ? { ...p, status: newStatus } : p))
        );
        refetchSummary();
        if (status === "approved") toast.success(`${professional.name} has been approved`);
        else if (status === "rejected") toast.success(`${professional.name}'s status has been updated`);
        else toast.success(`${professional.name}'s status has been updated`);
      } else {
        toast.error(res.message || "Failed to update status");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleApprove = (professional: any) => {
    setSelectedProfessional(professional);
    setApprovalModalOpen(true);
  };

  const handleReject = (professional: any) => {
    void handleUpdateProfessionalStatus(professional, "rejected");
  };

  const handleEdit = (professional: any) => {
    setSelectedProfessional(professional);
    setProfileModalOpen(false);
    setEditModalOpen(true);
  };

  const handleViewProfile = (professional: any) => {
    setSelectedProfessional(professional);
    setProfileModalOpen(true);
  };

  const handleSuspend = (professional: any) => {
    handleUpdateProfessionalStatus(professional, "rejected");
  };

  const handleReactivate = (professional: any) => {
    handleUpdateProfessionalStatus(professional, "approved");
  };

  const handleSendFeedback = (professional: ProfessionalDisplay) => {
    setSelectedProfessional(professional);
    setFeedbackName(getUserFullName() ?? "");
    setFeedbackEmail(getUserEmail() ?? "");
    setFeedbackRating("");
    setFeedbackHoverRating(0);
    setFeedbackMessage("");
    setFeedbackModalOpen(true);
  };

  const getProfessionalServiceLabel = (professional: ProfessionalDisplay): string => {
    const fromServices = professional.qualifications?.[0];
    const fromCertificates = professional.certificateNames?.[0];
    const fromExperience = professional.experienceNames?.[0];
    return fromServices || fromCertificates || fromExperience || "their services";
  };

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false);
    setFeedbackName("");
    setFeedbackEmail("");
    setFeedbackRating("");
    setFeedbackHoverRating(0);
    setFeedbackMessage("");
  };

  const submitFeedback = async () => {
    if (!selectedProfessional?.id) {
      toast.error("Professional ID is missing");
      return;
    }
    if (!feedbackName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    const emailTrimmed = feedbackEmail.trim();
    if (!emailTrimmed) {
      toast.error("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!feedbackRating) {
      toast.error("Please select a rating.");
      return;
    }
    if (!feedbackMessage.trim()) {
      toast.error("Please enter your feedback.");
      return;
    }
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in again.");
      return;
    }
    setSendingFeedback(true);
    try {
      const response = await createReview({
        api_token: token,
        name: feedbackName.trim(),
        email: emailTrimmed,
        rating: String(feedbackRating),
        feedback: feedbackMessage.trim(),
        professional_id: selectedProfessional.id,
      });

      const failed =
        response.status === "failed" ||
        response.status === "error" ||
        response.success === false;

      if (failed) {
        const validation = (response as { data?: Record<string, string[]> }).data;
        const emailErr = validation?.email?.[0];
        toast.error(emailErr || response.message || response.error || "Failed to send feedback.");
        return;
      }

      const ok =
        response.status === "success" ||
        response.success === true ||
        Boolean(response.message && !response.error);

      if (!ok) {
        toast.error(response.message || response.error || "Failed to send feedback.");
        return;
      }

      toast.success(response.message || "Thank you! Your feedback has been sent.");
      closeFeedbackModal();
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string; data?: Record<string, string[]> };
        const emailErr = d.data?.email?.[0];
        if (emailErr || d.message) {
          toast.error(emailErr || d.message || "Could not send feedback.");
          return;
        }
      }
      const err = e as { message?: string };
      toast.error(err?.message || "Could not send feedback.");
    } finally {
      setSendingFeedback(false);
    }
  };

  const mobileActionBtnClass =
    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200 disabled:cursor-not-allowed";

  const renderMobileProfessionalActions = (professional: ProfessionalDisplay) => {
    const isUpdating = statusUpdatingId === professional.id;
    const status = professional.status;

    return (
      <div className="space-y-2 border-t border-gray-100 pt-3 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-full"
          disabled={isUpdating}
          onClick={() => handleViewProfile(professional)}
        >
          <Eye className="mr-2 h-4 w-4 shrink-0" />
          View Full Profile
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-full"
          disabled={isUpdating}
          onClick={() => handleEdit(professional)}
        >
          <Edit2 className="mr-2 h-4 w-4 shrink-0" />
          Edit Professional
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-full"
          disabled={isUpdating || sendingFeedback}
          onClick={() => handleSendFeedback(professional)}
        >
          <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
          Send Feedback
        </Button>

        {status === "pending" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={mobileActionBtnClass}
              style={{
                backgroundColor: "#16a34a",
                border: "1px solid #16a34a",
                color: "#ffffff",
              }}
              disabled={isUpdating}
              onClick={() => handleApprove(professional)}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <CheckCircle className="mr-1.5 h-4 w-4 shrink-0" />
              )}
              Approve
            </button>
            <button
              type="button"
              className={mobileActionBtnClass}
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
              }}
              disabled={isUpdating}
              onClick={() => handleReject(professional)}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <XCircle className="mr-1.5 h-4 w-4 shrink-0" />
              )}
              Reject
            </button>
          </div>
        )}

        {status === "approved" && (
          <button
            type="button"
            className={mobileActionBtnClass}
            style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#b45309",
            }}
            disabled={isUpdating}
            onClick={() => handleSuspend(professional)}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Ban className="mr-1.5 h-4 w-4 shrink-0" />
            )}
            Suspend Account
          </button>
        )}

        {status === "suspended" && (
          <button
            type="button"
            className={mobileActionBtnClass}
            style={{
              backgroundColor: "#16a34a",
              border: "1px solid #16a34a",
              color: "#ffffff",
            }}
            disabled={isUpdating}
            onClick={() => handleReactivate(professional)}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <CheckCircle className="mr-1.5 h-4 w-4 shrink-0" />
            )}
            Reactivate Account
          </button>
        )}
      </div>
    );
  };

  const verificationActionsClass =
    "flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-2";
  const verificationActionBtnClass = "h-9 w-full justify-center md:w-auto";

  const confirmApproval = async () => {
    if (!selectedProfessional) return;
    await handleUpdateProfessionalStatus(selectedProfessional, "approved");
    setApprovalModalOpen(false);
    setVerificationNotes("");
  };

  // const confirmRejection = async () => {
  //   if (!rejectionReason) {
  //     toast.error("Please select a rejection reason");
  //     return;
  //   }
  //   if (!selectedProfessional) return;
  //   await handleUpdateProfessionalStatus(selectedProfessional, "rejected");
  //   setRejectionModalOpen(false);
  //   setRejectionReason("");
  //   setRejectionMessage("");
  // };

  const handleEditImageClick = () => {
    editImageInputRef.current?.click();
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProfessional?.id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setEditImagePreview(previewUrl);
    setPendingEditImageFile(file);
    setIsUploadingEditImage(true);

    try {
      let imageUrl: string | undefined;
      let uploaded = false;

      try {
        const uploadRes = await adminProfessionalUploadProfileImage({
          api_token: token,
          professional_id: selectedProfessional.id,
          file,
        });
        if (uploadRes.success) {
          uploaded = true;
          imageUrl =
            uploadRes.data?.professional_image?.trim() ||
            uploadRes.data?.image_url?.trim() ||
            undefined;
        }
      } catch {
        // Dedicated upload route failed — no fallback on profile update.
      }

      if (!uploaded) {
        throw new Error("Failed to upload profile image");
      }

      if (imageUrl) {
        setEditDetail((prev) => (prev ? { ...prev, professional_image: imageUrl } : prev));
      }
      setPendingEditImageFile(null);
      setEditImagePreview(null);
      refetchProfessionalsList();
      toast.success("Profile image updated successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to upload profile image";
      toast.error(message);
      setEditImagePreview(null);
      setPendingEditImageFile(null);
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploadingEditImage(false);
      if (editImageInputRef.current) {
        editImageInputRef.current.value = "";
      }
    }
  };

  const saveProfileEdits = async () => {
    if (!selectedProfessional?.id) return;
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setEditSaving(true);
    try {
      const res = await adminProfessionalUpdate({
        api_token: token,
        id: selectedProfessional.id,
        professional_id: editDetail?.id ?? selectedProfessional.id,
        name: editForm.name.trim(),
        business_name: editForm.business_name.trim(),
        about: editForm.bio.trim(),
        email: editForm.email.trim(),
        number: editForm.phone.trim(),
        business_location: editForm.location.trim(),
        post_code: editForm.post_code.trim(),
        response_time: editForm.responseTime.trim(),
        ...(editDetail?.radius != null && editDetail.radius !== ""
          ? { radius: String(editDetail.radius) }
          : {}),
        ...(editDetail?.rating != null ? { rating: String(editDetail.rating) } : {}),
        ...(editDetail?.review != null ? { review: String(editDetail.review) } : {}),
      });

      if (!res.success) {
        toast.error(res.message || "Failed to update professional");
        return;
      }

      const currentStatus = selectedProfessional.status as string;
      const nextStatus = editForm.status;
      if (nextStatus !== currentStatus) {
        const apiStatus: AdminProfessionalStatus =
          nextStatus === "suspended" ? "rejected" : nextStatus === "approved" ? "approved" : "pending";
        const statusRes = await adminProfessionalTakeAction({
          api_token: token,
          professional_id: selectedProfessional.id,
          status: apiStatus,
        });
        if (!statusRes.success) {
          toast.error(statusRes.message || "Profile saved but status update failed");
        }
      }

      refetchProfessionalsList();
      refetchSummary();
      setPendingEditImageFile(null);
      setEditImagePreview(null);
      if (res.data?.professional_image) {
        setEditDetail((prev) =>
          prev ? { ...prev, professional_image: res.data!.professional_image ?? prev.professional_image } : prev
        );
      }
      toast.success(`Changes to ${editForm.name.trim()}'s profile saved successfully`);
      setEditModalOpen(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || "Failed to update professional");
    } finally {
      setEditSaving(false);
    }
  };

  const handleApproveEvidence = async (evidenceId: string, fileName: string) => {
    const professionalId = selectedProfessional?.id ?? profileDetail?.id;
    const token = getApiToken();
    if (!token || !professionalId) {
      toast.error("Unable to update certificate");
      return;
    }
    setCertificateUpdatingId(evidenceId);
    try {
      const res = await adminProfessionalChangeCertificateStatus({
        api_token: token,
        professional_id: professionalId,
        certificate_id: Number(evidenceId),
        status: "verified",
      });
      if (res.success) {
        setEvidenceStatuses((prev) => ({ ...prev, [evidenceId]: "approved" }));
        setProfileDetail((prev) =>
          prev
            ? {
              ...prev,
              certificates: prev.certificates.map((c) =>
                c.id === Number(evidenceId) ? { ...c, status: "verified" } : c
              ),
            }
            : prev
        );
        toast.success(`${fileName} has been approved`);
      } else {
        toast.error(res.message || "Failed to approve certificate");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to approve certificate");
    } finally {
      setCertificateUpdatingId(null);
    }
  };

  const handleRejectEvidence = async (evidenceId: string, fileName: string) => {
    const professionalId = selectedProfessional?.id ?? profileDetail?.id;
    const token = getApiToken();
    if (!token || !professionalId) {
      toast.error("Unable to update certificate");
      return;
    }
    setCertificateUpdatingId(evidenceId);
    try {
      const res = await adminProfessionalChangeCertificateStatus({
        api_token: token,
        professional_id: professionalId,
        certificate_id: Number(evidenceId),
        status: "rejected",
      });
      if (res.success) {
        setEvidenceStatuses((prev) => ({ ...prev, [evidenceId]: "rejected" }));
        setProfileDetail((prev) =>
          prev
            ? {
              ...prev,
              certificates: prev.certificates.map((c) =>
                c.id === Number(evidenceId) ? { ...c, status: "rejected" } : c
              ),
            }
            : prev
        );
        toast.error(`${fileName} has been rejected`);
      } else {
        toast.error(res.message || "Failed to reject certificate");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to reject certificate");
    } finally {
      setCertificateUpdatingId(null);
    }
  };

  const handleViewFile = (file: any) => {
    setFilePreviewUrlIndex(0);
    setFilePreviewFailed(false);
    setSelectedFile(file);
    setFilePreviewModalOpen(true);
  };

  const handleApproveService = async (service: any) => {
    const professionalId = selectedProfessional?.id ?? profileDetail?.id;
    const token = getApiToken();
    const serviceId = typeof service.id === "number" ? service.id : null;
    if (!token || !professionalId || serviceId == null) {
      toast.error("Unable to approve service");
      return;
    }
    setServiceUpdatingId(service.id);
    try {
      const res = await adminProfessionalChangeServiceStatus({
        api_token: token,
        professional_id: professionalId,
        selected_service_id: serviceId,
        status: "approved",
      });
      if (res.success) {
        const apiStatus = res.data?.service?.status;
        const newStatus = apiStatus?.toLowerCase() === "approved" ? "ACTIVE" : apiStatus?.toLowerCase() === "rejected" ? "REJECTED" : "ACTIVE";
        setProfileDetail((prev) =>
          prev
            ? {
              ...prev,
              services: prev.services.map((s) =>
                s.id === serviceId ? { ...s, status: newStatus } : s
              ),
            }
            : prev
        );
        toast.success(`${service.name} has been approved`);
      } else {
        toast.error(res.message || "Failed to approve service");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to approve service");
    } finally {
      setServiceUpdatingId(null);
    }
  };

  const handleRejectService = async (service: any) => {
    const professionalId = selectedProfessional?.id ?? profileDetail?.id;
    const token = getApiToken();
    const serviceId = typeof service.id === "number" ? service.id : null;
    if (!token || !professionalId || serviceId == null) {
      toast.error("Unable to reject service");
      return;
    }
    setServiceUpdatingId(service.id);
    try {
      const res = await adminProfessionalChangeServiceStatus({
        api_token: token,
        professional_id: professionalId,
        selected_service_id: serviceId,
        status: "rejected",
      });
      if (res.success) {
        const apiStatus = res.data?.service?.status;
        const newStatus = apiStatus?.toLowerCase() === "rejected" ? "REJECTED" : apiStatus?.toLowerCase() === "approved" ? "ACTIVE" : "REJECTED";
        setProfileDetail((prev) =>
          prev
            ? {
              ...prev,
              services: prev.services.map((s) =>
                s.id === serviceId ? { ...s, status: newStatus } : s
              ),
            }
            : prev
        );
        setServiceRejectModalOpen(false);
        setServiceRejectionNote("");
        toast.success(`${service.name} has been rejected`);
      } else {
        toast.error(res.message || "Failed to reject service");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to reject service");
    } finally {
      setServiceUpdatingId(null);
    }
  };

  const handleDownloadEvidence = async () => {
    const previewUrls: string[] = Array.isArray(selectedFile?.evidenceUrls)
      ? selectedFile.evidenceUrls.filter(Boolean)
      : selectedFile?.evidenceUrl
        ? [selectedFile.evidenceUrl]
        : [];
    const url = previewUrls[filePreviewUrlIndex] ?? previewUrls[0];
    if (!url) return;
    let filename = selectedFile.fileName;
    try {
      const pathname = new URL(url).pathname;
      const urlFilename = pathname.split("/").pop();
      if (urlFilename) filename = decodeURIComponent(urlFilename);
    } catch {
      const ext = selectedFile.fileType === "pdf" ? ".pdf" : selectedFile.fileType === "image" ? ".png" : "";
      filename = `${filename}${ext}`;
    }
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("Failed to fetch file");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch {
      window.open(url, "_blank");
      toast.info("Opening file in new tab");
    }
  };

  const handleUpdateInsuranceStatus = async (
    insuranceIdRaw: string,
    insuranceTitle: string,
    action: "approved" | "rejected"
  ) => {
    const token = getApiToken();
    const insuranceId = Number(insuranceIdRaw);
    if (!token || !Number.isFinite(insuranceId)) {
      toast.error("Unable to update insurance status");
      return;
    }
    setInsuranceUpdatingId(insuranceIdRaw);
    try {
      const res =
        action === "approved"
          ? await adminApproveInsuranceCoverage({ api_token: token, insurance_id: insuranceId })
          : await adminRejectInsuranceCoverage({ api_token: token, insurance_id: insuranceId });
      if (!isAdminActionSuccess(res)) {
        toast.error(res?.message || "Failed to update insurance status");
        return;
      }
      const uiStatus = action === "approved" ? "approved" : "rejected";
      const apiStatus = action === "approved" ? "verified" : "rejected";
      setInsuranceStatuses((prev) => ({ ...prev, [insuranceIdRaw]: uiStatus }));
      setProfileDetail((prev) => {
        if (!prev) return prev;
        const patch = (items?: typeof prev.insurances) =>
          items?.map((item) => (item.id === insuranceId ? { ...item, status: apiStatus } : item));
        return {
          ...prev,
          insurance: patch(prev.insurance),
          insurances: patch(prev.insurances),
          insurance_coverages: patch(prev.insurance_coverages),
        };
      });
      toast.success(
        action === "approved"
          ? `${insuranceTitle} marked as approved`
          : `${insuranceTitle} marked as rejected`
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update insurance status");
    } finally {
      setInsuranceUpdatingId(null);
    }
  };

  const handleUpdateIdentityStatus = async (
    identityIdRaw: string,
    identityTitle: string,
    action: "approved" | "rejected"
  ) => {
    const token = getApiToken();
    const identityId = Number(identityIdRaw);
    if (!token || !Number.isFinite(identityId)) {
      toast.error("Unable to update identity status");
      return;
    }
    setIdentityUpdatingId(identityIdRaw);
    try {
      const res =
        action === "approved"
          ? await adminApproveProfessionalIdentity({ api_token: token, identity_id: identityId })
          : await adminRejectProfessionalIdentity({ api_token: token, identity_id: identityId });
      if (!isAdminActionSuccess(res)) {
        toast.error(res?.message || "Failed to update identity status");
        return;
      }
      const uiStatus = action === "approved" ? "approved" : "rejected";
      const apiStatus = action === "approved" ? "verified" : "rejected";
      setIdentityStatuses((prev) => ({ ...prev, [identityIdRaw]: uiStatus }));
      setProfileDetail((prev) => {
        if (!prev) return prev;
        const patchOne = (item: NonNullable<typeof prev.identity>[number]) =>
          item.id === identityId ? { ...item, status: apiStatus } : item;
        const patchMany = (items?: typeof prev.identities) =>
          items?.map((item) => (item.id === identityId ? { ...item, status: apiStatus } : item));
        const nextIdentity = Array.isArray(prev.identity)
          ? prev.identity.map(patchOne)
          : prev.identity
            ? patchOne(prev.identity)
            : prev.identity;
        return {
          ...prev,
          identity: nextIdentity,
          identities: patchMany(prev.identities),
          professional_identity: Array.isArray(prev.professional_identity)
            ? prev.professional_identity.map(patchOne)
            : prev.professional_identity
              ? patchOne(prev.professional_identity)
              : prev.professional_identity,
        };
      });
      toast.success(
        action === "approved"
          ? `${identityTitle} marked as approved`
          : `${identityTitle} marked as rejected`
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update identity status");
    } finally {
      setIdentityUpdatingId(null);
    }
  };

  const handleUpdateMembershipStatus = async (
    membershipIdRaw: string,
    membershipTitle: string,
    action: "approved" | "rejected"
  ) => {
    const token = getApiToken();
    const membershipId = Number(membershipIdRaw);
    if (!token || !Number.isFinite(membershipId)) {
      toast.error("Unable to update membership status");
      return;
    }
    setMembershipUpdatingId(membershipIdRaw);
    try {
      const res =
        action === "approved"
          ? await adminApproveMembership({ api_token: token, membership_id: membershipId })
          : await adminRejectMembership({ api_token: token, membership_id: membershipId });
      if (!isAdminActionSuccess(res)) {
        toast.error(res?.message || "Failed to update membership status");
        return;
      }
      const uiStatus = action === "approved" ? "approved" : "rejected";
      const apiStatus = action === "approved" ? "verified" : "rejected";
      setMembershipStatuses((prev) => ({ ...prev, [membershipIdRaw]: uiStatus }));
      setProfileDetail((prev) => {
        if (!prev) return prev;
        const patch = (items?: AdminProfessionalMembershipItem[]) =>
          items?.map((item) => (item.id === membershipId ? { ...item, status: apiStatus } : item));
        return {
          ...prev,
          membership: patch(prev.membership),
          memberships: patch(prev.memberships),
        };
      });
      toast.success(
        action === "approved"
          ? `${membershipTitle} marked as approved`
          : `${membershipTitle} marked as rejected`
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update membership status");
    } finally {
      setMembershipUpdatingId(null);
    }
  };

  const handleUpdateExperienceStatus = async (
    experienceIdRaw: string,
    experienceTitle: string,
    status: "verified" | "rejected"
  ) => {
    const token = getApiToken();
    const professionalId = selectedProfessional?.id ?? profileDetail?.id;
    const experienceId = Number(experienceIdRaw);
    if (!token || !professionalId || !Number.isFinite(experienceId)) {
      toast.error("Unable to update experience status");
      return;
    }
    setExperienceUpdatingId(experienceIdRaw);
    try {
      const res = await adminProfessionalChangeExperienceStatus({
        api_token: token,
        professional_id: Number(professionalId),
        experience_id: experienceId,
        status,
      });
      if (!res.success) {
        toast.error(res.message || "Failed to update experience status");
        return;
      }

      const uiStatus = status === "verified" ? "approved" : "rejected";
      setExperienceStatuses((prev) => ({ ...prev, [experienceIdRaw]: uiStatus }));
      setProfileDetail((prev) => {
        if (!prev) return prev;
        const patchList = (items?: AdminProfessionalExperience[]) =>
          items?.map((exp) =>
            Number(exp?.id) === experienceId ? { ...exp, status } : exp
          );
        return {
          ...prev,
          experience: patchList(prev.experience),
          experiences: patchList(prev.experiences),
        };
      });
      toast.success(
        status === "verified"
          ? `${experienceTitle} marked as verified`
          : `${experienceTitle} marked as rejected`
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update experience status");
    } finally {
      setExperienceUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Professional Management</h1>
        <p className="text-gray-600">View and manage fire safety professionals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">Total Professionals</p>
            <p className="text-2xl text-[#0A1A2F] mt-1">{professionalSummaryLoading ? "—" : stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl text-green-600 mt-1">{professionalSummaryLoading ? "—" : stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">Pending Approval</p>
            <p className="text-2xl text-yellow-600 mt-1">{professionalSummaryLoading ? "—" : stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">Suspended</p>
            <p className="text-2xl text-red-600 mt-1">{professionalSummaryLoading ? "—" : stats.suspended}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div>
        <Card>
          <CardContent className="p-4">
            <div className="flex w-full items-center gap-4">

              {/* 🔍 Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full h-11"
                />
              </div>

              {/* 🔽 Filter */}
              <div className="w-[180px]">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full h-11 px-4">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Cards */}
      <div className="grid gap-4">
        {professionalsLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Loading professionals...
            </CardContent>
          </Card>
        ) : (
          filteredProfessionals.map((professional) => (
            <Card key={professional.id}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <img
                    src={professional.photo}
                    alt={professional.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        {/* Mobile: name left, status right */}
                        <div className="mb-2 flex items-start justify-between gap-3 md:hidden">
                          <h3 className="min-w-0 flex-1 text-lg text-[#0A1A2F] break-words">
                            {professional.name}
                          </h3>
                          <Badge
                            variant="custom"
                            className={`w-fit shrink-0 ${
                              professional.status === "approved"
                                ? "bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700"
                                : professional.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-700"
                                  : "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700"
                            }`}
                          >
                            {professional.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {professional.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {professional.status === "suspended" && <XCircle className="w-3 h-3 mr-1" />}
                            {professional.status}
                          </Badge>
                        </div>
                        {/* Desktop: name + status inline */}
                        <div className="mb-2 hidden items-center gap-3 md:flex">
                          <h3 className="text-xl text-[#0A1A2F]">{professional.name}</h3>
                          <Badge
                            variant="custom"
                            className={
                              professional.status === "approved"
                                ? "bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700"
                                : professional.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-700"
                                  : "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700"
                            }
                          >
                            {professional.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {professional.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {professional.status === "suspended" && <XCircle className="w-3 h-3 mr-1" />}
                            {professional.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <p className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {professional.email}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {professional.phone}
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {professional.location}
                          </p>
                        </div>

                        {(professional.certificateNames.length > 0 ||
                          professional.experienceNames.length > 0) && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {professional.certificateNames.map((label, index) => (
                              <Badge
                                key={`cert-${professional.id}-${index}`}
                                variant="outline"
                                className="border-blue-200 bg-blue-50 text-blue-800"
                              >
                                <Award className="mr-1 h-3 w-3 shrink-0" />
                                {label}
                              </Badge>
                            ))}
                            {professional.experienceNames.map((label, index) => (
                              <Badge
                                key={`exp-${professional.id}-${index}`}
                                variant="outline"
                                className="border-blue-200 bg-blue-50 text-blue-800"
                              >
                                <Award className="mr-1 h-3 w-3 shrink-0" />
                                {label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="hidden shrink-0 md:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={statusUpdatingId === professional.id}
                              className="transition-colors hover:bg-gray-100 hover:text-gray-800"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" hideBackdrop>
                          <DropdownMenuItem onClick={() => handleViewProfile(professional)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(professional)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Professional
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendFeedback(professional)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send Feedback
                          </DropdownMenuItem>
                          {professional.status === "pending" && (
                            <>
                              <DropdownMenuItem className="text-green-600" onClick={() => handleApprove(professional)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve Professional
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleReject(professional)}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject Application
                              </DropdownMenuItem>
                            </>
                          )}
                          {professional.status === "approved" && (
                            <DropdownMenuItem className="text-yellow-600" onClick={() => handleSuspend(professional)}>
                              <Ban className="w-4 h-4 mr-2" />
                              Suspend Account
                            </DropdownMenuItem>
                          )}
                          {professional.status === "suspended" && (
                            <DropdownMenuItem className="text-green-600" onClick={() => handleReactivate(professional)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Reactivate Account
                            </DropdownMenuItem>
                          )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">Rating</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-gray-900">
                            {professional.rating > 0 ? professional.rating : "N/A"}
                          </span>
                          {professional.reviewCount > 0 && (
                            <span className="text-sm text-gray-500">({professional.reviewCount})</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bookings</p>
                        <p className="font-semibold text-gray-900 mt-1">{professional.totalBookings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completion</p>
                        <p className="font-semibold text-gray-900 mt-1">{professional.completedBookings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Response Time</p>
                        <p className="font-semibold text-gray-900 mt-1">{professional.responseTime}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Joined</p>
                        <p className="font-semibold text-gray-900 mt-1">{professional.joinDate}</p>
                      </div>
                    </div>

                    {renderMobileProfessionalActions(professional)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!professionalsLoading && filteredProfessionals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No professionals found matching your criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Approval Modal */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Approve Professional Application
            </DialogTitle>
            <DialogDescription>
              Review qualifications and documents before approving {selectedProfessional?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Professional Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <img
                src={selectedProfessional?.photo}
                alt={selectedProfessional?.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900">{selectedProfessional?.name}</h4>
                <p className="text-sm text-gray-600">{selectedProfessional?.email}</p>
                <p className="text-sm text-gray-600">{selectedProfessional?.location}</p>
              </div>
            </div>

            {/* Qualifications */}
            <div>
              <Label className="text-base font-semibold text-gray-900 mb-3 block">
                Qualifications & Certificates
              </Label>
              <div className="space-y-3">
                {selectedProfessional?.qualifications.map((qual: string, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">{qual}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Verified</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div>
              <Label className="text-base font-semibold text-gray-900 mb-3 block">
                Uploaded Documents
              </Label>
              <div className="space-y-2">
                {["Certificate_NEBOSH.pdf", "Insurance_Document.pdf", "ID_Verification.pdf"].map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{doc}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="transition-colors hover:bg-blue-50 hover:text-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Checklist */}
            <div>
              <Label className="text-base font-semibold text-gray-900 mb-3 block">
                Verification Checklist
              </Label>
              <div className="space-y-2">
                {[
                  "Identity documents verified",
                  "Professional qualifications confirmed",
                  "Insurance coverage verified",
                  "Background check completed",
                  "Contact information validated"
                ].map((item, index) => (
                  <label key={index} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 border-gray-300 rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Verification Notes */}
            <div>
              <Label htmlFor="verification-notes">Internal Notes (Optional)</Label>
              <Textarea
                id="verification-notes"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Add any notes about this verification..."
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Important</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Approving this professional will grant them access to the platform and allow them to receive bookings. Make sure all documents have been thoroughly verified.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={confirmApproval}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal — disabled: Reject Application now calls adminProfessionalTakeAction directly via handleUpdateProfessionalStatus
      <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              Reject Application
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedProfessional?.name}'s application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete-documents">Incomplete or Missing Documents</SelectItem>
                  <SelectItem value="invalid-qualifications">Invalid or Expired Qualifications</SelectItem>
                  <SelectItem value="failed-background-check">Failed Background Check</SelectItem>
                  <SelectItem value="insufficient-experience">Insufficient Experience</SelectItem>
                  <SelectItem value="incorrect-information">Incorrect or False Information</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rejection-message">Message to Applicant (Optional)</Label>
              <Textarea
                id="rejection-message"
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                placeholder="Provide additional details or feedback..."
                className="mt-2"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be included in the rejection email
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">This action cannot be undone</p>
                <p className="text-sm text-red-700 mt-1">
                  The applicant will be notified via email and their application will be permanently rejected.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmRejection}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}

      {/* Edit Professional Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-blue-600" />
              Edit Professional
            </DialogTitle>
            <DialogDescription>
              Update profile details for {editDetail?.name ?? selectedProfessional?.name ?? "professional"}
            </DialogDescription>
          </DialogHeader>

          {editDetailLoading ? (
            <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading profile...
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {editDetail ? (
                <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-gray-200">
                      <img
                        src={editImagePreview || editDetail.professional_image || DEFAULT_AVATAR}
                        alt={editDetail.name}
                        className="h-full w-full object-cover"
                      />
                      {isUploadingEditImage ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      ) : null}
                    </div>
                    <input
                      ref={editImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleEditImageChange(e)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleEditImageClick}
                      disabled={isUploadingEditImage || editSaving}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Change Photo
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-[#0A1A2F]">{editDetail.name}</h3>
                      <Badge
                        className={profileModalStatusBadgeClass(
                          editDetail.status === "approved"
                            ? "approved"
                            : editDetail.status === "pending"
                              ? "pending"
                              : "rejected"
                        )}
                      >
                        {editDetail.status === "rejected" ? "suspended" : editDetail.status}
                      </Badge>
                    </div>
                    {editDetail.business_name ? (
                      <p className="mt-1 text-sm font-medium text-gray-700">{editDetail.business_name}</p>
                    ) : null}
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        {editDetail.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        {editDetail.number || "—"}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {[editDetail.business_location, editDetail.post_code].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-3 font-semibold text-gray-900">Profile Information</h4>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-business-name">Business Name</Label>
                      <Input
                        id="edit-business-name"
                        value={editForm.business_name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, business_name: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-email">Email Address</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
                        id="edit-phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-location">Business Location</Label>
                      <Input
                        id="edit-location"
                        value={editForm.location}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-post-code">Post Code</Label>
                      <Input
                        id="edit-post-code"
                        value={editForm.post_code}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, post_code: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-bio">About</Label>
                    <Textarea
                      id="edit-bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                      className="mt-2"
                      rows={4}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-status">Account Status</Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(value: "approved" | "pending" | "suspended") =>
                          setEditForm((prev) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger id="edit-status" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-response-time">Response Time</Label>
                      <Input
                        id="edit-response-time"
                        value={editForm.responseTime}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, responseTime: e.target.value }))}
                        placeholder="e.g. 4 hours"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {editDetail ? (
                    <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-gray-600">Rating</p>
                        <p className="mt-1 font-medium text-gray-900">{editDetail.rating ?? "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Reviews</p>
                        <p className="mt-1 font-medium text-gray-900">{editDetail.review ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Member Since</p>
                        <p className="mt-1 font-medium text-gray-900">{formatJoinDate(editDetail.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Latitude</p>
                        <p className="mt-1 font-medium text-gray-900">{editDetail.latitude ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Longitude</p>
                        <p className="mt-1 font-medium text-gray-900">{editDetail.longitude ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Last Updated</p>
                        <p className="mt-1 font-medium text-gray-900">{formatJoinDate(editDetail.updated_at)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {editDetail ? (
                <>
                  <Separator />

                  <div>
                    <h4 className="mb-3 font-semibold text-gray-900">Registered Services</h4>
                    {editDetail.services?.length ? (
                      <div className="space-y-2">
                        {editDetail.services.map((service) => (
                          <div
                            key={service.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3"
                          >
                            <span className="font-medium text-gray-900">{service.name}</span>
                            <Badge className={profileModalStatusBadgeClass(mapVerificationUiStatus(service.status))}>
                              {verificationStatusLabel(mapVerificationUiStatus(service.status))}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No services registered</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 font-semibold text-gray-900">Certificates</h4>
                    {editDetail.certificates?.length ? (
                      <div className="space-y-2">
                        {editDetail.certificates.map((cert) => (
                          <div
                            key={cert.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">{cert.name}</p>
                              {cert.evidence ? (
                                <a
                                  href={resolveEvidenceUrl(cert.evidence) ?? cert.evidence}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View evidence
                                </a>
                              ) : null}
                            </div>
                            <Badge className={profileModalStatusBadgeClass(mapVerificationUiStatus(cert.status))}>
                              {verificationStatusLabel(mapVerificationUiStatus(cert.status))}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No certificates uploaded</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 font-semibold text-gray-900">Experience</h4>
                    {getProfessionalExperiences(editDetail).length ? (
                      <div className="space-y-2">
                        {getProfessionalExperiences(editDetail).map((exp) => (
                          <div
                            key={exp.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">{exp.experience_name ?? "Experience"}</p>
                              {exp.evidence ? (
                                <a
                                  href={resolveEvidenceUrl(exp.evidence) ?? exp.evidence}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View evidence
                                </a>
                              ) : null}
                            </div>
                            <Badge className={profileModalStatusBadgeClass(mapVerificationUiStatus(exp.status))}>
                              {verificationStatusLabel(mapVerificationUiStatus(exp.status))}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No experience records</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 font-semibold text-gray-900">Insurance</h4>
                    {(editDetail.insurance ?? editDetail.insurances ?? editDetail.insurance_coverages ?? []).length ? (
                      <div className="space-y-2">
                        {(editDetail.insurance ?? editDetail.insurances ?? editDetail.insurance_coverages ?? []).map(
                          (item) => (
                            <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900">{item.title ?? "Insurance"}</p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Provider: {item.provider_name ?? "—"}
                                    {item.price ? ` · Amount: ${item.price}` : ""}
                                    {item.expire_date
                                      ? ` · Expires: ${new Date(item.expire_date).toLocaleDateString("en-GB")}`
                                      : ""}
                                  </p>
                                  {item.document ? (
                                    <a
                                      href={resolveEvidenceUrl(item.document) ?? item.document}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      View document
                                    </a>
                                  ) : null}
                                </div>
                                <Badge className={profileModalStatusBadgeClass(mapVerificationUiStatus(item.status))}>
                                  {verificationStatusLabel(mapVerificationUiStatus(item.status))}
                                </Badge>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No insurance records</p>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 font-semibold text-gray-900">Identity</h4>
                    {(editDetail.identity ?? editDetail.identities ?? []).length ? (
                      <div className="space-y-2">
                        {(editDetail.identity ?? editDetail.identities ?? []).map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">Identity Document</p>
                              {item.file ? (
                                <a
                                  href={resolveEvidenceUrl(item.file) ?? item.file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View file
                                </a>
                              ) : null}
                            </div>
                            <Badge className={profileModalStatusBadgeClass(mapVerificationUiStatus(item.status))}>
                              {verificationStatusLabel(mapVerificationUiStatus(item.status))}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No identity documents</p>
                    )}
                  </div>
                </>
              ) : null}

              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-sm text-blue-700">
                  Profile fields above can be edited and saved. Services, certificates, insurance, and identity are shown from the API and managed via verification actions in View Full Profile.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => void saveProfileEdits()}
              disabled={editSaving || editDetailLoading}
            >
              {editSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Profile Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">
              Professional Profile
            </DialogTitle>
            <DialogDescription>
              Complete professional information and qualification details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {profileDetailLoading ? (
              <div className="py-12 text-center text-gray-500">Loading profile...</div>
            ) : (
              <>
                {/* Profile Header */}
                <div className="flex items-start gap-6">
                  <img
                    src={profileDetail?.professional_image ?? selectedProfessional?.photo ?? DEFAULT_AVATAR}
                    alt={profileDetail?.name ?? selectedProfessional?.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl text-[#0A1A2F]">{profileDetail?.name ?? selectedProfessional?.name}</h3>
                      <Badge
                        className={profileModalStatusBadgeClass(
                          (profileDetail?.status ?? selectedProfessional?.status) === "approved"
                            ? "approved"
                            : (profileDetail?.status ?? selectedProfessional?.status) === "pending"
                              ? "pending"
                              : "rejected"
                        )}
                      >
                        {(profileDetail?.status ?? selectedProfessional?.status) === "rejected" ? "suspended" : (profileDetail?.status ?? selectedProfessional?.status)}
                      </Badge>
                    </div>
                    {profileDetail?.business_name ? (
                      <p className="mb-2 text-lg font-medium text-gray-700">{profileDetail.business_name}</p>
                    ) : null}
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {profileDetail?.email ?? selectedProfessional?.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {profileDetail?.number ?? selectedProfessional?.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {[profileDetail?.business_location ?? selectedProfessional?.location, profileDetail?.post_code]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {profileDetail?.about ? (
                  <>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{profileDetail.about}</p>
                    </div>
                    <Separator />
                  </>
                ) : null}

                {/* Performance Stats */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Performance Statistics</h4>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Rating</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-900">
                          {profileDetail?.rating ?? selectedProfessional?.rating ?? "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Bookings</p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {parseProfessionalCount(profileDetail?.booking ?? selectedProfessional?.totalBookings)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Completed Bookings</p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {parseProfessionalCount(profileDetail?.completed_booking ?? selectedProfessional?.completedBookings)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Response Time</p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {formatResponseTime(profileDetail?.response_time ?? selectedProfessional?.responseTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Identity verification */}
                {(() => {
                  const raw = profileDetail as AdminProfessionalSingleData | null;
                  const identitySource =
                    raw?.identities ??
                    (Array.isArray(raw?.identity)
                      ? raw.identity
                      : raw?.identity
                        ? [raw.identity]
                        : Array.isArray(raw?.professional_identity)
                          ? raw.professional_identity
                          : raw?.professional_identity
                            ? [raw.professional_identity]
                            : []);
                  const identityList = identitySource.map((item, idx) => {
                    const filePath = item.file ?? "";
                    const isPdf = /\.pdf(\?.*)?$/i.test(filePath);
                    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(filePath);
                    return {
                      id: String(item.id ?? `identity-${idx}`),
                      title: "Identity Document",
                      status: mapVerificationUiStatus(item.status),
                      uploadDate: item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-GB")
                        : "—",
                      evidenceUrl: resolveEvidenceUrl(filePath),
                      fileName: filePath || "Identity document",
                      fileType: isPdf ? "pdf" : isImage ? "image" : "document",
                    };
                  });
                  if (identityList.length === 0) return null;
                  return (
                    <>
                      <div>
                        <div className="mb-3">
                          <h4 className="text-lg font-medium text-gray-900">Identity</h4>
                          <p className="text-sm text-gray-600 mt-1">Government ID or proof of identity submitted by the professional</p>
                        </div>
                        <div className="space-y-3">
                          {identityList.map((identity) => {
                            const currentStatus = identityStatuses[identity.id] || identity.status;
                            const isApproved = currentStatus === "approved";
                            const isRejected = currentStatus === "rejected";
                            return (
                              <div
                                key={identity.id}
                                className={`p-4 border rounded-lg ${isApproved
                                  ? "bg-green-50 border-green-200"
                                  : isRejected
                                    ? "bg-red-50 border-red-200"
                                    : "bg-white border-gray-200"
                                  }`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 break-words">{identity.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">Uploaded: {identity.uploadDate}</p>
                                  </div>
                                  <Badge
                                    className={profileModalStatusBadgeClass(
                                      isApproved ? "approved" : isRejected ? "rejected" : "pending"
                                    )}
                                  >
                                    {isApproved ? "Verified" : isRejected ? "Rejected" : "Pending verification"}
                                  </Badge>
                                </div>
                                <div className={verificationActionsClass}>
                                  {identity.evidenceUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={verificationActionBtnClass}
                                      onClick={() =>
                                        handleViewFile({
                                          id: identity.id,
                                          fileName: identity.fileName,
                                          fileType: identity.fileType,
                                          uploadDate: identity.uploadDate,
                                          status: currentStatus,
                                          evidenceUrl: identity.evidenceUrl,
                                        })
                                      }
                                    >
                                      <Eye className="w-4 h-4 mr-2 shrink-0" />
                                      View
                                    </Button>
                                  )}
                                  {!isApproved && (
                                    <Button
                                      size="sm"
                                      className={`bg-green-600 hover:bg-green-700 ${verificationActionBtnClass}`}
                                      disabled={identityUpdatingId === identity.id}
                                      onClick={() => {
                                        void handleUpdateIdentityStatus(identity.id, identity.title, "approved");
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                                      Approve
                                    </Button>
                                  )}
                                  {!isRejected && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`border-red-600 text-red-600 hover:bg-red-50 ${verificationActionBtnClass}`}
                                      disabled={identityUpdatingId === identity.id}
                                      onClick={() => {
                                        void handleUpdateIdentityStatus(identity.id, identity.title, "rejected");
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 mr-2 shrink-0" />
                                      Reject
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <Separator />
                    </>
                  );
                })()}

                {/* Insurance verification */}
                {(() => {
                  const raw = profileDetail as AdminProfessionalSingleData | null;
                  const insuranceSource =
                    raw?.insurances ?? raw?.insurance ?? raw?.insurance_coverages ?? [];
                  const insuranceList = insuranceSource.map((item, idx) => {
                    const docPath = item.document ?? "";
                    const isPdf = /\.pdf(\?.*)?$/i.test(docPath);
                    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(docPath);
                    const title =
                      (item.title && item.title.trim()) ||
                      (item.provider_name && item.provider_name.trim()) ||
                      "Insurance Coverage";
                    return {
                      id: String(item.id ?? `insurance-${idx}`),
                      title,
                      provider: item.provider_name ?? "—",
                      price: item.price ?? "",
                      expireDate: item.expire_date
                        ? new Date(item.expire_date).toLocaleDateString("en-GB")
                        : "—",
                      status: mapVerificationUiStatus(item.status),
                      uploadDate: item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-GB")
                        : "—",
                      evidenceUrl: resolveEvidenceUrl(docPath),
                      fileName: docPath || title,
                      fileType: isPdf ? "pdf" : isImage ? "image" : "document",
                    };
                  });
                  if (insuranceList.length === 0) return null;
                  return (
                    <>
                      <div>
                        <div className="mb-3">
                          <h4 className="text-lg font-medium text-gray-900">Insurance</h4>
                          <p className="text-sm text-gray-600 mt-1">Insurance documents and coverage details submitted by the professional</p>
                        </div>
                        <div className="space-y-3">
                          {insuranceList.map((insurance) => {
                            const currentStatus = insuranceStatuses[insurance.id] || insurance.status;
                            const isApproved = currentStatus === "approved";
                            const isRejected = currentStatus === "rejected";
                            return (
                              <div
                                key={insurance.id}
                                className={`p-4 border rounded-lg ${isApproved
                                  ? "bg-green-50 border-green-200"
                                  : isRejected
                                    ? "bg-red-50 border-red-200"
                                    : "bg-white border-gray-200"
                                  }`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 break-words">{insurance.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">Provider: {insurance.provider}</p>
                                    {insurance.price ? (
                                      <p className="text-xs text-gray-500">Amount: {insurance.price}</p>
                                    ) : null}
                                    <p className="text-xs text-gray-500">Valid until: {insurance.expireDate}</p>
                                  </div>
                                  <Badge
                                    className={profileModalStatusBadgeClass(
                                      isApproved ? "approved" : isRejected ? "rejected" : "pending"
                                    )}
                                  >
                                    {isApproved ? "Verified" : isRejected ? "Rejected" : "Pending verification"}
                                  </Badge>
                                </div>
                                <div className={verificationActionsClass}>
                                  {insurance.evidenceUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={verificationActionBtnClass}
                                      onClick={() =>
                                        handleViewFile({
                                          id: insurance.id,
                                          fileName: insurance.fileName,
                                          fileType: insurance.fileType,
                                          uploadDate: insurance.uploadDate,
                                          status: currentStatus,
                                          evidenceUrl: insurance.evidenceUrl,
                                        })
                                      }
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View
                                    </Button>
                                  )}
                                  {!isApproved && (
                                    <Button
                                      size="sm"
                                      className={`bg-green-600 hover:bg-green-700 ${verificationActionBtnClass}`}
                                      disabled={insuranceUpdatingId === insurance.id}
                                      onClick={() => {
                                        void handleUpdateInsuranceStatus(insurance.id, insurance.title, "approved");
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                                      Approve
                                    </Button>
                                  )}
                                  {!isRejected && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`border-red-600 text-red-600 hover:bg-red-50 ${verificationActionBtnClass}`}
                                      disabled={insuranceUpdatingId === insurance.id}
                                      onClick={() => {
                                        void handleUpdateInsuranceStatus(insurance.id, insurance.title, "rejected");
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <Separator />
                    </>
                  );
                })()}

                {/* Evidence Submitted - from API certificates */}
                {(() => {
                  const evidenceList = profileDetail?.certificates?.length
                    ? profileDetail.certificates.map((c) => {
                      const ev = (c.evidence || "").toLowerCase();
                      const isPdf = ev.includes(".pdf") || ev.endsWith(".pdf");
                      const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(c.evidence || "");
                      return {
                        id: String(c.id),
                        fileName: c.name,
                        fileType: isPdf ? "pdf" : isImage ? "image" : "document",
                        uploadDate: "—",
                        status: c.status === "verified" ? "approved" : c.status === "rejected" ? "rejected" : "pending",
                        approvedDate: c.status === "verified" ? "—" : null,
                        evidenceUrl: resolveEvidenceUrl(c.evidence),
                      };
                    })
                    : qualificationsEvidence[selectedProfessional?.id] ?? [];
                  if (evidenceList.length === 0) return null;
                  return (
                    <>
                      <div>
                        <div className="mb-3">
                          <h4 className="text-lg font-medium text-gray-900">Certificate & Qualification</h4>
                          <p className="text-sm text-gray-600 mt-1">Documents uploaded by the professional for verification</p>
                        </div>

                        {/* Check if all evidence is approved */}
                        {evidenceList.every((ev: any) =>
                          (evidenceStatuses[ev.id] || ev.status) === 'approved'
                        ) && (
                            <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-900">Professional Verified - All documents approved</span>
                            </div>
                          )}

                        <div className="space-y-3">
                          {evidenceList.map((evidence: any) => {
                            const currentStatus = evidenceStatuses[evidence.id] || evidence.status;
                            const isApproved = currentStatus === 'approved';
                            const isPending = currentStatus === 'pending';
                            const isRejected = currentStatus === 'rejected';

                            return (
                              <div
                                key={evidence.id}
                                className={`p-4 border rounded-lg transition-all ${isApproved ? 'bg-green-50 border-green-200' :
                                  isRejected ? 'bg-red-50 border-red-200' :
                                    'bg-white border-gray-200'
                                  }`}
                              >
                                {/* Document Row */}
                                <div className="flex items-start gap-3 mb-3">
                                  {/* Thumbnail - show actual image when available, else icon */}
                                  <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                    {evidence.fileType === 'image' && evidence.evidenceUrl ? (
                                      <img
                                        src={evidence.evidenceUrl}
                                        alt={evidence.fileName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          const parent = (e.target as HTMLImageElement).parentElement;
                                          const fallback = parent?.querySelector('.evidence-thumb-fallback');
                                          if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                                        }}
                                      />
                                    ) : null}
                                    <div className={`evidence-thumb-fallback ${evidence.fileType === 'image' && evidence.evidenceUrl ? 'hidden' : ''} w-full h-full flex items-center justify-center ${evidence.fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'}`}>
                                      {evidence.fileType === 'pdf' ? (
                                        <FileText className="w-6 h-6 text-red-600" />
                                      ) : (
                                        <Image className="w-6 h-6 text-blue-600" />
                                      )}
                                    </div>
                                  </div>

                                  {/* File Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 break-words">{evidence.fileName}</p>
                                    {isApproved && evidence.approvedDate && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                        <p className="text-xs text-green-600">Approved on {evidence.approvedDate}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Status Badge */}
                                  <Badge
                                    className={profileModalStatusBadgeClass(
                                      isApproved ? "approved" : isPending ? "pending" : "rejected"
                                    )}
                                  >
                                    {isApproved ? 'Verified' : isPending ? 'Not Verified' : 'Rejected'}
                                  </Badge>
                                </div>

                                {/* Action Buttons */}
                                <div className={verificationActionsClass}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewFile(evidence)}
                                    className={verificationActionBtnClass}
                                  >
                                    <Eye className="w-4 h-4 mr-2 shrink-0" />
                                    View
                                  </Button>
                                  {!isApproved && (
                                    <Button
                                      size="sm"
                                      className={`bg-green-600 hover:bg-green-700 ${verificationActionBtnClass}`}
                                      disabled={certificateUpdatingId === evidence.id}
                                      onClick={() => handleApproveEvidence(evidence.id, evidence.fileName)}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                                      Approve
                                    </Button>
                                  )}
                                  {!isRejected && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`border-red-600 text-red-600 hover:bg-red-50 ${verificationActionBtnClass}`}
                                      disabled={certificateUpdatingId === evidence.id}
                                      onClick={() => handleRejectEvidence(evidence.id, evidence.fileName)}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />
                    </>
                  );
                })()}

                {/* Experience Submitted - from API experience / experiences */}
                {(() => {
                  const source = getProfessionalExperiences(profileDetail);
                  const experienceList = source.map((exp, idx) => {
                      const status = String(exp?.status ?? "pending").toLowerCase();
                      const uiStatus =
                        status === "verified" || status === "approved"
                          ? "approved"
                          : status === "rejected"
                            ? "rejected"
                            : "pending";
                      return {
                        id: String(exp?.id ?? `exp-${idx}`),
                        title: exp?.experience_name || exp?.title || exp?.name || "Experience",
                        years: exp?.years ?? exp?.year ?? null,
                        description: exp?.description ?? "",
                        evidence: exp?.evidence ?? "",
                        uploadDate: exp?.created_at ? new Date(exp.created_at).toLocaleDateString("en-GB") : "—",
                        status: uiStatus,
                        evidenceUrl: resolveEvidenceUrl(exp?.evidence),
                      };
                    });
                  if (experienceList.length === 0) return null;
                  return (
                    <>
                      <div>
                        <div className="mb-3">
                          <h4 className="text-lg font-medium text-gray-900">Experience</h4>
                          <p className="text-sm text-gray-600 mt-1">Experience entries uploaded by the professional</p>
                        </div>
                        <div className="space-y-3">
                          {experienceList.map((exp: any) => {
                            const currentStatus = experienceStatuses[exp.id] || exp.status;
                            const isApproved = currentStatus === "approved";
                            const isRejected = currentStatus === "rejected";
                            const isPending = currentStatus === "pending";
                            return (
                              <div
                                key={exp.id}
                                className={`p-4 border rounded-lg ${isApproved
                                  ? "bg-green-50 border-green-200"
                                  : isRejected
                                    ? "bg-red-50 border-red-200"
                                    : "bg-white border-gray-200"
                                  }`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 break-words">{exp.title}</p>
                                    {exp.years != null && String(exp.years) !== "" ? (
                                      <p className="text-xs text-gray-500 mt-1">{exp.years} years</p>
                                    ) : null}
                                  </div>
                                  <Badge
                                    className={profileModalStatusBadgeClass(
                                      isApproved ? "approved" : isRejected ? "rejected" : "pending"
                                    )}
                                  >
                                    {isApproved ? "Verified" : isRejected ? "Rejected" : "Pending verification"}
                                  </Badge>
                                </div>
                                {exp.description ? (
                                  <p className="text-sm text-gray-700 break-words mb-3">{exp.description}</p>
                                ) : null}
                                <div className={verificationActionsClass}>
                                  {exp.evidenceUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={verificationActionBtnClass}
                                      onClick={() =>
                                        handleViewFile({
                                          id: exp.id,
                                          fileName: exp.evidence || exp.title,
                                          fileType: /\.pdf$/i.test(exp.evidence || "")
                                            ? "pdf"
                                            : /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(exp.evidence || "")
                                              ? "image"
                                              : "document",
                                          uploadDate: exp.uploadDate,
                                          status: currentStatus,
                                          evidenceUrl: exp.evidenceUrl,
                                        })
                                      }
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View
                                    </Button>
                                  )}
                                  {!isApproved && (
                                    <Button
                                      size="sm"
                                      className={`bg-green-600 hover:bg-green-700 ${verificationActionBtnClass}`}
                                      disabled={experienceUpdatingId === exp.id}
                                      onClick={() => {
                                        void handleUpdateExperienceStatus(exp.id, exp.title, "verified");
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                                      Approve
                                    </Button>
                                  )}
                                  {!isRejected && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`border-red-600 text-red-600 hover:bg-red-50 ${verificationActionBtnClass}`}
                                      disabled={experienceUpdatingId === exp.id}
                                      onClick={() => {
                                        void handleUpdateExperienceStatus(exp.id, exp.title, "rejected");
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                  )}
                                  {isPending && !exp.evidenceUrl && (
                                    <p className="text-xs text-gray-500 flex items-center">No evidence attached</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />
                    </>
                  );
                })()}

                {/* Professional Memberships - from API membership */}
                {(() => {
                  const adminToken = getApiToken();
                  const membershipList = getProfessionalMemberships(profileDetail).map((item, idx) => {
                    const evidencePath = item.evidence ?? "";
                    const logoPath = item.logo ?? "";
                    const isPdf = /\.pdf(\?.*)?$/i.test(evidencePath);
                    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(evidencePath);
                    const mediaOptions = { apiToken: adminToken };
                    const evidenceUrls = buildMembershipEvidenceViewUrls({ evidencePath, ...mediaOptions });
                    const logoUrls = buildMembershipLogoViewUrls({ logoPath, ...mediaOptions });
                    return {
                      id: String(item.id ?? `membership-${idx}`),
                      organizationName: item.organization_name || "Professional membership",
                      membershipType: item.membership_type ?? "",
                      referenceId: item.reference_id ?? "",
                      memberSince: formatMemberSince(item.member_since),
                      note: item.note ?? "",
                      uploadDate: item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-GB")
                        : "—",
                      status: mapVerificationUiStatus(item.status),
                      evidencePath,
                      logoPath,
                      evidenceUrls,
                      logoUrls,
                      evidenceUrl: evidenceUrls[0] ?? null,
                      logoUrl: logoUrls[0] ?? null,
                      fileName: evidencePath || "Membership certificate",
                      fileType: isPdf ? "pdf" : isImage ? "image" : "document",
                    };
                  });
                  if (membershipList.length === 0) return null;
                  return (
                    <>
                      <div>
                        <div className="mb-3">
                          <h4 className="text-lg font-medium text-gray-900">Professional Memberships</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Membership certificates submitted by the professional for verification
                          </p>
                        </div>

                        {membershipList.every(
                          (item) => (membershipStatuses[item.id] || item.status) === "approved"
                        ) && (
                          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-900">
                              All memberships verified
                            </span>
                          </div>
                        )}

                        <div className="space-y-3">
                          {membershipList.map((membership) => {
                            const currentStatus = membershipStatuses[membership.id] || membership.status;
                            const isApproved = currentStatus === "approved";
                            const isPending = currentStatus === "pending";
                            const isRejected = currentStatus === "rejected";

                            return (
                              <div
                                key={membership.id}
                                className={`p-4 border rounded-lg transition-all ${
                                  isApproved
                                    ? "bg-green-50 border-green-200"
                                    : isRejected
                                      ? "bg-red-50 border-red-200"
                                      : "bg-white border-gray-200"
                                }`}
                              >
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="relative flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100">
                                    <div className="absolute inset-0 flex items-center justify-center bg-blue-100">
                                      <Award className="w-6 h-6 text-blue-600" />
                                    </div>
                                    {membership.logoPath ? (
                                      <MembershipMediaImage
                                        path={membership.logoPath}
                                        alt={membership.organizationName}
                                        className="relative z-10 w-full h-full object-cover"
                                      />
                                    ) : null}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 break-words">
                                      {membership.organizationName}
                                    </p>
                                    {membership.membershipType ? (
                                      <p className="text-sm text-gray-700 mt-0.5">{membership.membershipType}</p>
                                    ) : null}
                                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                      {membership.referenceId ? (
                                        <p>Reference ID: {membership.referenceId}</p>
                                      ) : null}
                                      {membership.memberSince !== "—" ? (
                                        <p>Member since: {membership.memberSince}</p>
                                      ) : null}
                                      {membership.note ? (
                                        <p className="text-gray-600 break-words">{membership.note}</p>
                                      ) : null}
                                      <p>Uploaded: {membership.uploadDate}</p>
                                    </div>
                                  </div>

                                  <Badge
                                    className={profileModalStatusBadgeClass(
                                      isApproved ? "approved" : isPending ? "pending" : "rejected"
                                    )}
                                  >
                                    {isApproved ? "Verified" : isPending ? "Not Verified" : "Rejected"}
                                  </Badge>
                                </div>

                                <div className={verificationActionsClass}>
                                  {membership.evidenceUrls.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleViewFile({
                                          id: membership.id,
                                          fileName: membership.fileName,
                                          fileType: membership.fileType,
                                          uploadDate: membership.uploadDate,
                                          status: currentStatus,
                                          evidenceUrl: membership.evidenceUrls[0],
                                          evidenceUrls: membership.evidenceUrls,
                                        })
                                      }
                                      className={verificationActionBtnClass}
                                    >
                                      <Eye className="w-4 h-4 mr-2 shrink-0" />
                                      View
                                    </Button>
                                  )}
                                  {!isApproved && (
                                    <Button
                                      size="sm"
                                      className={`bg-green-600 hover:bg-green-700 ${verificationActionBtnClass}`}
                                      disabled={membershipUpdatingId === membership.id}
                                      onClick={() => {
                                        void handleUpdateMembershipStatus(
                                          membership.id,
                                          membership.organizationName,
                                          "approved"
                                        );
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                                      Approve
                                    </Button>
                                  )}
                                  {!isRejected && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={`border-red-600 text-red-600 hover:bg-red-50 ${verificationActionBtnClass}`}
                                      disabled={membershipUpdatingId === membership.id}
                                      onClick={() => {
                                        void handleUpdateMembershipStatus(
                                          membership.id,
                                          membership.organizationName,
                                          "rejected"
                                        );
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                  )}
                                  {!membership.evidenceUrls.length && isPending && (
                                    <p className="text-xs text-gray-500 flex items-center">
                                      No certificate attached
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />
                    </>
                  );
                })()}

                {/* Account Details */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Account Details</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Business Name</p>
                      <p className="font-medium text-gray-900 mt-1">{profileDetail?.business_name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Post Code</p>
                      <p className="font-medium text-gray-900 mt-1">{profileDetail?.post_code ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Join Date</p>
                      <p className="font-medium text-gray-900 mt-1">{profileDetail ? formatJoinDate(profileDetail.created_at) : selectedProfessional?.joinDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Last Updated</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {profileDetail?.updated_at ? formatJoinDate(profileDetail.updated_at) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Reviews</p>
                      <p className="font-medium text-gray-900 mt-1">{profileDetail?.review ?? selectedProfessional?.reviewCount ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Coordinates</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {profileDetail?.latitude != null && profileDetail?.longitude != null
                          ? `${profileDetail.latitude}, ${profileDetail.longitude}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Registered Services Section */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Registered Services</h4>
                  <div className="space-y-4">
                    {(profileDetail?.services?.length
                      ? profileDetail.services.map((s) => ({
                        id: s.id,
                        name: s.name,
                        status: s.status === "ACTIVE" || s.status?.toLowerCase() === "approved" ? "approved" : s.status?.toUpperCase() === "REJECTED" || s.status?.toLowerCase() === "rejected" ? "rejected" : "pending",
                        uploadDate: null,
                        evidenceFile: null,
                        evidenceType: null,
                        verifiedDate: null,
                        rejectedDate: null,
                        rejectionReason: null,
                      }))
                      : professionalServices[selectedProfessional?.id as keyof typeof professionalServices] ?? []
                    ).map((service: any) => {
                      const serviceStatusVariant =
                        service.status === "approved"
                          ? "approved"
                          : service.status === "pending"
                            ? "pending"
                            : "rejected";
                      const serviceStatusBadge = (
                        <Badge
                          variant="custom"
                          className={`inline-flex w-fit shrink-0 whitespace-nowrap ${profileModalStatusBadgeClass(serviceStatusVariant)}`}
                        >
                          {service.status === "approved" && <CheckCircle className="mr-1 h-3 w-3 shrink-0" />}
                          {service.status === "pending" && <Clock className="mr-1 h-3 w-3 shrink-0" />}
                          {service.status === "rejected" && <XCircle className="mr-1 h-3 w-3 shrink-0" />}
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </Badge>
                      );

                      return (
                      <div
                        key={service.id}
                        className="border rounded-lg p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4"
                      >
                        {/* Service Header - Mobile Optimized */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="min-w-0 flex-1 font-semibold text-base text-gray-900 break-words md:text-lg">
                                {service.name}
                              </h5>
                              <div className="md:hidden">{serviceStatusBadge}</div>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {service.uploadDate ? `Uploaded: ${service.uploadDate}` : "Not uploaded yet"}
                            </p>
                          </div>
                          <div className="hidden md:block">{serviceStatusBadge}</div>
                        </div>

                        {/* Evidence of Competency */}
                        {service.evidenceFile ? (
                          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {service.evidenceType === 'pdf' ? (
                                  <div className="w-12 h-12 md:w-14 md:h-14 bg-red-100 rounded flex items-center justify-center">
                                    <FileText className="w-6 h-6 md:w-7 md:h-7 text-red-600" />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded flex items-center justify-center">
                                    <FileText className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-all">
                                  {service.evidenceFile}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {service.evidenceType?.toUpperCase()} Document
                                </p>
                                {service.verifiedDate && (
                                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Verified on {service.verifiedDate}
                                  </p>
                                )}
                                {service.rejectedDate && service.rejectionReason && (
                                  <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span className="break-words">{service.rejectionReason}</span>
                                  </p>
                                )}
                              </div>
                              <Button variant="ghost" size="sm" className="flex-shrink-0 transition-colors hover:bg-blue-50 hover:text-blue-700">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {/* Admin Actions - Mobile Optimized */}
                        <div className="flex flex-col md:flex-row gap-2 pt-2 border-t">
                          {(profileDetail && typeof service.id === 'number') || (service.status === 'pending' && service.evidenceFile) ? (
                            <>
                              {(service.status === 'pending' || service.status === 'rejected') && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 h-11 md:h-9"
                                  disabled={serviceUpdatingId === service.id}
                                  onClick={() => handleApproveService(service)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve Service
                                </Button>
                              )}
                              {(service.status === 'pending' || service.status === 'approved') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-600 text-red-600 hover:bg-red-50 h-11 md:h-9"
                                  disabled={serviceUpdatingId === service.id}
                                  onClick={() => {
                                    setSelectedService(service);
                                    setServiceRejectModalOpen(true);
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              )}
                            </>
                          ) : null}
                          {service.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-600 text-blue-600 hover:bg-blue-50 h-11 md:h-9"
                              onClick={() => {
                                setSelectedService(service);
                                setServiceReuploadModalOpen(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Request Re-upload
                            </Button>
                          )}
                          {/* Request Evidence Upload hidden per product request
                          {service.status === 'pending' && !service.evidenceFile && (
                            <Button ...>Request Evidence Upload</Button>
                          )}
                          */}
                          {service.status === 'approved' && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 px-2 py-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Service approved and active</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>

                  {((profileDetail?.services?.length ?? 0) === 0 &&
                    (!professionalServices[selectedProfessional?.id as keyof typeof professionalServices] ||
                      professionalServices[selectedProfessional?.id as keyof typeof professionalServices].length === 0)) && (
                      <div className="text-center py-8 text-gray-500">
                        No services registered yet
                      </div>
                    )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="max-sm:justify-between sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setProfileModalOpen(false)}
            >
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setProfileModalOpen(false);
                handleEdit(selectedProfessional);
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Rejection Modal */}
      {/* Send Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={(open) => !open && closeFeedbackModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Give Feedback</DialogTitle>
            <DialogDescription>
              Share your experience with {selectedProfessional?.name ?? "this professional"} for{" "}
              {selectedProfessional
                ? getProfessionalServiceLabel(selectedProfessional)
                : "their services"}
              .
            </DialogDescription>
          </DialogHeader>

          {selectedProfessional && (
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submitFeedback();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="admin-feedback-name">
                  Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="admin-feedback-name"
                  type="text"
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-feedback-email">
                  Reviewer email <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="admin-feedback-email"
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="e.g. john.doe@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Rating <span className="text-red-600">*</span>
                </Label>
                <div
                  className="flex gap-1"
                  onMouseLeave={() => setFeedbackHoverRating(0)}
                  role="group"
                  aria-label="Rating out of 5 stars"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeStars = feedbackHoverRating || Number(feedbackRating) || 0;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="rounded p-0.5 transition-transform hover:scale-110"
                        onClick={() => setFeedbackRating(String(star))}
                        onMouseEnter={() => setFeedbackHoverRating(star)}
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        aria-pressed={Number(feedbackRating) === star}
                      >
                        <Star
                          className={`h-9 w-9 ${
                            activeStars >= star
                              ? "fill-yellow-400 text-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-feedback-message">
                  Feedback <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="admin-feedback-message"
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={4}
                  placeholder="e.g. Excellent service and very professional."
                  required
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeFeedbackModal}
                  disabled={sendingFeedback}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={sendingFeedback}
                >
                  {sendingFeedback ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={serviceRejectModalOpen} onOpenChange={setServiceRejectModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Service Evidence
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the evidence for {selectedService?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="service-rejection-note">Rejection Reason *</Label>
              <Textarea
                id="service-rejection-note"
                value={serviceRejectionNote}
                onChange={(e) => setServiceRejectionNote(e.target.value)}
                placeholder="Explain why the evidence is being rejected (e.g., certificate expired, incorrect document, poor image quality)..."
                className="mt-2"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be sent to the professional
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Service will be marked as rejected</p>
                <p className="text-sm text-red-700 mt-1">
                  The professional will need to re-upload valid evidence before this service can be approved.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setServiceRejectModalOpen(false);
                setServiceRejectionNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!serviceRejectionNote.trim()) {
                  toast.error("Please provide a rejection reason");
                  return;
                }
                if (selectedService) void handleRejectService(selectedService);
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Re-upload Request Modal */}
      {/* <Dialog open={serviceReuploadModalOpen} onOpenChange={setServiceReuploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F] flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Request Evidence Re-upload
            </DialogTitle>
            <DialogDescription>
              Request the professional to upload or re-upload evidence for {selectedService?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="service-reupload-note">Message to Professional (Optional)</Label>
              <Textarea
                id="service-reupload-note"
                value={serviceReuploadNote}
                onChange={(e) => setServiceReuploadNote(e.target.value)}
                placeholder="Add any specific instructions or requirements for the evidence upload (e.g., current certification required, high-quality scan needed)..."
                className="mt-2"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be included in the notification email
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Professional will be notified</p>
                <p className="text-sm text-blue-700 mt-1">
                  An email notification will be sent requesting the evidence upload with your message.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setServiceReuploadModalOpen(false);
                setServiceReuploadNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                toast.success(`Re-upload request sent for ${selectedService?.name}. Professional notified via email.`);
                setServiceReuploadModalOpen(false);
                setServiceReuploadNote("");
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* File Preview Modal */}
      <Dialog
        open={filePreviewModalOpen}
        onOpenChange={(open) => {
          setFilePreviewModalOpen(open);
          if (!open) {
            setFilePreviewUrlIndex(0);
            setFilePreviewFailed(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">Document Preview</DialogTitle>
          </DialogHeader>

          <div className="py-4 flex-1 min-h-0 overflow-auto">
            {(() => {
              const previewUrls: string[] = Array.isArray(selectedFile?.evidenceUrls)
                ? selectedFile.evidenceUrls.filter(Boolean)
                : selectedFile?.evidenceUrl
                  ? [selectedFile.evidenceUrl]
                  : [];
              const activePreviewUrl = previewUrls[filePreviewUrlIndex] ?? previewUrls[0] ?? "";
              const isPdfPreview =
                selectedFile?.fileType === "pdf" ||
                /\.pdf(\?.*)?$/i.test(activePreviewUrl || "") ||
                /\.pdf(\?.*)?$/i.test(selectedFile?.fileName || "");
              const isImagePreview =
                selectedFile?.fileType === "image" ||
                /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(activePreviewUrl || "") ||
                /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(selectedFile?.fileName || "") ||
                /path=[^&]*\.(png|jpg|jpeg|gif|webp|bmp|svg)/i.test(activePreviewUrl || "");

              if (!activePreviewUrl) {
                return (
                  <div className="bg-gray-100 rounded-lg p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                    <FileText className="w-24 h-24 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">{filePreviewDisplayName(selectedFile?.fileName)}</p>
                    <p className="text-sm text-gray-600">File URL not available for preview or download</p>
                  </div>
                );
              }

              return isPdfPreview ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg overflow-hidden min-h-[400px]">
                    <iframe
                      src={`${activePreviewUrl}#toolbar=1`}
                      title={filePreviewDisplayName(selectedFile.fileName)}
                      className="w-full h-[500px] border-0"
                    />
                  </div>
                </div>
              ) : isImagePreview ? (
                <div className="bg-gray-100 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                  {filePreviewFailed ? (
                    <div className="text-center p-4">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Unable to load image preview</p>
                    </div>
                  ) : (
                    <img
                      key={activePreviewUrl}
                      src={activePreviewUrl}
                      alt={filePreviewDisplayName(selectedFile.fileName)}
                      className="max-w-full max-h-[500px] object-contain rounded shadow-lg"
                      onError={() => {
                        setFilePreviewUrlIndex((current) => {
                          const max = previewUrls.length - 1;
                          if (current >= max) {
                            setFilePreviewFailed(true);
                            return current;
                          }
                          return current + 1;
                        });
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                  <FileText className="w-24 h-24 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">{filePreviewDisplayName(selectedFile?.fileName)}</p>
                  <p className="text-sm text-gray-600 mb-4">Preview not available for this file type</p>
                  <Button className="bg-blue-600 text-white transition-colors hover:bg-blue-700 hover:text-white" onClick={handleDownloadEvidence}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              );
            })()}

            {/* File Information */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">File Type</p>
                  <p className="font-medium text-gray-900 mt-1">{(selectedFile?.fileType ?? "—").toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <Badge className={`mt-1 ${selectedFile?.status === 'approved' ? 'bg-green-100 text-green-700' :
                    selectedFile?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    {selectedFile?.status ?? "—"}
                  </Badge>
                </div>
                {selectedFile?.approvedDate && (
                  <div>
                    <p className="text-gray-600">Approved Date</p>
                    <p className="font-medium text-gray-900 mt-1">{selectedFile?.approvedDate}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="transition-colors hover:bg-gray-100 hover:text-gray-900" onClick={() => setFilePreviewModalOpen(false)}>
              Close
            </Button>
            {(selectedFile?.evidenceUrl || (Array.isArray(selectedFile?.evidenceUrls) && selectedFile.evidenceUrls.length > 0)) && (
              <Button className="bg-blue-600 text-white transition-colors hover:bg-blue-700 hover:text-white" onClick={handleDownloadEvidence}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}