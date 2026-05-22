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
