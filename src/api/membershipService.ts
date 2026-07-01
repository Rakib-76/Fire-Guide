import axios from "axios";
import { getApiToken } from "../lib/auth";
import { resolveApiBaseUrl } from "../lib/apiBaseUrl";

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

export interface CreateMembershipRequest {
  api_token: string;
  option_id: number;
  membership_type?: string;
  reference_id?: string;
  member_since?: string;
  note?: string;
  evidence?: string;
}

export interface MembershipOptionNested {
  id?: number;
  option?: string;
  logo?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Shared shape for membership rows that may nest option details. */
export interface MembershipOptionDisplaySource {
  organization_name?: string | null;
  logo?: string | null;
  option?: MembershipOptionNested | null;
}

export interface ProfessionalMembershipApiItem {
  id: number;
  professional_id?: number;
  option_id?: number;
  /** Legacy flat field — prefer `option.option` when present. */
  organization_name?: string | null;
  membership_type?: string | null;
  reference_id?: string | null;
  member_since?: string | null;
  note?: string | null;
  evidence?: string | null;
  /** Legacy flat logo — prefer `option.logo` when present. */
  logo?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  option?: MembershipOptionNested | null;
}

export function getMembershipOptionName(item: MembershipOptionDisplaySource): string {
  return (item.option?.option ?? item.organization_name ?? "").trim();
}

export function getMembershipOptionLogoPath(item: MembershipOptionDisplaySource): string {
  return (item.option?.logo ?? item.logo ?? "").trim();
}

export interface CreateMembershipResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: ProfessionalMembershipApiItem;
}

export interface DeleteMembershipRequest {
  api_token: string;
  membership_id: number;
}

export interface DeleteMembershipResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
}

export interface GetAllMembershipsResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
  total?: number;
  data?:
    | ProfessionalMembershipApiItem[]
    | {
        membership?: ProfessionalMembershipApiItem[];
        memberships?: ProfessionalMembershipApiItem[];
      };
}

export function parseMembershipGetAllData(
  data: GetAllMembershipsResponse["data"]
): ProfessionalMembershipApiItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.membership ?? data.memberships ?? [];
}

const MEMBERSHIP_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const MEMBERSHIP_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

export function isMembershipImageFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return file.type.startsWith("image/") || MEMBERSHIP_IMAGE_EXTENSIONS.includes(extension);
}

/** Read an image file as a base64 data URL (`data:image/...;base64,...`) for the membership API. */
export async function encodeImageFileAsBase64DataUrl(file: File): Promise<string> {
  const readRaw = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = (reader.result as string)?.trim() ?? "";
        if (!result.startsWith("data:") || !result.includes("base64,")) {
          reject(new Error("Invalid base64 image data"));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  if (file.size <= 1.5 * 1024 * 1024 || typeof createImageBitmap !== "function") {
    return readRaw();
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const maxEdge = 2048;
    let w = bitmap.width;
    let h = bitmap.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return readRaw();
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return readRaw();
  } finally {
    bitmap?.close();
  }
}

export interface MembershipMediaUrlOptions {
  apiToken?: string | null;
}

function resolveMembershipApiToken(options?: MembershipMediaUrlOptions): string {
  return options?.apiToken?.trim() || getApiToken()?.trim() || "";
}

function buildPublicMembershipAssetUrl(origin: string, normalizedPath: string): string {
  const prefix = origin.replace(/\/+$/, "");
  return `${prefix}/${normalizedPath}`;
}

function buildAuthenticatedMembershipImageUrl(base: string, normalizedPath: string, token: string): string {
  const query = `path=${encodeURIComponent(normalizedPath)}&api_token=${encodeURIComponent(token)}`;
  const prefix = base.replace(/\/+$/, "");
  return prefix ? `${prefix}/image/?${query}` : `/image/?${query}`;
}

export function getMembershipMediaUrlCandidates(
  path: string | null | undefined,
  options?: MembershipMediaUrlOptions
): string[] {
  let value = (path ?? "").trim();
  if (!value) return [];
  value = value.replace(/\\/g, "");

  if (value.startsWith("data:") || /^https?:\/\//i.test(value)) {
    return [value];
  }

  const normalized = value.replace(/^\/+/, "");
  const origin = resolveApiBaseUrl().replace(/\/api\/?$/, "");
  const token = resolveMembershipApiToken(options);
  const urls: string[] = [];
  const add = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  // Membership uploads are publicly served at /membership/{filename} (no token required).
  if (normalized.startsWith("membership/")) {
    add(buildPublicMembershipAssetUrl(origin, normalized));
  }

  // Authenticated fallback for non-public paths or when public URL is unavailable.
  if (token) {
    add(buildAuthenticatedMembershipImageUrl(origin, normalized, token));
  }

  return urls;
}

export function getMembershipMediaUrl(
  path: string | null | undefined,
  options?: MembershipMediaUrlOptions
): string {
  return getMembershipMediaUrlCandidates(path, options)[0] ?? "";
}

export function buildMembershipEvidenceViewUrls(args: {
  evidencePath?: string | null;
  documentDataUrl?: string | null;
  apiToken?: string | null;
}): string[] {
  const urls: string[] = [];
  const add = (url: string | undefined | null) => {
    const value = url?.trim();
    if (value && !urls.includes(value)) urls.push(value);
  };

  const documentDataUrl = args.documentDataUrl?.trim();
  const evidencePath = args.evidencePath?.trim();
  const mediaOptions = { apiToken: args.apiToken };

  if (documentDataUrl?.startsWith("data:")) add(documentDataUrl);
  if (evidencePath) {
    getMembershipMediaUrlCandidates(evidencePath, mediaOptions).forEach((url) => add(url));
  }
  if (documentDataUrl && !documentDataUrl.startsWith("data:")) add(documentDataUrl);

  return urls;
}

export function buildMembershipLogoViewUrls(args: {
  logoPath?: string | null;
  logoDataUrl?: string | null;
  apiToken?: string | null;
}): string[] {
  const urls: string[] = [];
  const add = (url: string | undefined | null) => {
    const value = url?.trim();
    if (value && !urls.includes(value)) urls.push(value);
  };

  const logoDataUrl = args.logoDataUrl?.trim();
  const logoPath = args.logoPath?.trim();
  const mediaOptions = { apiToken: args.apiToken };

  if (logoDataUrl?.startsWith("data:")) add(logoDataUrl);
  if (logoPath) getMembershipMediaUrlCandidates(logoPath, mediaOptions).forEach((url) => add(url));
  if (logoDataUrl && !logoDataUrl.startsWith("data:")) add(logoDataUrl);

  return urls;
}

/** Resolve display URLs for membership evidence/logo from API paths or stored base64. */
export function resolveMembershipEntryMedia<T extends {
  evidencePath?: string;
  logoPath?: string;
  documentDataUrl?: string;
  logoDataUrl?: string;
}>(entry: T): T {
  let evidencePath = entry.evidencePath?.trim();
  let logoPath = entry.logoPath?.trim();

  const documentFromPath = evidencePath ? getMembershipMediaUrl(evidencePath) : "";
  const logoFromPath = logoPath ? getMembershipMediaUrl(logoPath) : "";

  let documentDataUrl = entry.documentDataUrl?.trim();
  let logoDataUrl = entry.logoDataUrl?.trim();

  // Migrate older entries that saved broken /image/ URLs without raw paths
  if (!evidencePath && documentDataUrl?.includes("/image")) {
    const queryPath = documentDataUrl.match(/[?&]path=([^&]+)/)?.[1];
    const legacyPath =
      queryPath ??
      documentDataUrl.split("/image/")[1]?.split("?")[0];
    if (legacyPath) {
      evidencePath = decodeURIComponent(legacyPath);
      documentDataUrl = getMembershipMediaUrl(evidencePath);
    }
  }
  if (!logoPath && logoDataUrl?.includes("/image")) {
    const queryPath = logoDataUrl.match(/[?&]path=([^&]+)/)?.[1];
    const legacyPath =
      queryPath ??
      logoDataUrl.split("/image/")[1]?.split("?")[0];
    if (legacyPath) {
      logoPath = decodeURIComponent(legacyPath);
      logoDataUrl = getMembershipMediaUrl(logoPath);
    }
  }

  if (documentDataUrl?.startsWith("data:")) {
    // keep base64 preview
  } else if (documentFromPath) {
    documentDataUrl = documentFromPath;
  }

  if (logoDataUrl?.startsWith("data:")) {
    // keep base64 preview
  } else if (logoFromPath) {
    logoDataUrl = logoFromPath;
  }

  return {
    ...entry,
    ...(evidencePath ? { evidencePath } : {}),
    ...(logoPath ? { logoPath } : {}),
    ...(documentDataUrl ? { documentDataUrl } : {}),
    ...(logoDataUrl ? { logoDataUrl } : {}),
  };
}

/**
 * Fetch all memberships for the logged-in professional.
 * POST /professional/membership/get-all
 * Body: { api_token }
 */
export const getAllMemberships = async (
  apiToken: string
): Promise<ProfessionalMembershipApiItem[]> => {
  try {
    const response = await apiClient.post<GetAllMembershipsResponse>(
      "/professional/membership/get-all",
      { api_token: apiToken }
    );
    const payload = response.data;
    const isSuccess =
      payload?.status === true ||
      payload?.success === true ||
      String(payload?.status ?? "").toLowerCase() === "success";
    if (isSuccess || payload?.data != null) {
      return parseMembershipGetAllData(payload.data);
    }
    return [];
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    console.error(
      err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to fetch memberships."
    );
    return [];
  }
};

/**
 * Delete a professional membership.
 * POST /delete/membership
 * Body: { api_token, membership_id }
 */
export const deleteMembership = async (
  apiToken: string,
  membershipId: number
): Promise<DeleteMembershipResponse> => {
  try {
    const response = await apiClient.post<DeleteMembershipResponse>("/delete/membership", {
      api_token: apiToken,
      membership_id: membershipId,
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return {
      status: false,
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to delete membership.",
      error: err.response?.data?.error || err.message,
    };
  }
};

export const createMembership = async (
  data: CreateMembershipRequest
): Promise<CreateMembershipResponse> => {
  try {
    const requestBody: CreateMembershipRequest = {
      api_token: data.api_token,
      option_id: data.option_id,
    };

    const membershipType = data.membership_type?.trim();
    const referenceId = data.reference_id?.trim();
    const memberSince = data.member_since?.trim();
    const note = data.note?.trim();
    const evidence = data.evidence?.trim();

    if (membershipType) requestBody.membership_type = membershipType;
    if (referenceId) requestBody.reference_id = referenceId;
    if (memberSince) requestBody.member_since = memberSince;
    if (note) requestBody.note = note;
    if (evidence) requestBody.evidence = evidence;

    const response = await apiClient.post<CreateMembershipResponse>(
      "/membership/create",
      requestBody
    );
    return response.data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return {
      status: false,
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create membership.",
      error: err.response?.data?.error || err.message,
    };
  }
};

export interface CreateMembershipOptionRequest {
  option: string;
  logo: string;
}

export interface MembershipOptionItem {
  id?: number;
  option_id?: number;
  option?: string;
  logo?: string;
  created_at?: string;
}

export interface CreateMembershipOptionResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: MembershipOptionItem;
}

/** POST /create/membership/option — body: { option, logo (base64 data URL) } */
export const createMembershipOption = async (
  data: CreateMembershipOptionRequest
): Promise<CreateMembershipOptionResponse> => {
  try {
    const response = await apiClient.post<CreateMembershipOptionResponse>(
      "/create/membership/option",
      {
        option: data.option.trim(),
        logo: data.logo.trim(),
      }
    );
    return response.data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return {
      status: false,
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create organization option.",
      error: err.response?.data?.error || err.message,
    };
  }
};

export interface GetAllMembershipOptionsRequest {
  api_token: string;
}

export interface GetAllMembershipOptionsResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
  total?: number;
  data?:
    | MembershipOptionItem[]
    | {
        options?: MembershipOptionItem[];
        membership_options?: MembershipOptionItem[];
      };
}

export function parseMembershipOptionsData(
  data: GetAllMembershipOptionsResponse["data"]
): MembershipOptionItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.options ?? data.membership_options ?? [];
}

/** POST /get-all/membership/option — body: { api_token } */
export const getAllMembershipOptions = async (
  apiToken: string
): Promise<GetAllMembershipOptionsResponse> => {
  try {
    const response = await apiClient.post<GetAllMembershipOptionsResponse>(
      "/get-all/membership/option",
      { api_token: apiToken }
    );
    return response.data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return {
      status: false,
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to load organization options.",
      error: err.response?.data?.error || err.message,
    };
  }
};

export interface GetSingleMembershipOptionResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: MembershipOptionItem;
}

/** POST /get-single/membership/option — body: { api_token, option_id } */
export const getSingleMembershipOption = async (
  apiToken: string,
  optionId: number
): Promise<GetSingleMembershipOptionResponse> => {
  try {
    const response = await apiClient.post<GetSingleMembershipOptionResponse>(
      "/get-single/membership/option",
      {
        api_token: apiToken,
        option_id: optionId,
      }
    );
    return response.data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return {
      status: false,
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to load organization details.",
      error: err.response?.data?.error || err.message,
    };
  }
};

export function resolveMembershipOptionLogoUrl(
  logo: string | null | undefined,
  apiToken?: string | null
): string {
  const value = logo?.trim() ?? "";
  if (!value) return "";
  if (value.startsWith("data:") || /^https?:\/\//i.test(value)) return value;
  return getMembershipMediaUrl(value, { apiToken }) || value;
}

export interface DeleteMembershipOptionRequest {
  api_token: string;
  option_id: number;
}

export interface DeleteMembershipOptionResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
}

/** POST /delete/membership/option — body: { api_token, option_id } */
export const deleteMembershipOption = async (
  apiToken: string,
  optionId: number
): Promise<DeleteMembershipOptionResponse> => {
  try {
    const response = await apiClient.post<DeleteMembershipOptionResponse>(
      "/delete/membership/option",
      {
        api_token: apiToken,
        option_id: optionId,
      }
    );
    return response.data;
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return {
      status: false,
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to delete organization option.",
      error: err.response?.data?.error || err.message,
    };
  }
};
