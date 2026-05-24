import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, MoreVertical, Eye, Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  getProfessionalConsultationRatesAll,
  updateProfessionalConsultationRate,
  deleteProfessionalConsultationRate,
  storeProfessionalConsultationRate,
  ProfessionalConsultationRateItem,
} from "../api/professionalConsultationRatesService";
import { toast } from "sonner";
import { getApiToken, getProfessionalId } from "../lib/auth";

interface ConsultationRateContentProps {
  /** When true, shows all records (Admin). When false, filters by current professional (Professional). */
  isAdmin?: boolean;
}

export function ConsultationRateContent({ isAdmin = false }: ConsultationRateContentProps) {
  const [records, setRecords] = useState<ProfessionalConsultationRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverRecordId, setHoverRecordId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<ProfessionalConsultationRateItem | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateRecord, setUpdateRecord] = useState<ProfessionalConsultationRateItem | null>(null);
  const [updateRemote, setUpdateRemote] = useState<string>("");
  const [updateOnsite, setUpdateOnsite] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<ProfessionalConsultationRateItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addRemote, setAddRemote] = useState<string>("");
  const [addOnsite, setAddOnsite] = useState<string>("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HOVER_CLOSE_DELAY_MS = 400;

  const scheduleClose = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setHoverRecordId(null), HOVER_CLOSE_DELAY_MS);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleViewDetails = (record: ProfessionalConsultationRateItem) => {
    setHoverRecordId(null);
    setDetailsData(record);
    setDetailsModalOpen(true);
  };

  const handleUpdate = (record: ProfessionalConsultationRateItem) => {
    setHoverRecordId(null);
    setUpdateRecord(record);
    setUpdateRemote(record.remote_hourly_rate ?? "");
    setUpdateOnsite(record.onsite_hourly_rate ?? "");
    setUpdateError(null);
    setUpdateModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to update.");
      return;
    }
    if (!updateRecord) return;
    const remote = parseFloat(updateRemote.trim());
    const onsite = parseFloat(updateOnsite.trim());
    if (isNaN(remote) || remote < 0) {
      toast.error("Please enter a valid remote hourly rate.");
      return;
    }
    if (isNaN(onsite) || onsite < 0) {
      toast.error("Please enter a valid onsite hourly rate.");
      return;
    }
    const professionalId = updateRecord.professional_id;
    if (isAdmin && professionalId == null) {
      toast.error("This record has no professional and cannot be updated.");
      return;
    }
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      await updateProfessionalConsultationRate(
        apiToken,
        remote,
        onsite,
        isAdmin ? professionalId : undefined
      );
      toast.success("Consultation rates updated successfully.");
      setUpdateModalOpen(false);
      setUpdateRecord(null);
      fetchData();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = (record: ProfessionalConsultationRateItem) => {
    setHoverRecordId(null);
    setDeleteRecord(record);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to delete.");
      return;
    }
    if (!deleteRecord) return;
    const professionalId = deleteRecord.professional_id;
    if (isAdmin && professionalId == null) {
      toast.error("This record has no professional and cannot be deleted.");
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteProfessionalConsultationRate(
        apiToken,
        deleteRecord.id,
        isAdmin ? professionalId : undefined
      );
      toast.success("Consultation rates deleted successfully.");
      setDeleteModalOpen(false);
      setDeleteRecord(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete consultation rate.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddConsultation = () => {
    setAddRemote("");
    setAddOnsite("");
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to add consultation rate.");
      return;
    }
    const remote = parseFloat(addRemote.trim());
    const onsite = parseFloat(addOnsite.trim());
    if (isNaN(remote) || remote < 0) {
      toast.error("Please enter a valid remote hourly rate.");
      return;
    }
    if (isNaN(onsite) || onsite < 0) {
      toast.error("Please enter a valid onsite hourly rate.");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      await storeProfessionalConsultationRate(apiToken, remote, onsite);
      toast.success("Consultation rates set successfully.");
      setAddModalOpen(false);
      setAddRemote("");
      setAddOnsite("");
      fetchData();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add consultation rate.");
    } finally {
      setAddLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiToken = getApiToken();
      if (!apiToken) {
        setError("Please log in to view consultation rate records.");
        return;
      }

      const response = await getProfessionalConsultationRatesAll(apiToken);
      if (response.status && response.data) {
        const data = response.data;
        const list = Array.isArray(data) ? data : [data];

        if (!isAdmin) {
          const professionalId = getProfessionalId();
          if (professionalId != null) {
            const numericId = Number(professionalId);
            const filtered = list.filter(
              (r) => Number(r.professional_id) === numericId
            );
            setRecords(filtered.length > 0 ? filtered : list);
          } else {
            setRecords(list);
          }
        } else {
          setRecords(list);
        }
      } else {
        setRecords([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch consultation rate records");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price || "0");
    return isNaN(num) ? "—" : `£${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-[#0A1A2F] text-xl font-semibold mb-1">Consultation Rate</h1>
        <p className="text-sm text-gray-500">
          Professional consultation hourly rates (remote and onsite)
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-[#0A1A2F]">Consultation Rates</CardTitle>
            <Button size="sm" className="shrink-0 w-fit" onClick={handleAddConsultation}>
              <Plus className="w-4 h-4 mr-2" />
              Add Consultation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading consultation rate records...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-2">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="text-sm text-red-600 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && records.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">
                        Reference
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">
                        Remote Hourly Rate
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">
                        Onsite Hourly Rate
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">
                        Updated
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-gray-700 w-12">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <p className="font-medium text-gray-900">CR-{record.id}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(record.remote_hourly_rate)}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(record.onsite_hourly_rate)}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-900">
                            {formatDate(record.updated_at)}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <div
                            className="relative inline-block"
                            onMouseEnter={() => {
                              cancelClose();
                              setHoverRecordId(record.id);
                            }}
                            onMouseLeave={scheduleClose}
                          >
                            <DropdownMenu
                              open={hoverRecordId === record.id}
                              onOpenChange={(open) => !open && setHoverRecordId(null)}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                hideBackdrop
                                className="min-w-[10rem]"
                                onMouseEnter={cancelClose}
                                onMouseLeave={scheduleClose}
                              >
                                <DropdownMenuItem onClick={() => handleViewDetails(record)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdate(record)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Update
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete(record)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900">CR-{record.id}</p>
                      <div
                        className="relative"
                        onMouseEnter={() => {
                          cancelClose();
                          setHoverRecordId(record.id);
                        }}
                        onMouseLeave={scheduleClose}
                      >
                        <DropdownMenu
                          open={hoverRecordId === record.id}
                          onOpenChange={(open) => !open && setHoverRecordId(null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            hideBackdrop
                            className="min-w-[10rem]"
                            onMouseEnter={cancelClose}
                            onMouseLeave={scheduleClose}
                          >
                            <DropdownMenuItem onClick={() => handleViewDetails(record)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdate(record)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(record)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Remote Hourly</p>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(record.remote_hourly_rate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Onsite Hourly</p>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(record.onsite_hourly_rate)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 pt-2 border-t">
                      Updated {formatDate(record.updated_at)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isLoading && !error && records.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No consultation rate records found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onOpenChange={(open) => {
          setDetailsModalOpen(open);
          if (!open) setDetailsData(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Consultation Rate Details</DialogTitle>
          </DialogHeader>
          {detailsData && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-medium text-gray-900">CR-{detailsData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remote Hourly Rate</p>
                  <p className="font-semibold text-gray-900">
                    {formatPrice(detailsData.remote_hourly_rate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Onsite Hourly Rate</p>
                  <p className="font-semibold text-gray-900">
                    {formatPrice(detailsData.onsite_hourly_rate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-gray-900">{formatDate(detailsData.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="text-gray-900">{formatDate(detailsData.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Modal */}
      <Dialog
        open={updateModalOpen}
        onOpenChange={(open) => {
          setUpdateModalOpen(open);
          if (!open) setUpdateRecord(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Update Consultation Rate</DialogTitle>
          </DialogHeader>
          {updateRecord && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="update-remote">Remote Hourly Rate (£)</Label>
                <Input
                  id="update-remote"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={updateRemote}
                  onChange={(e) => setUpdateRemote(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-onsite">Onsite Hourly Rate (£)</Label>
                <Input
                  id="update-onsite"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={updateOnsite}
                  onChange={(e) => setUpdateOnsite(e.target.value)}
                />
              </div>
              {updateError && (
                <p className="text-sm text-red-500">{updateError}</p>
              )}
            </div>
          )}
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => setUpdateModalOpen(false)}
              disabled={updateLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateSubmit} disabled={updateLoading}>
              {updateLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setDeleteRecord(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Delete Consultation Rate</DialogTitle>
          </DialogHeader>
          {deleteRecord && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete this consultation rate? (Remote: {formatPrice(deleteRecord.remote_hourly_rate)}, Onsite: {formatPrice(deleteRecord.onsite_hourly_rate)})
              </p>
            </div>
          )}
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Consultation Modal */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) setAddError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Add Consultation Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-remote">Remote Hourly Rate (£)</Label>
              <Input
                id="add-remote"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addRemote}
                onChange={(e) => setAddRemote(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-onsite">Onsite Hourly Rate (£)</Label>
              <Input
                id="add-onsite"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addOnsite}
                onChange={(e) => setAddOnsite(e.target.value)}
              />
            </div>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
          </div>
          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => setAddModalOpen(false)}
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={addLoading}>
              {addLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
