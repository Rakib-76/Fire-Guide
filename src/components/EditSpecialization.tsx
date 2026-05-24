import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { updateSpecialization, fetchSpecializations, SpecializationItem } from "../api/specializationsService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Tag } from "lucide-react";

export function EditSpecialization() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const specializationId = id ? parseInt(id, 10) : null;

  const [formData, setFormData] = useState({
    title: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load specialization data on mount
  useEffect(() => {
    const loadSpecialization = async () => {
      if (!specializationId) {
        toast.error("Invalid specialization ID");
        navigate("/customer/dashboard/specializations");
        return;
      }

      setIsLoading(true);
      try {
        const specializations = await fetchSpecializations();
        const specialization = specializations.find(s => s.id === specializationId);
        if (specialization) {
          setFormData({
            title: specialization.title
          });
        } else {
          toast.error("Specialization not found");
          navigate("/customer/dashboard/specializations");
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.error || "An error occurred while loading specialization.";
        toast.error(errorMessage);
        navigate("/customer/dashboard/specializations");
      } finally {
        setIsLoading(false);
      }
    };

    loadSpecialization();
  }, [specializationId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!specializationId) {
      toast.error("Invalid specialization ID");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a specialization title");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update specialization.");
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
      const response = await updateSpecialization({
        api_token: token,
        id: specializationId,
        title: formData.title.trim(),
        professional_id: professionalId
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Specialization updated successfully!");
        // Navigate back to specializations page
        navigate("/customer/dashboard/specializations");
      } else {
        toast.error(response.message || response.error || "Failed to update specialization. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while updating specialization. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/specializations");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-600">Loading specialization...</span>
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Edit Specialization</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Update your specialization information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-red-600" />
            Specialization Details
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
                placeholder="e.g., Cardiology Digital"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Enter the specialization title</p>
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
