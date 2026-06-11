import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApp } from "../contexts/AppContext";
import {
  applySocialAuthSession,
  getDisplayNameAfterSocialAuth,
  hydrateSocialAuthUserProfile,
  parseSocialAuthCallback,
} from "../lib/socialAuthCallback";
import { navigateToProfessionalHome } from "../lib/professionalDashboardNavigation";
import { submitPendingCustomQuoteIfAny } from "../lib/submitPendingCustomQuote";
import { customQuoteSuccessNavigateState } from "../lib/customQuoteSuccessNavigation";

/**
 * After Google/Facebook OAuth, Laravel redirects with `api_token` (and optional user fields).
 * Saves session, loads real name when missing, then navigates to the role dashboard.
 */
export function SocialAuthReturnRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentUser, setIsCustomerLoggedIn } = useApp();
  const handledRef = useRef(false);

  useLayoutEffect(() => {
    if (handledRef.current) return;

    const result = parseSocialAuthCallback(location.search, location.hash);
    if (!result) return;

    handledRef.current = true;

    if (!result.ok) {
      toast.error(result.error);
      navigate({ pathname: "/customer/auth", search: "", hash: "" }, { replace: true });
      return;
    }

    const { payload, isNewUser } = result;
    const roleUpper = payload.roleUpper;

    void (async () => {
      applySocialAuthSession(payload);
      const hydrated = await hydrateSocialAuthUserProfile(payload);
      const displayName = getDisplayNameAfterSocialAuth(hydrated);

      if (roleUpper === "PROFESSIONAL") {
        setCurrentUser({ name: displayName, role: "professional" });
        toast.success(`Welcome, ${displayName}! Signed in successfully.`);
        navigateToProfessionalHome(navigate, {
          replace: true,
          forceProfileOnboarding: Boolean(isNewUser),
        });
        return;
      }

      if (roleUpper === "ADMIN") {
        setCurrentUser({ name: displayName, role: "admin" });
        toast.success(`Welcome, ${displayName}! Signed in successfully.`);
        navigate({ pathname: "/admin/dashboard", search: "", hash: "" }, { replace: true });
        return;
      }

      setIsCustomerLoggedIn(true);
      setCurrentUser({ name: displayName, role: "customer" });
      toast.success(`Welcome, ${displayName}! Signed in successfully.`);
      const pendingResult = await submitPendingCustomQuoteIfAny();
      if (pendingResult.submitted) {
        navigate(
          { pathname: "/customer/dashboard/quote-requests", search: "", hash: "" },
          { replace: true, state: customQuoteSuccessNavigateState() }
        );
        return;
      }
      if (pendingResult.hadPending && pendingResult.error) {
        toast.error(pendingResult.error);
        if (pendingResult.returnPath) {
          navigate(
            {
              pathname: pendingResult.returnPath,
              search: "",
              hash: "",
            },
            {
              replace: true,
              state: pendingResult.pending?.serviceName
                ? { serviceName: pendingResult.pending.serviceName }
                : undefined,
            }
          );
          return;
        }
      }
      navigate({ pathname: "/customer/dashboard", search: "", hash: "" }, { replace: true });
    })();
  }, [
    location.search,
    location.hash,
    location.pathname,
    navigate,
    setCurrentUser,
    setIsCustomerLoggedIn,
  ]);

  return null;
}
