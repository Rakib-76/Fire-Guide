import React, { useState, useEffect, useRef } from "react";
import { Shield, CheckCircle, AlertCircle, Upload, FileText, Award, X, Loader2, Pencil, Building2, Plus, ImageIcon, MoreHorizontal, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
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
import { getProfessionalWiseIdentity, createProfessionalIdentity, updateProfessionalIdentity, ProfessionalIdentityItem, getVerificationSummary, VerificationSummaryData, getProfessionalWiseEvidence, ProfessionalEvidenceItem } from "../api/professionalsService";
import { createCertification, updateEvidence } from "../api/qualificationsService";
import {
  showInsuranceCoverage,
  InsuranceItem,
  updateInsuranceDocument,
  createInsuranceCoverage,
  updateInsuranceCoverage,
} from "../api/insuranceService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import {
  createMembership,
  getAllMemberships,
  encodeImageFileAsBase64DataUrl,
  buildMembershipEvidenceViewUrls,
  getMembershipMediaUrl,
  isMembershipImageFile,
  resolveMembershipEntryMedia,
  type ProfessionalMembershipApiItem,
} from "../api/membershipService";
import { resolveApiBaseUrl } from "../lib/apiBaseUrl";
import { toast } from "sonner";

const PUBLIC_LIABILITY_TITLE = "Public Liability Insurance";
const PROFESSIONAL_INDEMNITY_TITLE = "Professional Indemnity Insurance";

const PROFESSIONAL_MEMBERSHIPS_STORAGE_PREFIX = "fireguide_professional_memberships";

type ProfessionalMembershipEntry = {
  id: string;
  organizationName: string;
  membershipType: string;
  membershipId: string;
  memberSince: string;
  notes: string;
  status?: string;
  /** Raw path from API e.g. membership/123_evidence.jpeg */
  evidencePath?: string;
  logoPath?: string;
  documentFileName?: string;
  documentDataUrl?: string;
  documentUploadedAt?: string;
  logoFileName?: string;
  logoDataUrl?: string;
};

type MembershipStatusDisplay = {
  label: string;
  className: string;
};

function normalizeMembershipStatus(status: string | null | undefined): string {
  const value = String(status ?? "").trim().toLowerCase();
  if (!value) return "pending";
  if (value === "approved" || value === "verified" || value === "active") return "verified";
  if (value === "rejected" || value === "declined" || value === "invalid" || value === "denied") {
    return "rejected";
  }
  if (value === "pending" || value === "submitted" || value === "review") return "pending";
  return value;
}

function getMembershipStatusDisplay(status: string | null | undefined): MembershipStatusDisplay {
  const normalized = normalizeMembershipStatus(status);
  if (normalized === "verified") {
    return {
      label: "Verified by Fire Guide",
      className: "border border-green-400 bg-green-100 text-green-800",
    };
  }
  if (normalized === "rejected") {
    return {
      label: "Rejected / Invalid",
      className: "border border-red-400 bg-red-100 text-red-800",
    };
  }
  return {
    label: "Pending Review",
    className: "border border-yellow-400 bg-yellow-100 text-yellow-900",
  };
}

function formatMembershipListDate(dateString: string | null | undefined): string {
  const value = (dateString ?? "").trim();
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return value;
  }
}

function getMembershipOrganizationShortName(name: string): string {
  const match = name.match(/\(([^)]+)\)/);
  if (match?.[1]?.trim()) return match[1].trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return name;
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function membershipsStorageKey(): string {
  const professionalId = getProfessionalId();
  return professionalId
    ? `${PROFESSIONAL_MEMBERSHIPS_STORAGE_PREFIX}_${professionalId}`
    : PROFESSIONAL_MEMBERSHIPS_STORAGE_PREFIX;
}

function loadStoredMemberships(): ProfessionalMembershipEntry[] {
  try {
    const raw = localStorage.getItem(membershipsStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ProfessionalMembershipEntry => {
        if (!item || typeof item !== "object") return false;
        const row = item as Partial<ProfessionalMembershipEntry>;
        return typeof row.id === "string" && typeof row.organizationName === "string";
      })
      .map((item) => ({
        id: item.id,
        organizationName: item.organizationName.trim(),
        membershipType: (item.membershipType ?? "").trim(),
        membershipId: (item.membershipId ?? "").trim(),
        memberSince: (item.memberSince ?? "").trim(),
        notes: (item.notes ?? "").trim(),
        status: (item.status ?? "").trim() || "pending",
        evidencePath: (item.evidencePath ?? "").trim() || undefined,
        logoPath: (item.logoPath ?? "").trim() || undefined,
        documentFileName: (item.documentFileName ?? "").trim() || undefined,
        documentDataUrl: (item.documentDataUrl ?? "").trim() || undefined,
        documentUploadedAt: (item.documentUploadedAt ?? "").trim() || undefined,
        logoFileName: (item.logoFileName ?? "").trim() || undefined,
        logoDataUrl: (item.logoDataUrl ?? "").trim() || undefined,
      }))
      .map((item) => resolveMembershipEntryMedia(item))
      .filter((item) => item.organizationName.length > 0);
  } catch {
    return [];
  }
}

function persistMemberships(entries: ProfessionalMembershipEntry[]): void {
  try {
    localStorage.setItem(membershipsStorageKey(), JSON.stringify(entries));
  } catch {
    // ignore quota / private mode errors for UI-only persistence
  }
}

const EMPTY_MEMBERSHIP_FORM = {
  organizationName: "",
  membershipType: "",
  membershipId: "",
  memberSince: "",
  notes: "",
  documentFileName: "",
  documentDataUrl: "",
  documentUploadedAt: "",
  logoFileName: "",
  logoDataUrl: "",
};

type MembershipUploadTarget = {
  kind: "document" | "logo";
  membershipId?: string;
  forForm?: boolean;
};

const PROFESSIONAL_MEMBERSHIP_SUGGESTIONS = [
  "Institute of Fire Safety Managers (IFSM)",
  "Institution of Fire Engineers (IFE)",
  "Fire Industry Association (FIA)",
  "SAFE Fire Safety Register (SAFE)",
  "Fire Protection Association (FPA)",
  "BAFE (British Approvals for Fire Equipment)",
  "IOSH (Institution of Occupational Safety and Health)",
  "NEBOSH Alumni / Network",
  "NFPA (National Fire Protection Association)",
];

function insuranceTitleLower(title: string | null | undefined): string {
  return (title ?? "").trim().toLowerCase();
}

function isPublicLiabilityItem(item: InsuranceItem): boolean {
  const title = insuranceTitleLower(item.title);
  return (
    title.includes("public liability") ||
    (title.includes("liability") && !title.includes("indemnity"))
  );
}

function isProfessionalIndemnityItem(item: InsuranceItem): boolean {
  const title = insuranceTitleLower(item.title);
  return title.includes("professional indemnity") || title.includes("indemnity");
}

function findPublicLiabilityItem(items: InsuranceItem[]): InsuranceItem | undefined {
  return items.find(isPublicLiabilityItem);
}

function findProfessionalIndemnityItem(items: InsuranceItem[]): InsuranceItem | undefined {
  return items.find(isProfessionalIndemnityItem);
}

function findDocumentOnlyInsuranceItem(items: InsuranceItem[]): InsuranceItem | undefined {
  return items.find(
    (item) =>
      Boolean(item.document?.trim()) &&
      !isPublicLiabilityItem(item) &&
      !isProfessionalIndemnityItem(item)
  );
}

interface InsuranceDetailsFormState {
  publicLiability: string;
  professionalIndemnity: string;
  provider: string;
  expire_date: string;
}

type InsuranceDocumentTarget = "public_liability" | "professional_indemnity";

function getInsuranceDocumentUrl(documentPath: string | null | undefined): string {
  const path = documentPath?.trim() ?? "";
  if (!path) return "";
  if (path.includes("http://") || path.includes("https://")) return path;
  const baseUrl = resolveApiBaseUrl();
  const apiBaseUrl = baseUrl.replace(/\/api\/?$/, "");
  return `${apiBaseUrl}/image/${path}`;
}

function resolvePublicLiabilityRow(items: InsuranceItem[]): InsuranceItem | undefined {
  return findPublicLiabilityItem(items) || findDocumentOnlyInsuranceItem(items);
}

function insuranceRowRecord(row: InsuranceItem | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return row as unknown as Record<string, unknown>;
}

interface InsuranceDocumentStatusEntry {
  target: InsuranceDocumentTarget;
  label: string;
  row: InsuranceItem | undefined;
  uiStatus: string;
  rejectionNote: string | null;
}

function buildInsuranceDocumentStatusEntries(
  items: InsuranceItem[],
  normalizeStatus: (status: string | null | undefined) => string,
  extractNote: (record: Record<string, unknown> | null | undefined) => string | null
): InsuranceDocumentStatusEntry[] {
  const slots: Array<{ target: InsuranceDocumentTarget; label: string; row: InsuranceItem | undefined }> = [
    {
      target: "public_liability",
      label: "Public Liability",
      row: resolvePublicLiabilityRow(items),
    },
    {
      target: "professional_indemnity",
      label: "Professional Indemnity",
      row: findProfessionalIndemnityItem(items),
    },
  ];

  return slots.map((slot) => {
    const uiStatus = slot.row ? normalizeStatus(slot.row.status) : "pending";
    const rejectionNote =
      uiStatus === "rejected" ? extractNote(insuranceRowRecord(slot.row)) : null;
    return { ...slot, uiStatus, rejectionNote };
  });
}

function buildInsuranceFormState(items: InsuranceItem[]): InsuranceDetailsFormState {
  const plItem = findPublicLiabilityItem(items);
  const piItem = findProfessionalIndemnityItem(items);
  const documentOnly = findDocumentOnlyInsuranceItem(items);

  const expireDates = items
    .map((item) => item.expire_date)
    .filter((value): value is string => Boolean(value?.trim()));
  const latestExpire =
    expireDates.length > 0
      ? expireDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : "";

  const provider =
    plItem?.provider_name?.trim() ||
    piItem?.provider_name?.trim() ||
    documentOnly?.provider_name?.trim() ||
    items[0]?.provider_name?.trim() ||
    "";

  return {
    publicLiability: plItem?.price?.trim() || documentOnly?.price?.trim() || "",
    professionalIndemnity: piItem?.price?.trim() || "",
    provider,
    expire_date: latestExpire
      ? new Date(latestExpire).toISOString().split("T")[0]
      : "",
  };
}

export function ProfessionalVerification() {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [identityData, setIdentityData] = useState<ProfessionalIdentityItem | null>(null);
  const [qualificationsEvidence, setQualificationsEvidence] = useState<ProfessionalEvidenceItem[]>([]);
  const [insuranceData, setInsuranceData] = useState<InsuranceItem[]>([]);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(false);
  const [verificationSummary, setVerificationSummary] = useState<VerificationSummaryData | null>(null);
  const [currentUploadRequirement, setCurrentUploadRequirement] = useState<string | null>(null);
  const [currentEvidenceId, setCurrentEvidenceId] = useState<number | null>(null);
  const [insuranceUploadTarget, setInsuranceUploadTarget] =
    useState<InsuranceDocumentTarget | null>(null);
  const [insuranceDetailsOpen, setInsuranceDetailsOpen] = useState(false);
  const [isSavingInsuranceDetails, setIsSavingInsuranceDetails] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState<InsuranceDetailsFormState>({
    publicLiability: "",
    professionalIndemnity: "",
    provider: "",
    expire_date: "",
  });
  const [memberships, setMemberships] = useState<ProfessionalMembershipEntry[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);
  const [membershipForm, setMembershipForm] = useState({ ...EMPTY_MEMBERSHIP_FORM });
  const [membershipFormOpen, setMembershipFormOpen] = useState(false);
  const [membershipConfirmed, setMembershipConfirmed] = useState(false);
  const [isSavingMembership, setIsSavingMembership] = useState(false);
  const [membershipUploadTarget, setMembershipUploadTarget] = useState<MembershipUploadTarget | null>(null);
  const [uploadingMembershipAsset, setUploadingMembershipAsset] = useState<string | null>(null);
  const [membershipEvidencePreview, setMembershipEvidencePreview] = useState<{
    title: string;
    urls: string[];
  } | null>(null);
  const [membershipEvidencePreviewIndex, setMembershipEvidencePreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const membershipAssetInputRef = useRef<HTMLInputElement>(null);

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Fetch verification summary data
  const fetchVerificationSummary = async () => {
    try {
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching verification summary");
        return;
      }

      const response = await getVerificationSummary({ api_token: apiToken });
      
      if (response.status === true && response.data) {
        setVerificationSummary(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching verification summary:", err);
    }
  };

  // Fetch qualifications evidence data
  const fetchQualificationsEvidence = async () => {
    try {
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching qualifications evidence");
        return;
      }

      const response = await getProfessionalWiseEvidence({ api_token: apiToken });
      
      if (response.status === true && response.data) {
        setQualificationsEvidence(response.data);
      } else {
        setQualificationsEvidence([]);
      }
    } catch (err: any) {
      console.error("Error fetching qualifications evidence:", err);
      setQualificationsEvidence([]);
    }
  };

  const fetchMemberships = async () => {
    try {
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching memberships");
        setMemberships(loadStoredMemberships());
        return;
      }

      setIsLoadingMemberships(true);
      const items = await getAllMemberships(apiToken);
      const entries = items
        .map((item) => mapApiMembershipToEntry(item))
        .filter((item) => item.organizationName.length > 0);
      setMemberships(entries);
      persistMemberships(entries);
    } catch (err: unknown) {
      console.error("Error fetching memberships:", err);
      setMemberships(loadStoredMemberships());
    } finally {
      setIsLoadingMemberships(false);
    }
  };

  // Fetch insurance coverage data
  const fetchInsuranceData = async () => {
    try {
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching insurance coverage");
        return;
      }

      const response = await showInsuranceCoverage({ api_token: apiToken });
      
      if (response.status === 'success' && response.data) {
        setInsuranceData(response.data);
      } else {
        setInsuranceData([]);
      }
    } catch (err: any) {
      console.error("Error fetching insurance coverage:", err);
      setInsuranceData([]);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchIdentityData();
    fetchVerificationSummary();
    fetchQualificationsEvidence();
    fetchInsuranceData();
    void fetchMemberships();
  }, []);

  // Progress: each of insurance, certificate, identity true = one third (no other logic).
  const verificationChecks = verificationSummary?.checks;
  const verificationCompletedCount = [
    verificationChecks?.insurance === true,
    verificationChecks?.certificate === true,
    verificationChecks?.identity === true,
  ].filter(Boolean).length;
  const verificationStatus = {
    overall: verificationSummary?.active_status || identityData?.status || "pending",
    completionPercentage: Math.round((verificationCompletedCount / 3) * 100),
  };

  // Map API checks to requirement status (verified = true, pending = false)
  const getRequirementStatus = (checkValue: boolean | undefined) => {
    if (checkValue === undefined) return "pending";
    return checkValue ? "verified" : "pending";
  };

  const normalizeUiStatus = (status: string | null | undefined): string => {
    const value = String(status ?? "").trim().toLowerCase();
    if (!value) return "pending";
    if (value === "rejected" || value === "declined" || value === "denied") return "rejected";
    if (value === "verified" || value === "approved" || value === "active") return "verified";
    return value;
  };

  const resolveIdentityRequirementStatus = (): string => {
    const recordStatus = normalizeUiStatus(identityData?.status);
    if (recordStatus === "rejected") return "rejected";
    if (verificationSummary?.checks?.identity === true) return "verified";
    if (recordStatus === "verified") return "verified";
    return "pending";
  };

  const extractRejectionNote = (record: Record<string, unknown> | null | undefined): string | null => {
    if (!record) return null;
    const keys = [
      "reject_reason",
      "rejection_reason",
      "reject_note",
      "admin_note",
      "note",
      "comments",
      "remark",
    ];
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  const rejectionGuidanceByRequirement: Record<string, string> = {
    identity:
      "Your identity document was rejected by admin. Please upload a clear, valid government-issued ID.",
    qualifications:
      "Your qualification certificate was rejected. Please upload an updated or clearer certificate document.",
    insurance:
      "Your insurance document was rejected. Please upload valid insurance coverage documents.",
  };

  const insuranceDocumentStatuses = buildInsuranceDocumentStatusEntries(
    insuranceData,
    normalizeUiStatus,
    extractRejectionNote
  );

  const resolveInsuranceRequirementStatus = (): string => {
    const tracked = insuranceDocumentStatuses.filter((entry) => entry.row);
    const rejectedEntries = tracked.filter((entry) => entry.uiStatus === "rejected");
    const verifiedEntries = tracked.filter((entry) => entry.uiStatus === "verified");

    if (rejectedEntries.length > 0) {
      return rejectedEntries.length === tracked.length && tracked.length > 0
        ? "rejected"
        : "action_required";
    }
    if (verificationSummary?.checks?.insurance === true) return "verified";
    if (
      tracked.length > 0 &&
      verifiedEntries.length === tracked.length
    ) {
      return "verified";
    }
    if (insuranceData.length > 0) return "pending";
    return "pending";
  };

  const getInsuranceRejectionSummaryText = (): string => {
    const rejected = insuranceDocumentStatuses.filter((entry) => entry.uiStatus === "rejected");
    const verified = insuranceDocumentStatuses.filter((entry) => entry.uiStatus === "verified");

    if (rejected.length === 0) {
      return rejectionGuidanceByRequirement.insurance;
    }

    const rejectedLines = rejected.map((entry) => {
      const note = entry.rejectionNote ? ` — ${entry.rejectionNote}` : "";
      return `${entry.label} document was rejected${note}`;
    });

    const verifiedLine =
      verified.length > 0
        ? ` ${verified.map((entry) => entry.label).join(" and ")} ${
            verified.length === 1 ? "is" : "are"
          } verified.`
        : "";

    return `${rejectedLines.join(". ")}.${verifiedLine} Please upload corrected file(s) using Update Document on the rejected item(s) below.`;
  };

  const resolveQualificationsRequirementStatus = (): string => {
    if (qualificationsEvidence.some((item) => normalizeUiStatus(item.status) === "rejected")) {
      return "rejected";
    }
    if (verificationSummary?.checks?.certificate === true) return "verified";
    if (qualificationsEvidence.some((item) => normalizeUiStatus(item.status) === "verified")) {
      return "verified";
    }
    if (qualificationsEvidence.length > 0) return "pending";
    return "pending";
  };

  const getRequirementRejectionNote = (requirementId: string): string | null => {
    if (requirementId === "identity") {
      return extractRejectionNote(identityData as unknown as Record<string, unknown>);
    }
    if (requirementId === "qualifications") {
      const rejected = qualificationsEvidence.find(
        (item) => normalizeUiStatus(item.status) === "rejected"
      );
      return extractRejectionNote(rejected as unknown as Record<string, unknown>);
    }
    if (requirementId === "insurance") {
      const rejected = insuranceDocumentStatuses.find((entry) => entry.uiStatus === "rejected");
      return rejected?.rejectionNote ?? null;
    }
    return null;
  };

  // Helper function to format price
  const formatPrice = (price: string | null | undefined): string => {
    if (price == null || price === "") return "N/A";
    try {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum)) return price;
      // Format as currency with appropriate scale
      if (priceNum >= 1000000) {
        return `£${(priceNum / 1000000).toFixed(1)}M`;
      } else if (priceNum >= 1000) {
        // For values >= 1000, show as K or full amount with commas
        if (priceNum >= 10000) {
          return `£${(priceNum / 1000).toFixed(0)}K`;
        }
        return `£${priceNum.toLocaleString('en-GB')}`;
      }
      return `£${priceNum.toLocaleString('en-GB')}`;
    } catch (e) {
      return price;
    }
  };

  // Helper function to format expire date
  const formatExpireDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get insurance details from fetched data
  const getInsuranceDetails = () => {
    if (!insuranceData || insuranceData.length === 0) {
      return {
        publicLiability: "N/A",
        professionalIndemnity: "N/A",
        provider: "N/A",
        validUntil: "N/A",
      };
    }

    const plItem = resolvePublicLiabilityRow(insuranceData);
    const piItem = findProfessionalIndemnityItem(insuranceData);
    const documentOnly = findDocumentOnlyInsuranceItem(insuranceData);
    const resolvedPl = plItem || documentOnly;

    const allExpireDates = insuranceData
      .map((item) => item.expire_date)
      .filter((value): value is string => Boolean(value?.trim()));
    const latestExpireDate =
      allExpireDates.length > 0
        ? allExpireDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;

    const provider =
      plItem?.provider_name?.trim() ||
      piItem?.provider_name?.trim() ||
      documentOnly?.provider_name?.trim() ||
      insuranceData[0]?.provider_name?.trim() ||
      "";

    return {
      publicLiability: resolvedPl?.price ? formatPrice(resolvedPl.price) : "N/A",
      professionalIndemnity: piItem?.price ? formatPrice(piItem.price) : "N/A",
      provider: provider || "N/A",
      validUntil: latestExpireDate ? formatExpireDate(latestExpireDate) : "N/A",
    };
  };

  const openInsuranceDetailsDialog = () => {
    setInsuranceForm(buildInsuranceFormState(insuranceData));
    setInsuranceDetailsOpen(true);
  };

  const upsertInsuranceCoverageRow = async (
    apiToken: string,
    professionalId: number,
    existing: InsuranceItem | undefined,
    title: string,
    price: string,
    expireDate: string,
    providerName: string
  ) => {
    const payload = {
      api_token: apiToken,
      title,
      price,
      expire_date: expireDate,
      professional_id: professionalId,
      provider_name: providerName.trim() || undefined,
    };

    if (existing?.id) {
      return updateInsuranceCoverage({
        ...payload,
        id: existing.id,
      });
    }

    return createInsuranceCoverage(payload);
  };

  const handleSaveInsuranceDetails = async (event: React.FormEvent) => {
    event.preventDefault();

    const { publicLiability, professionalIndemnity, provider, expire_date } = insuranceForm;

    if (!publicLiability.trim() || !professionalIndemnity.trim() || !provider.trim() || !expire_date) {
      toast.error("Please fill in all insurance coverage fields.");
      return;
    }

    const plValue = parseFloat(publicLiability);
    const piValue = parseFloat(professionalIndemnity);
    if (Number.isNaN(plValue) || plValue <= 0 || Number.isNaN(piValue) || piValue <= 0) {
      toast.error("Please enter valid coverage amounts greater than 0.");
      return;
    }

    const expireDate = new Date(expire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expireDate <= today) {
      toast.error("Expiry date must be in the future.");
      return;
    }

    const apiToken = getApiToken();
    const professionalId = getProfessionalId();
    if (!apiToken) {
      toast.error("Please log in to save insurance details.");
      return;
    }
    if (!professionalId) {
      toast.error("Professional ID not found. Please log in again.");
      return;
    }

    setIsSavingInsuranceDetails(true);
    try {
      const plExisting = findPublicLiabilityItem(insuranceData);
      const piExisting = findProfessionalIndemnityItem(insuranceData);
      const documentOnly = findDocumentOnlyInsuranceItem(insuranceData);
      const plTarget = plExisting || documentOnly;

      const plResponse = await upsertInsuranceCoverageRow(
        apiToken,
        professionalId,
        plTarget,
        PUBLIC_LIABILITY_TITLE,
        publicLiability.trim(),
        expire_date,
        provider.trim()
      );

      const plOk =
        plResponse.status === "success" ||
        plResponse.success === true ||
        Boolean(plResponse.data);
      if (!plOk) {
        toast.error(plResponse.message || plResponse.error || "Failed to save public liability coverage.");
        return;
      }

      const piResponse = await upsertInsuranceCoverageRow(
        apiToken,
        professionalId,
        piExisting,
        PROFESSIONAL_INDEMNITY_TITLE,
        professionalIndemnity.trim(),
        expire_date,
        provider.trim()
      );

      const piOk =
        piResponse.status === "success" ||
        piResponse.success === true ||
        Boolean(piResponse.data);
      if (!piOk) {
        toast.error(piResponse.message || piResponse.error || "Failed to save professional indemnity coverage.");
        return;
      }

      toast.success("Insurance coverage details saved.");
      setInsuranceDetailsOpen(false);
      await fetchInsuranceData();
      await fetchVerificationSummary();
    } catch (error: unknown) {
      const message =
        (error as { message?: string })?.message ||
        (error as { error?: string })?.error ||
        "Failed to save insurance details. Please try again.";
      toast.error(message);
    } finally {
      setIsSavingInsuranceDetails(false);
    }
  };

  // Get insurance verified date from fetched data
  const getInsuranceVerifiedDate = () => {
    if (!insuranceData || insuranceData.length === 0) {
      return verificationSummary?.checks?.insurance ? "Oct 17, 2024" : null;
    }

    // Get the most recent updated_at date
    const allDates = insuranceData
      .map(item => item.updated_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return allDates.length > 0 ? formatDate(allDates[0]) : null;
  };

  const mapApiMembershipToEntry = (
    item: ProfessionalMembershipApiItem,
    preview?: { documentDataUrl?: string; logoDataUrl?: string }
  ): ProfessionalMembershipEntry => {
    const evidencePath = item.evidence?.trim() || undefined;
    const logoPath = item.logo?.trim() || undefined;
    const documentPreview = preview?.documentDataUrl?.trim();
    const logoPreview = preview?.logoDataUrl?.trim();

    return resolveMembershipEntryMedia({
      id: String(item.id),
      organizationName: (item.organization_name ?? "").trim(),
      membershipType: (item.membership_type ?? "").trim(),
      membershipId: (item.reference_id ?? "").trim(),
      memberSince: (item.member_since ?? "").trim(),
      notes: (item.note ?? "").trim(),
      status: (item.status ?? "").trim() || "pending",
      evidencePath,
      logoPath,
      ...(evidencePath || documentPreview
        ? {
            documentFileName: "Membership certificate",
            documentDataUrl:
              documentPreview?.startsWith("data:") ? documentPreview : undefined,
            documentUploadedAt: item.created_at ?? new Date().toISOString(),
          }
        : {}),
      ...(logoPath || logoPreview
        ? {
            logoFileName: "Organization logo",
            logoDataUrl: logoPreview?.startsWith("data:") ? logoPreview : undefined,
          }
        : {}),
    });
  };

  const closeMembershipForm = () => {
    setMembershipFormOpen(false);
    setMembershipForm({ ...EMPTY_MEMBERSHIP_FORM });
    setMembershipConfirmed(false);
  };

  const handleAddMembership = async () => {
    const organizationName = membershipForm.organizationName.trim();
    if (!organizationName) {
      toast.error("Please select or enter the professional body / organization.");
      return;
    }

    if (!membershipConfirmed) {
      toast.error("Please confirm that your membership information is accurate.");
      return;
    }

    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to save membership.");
      return;
    }

    setIsSavingMembership(true);
    try {
      const response = await createMembership({
        api_token: apiToken,
        organization_name: organizationName,
        membership_type: membershipForm.membershipType.trim() || undefined,
        reference_id: membershipForm.membershipId.trim() || undefined,
        member_since: membershipForm.memberSince.trim() || undefined,
        note: membershipForm.notes.trim() || undefined,
        evidence: membershipForm.documentDataUrl.trim() || undefined,
        logo: membershipForm.logoDataUrl.trim() || undefined,
      });

      const ok =
        response.status === true ||
        response.status === "success" ||
        response.success === true ||
        Boolean(response.data?.id);

      if (!ok) {
        toast.error(response.message || response.error || "Failed to save membership.");
        return;
      }

      setMembershipForm({ ...EMPTY_MEMBERSHIP_FORM });
      setMembershipConfirmed(false);
      setMembershipFormOpen(false);
      toast.success(response.message || "Membership saved successfully.");
      await fetchMemberships();
    } catch {
      toast.error("Failed to save membership. Please try again.");
    } finally {
      setIsSavingMembership(false);
    }
  };

  const handleRemoveMembership = (id: string) => {
    const next = memberships.filter((item) => item.id !== id);
    setMemberships(next);
    persistMemberships(next);
    toast.success("Membership removed.");
  };

  const handleMembershipAssetClick = (target: MembershipUploadTarget) => {
    setMembershipUploadTarget(target);
    membershipAssetInputRef.current?.click();
  };

  const applyMembershipAssetToForm = (
    kind: "document" | "logo",
    file: File,
    dataUrl: string
  ) => {
    if (kind === "document") {
      setMembershipForm((prev) => ({
        ...prev,
        documentFileName: file.name,
        documentDataUrl: dataUrl,
        documentUploadedAt: new Date().toISOString(),
      }));
      return;
    }
    setMembershipForm((prev) => ({
      ...prev,
      logoFileName: file.name,
      logoDataUrl: dataUrl,
    }));
  };

  const applyMembershipAssetToEntry = (
    membershipId: string,
    kind: "document" | "logo",
    file: File,
    dataUrl: string
  ) => {
    const next = memberships.map((item) => {
      if (item.id !== membershipId) return item;
      if (kind === "document") {
        return {
          ...item,
          documentFileName: file.name,
          documentDataUrl: dataUrl,
          documentUploadedAt: new Date().toISOString(),
        };
      }
      return {
        ...item,
        logoFileName: file.name,
        logoDataUrl: dataUrl,
      };
    });
    setMemberships(next);
    persistMemberships(next);
  };

  const handleMembershipAssetChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = membershipUploadTarget;
    if (!file || !target) return;

    const isLogo = target.kind === "logo";
    const maxSize = isLogo ? 3 * 1024 * 1024 : 5 * 1024 * 1024;

    if (!isMembershipImageFile(file)) {
      toast.error(
        isLogo
          ? "Please select an image file (JPEG, PNG, GIF, or WebP) for the logo."
          : "Please select an image file (JPEG, PNG, GIF, or WebP) for the membership certificate."
      );
      e.target.value = "";
      setMembershipUploadTarget(null);
      return;
    }

    if (file.size > maxSize) {
      toast.error(isLogo ? "Logo image must be less than 3MB." : "Certificate image must be less than 5MB.");
      e.target.value = "";
      setMembershipUploadTarget(null);
      return;
    }

    const uploadKey = target.forForm
      ? `form-${target.kind}`
      : `${target.membershipId}-${target.kind}`;
    setUploadingMembershipAsset(uploadKey);

    try {
      const dataUrl = await encodeImageFileAsBase64DataUrl(file);
      if (target.forForm) {
        applyMembershipAssetToForm(target.kind, file, dataUrl);
        toast.success(
          target.kind === "document" ? "Membership document added." : "Organization logo added."
        );
      } else if (target.membershipId) {
        applyMembershipAssetToEntry(target.membershipId, target.kind, file, dataUrl);
        toast.success(
          target.kind === "document"
            ? "Membership document updated."
            : "Organization logo updated."
        );
      }
    } catch {
      toast.error("Failed to process file. Please try again.");
    } finally {
      setUploadingMembershipAsset(null);
      setMembershipUploadTarget(null);
      e.target.value = "";
    }
  };

  const openMembershipEvidencePreview = (
    title: string,
    entry: Pick<ProfessionalMembershipEntry, "evidencePath" | "documentDataUrl">
  ) => {
    const urls = buildMembershipEvidenceViewUrls({
      evidencePath: entry.evidencePath,
      documentDataUrl: entry.documentDataUrl,
    });
    if (urls.length === 0) {
      toast.error("No membership certificate is available to view.");
      return;
    }
    setMembershipEvidencePreviewIndex(0);
    setMembershipEvidencePreview({ title, urls });
  };

  const requirements = [
    {
      id: "identity",
      title: "Identity Verification",
      description: "Government-issued ID verified",
      status: resolveIdentityRequirementStatus(),
      verifiedDate: identityData?.updated_at ? formatDate(identityData.updated_at) : null,
      file: identityData?.file || null,
      icon: Shield
    },
    {
      id: "qualifications",
      title: "Professional Qualifications",
      description: "Fire Safety Diploma, NEBOSH Certificate",
      status: resolveQualificationsRequirementStatus(),
      verifiedDate: qualificationsEvidence.length > 0 
        ? (() => {
            // Find the most recent evidence item (by created_at date)
            const sortedEvidence = [...qualificationsEvidence].sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA; // Sort descending (newest first)
            });
            const mostRecent = sortedEvidence[0];
            return mostRecent && mostRecent.created_at 
              ? formatDate(mostRecent.created_at)
              : null;
          })()
        : null,
      icon: Award,
      documents: qualificationsEvidence.map((item) => {
        // Use evidence if available, otherwise fall back to file
        const evidenceOrFile = item.evidence || item.file || '';
        
        // Extract filename from URL or use evidence as filename
        let fileName = evidenceOrFile;
        let fileUrl = evidenceOrFile;
        
        // If it's already a full URL, use it directly
        // Otherwise, construct the full URL from the base URL
        if (evidenceOrFile && !evidenceOrFile.includes('http://') && !evidenceOrFile.includes('https://')) {
          // It's a filename, construct the full URL
          const baseUrl = resolveApiBaseUrl();
          const apiBaseUrl = baseUrl.replace(/\/api\/?$/, "");
          fileUrl = `${apiBaseUrl}/certificates/${evidenceOrFile}`;
        }
        
        if (evidenceOrFile && evidenceOrFile.includes('/')) {
          // Extract filename from URL
          const urlParts = evidenceOrFile.split('/');
          fileName = urlParts[urlParts.length - 1];
        }
        
        return {
          name: fileName,
          uploadedOn: item.created_at ? formatDate(item.created_at) : formatDate(new Date().toISOString()),
          url: fileUrl, // Store the full URL for viewing
          id: item.id // Store the evidence ID for updates
        };
      })
    },
    {
      id: "insurance",
      title: "Insurance Coverage",
      description: "Public Liability & Professional Indemnity",
      status: resolveInsuranceRequirementStatus(),
      verifiedDate: getInsuranceVerifiedDate(),
      icon: Shield,
      details: getInsuranceDetails(),
      documents: [],
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "rejected":
        return <X className="w-5 h-5 text-red-600" />;
      case "action_required":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    let badgeClass = "border border-gray-200 bg-gray-100 text-gray-700";
    let label = status || "Not Submitted";

    if (status === "verified") {
      badgeClass = "border border-green-200 bg-green-100 text-green-700";
      label = "verified";
    } else if (status === "pending") {
      badgeClass = "border border-yellow-200 bg-yellow-100 text-yellow-700";
      label = "pending";
    } else if (status === "rejected") {
      badgeClass = "border border-red-200 bg-red-100 text-red-700";
      label = "rejected";
    } else if (status === "action_required") {
      badgeClass = "border border-orange-200 bg-orange-100 text-orange-800";
      label = "action required";
    }

    return <Badge className={badgeClass}>{label}</Badge>;
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  /** Downscale raster images before insurance create — avoids client timeout and PHP post size limits on huge PNG payloads. */
  const imageFileToCompressedDataUrl = async (
    file: File,
    maxEdge = 2048,
    quality = 0.88
  ): Promise<string> => {
    if (typeof createImageBitmap !== "function") {
      return fileToBase64(file);
    }
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      let w = bitmap.width;
      let h = bitmap.height;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return fileToBase64(file);
      ctx.drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", quality);
    } catch {
      return fileToBase64(file);
    } finally {
      bitmap?.close();
    }
  };

  // Fetch identity data (extracted to a function so we can call it after upload)
  const fetchIdentityData = async () => {
    try {
      setIsLoadingIdentity(true);
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching identity");
        return;
      }

      const response = await getProfessionalWiseIdentity({ api_token: apiToken });
      
      if (response.status === true && response.data && response.data.length > 0) {
        // Use the first identity item (most recent)
        setIdentityData(response.data[0]);
      } else {
        setIdentityData(null);
      }
    } catch (err: any) {
      console.error("Error fetching identity:", err);
      setIdentityData(null);
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  const handleFileButtonClick = (requirementId: string, evidenceId?: number) => {
    setCurrentUploadRequirement(requirementId);
    setCurrentEvidenceId(evidenceId ?? null);
    setInsuranceUploadTarget(null);
    fileInputRef.current?.click();
  };

  const handleInsuranceDocumentClick = (
    target: InsuranceDocumentTarget,
    insuranceId?: number
  ) => {
    setCurrentUploadRequirement("insurance");
    setInsuranceUploadTarget(target);
    setCurrentEvidenceId(insuranceId ?? null);
    fileInputRef.current?.click();
  };

  const ensureInsuranceRowForDocument = async (
    apiToken: string,
    professionalId: number,
    target: InsuranceDocumentTarget
  ): Promise<number | null> => {
    const plRow = resolvePublicLiabilityRow(insuranceData);
    const piRow = findProfessionalIndemnityItem(insuranceData);
    const existing = target === "public_liability" ? plRow : piRow;
    if (existing?.id) return existing.id;

    const formState = buildInsuranceFormState(insuranceData);
    const title =
      target === "public_liability" ? PUBLIC_LIABILITY_TITLE : PROFESSIONAL_INDEMNITY_TITLE;
    const price =
      target === "public_liability"
        ? formState.publicLiability.trim()
        : formState.professionalIndemnity.trim();

    if (!price || !formState.provider.trim() || !formState.expire_date) {
      toast.error(
        "Please save insurance coverage details (amounts, provider, expiry) before uploading documents."
      );
      return null;
    }

    const response = await createInsuranceCoverage({
      api_token: apiToken,
      title,
      price,
      expire_date: formState.expire_date,
      professional_id: professionalId,
      provider_name: formState.provider.trim(),
    });

    const createdId = response.data?.id;
    if (
      createdId &&
      (response.status === "success" || response.success === true || response.data)
    ) {
      return createdId;
    }

    toast.error(response.message || response.error || "Failed to prepare insurance record.");
    return null;
  };

  const renderInsuranceDocumentSlot = (entry: InsuranceDocumentStatusEntry) => {
    const { target, label, row, uiStatus, rejectionNote } = entry;
    const uploadKey =
      target === "public_liability" ? "insurance-public_liability" : "insurance-professional_indemnity";
    const hasDocument = Boolean(row?.document?.trim());
    const documentUrl = getInsuranceDocumentUrl(row?.document);
    const uploadedOn = row?.created_at ? formatDate(row.created_at) : null;
    const slotSurfaceClass =
      uiStatus === "rejected"
        ? "bg-red-50 border-red-200"
        : uiStatus === "verified"
          ? "bg-green-50 border-green-200"
          : uiStatus === "pending"
            ? "bg-yellow-50/60 border-yellow-200"
            : "bg-gray-50 border-gray-100";

    return (
      <div className={`p-3 rounded-lg border ${slotSurfaceClass}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {row ? getStatusBadge(uiStatus) : getStatusBadge("pending")}
              </div>
              <p className="text-xs text-gray-500">
                {hasDocument
                  ? uploadedOn
                    ? `Uploaded ${uploadedOn}`
                    : "Document uploaded"
                  : "No document uploaded yet"}
              </p>
              {uiStatus === "rejected" ? (
                <p className="text-xs text-red-700 mt-2">
                  {rejectionNote ||
                    "Rejected by admin. Upload a corrected document for this coverage type."}
                </p>
              ) : null}
              {uiStatus === "verified" ? (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  Verified by admin
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {hasDocument && documentUrl ? (
              <Button variant="ghost" size="sm" onClick={() => window.open(documentUrl, "_blank")}>
                View
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInsuranceDocumentClick(target, row?.id)}
              disabled={uploadingDoc === uploadKey}
            >
              {uploadingDoc === uploadKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1" />
                  {hasDocument ? "Update Document" : "Upload Document"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const requirementId = currentUploadRequirement;
    if (!requirementId) {
      console.error("No requirement ID set for file upload");
      return;
    }

    // Validate file type (allow images, PDFs, Word, Excel, etc.)
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];
    const allValidTypes = [...imageTypes, ...documentTypes];
    
    // Also check by file extension for compatibility
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    
    if (!allValidTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      toast.error("Please select an image file (JPEG, PNG, GIF), PDF, Word, Excel, or PowerPoint document.");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCurrentUploadRequirement(null);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB.");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCurrentUploadRequirement(null);
      return;
    }

    const apiToken = getApiToken();
    const professionalId = getProfessionalId();

    const isIdentityCreate = requirementId === "identity" && !identityData?.id;

    if (!apiToken) {
      toast.error("Please log in to upload document.");
      setCurrentUploadRequirement(null);
      return;
    }

    if (requirementId === "insurance" && !insuranceUploadTarget) {
      toast.error("Please choose which insurance document to upload.");
      setCurrentUploadRequirement(null);
      return;
    }

    if (!professionalId && !isIdentityCreate) {
      toast.error("Professional ID not found. Please try again.");
      setCurrentUploadRequirement(null);
      return;
    }

    if (requirementId === "insurance" && insuranceUploadTarget) {
      setUploadingDoc(
        insuranceUploadTarget === "public_liability"
          ? "insurance-public_liability"
          : "insurance-professional_indemnity"
      );
    } else {
      setUploadingDoc(requirementId);
    }

    try {
      // Determine if file is an image or document
      const isImage = imageTypes.includes(file.type) || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
      
      let fileToSend: string | File;
      
      if (isImage) {
        // For images: convert to base64 and send as JSON body
        fileToSend = await fileToBase64(file);
      } else {
        // For documents (PDF, Word, Excel, etc.): send File object as FormData
        fileToSend = file;
      }

      // Call the appropriate update API based on requirement type
      if (requirementId === "identity") {
        const response =
          identityData?.id && professionalId
            ? await updateProfessionalIdentity({
                api_token: apiToken,
                id: identityData.id,
                professional_id: professionalId,
                file: fileToSend,
              })
            : await createProfessionalIdentity({
                api_token: apiToken,
                file: fileToSend,
              });

        if (response.status === true || response.data) {
          toast.success(
            response.message ||
              (identityData?.id
                ? "Identity document updated successfully!"
                : "Identity document uploaded successfully!")
          );
          await fetchIdentityData();
          await fetchVerificationSummary();
        } else {
          toast.error(response.message || "Failed to upload identity document.");
        }
      } else if (requirementId === "qualifications") {
        // fileToSend is already determined above:
        // - For images: base64 string (will be sent as JSON body)
        // - For documents (PDF, Word, Excel, etc.): File object (will be sent as FormData)
        
        if (currentEvidenceId) {
          // Update existing evidence
          const response = await updateEvidence({
            api_token: apiToken,
            id: currentEvidenceId,
            professional_id: professionalId!,
            evidence: fileToSend, // base64 string (images) or File object (documents)
          });

          if (response.status === true || response.success === true || response.data) {
            toast.success(response.message || "Qualification evidence updated successfully!");
            // Immediately refresh the qualifications evidence data
            await fetchQualificationsEvidence();
          } else {
            toast.error(response.message || "Failed to update qualification evidence.");
          }
        } else {
          // Create new evidence (fallback, though this shouldn't happen with Update button)
          const fileName = file.name;
          const response = await createCertification({
            api_token: apiToken,
            certificate_name: fileName,
            description: `Qualification document: ${fileName}`,
            evidence: fileToSend, // base64 string (images) or File object (documents)
            status: "pending",
            professional_id: professionalId!,
          });

          if (response.status === "success" || response.success === true || response.data) {
            toast.success(response.message || "Qualification document uploaded successfully!");
            // Immediately refresh the qualifications evidence data
            await fetchQualificationsEvidence();
          } else {
            toast.error(response.message || "Failed to upload qualification document.");
          }
        }
      } else if (requirementId === "insurance") {
        if (!insuranceUploadTarget) {
          toast.error("Could not determine which insurance document to upload.");
          return;
        }

        if (!professionalId) {
          toast.error("Professional ID not found. Please log in again.");
          return;
        }

        let insuranceId = currentEvidenceId ?? undefined;
        if (!insuranceId) {
          const plRow = resolvePublicLiabilityRow(insuranceData);
          const piRow = findProfessionalIndemnityItem(insuranceData);
          insuranceId =
            insuranceUploadTarget === "public_liability" ? plRow?.id : piRow?.id;
        }

        if (!insuranceId) {
          insuranceId =
            (await ensureInsuranceRowForDocument(
              apiToken,
              professionalId,
              insuranceUploadTarget
            )) ?? undefined;
          if (insuranceId) {
            await fetchInsuranceData();
          }
        }

        if (!insuranceId) {
          return;
        }

        let documentPayload: string | File = fileToSend;
        if (isImage && typeof fileToSend === "string") {
          documentPayload = await imageFileToCompressedDataUrl(file);
        }

        const response = await updateInsuranceDocument({
          api_token: apiToken,
          id: insuranceId,
          professional_id: professionalId,
          document: documentPayload,
        });

        if (response.status === true || response.success === true || response.data) {
          const label =
            insuranceUploadTarget === "public_liability"
              ? "Public liability"
              : "Professional indemnity";
          toast.success(
            response.message || `${label} insurance document uploaded successfully!`
          );
          await fetchInsuranceData();
          await fetchVerificationSummary();
        } else {
          toast.error(response.message || "Failed to upload insurance document.");
        }
      }
    } catch (error: any) {
      console.error(`Error uploading ${requirementId} document:`, error);
      const detail =
        (typeof error?.message === "string" && error.message) ||
        (typeof error?.error === "string" && error.error) ||
        "";
      toast.error(
        detail || `Failed to upload ${requirementId} document. Please try again.`
      );
    } finally {
      setUploadingDoc(null);
      setCurrentUploadRequirement(null);
      setCurrentEvidenceId(null);
      setInsuranceUploadTarget(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Verification Status</h1>
        <p className="text-gray-600">Your professional verification and credentials</p>
      </div>

      {/* Overall Status */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-start md:justify-between md:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold mb-1 break-words">
                  {verificationSummary?.title || "Fully Verified Professional"}
                </h2>
                <p className="text-sm sm:text-base text-green-100">
                  {verificationSummary?.subtitle || "All verification requirements completed"}
                </p>
              </div>
            </div>
            <Badge className="border border-green-200 bg-white text-green-600 text-sm sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2 w-fit shrink-0 self-start md:self-start">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              {verificationSummary?.active_status || "Active"}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-100">Verification Progress</span>
              <span className="font-semibold">{verificationStatus.completionPercentage}%</span>
            </div>
            <Progress value={verificationStatus.completionPercentage} className="h-3 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Benefits of Verification */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">Benefits of Being Verified</p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>✓ Appear higher in search results</li>
                <li>✓ Display "Verified Professional" badge on your profile</li>
                <li>✓ Gain customer trust and increase bookings</li>
                <li>✓ Access to premium features and support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Requirements */}
      <div className="space-y-4">
        <h2 className="text-xl text-[#0A1A2F]">Verification Requirements</h2>
        
        {/* Hidden file input for all uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {requirements.map((requirement) => (
          <Card key={requirement.id}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <requirement.icon className="w-6 h-6 text-gray-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg text-[#0A1A2F]">{requirement.title}</h3>
                        {getStatusBadge(requirement.status)}
                      </div>
                      <p className="text-sm text-gray-600">{requirement.description}</p>
                    </div>
                    {getStatusIcon(requirement.status)}
                  </div>

                  {requirement.status === "verified" && requirement.verifiedDate && (
                    <div className="mt-3">
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Verified on {requirement.verifiedDate}
                      </p>
                    </div>
                  )}

                  {(requirement.status === "rejected" || requirement.status === "action_required") && (
                    <div
                      className={`mt-3 rounded-lg border p-3 ${
                        requirement.status === "action_required"
                          ? "border-orange-200 bg-orange-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium flex items-start gap-2 ${
                          requirement.status === "action_required" ? "text-orange-900" : "text-red-900"
                        }`}
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        {requirement.id === "insurance" && requirement.status === "action_required"
                          ? "Action required on insurance documents"
                          : "Rejected by admin"}
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          requirement.status === "action_required" ? "text-orange-800" : "text-red-800"
                        }`}
                      >
                        {requirement.id === "insurance"
                          ? getInsuranceRejectionSummaryText()
                          : getRequirementRejectionNote(requirement.id) ||
                            rejectionGuidanceByRequirement[requirement.id] ||
                            "This verification was rejected. Please update your documents and submit again."}
                      </p>
                      {requirement.id !== "insurance" ? (
                        <p className="text-xs text-red-700 mt-2">
                          Use <span className="font-medium">Update Document</span> below to upload a
                          corrected file for admin review.
                        </p>
                      ) : null}
                    </div>
                  )}

                  {requirement.id === "identity" && isLoadingIdentity && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading identity verification...</span>
                      </div>
                    </div>
                  )}

                  {requirement.id === "identity" && requirement.file && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</p>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-2 min-w-0 w-full md:flex-1">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-900">Identity Document</p>
                              <p className="text-xs text-gray-500">
                                {requirement.verifiedDate
                                  ? `Verified ${requirement.verifiedDate}`
                                  : "Uploaded document"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 w-full justify-end md:w-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(requirement.file || "", "_blank")}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileButtonClick(requirement.id)}
                              disabled={uploadingDoc === requirement.id || isLoadingIdentity}
                            >
                              {uploadingDoc === requirement.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Update Document
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {requirement.id === "insurance" && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700">Coverage details</p>
                        <Button variant="outline" size="sm" onClick={openInsuranceDetailsDialog}>
                          <Pencil className="w-4 h-4 mr-1" />
                          {insuranceData.length > 0 ? "Edit insurance details" : "Add insurance details"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500">Public Liability</p>
                          <p className="text-sm font-medium text-gray-900">
                            {requirement.details?.publicLiability || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Professional Indemnity</p>
                          <p className="text-sm font-medium text-gray-900">
                            {requirement.details?.professionalIndemnity || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Provider</p>
                          <p className="text-sm font-medium text-gray-900">
                            {requirement.details?.provider || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Valid Until</p>
                          <p className="text-sm font-medium text-gray-900">
                            {requirement.details?.validUntil || "N/A"}
                          </p>
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <p className="text-sm font-medium text-gray-700 mb-2">Insurance documents</p>
                      <p className="text-xs text-gray-500 mb-3">
                        Upload a separate certificate for each coverage type so admin can verify them
                        individually.
                      </p>
                      <div className="space-y-2">
                        {insuranceDocumentStatuses.map((entry) =>
                          renderInsuranceDocumentSlot({
                            ...entry,
                            label: `${entry.label} document`,
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {requirement.documents && requirement.documents.length > 0 && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</p>
                      <div className="space-y-2">
                        {requirement.documents.map((doc, index) => {
                          const docAny = doc as {
                            id?: number;
                            url?: string;
                            name?: string;
                            uploadedOn?: string;
                          };
                          const docKey = docAny.id || `doc-${index}`;

                          return (
                            <div key={docKey} className="p-2 bg-gray-50 rounded space-y-2">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="flex items-start gap-2 min-w-0 w-full md:flex-1">
                                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="text-sm text-gray-900 max-md:break-all"
                                        title={doc.name}
                                      >
                                        {doc.name}
                                      </p>
                                      <p className="text-xs text-gray-500">Uploaded {doc.uploadedOn}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 w-full justify-end md:w-auto">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        const urlToOpen = (doc as any).url || doc.name;
                                        if (urlToOpen.includes('http://') || urlToOpen.includes('https://')) {
                                          window.open(urlToOpen, '_blank');
                                        } else {
                                          const baseUrl = resolveApiBaseUrl();
                                          const apiBaseUrl = baseUrl.replace(/\/api\/?$/, "");
                                          window.open(`${apiBaseUrl}/certificates/${urlToOpen}`, '_blank');
                                        }
                                      }}
                                    >
                                      View
                                    </Button>
                                    {requirement.id === "qualifications" && (doc as any).id && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleFileButtonClick("qualifications", (doc as any).id)}
                                        disabled={uploadingDoc === "qualifications" && currentEvidenceId === (doc as any).id}
                                      >
                                        {(uploadingDoc === "qualifications" && currentEvidenceId === (doc as any).id) ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <>
                                            <Upload className="w-4 h-4 mr-1" />
                                            Update Document
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {requirement.id === "identity" && !requirement.file && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileButtonClick(requirement.id)}
                        disabled={uploadingDoc === requirement.id || isLoadingIdentity}
                      >
                        {uploadingDoc === requirement.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {identityData ? "Update Document" : "Upload Document"}
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                </div>
              </div>
            </CardContent>
          </Card>
        ))}

      {/* Professional memberships — loaded from professional/membership/get-all */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <input
            ref={membershipAssetInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleMembershipAssetChange}
            className="hidden"
          />

          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <Building2 className="h-6 w-6 text-indigo-700" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg text-[#0A1A2F]">Professional Memberships</h3>
                  <p className="mt-1 text-sm text-gray-600 md:max-w-xl">
                    Add and manage your professional body memberships and registrations.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full shrink-0 bg-red-600 hover:bg-red-700 md:ml-auto md:w-auto"
                  onClick={() => setMembershipFormOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Membership
                </Button>
              </div>

              <h4 className="mb-4 text-base font-semibold text-[#0A1A2F]">Your Professional Memberships</h4>

              {isLoadingMemberships ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-10 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading memberships...</span>
                </div>
              ) : memberships.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
                  <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="font-medium text-gray-900">No memberships added yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add professional bodies, trade associations, or recognized industry organizations you
                    are affiliated with.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {memberships.map((membership) => {
                    const statusDisplay = getMembershipStatusDisplay(membership.status);
                    const hasCertificate = Boolean(membership.documentDataUrl || membership.evidencePath);
                    return (
                      <div
                        key={membership.id}
                        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            {membership.logoDataUrl ? (
                              <img
                                src={membership.logoDataUrl}
                                alt={`${membership.organizationName} logo`}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <Building2 className="h-6 w-6 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-[#0A1A2F]">
                              {getMembershipOrganizationShortName(membership.organizationName)}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {membership.membershipType || "Member"}
                              {membership.membershipId
                                ? ` | Membership No: ${membership.membershipId}`
                                : ""}
                              {membership.memberSince
                                ? ` | Expiry: ${formatMembershipListDate(membership.memberSince)}`
                                : ""}
                            </p>
                            {membership.notes ? (
                              <p className="mt-1 truncate text-xs text-gray-500">{membership.notes}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:shrink-0">
                          <Badge variant="outline" className={statusDisplay.className}>
                            {statusDisplay.label}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label={`Actions for ${membership.organizationName}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {hasCertificate ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openMembershipEvidencePreview(
                                      `${membership.organizationName} — membership certificate`,
                                      membership
                                    )
                                  }
                                >
                                  View certificate
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMembershipAssetClick({
                                    kind: "document",
                                    membershipId: membership.id,
                                  })
                                }
                              >
                                Update certificate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMembershipAssetClick({
                                    kind: "logo",
                                    membershipId: membership.id,
                                  })
                                }
                              >
                                Update logo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleRemoveMembership(membership.id)}
                              >
                                Remove membership
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">About Memberships</p>
                    <p className="mt-1 text-sm text-blue-800">
                      Membership details are subject to verification by Fire Guide. Approved memberships may be
                      displayed on your public profile and used to support customer trust.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      <Dialog
        open={membershipFormOpen}
        onOpenChange={(open) => {
          if (!open) closeMembershipForm();
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Add Professional Membership</DialogTitle>
            <DialogDescription>
              Add your professional body membership details and upload supporting documents for review.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="membership-organization">Professional Body / Organization*</Label>
                <Input
                  id="membership-organization"
                  list="membership-organization-suggestions"
                  value={membershipForm.organizationName}
                  onChange={(e) =>
                    setMembershipForm((prev) => ({ ...prev, organizationName: e.target.value }))
                  }
                  placeholder="e.g. Fire Industry Association (FIA)"
                />
                <datalist id="membership-organization-suggestions">
                  {PROFESSIONAL_MEMBERSHIP_SUGGESTIONS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="membership-type">Membership Grade / Type</Label>
                <Input
                  id="membership-type"
                  value={membershipForm.membershipType}
                  onChange={(e) =>
                    setMembershipForm((prev) => ({ ...prev, membershipType: e.target.value }))
                  }
                  placeholder="e.g. Member, Associate, Registered Member"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="membership-id">Membership / Registration Number</Label>
                <Input
                  id="membership-id"
                  value={membershipForm.membershipId}
                  onChange={(e) =>
                    setMembershipForm((prev) => ({ ...prev, membershipId: e.target.value }))
                  }
                  placeholder="Enter your membership number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="membership-since">Expiry Date (optional)</Label>
                <Input
                  id="membership-since"
                  type="date"
                  value={membershipForm.memberSince}
                  onChange={(e) =>
                    setMembershipForm((prev) => ({ ...prev, memberSince: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="membership-notes">Website / Profile link (optional)</Label>
                <Input
                  id="membership-notes"
                  value={membershipForm.notes}
                  onChange={(e) =>
                    setMembershipForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="https://example.com/profile"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Proof / Certificate</Label>
                <button
                  type="button"
                  onClick={() => handleMembershipAssetClick({ kind: "document", forForm: true })}
                  disabled={uploadingMembershipAsset === "form-document"}
                  className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition-colors hover:border-red-300 hover:bg-red-50/40"
                >
                  {uploadingMembershipAsset === "form-document" ? (
                    <Loader2 className="mb-2 h-6 w-6 animate-spin text-gray-500" />
                  ) : (
                    <Upload className="mb-2 h-6 w-6 text-gray-400" />
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {membershipForm.documentDataUrl ? "Certificate uploaded" : "Click to upload certificate"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">PDF, JPG, or PNG (Max 5MB)</p>
                  {membershipForm.documentDataUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMembershipEvidencePreview("Membership certificate preview", {
                          documentDataUrl: membershipForm.documentDataUrl,
                        });
                      }}
                    >
                      Preview certificate
                    </Button>
                  ) : null}
                </button>
              </div>

              <div className="space-y-2">
                <Label>Upload Logo / Badge (optional)</Label>
                <button
                  type="button"
                  onClick={() => handleMembershipAssetClick({ kind: "logo", forForm: true })}
                  disabled={uploadingMembershipAsset === "form-logo"}
                  className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition-colors hover:border-red-300 hover:bg-red-50/40"
                >
                  {uploadingMembershipAsset === "form-logo" ? (
                    <Loader2 className="mb-2 h-6 w-6 animate-spin text-gray-500" />
                  ) : membershipForm.logoDataUrl ? (
                    <img
                      src={membershipForm.logoDataUrl}
                      alt="Organization logo preview"
                      className="mb-2 h-12 w-12 object-contain"
                    />
                  ) : (
                    <ImageIcon className="mb-2 h-6 w-6 text-gray-400" />
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {membershipForm.logoDataUrl ? "Logo uploaded" : "Click to upload logo"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">PNG, JPG, or SVG (Max 2MB)</p>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Checkbox
              id="membership-confirm"
              checked={membershipConfirmed}
              onCheckedChange={(checked) => setMembershipConfirmed(checked === true)}
            />
            <Label htmlFor="membership-confirm" className="text-sm leading-relaxed text-gray-700">
              I confirm that the above information is true and I am a current member of this
              organization.
            </Label>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeMembershipForm}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleAddMembership()}
              disabled={isSavingMembership || !membershipConfirmed}
            >
              {isSavingMembership ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Membership"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={membershipEvidencePreview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMembershipEvidencePreview(null);
            setMembershipEvidencePreviewIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">
              {membershipEvidencePreview?.title ?? "Membership certificate"}
            </DialogTitle>
            <DialogDescription>
              Preview of your uploaded membership certificate evidence.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto py-2">
            {membershipEvidencePreview?.urls[membershipEvidencePreviewIndex] ? (
              <img
                src={membershipEvidencePreview.urls[membershipEvidencePreviewIndex]}
                alt={membershipEvidencePreview.title}
                className="mx-auto max-h-[70vh] w-full object-contain rounded-lg border border-gray-200 bg-gray-50"
                onError={() => {
                  setMembershipEvidencePreviewIndex((current) => {
                    const max = (membershipEvidencePreview?.urls.length ?? 1) - 1;
                    if (current >= max) {
                      toast.error("Unable to load membership certificate. Please try again later.");
                      return current;
                    }
                    return current + 1;
                  });
                }}
              />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No certificate preview available.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {membershipEvidencePreview?.urls[membershipEvidencePreviewIndex] &&
            !membershipEvidencePreview.urls[membershipEvidencePreviewIndex].startsWith("data:") ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const url = membershipEvidencePreview?.urls[membershipEvidencePreviewIndex];
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                Open in new tab
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={() => setMembershipEvidencePreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={insuranceDetailsOpen} onOpenChange={setInsuranceDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Insurance coverage details</DialogTitle>
            <DialogDescription>
              Enter your public liability and professional indemnity amounts, provider, and expiry date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveInsuranceDetails} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="insurance-public-liability">Public Liability (£) *</Label>
              <Input
                id="insurance-public-liability"
                type="text"
                inputMode="decimal"
                value={insuranceForm.publicLiability}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setInsuranceForm((prev) => ({ ...prev, publicLiability: value }));
                  }
                }}
                placeholder="e.g. 5000000 for £5M"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance-professional-indemnity">Professional Indemnity (£) *</Label>
              <Input
                id="insurance-professional-indemnity"
                type="text"
                inputMode="decimal"
                value={insuranceForm.professionalIndemnity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setInsuranceForm((prev) => ({ ...prev, professionalIndemnity: value }));
                  }
                }}
                placeholder="e.g. 2000000 for £2M"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance-provider">Provider *</Label>
              <Input
                id="insurance-provider"
                value={insuranceForm.provider}
                onChange={(e) =>
                  setInsuranceForm((prev) => ({ ...prev, provider: e.target.value }))
                }
                placeholder="e.g. AXA Insurance"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance-expire-date">Valid Until *</Label>
              <Input
                id="insurance-expire-date"
                type="date"
                value={insuranceForm.expire_date}
                onChange={(e) =>
                  setInsuranceForm((prev) => ({ ...prev, expire_date: e.target.value }))
                }
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInsuranceDetailsOpen(false)}
                disabled={isSavingInsuranceDetails}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingInsuranceDetails}>
                {isSavingInsuranceDetails ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save details"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Support — hidden per product request
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg text-[#0A1A2F] mb-1">Need Help with Verification?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Our team is here to assist you with any questions about the verification process.
              </p>
              <Button variant="outline">Contact Support</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      */}
    </div>
  );
}