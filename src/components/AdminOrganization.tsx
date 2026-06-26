import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createMembershipOption,
  deleteMembershipOption,
  encodeImageFileAsBase64DataUrl,
  getAllMembershipOptions,
  parseMembershipOptionsData,
  resolveMembershipOptionLogoUrl,
  type MembershipOptionItem,
} from "../api/membershipService";
import { getApiToken } from "../lib/auth";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

type OrganizationItem = {
  id: string;
  optionId: number | null;
  name: string;
  logoDataUrl: string;
};

function isSuccessfulResponse(response: {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
}): boolean {
  if (response.success === true) return true;
  if (response.status === true || response.status === "success") return true;
  if (response.message && !response.error) return true;
  return false;
}

function mapMembershipOptionToOrganizationItem(
  item: MembershipOptionItem,
  apiToken: string
): OrganizationItem | null {
  const name = item.option?.trim();
  if (!name) return null;

  const optionId = item.option_id ?? item.id ?? null;

  return {
    id: optionId != null ? String(optionId) : name,
    optionId,
    name,
    logoDataUrl: resolveMembershipOptionLogoUrl(item.logo, apiToken),
  };
}

export function AdminOrganization() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [deletingOptionId, setDeletingOptionId] = useState<number | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);

  const loadOrganizations = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      setOrganizations([]);
      setIsLoadingOrganizations(false);
      return;
    }

    setIsLoadingOrganizations(true);
    try {
      const response = await getAllMembershipOptions(token);
      const rows = parseMembershipOptionsData(response.data);

      if (!isSuccessfulResponse(response) && rows.length === 0) {
        toast.error(response.message || response.error || "Failed to load organizations.");
        setOrganizations([]);
        return;
      }

      const mapped = rows
        .map((item) => mapMembershipOptionToOrganizationItem(item, token))
        .filter((item): item is OrganizationItem => item != null);

      setOrganizations(mapped);
    } catch (error: unknown) {
      setOrganizations([]);
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to load organizations.";
      toast.error(message);
    } finally {
      setIsLoadingOrganizations(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, SVG, or WebP image.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error("Logo must be 2MB or smaller.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const dataUrl = await encodeImageFileAsBase64DataUrl(file);
      setLogoDataUrl(dataUrl);
      setLogoFileName(file.name);
    } catch {
      toast.error("Failed to upload logo. Please try again.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoDataUrl("");
    setLogoFileName("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const option = organizationName.trim();
    if (!option) {
      toast.error("Please enter an organization name.");
      return;
    }

    if (!logoDataUrl || !logoDataUrl.startsWith("data:") || !logoDataUrl.includes("base64,")) {
      toast.error("Please upload a valid organization logo.");
      return;
    }

    const duplicate = organizations.some(
      (item) => item.name.toLowerCase() === option.toLowerCase()
    );
    if (duplicate) {
      toast.error("An organization with this name already exists.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createMembershipOption({
        option,
        logo: logoDataUrl,
      });

      if (!isSuccessfulResponse(response)) {
        toast.error(
          response.message || response.error || "Failed to add organization. Please try again."
        );
        return;
      }

      setOrganizationName("");
      setLogoDataUrl("");
      setLogoFileName("");
      toast.success(response.message || "Organization added successfully.");
      await loadOrganizations();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while adding organization.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrganization = async (item: OrganizationItem) => {
    if (item.optionId == null) {
      toast.error("Unable to delete this organization. Missing option ID.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to delete organization.");
      return;
    }

    setDeletingOptionId(item.optionId);
    try {
      const response = await deleteMembershipOption(token, item.optionId);

      if (!isSuccessfulResponse(response)) {
        toast.error(
          response.message || response.error || "Failed to delete organization. Please try again."
        );
        return;
      }

      toast.success(response.message || "Organization deleted successfully.");
      await loadOrganizations();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while deleting organization.";
      toast.error(message);
    } finally {
      setDeletingOptionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-800 mb-1">Organization</h1>
        <p className="text-sm text-gray-500">
          Add professional bodies and organizations with their logos.
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-[#0A1A2F] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600" />
            Add Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="organization-name" className="text-sm font-medium">
                  Organization Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="organization-name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g., BAFE, NEBOSH, FIA"
                  className="h-11"
                  required
                />
                <p className="text-xs text-gray-500">
                  Enter the professional body or organization name.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Organization Logo <span className="text-red-600">*</span>
                </Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => void handleLogoChange(e)}
                />
                <button
                  type="button"
                  onClick={handleLogoClick}
                  disabled={isUploadingLogo || isSubmitting}
                  className="flex w-full min-h-[11rem] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition-colors hover:border-red-300 hover:bg-red-50/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="mb-2 h-6 w-6 animate-spin text-gray-500" />
                  ) : logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt="Organization logo preview"
                      className="mb-3 h-16 w-16 object-contain"
                    />
                  ) : (
                    <ImageIcon className="mb-2 h-6 w-6 text-gray-400" />
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {logoDataUrl ? logoFileName || "Logo uploaded" : "Click to upload logo"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">PNG, JPG, SVG, or WebP (Max 2MB)</p>
                  {!logoDataUrl && !isUploadingLogo ? (
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                      <Upload className="h-3.5 w-3.5" />
                      Choose file
                    </span>
                  ) : null}
                </button>
                {logoDataUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-0 text-red-600 hover:text-red-700 hover:bg-transparent"
                    onClick={handleRemoveLogo}
                    disabled={isSubmitting}
                  >
                    Remove logo
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 h-10 min-w-[9rem]"
                disabled={isSubmitting || isUploadingLogo}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Organization"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-[#0A1A2F] mb-4">
          Organizations ({organizations.length})
        </h2>

        {isLoadingOrganizations ? (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-red-600" />
              Loading organizations...
            </CardContent>
          </Card>
        ) : organizations.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center text-gray-500">
              No organizations added yet. Use the form above to add one.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {organizations.map((item) => (
              <Card key={item.id} className="border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-2">
                        {item.logoDataUrl ? (
                          <img
                            src={item.logoDataUrl}
                            alt={`${item.name} logo`}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0A1A2F] truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Professional body</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDeleteOrganization(item)}
                      disabled={
                        deletingOptionId === item.optionId ||
                        item.optionId == null ||
                        isSubmitting
                      }
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${item.name}`}
                      title="Delete organization"
                    >
                      {deletingOptionId === item.optionId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
