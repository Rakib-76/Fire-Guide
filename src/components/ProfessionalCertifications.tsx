import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Award, CheckCircle2, Calendar, Loader2, Plus } from "lucide-react";
// import { FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { fetchQualifications, deleteCertification, QualificationCertificationResponse } from "../api/qualificationsService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

export function ProfessionalCertifications() {
  const navigate = useNavigate();
  const [certifications, setCertifications] = useState<QualificationCertificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [certToDelete, setCertToDelete] = useState<QualificationCertificationResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadCertifications = async () => {
      try {
        setIsLoading(true);
        const data = await fetchQualifications();
        setCertifications(data);
      } catch (error: any) {
        console.error('Failed to load certifications:', error);
        toast.error(error.message || 'Failed to load certifications');
      } finally {
        setIsLoading(false);
      }
    };

    loadCertifications();
  }, []);

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };


  // Placeholder handlers for action icons
  const handleView = (cert: QualificationCertificationResponse) => {
    console.log('View certification:', cert);
  };

  const handleEdit = (cert: QualificationCertificationResponse) => {
    navigate(`/customer/dashboard/certification/edit/${cert.id}`);
  };


  const handleDelete = (cert: QualificationCertificationResponse) => {
    setCertToDelete(cert);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!certToDelete) return;

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to delete certification.");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deleteCertification({
        api_token: token,
        id: certToDelete.id
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Certification deleted successfully!");
        setIsDeleteModalOpen(false);
        setCertToDelete(null);
        // Refresh certifications list
        const data = await fetchQualifications();
        setCertifications(data);
      } else {
        toast.error(response.message || response.error || "Failed to delete certification. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while deleting certification. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">My Certifications</h1>
          <p className="text-gray-600 text-sm md:text-base">
            View and manage your professional certifications and qualifications
          </p>
        </div>
        <Button
          className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
          onClick={() => navigate("/customer/dashboard/certification/add")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Now
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              <span className="ml-3 text-gray-600">Loading certifications...</span>
            </div>
          ) : certifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No certifications found</p>
              <p className="text-sm">Your certifications will appear here once they are added</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-red-200 hover:shadow-sm transition-all"
                >
                  {/* <div className="flex items-start justify-between"> */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Award className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1">{cert.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span>Certified: {formatDate(cert.certification_date)}</span>
                            </div>
                            {cert.professional && (
                              <div className="text-gray-500">
                                Professional: {cert.professional.name}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Added: {formatDate(cert.created_at)}
                            {cert.updated_at !== cert.created_at && (
                              <span> • Updated: {formatDate(cert.updated_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 lg:flex-col flex justify-between items-start gap-2 space-y-4">
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                      <div className="flex lg:flex-row gap-1 flex-row sm:items-center">
                        <button
                          onClick={() => handleView(cert)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                          aria-label="View certification"
                          type="button"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(cert)}
                          // className="p-1 text-gray-500 hover:text-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded"
                          className="p-1 text-gray-500 hover:text-orange-500 transition-colors hover:text-blue-600 hover:bg-blue-50 rounded"
                          aria-label="Edit certification"
                          type="button"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cert)}
                          // className="p-1 text-gray-500 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors hover:text-red-600 hover:bg-red-50 rounded"
                          aria-label="Delete certification"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">
              Delete Certification
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this certification? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCertToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Sure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
