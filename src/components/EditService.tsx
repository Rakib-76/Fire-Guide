import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { updateService, UpdateServiceRequest, fetchServices, ServiceResponse } from "../api/servicesService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, FileText, Flame } from "lucide-react";

export function EditService() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const serviceId = id ? parseInt(id, 10) : null;

  const [formData, setFormData] = useState({
    service_name: "",
    type: "DELIVERY",
    status: "ACTIVE",
    price: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load service data on mount
  useEffect(() => {
    const loadService = async () => {
      if (!serviceId) {
        toast.error("Invalid service ID");
        navigate("/customer/dashboard/services");
        return;
      }

      setIsLoading(true);
      try {
        const services = await fetchServices();
        const service = services.find(s => s.id === serviceId);
        if (service) {
          // Clean the type field - remove any "update" prefix if present
          const cleanType = service.type?.replace(/^\s*update\s+/i, "").trim() || "DELIVERY";
          setFormData({
            service_name: service.service_name || "",
            type: cleanType === "DELIVERY" || cleanType === "CONSULTATION" ? cleanType : "DELIVERY",
            status: service.status || "ACTIVE",
            price: (service.from_price || service.price || "").toString(),
            description: service.description || ""
          });
        } else {
          toast.error("Service not found");
          navigate("/customer/dashboard/services");
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.error || "An error occurred while loading service.";
        toast.error(errorMessage);
        navigate("/customer/dashboard/services");
      } finally {
        setIsLoading(false);
      }
    };

    loadService();
  }, [serviceId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service_name.trim() || !formData.description.trim() || !formData.price.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!serviceId) {
      toast.error("Invalid service ID");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update service.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: UpdateServiceRequest = {
        api_token: token,
        id: serviceId,
        service_name: formData.service_name.trim(),
        type: formData.type,
        status: formData.status,
        price: formData.price.trim(),
        description: formData.description.trim()
      };

      const response = await updateService(updateData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Service updated successfully!");
        navigate("/customer/dashboard/services");
      } else {
        toast.error(response.message || response.error || "Failed to update service. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while updating service. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/customer/dashboard/services");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-600">Loading service...</span>
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
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Edit Service</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Update your service information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-600" />
            Service Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="service_name">Service Name *</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                placeholder="e.g., Fire Safety Training"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Enter the service name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              >
                <option value="DELIVERY">DELIVERY</option>
                <option value="CONSULTATION">CONSULTATION</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Select the service type</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">Select the service status</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
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
                placeholder="150"
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Enter the service price</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Describe the service..."
                className="px-4 py-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Enter a detailed description of the service</p>
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
