import { registerUser, loginUser, type RegisterUserResponse, type LoginUserResponse } from "../api/authService";
import {
  setAuthToken,
  setUserEmail,
  setUserInfo,
  setUserPhone,
  setUserRole,
} from "./auth";
import { formatApiErrorMessage } from "./apiValidationMessage";

export type GuestContactDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type GuestAuthFlowResult = {
  token: string;
  usedExistingAccount: boolean;
};

function extractAuthToken(
  response: RegisterUserResponse | LoginUserResponse
): string | null {
  const token =
    response.data?.token ??
    response.data?.api_token ??
    response.token ??
    response.api_token ??
    (response.data as { data?: { token?: string; api_token?: string } } | undefined)?.data?.token ??
    (response.data as { data?: { token?: string; api_token?: string } } | undefined)?.data?.api_token;
  return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
}

function isRegisterSuccess(response: RegisterUserResponse): boolean {
  return Boolean(
    response.success ||
      response.status === "success" ||
      response.status === true ||
      (response.data && !response.error)
  );
}

function isLoginSuccess(response: LoginUserResponse): boolean {
  return Boolean(
    response.success ||
      response.status === "success" ||
      response.status === true ||
      (response.data && !response.error)
  );
}

export function persistCustomerSession(
  response: LoginUserResponse | RegisterUserResponse,
  contact: GuestContactDetails
): string | null {
  const token = extractAuthToken(response);
  if (!token) return null;

  const fullName =
    (response.data as { full_name?: string } | undefined)?.full_name ??
    response.data?.user_name ??
    response.data?.name ??
    `${contact.firstName} ${contact.lastName}`.trim();

  setAuthToken(token);
  setUserEmail(contact.email.trim().toLowerCase());
  setUserRole("USER");
  setUserInfo(fullName, "customer");
  setUserPhone(
    (response.data as { phone?: string } | undefined)?.phone?.trim() || contact.phone.trim()
  );

  return token;
}

export function isEmailAlreadyTakenError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const body = err as Record<string, unknown>;
  const combined = `${String(body.message ?? "")} ${String(body.error ?? "")}`.toLowerCase();
  if (combined.includes("already been taken") || combined.includes("already exists")) {
    return true;
  }
  const fieldBag = body.data;
  if (!fieldBag || typeof fieldBag !== "object" || Array.isArray(fieldBag)) {
    return false;
  }
  const emailErrors = (fieldBag as Record<string, unknown>).email;
  const messages = Array.isArray(emailErrors)
    ? emailErrors.map((item) => String(item))
    : emailErrors != null
      ? [String(emailErrors)]
      : [];
  return messages.some((msg) => msg.toLowerCase().includes("already been taken"));
}

export function isInvalidCredentialsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const body = err as Record<string, unknown>;
  const combined = `${String(body.message ?? "")} ${String(body.error ?? "")}`.toLowerCase();
  if (
    combined.includes("invalid credentials") ||
    combined.includes("incorrect password") ||
    combined.includes("wrong password") ||
    combined.includes("invalid email or password")
  ) {
    return true;
  }
  if (body.statusCode === 401) return true;
  const status = String(body.status ?? "").toLowerCase();
  return status === "failed" && combined.includes("invalid");
}

export function getLoginFailureMessage(err: unknown): string {
  const friendlyMessage = "Email or password is wrong. Please try again.";
  if (isInvalidCredentialsError(err)) {
    return friendlyMessage;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err) {
    return formatApiErrorMessage(err, friendlyMessage);
  }
  return friendlyMessage;
}

async function loginCustomer(
  contact: GuestContactDetails,
  password: string
): Promise<string> {
  try {
    const loginResponse = await loginUser({
      email: contact.email.trim().toLowerCase(),
      password,
    });

    if (!isLoginSuccess(loginResponse) || isInvalidCredentialsError(loginResponse)) {
      throw new Error(getLoginFailureMessage(loginResponse));
    }

    const token = persistCustomerSession(loginResponse, contact);
    if (!token) {
      throw new Error("Sign-in succeeded but no authentication token was received. Please try again.");
    }

    return token;
  } catch (err) {
    throw new Error(getLoginFailureMessage(err));
  }
}

export async function registerAndLoginCustomer(
  contact: GuestContactDetails,
  password: string
): Promise<GuestAuthFlowResult> {
  const customerName = `${contact.firstName} ${contact.lastName}`.trim();

  try {
    const registerResponse = await registerUser({
      full_name: customerName,
      email: contact.email.trim().toLowerCase(),
      phone: contact.phone.trim(),
      password,
      role: "USER",
    });

    if (!isRegisterSuccess(registerResponse)) {
      if (isEmailAlreadyTakenError(registerResponse)) {
        const token = await loginCustomer(contact, password);
        return { token, usedExistingAccount: true };
      }
      throw new Error(
        registerResponse.message || registerResponse.error || "Registration failed. Please try again."
      );
    }

    const token = await loginCustomer(contact, password);
    return { token, usedExistingAccount: false };
  } catch (err) {
    if (isEmailAlreadyTakenError(err)) {
      const token = await loginCustomer(contact, password);
      return { token, usedExistingAccount: true };
    }

    const message =
      err && typeof err === "object" && "message" in err
        ? formatApiErrorMessage(err, String((err as { message?: string }).message))
        : err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
    throw new Error(message);
  }
}
