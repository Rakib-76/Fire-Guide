import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { createCertification } from "../api/qualificationsService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, X, Upload, Loader2, FileText } from "lucide-react";

export function AddCertification() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    certificate_name: "",
    description: "",
    evidence: "",
    status: "pending"
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle close - close tab if opened in new tab, otherwise navigate back
  const handleClose = () => {
    if (window.opener) {
      // If opened in a new tab/window, close it
      window.close();
    } else {
      // Otherwise navigate back
      navigate("/customer/dashboard/certification");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (allow PDF, images, and common document formats)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a PDF, image, or document file.");
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB.");
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setSelectedFile(file);
      setFormData({ ...formData, evidence: file.name });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64String = result.split(',')[1] || result;
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.certificate_name.trim()) {
      toast.error("Please enter a certificate name");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!formData.evidence && !selectedFile) {
      toast.error("Please upload evidence file");
      return;
    }

    if (!formData.status) {
      toast.error("Please select a status");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to create a certification.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert file to base64 if a file is selected
      let evidenceValue = formData.evidence;
      if (selectedFile) {
        try {
          evidenceValue = await convertFileToBase64(selectedFile);
        } catch (fileError) {
          console.error("Error converting file to base64:", fileError);
          toast.error("Error processing file. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      // Get professional_id for backward compatibility (optional)
      const professionalId = getProfessionalId();

      const response = await createCertification({
        api_token: token,
        certificate_name: formData.certificate_name.trim(),
        description: formData.description.trim(),
        evidence: evidenceValue,
        status: formData.status,
        // Optional fields for backward compatibility
        ...(professionalId && { professional_id: professionalId }),
        title: formData.certificate_name.trim(), // Also send as title for API compatibility
        certification_date: new Date().toISOString().split('T')[0]
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Certification created successfully!");
        // Close tab if opened in new tab, otherwise navigate back
        handleClose();
      } else {
        toast.error(response.message || response.error || "Failed to create certification. Please try again.");
      }
    } catch (error: any) {
      console.error("Error creating certification:", error);
      const errorMessage = error?.message || error?.error || "An error occurred while creating certification. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Add Certification</h1>
            <p className="text-gray-600 text-sm md:text-base">
              Create a new professional certification
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certification Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="certificate_name">Certificate Name *</Label>
              <Input
                id="certificate_name"
                value={formData.certificate_name}
                onChange={(e) => setFormData({ ...formData, certificate_name: e.target.value })}
                placeholder="e.g., Fire Risk Assessment Level 4, NEBOSH Fire Safety"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter a detailed description of the certification..."
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none min-h-[120px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence (File Upload) *</Label>
              <div className="space-y-3">
                <Input
                  ref={fileInputRef}
                  id="evidence"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                  onChange={handleFileChange}
                  className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  required={!formData.evidence}
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setFormData({ ...formData, evidence: "" });
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Accepted formats: PDF, JPG, PNG, GIF, DOC, DOCX (Max size: 10MB)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                required
              >
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>


            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Create Certification
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
