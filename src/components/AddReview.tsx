import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { createReview, CreateReviewRequest } from "../api/reviewsService";
import { getApiToken, getProfessionalId, getUserEmail } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Star } from "lucide-react";

export function AddReview() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: getUserEmail() || "",
    rating: "",
    feedback: "",
    professional_id: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set professional_id from localStorage on mount
  useEffect(() => {
    const professionalId = getProfessionalId();
    if (professionalId) {
      setFormData(prev => ({ ...prev, professional_id: professionalId.toString() }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!formData.rating) {
      toast.error("Please select a rating");
      return;
    }

    if (!formData.feedback.trim()) {
      toast.error("Please enter feedback");
      return;
    }

    if (!formData.professional_id) {
      toast.error("Professional ID not found. Please log in again.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to create review.");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData: CreateReviewRequest = {
        api_token: token,
        name: formData.name.trim(),
        email: formData.email.trim(),
        rating: formData.rating,
        feedback: formData.feedback.trim(),
        professional_id: parseInt(formData.professional_id)
      };

      const response = await createReview(requestData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Review created successfully!");
        // Navigate back to reviews page
        navigate("/customer/dashboard/reviews");
      } else {
        toast.error(response.message || response.error || "Failed to create review. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while creating review. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/reviews");
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Add Review</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Create a new review entry
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600" />
            Review Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11"
                placeholder="e.g., John Doe"
                required
              />
              <p className="text-xs text-gray-500">Enter the reviewer's name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-600">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-11"
                placeholder="e.g., john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">
                Rating <span className="text-red-600">*</span>
              </Label>
              <select
                id="rating"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              >
                <option value="">Select a rating</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
                <option value="4">4 Stars</option>
                <option value="5">5 Stars</option>
              </select>
              <p className="text-xs text-gray-500">Select a rating from 1 to 5 stars</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">
                Feedback <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="feedback"
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                rows={4}
                placeholder="e.g., Excellent service"
                required
              />
              <p className="text-xs text-gray-500">Enter your feedback or review comment</p>
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
                  "Create Review"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
