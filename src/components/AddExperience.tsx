import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { createExperience, CreateExperienceRequest } from "../api/experiencesService";
import { fetchSpecializations, SpecializationItem } from "../api/specializationsService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

export function AddExperience() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    years_experience: "",
    assessment: "",
    specialization_id: "",
    professional_id: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Set professional_id from localStorage on mount
  useEffect(() => {
    const professionalId = getProfessionalId();
    if (professionalId) {
      setFormData(prev => ({ ...prev, professional_id: professionalId.toString() }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      toast.error("Please log in to create experience.");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData: CreateExperienceRequest = {
        api_token: token,
        years_experience: formData.years_experience.trim(),
        assessment: formData.assessment.trim(),
        specialization_id: parseInt(formData.specialization_id),
        professional_id: parseInt(formData.professional_id)
      };

      const response = await createExperience(requestData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Experience created successfully!");
        // Navigate back to experiences page
        navigate("/customer/dashboard/experiences");
      } else {
        toast.error(response.message || response.error || "Failed to create experience. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while creating experience. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/experiences");
  };

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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Add Experience</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Create a new professional experience entry
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
                    Creating...
                  </>
                ) : (
                  "Create Experience"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
