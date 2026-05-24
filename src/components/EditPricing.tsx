import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { updatePrice, fetchPrices } from "../api/pricingService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, DollarSign } from "lucide-react";

export function EditPricing() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const priceId = id ? parseInt(id, 10) : null;

  const [formData, setFormData] = useState({
    title: "",
    price: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load price data on mount
  useEffect(() => {
    const loadPrice = async () => {
      if (!priceId) {
        toast.error("Invalid price ID");
        navigate("/customer/dashboard/pricing");
        return;
      }

      const token = getApiToken();
      if (!token) {
        toast.error("Please log in to edit price.");
        navigate("/customer/dashboard/pricing");
        return;
      }

      setIsLoading(true);
      try {
        const prices = await fetchPrices();
        const price = prices.find(p => p.id === priceId);
        if (price) {
          setFormData({
            title: price.title,
            price: price.price
          });
        } else {
          toast.error("Price not found");
          navigate("/customer/dashboard/pricing");
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.error || "An error occurred while loading price.";
        toast.error(errorMessage);
        navigate("/customer/dashboard/pricing");
      } finally {
        setIsLoading(false);
      }
    };

    loadPrice();
  }, [priceId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!priceId) {
      toast.error("Invalid price ID");
      return;
    }

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
      toast.error("Please log in to update price.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updatePrice({
        api_token: token,
        id: priceId,
        title: formData.title.trim(),
        price: formData.price.trim()
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Price updated successfully!");
        navigate("/customer/dashboard/pricing");
      } else {
        toast.error(response.message || response.error || "Failed to update price. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while updating price. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/pricing");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-600">Loading price...</span>
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Edit Pricing</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Update your pricing information
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
                    Updating...
                  </>
                ) : (
                  "Update Pricing"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
