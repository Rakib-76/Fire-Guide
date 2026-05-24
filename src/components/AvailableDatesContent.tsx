import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarCheck, 
  Loader2,
  AlertCircle,
  Clock,
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
import { fetchAvailableDates, deleteAvailableDate, AvailableDateItem } from "../api/availableDatesService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

export function AvailableDatesContent() {
  const navigate = useNavigate();
  const [availableDates, setAvailableDates] = useState<AvailableDateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<number | null>(null);

  useEffect(() => {
    const loadAvailableDates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAvailableDates();
        setAvailableDates(data);
      } catch (err: any) {
        console.error("Error loading available dates:", err);
        setError(err.message || "Failed to load available dates data");
        toast.error(err.message || "Failed to load available dates data");
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableDates();
  }, []);

  const handleEditDate = (id: number) => {
    navigate(`/customer/dashboard/available_date/edit/${id}`);
  };

  const handleDeleteDate = (id: number) => {
    setDateToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteDate = async () => {
    if (!dateToDelete) {
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to delete available date.");
      setDeleteModalOpen(false);
      setDateToDelete(null);
      return;
    }

    try {
      const response = await deleteAvailableDate({
        api_token: token,
        id: dateToDelete
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        // Remove from local state
        setAvailableDates(availableDates.filter(date => date.id !== dateToDelete));
        toast.success(response.message || "Available date deleted successfully");
      } else {
        toast.error(response.message || response.error || "Failed to delete available date. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while deleting available date. Please try again.";
      toast.error(errorMessage);
    } finally {
      setDeleteModalOpen(false);
      setDateToDelete(null);
    }
  };

  const cancelDeleteDate = () => {
    setDeleteModalOpen(false);
    setDateToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading available dates...</p>
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
                <h3 className="font-semibold text-red-900 mb-1">Error Loading Available Dates</h3>
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
            Available Dates
          </h1>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => navigate("/customer/dashboard/available_date/add")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Now
          </Button>
        </div>
        <p className="text-gray-600">
          View and manage your available dates and time slots
        </p>
      </div>

      {/* Available Dates List */}
      <div className="space-y-6">
        {availableDates.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <CalendarCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Available Dates</h3>
              <p className="text-gray-600">No available dates have been set yet.</p>
            </CardContent>
          </Card>
        ) : (
          availableDates.map((dateItem) => {
            const formattedDate = new Date(dateItem.date).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            });
            const createdDate = new Date(dateItem.created_at).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <Card key={dateItem.id} className="border-0 shadow-md hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-blue-600" />
                        {formattedDate}
                      </CardTitle>
                      <CardDescription>
                        Created: {createdDate}
                        {dateItem.creator && ` • By ${dateItem.creator.full_name}`}
                      </CardDescription>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-gray-500">Time Slot</p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDate(dateItem.id)}
                            className="h-7 w-7 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit available date"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDate(dateItem.id)}
                            className="h-7 w-7 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            title="Delete available date"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <p className="font-semibold text-gray-700">{dateItem.slot}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {dateItem.updated_at && dateItem.updated_at !== dateItem.created_at && (
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(dateItem.updated_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {dateItem.updater && ` by ${dateItem.updater.full_name}`}
                    </p>
                  )}
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
            <DialogTitle>Delete Available Date</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this available date? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelDeleteDate}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDeleteDate}
            >
              Sure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
