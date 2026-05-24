import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { updateCertification, fetchQualifications, QualificationCertificationResponse } from "../api/qualificationsService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Award } from "lucide-react";

export function EditCertification() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const certificationId = id ? parseInt(id, 10) : null;

  const [formData, setFormData] = useState({
    title: "",
    certification_date: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Convert date string to YYYY-MM-DD format for input
  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return dateString;
    }
  };

  // Load certification data on mount
  useEffect(() => {
    const loadCertification = async () => {
      if (!certificationId) {
        toast.error("Invalid certification ID");
        navigate("/customer/dashboard/certification");
        return;
      }

      setIsLoading(true);
      try {
        const certifications = await fetchQualifications();
        const certification = certifications.find(c => c.id === certificationId);
        if (certification) {
          setFormData({
            title: certification.title,
            certification_date: formatDateForInput(certification.certification_date)
          });
        } else {
          toast.error("Certification not found");
          navigate("/customer/dashboard/certification");
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.error || "An error occurred while loading certification.";
        toast.error(errorMessage);
        navigate("/customer/dashboard/certification");
      } finally {
        setIsLoading(false);
      }
    };

    loadCertification();
  }, [certificationId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!certificationId) {
      toast.error("Invalid certification ID");
      return;
    }

    if (!formData.title.trim() || !formData.certification_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update certification.");
      return;
    }

    // Get professional_id from localStorage (stored during login/register)
    const professionalId = getProfessionalId();
    if (!professionalId) {
      toast.error("Professional ID not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateCertification({
        api_token: token,
        id: certificationId,
        title: formData.title.trim(),
        certification_date: formData.certification_date,
        professional_id: professionalId
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Certification updated successfully!");
        // Navigate back to certifications page
        navigate("/customer/dashboard/certification");
      } else {
        toast.error(response.message || response.error || "Failed to update certification. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while updating certification. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/certification");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-600">Loading certification...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Edit Certification</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Update your certification information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Certification Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Fire Risk Assessment Level 4"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certification_date">Certification Date *</Label>
              <Input
                id="certification_date"
                type="date"
                value={formData.certification_date}
                onChange={(e) => setFormData({ ...formData, certification_date: e.target.value })}
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 h-10"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  // "Update Certification"
                  "Update"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
