import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { createService, CreateServiceRequest } from "../api/servicesService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, FileText } from "lucide-react";

export function AddService() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    service_name: "",
    type: "DELIVERY",
    status: "ACTIVE",
    price: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service_name.trim()) {
      toast.error("Please enter a service name");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!formData.price.trim()) {
      toast.error("Please enter a price");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to create service.");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData: CreateServiceRequest = {
        api_token: token,
        service_name: formData.service_name.trim(),
        type: formData.type,
        status: formData.status,
        price: formData.price.trim(),
        description: formData.description.trim()
      };

      const response = await createService(requestData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Service created successfully!");
        // Navigate back to services page
        navigate("/customer/dashboard/services");
      } else {
        toast.error(response.message || response.error || "Failed to create service. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while creating service. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/services");
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Add Service</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Create a new service entry
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            Service Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="service_name">
                Service Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="service_name"
                type="text"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                className="h-11"
                placeholder="e.g., Fire Alarm Service"
                required
              />
              <p className="text-xs text-gray-500">Enter the name of the service</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-red-600">*</span>
              </Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              >
                <option value="DELIVERY">DELIVERY</option>
                <option value="CONSULTATION">CONSULTATION</option>
              </select>
              <p className="text-xs text-gray-500">Select the service type</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-600">*</span>
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <p className="text-xs text-gray-500">Select the service status</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                Price <span className="text-red-600">*</span>
              </Label>
              <Input
                id="price"
                type="text"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setFormData({ ...formData, price: value });
                  }
                }}
                className="h-11"
                placeholder="e.g., 200"
                required
              />
              <p className="text-xs text-gray-500">Enter the service price</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="e.g., Installation, maintenance, and testing of fire alarm systems"
                required
              />
              <p className="text-xs text-gray-500">Enter a detailed description of the service</p>
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
                  "Create Service"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
