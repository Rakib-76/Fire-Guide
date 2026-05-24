import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { updateExperience, fetchExperiences, UpdateExperienceRequest, ExperienceResponse } from "../api/experiencesService";
import { fetchSpecializations, SpecializationItem } from "../api/specializationsService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

export function EditExperience() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const experienceId = id ? parseInt(id, 10) : null;

  const [formData, setFormData] = useState({
    years_experience: "",
    assessment: "",
    specialization_id: "",
    professional_id: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [specializations, setSpecializations] = useState<SpecializationItem[]>([]);
  const [isLoadingSpecializations, setIsLoadingSpecializations] = useState(false);

  // Fetch specializations on mount
  useEffect(() => {
    const loadSpecializations = async () => {
      setIsLoadingSpecializations(true);
      try {
        const data = await fetchSpecializations();
        setSpecializations(data);
      } catch (error: any) {
        console.error('Failed to load specializations:', error);
        toast.error(error.message || 'Failed to load specializations');
      } finally {
        setIsLoadingSpecializations(false);
      }
    };

    loadSpecializations();
  }, []);

  // Load experience data on mount
  useEffect(() => {
    const loadExperience = async () => {
      if (!experienceId) {
        toast.error("Invalid experience ID");
        navigate("/customer/dashboard/experiences");
        return;
      }

      setIsLoading(true);
      try {
        const experiences = await fetchExperiences();
        const experience = experiences.find(e => e.id === experienceId);
        if (experience) {
          // Format the date for the date input (YYYY-MM-DD)
          const yearsExperienceDate = experience.years_experience
            ? new Date(experience.years_experience).toISOString().split('T')[0]
            : "";

          setFormData({
            years_experience: yearsExperienceDate,
            assessment: experience.assessment || "",
            specialization_id: experience.specialization?.id?.toString() || "",
            professional_id: experience.professional?.id?.toString() || ""
          });
        } else {
          toast.error("Experience not found");
          navigate("/customer/dashboard/experiences");
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.error || "An error occurred while loading experience.";
        toast.error(errorMessage);
        navigate("/customer/dashboard/experiences");
      } finally {
        setIsLoading(false);
      }
    };

    loadExperience();
  }, [experienceId, navigate]);

  // Set professional_id from localStorage if not already set
  useEffect(() => {
    if (!formData.professional_id) {
      const professionalId = getProfessionalId();
      if (professionalId) {
        setFormData(prev => ({ ...prev, professional_id: professionalId.toString() }));
      }
    }
  }, [formData.professional_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!experienceId) {
      toast.error("Invalid experience ID");
      return;
    }

    if (!formData.years_experience.trim()) {
      toast.error("Please enter years of experience");
      return;
    }

    if (!formData.assessment.trim()) {
      toast.error("Please enter an assessment");
      return;
    }

    if (!formData.specialization_id) {
      toast.error("Please select a specialization");
      return;
    }

    if (!formData.professional_id) {
      toast.error("Professional ID not found. Please log in again.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update experience.");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData: UpdateExperienceRequest = {
        api_token: token,
        id: experienceId,
        years_experience: formData.years_experience.trim(),
        assessment: formData.assessment.trim(),
        specialization_id: parseInt(formData.specialization_id),
        professional_id: parseInt(formData.professional_id)
      };

      const response = await updateExperience(requestData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Experience updated successfully!");
        // Navigate back to experiences page
        navigate("/customer/dashboard/experiences");
      } else {
        toast.error(response.message || response.error || "Failed to update experience. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while updating experience. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/experiences");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-600">Loading experience...</span>
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Edit Experience</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Update your experience information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Experience Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="years_experience">
                Years Experience <span className="text-red-600">*</span>
              </Label>
              <Input
                id="years_experience"
                type="date"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                className="h-11"
                required
              />
              <p className="text-xs text-gray-500">Select the date when the experience started</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessment">
                Assessment <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="assessment"
                value={formData.assessment}
                onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                rows={4}
                placeholder="e.g., 5 years of professional experience"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization_id">
                Specialization <span className="text-red-600">*</span>
              </Label>
              {isLoadingSpecializations ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading specializations...
                </div>
              ) : (
                <select
                  id="specialization_id"
                  value={formData.specialization_id}
                  onChange={(e) => setFormData({ ...formData, specialization_id: e.target.value })}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                >
                  <option value="">Select a specialization</option>
                  {specializations.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.title}
                    </option>
                  ))}
                </select>
              )}
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
