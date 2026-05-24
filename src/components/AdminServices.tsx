import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Plus, Edit, Save, X, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { ServiceCard, Service } from "./ServiceCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { toast } from "sonner";
import { 
  updateService, 
  UpdateServiceRequest, 
  createService, 
  CreateServiceRequest,
  fetchServices,
  ServiceResponse,
  formatServiceFromPrice,
  deleteService,
  DeleteServiceRequest
} from "../api/servicesService";
import { getApiToken } from "../lib/auth";
import { getLucideIconForService } from "../lib/serviceIcons";

const colorOptions = ["red", "blue", "orange", "green", "purple"];

// Map API service response to Service type
const mapApiServiceToService = (apiService: ServiceResponse, index: number): Service => {
  const isActive = apiService.status?.toUpperCase() === "ACTIVE";
  const formattedPrice = formatServiceFromPrice(apiService);

  const serviceName = apiService.service_name || "Service";
  const iconComponent = getLucideIconForService(serviceName, apiService.type);

  const colorIndex = index % colorOptions.length;
  const color = colorOptions[colorIndex] as "red" | "blue" | "orange" | "green" | "purple";

  return {
    id: apiService.id,
    name: serviceName,
    icon: apiService.icon || undefined,
    iconComponent: iconComponent,
    description: apiService.description || "No description available",
    basePrice: formattedPrice,
    active: isActive,
    popular: false,
    color: color
  };
};

export function AdminServices() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we're on the add service route or edit service route
  const isAddServiceRoute = location.pathname === "/admin/dashboard/services/add";
  const isEditServiceRoute = location.pathname.startsWith("/admin/dashboard/services/edit/");
  const serviceIdToEdit = isEditServiceRoute && params.id ? parseInt(params.id, 10) : null;
  const [services, setServices] = useState<Service[]>([]);

  const [newService, setNewService] = useState<Partial<Service>>({
    name: "",
    description: "",
    basePrice: "",
    popular: false,
    active: true
  });

  // Form data for Add Service page
  const [addServiceForm, setAddServiceForm] = useState({
    service_name: "",
    type: "DELIVERY",
    status: "ACTIVE",
    price: "",
    description: ""
  });
  
  // Form data for Edit Service page
  const [editServiceForm, setEditServiceForm] = useState({
    service_name: "",
    type: "DELIVERY",
    status: "ACTIVE",
    price: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Store original API services to access type information
  const [apiServices, setApiServices] = useState<ServiceResponse[]>([]);
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [serviceIdToDelete, setServiceIdToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch services from API on component mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedApiServices = await fetchServices();
        setApiServices(fetchedApiServices);
        const mappedServices = fetchedApiServices.map((apiService, index) => 
          mapApiServiceToService(apiService, index)
        );
        setServices(mappedServices);
      } catch (err: any) {
        console.error("Error loading services:", err);
        setError(err?.message || "Failed to load services");
        toast.error("Failed to load services. Please try again later.");
        setServices([]);
        setApiServices([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAddServiceRoute && !isEditServiceRoute) {
      loadServices();
    } else if (isEditServiceRoute && serviceIdToEdit) {
      // Load services to get the service data for editing
      loadServices();
    }
  }, [isAddServiceRoute, isEditServiceRoute, serviceIdToEdit]);

  // Load service data into edit form when on edit route
  useEffect(() => {
    if (isEditServiceRoute && serviceIdToEdit && services.length > 0 && apiServices.length > 0) {
      const serviceToEdit = services.find(s => s.id === serviceIdToEdit);
      const apiService = apiServices.find(s => s.id === serviceIdToEdit);
      if (serviceToEdit && apiService) {
        setEditServiceForm({
          service_name: serviceToEdit.name,
          type: apiService.type || "DELIVERY",
          status: serviceToEdit.active ? "ACTIVE" : "INACTIVE",
          price: serviceToEdit.basePrice.replace("£", "").replace(",", ""),
          description: serviceToEdit.description
        });
      } else if (!serviceToEdit) {
        toast.error("Service not found");
        navigate("/admin/dashboard/services");
      }
    }
  }, [isEditServiceRoute, serviceIdToEdit, services, apiServices, navigate]);

  const handleEdit = (id: number) => {
    navigate(`/admin/dashboard/services/edit/${id}`);
  };

  const handleEditServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceIdToEdit) {
      toast.error("Service ID is missing");
      return;
    }

    if (!editServiceForm.service_name.trim() || !editServiceForm.description.trim() || !editServiceForm.price.trim()) {
      toast.error("Please fill in all required fields");
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
        id: serviceIdToEdit,
        service_name: editServiceForm.service_name.trim(),
        type: editServiceForm.type,
        status: editServiceForm.status,
        price: editServiceForm.price.trim(),
        description: editServiceForm.description.trim()
      };

      const response = await updateService(updateData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Service updated successfully!");
        // Navigate back to services list
        navigate("/admin/dashboard/services");
      } else {
        toast.error(response.message || response.error || "Failed to update service. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while updating the service. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setServiceIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setServiceIdToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceIdToDelete) {
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to delete service.");
      setIsDeleteModalOpen(false);
      setServiceIdToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const deleteData: DeleteServiceRequest = {
        api_token: token,
        id: serviceIdToDelete
      };

      const response = await deleteService(deleteData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        // Refresh services from API after delete
        const fetchedApiServices = await fetchServices();
        setApiServices(fetchedApiServices);
        const mappedServices = fetchedApiServices.map((apiService, index) => 
          mapApiServiceToService(apiService, index)
        );
        setServices(mappedServices);
        toast.success(response.message || "Service deleted successfully!");
        setIsDeleteModalOpen(false);
        setServiceIdToDelete(null);
      } else {
        toast.error(response.message || response.error || "Failed to delete service. Please try again.");
      }
    } catch (error: any) {
      console.error("Delete service error:", error);
      console.error("Error details:", {
        status: error?.status,
        statusCode: error?.statusCode,
        message: error?.message,
        error: error?.error,
        response: error?.response
      });
      
      // Handle different types of errors
      let errorMessage = "An error occurred while deleting service. Please try again.";
      
      // Check for 403 Forbidden errors (multiple ways it might be presented)
      if (error?.status === 403 || error?.statusCode === 403 || error?.response?.status === 403) {
        errorMessage = error?.response?.data?.message || error?.message || "You don't have permission to delete this service. Please check your authentication and try logging in again.";
        // Don't close modal on 403 so user can try again
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddService = () => {
    if (!newService.name || !newService.description || !newService.basePrice) {
      toast.error("Please fill in all required fields");
      return;
    }

    const service: Service = {
      id: Math.max(...services.map(s => s.id)) + 1,
      name: newService.name,
      description: newService.description,
      basePrice: newService.basePrice,
      popular: newService.popular || false,
      active: newService.active !== false,
      color: "red"
    };

    setServices([...services, service]);
    setNewService({ name: "", description: "", basePrice: "", popular: false, active: true });
    setIsAddModalOpen(false);
    toast.success("Service added successfully!");
  };

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addServiceForm.service_name.trim() || !addServiceForm.description.trim() || !addServiceForm.price.trim()) {
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
      const createData: CreateServiceRequest = {
        api_token: token,
        service_name: addServiceForm.service_name.trim(),
        type: addServiceForm.type,
        status: addServiceForm.status,
        price: addServiceForm.price.trim(),
        description: addServiceForm.description.trim()
      };

      const response = await createService(createData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Service created successfully!");
        // Reset form
        setAddServiceForm({
          service_name: "",
          type: "DELIVERY",
          status: "ACTIVE",
          price: "",
          description: ""
        });
        // Navigate back to services list (services will be refreshed automatically via useEffect)
        navigate("/admin/dashboard/services");
      } else {
        toast.error(response.message || response.error || "Failed to create service. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while adding the service. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToServices = () => {
    navigate("/admin/dashboard/services");
  };

  // Render Edit Service form if on edit route
  if (isEditServiceRoute && serviceIdToEdit) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackToServices}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-[#0A1A2F]">Edit Service</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="ml-3 text-gray-600">Loading service data...</span>
              </div>
            ) : (
              <form onSubmit={handleEditServiceSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="edit_service_name" className="text-sm font-medium">
                    Service Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="edit_service_name"
                    value={editServiceForm.service_name}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, service_name: e.target.value })}
                    className="mt-2 h-11"
                    placeholder="e.g., Fire Safety Training"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit_type" className="text-sm font-medium">
                    Type <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="edit_type"
                    value={editServiceForm.type}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, type: e.target.value })}
                    className="mt-2 w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  >
                    <option value="DELIVERY">DELIVERY</option>
                    <option value="CONSULTATION">CONSULTATION</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="edit_status" className="text-sm font-medium">
                    Status <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="edit_status"
                    value={editServiceForm.status}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, status: e.target.value })}
                    className="mt-2 w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="edit_price" className="text-sm font-medium">
                    Price <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="edit_price"
                    type="text"
                    value={editServiceForm.price}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setEditServiceForm({ ...editServiceForm, price: value });
                      }
                    }}
                    className="mt-2 h-11"
                    placeholder="150"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit_description" className="text-sm font-medium">
                    Description <span className="text-red-600">*</span>
                  </Label>
                  <Textarea
                    id="edit_description"
                    value={editServiceForm.description}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, description: e.target.value })}
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
                    onClick={handleBackToServices}
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
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Service
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Add Service form if on add route
  if (isAddServiceRoute) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackToServices}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-[#0A1A2F]">Add New Service</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddServiceSubmit} className="space-y-6">
              <div>
                <Label htmlFor="service_name" className="text-sm font-medium">
                  Service Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="service_name"
                  value={addServiceForm.service_name}
                  onChange={(e) => setAddServiceForm({ ...addServiceForm, service_name: e.target.value })}
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
                  value={addServiceForm.type}
                  onChange={(e) => setAddServiceForm({ ...addServiceForm, type: e.target.value })}
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
                  value={addServiceForm.status}
                  onChange={(e) => setAddServiceForm({ ...addServiceForm, status: e.target.value })}
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
                  value={addServiceForm.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setAddServiceForm({ ...addServiceForm, price: value });
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
                  value={addServiceForm.description}
                  onChange={(e) => setAddServiceForm({ ...addServiceForm, description: e.target.value })}
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
                  onClick={handleBackToServices}
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
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header — stack on narrow screens so title + CTA are not cramped */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-[20px] text-[#0A1A2F] mb-2">Service Management</h1>
          <p className="text-sm md:text-[14px] text-gray-600">
            Manage fire safety services offered on the platform
          </p>
        </div>
        {!isAddServiceRoute && (
          <Button
            onClick={() => navigate("/admin/dashboard/services/add")}
            className="bg-red-600 hover:bg-red-700 h-11 w-full shrink-0 md:w-auto md:self-start"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200 rounded-xl">
        <CardContent className="p-4 sm:p-4">
          <p className="text-sm text-blue-900">
            <strong>Automatic Sync:</strong> Services created, edited, or deleted here automatically
            appear across Landing Page, Customer Portal, and Professional Portal. Only "Active" services
            are visible to customers.
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <span className="ml-3 text-gray-600">Loading services...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-900">
              <strong>Error:</strong> {error}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-3 bg-red-600 hover:bg-red-700"
              size="sm"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Services grid — single column on mobile, two from md+ */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {services.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">No services found. Add your first service to get started.</p>
            </div>
          ) : (
            services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                variant="admin"
                showActions={true}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))
          )}
        </div>
      )}

      {/* Add Service Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#0A1A2F]">Add New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="text-sm">
                Service Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                value={newService.name || ""}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className="mt-2 h-11"
                placeholder="e.g., Fire Safety Training"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm">
                Description <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="description"
                value={newService.description || ""}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                className="mt-2"
                rows={3}
                placeholder="Describe the service..."
              />
            </div>

            <div>
              <Label htmlFor="basePrice" className="text-sm">
                Base Price <span className="text-red-600">*</span>
              </Label>
              <Input
                id="basePrice"
                value={newService.basePrice || ""}
                onChange={(e) => setNewService({ ...newService, basePrice: e.target.value })}
                className="mt-2 h-11"
                placeholder="£250"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newService.popular || false}
                  onChange={(e) => setNewService({ ...newService, popular: e.target.checked })}
                  className="w-4 h-4 border-gray-300 rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Mark as Popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newService.active !== false}
                  onChange={(e) => setNewService({ ...newService, active: e.target.checked })}
                  className="w-4 h-4 border-gray-300 rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Active (visible to customers)</span>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="h-11">
              Cancel
            </Button>
            <Button onClick={handleAddService} className="bg-red-600 hover:bg-red-700 h-11">
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
        if (!open && !isDeleting) {
          handleDeleteCancel();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Delete Service</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 px-4">
            <DialogDescription className="text-base">
              Are you sure you want to delete this service? 
            </DialogDescription>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 h-10"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Sure"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}