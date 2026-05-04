import { useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  detectStripeCancelReturnSearch,
  detectStripeSuccessReturnSearch,
} from "../lib/paymentAppUrls";

/**
 * If Stripe/backend sends users to `/` with success/cancel query params, send them to the
 * payment result routes. (Malformed paths like `//payment-success` are handled in `CatchAllRedirect`.)
 */
export function PaymentReturnRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const path = location.pathname || "";
    if (path !== "/" && path !== "") return;

    const search = location.search || "";
    const hash = location.hash || "";

    if (detectStripeSuccessReturnSearch(search)) {
      navigate({ pathname: "/payment-success", search, hash }, { replace: true });
      return;
    }

    if (detectStripeCancelReturnSearch(search)) {
      navigate({ pathname: "/payment-failed", search, hash }, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
