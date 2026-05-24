import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, MoreVertical, Eye, Pencil, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getProfessionalFraBasePricesAll,
  updateProfessionalFraBasePrice,
  deleteProfessionalFraBasePrice,
  storeProfessionalFraBasePrice,
  ProfessionalFraBasePriceItem,
} from "../api/professionalFraBasePricesService";
import { getFraAllPrices, FraAllPricesProfessionalItem, getAlarmAllPrices, AlarmAllPricesProfessionalItem, getExtinguisherAllPrices, ExtinguisherAllPricesProfessionalItem, getLightTestingAllPrices, LightTestingAllPricesProfessionalItem, getMarshalAllPrices, MarshalAllPricesProfessionalItem, getConsultationAllPrices, ConsultationAllPricesProfessionalItem, saveAdminConsultationBasePrice, getAdminConsultationSinglePrices, getAdminConsultationBasePrice, saveAdminConsultationModePrice, saveAdminConsultationHourPrice, getAdminMarshalSinglePrices, getAdminMarshalBasePrice, saveAdminMarshalBasePrice, saveAdminMarshalPeoplePrice, saveAdminMarshalPlacePrice, saveAdminMarshalTrainingOnPrice, saveAdminMarshalExperiencePrice, getAdminEmergencyLightSinglePrices, getAdminEmergencyLightBasePrice, saveAdminEmergencyLightBasePrice, saveAdminEmergencyLightPrice, saveAdminEmergencyLightFloorPrice, saveAdminEmergencyLightTypePrice, saveAdminEmergencyLightTestPrice, getAdminExtinguisherBasePrice, saveAdminExtinguisherBasePrice, getAdminExtinguisherSinglePrices, saveAdminExtinguisherWisePrice, saveAdminExtinguisherFloorPrice, saveAdminExtinguisherLastServicePrice, saveAdminExtinguisherTypePrice, getAdminFireAlarmBasePrice, saveAdminFireAlarmBasePrice, getAdminFireAlarmSinglePrices, saveAdminFireAlarmSmokeDetectorPrice, saveAdminFireAlarmCallPointPrice, saveAdminFireAlarmFloorPrice, saveAdminFireAlarmPanelPrice, saveAdminFireAlarmLastServicePrice, saveAdminFireAlarmSystemTypePrice, saveAdminFraPropertyTypePrice, saveAdminFraPeoplePrice, saveAdminFraFloorPrice, saveAdminFraDurationPrice, getAdminFraPricing } from "../api/adminService";
import {
  fetchPropertyTypes,
  fetchApproximatePeople,
  fetchFloorPricing,
  fetchFraDurations,
  formatPeopleOptionLabel,
  getPeopleOptionSortKey,
  fetchFireConsultationOptions,
  ConsultationOptionItem,
  getProfessionalConsultationBasePrice,
  saveProfessionalConsultationBasePrice,
  saveProfessionalConsultationModePrice,
  saveProfessionalConsultationHourPrice,
  getProfessionalConsultationSinglePrices,
  fetchMarshalOptions,
  MarshalServiceOptionItem,
  getProfessionalMarshalBasePrice,
  saveProfessionalMarshalBasePrice,
  saveProfessionalMarshalPeoplePrice,
  saveProfessionalMarshalPlacePrice,
  saveProfessionalMarshalTrainingOnPrice,
  saveProfessionalMarshalExperiencePrice,
  getProfessionalMarshalSinglePrices,
  fetchExtinguisherServiceOptions,
  ExtinguisherServiceOptionItem,
  fetchEmergencyLightOptions,
  EmergencyLightServiceOptionItem,
  fetchFireAlarmOptions,
  FireAlarmOptionItem,
  getProfessionalExtinguisherBasePrice,
  saveProfessionalExtinguisherBasePrice,
  createProfessionalExtinguisherWisePrice,
  saveProfessionalExtinguisherFloorPrice,
  saveProfessionalExtinguisherTypePrice,
  saveProfessionalExtinguisherLastServicePrice,
  getProfessionalExtinguisherSinglePrices,
  getProfessionalEmergencyLightBasePrice,
  saveProfessionalEmergencyLightBasePrice,
  createProfessionalEmergencyLightPrice,
  saveProfessionalEmergencyLightFloorPrice,
  saveProfessionalEmergencyLightTestPrice,
  saveProfessionalEmergencyLightTypePrice,
  getProfessionalEmergencyLightSinglePrices,
  getProfessionalFireAlarmBasePrice,
  saveProfessionalFireAlarmBasePrice,
  getProfessionalFireAlarmSinglePrices,
  createProfessionalFireAlarmSmokeDetectorPrice,
  createProfessionalFireAlarmCallPointPrice,
  createProfessionalFireAlarmFloorPrice,
  createProfessionalFireAlarmPanelPrice,
  createProfessionalFireAlarmSystemTypePrice,
  createProfessionalFireAlarmLastServicePrice,
} from "../api/servicesService";
import { toast } from "sonner";
import { getApiToken, getProfessionalId } from "../lib/auth";
import {
  AdminPriceOptionList,
  AdminProfessionalMobilePriceCard,
  FRA_SYSTEM_OPTIONS,
  ALARM_SYSTEM_OPTIONS,
  EXTINGUISHER_SYSTEM_OPTIONS,
  EMERGENCY_LIGHT_SYSTEM_OPTIONS,
  TRAINING_SYSTEM_OPTIONS,
  CONSULTATION_SYSTEM_OPTIONS,
  getFraAdminPriceRows,
  getFraAdminPriceGroups,
  FraGroupedAddonList,
  getSystemOptionLabel,
  getAlarmAdminPriceRows,
  getExtinguisherAdminPriceRows,
  getEmergencyLightAdminPriceRows,
  getTrainingAdminPriceRows,
  getConsultationAdminPriceRows,
} from "./AdminPricingMobileCards";

interface FRABasePriceContentProps {
  /** When true, shows all records (Admin). When false, filters by current professional (Professional). */
  isAdmin?: boolean;
}

function FRABasePriceContent({ isAdmin = false }: FRABasePriceContentProps) {
  const [records, setRecords] = useState<ProfessionalFraBasePriceItem[]>([]);
  const [fraAllPrices, setFraAllPrices] = useState<FraAllPricesProfessionalItem[] | null>(null);
  const [selectedSystemByPro, setSelectedSystemByPro] = useState<Record<number, string>>({});
  const [fraExpandedByPro, setFraExpandedByPro] = useState<Record<number, boolean>>({});
  // FRA Pricing modal (like Fire Alarm modal – opens from pencil in FRA Price table)
  const [fraModalOpen, setFraModalOpen] = useState(false);
  const [fraModalProfessionalId, setFraModalProfessionalId] = useState<string>("");
  const [fraModalLoadingOptions, setFraModalLoadingOptions] = useState(false);
  const [fraModalPropertyTypes, setFraModalPropertyTypes] = useState<Array<{ id: number; property_type_name: string }>>([]);
  const [fraModalPeople, setFraModalPeople] = useState<Array<{ id: number; number_of_people: string }>>([]);
  const [fraModalFloors, setFraModalFloors] = useState<Array<{ id: number; floor: string; label?: string }>>([]);
  const [fraModalDurations, setFraModalDurations] = useState<Array<{ id: number; duration: string }>>([]);
  const [fraModalPropertyTypeId, setFraModalPropertyTypeId] = useState<string>("");
  const [fraModalPropertyTypePrice, setFraModalPropertyTypePrice] = useState("");
  const [fraModalPeopleId, setFraModalPeopleId] = useState<string>("");
  const [fraModalPeoplePrice, setFraModalPeoplePrice] = useState("");
  const [fraModalFloorId, setFraModalFloorId] = useState<string>("");
  const [fraModalFloorPrice, setFraModalFloorPrice] = useState("");
  const [fraModalDurationId, setFraModalDurationId] = useState<string>("");
  const [fraModalDurationPrice, setFraModalDurationPrice] = useState("");
  const [fraModalUpdateMessage, setFraModalUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fraModalUpdatingPrice, setFraModalUpdatingPrice] = useState(false);
  const [fraModalRetryKey, setFraModalRetryKey] = useState(0);
  const [alarmAllPrices, setAlarmAllPrices] = useState<AlarmAllPricesProfessionalItem[] | null>(null);
  const [selectedAlarmSystemByPro, setSelectedAlarmSystemByPro] = useState<Record<number, string>>({});
  const [alarmExpandedByPro, setAlarmExpandedByPro] = useState<Record<number, boolean>>({});
  const [extinguisherAllPrices, setExtinguisherAllPrices] = useState<ExtinguisherAllPricesProfessionalItem[] | null>(null);
  const [selectedExtinguisherSystemByPro, setSelectedExtinguisherSystemByPro] = useState<Record<number, string>>({});
  const [extinguisherExpandedByPro, setExtinguisherExpandedByPro] = useState<Record<number, boolean>>({});
  const [loadingExtinguisherPrices, setLoadingExtinguisherPrices] = useState(false);
  const [errorExtinguisher, setErrorExtinguisher] = useState<string | null>(null);
  const [extinguisherFetchKey, setExtinguisherFetchKey] = useState(0);
  const [extinguisherModalOpen, setExtinguisherModalOpen] = useState(false);
  const [extinguisherModalProfessionalId, setExtinguisherModalProfessionalId] = useState<string>("");
  const [exExtinguisherOptions, setExExtinguisherOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [exFloorOptions, setExFloorOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [exLastServiceOptions, setExLastServiceOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [exTypeOptions, setExTypeOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [loadingExOptions, setLoadingExOptions] = useState(false);
  const [exExtinguisherValue, setExExtinguisherValue] = useState("");
  const [exFloorValue, setExFloorValue] = useState("");
  const [exLastServiceValue, setExLastServiceValue] = useState("");
  const [exTypeValue, setExTypeValue] = useState("");
  const [exBasePrice, setExBasePrice] = useState("");
  const [exExtinguisherPrice, setExExtinguisherPrice] = useState("");
  const [exFloorPrice, setExFloorPrice] = useState("");
  const [exTypePrice, setExTypePrice] = useState("");
  const [exLastServicePrice, setExLastServicePrice] = useState("");
  const [exUpdateMessage, setExUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingExPrice, setUpdatingExPrice] = useState(false);
  // Fire Alarm modal (same design as Extinguisher modal)
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmModalProfessionalId, setAlarmModalProfessionalId] = useState<string>("");
  const [alarmDetectorsOptions, setAlarmDetectorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [alarmCallPointsOptions, setAlarmCallPointsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [alarmFloorsOptions, setAlarmFloorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [alarmPanelsOptions, setAlarmPanelsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [alarmSystemTypeOptions, setAlarmSystemTypeOptions] = useState<FireAlarmOptionItem[]>([]);
  const [alarmLastServiceOptions, setAlarmLastServiceOptions] = useState<FireAlarmOptionItem[]>([]);
  const [loadingAlarmModalOptions, setLoadingAlarmModalOptions] = useState(false);
  const [alarmBasePrice, setAlarmBasePrice] = useState("");
  const [alarmDetectorsValue, setAlarmDetectorsValue] = useState("");
  const [alarmCallPointsValue, setAlarmCallPointsValue] = useState("");
  const [alarmFloorValue, setAlarmFloorValue] = useState("");
  const [alarmPanelsValue, setAlarmPanelsValue] = useState("");
  const [alarmSystemTypeValue, setAlarmSystemTypeValue] = useState("");
  const [alarmLastServiceValue, setAlarmLastServiceValue] = useState("");
  const [alarmDetectorsPrice, setAlarmDetectorsPrice] = useState("");
  const [alarmCallPointsPrice, setAlarmCallPointsPrice] = useState("");
  const [alarmFloorPrice, setAlarmFloorPrice] = useState("");
  const [alarmPanelsPrice, setAlarmPanelsPrice] = useState("");
  const [alarmSystemTypePrice, setAlarmSystemTypePrice] = useState("");
  const [alarmLastServicePrice, setAlarmLastServicePrice] = useState("");
  const [alarmUpdateMessage, setAlarmUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingAlarmPrice, setUpdatingAlarmPrice] = useState(false);
  const [alarmOptionsRetryKey, setAlarmOptionsRetryKey] = useState(0);
  const [lightTestingAllPrices, setLightTestingAllPrices] = useState<LightTestingAllPricesProfessionalItem[] | null>(null);
  const [selectedLightTestingSystemByPro, setSelectedLightTestingSystemByPro] = useState<Record<number, string>>({});
  const [lightTestingExpandedByPro, setLightTestingExpandedByPro] = useState<Record<number, boolean>>({});
  const [loadingLightTestingPrices, setLoadingLightTestingPrices] = useState(false);
  const [errorLightTesting, setErrorLightTesting] = useState<string | null>(null);
  const [lightTestingFetchKey, setLightTestingFetchKey] = useState(0);
  const [marshalAllPrices, setMarshalAllPrices] = useState<MarshalAllPricesProfessionalItem[] | null>(null);
  const [selectedMarshalSystemByPro, setSelectedMarshalSystemByPro] = useState<Record<number, string>>({});
  const [marshalExpandedByPro, setMarshalExpandedByPro] = useState<Record<number, boolean>>({});
  const [loadingMarshalPrices, setLoadingMarshalPrices] = useState(false);
  const [errorMarshal, setErrorMarshal] = useState<string | null>(null);
  const [marshalFetchKey, setMarshalFetchKey] = useState(0);
  const [consultationAllPrices, setConsultationAllPrices] = useState<ConsultationAllPricesProfessionalItem[] | null>(null);
  const [selectedConsultationSystemByPro, setSelectedConsultationSystemByPro] = useState<Record<number, string>>({});
  const [consultationExpandedByPro, setConsultationExpandedByPro] = useState<Record<number, boolean>>({});
  const [loadingConsultationPrices, setLoadingConsultationPrices] = useState(false);
  const [errorConsultation, setErrorConsultation] = useState<string | null>(null);
  const [consultationFetchKey, setConsultationFetchKey] = useState(0);
  const [consultationPricingModalOpen, setConsultationPricingModalOpen] = useState(false);
  const [consultancyBasePrice, setConsultancyBasePrice] = useState("");
  const [consultancyModelValue, setConsultancyModelValue] = useState("");
  const [consultancyModelPrice, setConsultancyModelPrice] = useState("");
  const [consultancyHoursValue, setConsultancyHoursValue] = useState("");
  const [consultancyHoursPrice, setConsultancyHoursPrice] = useState("");
  const [consultancyUpdateMessage, setConsultancyUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingConsultancyPrice, setUpdatingConsultancyPrice] = useState(false);
  const [consultancyModelOptions, setConsultancyModelOptions] = useState<ConsultationOptionItem[]>([]);
  const [consultancyHoursOptions, setConsultancyHoursOptions] = useState<ConsultationOptionItem[]>([]);
  const [loadingConsultationOptions, setLoadingConsultationOptions] = useState(false);
  const [consultancyModalProfessionalId, setConsultancyModalProfessionalId] = useState<string>("");
  const [trainingPricingModalOpen, setTrainingPricingModalOpen] = useState(false);
  const [trainingBasePrice, setTrainingBasePrice] = useState("");
  const [trainingPeopleValue, setTrainingPeopleValue] = useState("");
  const [trainingPeoplePrice, setTrainingPeoplePrice] = useState("");
  const [trainingPlaceValue, setTrainingPlaceValue] = useState("");
  const [trainingPlacePrice, setTrainingPlacePrice] = useState("");
  const [trainingTrainingValue, setTrainingTrainingValue] = useState("");
  const [trainingTrainingPrice, setTrainingTrainingPrice] = useState("");
  const [trainingExperienceValue, setTrainingExperienceValue] = useState("");
  const [trainingExperiencePrice, setTrainingExperiencePrice] = useState("");
  const [trainingUpdateMessage, setTrainingUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingTrainingPrice, setUpdatingTrainingPrice] = useState(false);
  const [trainingPeopleOptions, setTrainingPeopleOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [trainingPlaceOptions, setTrainingPlaceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [trainingTrainingOptions, setTrainingTrainingOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [trainingExperienceOptions, setTrainingExperienceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [loadingTrainingOptions, setLoadingTrainingOptions] = useState(false);
  const [trainingModalProfessionalId, setTrainingModalProfessionalId] = useState<string>("");
  const [emergencyLightingModalOpen, setEmergencyLightingModalOpen] = useState(false);
  const [emergencyLightingModalProfessionalId, setEmergencyLightingModalProfessionalId] = useState<string>("");
  const [elBasePrice, setElBasePrice] = useState("");
  const [elValue, setElValue] = useState("");
  const [elPrice, setElPrice] = useState("");
  const [elFloorValue, setElFloorValue] = useState("");
  const [elFloorPrice, setElFloorPrice] = useState("");
  const [elTypeValue, setElTypeValue] = useState("");
  const [elTypePrice, setElTypePrice] = useState("");
  const [elTestValue, setElTestValue] = useState("");
  const [elTestPrice, setElTestPrice] = useState("");
  const [elUpdateMessage, setElUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingElPrice, setUpdatingElPrice] = useState(false);
  const [savingElFloorPrice, setSavingElFloorPrice] = useState(false);
  const [elOptions, setElOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [elFloorOptions, setElFloorOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [elTypeOptions, setElTypeOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [elTestOptions, setElTestOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [loadingElOptions, setLoadingElOptions] = useState(false);
  const [loadingAlarmPrices, setLoadingAlarmPrices] = useState(false);
  const [errorAlarm, setErrorAlarm] = useState<string | null>(null);
  const [alarmFetchKey, setAlarmFetchKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverRecordId, setHoverRecordId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<ProfessionalFraBasePriceItem | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateRecord, setUpdateRecord] = useState<ProfessionalFraBasePriceItem | null>(null);
  const [updateNonIntrusive, setUpdateNonIntrusive] = useState<string>("");
  const [updateIntrusive, setUpdateIntrusive] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<ProfessionalFraBasePriceItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addPropertyTypeId, setAddPropertyTypeId] = useState<string>("");
  const [addNonIntrusive, setAddNonIntrusive] = useState<string>("");
  const [addIntrusive, setAddIntrusive] = useState<string>("");
  const [addPropertyTypesList, setAddPropertyTypesList] = useState<{ id: number; property_type_name: string }[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HOVER_CLOSE_DELAY_MS = 400;

  const [fraPriceTab, setFraPriceTab] = useState<string>("fra-price");
  const [fraFloorCatalogSize, setFraFloorCatalogSize] = useState(0);
  const [fraPeopleCatalogSize, setFraPeopleCatalogSize] = useState(0);
  const [fraDurationCatalogSize, setFraDurationCatalogSize] = useState(0);
  const pricingTabsScrollRef = useRef<HTMLDivElement>(null);

  const PRICING_SERVICE_TABS = [
    { value: "fra-price", label: "FRA Price" },
    { value: "fire-alarm", label: "Fire Alarm" },
    { value: "extinguishers", label: "Extinguishers" },
    { value: "emergency-lighting", label: "Emergency Lighting" },
    { value: "training", label: "Training" },
    { value: "consultancy", label: "Consultation" },
  ] as const;

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

  const handleViewDetails = (record: ProfessionalFraBasePriceItem) => {
    setHoverRecordId(null);
    setDetailsData(record);
    setDetailsModalOpen(true);
  };

  const handleUpdate = (record: ProfessionalFraBasePriceItem) => {
    setHoverRecordId(null);
    setUpdateRecord(record);
    setUpdateNonIntrusive(record.non_intrusive_base_price ?? "");
    setUpdateIntrusive(record.intrusive_base_price ?? "");
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
    const nonIntrusive = parseFloat(updateNonIntrusive.trim());
    const intrusive = parseFloat(updateIntrusive.trim());
    if (isNaN(nonIntrusive) || nonIntrusive < 0) {
      toast.error("Please enter a valid non-intrusive base price.");
      return;
    }
    if (isNaN(intrusive) || intrusive < 0) {
      toast.error("Please enter a valid intrusive base price.");
      return;
    }
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      await updateProfessionalFraBasePrice(apiToken, updateRecord.id, nonIntrusive, intrusive);
      toast.success("FRA base price updated successfully.");
      setUpdateModalOpen(false);
      setUpdateRecord(null);
      fetchData();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = (record: ProfessionalFraBasePriceItem) => {
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
      await deleteProfessionalFraBasePrice(
        apiToken,
        deleteRecord.id,
        deleteRecord.professional_id
      );
      toast.success("FRA base price deleted successfully.");
      setDeleteModalOpen(false);
      setDeleteRecord(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete FRA base price.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddFraPrice = () => {
    setAddPropertyTypeId("");
    setAddNonIntrusive("");
    setAddIntrusive("");
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Please log in to add FRA base price.");
      return;
    }
    const propertyTypeId = parseInt(addPropertyTypeId, 10);
    const nonIntrusive = parseFloat(addNonIntrusive.trim());
    const intrusive = parseFloat(addIntrusive.trim());
    if (!addPropertyTypeId || isNaN(propertyTypeId)) {
      toast.error("Please select a property type.");
      return;
    }
    if (isNaN(nonIntrusive) || nonIntrusive < 0) {
      toast.error("Please enter a valid non-intrusive base price.");
      return;
    }
    if (isNaN(intrusive) || intrusive < 0) {
      toast.error("Please enter a valid intrusive base price.");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      await storeProfessionalFraBasePrice(apiToken, propertyTypeId, nonIntrusive, intrusive);
      toast.success("FRA base price added successfully.");
      setAddModalOpen(false);
      setAddPropertyTypeId("");
      setAddNonIntrusive("");
      setAddIntrusive("");
      fetchData();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add FRA base price.");
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
        setError("Please log in to view FRA base price records.");
        return;
      }

      if (isAdmin) {
        const response = await getFraAllPrices(apiToken);
        if (response.status && Array.isArray(response.data)) {
          setFraAllPrices(response.data);
        } else {
          setFraAllPrices([]);
        }
        return;
      }

      const response = await getProfessionalFraBasePricesAll(apiToken);
      if (response.status && Array.isArray(response.data)) {
        let data = response.data;
        const professionalId = getProfessionalId();
        if (professionalId != null) {
          const numericId = Number(professionalId);
          const filtered = data.filter(
            (r) => Number(r.professional_id) === numericId
          );
          setRecords(filtered.length > 0 ? filtered : data);
        } else {
          setRecords(data);
        }
      } else {
        setRecords([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch FRA base price records");
      setRecords([]);
      if (isAdmin) setFraAllPrices(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // FRA modal: load options and populate from fraAllPrices when modal opens
  useEffect(() => {
    if (!fraModalOpen) return;
    const proId = fraModalProfessionalId ? Number(fraModalProfessionalId) : 0;
    const pro = fraAllPrices?.find((p) => p.professional_id === proId);

    let cancelled = false;
    setFraModalLoadingOptions(true);
    setFraModalUpdateMessage(null);

    Promise.all([
      fetchPropertyTypes(),
      fetchApproximatePeople(),
      fetchFloorPricing(),
      fetchFraDurations(),
    ])
      .then(([ptRes, peopleRes, floorsRes, durationsRes]) => {
        if (cancelled) return;
        const ptList = Array.isArray(ptRes) ? ptRes : [];
        const peopleList = Array.isArray(peopleRes) ? peopleRes : [];
        const floorsRaw = Array.isArray(floorsRes) ? floorsRes : [];
        const floorsList = floorsRaw.map((f: { id?: number; floor?: string; label?: string }) => ({
          id: f.id ?? 0,
          floor: (f as { floor?: string }).floor ?? "",
          label: (f as { label?: string }).label ?? (f as { floor?: string }).floor ?? "",
        }));
        const durationsList = Array.isArray(durationsRes) ? durationsRes : [];

        setFraModalPropertyTypes(ptList.map((p: { id: number; property_type_name: string }) => ({ id: p.id, property_type_name: p.property_type_name })));
        setFraModalPeople(peopleList.map((p: { id: number; number_of_people: string }) => ({ id: p.id, number_of_people: p.number_of_people })));
        setFraModalFloors(floorsList);
        setFraModalDurations(durationsList.map((d: { id: number; duration: string }) => ({ id: d.id, duration: d.duration })));

        const firstPt = ptList[0] as { id: number; property_type_name: string } | undefined;
        const firstPeople = peopleList[0] as { id: number; number_of_people: string } | undefined;
        const firstFloor = floorsList[0];
        const firstDur = durationsList[0] as { id: number; duration: string } | undefined;

        const ptId = firstPt ? String(firstPt.id) : "";
        const peopleId = firstPeople ? String(firstPeople.id) : "";
        const floorId = firstFloor ? String(firstFloor.id ?? firstFloor.floor) : "";
        const durId = firstDur ? String(firstDur.id) : "";

        setFraModalPropertyTypeId(ptId);
        setFraModalPeopleId(peopleId);
        setFraModalFloorId(floorId);
        setFraModalDurationId(durId);

        const priceStr = (s: string | undefined) => (s != null ? String(s).replace(/[^0-9.]/g, "") : "");
        if (pro) {
          const ptMatch = pro.property_types?.find((x) => String(x.id) === ptId);
          const peopleMatch = pro.people?.find((x) => String(x.id) === peopleId);
          const floorMatch = pro.floors?.find((x) => String(x.id) === floorId);
          const durMatch = pro.durations?.find((x) => String(x.id) === durId);
          setFraModalPropertyTypePrice(ptMatch ? priceStr(ptMatch.price) : "");
          setFraModalPeoplePrice(peopleMatch ? priceStr(peopleMatch.price) : "");
          setFraModalFloorPrice(floorMatch ? priceStr(floorMatch.price) : "");
          setFraModalDurationPrice(durMatch ? priceStr(durMatch.price) : "");
        } else {
          setFraModalPropertyTypePrice("");
          setFraModalPeoplePrice("");
          setFraModalFloorPrice("");
          setFraModalDurationPrice("");
        }
      })
      .catch(() => {
        if (!cancelled) setFraModalUpdateMessage({ type: "error", text: "Couldn't load options. Check your connection or try again." });
      })
      .finally(() => {
        if (!cancelled) setFraModalLoadingOptions(false);
      });
    return () => { cancelled = true; };
  }, [fraModalOpen, fraModalProfessionalId, fraAllPrices, fraModalRetryKey]);

  // FRA modal: when selections change, fetch whole price from API and set prices
  useEffect(() => {
    if (!fraModalOpen || fraModalLoadingOptions) return;
    const token = getApiToken();
    const proId = fraModalProfessionalId ? Number(fraModalProfessionalId) : 0;
    const propTypeId = fraModalPropertyTypeId ? Number(fraModalPropertyTypeId) : 0;
    const peopleId = fraModalPeopleId ? Number(fraModalPeopleId) : 0;
    const floorId = fraModalFloorId ? Number(fraModalFloorId) : 0;
    const durationId = fraModalDurationId ? Number(fraModalDurationId) : 0;
    const hasAll =
      token &&
      proId &&
      propTypeId &&
      peopleId &&
      floorId &&
      durationId &&
      fraModalPropertyTypeId !== "no-data" &&
      fraModalPeopleId !== "no-data" &&
      fraModalFloorId !== "no-data" &&
      fraModalDurationId !== "no-data";
    if (!hasAll) {
      const pro = fraAllPrices?.find((p) => p.professional_id === proId);
      const priceStr = (s: string | undefined) => (s != null ? String(s).replace(/[^0-9.]/g, "") : "");
      if (!pro) {
        setFraModalPropertyTypePrice("");
        setFraModalPeoplePrice("");
        setFraModalFloorPrice("");
        setFraModalDurationPrice("");
        return;
      }
      const pt = pro.property_types?.find((x) => String(x.id) === fraModalPropertyTypeId);
      const people = pro.people?.find((x) => String(x.id) === fraModalPeopleId);
      const floor = pro.floors?.find((x) => String(x.id) === fraModalFloorId);
      const dur = pro.durations?.find((x) => String(x.id) === fraModalDurationId);
      setFraModalPropertyTypePrice(pt ? priceStr(pt.price) : "");
      setFraModalPeoplePrice(people ? priceStr(people.price) : "");
      setFraModalFloorPrice(floor ? priceStr(floor.price) : "");
      setFraModalDurationPrice(dur ? priceStr(dur.price) : "");
      return;
    }
    let cancelled = false;
    getAdminFraPricing(token, proId, propTypeId, floorId, peopleId, durationId)
      .then((res) => {
        if (cancelled || !res?.data) return;
        const d = res.data;
        const priceStr = (s: string | number | undefined) => (s != null ? String(s).replace(/[^0-9.]/g, "") : "");
        setFraModalPropertyTypePrice(priceStr(d.property_type?.price));
        setFraModalPeoplePrice(priceStr(d.people?.price));
        setFraModalFloorPrice(priceStr(d.floor?.price));
        setFraModalDurationPrice(priceStr(d.duration?.price));
      })
      .catch(() => {
        if (cancelled) return;
        const pro = fraAllPrices?.find((p) => p.professional_id === proId);
        const priceStr = (s: string | undefined) => (s != null ? String(s).replace(/[^0-9.]/g, "") : "");
        if (pro) {
          const pt = pro.property_types?.find((x) => String(x.id) === fraModalPropertyTypeId);
          const people = pro.people?.find((x) => String(x.id) === fraModalPeopleId);
          const floor = pro.floors?.find((x) => String(x.id) === fraModalFloorId);
          const dur = pro.durations?.find((x) => String(x.id) === fraModalDurationId);
          setFraModalPropertyTypePrice(pt ? priceStr(pt.price) : "");
          setFraModalPeoplePrice(people ? priceStr(people.price) : "");
          setFraModalFloorPrice(floor ? priceStr(floor.price) : "");
          setFraModalDurationPrice(dur ? priceStr(dur.price) : "");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fraModalOpen, fraModalLoadingOptions, fraModalProfessionalId, fraModalPropertyTypeId, fraModalPeopleId, fraModalFloorId, fraModalDurationId, fraAllPrices]);

  useEffect(() => {
    if (!isAdmin || fraPriceTab !== "fire-alarm") return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    let cancelled = false;
    setLoadingAlarmPrices(true);
    setErrorAlarm(null);
    getAlarmAllPrices(apiToken)
      .then((res) => {
        if (cancelled) return;
        if (res?.status && Array.isArray(res.data)) {
          setAlarmAllPrices(res.data);
        } else {
          setAlarmAllPrices([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorAlarm(err instanceof Error ? err.message : "Failed to fetch Fire Alarm prices");
          setAlarmAllPrices(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAlarmPrices(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin, fraPriceTab, alarmFetchKey]);

  useEffect(() => {
    if (!isAdmin || fraPriceTab !== "extinguishers") return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    let cancelled = false;
    setLoadingExtinguisherPrices(true);
    setErrorExtinguisher(null);
    getExtinguisherAllPrices(apiToken)
      .then((res) => {
        if (cancelled) return;
        if (res?.status && Array.isArray(res.data)) {
          setExtinguisherAllPrices(res.data);
        } else {
          setExtinguisherAllPrices([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorExtinguisher(err instanceof Error ? err.message : "Failed to fetch Extinguisher prices");
          setExtinguisherAllPrices(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExtinguisherPrices(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin, fraPriceTab, extinguisherFetchKey]);

  useEffect(() => {
    if (!isAdmin || fraPriceTab !== "emergency-lighting") return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    let cancelled = false;
    setLoadingLightTestingPrices(true);
    setErrorLightTesting(null);
    getLightTestingAllPrices(apiToken)
      .then((res) => {
        if (cancelled) return;
        if (res?.status && Array.isArray(res.data)) {
          setLightTestingAllPrices(res.data);
        } else {
          setLightTestingAllPrices([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorLightTesting(err instanceof Error ? err.message : "Failed to fetch Emergency Lighting prices");
          setLightTestingAllPrices(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLightTestingPrices(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin, fraPriceTab, lightTestingFetchKey]);

  useEffect(() => {
    if (!isAdmin || fraPriceTab !== "training") return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    let cancelled = false;
    setLoadingMarshalPrices(true);
    setErrorMarshal(null);
    getMarshalAllPrices(apiToken)
      .then((res) => {
        if (cancelled) return;
        if (res?.status && Array.isArray(res.data)) {
          setMarshalAllPrices(res.data);
        } else {
          setMarshalAllPrices([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMarshal(err instanceof Error ? err.message : "Failed to fetch Training (Marshal) prices");
          setMarshalAllPrices(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMarshalPrices(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin, fraPriceTab, marshalFetchKey]);

  useEffect(() => {
    if (!isAdmin || fraPriceTab !== "consultancy") return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    let cancelled = false;
    setLoadingConsultationPrices(true);
    setErrorConsultation(null);
    getConsultationAllPrices(apiToken)
      .then((res) => {
        if (cancelled) return;
        if (res?.status && Array.isArray(res.data)) {
          setConsultationAllPrices(res.data);
        } else {
          setConsultationAllPrices([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorConsultation(err instanceof Error ? err.message : "Failed to fetch Consultation prices");
          setConsultationAllPrices(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConsultationPrices(false);
      });
    return () => { cancelled = true; };
  }, [isAdmin, fraPriceTab, consultationFetchKey]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    Promise.all([fetchFloorPricing(), fetchApproximatePeople(), fetchFraDurations()])
      .then(([floors, people, durations]) => {
        if (cancelled) return;
        setFraFloorCatalogSize(Array.isArray(floors) ? floors.length : 0);
        setFraPeopleCatalogSize(Array.isArray(people) ? people.length : 0);
        setFraDurationCatalogSize(Array.isArray(durations) ? durations.length : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setFraFloorCatalogSize(0);
          setFraPeopleCatalogSize(0);
          setFraDurationCatalogSize(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!addModalOpen) return;
    let cancelled = false;
    fetchPropertyTypes()
      .then((types) => {
        if (!cancelled) {
          setAddPropertyTypesList(types.map((t) => ({ id: t.id, property_type_name: t.property_type_name })));
        }
      })
      .catch(() => {
        if (!cancelled) setAddPropertyTypesList([]);
      });
    return () => { cancelled = true; };
  }, [addModalOpen]);

  // Load consultation options and base price when Consultancy Pricing modal opens
  useEffect(() => {
    if (!consultationPricingModalOpen) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const load = async () => {
      setLoadingConsultationOptions(true);
      try {
        const [modeList, hourList] = await Promise.all([
          fetchFireConsultationOptions(apiToken, "mode"),
          fetchFireConsultationOptions(apiToken, "hour"),
        ]);
        const modeOptions = Array.isArray(modeList) ? modeList : [];
        const hourOptions = Array.isArray(hourList) ? hourList : [];

        setConsultancyModelOptions(modeOptions);
        setConsultancyHoursOptions(hourOptions);

        if (!isAdmin) {
          try {
            const basePriceRes = await getProfessionalConsultationBasePrice(apiToken);
            if (basePriceRes?.data != null && basePriceRes.data.price !== undefined) {
              const p = basePriceRes.data.price;
              const displayPrice =
                typeof p === "string" ? p : typeof p === "number" ? p.toFixed(2) : String(p);
              setConsultancyBasePrice(displayPrice);
            }
          } catch {
            // ignore
          }
        }

        const firstVal = (item: ConsultationOptionItem | undefined) =>
          item ? String(item.id) : "";
        setConsultancyModelValue((prev) => prev || firstVal(modeOptions[0]));
        setConsultancyHoursValue((prev) => prev || firstVal(hourOptions[0]));
      } catch {
        // ignore
      } finally {
        setLoadingConsultationOptions(false);
      }
    };
    load();
  }, [consultationPricingModalOpen, isAdmin]);

  // When consultancy modal opens as admin, default to first professional if list is loaded
  useEffect(() => {
    if (!isAdmin || !consultationPricingModalOpen || !consultationAllPrices?.length) return;
    if (!consultancyModalProfessionalId && consultationAllPrices[0]) {
      setConsultancyModalProfessionalId(String(consultationAllPrices[0].professional_id));
    }
  }, [isAdmin, consultationPricingModalOpen, consultationAllPrices]);

  // When admin has modal open with a professional, fetch and display base price from API
  useEffect(() => {
    if (!isAdmin || !consultationPricingModalOpen || !consultancyModalProfessionalId) return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    const professionalId = parseInt(consultancyModalProfessionalId, 10);
    if (!professionalId) return;

    const fetchBasePrice = async () => {
      try {
        const res = await getAdminConsultationBasePrice(apiToken, professionalId);
        if (res?.data?.price !== undefined && res.data.price !== null) {
          const p = res.data.price;
          const displayPrice =
            typeof p === "string" ? p : typeof p === "number" ? p.toFixed(2) : String(p);
          setConsultancyBasePrice(displayPrice.replace(/[^0-9.]/g, "") || "");
        } else {
          setConsultancyBasePrice("");
        }
      } catch {
        setConsultancyBasePrice("");
      }
    };
    fetchBasePrice();
  }, [isAdmin, consultationPricingModalOpen, consultancyModalProfessionalId]);

  // When consultation model/hour selection changes (and modal open), fetch prices
  useEffect(() => {
    if (!consultationPricingModalOpen || loadingConsultationOptions) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const modeId = consultancyModelValue ? parseInt(consultancyModelValue, 10) : 0;
    const hourId = consultancyHoursValue ? parseInt(consultancyHoursValue, 10) : 0;
    if (!modeId || !hourId || consultancyModelValue === "no-data" || consultancyHoursValue === "no-data") return;

    const fetchPrices = async () => {
      try {
        if (isAdmin && consultancyModalProfessionalId) {
          const professionalId = parseInt(consultancyModalProfessionalId, 10);
          if (!professionalId) return;
          const res = await getAdminConsultationSinglePrices(apiToken, professionalId, modeId, hourId);
          if (res?.data) {
            const modePrice = res.data.mode?.price;
            const hourPrice = res.data.hour?.price;
            if (modePrice !== undefined && modePrice !== null) {
              setConsultancyModelPrice(typeof modePrice === "string" ? modePrice : String(modePrice));
            }
            if (res.data.hour == null || hourPrice === undefined || hourPrice === null) {
              setConsultancyHoursPrice("0.00");
            } else {
              setConsultancyHoursPrice(typeof hourPrice === "string" ? hourPrice : String(hourPrice));
            }
          }
        } else {
          const res = await getProfessionalConsultationSinglePrices(apiToken, modeId, hourId);
          if (res?.data) {
            const modePrice = res.data.mode?.price;
            const placePrice = res.data.place?.price;
            if (modePrice !== undefined && modePrice !== null) {
              setConsultancyModelPrice(typeof modePrice === "string" ? modePrice : String(modePrice));
            }
            if (res.data.place == null || placePrice === undefined || placePrice === null) {
              setConsultancyHoursPrice("0.00");
            } else {
              setConsultancyHoursPrice(typeof placePrice === "string" ? placePrice : String(placePrice));
            }
          }
        }
      } catch {
        // ignore
      }
    };
    fetchPrices();
  }, [consultationPricingModalOpen, consultancyModelValue, consultancyHoursValue, loadingConsultationOptions, isAdmin, consultancyModalProfessionalId]);

  const consultancyEstimatePrice = (
    (parseFloat(consultancyBasePrice) || 0) +
    (parseFloat(consultancyModelPrice) || 0) +
    (parseFloat(consultancyHoursPrice) || 0)
  ).toFixed(2);

  // Load Training (Marshal) options and base price when Training Pricing modal opens
  useEffect(() => {
    if (!trainingPricingModalOpen) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const load = async () => {
      setLoadingTrainingOptions(true);
      try {
        const [people, place, training, experience] = await Promise.all([
          fetchMarshalOptions(apiToken, "people"),
          fetchMarshalOptions(apiToken, "training_place"),
          fetchMarshalOptions(apiToken, "building_type"),
          fetchMarshalOptions(apiToken, "experience"),
        ]);
        const peopleList = Array.isArray(people) ? people : [];
        const placeList = Array.isArray(place) ? place : [];
        const trainingList = Array.isArray(training) ? training : [];
        const experienceList = Array.isArray(experience) ? experience : [];

        setTrainingPeopleOptions(peopleList);
        setTrainingPlaceOptions(placeList);
        setTrainingTrainingOptions(trainingList);
        setTrainingExperienceOptions(experienceList);

        const firstVal = (item: MarshalServiceOptionItem | undefined) =>
          item ? (String(item.value ?? "").trim() || String(item.id ?? "")) : "";
        setTrainingPeopleValue((prev) => prev || firstVal(peopleList[0]));
        setTrainingPlaceValue((prev) => prev || firstVal(placeList[0]));
        setTrainingTrainingValue((prev) => prev || firstVal(trainingList[0]));
        setTrainingExperienceValue((prev) => prev || firstVal(experienceList[0]));

        try {
          if (isAdmin && trainingModalProfessionalId) {
            const professionalId = parseInt(trainingModalProfessionalId, 10);
            if (professionalId) {
              const baseRes = await getAdminMarshalBasePrice(apiToken, professionalId);
              if (baseRes?.data?.price !== undefined && baseRes.data.price !== null) {
                const p = baseRes.data.price;
                const displayPrice = typeof p === "string" ? p : typeof p === "number" ? p.toFixed(2) : String(p);
                setTrainingBasePrice(displayPrice.replace(/[^0-9.]/g, "") || "");
              } else {
                setTrainingBasePrice("");
              }
            } else {
              setTrainingBasePrice("");
            }
          } else {
            const baseRes = await getProfessionalMarshalBasePrice(apiToken);
            if (baseRes?.data?.price !== undefined && baseRes.data.price !== null) {
              const p = baseRes.data.price;
              const displayPrice = typeof p === "string" ? p : typeof p === "number" ? p.toFixed(2) : String(p);
              setTrainingBasePrice(displayPrice.replace(/[^0-9.]/g, "") || "");
            } else {
              setTrainingBasePrice("");
            }
          }
        } catch {
          setTrainingBasePrice("");
        }
      } catch {
        // ignore
      } finally {
        setLoadingTrainingOptions(false);
      }
    };
    load();
  }, [trainingPricingModalOpen, isAdmin, trainingModalProfessionalId]);

  // When Training modal opens as admin, default to first professional if list is loaded
  useEffect(() => {
    if (!isAdmin || !trainingPricingModalOpen || !marshalAllPrices?.length) return;
    if (!trainingModalProfessionalId && marshalAllPrices[0]) {
      setTrainingModalProfessionalId(String(marshalAllPrices[0].professional_id));
    }
  }, [isAdmin, trainingPricingModalOpen, marshalAllPrices]);

  // When Training selections change (modal open), fetch single prices
  useEffect(() => {
    if (!trainingPricingModalOpen || loadingTrainingOptions) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const findId = (v: string, opts: MarshalServiceOptionItem[]) => {
      const val = (v ?? "").trim();
      if (!val || val === "no-data") return 0;
      const opt = opts.find((o) => (String(o.value ?? "").trim() || String(o.id)) === val);
      return opt?.id ?? 0;
    };
    const people_id = findId(trainingPeopleValue, trainingPeopleOptions);
    const place_id = findId(trainingPlaceValue, trainingPlaceOptions);
    const training_on_id = findId(trainingTrainingValue, trainingTrainingOptions);
    const experience_id = findId(trainingExperienceValue, trainingExperienceOptions);
    if (!people_id && !place_id && !training_on_id && !experience_id) return;

    const fetchPrices = async () => {
      try {
        if (isAdmin && trainingModalProfessionalId) {
          const professionalId = parseInt(trainingModalProfessionalId, 10);
          if (!professionalId) return;
          const res = await getAdminMarshalSinglePrices(
            apiToken,
            professionalId,
            people_id || 0,
            place_id || 0,
            training_on_id || 0,
            experience_id || 0
          );
          if (!res?.data) return;
          const d = res.data;
          const priceStr = (v: string | null | undefined) =>
            v != null && String(v).trim() !== "" ? String(v).trim() : "0.00";
          setTrainingPeoplePrice(priceStr(d.people?.price));
          setTrainingPlacePrice(priceStr(d.place?.price));
          setTrainingTrainingPrice(priceStr(d.training_on?.price));
          setTrainingExperiencePrice(priceStr(d.experience?.price));
          return;
        }
        const res = await getProfessionalMarshalSinglePrices(apiToken, {
          people_id: people_id || 0,
          place_id: place_id || 0,
          training_on_id: training_on_id || 0,
          experience_id: experience_id || 0,
        });
        if (!res?.data) return;
        const d = res.data;
        const priceStr = (v: string | null | undefined) =>
          v != null && String(v).trim() !== "" ? String(v).trim() : "0.00";
        setTrainingPeoplePrice(priceStr(d.people?.price));
        setTrainingPlacePrice(priceStr(d.place?.price));
        setTrainingTrainingPrice(priceStr(d.training_on?.price));
        setTrainingExperiencePrice(priceStr(d.experience?.price));
      } catch {
        // ignore
      }
    };
    fetchPrices();
  }, [
    trainingPricingModalOpen,
    loadingTrainingOptions,
    trainingPeopleValue,
    trainingPlaceValue,
    trainingTrainingValue,
    trainingExperienceValue,
    trainingPeopleOptions,
    trainingPlaceOptions,
    trainingTrainingOptions,
    trainingExperienceOptions,
    isAdmin,
    trainingModalProfessionalId,
  ]);

  const trainingEstimatePrice = (
    (parseFloat(trainingBasePrice) || 0) +
    (parseFloat(trainingPeoplePrice) || 0) +
    (parseFloat(trainingPlacePrice) || 0) +
    (parseFloat(trainingTrainingPrice) || 0) +
    (parseFloat(trainingExperiencePrice) || 0)
  ).toFixed(2);

  // Emergency Lighting modal: fetch options when modal opens
  useEffect(() => {
    if (!emergencyLightingModalOpen) return;
    let cancelled = false;
    setLoadingElOptions(true);
    Promise.all([
      fetchEmergencyLightOptions("light"),
      fetchEmergencyLightOptions("floor"),
      fetchEmergencyLightOptions("light_type"),
      fetchEmergencyLightOptions("light_test"),
    ])
      .then(([lightList, floorList, typeList, testList]) => {
        if (cancelled) return;
        setElOptions(lightList);
        setElFloorOptions(floorList);
        setElTypeOptions(typeList);
        setElTestOptions(testList);
        const firstVal = (item: EmergencyLightServiceOptionItem | undefined) =>
          item ? (String(item.value ?? "").trim() || String(item.id)) : "";
        setElValue((prev) => prev || firstVal(lightList[0]));
        setElFloorValue((prev) => prev || firstVal(floorList[0]));
        setElTypeValue((prev) => prev || firstVal(typeList[0]));
        setElTestValue((prev) => prev || firstVal(testList[0]));
      })
      .catch(() => { if (!cancelled) setElUpdateMessage({ type: "error", text: "Failed to load options." }); })
      .finally(() => { if (!cancelled) setLoadingElOptions(false); });
    return () => { cancelled = true; };
  }, [emergencyLightingModalOpen]);

  // Extinguisher modal: fetch dropdown options from API (type in request body, data from response)
  useEffect(() => {
    if (!extinguisherModalOpen) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    let cancelled = false;
    setLoadingExOptions(true);
    Promise.all([
      fetchExtinguisherServiceOptions(apiToken, "extinguisher"),
      fetchExtinguisherServiceOptions(apiToken, "floor"),
      fetchExtinguisherServiceOptions(apiToken, "last_service"),
      fetchExtinguisherServiceOptions(apiToken, "metarials"),
    ])
      .then(([extList, floorList, lastList, typeList]) => {
        if (cancelled) return;
        setExExtinguisherOptions(extList);
        setExFloorOptions(floorList);
        setExLastServiceOptions(lastList);
        setExTypeOptions(typeList);
        const firstVal = (item: ExtinguisherServiceOptionItem | undefined) =>
          item ? (String(item.value ?? "").trim() || String(item.id)) : "";
        setExExtinguisherValue((prev) => prev || firstVal(extList[0]));
        setExFloorValue((prev) => prev || firstVal(floorList[0]));
        setExLastServiceValue((prev) => prev || firstVal(lastList[0]));
        setExTypeValue((prev) => prev || firstVal(typeList[0]));
      })
      .finally(() => { if (!cancelled) setLoadingExOptions(false); });
    return () => { cancelled = true; };
  }, [extinguisherModalOpen]);

  // Extinguisher modal: fetch base price when modal opens (admin API or professional API)
  useEffect(() => {
    if (!extinguisherModalOpen) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const setPriceFromResponse = (res: { data?: { price?: string | number | null } }) => {
      const p = res?.data?.price;
      if (p !== undefined && p !== null) {
        const displayPrice = typeof p === "string" ? p : typeof p === "number" ? p.toFixed(2) : String(p);
        setExBasePrice(displayPrice.replace(/[^0-9.]/g, "") || "");
      } else {
        setExBasePrice("");
      }
    };

    if (isAdmin && extinguisherModalProfessionalId) {
      const professionalId = parseInt(extinguisherModalProfessionalId, 10);
      if (professionalId) {
        getAdminExtinguisherBasePrice(apiToken, professionalId)
          .then(setPriceFromResponse)
          .catch(() => setExBasePrice(""));
        return;
      }
    }

    getProfessionalExtinguisherBasePrice(apiToken)
      .then(setPriceFromResponse)
      .catch(() => setExBasePrice(""));
  }, [extinguisherModalOpen, isAdmin, extinguisherModalProfessionalId]);

  // Extinguisher modal: when selections change, fetch single prices (admin token in body for admin)
  useEffect(() => {
    if (!extinguisherModalOpen || loadingExOptions) return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    const findId = (v: string, opts: ExtinguisherServiceOptionItem[]) => {
      const val = (v ?? "").trim();
      if (!val || val === "no-data") return 0;
      const opt = opts.find((o) => (String(o.value ?? "").trim() || String(o.id)) === val);
      return opt?.id ?? 0;
    };
    const extinguisher_id = findId(exExtinguisherValue, exExtinguisherOptions);
    const floor_id = findId(exFloorValue, exFloorOptions);
    const last_service_id = findId(exLastServiceValue, exLastServiceOptions);
    const extinguisher_type_id = findId(exTypeValue, exTypeOptions);
    if (!extinguisher_id && !floor_id && !last_service_id && !extinguisher_type_id) return;

    const priceStr = (v: string | null | undefined) =>
      v != null && String(v).trim() !== "" ? String(v).trim() : "0.00";

    if (isAdmin && extinguisherModalProfessionalId) {
      const professionalId = parseInt(extinguisherModalProfessionalId, 10);
      if (professionalId) {
        getAdminExtinguisherSinglePrices(
          apiToken,
          professionalId,
          extinguisher_id || 0,
          floor_id || 0,
          last_service_id || 0,
          extinguisher_type_id || 0
        )
          .then((res) => {
            if (!res?.data) return;
            const d = res.data;
            setExExtinguisherPrice(priceStr(d.extinguisher?.price));
            setExFloorPrice(priceStr(d.floor?.price));
            setExLastServicePrice(priceStr(d.last_service?.price));
            setExTypePrice(priceStr(d.extinguisher_type?.price));
          })
          .catch(() => {});
        return;
      }
    }

    getProfessionalExtinguisherSinglePrices(apiToken, {
      extinguisher_id: extinguisher_id || 0,
      floor_id: floor_id || 0,
      last_service_id: last_service_id || 0,
      extinguisher_type_id: extinguisher_type_id || 0,
    })
      .then((res) => {
        if (!res?.data) return;
        const d = res.data;
        setExExtinguisherPrice(priceStr(d.extinguisher?.price));
        setExFloorPrice(priceStr(d.floor?.price));
        setExLastServicePrice(priceStr(d.last_service?.price));
        setExTypePrice(priceStr(d.extinguisher_type?.price));
      })
      .catch(() => {});
  }, [
    extinguisherModalOpen,
    loadingExOptions,
    isAdmin,
    extinguisherModalProfessionalId,
    exExtinguisherValue,
    exFloorValue,
    exLastServiceValue,
    exTypeValue,
    exExtinguisherOptions,
    exFloorOptions,
    exLastServiceOptions,
    exTypeOptions,
  ]);

  // Fire Alarm modal: fetch options and base price when modal opens (admin uses professional_id)
  useEffect(() => {
    if (!alarmModalOpen) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const professionalId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
    const isAdminEditing = professionalId > 0;

    let cancelled = false;
    setLoadingAlarmModalOptions(true);
    setAlarmUpdateMessage(null);
    const firstVal = (item: FireAlarmOptionItem | undefined) =>
      item ? (String(item.value ?? "").trim() || String(item.id)) : "";

    const basePricePromise = isAdminEditing
      ? getAdminFireAlarmBasePrice(apiToken, professionalId)
      : getProfessionalFireAlarmBasePrice(apiToken);

    Promise.all([
      fetchFireAlarmOptions(apiToken, "ditectors"),
      fetchFireAlarmOptions(apiToken, "call_points"),
      fetchFireAlarmOptions(apiToken, "floors"),
      fetchFireAlarmOptions(apiToken, "alarm_panels"),
      fetchFireAlarmOptions(apiToken, "system_type"),
      fetchFireAlarmOptions(apiToken, "last_service"),
      basePricePromise,
    ])
      .then(([detectors, callPoints, floors, panels, systemType, lastService, baseRes]) => {
        if (cancelled) return;
        const detectorsList = Array.isArray(detectors) ? detectors : [];
        const callPointsList = Array.isArray(callPoints) ? callPoints : [];
        const floorsList = Array.isArray(floors) ? floors : [];
        const panelsList = Array.isArray(panels) ? panels : [];
        const systemTypeList = Array.isArray(systemType) ? systemType : [];
        const lastServiceList = Array.isArray(lastService) ? lastService : [];
        setAlarmDetectorsOptions(detectorsList);
        setAlarmCallPointsOptions(callPointsList);
        setAlarmFloorsOptions(floorsList);
        setAlarmPanelsOptions(panelsList);
        setAlarmSystemTypeOptions(systemTypeList);
        setAlarmLastServiceOptions(lastServiceList);
        setAlarmDetectorsValue((prev) => prev || firstVal(detectorsList[0]));
        setAlarmCallPointsValue((prev) => prev || firstVal(callPointsList[0]));
        setAlarmFloorValue((prev) => prev || firstVal(floorsList[0]));
        setAlarmPanelsValue((prev) => prev || firstVal(panelsList[0]));
        setAlarmSystemTypeValue((prev) => prev || firstVal(systemTypeList[0]));
        setAlarmLastServiceValue((prev) => prev || firstVal(lastServiceList[0]));
        if (baseRes?.data?.price != null) {
          const p = String(baseRes.data.price).trim().replace(/[^0-9.]/g, "");
          setAlarmBasePrice(p || "");
        } else {
          setAlarmBasePrice("");
        }
      })
      .catch(() => {
        if (!cancelled) setAlarmUpdateMessage({ type: "error", text: "Couldn't load options. Check your connection or try again." });
      })
      .finally(() => {
        if (!cancelled) setLoadingAlarmModalOptions(false);
      });
    return () => { cancelled = true; };
  }, [alarmModalOpen, alarmOptionsRetryKey, alarmModalProfessionalId]);

  // Fire Alarm modal: fetch single prices when dropdown values change (after options loaded)
  useEffect(() => {
    if (!alarmModalOpen || loadingAlarmModalOptions) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const findId = (val: string, opts: FireAlarmOptionItem[]) => {
      const o = opts.find((opt) => (String(opt.value ?? "").trim() || String(opt.id)) === val);
      return o?.id ?? 0;
    };
    const smoke_detectors_id = findId(alarmDetectorsValue, alarmDetectorsOptions);
    const call_point_id = findId(alarmCallPointsValue, alarmCallPointsOptions);
    const floor_id = findId(alarmFloorValue, alarmFloorsOptions);
    const panel_id = findId(alarmPanelsValue, alarmPanelsOptions);
    const system_type_id = findId(alarmSystemTypeValue, alarmSystemTypeOptions);
    const last_service_id = findId(alarmLastServiceValue, alarmLastServiceOptions);
    if (!smoke_detectors_id && !call_point_id && !floor_id && !panel_id && !system_type_id && !last_service_id) return;

    const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
    const ids = {
      smoke_detectors_id: smoke_detectors_id || 0,
      call_point_id: call_point_id || 0,
      floor_id: floor_id || 0,
      panel_id: panel_id || 0,
      system_type_id: system_type_id || 0,
      last_service_id: last_service_id || 0,
    };

    const priceStr = (p: { price?: string } | undefined) => (p?.price != null ? String(p.price).replace(/[^0-9.]/g, "") : "");

    if (proId > 0) {
      getAdminFireAlarmSinglePrices(apiToken, proId, ids)
        .then((res) => {
          if (!res?.data) return;
          const d = res.data;
          setAlarmDetectorsPrice(priceStr(d.smoke_detector));
          setAlarmCallPointsPrice(priceStr(d.call_point));
          setAlarmFloorPrice(priceStr(d.floor));
          setAlarmPanelsPrice(priceStr(d.panel));
          setAlarmSystemTypePrice(priceStr(d.system_type));
          setAlarmLastServicePrice(priceStr(d.last_service));
        })
        .catch(() => {});
    } else {
      getProfessionalFireAlarmSinglePrices(apiToken, ids)
        .then((res) => {
          if (!res?.data) return;
          const d = res.data;
          setAlarmDetectorsPrice(priceStr(d.smoke_detector));
          setAlarmCallPointsPrice(priceStr(d.call_point));
          setAlarmFloorPrice(priceStr(d.floor));
          setAlarmPanelsPrice(priceStr(d.panel));
          setAlarmSystemTypePrice(priceStr(d.system_type));
          setAlarmLastServicePrice(priceStr(d.last_service));
        })
        .catch(() => {});
    }
  }, [
    alarmModalOpen,
    loadingAlarmModalOptions,
    alarmModalProfessionalId,
    alarmDetectorsValue,
    alarmCallPointsValue,
    alarmFloorValue,
    alarmPanelsValue,
    alarmSystemTypeValue,
    alarmLastServiceValue,
    alarmDetectorsOptions,
    alarmCallPointsOptions,
    alarmFloorsOptions,
    alarmPanelsOptions,
    alarmSystemTypeOptions,
    alarmLastServiceOptions,
  ]);

  // Emergency Lighting modal: fetch base price when modal opens (after options may have loaded)
  useEffect(() => {
    if (!emergencyLightingModalOpen) return;
    const apiToken = getApiToken();
    if (!apiToken) return;

    const setPriceFromResponse = (res: { data?: { price?: string | number | null } }) => {
      const p = res?.data?.price;
      if (p !== undefined && p !== null) {
        const displayPrice = typeof p === "string" ? p : typeof p === "number" ? p.toFixed(2) : String(p);
        setElBasePrice(displayPrice.replace(/[^0-9.]/g, "") || "");
      } else {
        setElBasePrice("");
      }
    };

    if (isAdmin && emergencyLightingModalProfessionalId) {
      const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
      if (professionalId) {
        getAdminEmergencyLightBasePrice(apiToken, professionalId)
          .then(setPriceFromResponse)
          .catch(() => setElBasePrice(""));
        return;
      }
    }

    getProfessionalEmergencyLightBasePrice(apiToken)
      .then(setPriceFromResponse)
      .catch(() => setElBasePrice(""));
  }, [emergencyLightingModalOpen, isAdmin, emergencyLightingModalProfessionalId]);

  // Emergency Lighting modal: when selections change, fetch single prices
  useEffect(() => {
    if (!emergencyLightingModalOpen || loadingElOptions) return;
    const apiToken = getApiToken();
    if (!apiToken) return;
    const findId = (v: string, opts: EmergencyLightServiceOptionItem[]) => {
      const val = (v ?? "").trim();
      if (!val || val === "no-data") return 0;
      const opt = opts.find((o) => (String(o.value ?? "").trim() || String(o.id)) === val);
      return opt?.id ?? 0;
    };
    const light_id = findId(elValue, elOptions);
    const floor_id = findId(elFloorValue, elFloorOptions);
    const light_type_id = findId(elTypeValue, elTypeOptions);
    const light_test_id = findId(elTestValue, elTestOptions);
    if (!light_id && !floor_id && !light_type_id && !light_test_id) return;

    const priceStr = (v: string | null | undefined) =>
      v != null && String(v).trim() !== "" ? String(v).trim() : "0.00";

    if (isAdmin && emergencyLightingModalProfessionalId) {
      const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
      if (professionalId) {
        getAdminEmergencyLightSinglePrices(
          apiToken,
          professionalId,
          light_id || 0,
          floor_id || 0,
          light_test_id || 0,
          light_type_id || 0
        )
          .then((res) => {
            if (!res?.data) return;
            const d = res.data;
            setElPrice(priceStr(d.light?.price));
            setElFloorPrice(priceStr(d.floor?.price));
            setElTypePrice(priceStr(d.light_type?.price));
            setElTestPrice(priceStr(d.light_test?.price));
          })
          .catch(() => {});
        return;
      }
    }

    getProfessionalEmergencyLightSinglePrices(apiToken, {
      light_id: light_id || 0,
      floor_id: floor_id || 0,
      light_type_id: light_type_id || 0,
      light_test_id: light_test_id || 0,
    })
      .then((res) => {
        if (!res?.data) return;
        const d = res.data;
        setElPrice(priceStr(d.light?.price));
        setElFloorPrice(priceStr(d.floor?.price));
        setElTypePrice(priceStr(d.light_type?.price));
        setElTestPrice(priceStr(d.light_test?.price));
      })
      .catch(() => {});
  }, [
    emergencyLightingModalOpen,
    loadingElOptions,
    isAdmin,
    emergencyLightingModalProfessionalId,
    elValue,
    elFloorValue,
    elTypeValue,
    elTestValue,
    elOptions,
    elFloorOptions,
    elTypeOptions,
    elTestOptions,
  ]);

  const elEstimatePrice = (
    (parseFloat(elBasePrice) || 0) +
    (parseFloat(elPrice) || 0) +
    (parseFloat(elFloorPrice) || 0) +
    (parseFloat(elTypePrice) || 0) +
    (parseFloat(elTestPrice) || 0)
  ).toFixed(2);

  const saveElFloorPriceNow = async () => {
    const token = getApiToken();
    if (!token) return;
    const opt = elFloorOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elFloorValue);
    if (!opt || !elFloorValue || elFloorValue === "no-data") return;
    const price = parseFloat(elFloorPrice) || 0;
    setSavingElFloorPrice(true);
    try {
      if (isAdmin && emergencyLightingModalProfessionalId) {
        const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
        if (professionalId) {
          await saveAdminEmergencyLightFloorPrice(token, professionalId, opt.id, price);
          setElUpdateMessage({ type: "success", text: "Professional emergency light floor price updated successfully by admin." });
          setLightTestingFetchKey((k) => k + 1);
          return;
        }
      }
      await saveProfessionalEmergencyLightFloorPrice(token, opt.id, price);
      setElUpdateMessage({ type: "success", text: "Floor price saved." });
    } catch {
      setElUpdateMessage({ type: "error", text: "Failed to save floor price." });
    } finally {
      setSavingElFloorPrice(false);
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

  const formatPrice = (price: string) => {
    const num = parseFloat(price || "0");
    return isNaN(num) ? "—" : `£${num.toFixed(2)}`;
  };

  const renderFraExpandedPrices = (pro: FraAllPricesProfessionalItem, selectedSystem: string) => {
    if (selectedSystem === "property_type") {
      return (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-2 px-3 font-medium text-gray-600">Option</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Base Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {pro.property_types.map((pt) => (
              <tr key={pt.id}>
                <td className="py-2 px-3 text-gray-900">{pt.property_type_name}</td>
                <td className="py-2 px-3 text-right font-medium">{formatPrice(pt.price)}</td>
              </tr>
            ))}
            {pro.property_types.length === 0 && (
              <tr>
                <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">
                  No property types configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }
    if (selectedSystem === "floor" || selectedSystem === "people" || selectedSystem === "duration") {
      const catalogSize =
        selectedSystem === "floor"
          ? fraFloorCatalogSize
          : selectedSystem === "people"
            ? fraPeopleCatalogSize
            : fraDurationCatalogSize;
      const { groups, emptyMessage } = getFraAdminPriceGroups(pro, selectedSystem, catalogSize, formatPrice);
      return <FraGroupedAddonList groups={groups} emptyMessage={emptyMessage} />;
    }
    return null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const container = pricingTabsScrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>('[data-state="active"]');
    activeEl?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [fraPriceTab]);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-[#0A1A2F] text-xl font-semibold mb-1">Pricing</h1>
        <p className="text-sm text-gray-500">
          {isAdmin
            ? "Property types, floors, people and durations by professional"
            : "Fire Risk Assessment base prices by property type"}
        </p>
      </div>

      <Tabs value={fraPriceTab} onValueChange={setFraPriceTab} className="w-full">
        {/* Mobile only: horizontal slider */}
        <div className="relative mb-4 -mx-4 px-4 min-w-0 md:hidden">
          <div
            ref={pricingTabsScrollRef}
            className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
            aria-label="Service categories"
          >
            <TabsList className="inline-flex h-auto min-w-0 gap-1.5 p-1.5 bg-gray-100 rounded-lg mb-0">
              {PRICING_SERVICE_TABS.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="shrink-0 whitespace-nowrap py-2.5 px-3 text-sm rounded-md font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600 cursor-pointer hover:bg-gray-200 data-[state=inactive]:text-gray-700"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10"
            style={{ background: "linear-gradient(to right, #fff 20%, transparent)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10"
            style={{ background: "linear-gradient(to left, #fff 20%, transparent)" }}
            aria-hidden
          />
        </div>

        {/* Medium & large: original layout (unchanged) */}
        <TabsList className="hidden md:flex w-full flex-wrap h-auto gap-1 p-1 bg-gray-100 rounded-lg mb-6">
          {PRICING_SERVICE_TABS.map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex-1 min-w-[120px] py-3 px-4 rounded-md font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600 cursor-pointer hover:bg-gray-200 data-[state=inactive]:text-gray-700"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="fra-price" className="mt-0">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="space-y-0 pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-1 min-w-0">
            <CardTitle className="text-[#0A1A2F]">
              {isAdmin ? "All professionals' FRA prices" : "FRA Base Prices"}
            </CardTitle>
            {!isAdmin && (
              <Button size="sm" className="shrink-0 w-fit" onClick={handleAddFraPrice}>
                <Plus className="w-4 h-4 mr-2" />
                Add FRA Price
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading FRA base price records...</p>
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

          {!isLoading && !error && isAdmin && fraAllPrices !== null && (
            <>
              {fraAllPrices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No professionals' FRA prices found.</div>
              ) : (
                <>
                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-gray-700 w-24">Reference</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700 min-w-0">Professional</th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">Systems</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {fraAllPrices.map((pro) => {
                        const selectedSystem = selectedSystemByPro[pro.professional_id] ?? "";
                        return (
                          <React.Fragment key={pro.professional_id}>
                            <tr className="bg-red-50 hover:bg-red-100/60 transition-colors">
                              <td className="p-4">
                                <p className="font-medium text-gray-900">BS-{pro.professional_id}</p>
                              </td>
                              <td className="p-4">
                                <p className="text-gray-900 font-normal">{pro.professional_name}</p>
                              </td>
                              <td className="p-4 min-w-0">
                                <div className="flex items-center gap-1 w-full">
                                  <Select
                                    value={selectedSystem}
                                    onValueChange={(value) => {
                                      setSelectedSystemByPro((prev) => ({
                                        ...prev,
                                        [pro.professional_id]: value,
                                      }));
                                      setFraExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                                    }}
                                  >
                                    <SelectTrigger className="flex-1 min-w-0 h-9 text-sm border-gray-200">
                                      <SelectValue
                                        placeholder="Select system"
                                        label={getSystemOptionLabel(selectedSystem, FRA_SYSTEM_OPTIONS)}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FRA_SYSTEM_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 border-gray-200"
                                    onClick={() =>
                                      setFraExpandedByPro((prev) => ({
                                        ...prev,
                                        [pro.professional_id]: !(prev[pro.professional_id] !== false),
                                      }))
                                    }
                                    aria-label={fraExpandedByPro[pro.professional_id] !== false ? "Minimize" : "Expand"}
                                  >
                                    {fraExpandedByPro[pro.professional_id] !== false ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronUp className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 border-gray-200"
                                    onClick={() => {
                                      setFraModalProfessionalId(String(pro.professional_id));
                                      setFraModalOpen(true);
                                    }}
                                    aria-label="Edit FRA prices"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {selectedSystem && fraExpandedByPro[pro.professional_id] !== false && (
                              <tr className="bg-white">
                                <td colSpan={3} className="p-0 align-top">
                                  <div className="bg-white px-4 pb-4 pt-1 w-full">
                                    <div className="rounded border border-gray-200 bg-white overflow-hidden w-full p-3">
                                      {renderFraExpandedPrices(pro, selectedSystem)}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {fraAllPrices.map((pro) => {
                    const selectedSystem = selectedSystemByPro[pro.professional_id] ?? "";
                    const expanded = fraExpandedByPro[pro.professional_id] !== false;
                    const catalogSize =
                      selectedSystem === "floor"
                        ? fraFloorCatalogSize
                        : selectedSystem === "people"
                          ? fraPeopleCatalogSize
                          : selectedSystem === "duration"
                            ? fraDurationCatalogSize
                            : 0;
                    const fraGroups =
                      selectedSystem === "floor" || selectedSystem === "people" || selectedSystem === "duration"
                        ? getFraAdminPriceGroups(pro, selectedSystem, catalogSize, formatPrice)
                        : null;
                    const flatRows = fraGroups ? null : getFraAdminPriceRows(pro, selectedSystem, formatPrice);
                    return (
                      <AdminProfessionalMobilePriceCard
                        key={pro.professional_id}
                        reference={`BS-${pro.professional_id}`}
                        professionalName={pro.professional_name}
                        systemOptions={FRA_SYSTEM_OPTIONS}
                        selectedSystem={selectedSystem}
                        onSystemChange={(value) => {
                          setSelectedSystemByPro((prev) => ({
                            ...prev,
                            [pro.professional_id]: value,
                          }));
                          setFraExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                        }}
                        expanded={expanded}
                        onToggleExpand={() =>
                          setFraExpandedByPro((prev) => ({
                            ...prev,
                            [pro.professional_id]: !(prev[pro.professional_id] !== false),
                          }))
                        }
                        onEdit={() => {
                          setFraModalProfessionalId(String(pro.professional_id));
                          setFraModalOpen(true);
                        }}
                        editAriaLabel="Edit FRA prices"
                      >
                        {fraGroups ? (
                          <FraGroupedAddonList groups={fraGroups.groups} emptyMessage={fraGroups.emptyMessage} />
                        ) : (
                          <AdminPriceOptionList rows={flatRows!.rows} emptyMessage={flatRows!.emptyMessage} />
                        )}
                      </AdminProfessionalMobilePriceCard>
                    );
                  })}
                </div>
                </>
              )}
            </>
          )}

          {!isLoading && !error && !isAdmin && records.length > 0 && (
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
                        Property Type
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">
                        Non‑Intrusive
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">
                        Intrusive
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
                          <p className="font-medium text-gray-900">FA-{record.id}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-900 font-medium">
                            {record.property_type?.property_type_name ?? "—"}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(record.non_intrusive_base_price)}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(record.intrusive_base_price)}
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
                      <p className="font-medium text-gray-900">
                        {record.property_type?.property_type_name ?? "—"}
                      </p>
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
                        <p className="text-xs text-gray-500">Non‑Intrusive</p>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(record.non_intrusive_base_price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Intrusive</p>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(record.intrusive_base_price)}
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

          {!isLoading && !error && !isAdmin && records.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No FRA base price records found</p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="fire-alarm" className="mt-0">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-[#0A1A2F]">
                All professionals' Fire Alarm prices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAlarmPrices && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading Fire Alarm prices...</p>
                </div>
              )}
              {!loadingAlarmPrices && errorAlarm && (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">{errorAlarm}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorAlarm(null);
                      setAlarmFetchKey((k) => k + 1);
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingAlarmPrices && !errorAlarm && isAdmin && alarmAllPrices !== null && (
                <>
                  {alarmAllPrices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No Fire Alarm prices found.</div>
                  ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full table-fixed">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 w-24">Reference</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 min-w-0">Professional</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Systems</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {alarmAllPrices.map((pro) => {
                            const selectedSystem = selectedAlarmSystemByPro[pro.professional_id] ?? "";
                            return (
                              <React.Fragment key={pro.professional_id}>
                                <tr className="bg-red-50 hover:bg-red-100/60 transition-colors">
                                  <td className="p-4">
                                    <p className="font-medium text-gray-900">BS-{pro.professional_id}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-gray-900 font-normal">{pro.professional_name}</p>
                                  </td>
                                  <td className="p-4 min-w-0">
                                    <div className="flex items-center gap-1 w-full">
                                      <Select
                                        value={selectedSystem}
                                        onValueChange={(value) => {
                                          setSelectedAlarmSystemByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: value,
                                          }));
                                          setAlarmExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                                        }}
                                      >
                                        <SelectTrigger className="flex-1 min-w-0 h-9 text-sm border-gray-200">
                                          <SelectValue
                                            placeholder="Select system"
                                            label={getSystemOptionLabel(selectedSystem, ALARM_SYSTEM_OPTIONS)}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ALARM_SYSTEM_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() =>
                                          setAlarmExpandedByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: !(prev[pro.professional_id] !== false),
                                          }))
                                        }
                                        aria-label={alarmExpandedByPro[pro.professional_id] !== false ? "Minimize" : "Expand"}
                                      >
                                        {alarmExpandedByPro[pro.professional_id] !== false ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronUp className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() => {
                                          setAlarmModalProfessionalId(String(pro.professional_id));
                                          setAlarmModalOpen(true);
                                        }}
                                        aria-label="Edit Fire Alarm prices"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                {selectedSystem && alarmExpandedByPro[pro.professional_id] !== false && (
                                  <tr className="bg-white">
                                    <td colSpan={3} className="p-0 align-top">
                                      <div className="bg-white px-4 pb-4 pt-1 w-full">
                                        <div className="rounded border border-gray-200 bg-white overflow-hidden w-full">
                                          <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                              <tr>
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Option</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Base Price</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                              {selectedSystem === "base_price" &&
                                                (pro.base_prices?.length
                                                  ? pro.base_prices.map((bp, idx) => (
                                                      <tr key={idx}>
                                                        <td className="py-2 px-3 text-gray-900">Base price</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(bp.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No base price configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "smoke_detectors" &&
                                                (pro.smoke_detectors?.length
                                                  ? pro.smoke_detectors.map((s) => (
                                                      <tr key={s.id}>
                                                        <td className="py-2 px-3 text-gray-900">{s.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(s.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No smoke detectors configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "call_points" &&
                                                (pro.call_points?.length
                                                  ? pro.call_points.map((c) => (
                                                      <tr key={c.id}>
                                                        <td className="py-2 px-3 text-gray-900">{c.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(c.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No call points configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "floors" &&
                                                (pro.floors?.length
                                                  ? pro.floors.map((f) => (
                                                      <tr key={f.id}>
                                                        <td className="py-2 px-3 text-gray-900">{f.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(f.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No floors configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "panels" &&
                                                (pro.panels?.length
                                                  ? pro.panels.map((p) => (
                                                      <tr key={p.id}>
                                                        <td className="py-2 px-3 text-gray-900">{p.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(p.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No panels configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "last_services" &&
                                                (pro.last_services?.length
                                                  ? pro.last_services.map((l) => (
                                                      <tr key={l.id}>
                                                        <td className="py-2 px-3 text-gray-900">{l.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(l.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No last services configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "system_types" &&
                                                (pro.system_types?.length
                                                  ? pro.system_types.map((st) => (
                                                      <tr key={st.id}>
                                                        <td className="py-2 px-3 text-gray-900">{st.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(st.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No system types configured</td>
                                                      </tr>
                                                    ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {alarmAllPrices.map((pro) => {
                        const selectedSystem = selectedAlarmSystemByPro[pro.professional_id] ?? "";
                        const expanded = alarmExpandedByPro[pro.professional_id] !== false;
                        const { rows, emptyMessage } = getAlarmAdminPriceRows(pro, selectedSystem, formatPrice);
                        return (
                          <AdminProfessionalMobilePriceCard
                            key={pro.professional_id}
                            reference={`BS-${pro.professional_id}`}
                            professionalName={pro.professional_name}
                            systemOptions={ALARM_SYSTEM_OPTIONS}
                            selectedSystem={selectedSystem}
                            onSystemChange={(value) => {
                              setSelectedAlarmSystemByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: value,
                              }));
                              setAlarmExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                            }}
                            expanded={expanded}
                            onToggleExpand={() =>
                              setAlarmExpandedByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: !(prev[pro.professional_id] !== false),
                              }))
                            }
                            onEdit={() => {
                              setAlarmModalProfessionalId(String(pro.professional_id));
                              setAlarmModalOpen(true);
                            }}
                            editAriaLabel="Edit Fire Alarm prices"
                          >
                            <AdminPriceOptionList rows={rows} emptyMessage={emptyMessage} />
                          </AdminProfessionalMobilePriceCard>
                        );
                      })}
                    </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="extinguishers" className="mt-0">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-[#0A1A2F]">All professionals' Extinguisher prices</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExtinguisherPrices && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading Extinguisher prices...</p>
                </div>
              )}
              {!loadingExtinguisherPrices && errorExtinguisher && (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">{errorExtinguisher}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorExtinguisher(null);
                      setExtinguisherFetchKey((k) => k + 1);
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingExtinguisherPrices && !errorExtinguisher && isAdmin && extinguisherAllPrices !== null && (
                <>
                  {extinguisherAllPrices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No Extinguisher prices found.</div>
                  ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full table-fixed">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 w-24">Reference</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 min-w-0">Professional</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Systems</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {extinguisherAllPrices.map((pro) => {
                            const selectedSystem = selectedExtinguisherSystemByPro[pro.professional_id] ?? "";
                            return (
                              <React.Fragment key={pro.professional_id}>
                                <tr className="bg-red-50 hover:bg-red-100/60 transition-colors">
                                  <td className="p-4">
                                    <p className="font-medium text-gray-900">BS-{pro.professional_id}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-gray-900 font-normal">{pro.professional_name}</p>
                                  </td>
                                  <td className="p-4 min-w-0">
                                    <div className="flex items-center gap-1 w-full">
                                      <Select
                                        value={selectedSystem}
                                        onValueChange={(value) => {
                                          setSelectedExtinguisherSystemByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: value,
                                          }));
                                          setExtinguisherExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                                        }}
                                      >
                                        <SelectTrigger className="flex-1 min-w-0 h-9 text-sm border-gray-200">
                                          <SelectValue
                                            placeholder="Select system"
                                            label={getSystemOptionLabel(selectedSystem, EXTINGUISHER_SYSTEM_OPTIONS)}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {EXTINGUISHER_SYSTEM_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() =>
                                          setExtinguisherExpandedByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: !(prev[pro.professional_id] !== false),
                                          }))
                                        }
                                        aria-label={extinguisherExpandedByPro[pro.professional_id] !== false ? "Minimize" : "Expand"}
                                      >
                                        {extinguisherExpandedByPro[pro.professional_id] !== false ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronUp className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() => {
                                          setExtinguisherModalProfessionalId(String(pro.professional_id));
                                          setExtinguisherModalOpen(true);
                                        }}
                                        aria-label="Edit Extinguisher prices"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                {selectedSystem && extinguisherExpandedByPro[pro.professional_id] !== false && (
                                  <tr className="bg-white">
                                    <td colSpan={3} className="p-0 align-top">
                                      <div className="bg-white px-4 pb-4 pt-1 w-full">
                                        <div className="rounded border border-gray-200 bg-white overflow-hidden w-full">
                                          <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                              <tr>
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Option</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Base Price</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {selectedSystem === "base_price" &&
                                                (pro.base_prices?.length
                                                  ? pro.base_prices.map((bp, idx) => (
                                                      <tr key={idx}>
                                                        <td className="py-2 px-3 text-gray-900">Base price</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(bp.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No base price configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "extinguishers" &&
                                                (pro.extinguishers?.length
                                                  ? pro.extinguishers.map((e) => (
                                                      <tr key={e.id}>
                                                        <td className="py-2 px-3 text-gray-900">{e.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(e.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No extinguishers configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "floors" &&
                                                (pro.floors?.length
                                                  ? pro.floors.map((f) => (
                                                      <tr key={f.id}>
                                                        <td className="py-2 px-3 text-gray-900">{f.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(f.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No floors configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "last_services" &&
                                                (pro.last_services?.length
                                                  ? pro.last_services.map((l) => (
                                                      <tr key={l.id}>
                                                        <td className="py-2 px-3 text-gray-900">{l.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(l.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No last services configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "extinguisher_types" &&
                                                (pro.extinguisher_types?.length
                                                  ? pro.extinguisher_types.map((et) => (
                                                      <tr key={et.id}>
                                                        <td className="py-2 px-3 text-gray-900">{et.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(et.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No extinguisher types configured</td>
                                                      </tr>
                                                    ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {extinguisherAllPrices.map((pro) => {
                        const selectedSystem = selectedExtinguisherSystemByPro[pro.professional_id] ?? "";
                        const expanded = extinguisherExpandedByPro[pro.professional_id] !== false;
                        const { rows, emptyMessage } = getExtinguisherAdminPriceRows(pro, selectedSystem, formatPrice);
                        return (
                          <AdminProfessionalMobilePriceCard
                            key={pro.professional_id}
                            reference={`BS-${pro.professional_id}`}
                            professionalName={pro.professional_name}
                            systemOptions={EXTINGUISHER_SYSTEM_OPTIONS}
                            selectedSystem={selectedSystem}
                            onSystemChange={(value) => {
                              setSelectedExtinguisherSystemByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: value,
                              }));
                              setExtinguisherExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                            }}
                            expanded={expanded}
                            onToggleExpand={() =>
                              setExtinguisherExpandedByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: !(prev[pro.professional_id] !== false),
                              }))
                            }
                            onEdit={() => {
                              setExtinguisherModalProfessionalId(String(pro.professional_id));
                              setExtinguisherModalOpen(true);
                            }}
                            editAriaLabel="Edit Extinguisher prices"
                          >
                            <AdminPriceOptionList rows={rows} emptyMessage={emptyMessage} />
                          </AdminProfessionalMobilePriceCard>
                        );
                      })}
                    </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="emergency-lighting" className="mt-0">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-[#0A1A2F]">All professionals' Emergency Lighting prices</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLightTestingPrices && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading Emergency Lighting prices...</p>
                </div>
              )}
              {!loadingLightTestingPrices && errorLightTesting && (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">{errorLightTesting}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorLightTesting(null);
                      setLightTestingFetchKey((k) => k + 1);
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingLightTestingPrices && !errorLightTesting && isAdmin && lightTestingAllPrices !== null && (
                <>
                  {lightTestingAllPrices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No Emergency Lighting prices found.</div>
                  ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full table-fixed">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 w-24">Reference</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 min-w-0">Professional</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Systems</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {lightTestingAllPrices.map((pro) => {
                            const selectedSystem = selectedLightTestingSystemByPro[pro.professional_id] ?? "";
                            return (
                              <React.Fragment key={pro.professional_id}>
                                <tr className="bg-red-50 hover:bg-red-100/60 transition-colors">
                                  <td className="p-4">
                                    <p className="font-medium text-gray-900">BS-{pro.professional_id}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-gray-900 font-normal">{pro.professional_name}</p>
                                  </td>
                                  <td className="p-4 min-w-0">
                                    <div className="flex items-center gap-1 w-full">
                                      <Select
                                        value={selectedSystem}
                                        onValueChange={(value) => {
                                          setSelectedLightTestingSystemByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: value,
                                          }));
                                          setLightTestingExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                                        }}
                                      >
                                        <SelectTrigger className="flex-1 min-w-0 h-9 text-sm border-gray-200">
                                          <SelectValue
                                            placeholder="Select system"
                                            label={getSystemOptionLabel(selectedSystem, EMERGENCY_LIGHT_SYSTEM_OPTIONS)}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {EMERGENCY_LIGHT_SYSTEM_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() =>
                                          setLightTestingExpandedByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: !(prev[pro.professional_id] !== false),
                                          }))
                                        }
                                        aria-label={lightTestingExpandedByPro[pro.professional_id] !== false ? "Minimize" : "Expand"}
                                      >
                                        {lightTestingExpandedByPro[pro.professional_id] !== false ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronUp className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() => {
                                          setEmergencyLightingModalProfessionalId(String(pro.professional_id));
                                          setEmergencyLightingModalOpen(true);
                                        }}
                                        aria-label="Edit Emergency Lighting prices"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                {selectedSystem && lightTestingExpandedByPro[pro.professional_id] !== false && (
                                  <tr className="bg-white">
                                    <td colSpan={3} className="p-0 align-top">
                                      <div className="bg-white px-4 pb-4 pt-1 w-full">
                                        <div className="rounded border border-gray-200 bg-white overflow-hidden w-full">
                                          <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                              <tr>
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Option</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Base Price</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {selectedSystem === "base_price" &&
                                                (pro.base_prices?.length
                                                  ? pro.base_prices.map((bp, idx) => (
                                                      <tr key={idx}>
                                                        <td className="py-2 px-3 text-gray-900">Base price</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(bp.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No base price configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "lights" &&
                                                (pro.lights?.length
                                                  ? pro.lights.map((e) => (
                                                      <tr key={e.id}>
                                                        <td className="py-2 px-3 text-gray-900">{e.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(e.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No lights configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "floors" &&
                                                (pro.floors?.length
                                                  ? pro.floors.map((f) => (
                                                      <tr key={f.id}>
                                                        <td className="py-2 px-3 text-gray-900">{f.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(f.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No floors configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "light_tests" &&
                                                (pro.light_tests?.length
                                                  ? pro.light_tests.map((l) => (
                                                      <tr key={l.id}>
                                                        <td className="py-2 px-3 text-gray-900">{l.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(l.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No light tests configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "light_types" &&
                                                (pro.light_types?.length
                                                  ? pro.light_types.map((lt) => (
                                                      <tr key={lt.id}>
                                                        <td className="py-2 px-3 text-gray-900">{lt.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(lt.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No light types configured</td>
                                                      </tr>
                                                    ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {lightTestingAllPrices.map((pro) => {
                        const selectedSystem = selectedLightTestingSystemByPro[pro.professional_id] ?? "";
                        const expanded = lightTestingExpandedByPro[pro.professional_id] !== false;
                        const { rows, emptyMessage } = getEmergencyLightAdminPriceRows(pro, selectedSystem, formatPrice);
                        return (
                          <AdminProfessionalMobilePriceCard
                            key={pro.professional_id}
                            reference={`BS-${pro.professional_id}`}
                            professionalName={pro.professional_name}
                            systemOptions={EMERGENCY_LIGHT_SYSTEM_OPTIONS}
                            selectedSystem={selectedSystem}
                            onSystemChange={(value) => {
                              setSelectedLightTestingSystemByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: value,
                              }));
                              setLightTestingExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                            }}
                            expanded={expanded}
                            onToggleExpand={() =>
                              setLightTestingExpandedByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: !(prev[pro.professional_id] !== false),
                              }))
                            }
                            onEdit={() => {
                              setEmergencyLightingModalProfessionalId(String(pro.professional_id));
                              setEmergencyLightingModalOpen(true);
                            }}
                            editAriaLabel="Edit Emergency Lighting prices"
                          >
                            <AdminPriceOptionList rows={rows} emptyMessage={emptyMessage} />
                          </AdminProfessionalMobilePriceCard>
                        );
                      })}
                    </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="training" className="mt-0">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#0A1A2F]">All professionals' Training (Marshal) prices</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMarshalPrices && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading Training prices...</p>
                </div>
              )}
              {!loadingMarshalPrices && errorMarshal && (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">{errorMarshal}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMarshal(null);
                      setMarshalFetchKey((k) => k + 1);
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingMarshalPrices && !errorMarshal && isAdmin && marshalAllPrices !== null && (
                <>
                  {marshalAllPrices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No Training (Marshal) prices found.</div>
                  ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full table-fixed">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 w-24">Reference</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 min-w-0">Professional</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Systems</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {marshalAllPrices.map((pro) => {
                            const selectedSystem = selectedMarshalSystemByPro[pro.professional_id] ?? "";
                            return (
                              <React.Fragment key={pro.professional_id}>
                                <tr className="bg-red-50 hover:bg-red-100/60 transition-colors">
                                  <td className="p-4">
                                    <p className="font-medium text-gray-900">BS-{pro.professional_id}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-gray-900 font-normal">{pro.professional_name}</p>
                                  </td>
                                  <td className="p-4 min-w-0">
                                    <div className="flex items-center gap-1 w-full">
                                      <Select
                                        value={selectedSystem}
                                        onValueChange={(value) => {
                                          setSelectedMarshalSystemByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: value,
                                          }));
                                          setMarshalExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                                        }}
                                      >
                                        <SelectTrigger className="flex-1 min-w-0 h-9 text-sm border-gray-200">
                                          <SelectValue
                                            placeholder="Select system"
                                            label={getSystemOptionLabel(selectedSystem, TRAINING_SYSTEM_OPTIONS)}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {TRAINING_SYSTEM_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="outline" 
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200" 
                                        onClick={() =>
                                          setMarshalExpandedByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: !(prev[pro.professional_id] !== false),
                                          }))
                                        }
                                        aria-label={marshalExpandedByPro[pro.professional_id] !== false ? "Minimize" : "Expand"}
                                      >
                                        {marshalExpandedByPro[pro.professional_id] !== false ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronUp className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() => {
                                          setTrainingModalProfessionalId(String(pro.professional_id));
                                          setTrainingPricingModalOpen(true);
                                        }}
                                        aria-label="Edit Training (Marshal) prices"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                {selectedSystem && marshalExpandedByPro[pro.professional_id] !== false && (
                                  <tr className="bg-white">
                                    <td colSpan={3} className="p-0 align-top">
                                      <div className="bg-white px-4 pb-4 pt-1 w-full">
                                        <div className="rounded border border-gray-200 bg-white overflow-hidden w-full">
                                          <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                              <tr>
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Option</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Price</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {selectedSystem === "base_price" &&
                                                (pro.base_prices?.length
                                                  ? pro.base_prices.map((bp, idx) => (
                                                      <tr key={idx}>
                                                        <td className="py-2 px-3 text-gray-900">Base price</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(bp.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No base price configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "people" &&
                                                (pro.people?.length
                                                  ? pro.people.map((e) => (
                                                      <tr key={e.id}>
                                                        <td className="py-2 px-3 text-gray-900">{e.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(e.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No people configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "places" &&
                                                (pro.places?.length
                                                  ? pro.places.map((f) => (
                                                      <tr key={f.id}>
                                                        <td className="py-2 px-3 text-gray-900">{f.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(f.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No places configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "training_on" &&
                                                (pro.training_on?.length
                                                  ? pro.training_on.map((t) => (
                                                      <tr key={t.id}>
                                                        <td className="py-2 px-3 text-gray-900">{t.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(t.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No training on configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "experience" &&
                                                (pro.experience?.length
                                                  ? pro.experience.map((exp) => (
                                                      <tr key={exp.id}>
                                                        <td className="py-2 px-3 text-gray-900">{exp.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(exp.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No experience configured</td>
                                                      </tr>
                                                    ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {marshalAllPrices.map((pro) => {
                        const selectedSystem = selectedMarshalSystemByPro[pro.professional_id] ?? "";
                        const expanded = marshalExpandedByPro[pro.professional_id] !== false;
                        const { rows, emptyMessage } = getTrainingAdminPriceRows(pro, selectedSystem, formatPrice);
                        return (
                          <AdminProfessionalMobilePriceCard
                            key={pro.professional_id}
                            reference={`BS-${pro.professional_id}`}
                            professionalName={pro.professional_name}
                            systemOptions={TRAINING_SYSTEM_OPTIONS}
                            selectedSystem={selectedSystem}
                            onSystemChange={(value) => {
                              setSelectedMarshalSystemByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: value,
                              }));
                              setMarshalExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                            }}
                            expanded={expanded}
                            onToggleExpand={() =>
                              setMarshalExpandedByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: !(prev[pro.professional_id] !== false),
                              }))
                            }
                            onEdit={() => {
                              setTrainingModalProfessionalId(String(pro.professional_id));
                              setTrainingPricingModalOpen(true);
                            }}
                            editAriaLabel="Edit Training prices"
                          >
                            <AdminPriceOptionList rows={rows} emptyMessage={emptyMessage} />
                          </AdminProfessionalMobilePriceCard>
                        );
                      })}
                    </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consultancy" className="mt-0">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#0A1A2F]">All professionals' Consultation prices</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConsultationPrices && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading Consultation prices...</p>
                </div>
              )}
              {!loadingConsultationPrices && errorConsultation && (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">{errorConsultation}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorConsultation(null);
                      setConsultationFetchKey((k) => k + 1);
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingConsultationPrices && !errorConsultation && isAdmin && consultationAllPrices !== null && (
                <>
                  {consultationAllPrices.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No Consultation prices found.</div>
                  ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full table-fixed">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 w-24">Reference</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700 min-w-0">Professional</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Systems</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {consultationAllPrices.map((pro) => {
                            const selectedSystem = selectedConsultationSystemByPro[pro.professional_id] ?? "";
                            return (
                              <React.Fragment key={pro.professional_id}>
                                <tr className="bg-red-50 hover:bg-red-100/60 transition-colors">
                                  <td className="p-4">
                                    <p className="font-medium text-gray-900">BS-{pro.professional_id}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-gray-900 font-normal">{pro.professional_name}</p>
                                  </td>
                                  <td className="p-4 min-w-0">
                                    <div className="flex items-center gap-1 w-full">
                                      <Select
                                        value={selectedSystem}
                                        onValueChange={(value) => {
                                          setSelectedConsultationSystemByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: value,
                                          }));
                                          setConsultationExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                                        }}
                                      >
                                        <SelectTrigger className="flex-1 min-w-0 h-9 text-sm border-gray-200">
                                          <SelectValue
                                            placeholder="Select system"
                                            label={getSystemOptionLabel(selectedSystem, CONSULTATION_SYSTEM_OPTIONS)}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CONSULTATION_SYSTEM_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() =>
                                          setConsultationExpandedByPro((prev) => ({
                                            ...prev,
                                            [pro.professional_id]: !(prev[pro.professional_id] !== false),
                                          }))
                                        }
                                        aria-label={consultationExpandedByPro[pro.professional_id] !== false ? "Minimize" : "Expand"}
                                      >
                                        {consultationExpandedByPro[pro.professional_id] !== false ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronUp className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0 border-gray-200"
                                        onClick={() => {
                                          setConsultancyModalProfessionalId(String(pro.professional_id));
                                          setConsultationPricingModalOpen(true);
                                        }}
                                        aria-label="Edit consultation prices"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                {selectedSystem && consultationExpandedByPro[pro.professional_id] !== false && (
                                  <tr className="bg-white">
                                    <td colSpan={3} className="p-0 align-top">
                                      <div className="bg-white px-4 pb-4 pt-1 w-full">
                                        <div className="rounded border border-gray-200 bg-white overflow-hidden w-full">
                                          <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                              <tr>
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Option</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Price</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {selectedSystem === "base_price" &&
                                                (pro.base_price?.length
                                                  ? pro.base_price.map((bp, idx) => (
                                                      <tr key={idx}>
                                                        <td className="py-2 px-3 text-gray-900">Base price</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(bp.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No base price configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "modes" &&
                                                (pro.modes?.length
                                                  ? pro.modes.map((m, idx) => (
                                                      <tr key={idx}>
                                                        <td className="py-2 px-3 text-gray-900">{m.value ?? `Mode ${idx + 1}`}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(m.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No modes configured</td>
                                                      </tr>
                                                    ))}
                                              {selectedSystem === "hours" &&
                                                (pro.hours?.length
                                                  ? pro.hours.map((h) => (
                                                      <tr key={h.id}>
                                                        <td className="py-2 px-3 text-gray-900">{h.value}</td>
                                                        <td className="py-2 px-3 text-right font-medium">{formatPrice(h.price)}</td>
                                                      </tr>
                                                    ))
                                                  : (
                                                      <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-gray-500 text-center">No hours configured</td>
                                                      </tr>
                                                    ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden space-y-3">
                      {consultationAllPrices.map((pro) => {
                        const selectedSystem = selectedConsultationSystemByPro[pro.professional_id] ?? "";
                        const expanded = consultationExpandedByPro[pro.professional_id] !== false;
                        const { rows, emptyMessage } = getConsultationAdminPriceRows(pro, selectedSystem, formatPrice);
                        return (
                          <AdminProfessionalMobilePriceCard
                            key={pro.professional_id}
                            reference={`BS-${pro.professional_id}`}
                            professionalName={pro.professional_name}
                            systemOptions={CONSULTATION_SYSTEM_OPTIONS}
                            selectedSystem={selectedSystem}
                            onSystemChange={(value) => {
                              setSelectedConsultationSystemByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: value,
                              }));
                              setConsultationExpandedByPro((prev) => ({ ...prev, [pro.professional_id]: true }));
                            }}
                            expanded={expanded}
                            onToggleExpand={() =>
                              setConsultationExpandedByPro((prev) => ({
                                ...prev,
                                [pro.professional_id]: !(prev[pro.professional_id] !== false),
                              }))
                            }
                            onEdit={() => {
                              setConsultancyModalProfessionalId(String(pro.professional_id));
                              setConsultationPricingModalOpen(true);
                            }}
                            editAriaLabel="Edit consultation prices"
                          >
                            <AdminPriceOptionList rows={rows} emptyMessage={emptyMessage} />
                          </AdminProfessionalMobilePriceCard>
                        );
                      })}
                    </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            <DialogTitle className="text-xl text-[#0A1A2F]">FRA Base Price Details</DialogTitle>
          </DialogHeader>
          {detailsData && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-medium text-gray-900">FA-{detailsData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Property Type</p>
                  <p className="font-medium text-gray-900">
                    {detailsData.property_type?.property_type_name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Non‑Intrusive Base Price</p>
                  <p className="font-semibold text-gray-900">
                    {formatPrice(detailsData.non_intrusive_base_price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Intrusive Base Price</p>
                  <p className="font-semibold text-gray-900">
                    {formatPrice(detailsData.intrusive_base_price)}
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
            <DialogTitle className="text-xl text-[#0A1A2F]">Update FRA Base Price</DialogTitle>
          </DialogHeader>
          {updateRecord && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <p className="text-sm font-medium text-gray-900">
                  {updateRecord.property_type?.property_type_name ?? "—"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-non-intrusive">Non‑Intrusive Base Price (£)</Label>
                <Input
                  id="update-non-intrusive"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={updateNonIntrusive}
                  onChange={(e) => setUpdateNonIntrusive(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-intrusive">Intrusive Base Price (£)</Label>
                <Input
                  id="update-intrusive"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={updateIntrusive}
                  onChange={(e) => setUpdateIntrusive(e.target.value)}
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
            <DialogTitle className="text-xl text-[#0A1A2F]">Delete FRA Base Price</DialogTitle>
          </DialogHeader>
          {deleteRecord && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete the FRA base price for{" "}
                <span className="font-semibold">{deleteRecord.property_type?.property_type_name ?? "—"}</span>{" "}
                (Non‑intrusive: {formatPrice(deleteRecord.non_intrusive_base_price)}, Intrusive: {formatPrice(deleteRecord.intrusive_base_price)})?
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

      {/* Add FRA Price Modal */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) setAddError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Add FRA Base Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-property-type">Property Type</Label>
              <Select value={addPropertyTypeId} onValueChange={setAddPropertyTypeId}>
                <SelectTrigger id="add-property-type">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {addPropertyTypesList.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.property_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-non-intrusive">Non‑Intrusive Base Price (£)</Label>
              <Input
                id="add-non-intrusive"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addNonIntrusive}
                onChange={(e) => setAddNonIntrusive(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-intrusive">Intrusive Base Price (£)</Label>
              <Input
                id="add-intrusive"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addIntrusive}
                onChange={(e) => setAddIntrusive(e.target.value)}
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

      {/* Consultancy Pricing Modal – opened from edit icon on "All professionals' Consultation prices" card */}
      <Dialog open={consultationPricingModalOpen} onOpenChange={setConsultationPricingModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="flex-shrink-0 w-full bg-gradient-to-r from-red-50 to-orange-50 border-b">
            <div className="pl-4 pr-12 pt-6 pb-4 md:pl-8 md:pr-14">
              <DialogTitle className="text-lg text-[#0A1A2F] font-semibold">
                Consultancy Pricing
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Consultancy services
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
            <div className="space-y-4 md:space-y-6 w-full">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Consultation</Label>
                  <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                    Consultation
                  </div>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="admin-modal-consultancy-base-price" className="text-gray-700 font-medium">
                    Base Price (£)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="admin-modal-consultancy-base-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={consultancyBasePrice}
                      onChange={(e) =>
                        setConsultancyBasePrice(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const price = parseFloat(consultancyBasePrice) || 0;
                        if (isAdmin && consultancyModalProfessionalId) {
                          const professionalId = parseInt(consultancyModalProfessionalId, 10);
                          if (!professionalId) return;
                          try {
                            await saveAdminConsultationBasePrice(token, professionalId, price);
                            setConsultancyUpdateMessage({ type: "success", text: "Consultation base price updated successfully by admin." });
                            setConsultationFetchKey((k) => k + 1);
                          } catch {
                            setConsultancyUpdateMessage({ type: "error", text: "Failed to save consultation base price." });
                          }
                          return;
                        }
                        try {
                          await saveProfessionalConsultationBasePrice(token, price);
                          setConsultancyUpdateMessage({ type: "success", text: "Consultation base price saved successfully." });
                        } catch {
                          setConsultancyUpdateMessage({ type: "error", text: "Failed to save consultation base price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-nowrap items-center gap-2 md:gap-4 w-full">
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
                <span className="flex-shrink-0 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Addon Price
                </span>
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                  <Label className="text-gray-700 font-medium whitespace-nowrap">Select Consultation Model</Label>
                  <Select value={consultancyModelValue} onValueChange={setConsultancyModelValue}>
                    <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      {(() => {
                        const label = consultancyModelOptions.find((o) => String(o.id) === consultancyModelValue)?.value;
                        return label ? label : <SelectValue placeholder={loadingConsultationOptions ? "Loading..." : "Select consultation model"} />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {consultancyModelOptions.length === 0 && !loadingConsultationOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        consultancyModelOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>
                            {opt.value}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="admin-modal-consultancy-model-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="admin-modal-consultancy-model-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={consultancyModelPrice}
                      onChange={(e) =>
                        setConsultancyModelPrice(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const modeId = consultancyModelValue ? parseInt(consultancyModelValue, 10) : 0;
                        if (!modeId || consultancyModelValue === "no-data") return;
                        const price = parseFloat(consultancyModelPrice) || 0;
                        try {
                          if (isAdmin && consultancyModalProfessionalId) {
                            const professionalId = parseInt(consultancyModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminConsultationModePrice(token, professionalId, modeId, price);
                              setConsultancyUpdateMessage({ type: "success", text: "Consultation mode price updated successfully by admin." });
                              setConsultationFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalConsultationModePrice(token, modeId, price);
                          setConsultancyUpdateMessage({ type: "success", text: "Consultation model price saved successfully." });
                        } catch {
                          setConsultancyUpdateMessage({ type: "error", text: "Failed to save consultation model price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                  <Label className="text-gray-700 font-medium whitespace-nowrap">Select Consultation Hours</Label>
                  <Select value={consultancyHoursValue} onValueChange={setConsultancyHoursValue}>
                    <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      {(() => {
                        const label = consultancyHoursOptions.find((o) => String(o.id) === consultancyHoursValue)?.value;
                        return label ? label : <SelectValue placeholder={loadingConsultationOptions ? "Loading..." : "Select consultation hours"} />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {consultancyHoursOptions.length === 0 && !loadingConsultationOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        consultancyHoursOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>
                            {opt.value}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="admin-modal-consultancy-hours-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="admin-modal-consultancy-hours-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={consultancyHoursPrice}
                      onChange={(e) =>
                        setConsultancyHoursPrice(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const hourId = consultancyHoursValue ? parseInt(consultancyHoursValue, 10) : 0;
                        if (!hourId || consultancyHoursValue === "no-data") return;
                        const price = parseFloat(consultancyHoursPrice) || 0;
                        try {
                          if (isAdmin && consultancyModalProfessionalId) {
                            const professionalId = parseInt(consultancyModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminConsultationHourPrice(token, professionalId, hourId, price);
                              setConsultancyUpdateMessage({ type: "success", text: "Consultation hour price updated successfully by admin." });
                              setConsultationFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalConsultationHourPrice(token, hourId, price);
                          setConsultancyUpdateMessage({ type: "success", text: "Consultation hours price saved successfully." });
                        } catch {
                          setConsultancyUpdateMessage({ type: "error", text: "Failed to save consultation hours price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label htmlFor="admin-modal-consultancy-estimate-price" className="text-gray-700 font-medium">
                    Estimated Price(£)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                    <Input
                      id="admin-modal-consultancy-estimate-price"
                      type="text"
                      readOnly
                      placeholder="0.00"
                      value={consultancyEstimatePrice}
                      className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
              </div>

            </div>
          </div>
          <div className="flex-shrink-0 border-t bg-gray-50 px-4 md:px-8 py-4 flex flex-col gap-3">
            {consultancyUpdateMessage && (
              <p
                className={`text-sm ${
                  consultancyUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {consultancyUpdateMessage.text}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={async () => {
                  setConsultancyUpdateMessage(null);
                  const token = getApiToken();
                  if (!token) {
                    setConsultancyUpdateMessage({ type: "error", text: "Please log in to update prices." });
                    return;
                  }
                  if (isAdmin && !consultancyModalProfessionalId) {
                    setConsultancyUpdateMessage({ type: "error", text: "Please select a professional." });
                    return;
                  }
                  setUpdatingConsultancyPrice(true);
                  try {
                    const price = parseFloat(consultancyBasePrice) || 0;
                    if (isAdmin && consultancyModalProfessionalId) {
                      const professionalId = parseInt(consultancyModalProfessionalId, 10);
                      await saveAdminConsultationBasePrice(token, professionalId, price);
                      setConsultancyUpdateMessage({ type: "success", text: "Consultation base price updated successfully by admin." });
                      setConsultationFetchKey((k) => k + 1);
                    } else {
                      setConsultancyUpdateMessage({ type: "success", text: "Price updated successfully." });
                    }
                  } catch {
                    setConsultancyUpdateMessage({ type: "error", text: "Failed to update price." });
                  } finally {
                    setUpdatingConsultancyPrice(false);
                  }
                }}
                disabled={updatingConsultancyPrice}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70 uppercase"
              >
                {updatingConsultancyPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Updating...
                  </>
                ) : (
                  "Update Price"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Training Pricing Modal – scrollable body + sticky footer (same as Fire Alarm) */}
      <Dialog open={trainingPricingModalOpen} onOpenChange={setTrainingPricingModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="flex-shrink-0 w-full bg-gradient-to-r from-red-50 to-orange-50 border-b">
            <div className="pl-4 pr-12 pt-6 pb-4 md:pl-8 md:pr-14">
              <DialogTitle className="text-lg text-[#0A1A2F] font-semibold">
                Training Pricing
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Training services
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
            <div className="space-y-4 md:space-y-6 w-full max-w-4xl">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Professional Marshal</Label>
                  <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                    Professional Marshal
                  </div>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-training-base-price" className="text-gray-700 font-medium">Base Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-training-base-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={trainingBasePrice}
                      onChange={(e) => setTrainingBasePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const price = parseFloat(trainingBasePrice) || 0;
                        try {
                          if (isAdmin && trainingModalProfessionalId) {
                            const professionalId = parseInt(trainingModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminMarshalBasePrice(token, professionalId, price);
                              setTrainingUpdateMessage({ type: "success", text: "Marshal base price updated successfully by admin." });
                              setMarshalFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalMarshalBasePrice(token, price);
                          setTrainingUpdateMessage({ type: "success", text: "Base price saved successfully." });
                        } catch {
                          setTrainingUpdateMessage({ type: "error", text: "Failed to save base price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-nowrap items-center gap-2 md:gap-4 w-full">
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
                <span className="flex-shrink-0 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Addon Price
                </span>
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select People</Label>
                  <Select value={trainingPeopleValue} onValueChange={setTrainingPeopleValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingTrainingOptions ? "Loading..." : "Select People"}
                        label={String(
                          trainingPeopleOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (trainingPeopleValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {trainingPeopleOptions.length === 0 && !loadingTrainingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        trainingPeopleOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-training-people-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-training-people-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={trainingPeoplePrice}
                      onChange={(e) => setTrainingPeoplePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const peopleOpt = trainingPeopleOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPeopleValue);
                        if (!peopleOpt || !trainingPeopleValue || trainingPeopleValue === "no-data") return;
                        const price = parseFloat(trainingPeoplePrice) || 0;
                        try {
                          if (isAdmin && trainingModalProfessionalId) {
                            const professionalId = parseInt(trainingModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminMarshalPeoplePrice(token, professionalId, peopleOpt.id, price);
                              setTrainingUpdateMessage({ type: "success", text: "Marshal People price updated successfully by admin." });
                              setMarshalFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalMarshalPeoplePrice(token, peopleOpt.id, price);
                          setTrainingUpdateMessage({ type: "success", text: "People price saved." });
                        } catch {
                          setTrainingUpdateMessage({ type: "error", text: "Failed to save people price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                  <Label className="text-gray-700 font-medium whitespace-nowrap">Select Place</Label>
                  <Select value={trainingPlaceValue} onValueChange={setTrainingPlaceValue}>
                    <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingTrainingOptions ? "Loading..." : "Select Place"}
                        label={String(
                          trainingPlaceOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (trainingPlaceValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {trainingPlaceOptions.length === 0 && !loadingTrainingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        trainingPlaceOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-training-place-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-training-place-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={trainingPlacePrice}
                      onChange={(e) => setTrainingPlacePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const placeOpt = trainingPlaceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPlaceValue);
                        if (!placeOpt || !trainingPlaceValue || trainingPlaceValue === "no-data") return;
                        const price = parseFloat(trainingPlacePrice) || 0;
                        try {
                          if (isAdmin && trainingModalProfessionalId) {
                            const professionalId = parseInt(trainingModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminMarshalPlacePrice(token, professionalId, placeOpt.id, price);
                              setTrainingUpdateMessage({ type: "success", text: "Marshal Place price updated successfully by admin." });
                              setMarshalFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalMarshalPlacePrice(token, placeOpt.id, price);
                          setTrainingUpdateMessage({ type: "success", text: "Place price saved." });
                        } catch {
                          setTrainingUpdateMessage({ type: "error", text: "Failed to save place price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                  <Label className="text-gray-700 font-medium whitespace-nowrap">Select Training On</Label>
                  <Select value={trainingTrainingValue} onValueChange={setTrainingTrainingValue}>
                    <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingTrainingOptions ? "Loading..." : "Select Training"}
                        label={String(
                          trainingTrainingOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (trainingTrainingValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {trainingTrainingOptions.length === 0 && !loadingTrainingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        trainingTrainingOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-training-training-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-training-training-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={trainingTrainingPrice}
                      onChange={(e) => setTrainingTrainingPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const trainingOnOpt = trainingTrainingOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingTrainingValue);
                        if (!trainingOnOpt || !trainingTrainingValue || trainingTrainingValue === "no-data") return;
                        const price = parseFloat(trainingTrainingPrice) || 0;
                        try {
                          if (isAdmin && trainingModalProfessionalId) {
                            const professionalId = parseInt(trainingModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminMarshalTrainingOnPrice(token, professionalId, trainingOnOpt.id, price);
                              setTrainingUpdateMessage({ type: "success", text: "Marshal Training On price updated successfully by admin." });
                              setMarshalFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalMarshalTrainingOnPrice(token, trainingOnOpt.id, price);
                          setTrainingUpdateMessage({ type: "success", text: "Training On price saved." });
                        } catch {
                          setTrainingUpdateMessage({ type: "error", text: "Failed to save Training On price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Experience</Label>
                  <Select value={trainingExperienceValue} onValueChange={setTrainingExperienceValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingTrainingOptions ? "Loading..." : "Select Experience"}
                        label={String(
                          trainingExperienceOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (trainingExperienceValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {trainingExperienceOptions.length === 0 && !loadingTrainingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        trainingExperienceOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-training-experience-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-training-experience-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={trainingExperiencePrice}
                      onChange={(e) => setTrainingExperiencePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const experienceOpt = trainingExperienceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingExperienceValue);
                        if (!experienceOpt || !trainingExperienceValue || trainingExperienceValue === "no-data") return;
                        const price = parseFloat(trainingExperiencePrice) || 0;
                        try {
                          if (isAdmin && trainingModalProfessionalId) {
                            const professionalId = parseInt(trainingModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminMarshalExperiencePrice(token, professionalId, experienceOpt.id, price);
                              setTrainingUpdateMessage({ type: "success", text: "Marshal Experience price updated successfully by admin." });
                              setMarshalFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalMarshalExperiencePrice(token, experienceOpt.id, price);
                          setTrainingUpdateMessage({ type: "success", text: "Experience price saved." });
                        } catch {
                          setTrainingUpdateMessage({ type: "error", text: "Failed to save experience price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label htmlFor="modal-training-estimate-price" className="text-gray-700 font-medium">Estimated Price(£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                    <Input
                      id="modal-training-estimate-price"
                      type="text"
                      readOnly
                      placeholder="0.00"
                      value={trainingEstimatePrice}
                      className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
              </div>

            </div>
          </div>
          <div className="flex-shrink-0 border-t bg-gray-50 px-4 md:px-8 py-4 flex flex-col gap-3">
            {trainingUpdateMessage && (
              <p className={`text-sm ${trainingUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {trainingUpdateMessage.text}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={async () => {
                  setTrainingUpdateMessage(null);
                  const token = getApiToken();
                  if (!token) {
                    setTrainingUpdateMessage({ type: "error", text: "Please log in to update prices." });
                    return;
                  }
                  setUpdatingTrainingPrice(true);
                  try {
                    const basePrice = parseFloat(trainingBasePrice) || 0;
                    if (isAdmin && trainingModalProfessionalId) {
                      const professionalId = parseInt(trainingModalProfessionalId, 10);
                      if (professionalId) {
                        await saveAdminMarshalBasePrice(token, professionalId, basePrice);
                        setMarshalFetchKey((k) => k + 1);
                      }
                    } else {
                      await saveProfessionalMarshalBasePrice(token, basePrice);
                    }
                    const peopleOpt = trainingPeopleOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPeopleValue);
                    if (peopleOpt && trainingPeopleValue && trainingPeopleValue !== "no-data") {
                      const peoplePriceVal = parseFloat(trainingPeoplePrice) || 0;
                      if (isAdmin && trainingModalProfessionalId) {
                        const professionalId = parseInt(trainingModalProfessionalId, 10);
                        if (professionalId) await saveAdminMarshalPeoplePrice(token, professionalId, peopleOpt.id, peoplePriceVal);
                      } else {
                        await saveProfessionalMarshalPeoplePrice(token, peopleOpt.id, peoplePriceVal);
                      }
                    }
                    const placeOpt = trainingPlaceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPlaceValue);
                    if (placeOpt && trainingPlaceValue && trainingPlaceValue !== "no-data") {
                      const placePriceVal = parseFloat(trainingPlacePrice) || 0;
                      if (isAdmin && trainingModalProfessionalId) {
                        const professionalId = parseInt(trainingModalProfessionalId, 10);
                        if (professionalId) await saveAdminMarshalPlacePrice(token, professionalId, placeOpt.id, placePriceVal);
                      } else {
                        await saveProfessionalMarshalPlacePrice(token, placeOpt.id, placePriceVal);
                      }
                    }
                    const trainingOnOpt = trainingTrainingOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingTrainingValue);
                    if (trainingOnOpt && trainingTrainingValue && trainingTrainingValue !== "no-data") {
                      const trainingOnPriceVal = parseFloat(trainingTrainingPrice) || 0;
                      if (isAdmin && trainingModalProfessionalId) {
                        const professionalId = parseInt(trainingModalProfessionalId, 10);
                        if (professionalId) await saveAdminMarshalTrainingOnPrice(token, professionalId, trainingOnOpt.id, trainingOnPriceVal);
                      } else {
                        await saveProfessionalMarshalTrainingOnPrice(token, trainingOnOpt.id, trainingOnPriceVal);
                      }
                    }
                    const experienceOpt = trainingExperienceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === trainingExperienceValue);
                    if (experienceOpt && trainingExperienceValue && trainingExperienceValue !== "no-data") {
                      const experiencePriceVal = parseFloat(trainingExperiencePrice) || 0;
                      if (isAdmin && trainingModalProfessionalId) {
                        const professionalId = parseInt(trainingModalProfessionalId, 10);
                        if (professionalId) await saveAdminMarshalExperiencePrice(token, professionalId, experienceOpt.id, experiencePriceVal);
                      } else {
                        await saveProfessionalMarshalExperiencePrice(token, experienceOpt.id, experiencePriceVal);
                      }
                    }
                    setTrainingUpdateMessage({ type: "success", text: "Price updated successfully." });
                  } catch {
                    setTrainingUpdateMessage({ type: "error", text: "Failed to update price." });
                  } finally {
                    setUpdatingTrainingPrice(false);
                  }
                }}
                disabled={updatingTrainingPrice}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
              >
                {updatingTrainingPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Updating...
                  </>
                ) : (
                  "Update Price"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extinguisher Pricing Modal – scrollable body + sticky footer (same as Fire Alarm) */}
      <Dialog open={extinguisherModalOpen} onOpenChange={setExtinguisherModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="flex-shrink-0 w-full bg-gradient-to-r from-red-50 to-orange-50 border-b">
            <div className="pl-4 pr-12 pt-6 pb-4 md:pl-8 md:pr-14">
              <DialogTitle className="text-lg text-[#0A1A2F] font-semibold">
                Fire Extinguisher Pricing
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Fire Extinguisher services
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
            <div className="space-y-4 md:space-y-6 w-full max-w-4xl">
              {/* Row 1: Fire Extinguisher Service – Base price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Fire Extinguisher Service</Label>
                  <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                    Fire Extinguisher Service
                  </div>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-ex-base-price" className="text-gray-700 font-medium">Base Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-ex-base-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={exBasePrice}
                      onChange={(e) => setExBasePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const price = parseFloat(exBasePrice) || 0;
                        try {
                          if (isAdmin && extinguisherModalProfessionalId) {
                            const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminExtinguisherBasePrice(token, professionalId, price);
                              setExUpdateMessage({ type: "success", text: "Extinguisher base price updated successfully by admin." });
                              setExtinguisherFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalExtinguisherBasePrice(token, price);
                          setExUpdateMessage({ type: "success", text: "Base price saved." });
                        } catch {
                          setExUpdateMessage({ type: "error", text: "Failed to save base price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-nowrap items-center gap-2 md:gap-4 w-full">
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
                <span className="flex-shrink-0 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Addon Price
                </span>
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
              </div>

              {/* Row 2: Select Extinguisher + Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Extinguisher</Label>
                  <Select value={exExtinguisherValue} onValueChange={setExExtinguisherValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingExOptions ? "Loading..." : "Select Extinguisher"}
                        label={String(
                          exExtinguisherOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (exExtinguisherValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {exExtinguisherOptions.length === 0 && !loadingExOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        exExtinguisherOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-ex-extinguisher-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-ex-extinguisher-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={exExtinguisherPrice}
                      onChange={(e) => setExExtinguisherPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = exExtinguisherOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exExtinguisherValue);
                        if (!opt || !exExtinguisherValue || exExtinguisherValue === "no-data") return;
                        const price = parseFloat(exExtinguisherPrice) || 0;
                        try {
                          if (isAdmin && extinguisherModalProfessionalId) {
                            const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminExtinguisherWisePrice(token, professionalId, opt.id, "extinguisher", price);
                              setExUpdateMessage({ type: "success", text: "Professional extinguisher price updated successfully by admin." });
                              setExtinguisherFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await createProfessionalExtinguisherWisePrice(token, opt.id, "extinguisher", price);
                          setExUpdateMessage({ type: "success", text: "Extinguisher price saved." });
                        } catch {
                          setExUpdateMessage({ type: "error", text: "Failed to save Extinguisher price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Select Floor + Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Floor</Label>
                  <Select value={exFloorValue} onValueChange={setExFloorValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingExOptions ? "Loading..." : "Select floor"}
                        label={String(
                          exFloorOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (exFloorValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {exFloorOptions.length === 0 && !loadingExOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        exFloorOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-ex-floor-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-ex-floor-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={exFloorPrice}
                      onChange={(e) => setExFloorPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = exFloorOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exFloorValue);
                        if (!opt || !exFloorValue || exFloorValue === "no-data") return;
                        const price = parseFloat(exFloorPrice) || 0;
                        try {
                          if (isAdmin && extinguisherModalProfessionalId) {
                            const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminExtinguisherFloorPrice(token, professionalId, opt.id, price);
                              setExUpdateMessage({ type: "success", text: "Professional extinguisher floor price updated successfully by admin." });
                              setExtinguisherFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalExtinguisherFloorPrice(token, opt.id, price);
                          setExUpdateMessage({ type: "success", text: "Floor price saved." });
                        } catch {
                          setExUpdateMessage({ type: "error", text: "Failed to save Floor price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Select Extinguisher Type + Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Extinguisher Type</Label>
                  <Select value={exTypeValue} onValueChange={setExTypeValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingExOptions ? "Loading..." : "Select extinguisher type"}
                        label={String(
                          exTypeOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (exTypeValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {exTypeOptions.length === 0 && !loadingExOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        exTypeOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-ex-type-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-ex-type-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={exTypePrice}
                      onChange={(e) => setExTypePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = exTypeOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exTypeValue);
                        if (!opt || !exTypeValue || exTypeValue === "no-data") return;
                        const price = parseFloat(exTypePrice) || 0;
                        try {
                          if (isAdmin && extinguisherModalProfessionalId) {
                            const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminExtinguisherTypePrice(token, professionalId, opt.id, price);
                              setExUpdateMessage({ type: "success", text: "Professional extinguisher type price updated successfully by admin." });
                              setExtinguisherFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalExtinguisherTypePrice(token, opt.id, price);
                          setExUpdateMessage({ type: "success", text: "Extinguisher type price saved." });
                        } catch {
                          setExUpdateMessage({ type: "error", text: "Failed to save Extinguisher type price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Select Last Service + Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Last Service</Label>
                  <Select value={exLastServiceValue} onValueChange={setExLastServiceValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingExOptions ? "Loading..." : "Select last service"}
                        label={String(
                          exLastServiceOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (exLastServiceValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {exLastServiceOptions.length === 0 && !loadingExOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        exLastServiceOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-ex-last-service-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-ex-last-service-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={exLastServicePrice}
                      onChange={(e) => setExLastServicePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = exLastServiceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exLastServiceValue);
                        if (!opt || !exLastServiceValue || exLastServiceValue === "no-data") return;
                        const price = parseFloat(exLastServicePrice) || 0;
                        try {
                          if (isAdmin && extinguisherModalProfessionalId) {
                            const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                            if (professionalId) {
                              await saveAdminExtinguisherLastServicePrice(token, professionalId, opt.id, price);
                              setExUpdateMessage({ type: "success", text: "Professional extinguisher last service price updated successfully by admin." });
                              setExtinguisherFetchKey((k) => k + 1);
                              return;
                            }
                          }
                          await saveProfessionalExtinguisherLastServicePrice(token, opt.id, price);
                          setExUpdateMessage({ type: "success", text: "Last service price saved." });
                        } catch {
                          setExUpdateMessage({ type: "error", text: "Failed to save Last service price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label htmlFor="modal-ex-estimate-price" className="text-gray-700 font-medium">Estimated Price(£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                    <Input
                      id="modal-ex-estimate-price"
                      readOnly
                      value={(
                        (parseFloat(exBasePrice) || 0) +
                        (parseFloat(exExtinguisherPrice) || 0) +
                        (parseFloat(exFloorPrice) || 0) +
                        (parseFloat(exTypePrice) || 0) +
                        (parseFloat(exLastServicePrice) || 0)
                      ).toFixed(2)}
                      className="w-full pl-8 h-12 text-base border-gray-200 bg-gray-50 font-medium"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
          <div className="flex-shrink-0 border-t bg-gray-50 px-4 md:px-8 py-4 flex flex-col gap-3">
            {exUpdateMessage && (
              <p className={`text-sm ${exUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {exUpdateMessage.text}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={async () => {
                  setExUpdateMessage(null);
                  const token = getApiToken();
                  if (!token) {
                    setExUpdateMessage({ type: "error", text: "Please log in to update prices." });
                    return;
                  }
                  setUpdatingExPrice(true);
                  try {
                    const basePrice = parseFloat(exBasePrice) || 0;
                    if (isAdmin && extinguisherModalProfessionalId) {
                      const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                      if (professionalId) {
                        await saveAdminExtinguisherBasePrice(token, professionalId, basePrice);
                      } else {
                        await saveProfessionalExtinguisherBasePrice(token, basePrice);
                      }
                    } else {
                      await saveProfessionalExtinguisherBasePrice(token, basePrice);
                    }
                    const extOpt = exExtinguisherOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exExtinguisherValue);
                    if (extOpt && exExtinguisherValue && exExtinguisherValue !== "no-data") {
                      const extPrice = parseFloat(exExtinguisherPrice) || 0;
                      if (isAdmin && extinguisherModalProfessionalId) {
                        const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                        if (professionalId) await saveAdminExtinguisherWisePrice(token, professionalId, extOpt.id, "extinguisher", extPrice);
                      } else {
                        await createProfessionalExtinguisherWisePrice(token, extOpt.id, "extinguisher", extPrice);
                      }
                    }
                    const floorOpt = exFloorOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exFloorValue);
                    if (floorOpt && exFloorValue && exFloorValue !== "no-data") {
                      const floorPriceVal = parseFloat(exFloorPrice) || 0;
                      if (isAdmin && extinguisherModalProfessionalId) {
                        const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                        if (professionalId) await saveAdminExtinguisherFloorPrice(token, professionalId, floorOpt.id, floorPriceVal);
                      } else {
                        await saveProfessionalExtinguisherFloorPrice(token, floorOpt.id, floorPriceVal);
                      }
                    }
                    const typeOpt = exTypeOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exTypeValue);
                    if (typeOpt && exTypeValue && exTypeValue !== "no-data") {
                      const typePriceVal = parseFloat(exTypePrice) || 0;
                      if (isAdmin && extinguisherModalProfessionalId) {
                        const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                        if (professionalId) await saveAdminExtinguisherTypePrice(token, professionalId, typeOpt.id, typePriceVal);
                      } else {
                        await saveProfessionalExtinguisherTypePrice(token, typeOpt.id, typePriceVal);
                      }
                    }
                    const lastOpt = exLastServiceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === exLastServiceValue);
                    if (lastOpt && exLastServiceValue && exLastServiceValue !== "no-data") {
                      const lastPriceVal = parseFloat(exLastServicePrice) || 0;
                      if (isAdmin && extinguisherModalProfessionalId) {
                        const professionalId = parseInt(extinguisherModalProfessionalId, 10);
                        if (professionalId) await saveAdminExtinguisherLastServicePrice(token, professionalId, lastOpt.id, lastPriceVal);
                      } else {
                        await saveProfessionalExtinguisherLastServicePrice(token, lastOpt.id, lastPriceVal);
                      }
                    }
                    setExUpdateMessage({ type: "success", text: "Price updated successfully." });
                    setExtinguisherFetchKey((k) => k + 1);
                  } catch {
                    setExUpdateMessage({ type: "error", text: "Failed to update price." });
                  } finally {
                    setUpdatingExPrice(false);
                  }
                }}
                disabled={updatingExPrice}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
              >
                {updatingExPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Updating...
                  </>
                ) : (
                  "Update Price"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fire Alarm Pricing Modal – scrollable body, sticky footer so Update Price is always visible */}
      <Dialog open={alarmModalOpen} onOpenChange={setAlarmModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="flex-shrink-0 w-full bg-gradient-to-r from-red-50 to-orange-50 border-b">
            <div className="pl-4 pr-12 pt-6 pb-4 md:pl-8 md:pr-14">
              <DialogTitle className="text-lg text-[#0A1A2F] font-semibold">
                Fire Alarm Pricing
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Fire Alarm services
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
            <div className="space-y-4 md:space-y-6 w-full max-w-4xl">
              {/* Base price row */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Fire Alarm Service</Label>
                  <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                    Fire Alarm Service
                  </div>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-alarm-base-price" className="text-gray-700 font-medium">Base Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-alarm-base-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={alarmBasePrice}
                      onChange={(e) => setAlarmBasePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const price = parseFloat(alarmBasePrice) || 0;
                        const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                        try {
                          if (proId > 0) {
                            await saveAdminFireAlarmBasePrice(token, proId, price);
                          } else {
                            await saveProfessionalFireAlarmBasePrice(token, price);
                          }
                          setAlarmUpdateMessage({ type: "success", text: "Base price saved." });
                          setAlarmFetchKey((k) => k + 1);
                        } catch {
                          setAlarmUpdateMessage({ type: "error", text: "Failed to save base price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-nowrap items-center gap-2 md:gap-4 w-full">
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
                <span className="flex-shrink-0 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Addon Price
                </span>
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
              </div>

              {/* Select smoke/heat detectors */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select smoke/heat detectors</Label>
                  <Select value={alarmDetectorsValue} onValueChange={setAlarmDetectorsValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingAlarmModalOptions ? "Loading..." : "Select smoke/heat detectors"}
                        label={String(
                          alarmDetectorsOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (alarmDetectorsValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {alarmDetectorsOptions.length === 0 && !loadingAlarmModalOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        alarmDetectorsOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-alarm-detectors-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-alarm-detectors-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={alarmDetectorsPrice}
                      onChange={(e) => setAlarmDetectorsPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = alarmDetectorsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmDetectorsValue);
                        if (!opt || !alarmDetectorsValue || alarmDetectorsValue === "no-data") return;
                        const price = parseFloat(alarmDetectorsPrice) || 0;
                        const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                        try {
                          if (proId > 0) {
                            await saveAdminFireAlarmSmokeDetectorPrice(token, proId, opt.id, price);
                          } else {
                            await createProfessionalFireAlarmSmokeDetectorPrice(token, opt.id, price);
                          }
                          setAlarmUpdateMessage({ type: "success", text: "Detectors price saved." });
                          setAlarmFetchKey((k) => k + 1);
                        } catch {
                          setAlarmUpdateMessage({ type: "error", text: "Failed to save detectors price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Select manual call points */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select manual call points</Label>
                  <Select value={alarmCallPointsValue} onValueChange={setAlarmCallPointsValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingAlarmModalOptions ? "Loading..." : "Select manual call points"}
                        label={String(
                          alarmCallPointsOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (alarmCallPointsValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {alarmCallPointsOptions.length === 0 && !loadingAlarmModalOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        alarmCallPointsOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-alarm-callpoints-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-alarm-callpoints-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={alarmCallPointsPrice}
                      onChange={(e) => setAlarmCallPointsPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = alarmCallPointsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmCallPointsValue);
                        if (!opt || !alarmCallPointsValue || alarmCallPointsValue === "no-data") return;
                        const price = parseFloat(alarmCallPointsPrice) || 0;
                        const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                        try {
                          if (proId > 0) {
                            await saveAdminFireAlarmCallPointPrice(token, proId, opt.id, price);
                          } else {
                            await createProfessionalFireAlarmCallPointPrice(token, opt.id, price);
                          }
                          setAlarmUpdateMessage({ type: "success", text: "Call points price saved." });
                          setAlarmFetchKey((k) => k + 1);
                        } catch {
                          setAlarmUpdateMessage({ type: "error", text: "Failed to save call points price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Select number of floor */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select number of floor</Label>
                  <Select value={alarmFloorValue} onValueChange={setAlarmFloorValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingAlarmModalOptions ? "Loading..." : "Select number of floor"}
                        label={String(
                          alarmFloorsOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (alarmFloorValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {alarmFloorsOptions.length === 0 && !loadingAlarmModalOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        alarmFloorsOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-alarm-floor-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-alarm-floor-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={alarmFloorPrice}
                      onChange={(e) => setAlarmFloorPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = alarmFloorsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmFloorValue);
                        if (!opt || !alarmFloorValue || alarmFloorValue === "no-data") return;
                        const price = parseFloat(alarmFloorPrice) || 0;
                        const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                        try {
                          if (proId > 0) {
                            await saveAdminFireAlarmFloorPrice(token, proId, opt.id, price);
                          } else {
                            await createProfessionalFireAlarmFloorPrice(token, opt.id, price);
                          }
                          setAlarmUpdateMessage({ type: "success", text: "Floor price saved." });
                          setAlarmFetchKey((k) => k + 1);
                        } catch {
                          setAlarmUpdateMessage({ type: "error", text: "Failed to save floor price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Select fire alarm panels */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select fire alarm panels</Label>
                  <Select value={alarmPanelsValue} onValueChange={setAlarmPanelsValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingAlarmModalOptions ? "Loading..." : "Select fire alarm panel"}
                        label={String(
                          alarmPanelsOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (alarmPanelsValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {alarmPanelsOptions.length === 0 && !loadingAlarmModalOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        alarmPanelsOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-alarm-panels-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-alarm-panels-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={alarmPanelsPrice}
                      onChange={(e) => setAlarmPanelsPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = alarmPanelsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmPanelsValue);
                        if (!opt || !alarmPanelsValue || alarmPanelsValue === "no-data") return;
                        const price = parseFloat(alarmPanelsPrice) || 0;
                        const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                        try {
                          if (proId > 0) {
                            await saveAdminFireAlarmPanelPrice(token, proId, opt.id, price);
                          } else {
                            await createProfessionalFireAlarmPanelPrice(token, opt.id, price);
                          }
                          setAlarmUpdateMessage({ type: "success", text: "Panels price saved." });
                          setAlarmFetchKey((k) => k + 1);
                        } catch {
                          setAlarmUpdateMessage({ type: "error", text: "Failed to save panels price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Select type of alarm system */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select type of alarm system</Label>
                  <Select value={alarmSystemTypeValue} onValueChange={setAlarmSystemTypeValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingAlarmModalOptions ? "Loading..." : "Select type of alarm system"}
                        label={String(
                          alarmSystemTypeOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (alarmSystemTypeValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {alarmSystemTypeOptions.length === 0 && !loadingAlarmModalOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        alarmSystemTypeOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-alarm-system-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-alarm-system-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={alarmSystemTypePrice}
                      onChange={(e) => setAlarmSystemTypePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = alarmSystemTypeOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmSystemTypeValue);
                        if (!opt || !alarmSystemTypeValue || alarmSystemTypeValue === "no-data") return;
                        const price = parseFloat(alarmSystemTypePrice) || 0;
                        const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                        try {
                          if (proId > 0) {
                            await saveAdminFireAlarmSystemTypePrice(token, proId, opt.id, price);
                          } else {
                            await createProfessionalFireAlarmSystemTypePrice(token, opt.id, price);
                          }
                          setAlarmUpdateMessage({ type: "success", text: "System type price saved." });
                          setAlarmFetchKey((k) => k + 1);
                        } catch {
                          setAlarmUpdateMessage({ type: "error", text: "Failed to save system type price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Select last Service */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select last Service</Label>
                  <Select value={alarmLastServiceValue} onValueChange={setAlarmLastServiceValue}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={loadingAlarmModalOptions ? "Loading..." : "Select last service"}
                        label={String(
                          alarmLastServiceOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === (alarmLastServiceValue ?? "").trim()
                          )?.value ?? ""
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {alarmLastServiceOptions.length === 0 && !loadingAlarmModalOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        alarmLastServiceOptions.map((opt) => {
                          const val = String(opt.value ?? "").trim() || String(opt.id);
                          return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-alarm-last-service-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-alarm-last-service-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={alarmLastServicePrice}
                      onChange={(e) => setAlarmLastServicePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token) return;
                        const opt = alarmLastServiceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmLastServiceValue);
                        if (!opt || !alarmLastServiceValue || alarmLastServiceValue === "no-data") return;
                        const price = parseFloat(alarmLastServicePrice) || 0;
                        const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                        try {
                          if (proId > 0) {
                            await saveAdminFireAlarmLastServicePrice(token, proId, opt.id, price);
                          } else {
                            await createProfessionalFireAlarmLastServicePrice(token, opt.id, price);
                          }
                          setAlarmUpdateMessage({ type: "success", text: "Last service price saved." });
                          setAlarmFetchKey((k) => k + 1);
                        } catch {
                          setAlarmUpdateMessage({ type: "error", text: "Failed to save last service price." });
                        }
                      }}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label htmlFor="modal-alarm-estimate-price" className="text-gray-700 font-medium">Estimated Price(£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                    <Input
                      id="modal-alarm-estimate-price"
                      readOnly
                      value={(
                        (parseFloat(alarmBasePrice) || 0) +
                        (parseFloat(alarmDetectorsPrice) || 0) +
                        (parseFloat(alarmCallPointsPrice) || 0) +
                        (parseFloat(alarmFloorPrice) || 0) +
                        (parseFloat(alarmPanelsPrice) || 0) +
                        (parseFloat(alarmSystemTypePrice) || 0) +
                        (parseFloat(alarmLastServicePrice) || 0)
                      ).toFixed(2)}
                      className="w-full pl-8 h-12 text-base border-gray-200 bg-gray-50 font-medium"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
          {/* Sticky footer: message, Retry, Update Price – always visible */}
          <div className="flex-shrink-0 border-t bg-gray-50 px-4 md:px-8 py-4 flex flex-col gap-3">
            {alarmUpdateMessage && (
              <p className={`text-sm ${alarmUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {alarmUpdateMessage.text}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {alarmUpdateMessage?.type === "error" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAlarmUpdateMessage(null);
                    setAlarmOptionsRetryKey((k) => k + 1);
                  }}
                  className="h-11 px-4"
                >
                  Retry loading options
                </Button>
              )}
              <Button
                type="button"
                disabled={updatingAlarmPrice || loadingAlarmModalOptions}
                onClick={async () => {
                  setAlarmUpdateMessage(null);
                  const token = getApiToken();
                  if (!token) {
                    setAlarmUpdateMessage({ type: "error", text: "Please log in to update prices." });
                    return;
                  }
                  setUpdatingAlarmPrice(true);
                  try {
                    const basePrice = parseFloat(alarmBasePrice) || 0;
                    const proId = alarmModalProfessionalId ? Number(alarmModalProfessionalId) : 0;
                    if (proId > 0) {
                      await saveAdminFireAlarmBasePrice(token, proId, basePrice);
                    } else {
                      await saveProfessionalFireAlarmBasePrice(token, basePrice);
                    }
                    const detOpt = alarmDetectorsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmDetectorsValue);
                    if (detOpt && alarmDetectorsValue && alarmDetectorsValue !== "no-data") {
                      if (proId > 0) {
                        await saveAdminFireAlarmSmokeDetectorPrice(token, proId, detOpt.id, parseFloat(alarmDetectorsPrice) || 0);
                      } else {
                        await createProfessionalFireAlarmSmokeDetectorPrice(token, detOpt.id, parseFloat(alarmDetectorsPrice) || 0);
                      }
                    }
                    const callOpt = alarmCallPointsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmCallPointsValue);
                    if (callOpt && alarmCallPointsValue && alarmCallPointsValue !== "no-data") {
                      if (proId > 0) {
                        await saveAdminFireAlarmCallPointPrice(token, proId, callOpt.id, parseFloat(alarmCallPointsPrice) || 0);
                      } else {
                        await createProfessionalFireAlarmCallPointPrice(token, callOpt.id, parseFloat(alarmCallPointsPrice) || 0);
                      }
                    }
                    const floorOpt = alarmFloorsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmFloorValue);
                    if (floorOpt && alarmFloorValue && alarmFloorValue !== "no-data") {
                      if (proId > 0) {
                        await saveAdminFireAlarmFloorPrice(token, proId, floorOpt.id, parseFloat(alarmFloorPrice) || 0);
                      } else {
                        await createProfessionalFireAlarmFloorPrice(token, floorOpt.id, parseFloat(alarmFloorPrice) || 0);
                      }
                    }
                    const panelOpt = alarmPanelsOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmPanelsValue);
                    if (panelOpt && alarmPanelsValue && alarmPanelsValue !== "no-data") {
                      if (proId > 0) {
                        await saveAdminFireAlarmPanelPrice(token, proId, panelOpt.id, parseFloat(alarmPanelsPrice) || 0);
                      } else {
                        await createProfessionalFireAlarmPanelPrice(token, panelOpt.id, parseFloat(alarmPanelsPrice) || 0);
                      }
                    }
                    const sysOpt = alarmSystemTypeOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmSystemTypeValue);
                    if (sysOpt && alarmSystemTypeValue && alarmSystemTypeValue !== "no-data") {
                      if (proId > 0) {
                        await saveAdminFireAlarmSystemTypePrice(token, proId, sysOpt.id, parseFloat(alarmSystemTypePrice) || 0);
                      } else {
                        await createProfessionalFireAlarmSystemTypePrice(token, sysOpt.id, parseFloat(alarmSystemTypePrice) || 0);
                      }
                    }
                    const lastOpt = alarmLastServiceOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === alarmLastServiceValue);
                    if (lastOpt && alarmLastServiceValue && alarmLastServiceValue !== "no-data") {
                      if (proId > 0) {
                        await saveAdminFireAlarmLastServicePrice(token, proId, lastOpt.id, parseFloat(alarmLastServicePrice) || 0);
                      } else {
                        await createProfessionalFireAlarmLastServicePrice(token, lastOpt.id, parseFloat(alarmLastServicePrice) || 0);
                      }
                    }
                    setAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
                    setAlarmFetchKey((k) => k + 1);
                  } catch {
                    setAlarmUpdateMessage({ type: "error", text: "Failed to update price." });
                  } finally {
                    setUpdatingAlarmPrice(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 h-11 px-6 md:px-8 font-medium"
              >
                {updatingAlarmPrice ? "Updating…" : "Update Price"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FRA Pricing Modal – scrollable body + sticky footer (same as Fire Alarm) */}
      <Dialog open={fraModalOpen} onOpenChange={setFraModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="flex-shrink-0 w-full bg-gradient-to-r from-red-50 to-orange-50 border-b">
            <div className="pl-4 pr-12 pt-6 pb-4 md:pl-8 md:pr-14">
              <DialogTitle className="text-lg text-[#0A1A2F] font-semibold">
                Fire Risk Assessment Pricing
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {fraModalProfessionalId && fraAllPrices?.length
                  ? (() => {
                      const pro = fraAllPrices.find((p) => p.professional_id === Number(fraModalProfessionalId));
                      return pro ? `Editing prices for ${pro.professional_name}` : "Set base and addon prices for FRA services";
                    })()
                  : "Set base and addon prices for FRA services"}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 relative">
            {fraModalLoadingOptions && (
              <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center rounded-lg">
                <Loader2 className="w-10 h-10 animate-spin text-red-600 mb-3" />
                <p className="text-sm text-gray-600">Loading options…</p>
              </div>
            )}
            <div className="space-y-4 md:space-y-6 w-full max-w-4xl">
              {/* Base price: Property Type + Base Price (£) */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Property Type</Label>
                  <Select value={fraModalPropertyTypeId} onValueChange={setFraModalPropertyTypeId}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70 disabled:cursor-not-allowed min-w-0" disabled={fraModalLoadingOptions}>
                      <span className={`block min-w-0 flex-1 overflow-hidden text-left ${fraModalPropertyTypeId ? "truncate" : "text-gray-500"}`}>
                        {fraModalPropertyTypeId
                          ? (fraModalPropertyTypes.find((o) => String(o.id) === fraModalPropertyTypeId)?.property_type_name ?? fraModalPropertyTypeId)
                          : (fraModalLoadingOptions ? "Loading..." : "Select property type")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fraModalPropertyTypes.length === 0 && !fraModalLoadingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        fraModalPropertyTypes.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>{opt.property_type_name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="fra-modal-base-price" className="text-gray-700 font-medium">Base Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="fra-modal-base-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={fraModalPropertyTypePrice}
                      onChange={(e) => setFraModalPropertyTypePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token || !fraModalProfessionalId || !fraModalPropertyTypeId || fraModalPropertyTypeId === "no-data") return;
                        const proId = Number(fraModalProfessionalId);
                        const propTypeId = Number(fraModalPropertyTypeId);
                        if (!proId || !propTypeId) return;
                        const price = parseFloat(fraModalPropertyTypePrice) || 0;
                        try {
                          await saveAdminFraPropertyTypePrice(token, proId, propTypeId, price);
                          setFraModalUpdateMessage({ type: "success", text: "Base price saved." });
                          fetchData();
                        } catch {
                          setFraModalUpdateMessage({ type: "error", text: "Failed to save base price." });
                        }
                      }}
                      disabled={fraModalLoadingOptions}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-nowrap items-center gap-2 md:gap-4 w-full">
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
                <span className="flex-shrink-0 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Addon Price
                </span>
                <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
              </div>

              {/* Approximate People + Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Approximate People</Label>
                  <Select value={fraModalPeopleId} onValueChange={setFraModalPeopleId}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70 disabled:cursor-not-allowed min-w-0" disabled={fraModalLoadingOptions}>
                      <span className={`block min-w-0 flex-1 overflow-hidden text-left ${fraModalPeopleId ? "truncate" : "text-gray-500"}`}>
                        {fraModalPeopleId
                          ? (fraModalPeople.find((o) => String(o.id) === fraModalPeopleId)
                            ? formatPeopleOptionLabel(fraModalPeople.find((o) => String(o.id) === fraModalPeopleId)!.number_of_people)
                            : fraModalPeopleId)
                          : (fraModalLoadingOptions ? "Loading..." : "Select approximate number")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fraModalPeople.length === 0 && !fraModalLoadingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        [...fraModalPeople]
                          .sort((a, b) => getPeopleOptionSortKey(a.number_of_people) - getPeopleOptionSortKey(b.number_of_people))
                          .map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)}>{formatPeopleOptionLabel(opt.number_of_people)}</SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="fra-modal-people-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="fra-modal-people-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={fraModalPeoplePrice}
                      onChange={(e) => setFraModalPeoplePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token || !fraModalProfessionalId || !fraModalPeopleId || fraModalPeopleId === "no-data") return;
                        const proId = Number(fraModalProfessionalId);
                        const peopleId = Number(fraModalPeopleId);
                        if (!proId || !peopleId) return;
                        const price = parseFloat(fraModalPeoplePrice) || 0;
                        try {
                          await saveAdminFraPeoplePrice(token, proId, peopleId, price);
                          setFraModalUpdateMessage({ type: "success", text: "People price saved." });
                          fetchData();
                        } catch {
                          setFraModalUpdateMessage({ type: "error", text: "Failed to save people price." });
                        }
                      }}
                      disabled={fraModalLoadingOptions}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              {/* Number of Floors + Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Number of Floors</Label>
                  <Select value={fraModalFloorId} onValueChange={setFraModalFloorId}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70 disabled:cursor-not-allowed min-w-0" disabled={fraModalLoadingOptions}>
                      <span className={`block min-w-0 flex-1 overflow-hidden text-left ${fraModalFloorId ? "truncate" : "text-gray-500"}`}>
                        {fraModalFloorId
                          ? (() => { const o = fraModalFloors.find((opt) => String(opt.id ?? opt.floor) === fraModalFloorId); return o ? (o.label || o.floor) : fraModalFloorId; })()
                          : (fraModalLoadingOptions ? "Loading..." : "Select number of floors")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fraModalFloors.length === 0 && !fraModalLoadingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        fraModalFloors.map((opt) => (
                          <SelectItem key={opt.id ?? opt.floor} value={String(opt.id ?? opt.floor)}>{opt.label || opt.floor}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="fra-modal-floor-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="fra-modal-floor-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={fraModalFloorPrice}
                      onChange={(e) => setFraModalFloorPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token || !fraModalProfessionalId || !fraModalFloorId || fraModalFloorId === "no-data") return;
                        const proId = Number(fraModalProfessionalId);
                        const floorId = Number(fraModalFloorId);
                        if (!proId || !floorId) return;
                        const price = parseFloat(fraModalFloorPrice) || 0;
                        try {
                          await saveAdminFraFloorPrice(token, proId, floorId, price);
                          setFraModalUpdateMessage({ type: "success", text: "Floor price saved." });
                          fetchData();
                        } catch {
                          setFraModalUpdateMessage({ type: "error", text: "Failed to save floor price." });
                        }
                      }}
                      disabled={fraModalLoadingOptions}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              {/* Urgency + Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Select Urgency</Label>
                  <Select value={fraModalDurationId} onValueChange={setFraModalDurationId}>
                    <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70 disabled:cursor-not-allowed min-w-0" disabled={fraModalLoadingOptions}>
                      <span className={`block min-w-0 flex-1 overflow-hidden text-left ${fraModalDurationId ? "truncate" : "text-gray-500"}`}>
                        {fraModalDurationId
                          ? (fraModalDurations.find((o) => String(o.id) === fraModalDurationId)?.duration ?? fraModalDurationId)
                          : (fraModalLoadingOptions ? "Loading..." : "Select urgency")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fraModalDurations.length === 0 && !fraModalLoadingOptions ? (
                        <SelectItem value="no-data">No options available</SelectItem>
                      ) : (
                        fraModalDurations.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>{opt.duration}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="fra-modal-urgency-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="fra-modal-urgency-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={fraModalDurationPrice}
                      onChange={(e) => setFraModalDurationPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={async () => {
                        const token = getApiToken();
                        if (!token || !fraModalProfessionalId || !fraModalDurationId || fraModalDurationId === "no-data") return;
                        const proId = Number(fraModalProfessionalId);
                        const durationId = Number(fraModalDurationId);
                        if (!proId || !durationId) return;
                        const price = parseFloat(fraModalDurationPrice) || 0;
                        try {
                          await saveAdminFraDurationPrice(token, proId, durationId, price);
                          setFraModalUpdateMessage({ type: "success", text: "Urgency price saved." });
                          fetchData();
                        } catch {
                          setFraModalUpdateMessage({ type: "error", text: "Failed to save urgency price." });
                        }
                      }}
                      disabled={fraModalLoadingOptions}
                      className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500 disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label htmlFor="fra-modal-estimate" className="text-gray-700 font-medium">Estimated Price (£)</Label>
                  <p className="text-xs text-gray-500 -mt-1">Sum of base price and all addon prices above.</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                    <Input
                      id="fra-modal-estimate"
                      readOnly
                      aria-readonly
                      value={(
                        (parseFloat(fraModalPropertyTypePrice) || 0) +
                        (parseFloat(fraModalPeoplePrice) || 0) +
                        (parseFloat(fraModalFloorPrice) || 0) +
                        (parseFloat(fraModalDurationPrice) || 0)
                      ).toFixed(2)}
                      className="w-full pl-8 h-12 text-base border-gray-200 bg-gray-50 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 border-t bg-gray-50 px-4 md:px-8 py-4 flex flex-col gap-3">
            {fraModalUpdateMessage && (
              <p className={`text-sm ${fraModalUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"}`} role="status">
                {fraModalUpdateMessage.text}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {fraModalUpdateMessage?.type === "error" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFraModalUpdateMessage(null);
                    setFraModalRetryKey((k) => k + 1);
                  }}
                  className="h-11 px-4"
                >
                  Retry loading options
                </Button>
              )}
              <Button
                type="button"
                disabled={fraModalUpdatingPrice || fraModalLoadingOptions}
                onClick={async () => {
                  setFraModalUpdateMessage(null);
                  const token = getApiToken();
                  if (!token) {
                    setFraModalUpdateMessage({ type: "error", text: "Please log in to update prices." });
                    return;
                  }
                  const proId = fraModalProfessionalId ? Number(fraModalProfessionalId) : 0;
                  const propTypeId = fraModalPropertyTypeId ? Number(fraModalPropertyTypeId) : 0;
                  if (!proId || !propTypeId || fraModalPropertyTypeId === "no-data") {
                    setFraModalUpdateMessage({ type: "error", text: "Select a professional and property type." });
                    return;
                  }
                  setFraModalUpdatingPrice(true);
                  try {
                    const basePrice = parseFloat(fraModalPropertyTypePrice) || 0;
                    await saveAdminFraPropertyTypePrice(token, proId, propTypeId, basePrice);
                    if (fraModalPeopleId && fraModalPeopleId !== "no-data") {
                      const peopleId = Number(fraModalPeopleId);
                      if (peopleId) {
                        const peoplePrice = parseFloat(fraModalPeoplePrice) || 0;
                        await saveAdminFraPeoplePrice(token, proId, peopleId, peoplePrice);
                      }
                    }
                    if (fraModalFloorId && fraModalFloorId !== "no-data") {
                      const floorId = Number(fraModalFloorId);
                      if (floorId) {
                        const floorPrice = parseFloat(fraModalFloorPrice) || 0;
                        await saveAdminFraFloorPrice(token, proId, floorId, floorPrice);
                      }
                    }
                    if (fraModalDurationId && fraModalDurationId !== "no-data") {
                      const durationId = Number(fraModalDurationId);
                      if (durationId) {
                        const durationPrice = parseFloat(fraModalDurationPrice) || 0;
                        await saveAdminFraDurationPrice(token, proId, durationId, durationPrice);
                      }
                    }
                    setFraModalUpdateMessage({ type: "success", text: "Prices updated successfully." });
                    fetchData();
                  } catch {
                    setFraModalUpdateMessage({ type: "error", text: "Failed to update price." });
                  } finally {
                    setFraModalUpdatingPrice(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 h-11 px-6 md:px-8 font-medium"
              >
                {fraModalUpdatingPrice ? "Updating…" : "Update Price"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emergencyLightingModalOpen} onOpenChange={setEmergencyLightingModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="flex-shrink-0 w-full bg-gradient-to-r from-red-50 to-orange-50 border-b">
            <div className="pl-4 pr-12 pt-6 pb-4 md:pl-8 md:pr-14">
              <DialogTitle className="text-lg text-[#0A1A2F] font-semibold">
                Emergency Lighting Pricing
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Emergency Lighting services
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
            <div className="space-y-4 md:space-y-6 w-full max-w-4xl">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
              <div className="space-y-2 flex-1 min-w-0">
                <Label className="text-gray-700 font-medium">Emergency Light Service</Label>
                <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                  Emergency Light Service
                </div>
              </div>
              <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                <Label htmlFor="modal-el-base-price" className="text-gray-700 font-medium">Base Price (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                  <Input
                    id="modal-el-base-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={elBasePrice}
                    onChange={(e) => setElBasePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={async () => {
                      const token = getApiToken();
                      if (!token) return;
                      const price = parseFloat(elBasePrice) || 0;
                      try {
                        if (isAdmin && emergencyLightingModalProfessionalId) {
                          const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                          if (professionalId) {
                            await saveAdminEmergencyLightBasePrice(token, professionalId, price);
                            setElUpdateMessage({ type: "success", text: "Emergency light base price updated successfully by admin." });
                            setLightTestingFetchKey((k) => k + 1);
                            return;
                          }
                        }
                        await saveProfessionalEmergencyLightBasePrice(token, price);
                        setElUpdateMessage({ type: "success", text: "Base price saved successfully." });
                      } catch {
                        setElUpdateMessage({ type: "error", text: "Failed to save base price." });
                      }
                    }}
                    className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-row flex-nowrap items-center gap-2 md:gap-4 w-full">
              <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
              <span className="flex-shrink-0 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                Addon Price
              </span>
              <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
              <div className="space-y-2 flex-1 min-w-0">
                <Label className="text-gray-700 font-medium">Select Emergency light</Label>
                <Select value={elValue} onValueChange={setElValue}>
                  <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                    <SelectValue
                      placeholder={loadingElOptions ? "Loading..." : "Select Emergency light"}
                      label={String(
                        elOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === (elValue ?? "").trim())?.value ?? ""
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {elOptions.length === 0 && !loadingElOptions ? (
                      <SelectItem value="no-data">No options available</SelectItem>
                    ) : (
                      elOptions.map((opt) => {
                        const val = String(opt.value ?? "").trim() || String(opt.id);
                        return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                <Label htmlFor="modal-el-price" className="text-gray-700 font-medium">Price (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                  <Input
                    id="modal-el-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={elPrice}
                    onChange={(e) => setElPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={async () => {
                      const token = getApiToken();
                      if (!token) return;
                      const opt = elOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elValue);
                      if (!opt || !elValue || elValue === "no-data") return;
                      const price = parseFloat(elPrice) || 0;
                      try {
                        if (isAdmin && emergencyLightingModalProfessionalId) {
                          const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                          if (professionalId) {
                            await saveAdminEmergencyLightPrice(token, professionalId, opt.id, price);
                            setElUpdateMessage({ type: "success", text: "Professional emergency light price updated successfully by admin." });
                            setLightTestingFetchKey((k) => k + 1);
                            return;
                          }
                        }
                        await createProfessionalEmergencyLightPrice(token, opt.id, "light", price);
                        setElUpdateMessage({ type: "success", text: "Emergency light price saved." });
                      } catch {
                        setElUpdateMessage({ type: "error", text: "Failed to save Emergency light price." });
                      }
                    }}
                    className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
              <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                <Label className="text-gray-700 font-medium whitespace-nowrap">Select Emergency light floor</Label>
                <Select value={elFloorValue} onValueChange={setElFloorValue}>
                  <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                    <SelectValue
                      placeholder={loadingElOptions ? "Loading..." : "Select floor"}
                      label={String(
                        elFloorOptions.find(
                          (o) => (String(o.value ?? "").trim() || String(o.id)) === (elFloorValue ?? "").trim()
                        )?.value ?? ""
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {elFloorOptions.length === 0 && !loadingElOptions ? (
                      <SelectItem value="no-data">No options available</SelectItem>
                    ) : (
                      elFloorOptions.map((opt) => {
                        const val = String(opt.value ?? "").trim() || String(opt.id);
                        return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                <Label htmlFor="modal-el-floor-price" className="text-gray-700 font-medium">Price (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                  <Input
                    id="modal-el-floor-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={elFloorPrice}
                    onChange={(e) => setElFloorPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={saveElFloorPriceNow}
                    className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
              <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                <Label className="text-gray-700 font-medium whitespace-nowrap">Select Emergency light type</Label>
                <Select value={elTypeValue} onValueChange={setElTypeValue}>
                  <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                    <SelectValue
                      placeholder={loadingElOptions ? "Loading..." : "Select type"}
                      label={String(
                        elTypeOptions.find(
                          (o) => (String(o.value ?? "").trim() || String(o.id)) === (elTypeValue ?? "").trim()
                        )?.value ?? ""
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {elTypeOptions.length === 0 && !loadingElOptions ? (
                      <SelectItem value="no-data">No options available</SelectItem>
                    ) : (
                      elTypeOptions.map((opt) => {
                        const val = String(opt.value ?? "").trim() || String(opt.id);
                        return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                <Label htmlFor="modal-el-type-price" className="text-gray-700 font-medium">Price (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                  <Input
                    id="modal-el-type-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={elTypePrice}
                    onChange={(e) => setElTypePrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={async () => {
                      const token = getApiToken();
                      if (!token) return;
                      const opt = elTypeOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elTypeValue);
                      if (!opt || !elTypeValue || elTypeValue === "no-data") return;
                      const price = parseFloat(elTypePrice) || 0;
                      try {
                        if (isAdmin && emergencyLightingModalProfessionalId) {
                          const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                          if (professionalId) {
                            await saveAdminEmergencyLightTypePrice(token, professionalId, opt.id, price);
                            setElUpdateMessage({ type: "success", text: "Professional emergency light type price updated successfully by admin." });
                            setLightTestingFetchKey((k) => k + 1);
                            return;
                          }
                        }
                        await saveProfessionalEmergencyLightTypePrice(token, opt.id, price);
                        setElUpdateMessage({ type: "success", text: "Emergency light type price saved." });
                      } catch {
                        setElUpdateMessage({ type: "error", text: "Failed to save type price." });
                      }
                    }}
                    className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
              <div className="space-y-2 flex-1 min-w-0">
                <Label className="text-gray-700 font-medium">Select Emergency light test</Label>
                <Select value={elTestValue} onValueChange={setElTestValue}>
                  <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                    <SelectValue
                      placeholder={loadingElOptions ? "Loading..." : "Select test"}
                      label={String(
                        elTestOptions.find(
                          (o) => (String(o.value ?? "").trim() || String(o.id)) === (elTestValue ?? "").trim()
                        )?.value ?? ""
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {elTestOptions.length === 0 && !loadingElOptions ? (
                      <SelectItem value="no-data">No options available</SelectItem>
                    ) : (
                      elTestOptions.map((opt) => {
                        const val = String(opt.value ?? "").trim() || String(opt.id);
                        return <SelectItem key={opt.id} value={val}>{opt.value}</SelectItem>;
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                <Label htmlFor="modal-el-test-price" className="text-gray-700 font-medium">Price (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                  <Input
                    id="modal-el-test-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={elTestPrice}
                    onChange={(e) => setElTestPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={async () => {
                      const token = getApiToken();
                      if (!token) return;
                      const opt = elTestOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elTestValue);
                      if (!opt || !elTestValue || elTestValue === "no-data") return;
                      const price = parseFloat(elTestPrice) || 0;
                      try {
                        if (isAdmin && emergencyLightingModalProfessionalId) {
                          const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                          if (professionalId) {
                            await saveAdminEmergencyLightTestPrice(token, professionalId, opt.id, price);
                            setElUpdateMessage({ type: "success", text: "Professional emergency light test price updated successfully by admin." });
                            setLightTestingFetchKey((k) => k + 1);
                            return;
                          }
                        }
                        await saveProfessionalEmergencyLightTestPrice(token, opt.id, price);
                        setElUpdateMessage({ type: "success", text: "Emergency light test price saved." });
                      } catch {
                        setElUpdateMessage({ type: "error", text: "Failed to save test price." });
                      }
                    }}
                    className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
              <div className="space-y-2 flex-1 min-w-0">
                <Label htmlFor="modal-el-estimate-price" className="text-gray-700 font-medium">Estimated Price(£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                  <Input
                    id="modal-el-estimate-price"
                    type="text"
                    readOnly
                    placeholder="0.00"
                    value={elEstimatePrice}
                    className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
            </div>

            </div>
          </div>
          <div className="flex-shrink-0 border-t bg-gray-50 px-4 md:px-8 py-4 flex flex-col gap-3">
            {elUpdateMessage && (
              <p className={`text-sm ${elUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {elUpdateMessage.text}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={async () => {
                  setElUpdateMessage(null);
                  const token = getApiToken();
                  if (!token) {
                    setElUpdateMessage({ type: "error", text: "Please log in to update prices." });
                    return;
                  }
                  setUpdatingElPrice(true);
                  try {
                    const basePrice = parseFloat(elBasePrice) || 0;
                    if (isAdmin && emergencyLightingModalProfessionalId) {
                      const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                      if (professionalId) {
                        await saveAdminEmergencyLightBasePrice(token, professionalId, basePrice);
                        setLightTestingFetchKey((k) => k + 1);
                      }
                    } else {
                      await saveProfessionalEmergencyLightBasePrice(token, basePrice);
                    }
                    const lightOpt = elOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elValue);
                    if (lightOpt && elValue && elValue !== "no-data") {
                      const lightPriceVal = parseFloat(elPrice) || 0;
                      if (isAdmin && emergencyLightingModalProfessionalId) {
                        const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                        if (professionalId) await saveAdminEmergencyLightPrice(token, professionalId, lightOpt.id, lightPriceVal);
                      } else {
                        await createProfessionalEmergencyLightPrice(token, lightOpt.id, "light", lightPriceVal);
                      }
                    }
                    const floorOpt = elFloorOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elFloorValue);
                    if (floorOpt && elFloorValue && elFloorValue !== "no-data") {
                      if (isAdmin && emergencyLightingModalProfessionalId) {
                        const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                        if (professionalId) await saveAdminEmergencyLightFloorPrice(token, professionalId, floorOpt.id, parseFloat(elFloorPrice) || 0);
                      } else {
                        await saveProfessionalEmergencyLightFloorPrice(token, floorOpt.id, parseFloat(elFloorPrice) || 0);
                      }
                    }
                    const typeOpt = elTypeOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elTypeValue);
                    if (typeOpt && elTypeValue && elTypeValue !== "no-data") {
                      if (isAdmin && emergencyLightingModalProfessionalId) {
                        const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                        if (professionalId) await saveAdminEmergencyLightTypePrice(token, professionalId, typeOpt.id, parseFloat(elTypePrice) || 0);
                      } else {
                        await saveProfessionalEmergencyLightTypePrice(token, typeOpt.id, parseFloat(elTypePrice) || 0);
                      }
                    }
                    const testOpt = elTestOptions.find((o) => (String(o.value ?? "").trim() || String(o.id)) === elTestValue);
                    if (testOpt && elTestValue && elTestValue !== "no-data") {
                      if (isAdmin && emergencyLightingModalProfessionalId) {
                        const professionalId = parseInt(emergencyLightingModalProfessionalId, 10);
                        if (professionalId) await saveAdminEmergencyLightTestPrice(token, professionalId, testOpt.id, parseFloat(elTestPrice) || 0);
                      } else {
                        await saveProfessionalEmergencyLightTestPrice(token, testOpt.id, parseFloat(elTestPrice) || 0);
                      }
                    }
                    setElUpdateMessage({ type: "success", text: "Price updated successfully." });
                    setLightTestingFetchKey((k) => k + 1);
                  } catch {
                    setElUpdateMessage({ type: "error", text: "Failed to update price." });
                  } finally {
                    setUpdatingElPrice(false);
                  }
                }}
                disabled={updatingElPrice}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
              >
                {updatingElPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Updating...
                  </>
                ) : (
                  "Update Price"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { FRABasePriceContent };
