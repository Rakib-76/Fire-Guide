import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { fetchInsuranceCoverages, deleteInsuranceCoverage, InsuranceItem } from "../api/insuranceService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

export function InsuranceContent() {
  const navigate = useNavigate();
  const [insuranceCoverages, setInsuranceCoverages] = useState<InsuranceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [coverageToDelete, setCoverageToDelete] = useState<number | null>(null);

  useEffect(() => {
    const loadInsuranceCoverages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchInsuranceCoverages();
        setInsuranceCoverages(data);
      } catch (err: any) {
        console.error("Error loading insurance coverages:", err);
        setError(err.message || "Failed to load insurance coverage data");
        toast.error(err.message || "Failed to load insurance coverage data");
      } finally {
        setIsLoading(false);
      }
    };

    loadInsuranceCoverages();
  }, []);

  const handleEditCoverage = (id: number) => {
    navigate(`/customer/dashboard/insurance/edit/${id}`);
  };

  const handleDeleteCoverage = (id: number) => {
    setCoverageToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteCoverage = async () => {
    if (!coverageToDelete) {
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to delete insurance coverage.");
      setDeleteModalOpen(false);
      setCoverageToDelete(null);
      return;
    }

    try {
      const response = await deleteInsuranceCoverage({
        api_token: token,
        id: coverageToDelete
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Insurance coverage deleted successfully!");
        // Remove from local state
        setInsuranceCoverages(insuranceCoverages.filter(coverage => coverage.id !== coverageToDelete));
        // Reload the list to ensure consistency
        const data = await fetchInsuranceCoverages();
        setInsuranceCoverages(data);
      } else {
        toast.error(response.message || response.error || "Failed to delete insurance coverage. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while deleting insurance coverage. Please try again.";
      toast.error(errorMessage);
    } finally {
      setDeleteModalOpen(false);
      setCoverageToDelete(null);
    }
  };

  const cancelDeleteCoverage = () => {
    setDeleteModalOpen(false);
    setCoverageToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading insurance coverages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-red-200 bg-red-50 max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error Loading Insurance Coverages</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="text-[#0A1A2F]">
            Insurance Coverage
          </h1>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => navigate("/customer/dashboard/insurance/add")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Insurance
          </Button>
        </div>
        <p className="text-gray-600">
          View and manage your insurance coverage information
        </p>
      </div>

      {/* Insurance Coverages List */}
      <div className="space-y-6">
        {insuranceCoverages.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Insurance Coverages</h3>
              <p className="text-gray-600">No insurance coverages have been added yet.</p>
            </CardContent>
          </Card>
        ) : (
          insuranceCoverages.map((coverage) => {
            const formattedExpireDate = new Date(coverage.expire_date).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            const createdDate = new Date(coverage.created_at).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const isExpired = new Date(coverage.expire_date) < new Date();
            const daysUntilExpiry = Math.ceil((new Date(coverage.expire_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            return (
              <Card key={coverage.id} className="border-0 shadow-md hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        {coverage.title}
                      </CardTitle>
                      <CardDescription>
                        Created: {createdDate}
                        {coverage.creator && ` • By ${coverage.creator.full_name}`}
                      </CardDescription>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-gray-500">Price</p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCoverage(coverage.id)}
                            className="h-7 w-7 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit insurance coverage"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCoverage(coverage.id)}
                            className="h-7 w-7 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            title="Delete insurance coverage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <p className="font-semibold text-gray-700">{coverage.price}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Expiry Date</p>
                        <p className={`font-semibold ${isExpired ? 'text-red-600' : daysUntilExpiry <= 30 ? 'text-orange-600' : 'text-gray-700'}`}>
                          {formattedExpireDate}
                        </p>
                        {!isExpired && (
                          <p className="text-xs text-gray-500 mt-1">
                            {daysUntilExpiry > 0 
                              ? `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} remaining`
                              : 'Expires today'}
                          </p>
                        )}
                        {isExpired && (
                          <p className="text-xs text-red-500 mt-1">Expired</p>
                        )}
                      </div>
                    </div>
                    {coverage.updated_at && coverage.updated_at !== coverage.created_at && (
                      <p className="text-xs text-gray-500">
                        Last updated: {new Date(coverage.updated_at).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                        {coverage.updater && ` by ${coverage.updater.full_name}`}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Insurance Coverage</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this insurance coverage? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelDeleteCoverage}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDeleteCoverage}
            >
              Sure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
