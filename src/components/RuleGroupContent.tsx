import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, MoreVertical, Eye, Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
  getPricingRuleGroupsAll,
  getPricingRuleGroupSingle,
  updatePricingRuleGroup,
  storePricingRuleGroup,
  deletePricingRuleGroup,
  PricingRuleGroupItem,
} from "../api/pricingRuleGroupsService";
import { fetchServices } from "../api/servicesService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

export function RuleGroupContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [records, setRecords] = useState<PricingRuleGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverRecordId, setHoverRecordId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsRecordId, setDetailsRecordId] = useState<number | null>(null);
  const [detailsData, setDetailsData] = useState<PricingRuleGroupItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<PricingRuleGroupItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updateRecord, setUpdateRecord] = useState<PricingRuleGroupItem | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateServiceId, setUpdateServiceId] = useState("");
  const [updateRuleName, setUpdateRuleName] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addServiceId, setAddServiceId] = useState("");
  const [addRuleName, setAddRuleName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [servicesList, setServicesList] = useState<{ id: number; service_name: string }[]>([]);
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

  const handleViewDetails = (record: PricingRuleGroupItem) => {
    setHoverRecordId(null);
    setDetailsData(record);
    setDetailsRecordId(record.id);
    setDetailsModalOpen(true);
  };

  const handleAddRuleGroup = () => {
    setHoverRecordId(null);
    setAddServiceId("");
    setAddRuleName("");
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to add a rule group.");
      return;
    }
    const serviceId = parseInt(addServiceId, 10);
    const ruleName = (addRuleName ?? "").trim();
    if (!addServiceId || isNaN(serviceId)) {
      toast.error("Please select a service.");
      return;
    }
    if (!ruleName) {
      toast.error("Please enter a rule name.");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      await storePricingRuleGroup(apiToken, serviceId, ruleName);
      toast.success("Pricing rule group created successfully.");
      setAddModalOpen(false);
      setAddServiceId("");
      setAddRuleName("");
      fetchData();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create pricing rule group.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdate = (record: PricingRuleGroupItem) => {
    setHoverRecordId(null);
    setUpdateRecord(record);
    setUpdateServiceId(String(record.service_id));
    setUpdateRuleName(record.rule_name ?? "");
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
    const serviceId = parseInt(updateServiceId, 10);
    const ruleName = (updateRuleName ?? "").trim();
    if (!updateServiceId || isNaN(serviceId)) {
      toast.error("Please select a service.");
      return;
    }
    if (!ruleName) {
      toast.error("Please enter a rule name.");
      return;
    }
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      await updatePricingRuleGroup(apiToken, updateRecord.id, serviceId, ruleName);
      toast.success("Pricing rule group updated successfully.");
      setUpdateModalOpen(false);
      setUpdateRecord(null);
      fetchData();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update pricing rule group.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = (record: PricingRuleGroupItem) => {
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
    setDeleteLoading(true);
    try {
      await deletePricingRuleGroup(apiToken, deleteRecord.id);
      toast.success("Pricing rule group deleted successfully.");
      setDeleteModalOpen(false);
      setDeleteRecord(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pricing rule group.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiToken = getApiToken();
      if (!apiToken) {
        setError("Please log in to view pricing rule groups.");
        return;
      }

      const response = await getPricingRuleGroupsAll(apiToken);
      if (response.status && Array.isArray(response.data)) {
        setRecords(response.data);
      } else {
        setRecords([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch pricing rule groups");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!updateModalOpen && !addModalOpen) return;
    let cancelled = false;
    fetchServices()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setServicesList(data.map((s) => ({ id: s.id, service_name: s.service_name })));
        }
      })
      .catch(() => {
        if (!cancelled) setServicesList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [updateModalOpen, addModalOpen]);

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
    getPricingRuleGroupSingle(apiToken, detailsRecordId)
      .then((res) => {
        if (!cancelled && res.status && res.data) {
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

  const filteredRecords = records.filter((record) => {
    const searchLower = searchTerm.toLowerCase();
    const ref = String(record.id);
    const service = record.service?.service_name ?? "";
    const ruleName = record.rule_name ?? "";

    const matchesSearch =
      ref.includes(searchLower) ||
      service.toLowerCase().includes(searchLower) ||
      ruleName.toLowerCase().includes(searchLower);

    const matchesFilter =
      filterService === "all" || record.service?.service_name === filterService;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-[#0A1A2F] text-xl font-semibold mb-1">Pricing Rule Groups</h1>
        <p className="text-sm text-gray-500">
          Configure pricing rules by service
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-[#0A1A2F]">Pricing Rule Groups</CardTitle>
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
              <Button size="sm" className="shrink-0" onClick={handleAddRuleGroup}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule Group
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search rule groups..."
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
                        Service
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">
                        Rule Name
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
                          <p className="font-medium text-gray-900">RG-{record.id}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-900">
                            {formatDate(record.updated_at)}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-700">
                            {record.service?.service_name ?? "—"}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-900">
                            {record.rule_name ?? "—"}
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
                      <p className="font-medium text-gray-900">RG-{record.id}</p>
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
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700">
                        {record.service?.service_name ?? "—"}
                      </p>
                      <p className="font-medium text-gray-900">
                        {record.rule_name ?? "—"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 pt-2 border-t">
                      {formatDate(record.updated_at)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading pricing rule groups...</p>
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
              <p className="text-gray-500">No pricing rule groups found</p>
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
            setDetailsLoading(false);
            setDetailsError(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Pricing Rule Group Details</DialogTitle>
          </DialogHeader>
          {detailsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          {detailsError && !detailsData && (
            <p className="text-red-500 py-4">{detailsError}</p>
          )}
          {!detailsLoading && !detailsError && detailsData && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-medium text-gray-900">RG-{detailsData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium text-gray-900">
                    {detailsData.service?.service_name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rule Name</p>
                  <p className="font-medium text-gray-900">
                    {detailsData.rule_name ?? "—"}
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

      {/* Add Rule Group Modal */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) {
            setAddError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Add Pricing Rule Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-service">Service</Label>
              <Select value={addServiceId} onValueChange={setAddServiceId}>
                <SelectTrigger id="add-service">
                  {servicesList.find((s) => String(s.id) === addServiceId)?.service_name ??
                    "Select service"}
                </SelectTrigger>
                <SelectContent>
                  {servicesList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.service_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-rule-name">Rule Name</Label>
              <Input
                id="add-rule-name"
                placeholder="e.g. floor_count, people_count"
                value={addRuleName}
                onChange={(e) => setAddRuleName(e.target.value)}
              />
            </div>
            {addError && (
              <p className="text-sm text-red-500">{addError}</p>
            )}
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
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Modal */}
      <Dialog
        open={updateModalOpen}
        onOpenChange={(open) => {
          setUpdateModalOpen(open);
          if (!open) {
            setUpdateRecord(null);
            setUpdateError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Update Pricing Rule Group</DialogTitle>
          </DialogHeader>
          {updateRecord && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="update-service">Service</Label>
                <Select value={updateServiceId} onValueChange={setUpdateServiceId}>
                  <SelectTrigger id="update-service">
                    {servicesList.find((s) => String(s.id) === updateServiceId)?.service_name ??
                      updateRecord.service?.service_name ??
                      "Select service"}
                  </SelectTrigger>
                  <SelectContent>
                    {servicesList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.service_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-rule-name">Rule Name</Label>
                <Input
                  id="update-rule-name"
                  placeholder="e.g. floor_count"
                  value={updateRuleName}
                  onChange={(e) => setUpdateRuleName(e.target.value)}
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
            <DialogTitle className="text-xl text-[#0A1A2F]">Delete Pricing Rule Group</DialogTitle>
          </DialogHeader>
          {deleteRecord && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete the pricing rule group{" "}
                <span className="font-semibold">{deleteRecord.rule_name ?? "—"}</span>{" "}
                for {deleteRecord.service?.service_name ?? "—"}?
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
