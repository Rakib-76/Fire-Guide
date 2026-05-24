import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { storeAddress } from "../api/addressService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export function AddAddress() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tag: "",
    adress_line: "",
    city: "",
    postal_code: "",
    country: "Bangladesh",
    is_default_address: false,
    is_favourite_address: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tag.trim() || !formData.adress_line.trim() || !formData.city.trim() || !formData.postal_code.trim() || !formData.country.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to save address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await storeAddress({
        api_token: token,
        tag: formData.tag.trim(),
        adress_line: formData.adress_line.trim(),
        city: formData.city.trim(),
        postal_code: formData.postal_code.trim(),
        country: formData.country.trim(),
        is_default_address: formData.is_default_address,
        is_favourite_address: formData.is_favourite_address
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Address saved successfully!");
        // Navigate back to profile page
        navigate("/customer/dashboard/profile");
      } else {
        toast.error(response.message || response.error || "Failed to save address. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while saving address. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/profile");
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Add New Address</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Create a new address for your profile
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address-tag">Address Label (Tag) *</Label>
              <Input
                id="address-tag"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="e.g., Home, Office, Warehouse"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-line">Address Line *</Label>
              <Input
                id="address-line"
                value={formData.adress_line}
                onChange={(e) => setFormData({ ...formData, adress_line: e.target.value })}
                placeholder="e.g., Rampura"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address-city">City *</Label>
                <Input
                  id="address-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Dhaka"
                  className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-postal-code">Postal Code *</Label>
                <Input
                  id="address-postal-code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="e.g., 1205"
                  className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-country">Country *</Label>
              <Input
                id="address-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., Bangladesh"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-default-address"
                  checked={formData.is_default_address}
                  onChange={(e) => setFormData({ ...formData, is_default_address: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <Label htmlFor="is-default-address" className="font-normal cursor-pointer">
                  Set as default address
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-favourite-address"
                  checked={formData.is_favourite_address}
                  onChange={(e) => setFormData({ ...formData, is_favourite_address: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <Label htmlFor="is-favourite-address" className="font-normal cursor-pointer">
                  Mark as favourite
                </Label>
              </div>
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
                    Saving...
                  </>
                ) : (
                  "Save Address"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
