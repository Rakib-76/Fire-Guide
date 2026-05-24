import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { 
  Flame, 
  Upload, 
  FileText, 
  ImageIcon, 
  X, 
  CheckCircle, 
  Calendar, 
  User, 
  MapPin, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { uploadReport } from "../api/professionalsService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";

interface BookingData {
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

interface LocationState {
  booking?: BookingData;
}

interface ReportUploadProps {
  onBack: () => void;
}

// Helper function to parse location string
const parseLocation = (location: string) => {
  const parts = location.split(', ').filter(Boolean);
  if (parts.length >= 3) {
    return {
      address: parts[0],
      city: parts[1],
      postcode: parts[2]
    };
  } else if (parts.length === 2) {
    return {
      address: parts[0],
      city: parts[1],
      postcode: ""
    };
  }
  return {
    address: location || "Not specified",
    city: "",
    postcode: ""
  };
};

export function ReportUpload({ onBack }: ReportUploadProps) {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const bookingData = state?.booking;

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse location into address parts
  const propertyInfo = parseLocation(bookingData?.location || "");

  // Use dynamic booking data or fallback to defaults
  const job = {
    reference: bookingData?.reference || "FG-2025-00000",
    service: bookingData?.service || "Fire Risk Assessment",
    date: bookingData?.date || "Not scheduled",
    time: bookingData?.time || "",
    customer: {
      name: bookingData?.customer || "Unknown Customer",
      email: bookingData?.customerEmail || "Not provided",
      phone: bookingData?.customerPhone || "Not provided"
    },
    property: {
      address: propertyInfo.address,
      city: propertyInfo.city,
      postcode: propertyInfo.postcode
    },
    status: bookingData?.status ? bookingData.status.charAt(0).toUpperCase() + bookingData.status.slice(1) : "Pending"
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      return isPDF || isImage;
    });
    
    setUploadedFiles([...uploadedFiles, ...validFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Helper function to convert file to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result); // Returns full data URL with prefix
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    if (!bookingData?.id) {
      toast.error("Booking information is missing");
      return;
    }

    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to submit report");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert the first file to Base64
      const base64File = await fileToBase64(uploadedFiles[0]);

      // Call the API
      const response = await uploadReport({
        api_token: apiToken,
        user_id: bookingData.user_id,
        booking_id: bookingData.id,
        note: notes || "",
        report_file: base64File
      });

      if (response.status === "success") {
        toast.success(response.message || "Report uploaded successfully!");
        setIsSubmitted(true);
      } else {
        toast.error(response.message || "Failed to upload report");
      }
    } catch (err: any) {
      console.error("Error uploading report:", err);
      toast.error(err?.message || "Failed to upload report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-[#0A1A2F] text-white py-4 px-4 md:px-6 sticky top-0 z-40 shadow-lg">
          <div className="flex items-center justify-between">
            <Link 
              to="/"
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Go to home"
            >
              <img src={logoImage} alt="Fire Guide" className="h-10" />
              <Badge variant="secondary" className="ml-2 bg-red-600 text-white border-0">
                Pro
              </Badge>
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="text-sm">
                <p className="font-medium">John Smith</p>
                <p className="text-gray-400 text-xs">Professional</p>
              </div>
            </div>
          </div>
        </header>

        {/* Success Message */}
        <main className="py-12 px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 relative">
              <CheckCircle className="w-16 h-16 text-green-600" fill="currentColor" />
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
            </div>
            
            <h1 className="text-[#0A1A2F] mb-4">Report Submitted Successfully!</h1>
            <p className="text-lg text-gray-600 mb-8">
              Your fire risk assessment report has been uploaded and sent to the customer.
            </p>

            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Job Reference</span>
                    <span className="font-semibold text-gray-900">{job.reference}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Customer</span>
                    <span className="font-semibold text-gray-900">{job.customer.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Files Uploaded</span>
                    <span className="font-semibold text-gray-900">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button className="w-full bg-red-600 hover:bg-red-700" size="lg">
                View My Jobs
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                Upload Another Report
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
              <p className="text-sm text-blue-900">
                The customer will receive an email notification with the report attached.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0A1A2F] text-white py-4 px-4 md:px-6 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <Link 
            to="/"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-10" />
            <Badge variant="secondary" className="ml-2 bg-red-600 text-white border-0">
              Pro
            </Badge>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div className="text-sm">
              <p className="font-medium">John Smith</p>
              <p className="text-gray-400 text-xs">Professional</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-[#0A1A2F] mb-2">Upload Completion Report</h1>
            <p className="text-gray-600">Upload the final fire risk assessment report for your customer</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Job Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Job Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Reference */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Job Reference</p>
                      <p className="font-semibold text-gray-900 text-sm">{job.reference}</p>
                    </div>

                    {/* Service */}
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Service</p>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        {job.service}
                      </Badge>
                    </div>

                    {/* Date & Time */}
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Appointment</p>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-gray-900">{job.date}</p>
                          <p className="text-gray-600">{job.time}</p>
                        </div>
                      </div>
                    </div>

                    {/* Customer */}
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Customer</p>
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-gray-900 font-medium">{job.customer.name}</p>
                          <p className="text-gray-600 text-xs">{job.customer.email}</p>
                          <p className="text-gray-600 text-xs">{job.customer.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Property */}
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Property</p>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-600 mt-0.5" />
                        <div className="text-sm text-gray-900">
                          <p>{job.property.address}</p>
                          <p>{job.property.city}</p>
                          <p>{job.property.postcode}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
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

            {/* Right Column - Upload Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Upload Report Files</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                      isDragging
                        ? "border-red-600 bg-red-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-gray-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Drop files here or click to browse
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Drag and drop your files, or click to select
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button variant="outline" asChild>
                          <span>Select Files</span>
                        </Button>
                      </label>
                    </div>
                  </div>

                  {/* Accepted Formats */}
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

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-6">
                      <Label className="mb-3 block">Uploaded Files ({uploadedFiles.length})</Label>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {file.type === 'application/pdf' ? (
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
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="flex-shrink-0 ml-2"
                            >
                              <X className="w-4 h-4 text-gray-500 hover:text-red-600" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Additional Notes (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add any additional notes or comments for the customer..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    These notes will be included in the email to the customer
                  </p>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="lg" disabled={isSubmitting}>
                  Save as Draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={uploadedFiles.length === 0 || isSubmitting}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
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
        </div>
      </main>
    </div>
  );
}