import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface CustomQuoteSubmittedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewQuoteRequests?: () => void;
  onBrowseServices?: () => void;
  /** When already on the quote-requests dashboard view, show a single dismiss action. */
  variant?: "default" | "dashboard";
}

export function CustomQuoteSubmittedModal({
  open,
  onOpenChange,
  onViewQuoteRequests,
  onBrowseServices,
  variant = "default",
}: CustomQuoteSubmittedModalProps) {
  const isDashboard = variant === "dashboard";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 mb-4 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl text-[#0A1A2F]">
            Custom quote request submitted
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600 space-y-3">
          <p>Your custom quote request has been submitted successfully.</p>
          {/* <p>
            Our admin team will review your request and assign a suitable fire safety
            professional. Please wait while we match you with the right expert.
          </p> */}
          {/* <p>
            You can track the status of your request anytime in{" "}
            <span className="font-medium text-[#0A1A2F]">My Quote Request</span> on your
            customer dashboard.
          </p> */}
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
          {!isDashboard && onBrowseServices && (
            <Button variant="outline" onClick={onBrowseServices} className="w-full sm:w-auto">
              Back to Services
            </Button>
          )}
          {isDashboard ? (
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              Got it
            </Button>
          ) : (
            onViewQuoteRequests && (
              <Button
                onClick={onViewQuoteRequests}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                Go to My Quote Request
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
