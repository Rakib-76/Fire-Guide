import React, { useEffect, useId, useRef, useState } from "react";
import {
  Upload,
  FileText,
  ImageIcon,
  X,
  CheckCircle,
  Calendar,
  User,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { uploadReport } from "../api/professionalsService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

export interface UploadReportBookingData {
  id: number;
  user_id: number | null;
  reference: string;
  service: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

interface UploadCompletionReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: UploadReportBookingData | null;
  onSuccess?: () => void;
}

function parseLocation(location: string) {
  const parts = location.split(", ").filter(Boolean);
  if (parts.length >= 3) {
    return { address: parts[0], city: parts[1], postcode: parts[2] };
  }
  if (parts.length === 2) {
    return { address: parts[0], city: parts[1], postcode: "" };
  }
  return { address: location || "Not specified", city: "", postcode: "" };
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

function isAcceptedReportFile(file: File): boolean {
  if (file.type === "application/pdf" || file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    ext === "pdf" ||
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif", "svg"].includes(ext)
  );
}

export function UploadCompletionReportModal({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: UploadCompletionReportModalProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      setUploadedFiles([]);
      setNotes("");
      setIsDragging(false);
      setIsSubmitting(false);
      setIsSubmitted(false);
    }
  }, [open]);

  if (!booking) return null;

  const propertyInfo = parseLocation(booking.location);
  const job = {
    reference: booking.reference,
    service: booking.service,
    date: booking.date,
    time: booking.time,
    customer: {
      name: booking.customer,
      email: booking.customerEmail,
      phone: booking.customerPhone,
    },
    property: propertyInfo,
    status: booking.status
      ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
      : "Pending",
  };

  const addFiles = (files: File[]) => {
    const valid = files.filter(isAcceptedReportFile);
    if (valid.length < files.length) {
      toast.error("Only PDF and image files are allowed.");
    }
    if (valid.length > 0) {
      setUploadedFiles((prev) => [...prev, ...valid]);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to submit report");
      return;
    }

    try {
      setIsSubmitting(true);
      const base64File = await fileToBase64(uploadedFiles[0]);
      const response = await uploadReport({
        api_token: apiToken,
        user_id: booking.user_id,
        booking_id: booking.id,
        note: notes || "",
        report_file: base64File,
      });

      if (response.status === "success") {
        toast.success(response.message || "Report uploaded successfully!");
        setIsSubmitted(true);
        onSuccess?.();
      } else {
        toast.error(response.message || "Failed to upload report");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload report. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[min(100vw-1rem,64rem)] max-h-[min(100dvh-1rem,90vh)] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-gray-100 flex-shrink-0 text-left">
          <DialogTitle className="text-xl sm:text-2xl text-[#0A1A2F]">
            {isSubmitted ? "Report Submitted" : "Upload Completion Report"}
          </DialogTitle>
          <DialogDescription>
            {isSubmitted
              ? "Your report has been sent to the customer."
              : "Upload the final fire risk assessment report for your customer"}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-6 py-4 sm:py-6">
          {isSubmitted ? (
            <div className="py-8 text-center max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <p className="text-gray-600 mb-6">
                The customer will receive an email notification with the report.
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#0A1A2F] text-base sm:text-lg">Job Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 mb-1">Job Reference</p>
                        <p className="font-semibold text-gray-900 text-sm break-all">{job.reference}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Service</p>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          {job.service}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Appointment</p>
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm min-w-0">
                            <p className="text-gray-900">{job.date}</p>
                            <p className="text-gray-600">{job.time}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Customer</p>
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm min-w-0 break-words">
                            <p className="text-gray-900 font-medium">{job.customer.name}</p>
                            <p className="text-gray-600 text-xs">{job.customer.email}</p>
                            <p className="text-gray-600 text-xs">{job.customer.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Property</p>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-900 min-w-0 break-words">
                            <p>{job.property.address}</p>
                            {job.property.city ? <p>{job.property.city}</p> : null}
                            {job.property.postcode ? <p>{job.property.postcode}</p> : null}
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-xs text-gray-600 mb-2">Status</p>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#0A1A2F] text-base sm:text-lg">Upload Report Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openFilePicker();
                        }
                      }}
                      onClick={openFilePicker}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        addFiles(Array.from(e.dataTransfer.files));
                      }}
                      className={`border-2 border-dashed rounded-lg p-6 sm:p-10 text-center transition-all cursor-pointer ${
                        isDragging ? "border-red-600 bg-red-50" : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                          Drop files here or click to browse
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Drag and drop your files, or click to select
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.heif,image/*,application/pdf"
                          onChange={handleFileInputChange}
                          className="sr-only"
                          id={fileInputId}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFilePicker();
                          }}
                        >
                          Select Files
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2 text-sm text-gray-600">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 mb-1">Accepted file formats:</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <FileText className="w-3 h-3 mr-1" />
                            PDF Documents
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            Images (JPG, PNG)
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB per file</p>
                      </div>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-6">
                        <Label className="mb-3 block">Uploaded Files ({uploadedFiles.length})</Label>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  {file.type === "application/pdf" ? (
                                    <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                                      <FileText className="w-5 h-5 text-red-600" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                                      <ImageIcon className="w-5 h-5 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() =>
                                  setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
                                }
                                className="flex-shrink-0"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#0A1A2F] text-base sm:text-lg">
                      Additional Notes (Optional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Add any additional notes or comments for the customer..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[100px] sm:min-h-[120px]"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      These notes will be included in the email to the customer
                    </p>
                  </CardContent>
                </Card>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={uploadedFiles.length === 0 || isSubmitting}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Submit Report
                      </>
                    )}
                  </Button>
                </div>

                {uploadedFiles.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-900">
                      Please upload at least one file before submitting the report
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
