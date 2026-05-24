import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, MoreVertical, Eye, Pencil, Trash2, Plus } from "lucide-react";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  getProfessionalServiceBasePricesAll,
  getProfessionalServiceBasePriceSingle,
  updateProfessionalServiceBasePrice,
  storeProfessionalServiceBasePrice,
  deleteProfessionalServiceBasePrice,
  ProfessionalServiceBasePriceItem,
} from "../api/professionalServiceBasePricesService";
import { fetchServices } from "../api/servicesService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { Label } from "./ui/label";
import { toast } from "sonner";

interface ServiceBasePriceContentProps {
  /** When true, shows all records (Admin). When false, filters by current professional (Professional). */
  isAdmin?: boolean;
}

export function ServiceBasePriceContent({ isAdmin = false }: ServiceBasePriceContentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [records, setRecords] = useState<ProfessionalServiceBasePriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverRecordId, setHoverRecordId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsRecordId, setDetailsRecordId] = useState<number | null>(null);
  const [detailsData, setDetailsData] = useState<ProfessionalServiceBasePriceItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateRecord, setUpdateRecord] = useState<ProfessionalServiceBasePriceItem | null>(null);
  const [updateBasePrice, setUpdateBasePrice] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addServiceId, setAddServiceId] = useState<string>("");
  const [addBasePrice, setAddBasePrice] = useState<string>("");
  const [addServicesList, setAddServicesList] = useState<{ id: number; service_name: string }[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<ProfessionalServiceBasePriceItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiToken = getApiToken();
      if (!apiToken) {
        setError("Please log in to view base price records.");
        return;
      }

      const response = await getProfessionalServiceBasePricesAll(apiToken);
      if (response.status && Array.isArray(response.data)) {
        let data = response.data;

        if (!isAdmin) {
          const professionalId = getProfessionalId();
          if (professionalId != null) {
            const numericId = Number(professionalId);
            const filtered = data.filter(
              (r) =>
                Number(r.professional_id) === numericId ||
                Number(r.professional?.id) === numericId
            );
            setRecords(filtered.length > 0 ? filtered : data);
          } else {
            setRecords(data);
          }
        } else {
          setRecords(data);
        }
      } else {
        setRecords([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch base price records");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!detailsModalOpen || detailsRecordId == null) return;
    const apiToken = getApiToken();
    if (!apiToken) {
      setDetailsError("Please log in to view details.");
      setDetailsLoading(false);
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError(null);
    getProfessionalServiceBasePriceSingle(apiToken, detailsRecordId)
      .then((res) => {
        if (!cancelled && res.status && res.data) {
          // Only update if API returned the record we requested (prevents wrong-item display)
          if (res.data.id === detailsRecordId) {
            setDetailsData(res.data);
          }
          setDetailsError(null);
        } else if (!cancelled) {
          setDetailsError("Failed to load details.");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // Fallback: use record from list if API fails; detailsData already set from clicked record
          const fallback = records.find((r) => r.id === detailsRecordId);
          if (fallback) {
            setDetailsData(fallback);
            setDetailsError(null);
          } else {
            setDetailsError(err instanceof Error ? err.message : "Failed to load details.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailsModalOpen, detailsRecordId, records]);

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

  const serviceNames = Array.from(
    new Set(
      records
        .map((r) => r.service?.service_name)
        .filter((n): n is string => !!n)
    )
  ).sort();

  const handleViewDetails = (record: ProfessionalServiceBasePriceItem) => {
    setHoverRecordId(null);
    // Set the clicked record immediately so the modal shows the correct item
    setDetailsData(record);
    setDetailsRecordId(record.id);
    setDetailsModalOpen(true);
  };

  const handleUpdate = (record: ProfessionalServiceBasePriceItem) => {
    setHoverRecordId(null);
    const serviceId = record.service_id ?? record.service?.id;
    if (serviceId == null) {
      toast.error("This record has no service and cannot be updated.");
      return;
    }
    setUpdateRecord(record);
    setUpdateBasePrice(record.base_price ?? "");
    setUpdateError(null);
    setUpdateModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to update.");
      return;
    }
    if (!updateRecord) {
      toast.error("Record not found.");
      return;
    }
    const serviceId = updateRecord.service_id ?? updateRecord.service?.id;
    if (serviceId == null) {
      toast.error("This record has no service and cannot be updated.");
      return;
    }
    const basePrice = updateBasePrice.trim();
    if (!basePrice || isNaN(parseFloat(basePrice))) {
      toast.error("Please enter a valid base price.");
      return;
    }
    // professional_id is required for admin; include when available
    const professionalId = updateRecord.professional_id ?? updateRecord.professional?.id;
    if (isAdmin && professionalId == null) {
      toast.error("This record has no professional and cannot be updated.");
      return;
    }
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      await updateProfessionalServiceBasePrice(
        apiToken,
        updateRecord.id,
        serviceId,
        basePrice,
        isAdmin ? professionalId : undefined
      );
      toast.success("Base price updated successfully.");
      setUpdateModalOpen(false);
      setUpdateRecord(null);
      fetchData();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = (record: ProfessionalServiceBasePriceItem) => {
    setHoverRecordId(null);
    const serviceId = record.service_id ?? record.service?.id;
    if (serviceId == null) {
      toast.error("This record has no service and cannot be deleted.");
      return;
    }
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
    const serviceId = deleteRecord.service_id ?? deleteRecord.service?.id;
    if (serviceId == null) {
      toast.error("This record has no service and cannot be deleted.");
      return;
    }
    const professionalId = deleteRecord.professional_id ?? deleteRecord.professional?.id;
    if (isAdmin && professionalId == null) {
      toast.error("This record has no professional and cannot be deleted.");
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteProfessionalServiceBasePrice(
        apiToken,
        serviceId,
        isAdmin ? professionalId : undefined
      );
      toast.success("Base price deleted successfully.");
      setDeleteModalOpen(false);
      setDeleteRecord(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete base price.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddBasePrice = () => {
    setAddServiceId("");
    setAddBasePrice("");
    setAddError(null);
    setAddModalOpen(true);
  };

  useEffect(() => {
    if (!addModalOpen) return;
    let cancelled = false;
    fetchServices()
      .then((services) => {
        if (!cancelled) {
          setAddServicesList(services.map((s) => ({ id: s.id, service_name: s.service_name })));
        }
      })
      .catch(() => {
        if (!cancelled) setAddServicesList([]);
      });
    return () => { cancelled = true; };
  }, [addModalOpen]);

  const handleAddSubmit = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to add base price.");
      return;
    }
    const serviceId = parseInt(addServiceId, 10);
    const basePrice = addBasePrice.trim();
    if (!addServiceId || isNaN(serviceId)) {
      toast.error("Please select a service.");
      return;
    }
    if (!basePrice || isNaN(parseFloat(basePrice))) {
      toast.error("Please enter a valid base price.");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      await storeProfessionalServiceBasePrice(apiToken, serviceId, basePrice);
      toast.success("Base price added successfully.");
      setAddModalOpen(false);
      setAddServiceId("");
      setAddBasePrice("");
      fetchData();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add base price.");
    } finally {
      setAddLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    const searchLower = searchTerm.toLowerCase();
    const ref = String(record.id);
    const professional = record.professional?.name ?? "";
    const service = record.service?.service_name ?? "";
    const basePrice = record.base_price ?? "";

    const matchesSearch =
      ref.includes(searchLower) ||
      professional.toLowerCase().includes(searchLower) ||
      service.toLowerCase().includes(searchLower) ||
      basePrice.includes(searchLower);

    const matchesFilter =
      filterService === "all" || record.service?.service_name === filterService;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-[#0A1A2F] text-xl font-semibold mb-1">Base Price</h1>
        <p className="text-sm text-gray-500">
          Professional service base prices and configurations
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-[#0A1A2F]">Service Base Price</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all</SelectItem>
                  {serviceNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="shrink-0" onClick={handleAddBasePrice}>
                <Plus className="w-4 h-4 mr-2" />
                Add Base Price
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search base prices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {!isLoading && !error && filteredRecords.length > 0 && (
            <>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Reference
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Date
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Professional
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Service
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Base Price
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-700 w-12">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">BS-{record.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">
                        {formatDate(record.updated_at)}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">
                        {record.professional?.name ?? "—"}
                      </p>
                      {record.professional?.business_name && (
                        <p className="text-xs text-gray-500">
                          {record.professional.business_name}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700">
                        {record.service?.service_name ?? "—"}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">
                        £{parseFloat(record.base_price || "0").toFixed(2)}
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
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-100"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-gray-900">BS-{record.id}</p>
                  <div className="flex items-center gap-2">
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
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    {record.professional?.name ?? "—"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {record.service?.service_name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(record.updated_at)}
                  </p>
                </div>
                <p className="font-semibold text-gray-900 pt-2 border-t">
                  £{parseFloat(record.base_price || "0").toFixed(2)}
                </p>
              </div>
            ))}
          </div>
            </>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Loading base price records...</p>
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

          {!isLoading && !error && filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No base price records found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onOpenChange={(open) => {
          setDetailsModalOpen(open);
          if (!open) {
            setDetailsRecordId(null);
            setDetailsData(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Base Price Details</DialogTitle>
          </DialogHeader>
          {detailsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          {detailsError && (
            <p className="text-red-500 py-4">{detailsError}</p>
          )}
          {!detailsLoading && !detailsError && detailsData && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-medium text-gray-900">BS-{detailsData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Base Price</p>
                  <p className="font-semibold text-gray-900">
                    £{parseFloat(detailsData.base_price || "0").toFixed(2)}
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

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Professional</h4>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">
                    {detailsData.professional?.name ?? "—"}
                  </p>
                  {detailsData.professional?.business_name && (
                    <p className="text-sm text-gray-600">
                      {detailsData.professional.business_name}
                    </p>
                  )}
                  {detailsData.professional?.email && (
                    <p className="text-sm text-gray-600">{detailsData.professional.email}</p>
                  )}
                  {detailsData.professional?.number && (
                    <p className="text-sm text-gray-600">{detailsData.professional.number}</p>
                  )}
                  {detailsData.professional?.business_location && (
                    <p className="text-sm text-gray-600">{detailsData.professional.business_location}</p>
                  )}
                  {detailsData.professional?.status && (
                    <Badge
                      variant="secondary"
                      className={
                        detailsData.professional.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : detailsData.professional.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {detailsData.professional.status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Service</h4>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">
                    {detailsData.service?.service_name ?? "—"}
                  </p>
                  {detailsData.service?.type && (
                    <p className="text-sm text-gray-600">Type: {detailsData.service.type}</p>
                  )}
                  {detailsData.service?.status && (
                    <p className="text-sm text-gray-600">Status: {detailsData.service.status}</p>
                  )}
                  {detailsData.service?.price && (
                    <p className="text-sm text-gray-600">Service price: £{parseFloat(detailsData.service.price).toFixed(2)}</p>
                  )}
                  {detailsData.service?.description && (
                    <p className="text-sm text-gray-600 mt-2">{detailsData.service.description}</p>
                  )}
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
            <DialogTitle className="text-xl text-[#0A1A2F]">Update Base Price</DialogTitle>
          </DialogHeader>
          {updateRecord && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <p className="text-sm font-medium text-gray-900">
                  {updateRecord.service?.service_name ?? `Service ID ${updateRecord.service_id}`}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-base-price">Base Price (£)</Label>
                <Input
                  id="update-base-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={updateBasePrice}
                  onChange={(e) => setUpdateBasePrice(e.target.value)}
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

      {/* Add Base Price Modal */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) setAddError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Add Base Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-service">Service</Label>
              <Select value={addServiceId} onValueChange={setAddServiceId}>
                <SelectTrigger id="add-service">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {addServicesList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.service_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-base-price">Base Price (£)</Label>
              <Input
                id="add-base-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addBasePrice}
                onChange={(e) => setAddBasePrice(e.target.value)}
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
            <DialogTitle className="text-xl text-[#0A1A2F]">Delete Base Price</DialogTitle>
          </DialogHeader>
          {deleteRecord && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete the base price for{" "}
                <span className="font-semibold">{deleteRecord.service?.service_name ?? `Service ID ${deleteRecord.service_id}`}</span>{" "}
                (£{parseFloat(deleteRecord.base_price || "0").toFixed(2)})?
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
    </div>
  );
}
