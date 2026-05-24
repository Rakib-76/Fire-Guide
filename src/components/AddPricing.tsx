import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { createPrice } from "../api/pricingService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, DollarSign } from "lucide-react";

export function AddPricing() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    price: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.price.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate price is a valid number
    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please enter a valid price greater than 0");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to create a price.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createPrice({
        api_token: token,
        title: formData.title.trim(),
        price: formData.price.trim()
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Price created successfully!");
        // Navigate back to pricing page
        navigate("/customer/dashboard/pricing");
      } else {
        toast.error(response.message || response.error || "Failed to create price. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while creating price. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/pricing");
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Add Pricing</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Create a new pricing entry for your services
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Pricing Details
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
                placeholder="e.g., Smith MC, John Doe"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  £
                </span>
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  value={formData.price}
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setFormData({ ...formData, price: value });
                    }
                  }}
                  placeholder="0.00"
                  className="pl-7 px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Enter the price amount (e.g., 100 or 100.50)</p>
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
                  "Create Pricing"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
