import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Plus,
  Loader2,
  Upload,
  ImageIcon,
  Info,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { getApiToken, getProfessionalId } from "../lib/auth";
import {
  createMembership,
  deleteMembership,
  getAllMemberships,
  encodeImageFileAsBase64DataUrl,
  buildMembershipEvidenceViewUrls,
  isMembershipImageFile,
  resolveMembershipEntryMedia,
  type ProfessionalMembershipApiItem,
} from "../api/membershipService";
import { toast } from "sonner";

const PROFESSIONAL_MEMBERSHIPS_STORAGE_PREFIX = "fireguide_professional_memberships";

type ProfessionalMembershipEntry = {
  id: string;
  organizationName: string;
  membershipType: string;
  membershipId: string;
  memberSince: string;
  notes: string;
  status?: string;
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

type MembershipUploadTarget = {
  kind: "document" | "logo";
  membershipId?: string;
  forForm?: boolean;
};

export type ProfessionalMembershipSectionProps = {
  mode: "manage" | "status";
  showHeaderAddButton?: boolean;
  addFormOpen?: boolean;
  onAddFormOpenChange?: (open: boolean) => void;
};

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

function getMembershipStatusKey(
  status: string | null | undefined
): "verified" | "pending" | "rejected" {
  const normalized = normalizeMembershipStatus(status);
  if (normalized === "verified") return "verified";
  if (normalized === "rejected") return "rejected";
  return "pending";
}

function formatMembershipDisplayDate(dateString: string | null | undefined): string {
  const value = (dateString ?? "").trim();
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
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

function mapApiMembershipToEntry(
  item: ProfessionalMembershipApiItem,
  preview?: { documentDataUrl?: string; logoDataUrl?: string }
): ProfessionalMembershipEntry {
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
          documentDataUrl: documentPreview?.startsWith("data:") ? documentPreview : undefined,
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
}

export function ProfessionalMembershipSection({
  mode,
  showHeaderAddButton,
  addFormOpen,
  onAddFormOpenChange,
}: ProfessionalMembershipSectionProps) {
  const isManageMode = mode === "manage";
  const shouldShowHeaderAddButton = Boolean(showHeaderAddButton);
  const isFormControlled = addFormOpen !== undefined;

  const [memberships, setMemberships] = useState<ProfessionalMembershipEntry[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);
  const [membershipForm, setMembershipForm] = useState({ ...EMPTY_MEMBERSHIP_FORM });
  const [internalFormOpen, setInternalFormOpen] = useState(false);
  const [membershipConfirmed, setMembershipConfirmed] = useState(false);
  const [isSavingMembership, setIsSavingMembership] = useState(false);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [membershipUploadTarget, setMembershipUploadTarget] = useState<MembershipUploadTarget | null>(
    null
  );
  const [uploadingMembershipAsset, setUploadingMembershipAsset] = useState<string | null>(null);
  const [membershipEvidencePreview, setMembershipEvidencePreview] = useState<{
    title: string;
    urls: string[];
  } | null>(null);
  const [membershipEvidencePreviewIndex, setMembershipEvidencePreviewIndex] = useState(0);

  const membershipAssetInputRef = useRef<HTMLInputElement>(null);

  const membershipFormOpen = isFormControlled ? addFormOpen : internalFormOpen;

  const setMembershipFormOpen = (open: boolean) => {
    if (isFormControlled) {
      onAddFormOpenChange?.(open);
    } else {
      setInternalFormOpen(open);
    }
  };

  const fetchMemberships = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      console.warn("No API token available for fetching memberships");
      setMemberships(loadStoredMemberships());
      return;
    }

    setIsLoadingMemberships(true);
    try {
      const items = await getAllMemberships(apiToken);
      const entries = items
        .map((item) => mapApiMembershipToEntry(item))
        .filter((item) => item.organizationName.length > 0);
      setMemberships(entries);
      persistMemberships(entries);
    } catch (err) {
      console.error("Error fetching memberships:", err);
      setMemberships(loadStoredMemberships());
    } finally {
      setIsLoadingMemberships(false);
    }
  };

  useEffect(() => {
    void fetchMemberships();
  }, []);

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

  const handleRemoveMembership = async (id: string) => {
    const membershipId = parseInt(id, 10);
    if (!Number.isFinite(membershipId) || membershipId <= 0) {
      toast.error("Invalid membership id.");
      return;
    }

    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to remove membership.");
      return;
    }

    setRemovingMembershipId(id);
    try {
      const response = await deleteMembership(apiToken, membershipId);
      const ok =
        response.status === true ||
        response.status === "success" ||
        response.success === true;

      if (!ok) {
        toast.error(response.message || response.error || "Failed to remove membership.");
        return;
      }

      toast.success(response.message || "Membership removed.");
      await fetchMemberships();
    } catch {
      toast.error("Failed to remove membership. Please try again.");
    } finally {
      setRemovingMembershipId(null);
    }
  };

  const handleMembershipAssetClick = (target: MembershipUploadTarget) => {
    setMembershipUploadTarget(target);
    membershipAssetInputRef.current?.click();
  };

  const applyMembershipAssetToForm = (kind: "document" | "logo", file: File, dataUrl: string) => {
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

  const renderLoadingState = () => (
    <div className="flex items-center justify-center gap-2 py-8 text-gray-600">
      <Loader2 className="h-5 w-5 animate-spin text-red-600" />
      <span>Loading memberships...</span>
    </div>
  );

  const renderEmptyState = () => (
    <div
      className={
        isManageMode
          ? "py-6 text-center sm:py-8"
          : "rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center"
      }
    >
      {isManageMode ? (
        <p className="text-sm text-gray-500 sm:text-base">
          No memberships found. Add one to get started!
        </p>
      ) : (
        <>
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-900">No memberships added yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Add professional bodies, trade associations, or recognized industry organizations you are
            affiliated with.
          </p>
        </>
      )}
    </div>
  );

  const renderManageList = () => (
    <div className="space-y-3">
      {memberships.map((membership) => {
        const statusKey = getMembershipStatusKey(membership.status);
        const hasCertificate = Boolean(membership.documentDataUrl || membership.evidencePath);
        const evidenceLabel = membership.evidencePath || membership.documentFileName || "";
        const membershipMeta = [
          membership.membershipType || "Member",
          membership.membershipId ? `Membership No: ${membership.membershipId}` : null,
          membership.memberSince ? `Expiry: ${formatMembershipListDate(membership.memberSince)}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        return (
          <div
            key={membership.id}
            className={`min-w-0 overflow-hidden rounded-lg border p-3 sm:p-4 ${
              statusKey === "verified"
                ? "border-green-200 bg-green-50"
                : statusKey === "pending"
                  ? "border-amber-200 bg-amber-50"
                  : "border-red-200 bg-red-50"
            }`}
          >
            <div className="mb-2 flex min-w-0 flex-col gap-3 sm:mb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 sm:mb-2">
                  {statusKey === "verified" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                  ) : null}
                  {statusKey === "pending" ? (
                    <Clock className="h-4 w-4 shrink-0 text-amber-500 sm:h-5 sm:w-5" />
                  ) : null}
                  {statusKey === "rejected" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600 sm:h-5 sm:w-5" />
                  ) : null}
                  <h4 className="break-words text-sm font-medium text-gray-900 sm:text-base">
                    {membership.organizationName}
                  </h4>
                </div>

                {membershipMeta ? (
                  <p className="mb-2 break-words text-xs text-gray-600 sm:text-sm">{membershipMeta}</p>
                ) : null}

                {membership.notes ? (
                  <p className="mb-2 break-words text-xs text-gray-600 sm:text-sm">{membership.notes}</p>
                ) : null}

                {hasCertificate ? (
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="min-w-0 flex-1 text-xs text-gray-600 sm:text-sm">
                      <span className="font-medium text-gray-700">Evidence</span>
                      <span className="text-gray-500"> (1 file)</span>
                      <span className="mt-1 block break-all text-gray-700">{evidenceLabel}</span>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 self-start text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 sm:text-sm"
                      onClick={() =>
                        openMembershipEvidencePreview(
                          `${membership.organizationName} — membership certificate`,
                          membership
                        )
                      }
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 self-start">
                {statusKey === "verified" ? (
                  <Badge className="whitespace-normal bg-green-600 text-white">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : null}
                {statusKey === "pending" ? (
                  <Badge className="whitespace-normal bg-amber-500 text-xs text-white">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending verification
                  </Badge>
                ) : null}
                {statusKey === "rejected" ? (
                  <Badge className="whitespace-normal bg-red-600 text-white">
                    <XCircle className="mr-1 h-3 w-3" />
                    Rejected
                  </Badge>
                ) : null}
              </div>
            </div>

            {statusKey === "verified" && membership.documentUploadedAt ? (
              <p className="text-xs text-green-700">
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                Verified on {formatMembershipDisplayDate(membership.documentUploadedAt)}
              </p>
            ) : null}
            {statusKey === "pending" && membership.documentUploadedAt ? (
              <p className="text-xs text-amber-700">
                <Clock className="mr-1 inline h-3 w-3" />
                Uploaded {formatMembershipDisplayDate(membership.documentUploadedAt)} - Awaiting admin
                review
              </p>
            ) : null}
            {statusKey === "rejected" ? (
              <div className="mt-2 rounded border border-red-200 bg-red-100 p-2">
                <p className="flex items-start gap-1 text-xs text-red-900">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    <strong>Rejected:</strong> Please update your membership details and resubmit.
                  </span>
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-gray-700 sm:text-sm"
                onClick={() =>
                  handleMembershipAssetClick({
                    kind: "document",
                    membershipId: membership.id,
                  })
                }
              >
                Update certificate
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-gray-700 sm:text-sm"
                onClick={() =>
                  handleMembershipAssetClick({
                    kind: "logo",
                    membershipId: membership.id,
                  })
                }
              >
                Update logo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 sm:text-sm"
                disabled={removingMembershipId === membership.id}
                onClick={() => {
                  if (removingMembershipId === membership.id) return;
                  void handleRemoveMembership(membership.id);
                }}
              >
                {removingMembershipId === membership.id ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStatusList = () => (
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
                  {membership.membershipId ? ` | Membership No: ${membership.membershipId}` : ""}
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
              {hasCertificate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    openMembershipEvidencePreview(
                      `${membership.organizationName} — membership certificate`,
                      membership
                    )
                  }
                >
                  View certificate
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderAboutMembershipsInfo = () => (
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
  );

  return (
    <>
      <input
        ref={membershipAssetInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleMembershipAssetChange}
        className="hidden"
      />

      {isManageMode ? (
        <Card className="min-w-0 overflow-hidden border-0 shadow-md">
          <CardHeader className="p-4 sm:p-6">
            {shouldShowHeaderAddButton ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Award className="h-4 w-4 shrink-0 text-red-600 sm:h-5 sm:w-5" />
                    Professional Memberships
                  </CardTitle>
                  <CardDescription className="mt-2 text-xs text-gray-600 sm:text-sm">
                    Upload your professional body memberships. An admin will review and mark them as
                    Verified, Pending, or Rejected.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  className="w-full shrink-0 bg-red-600 hover:bg-red-700 sm:ml-auto sm:w-auto"
                  onClick={() => setMembershipFormOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Membership
                </Button>
              </div>
            ) : (
              <>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Award className="h-4 w-4 shrink-0 text-red-600 sm:h-5 sm:w-5" />
                  Professional Memberships
                </CardTitle>
                <CardDescription className="mt-2 text-xs text-gray-600 sm:text-sm">
                  Upload your professional body memberships. An admin will review and mark them as
                  Verified, Pending, or Rejected.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
            {isLoadingMemberships
              ? renderLoadingState()
              : memberships.length === 0
                ? renderEmptyState()
                : renderManageList()}

            <Button
              type="button"
              variant="outline"
              className="mt-4 h-10 w-full text-sm sm:mt-6 sm:h-11 sm:text-base"
              onClick={() => setMembershipFormOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Add New Membership
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <Building2 className="h-6 w-6 text-indigo-700" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-4">
                  <h3 className="text-lg text-[#0A1A2F]">Professional Memberships</h3>
                  <p className="mt-1 text-sm text-gray-600 md:max-w-xl">
                    Add and manage your professional body memberships and registrations.
                  </p>
                </div>

                <h4 className="mb-4 text-base font-semibold text-[#0A1A2F]">
                  Your Professional Memberships
                </h4>

                {isLoadingMemberships
                  ? renderLoadingState()
                  : memberships.length === 0
                    ? renderEmptyState()
                    : renderStatusList()}

                {renderAboutMembershipsInfo()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isManageMode ? (
        <Dialog
          open={membershipFormOpen}
          onOpenChange={(open) => {
            if (!open) closeMembershipForm();
            else setMembershipFormOpen(true);
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
      ) : null}

      <Dialog
        open={membershipEvidencePreview !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMembershipEvidencePreview(null);
            setMembershipEvidencePreviewIndex(0);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">
              {membershipEvidencePreview?.title ?? "Membership certificate"}
            </DialogTitle>
            <DialogDescription>
              Preview of your uploaded membership certificate evidence.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto py-2">
            {membershipEvidencePreview?.urls[membershipEvidencePreviewIndex] ? (
              <img
                src={membershipEvidencePreview.urls[membershipEvidencePreviewIndex]}
                alt={membershipEvidencePreview.title}
                className="mx-auto max-h-[70vh] w-full rounded-lg border border-gray-200 bg-gray-50 object-contain"
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
              <p className="py-8 text-center text-sm text-gray-500">No certificate preview available.</p>
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
    </>
  );
}
