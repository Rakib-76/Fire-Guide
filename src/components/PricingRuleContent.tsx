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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  getPricingRuleGroupsAll,
  PricingRuleGroupItem,
} from "../api/pricingRuleGroupsService";
import {
  getPricingRulesAll,
  getPricingRuleSingle,
  storePricingRule,
  updatePricingRule,
  deletePricingRule,
  PricingRuleItem,
} from "../api/pricingRulesService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

export function PricingRuleContent() {
  const [ruleGroups, setRuleGroups] = useState<PricingRuleGroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [records, setRecords] = useState<PricingRuleItem[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rulesRefreshKey, setRulesRefreshKey] = useState(0);
  const [hoverRecordId, setHoverRecordId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsRecordId, setDetailsRecordId] = useState<number | null>(null);
  const [detailsData, setDetailsData] = useState<PricingRuleItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<PricingRuleItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updateRecord, setUpdateRecord] = useState<PricingRuleItem | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateGroupId, setUpdateGroupId] = useState("");
  const [updateMinValue, setUpdateMinValue] = useState("");
  const [updateMaxValue, setUpdateMaxValue] = useState("");
  const [updateOptionKey, setUpdateOptionKey] = useState("");
  const [updateOptionLabel, setUpdateOptionLabel] = useState("");
  const [updateExtraPrice, setUpdateExtraPrice] = useState("");
  const [updateCustomQuote, setUpdateCustomQuote] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMinValue, setAddMinValue] = useState("");
  const [addMaxValue, setAddMaxValue] = useState("");
  const [addOptionKey, setAddOptionKey] = useState("");
  const [addOptionLabel, setAddOptionLabel] = useState("");
  const [addExtraPrice, setAddExtraPrice] = useState("");
  const [addCustomQuote, setAddCustomQuote] = useState(false);
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

  const handleViewDetails = (record: PricingRuleItem) => {
    setHoverRecordId(null);
    setDetailsData(record);
    setDetailsRecordId(record.id);
    setDetailsModalOpen(true);
  };

  const handleAddPricingRule = () => {
    setHoverRecordId(null);
    if (!selectedGroupId) {
      toast.error("Please select a rule group first.");
      return;
    }
    setAddMinValue("");
    setAddMaxValue("");
    setAddOptionKey("");
    setAddOptionLabel("");
    setAddExtraPrice("");
    setAddCustomQuote(false);
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to add a pricing rule.");
      return;
    }
    if (!selectedGroupId) return;
    const groupId = parseInt(selectedGroupId, 10);
    const minValue = parseInt(addMinValue, 10);
    const maxValue = parseInt(addMaxValue, 10);
    const extraPrice = parseFloat(addExtraPrice.trim());
    if (isNaN(groupId)) {
      toast.error("Please select a rule group first.");
      return;
    }
    if (isNaN(minValue) || minValue < 0) {
      toast.error("Please enter a valid min value.");
      return;
    }
    if (isNaN(maxValue) || maxValue < 0) {
      toast.error("Please enter a valid max value.");
      return;
    }
    if (isNaN(extraPrice) || extraPrice < 0) {
      toast.error("Please enter a valid extra price.");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      await storePricingRule(
        apiToken,
        groupId,
        minValue,
        maxValue,
        addOptionKey.trim() || null,
        addOptionLabel.trim() || null,
        extraPrice,
        addCustomQuote
      );
      toast.success("Pricing rule created successfully.");
      setAddModalOpen(false);
      setRulesRefreshKey((k) => k + 1);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create pricing rule.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdate = (record: PricingRuleItem) => {
    setHoverRecordId(null);
    setUpdateRecord(record);
    setUpdateGroupId(String(record.pricing_rule_group_id));
    setUpdateMinValue(String(record.min_value));
    setUpdateMaxValue(String(record.max_value));
    setUpdateOptionKey(record.option_key ?? "");
    setUpdateOptionLabel(record.option_label ?? "");
    setUpdateExtraPrice(record.extra_price ?? "");
    setUpdateCustomQuote(!!record.is_custom_quote_trigger);
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
    const groupId = parseInt(updateGroupId, 10);
    const minValue = parseInt(updateMinValue, 10);
    const maxValue = parseInt(updateMaxValue, 10);
    const extraPrice = parseFloat(updateExtraPrice.trim());
    if (!updateGroupId || isNaN(groupId)) {
      toast.error("Please select a rule group.");
      return;
    }
    if (isNaN(minValue) || minValue < 0) {
      toast.error("Please enter a valid min value.");
      return;
    }
    if (isNaN(maxValue) || maxValue < 0) {
      toast.error("Please enter a valid max value.");
      return;
    }
    if (isNaN(extraPrice) || extraPrice < 0) {
      toast.error("Please enter a valid extra price.");
      return;
    }
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      await updatePricingRule(
        apiToken,
        updateRecord.id,
        groupId,
        minValue,
        maxValue,
        updateOptionKey.trim() || null,
        updateOptionLabel.trim() || null,
        extraPrice,
        updateCustomQuote
      );
      toast.success("Pricing rule updated successfully.");
      setUpdateModalOpen(false);
      setUpdateRecord(null);
      setRulesRefreshKey((k) => k + 1);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update pricing rule.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = (record: PricingRuleItem) => {
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
      await deletePricingRule(apiToken, deleteRecord.id);
      toast.success("Pricing rule deleted successfully.");
      setDeleteModalOpen(false);
      setDeleteRecord(null);
      setRulesRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pricing rule.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchRuleGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      setError(null);
      const apiToken = getApiToken();
      if (!apiToken) {
        setError("Please log in to view pricing rules.");
        return;
      }

      const response = await getPricingRuleGroupsAll(apiToken);
      if (response.status && Array.isArray(response.data)) {
        setRuleGroups(response.data);
        if (response.data.length > 0 && !selectedGroupId) {
          setSelectedGroupId(String(response.data[0].id));
        }
      } else {
        setRuleGroups([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch rule groups");
      setRuleGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    fetchRuleGroups();
  }, [fetchRuleGroups]);

  useEffect(() => {
    if (!selectedGroupId) {
      setRecords([]);
      return;
    }
    const groupId = parseInt(selectedGroupId, 10);
    if (isNaN(groupId)) return;

    const apiToken = getApiToken();
    if (!apiToken) return;

    let cancelled = false;
    setIsLoadingRules(true);
    setError(null);
    getPricingRulesAll(apiToken, groupId)
      .then((res) => {
        if (!cancelled && res.status && Array.isArray(res.data)) {
          setRecords(res.data);
        } else if (!cancelled) {
          setRecords([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch pricing rules");
          setRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRules(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, rulesRefreshKey]);

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
    getPricingRuleSingle(apiToken, detailsRecordId)
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

  const handleRetry = () => {
    setError(null);
    if (selectedGroupId) {
      setRulesRefreshKey((k) => k + 1);
    } else {
      fetchRuleGroups();
    }
  };

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

  const formatPrice = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `£${num.toFixed(2)}`;
  };

  const selectedGroup = ruleGroups.find((g) => String(g.id) === selectedGroupId);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-[#0A1A2F] text-xl font-semibold mb-1">Pricing Rule</h1>
        <p className="text-sm text-gray-500">
          Configure pricing rules for rule groups
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-[#0A1A2F]">Pricing Rules</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
                disabled={isLoadingGroups}
              >
                <SelectTrigger className="w-full md:w-64">
                  {selectedGroup
                    ? selectedGroup.service?.service_name ?? "—"
                    : "Select rule group"}
                </SelectTrigger>
                <SelectContent>
                  {ruleGroups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.service?.service_name ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="shrink-0" onClick={handleAddPricingRule}>
                <Plus className="w-4 h-4 mr-2" />
                Add Pricing Rule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingGroups && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading rule groups...</p>
            </div>
          )}

          {!selectedGroupId && !isLoadingGroups && !error && (
            <div className="text-center py-12">
              <p className="text-gray-500">No rule groups available. Create one in Rule group first.</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-2">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-sm text-red-600 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {selectedGroupId && !error && !isLoadingGroups && (
            <>
              {isLoadingRules && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading pricing rules...</p>
                </div>
              )}

              {!isLoadingRules && records.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                          Min Value
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Max Value
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Extra Price
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Option Key
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Option Label
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          Custom Quote
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
                            <p className="font-medium text-gray-900">PR-{record.id}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-900">
                              {formatDate(record.updated_at)}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-900">{record.min_value}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-900">{record.max_value}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-gray-900">
                              {formatPrice(record.extra_price)}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700">
                              {record.option_key ?? "—"}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700">
                              {record.option_label ?? "—"}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700">
                              {record.is_custom_quote_trigger ? "Yes" : "No"}
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
              )}

              {!isLoadingRules && records.length === 0 && selectedGroupId && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No pricing rules found for this rule group.</p>
                </div>
              )}
            </>
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
            <DialogTitle className="text-xl text-[#0A1A2F]">Pricing Rule Details</DialogTitle>
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
                  <p className="font-medium text-gray-900">PR-{detailsData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rule Group</p>
                  <p className="font-medium text-gray-900">
                    {detailsData.group?.rule_name ?? "—"} (ID: {detailsData.pricing_rule_group_id})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Min Value</p>
                  <p className="font-medium text-gray-900">{detailsData.min_value}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Max Value</p>
                  <p className="font-medium text-gray-900">{detailsData.max_value}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Extra Price</p>
                  <p className="font-medium text-gray-900">
                    {formatPrice(detailsData.extra_price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Option Key</p>
                  <p className="font-medium text-gray-900">
                    {detailsData.option_key ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Option Label</p>
                  <p className="font-medium text-gray-900">
                    {detailsData.option_label ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Custom Quote Trigger</p>
                  <p className="font-medium text-gray-900">
                    {detailsData.is_custom_quote_trigger ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{formatDate(detailsData.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="font-medium text-gray-900">{formatDate(detailsData.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Pricing Rule Modal */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) setAddError(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Add Pricing Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedGroup && (
              <div className="space-y-2">
                <Label>Rule Group</Label>
                <p className="text-sm font-medium text-gray-900">
                  {selectedGroup.rule_name ?? selectedGroup.service?.service_name ?? "—"}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-min">Min Value</Label>
                <Input
                  id="add-min"
                  type="number"
                  min="0"
                  value={addMinValue}
                  onChange={(e) => setAddMinValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-max">Max Value</Label>
                <Input
                  id="add-max"
                  type="number"
                  min="0"
                  value={addMaxValue}
                  onChange={(e) => setAddMaxValue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-extra-price">Extra Price (£)</Label>
              <Input
                id="add-extra-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addExtraPrice}
                onChange={(e) => setAddExtraPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-option-key">Option Key (optional)</Label>
              <Input
                id="add-option-key"
                placeholder="e.g. key"
                value={addOptionKey}
                onChange={(e) => setAddOptionKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-option-label">Option Label (optional)</Label>
              <Input
                id="add-option-label"
                placeholder="e.g. label"
                value={addOptionLabel}
                onChange={(e) => setAddOptionLabel(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="add-custom-quote"
                checked={addCustomQuote}
                onChange={(e) => setAddCustomQuote(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="add-custom-quote">Custom Quote Trigger</Label>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Update Pricing Rule</DialogTitle>
          </DialogHeader>
          {updateRecord && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="update-group">Rule Group</Label>
                <Select value={updateGroupId} onValueChange={setUpdateGroupId}>
                  <SelectTrigger id="update-group">
                    {ruleGroups.find((g) => String(g.id) === updateGroupId)?.rule_name ??
                      "Select rule group"}
                  </SelectTrigger>
                  <SelectContent>
                    {ruleGroups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.rule_name ?? "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="update-min">Min Value</Label>
                  <Input
                    id="update-min"
                    type="number"
                    min="0"
                    value={updateMinValue}
                    onChange={(e) => setUpdateMinValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-max">Max Value</Label>
                  <Input
                    id="update-max"
                    type="number"
                    min="0"
                    value={updateMaxValue}
                    onChange={(e) => setUpdateMaxValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-extra-price">Extra Price (£)</Label>
                <Input
                  id="update-extra-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={updateExtraPrice}
                  onChange={(e) => setUpdateExtraPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-option-key">Option Key (optional)</Label>
                <Input
                  id="update-option-key"
                  placeholder="e.g. key"
                  value={updateOptionKey}
                  onChange={(e) => setUpdateOptionKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-option-label">Option Label (optional)</Label>
                <Input
                  id="update-option-label"
                  placeholder="e.g. label"
                  value={updateOptionLabel}
                  onChange={(e) => setUpdateOptionLabel(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="update-custom-quote"
                  checked={updateCustomQuote}
                  onChange={(e) => setUpdateCustomQuote(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="update-custom-quote">Custom Quote Trigger</Label>
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
            <DialogTitle className="text-xl text-[#0A1A2F]">Delete Pricing Rule</DialogTitle>
          </DialogHeader>
          {deleteRecord && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete the pricing rule PR-{deleteRecord.id} (Min: {deleteRecord.min_value}, Max: {deleteRecord.max_value}, Extra: {formatPrice(deleteRecord.extra_price)})?
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
