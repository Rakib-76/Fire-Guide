import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getApiToken } from "../../lib/auth";

export default function AddServicePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    service_name: "",
    type: "DELIVERY",
    status: "ACTIVE",
    price: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service_name.trim() || !formData.description.trim() || !formData.price.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to add a service.");
      return;
    }

    setIsSubmitting(true);
    try {
      // For adding a new service, we would need a create endpoint
      // For now, this is a placeholder - you may need to create a createService function
      toast.success("Service creation functionality will be implemented with the create endpoint");
      navigate("/admin/dashboard/services");
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while adding the service. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/admin/dashboard/services");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-[#0A1A2F]">Add New Service</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="service_name" className="text-sm font-medium">
                  Service Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="service_name"
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="mt-2 h-11"
                  placeholder="e.g., Fire Safety Training"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-sm font-medium">
                  Type <span className="text-red-600">*</span>
                </Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-2 w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                >
                  <option value="DELIVERY">DELIVERY</option>
                  <option value="CONSULTATION">CONSULTATION</option>
                </select>
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-medium">
                  Status <span className="text-red-600">*</span>
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-2 w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  required
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <Label htmlFor="price" className="text-sm font-medium">
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
                  className="mt-2 h-11"
                  placeholder="150"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-2"
                  rows={4}
                  placeholder="Describe the service..."
                  required
                />
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
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Service
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
