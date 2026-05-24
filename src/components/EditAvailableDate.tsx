import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { updateAvailableDate, fetchAvailableDates } from "../api/availableDatesService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CalendarCheck, Clock } from "lucide-react";

export function EditAvailableDate() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dateId = id ? parseInt(id, 10) : null;

  const [formData, setFormData] = useState({
    date: "",
    slot: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load available date data on mount
  useEffect(() => {
    const loadAvailableDate = async () => {
      if (!dateId) {
        toast.error("Invalid available date ID");
        navigate("/customer/dashboard/available_date");
        return;
      }

      const token = getApiToken();
      if (!token) {
        toast.error("Please log in to edit available date.");
        navigate("/customer/dashboard/available_date");
        return;
      }

      setIsLoading(true);
      try {
        const dates = await fetchAvailableDates();
        const dateItem = dates.find(d => d.id === dateId);
        if (dateItem) {
          setFormData({
            date: dateItem.date,
            slot: dateItem.slot
          });
        } else {
          toast.error("Available date not found");
          navigate("/customer/dashboard/available_date");
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.error || "An error occurred while loading available date.";
        toast.error(errorMessage);
        navigate("/customer/dashboard/available_date");
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableDate();
  }, [dateId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateId) {
      toast.error("Invalid available date ID");
      return;
    }

    if (!formData.date.trim() || !formData.slot.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update available date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateAvailableDate({
        api_token: token,
        id: dateId,
        date: formData.date.trim(),
        slot: formData.slot.trim()
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Available date updated successfully!");
        navigate("/customer/dashboard/available_date");
      } else {
        toast.error(response.message || response.error || "Failed to update available date. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while updating available date. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/available_date");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-600">Loading available date...</span>
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Edit Available Date</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Update your available date and time slot
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            Available Date Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot">Time Slot *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="slot"
                  type="text"
                  value={formData.slot}
                  onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                  placeholder="e.g., 10:00 AM - 1:00 AM"
                  className="pl-10 px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Enter the time slot (e.g., 10:00 AM - 1:00 AM)</p>
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
                  // "Update Available Date"
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
