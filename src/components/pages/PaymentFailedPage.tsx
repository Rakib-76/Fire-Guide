import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearPaymentReturnContext } from "../../lib/paymentAppUrls";

const NAVY = "#004A73";

export default function PaymentFailedPage() {
  const navigate = useNavigate();

  useEffect(() => {
    clearPaymentReturnContext();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center max-w-md">
        <div
          className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center mb-8 shrink-0"
          aria-hidden
        >
          <span className="text-white text-5xl font-bold leading-none select-none">!</span>
        </div>
        <h1 className="text-2xl sm:text-[26px] font-bold text-gray-800 mb-3">
          Your payment failed
        </h1>
        <p className="text-gray-500 text-base mb-10">Please try again</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-8 py-3 cursor-pointer mt-2 text-white text-sm font-semibold uppercase tracking-wide rounded-sm shadow-sm hover:opacity-95 transition-opacity"
          style={{ backgroundColor: NAVY }}
        >
          Home
        </button>
      </div>
    </div>
  );
}
