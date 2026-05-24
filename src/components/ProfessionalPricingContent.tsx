import React, { useState, useEffect, useMemo, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  fetchPropertyTypes,
  fetchApproximatePeople,
  fetchFloorPricing,
  fetchFraDurations,
  fetchFireAlarmOptions,
  FireAlarmOptionItem,
  createProfessionalFireAlarmCallPointPrice,
  createProfessionalFireAlarmFloorPrice,
  createProfessionalFireAlarmLastServicePrice,
  createProfessionalFireAlarmPanelPrice,
  createProfessionalFireAlarmSmokeDetectorPrice,
  createProfessionalFireAlarmSystemTypePrice,
  getProfessionalFireAlarmBasePrice,
  getProfessionalFireAlarmSinglePrices,
  saveProfessionalFireAlarmBasePrice,
  saveFraPropertyTypePrice,
  saveFraPeoplePrice,
  saveFraFloorPrice,
  saveFraDurationPrice,
  getFraPropertyTypePrice,
  getFraPeoplePriceFromApi,
  getFraFloorPriceFromApi,
  getFraDurationPriceFromApi,
  parseFraGetPriceResponse,
  PropertyTypeResponse,
  ApproximatePeopleResponse,
  formatPeopleOptionLabel,
  getPeopleOptionSortKey,
  FloorPricingItem,
  FraDurationItem,
  fetchExtinguisherServiceOptions,
  ExtinguisherServiceOptionItem,
  saveProfessionalExtinguisherBasePrice,
  getProfessionalExtinguisherBasePrice,
  createProfessionalExtinguisherWisePrice,
  saveProfessionalExtinguisherFloorPrice,
  saveProfessionalExtinguisherTypePrice,
  saveProfessionalExtinguisherLastServicePrice,
  getProfessionalExtinguisherSinglePrices,
  saveProfessionalEmergencyLightBasePrice,
  getProfessionalEmergencyLightBasePrice,
  fetchEmergencyLightOptions,
  EmergencyLightServiceOptionItem,
  createProfessionalEmergencyLightPrice,
  saveProfessionalEmergencyLightFloorPrice,
  saveProfessionalEmergencyLightTestPrice,
  saveProfessionalEmergencyLightTypePrice,
  getProfessionalEmergencyLightSinglePrices,
  saveProfessionalMarshalBasePrice,
  getProfessionalMarshalBasePrice,
  saveProfessionalMarshalPeoplePrice,
  saveProfessionalMarshalPlacePrice,
  saveProfessionalMarshalTrainingOnPrice,
  saveProfessionalMarshalExperiencePrice,
  getProfessionalMarshalSinglePrices,
  fetchMarshalOptions,
  MarshalServiceOptionItem,
  fetchFireConsultationOptions,
  ConsultationOptionItem,
  saveProfessionalConsultationBasePrice,
  getProfessionalConsultationBasePrice,
  saveProfessionalConsultationModePrice,
  saveProfessionalConsultationHourPrice,
  getProfessionalConsultationSinglePrices,
} from "../api/servicesService";
import { getApiToken } from "../lib/auth";

const TAB_IDS = {
  FRA_SERVICE: "fra-service",
  FIRE_ALARM: "fire-alarm",
  EXTINGUISHERS: "extinguishers",
  EMERGENCY_LIGHTING: "emergency-lighting",
  TRAINING: "training",
  CONSULTANCY: "consultancy",
} as const;



const TAB_LABELS: Record<string, string> = {
  [TAB_IDS.FRA_SERVICE]: "FRA Service",
  [TAB_IDS.FIRE_ALARM]: "Fire Alarm",
  [TAB_IDS.EXTINGUISHERS]: "Extinguishers",
  [TAB_IDS.EMERGENCY_LIGHTING]: "Emergency Lighting",
  [TAB_IDS.TRAINING]: "Training",
  [TAB_IDS.CONSULTANCY]: "Consultation",
};

const FRA_PRICING_STORAGE_KEY = "fireguide_fra_pricing_selections_v1";

type FraPricingPersisted = {
  propertyTypeName: string;
  approximatePeopleId: string;
  floorValue: string;
  urgencyId: string;
};

function readFraPricingPersisted(): FraPricingPersisted | null {
  try {
    const raw = localStorage.getItem(FRA_PRICING_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as FraPricingPersisted;
    if (typeof o.propertyTypeName !== "string") return null;
    return {
      propertyTypeName: o.propertyTypeName,
      approximatePeopleId: typeof o.approximatePeopleId === "string" ? o.approximatePeopleId : "",
      floorValue: typeof o.floorValue === "string" ? o.floorValue : "",
      urgencyId: typeof o.urgencyId === "string" ? o.urgencyId : "",
    };
  } catch {
    return null;
  }
}

function writeFraPricingPersisted(data: FraPricingPersisted) {
  try {
    localStorage.setItem(FRA_PRICING_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function ProfessionalPricingContent() {
  const [activeTab, setActiveTab] = useState<string>(TAB_IDS.FRA_SERVICE);
  const [loading, setLoading] = useState(false);
  const pricingTabsScrollRef = useRef<HTMLDivElement>(null);

  // Fetched options (dynamically from GET APIs based on selected service)
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeResponse[]>([]);
  const [approximatePeople, setApproximatePeople] = useState<ApproximatePeopleResponse[]>([]);
  const [floorOptions, setFloorOptions] = useState<FloorPricingItem[]>([]);
  const [urgencyOptions, setUrgencyOptions] = useState<FraDurationItem[]>([]);

  // Form state
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [propertyTypePrice, setPropertyTypePrice] = useState("");
  const [approximatePeopleId, setApproximatePeopleId] = useState("");
  const [approximatePeoplePrice, setApproximatePeoplePrice] = useState("");
  const [floorValue, setFloorValue] = useState("");
  const [numberOfFloorsPrice, setNumberOfFloorsPrice] = useState("");
  const [urgencyId, setUrgencyId] = useState("");
  const [urgencyPrice, setUrgencyPrice] = useState("");

  /** Estimated total = sum of base + three addon price inputs */
  const [estimatePrice, setEstimatePrice] = useState<string>("");

  // Fire Alarm tab state (same layout as FRA, different field names)
  const [fireAlarmBasePrice, setFireAlarmBasePrice] = useState("");
  const [fireAlarmSmokeDetectorsValue, setFireAlarmSmokeDetectorsValue] = useState("");
  const [fireAlarmSmokeDetectorsPrice, setFireAlarmSmokeDetectorsPrice] = useState("");
  const [fireAlarmManualCallPointsValue, setFireAlarmManualCallPointsValue] = useState("");
  const [fireAlarmManualCallPointsPrice, setFireAlarmManualCallPointsPrice] = useState("");
  const [fireAlarmFloorValue, setFireAlarmFloorValue] = useState("");
  const [fireAlarmFloorPrice, setFireAlarmFloorPrice] = useState("");
  const [fireAlarmPanelsValue, setFireAlarmPanelsValue] = useState("");
  const [fireAlarmPanelsPrice, setFireAlarmPanelsPrice] = useState("");
  const [fireAlarmSystemTypeValue, setFireAlarmSystemTypeValue] = useState("");
  const [fireAlarmSystemTypePrice, setFireAlarmSystemTypePrice] = useState("");
  const [fireAlarmLastServiceValue, setFireAlarmLastServiceValue] = useState("");
  const [fireAlarmLastServicePrice, setFireAlarmLastServicePrice] = useState("");
  const [updatingFireAlarmPrice, setUpdatingFireAlarmPrice] = useState(false);
  const [fireAlarmUpdateMessage, setFireAlarmUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fire Alarm dropdown options from API (fire-alarm/get-alarm by type)
  const [fireAlarmDetectorsOptions, setFireAlarmDetectorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmCallPointsOptions, setFireAlarmCallPointsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmFloorsOptions, setFireAlarmFloorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmPanelsOptions, setFireAlarmPanelsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmSystemTypeOptions, setFireAlarmSystemTypeOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmLastServiceOptions, setFireAlarmLastServiceOptions] = useState<FireAlarmOptionItem[]>([]);
  const [loadingFireAlarmOptions, setLoadingFireAlarmOptions] = useState(false);

  // Extinguishers tab state (same table design as Fire Alarm)
  const [extinguisherBasePrice, setExtinguisherBasePrice] = useState("");
  const [extinguisherValue, setExtinguisherValue] = useState("");
  const [extinguisherPrice, setExtinguisherPrice] = useState("");
  const [extinguisherFloorValue, setExtinguisherFloorValue] = useState("");
  const [extinguisherFloorPrice, setExtinguisherFloorPrice] = useState("");
  const [extinguisherTypeValue, setExtinguisherTypeValue] = useState("");
  const [extinguisherTypePrice, setExtinguisherTypePrice] = useState("");
  const [extinguisherLastServiceValue, setExtinguisherLastServiceValue] = useState("");
  const [extinguisherLastServicePrice, setExtinguisherLastServicePrice] = useState("");
  const [updatingExtinguisherPrice, setUpdatingExtinguisherPrice] = useState(false);
  const [extinguisherUpdateMessage, setExtinguisherUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [extinguisherOptions, setExtinguisherOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherFloorOptions, setExtinguisherFloorOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherTypeOptions, setExtinguisherTypeOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherLastServiceOptions, setExtinguisherLastServiceOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [loadingExtinguisherOptions, setLoadingExtinguisherOptions] = useState(false);

  // Emergency Lighting tab state (same table design as Extinguishers)
  const [emergencyLightBasePrice, setEmergencyLightBasePrice] = useState("");
  const [emergencyLightValue, setEmergencyLightValue] = useState("");
  const [emergencyLightPrice, setEmergencyLightPrice] = useState("");
  const [emergencyLightFloorValue, setEmergencyLightFloorValue] = useState("");
  const [emergencyLightFloorPrice, setEmergencyLightFloorPrice] = useState("");
  const [emergencyLightTypeValue, setEmergencyLightTypeValue] = useState("");
  const [emergencyLightTypePrice, setEmergencyLightTypePrice] = useState("");
  const [emergencyLightTestValue, setEmergencyLightTestValue] = useState("");
  const [emergencyLightTestPrice, setEmergencyLightTestPrice] = useState("");
  const [updatingEmergencyLightPrice, setUpdatingEmergencyLightPrice] = useState(false);
  const [savingEmergencyLightPrice, setSavingEmergencyLightPrice] = useState(false);
  const [savingEmergencyLightFloorPrice, setSavingEmergencyLightFloorPrice] = useState(false);
  const [emergencyLightUpdateMessage, setEmergencyLightUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emergencyLightOptions, setEmergencyLightOptions] = useState<{ id: number; value: string }[]>([]);
  const [emergencyLightFloorOptions, setEmergencyLightFloorOptions] = useState<{ id: number; value: string }[]>([]);
  const [emergencyLightTypeOptions, setEmergencyLightTypeOptions] = useState<{ id: number; value: string }[]>([]);
  const [emergencyLightTestOptions, setEmergencyLightTestOptions] = useState<{ id: number; value: string }[]>([]);
  const [loadingEmergencyLightOptions, setLoadingEmergencyLightOptions] = useState(false);

  // Training tab state (same table design as Emergency Lighting)
  const [trainingBasePrice, setTrainingBasePrice] = useState("");
  const [trainingPeopleValue, setTrainingPeopleValue] = useState("");
  const [trainingPeoplePrice, setTrainingPeoplePrice] = useState("");
  const [trainingPlaceValue, setTrainingPlaceValue] = useState("");
  const [trainingPlacePrice, setTrainingPlacePrice] = useState("");
  const [trainingTrainingValue, setTrainingTrainingValue] = useState("");
  const [trainingTrainingPrice, setTrainingTrainingPrice] = useState("");
  const [trainingExperienceValue, setTrainingExperienceValue] = useState("");
  const [trainingExperiencePrice, setTrainingExperiencePrice] = useState("");
  const [updatingTrainingPrice, setUpdatingTrainingPrice] = useState(false);
  const [trainingUpdateMessage, setTrainingUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [trainingPeopleOptions, setTrainingPeopleOptions] = useState<{ id: number; value: string }[]>([]);
  const [trainingPlaceOptions, setTrainingPlaceOptions] = useState<{ id: number; value: string }[]>([]);
  const [trainingTrainingOptions, setTrainingTrainingOptions] = useState<{ id: number; value: string }[]>([]);
  const [trainingExperienceOptions, setTrainingExperienceOptions] = useState<{ id: number; value: string }[]>([]);
  const [loadingTrainingOptions, setLoadingTrainingOptions] = useState(false);
  const [trainingTotalPriceFromApi, setTrainingTotalPriceFromApi] = useState<string | null>(null);

  // Consultancy tab state (same design as Training tab)
  const [consultancyBasePrice, setConsultancyBasePrice] = useState("");
  const [consultancyModelValue, setConsultancyModelValue] = useState("");
  const [consultancyModelPrice, setConsultancyModelPrice] = useState("");
  const [consultancyHoursValue, setConsultancyHoursValue] = useState("");
  const [consultancyHoursPrice, setConsultancyHoursPrice] = useState("");
  const [updatingConsultancyPrice, setUpdatingConsultancyPrice] = useState(false);
  const [consultancyUpdateMessage, setConsultancyUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [consultancyModalOpen, setConsultancyModalOpen] = useState(false);
  const [consultancyModelOptions, setConsultancyModelOptions] = useState<ConsultationOptionItem[]>([]);
  const [consultancyHoursOptions, setConsultancyHoursOptions] = useState<ConsultationOptionItem[]>([]);
  const [loadingConsultationOptions, setLoadingConsultationOptions] = useState(false);

  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingBasePrice, setSavingBasePrice] = useState(false);
  const [savingPeoplePrice, setSavingPeoplePrice] = useState(false);
  const [savingFloorPrice, setSavingFloorPrice] = useState(false);
  const [savingDurationPrice, setSavingDurationPrice] = useState(false);

  const fraPrevPropertyNameRef = useRef<string | null>(null);
  const fraOptionsHydratedRef = useRef(false);

  // Estimated Price = sum of the four price inputs; updates when any input changes (increase/decrease)
  useEffect(() => {
    const p1 = parseFloat(propertyTypePrice) || 0;
    const p2 = parseFloat(approximatePeoplePrice) || 0;
    const p3 = parseFloat(numberOfFloorsPrice) || 0;
    const p4 = parseFloat(urgencyPrice) || 0;
    const total = p1 + p2 + p3 + p4;
    setEstimatePrice(total.toFixed(2));
  }, [propertyTypePrice, approximatePeoplePrice, numberOfFloorsPrice, urgencyPrice]);

  // Fire Alarm estimated price = base + 6 addon prices
  const fireAlarmEstimatePrice = (
    (parseFloat(fireAlarmBasePrice) || 0) +
    (parseFloat(fireAlarmSmokeDetectorsPrice) || 0) +
    (parseFloat(fireAlarmManualCallPointsPrice) || 0) +
    (parseFloat(fireAlarmFloorPrice) || 0) +
    (parseFloat(fireAlarmPanelsPrice) || 0) +
    (parseFloat(fireAlarmSystemTypePrice) || 0) +
    (parseFloat(fireAlarmLastServicePrice) || 0)
  ).toFixed(2);

  // Extinguishers estimated price = base + 4 addon prices
  const extinguisherEstimatePrice = (
    (parseFloat(extinguisherBasePrice) || 0) +
    (parseFloat(extinguisherPrice) || 0) +
    (parseFloat(extinguisherFloorPrice) || 0) +
    (parseFloat(extinguisherTypePrice) || 0) +
    (parseFloat(extinguisherLastServicePrice) || 0)
  ).toFixed(2);

  // Emergency Lighting estimated price = base + 4 addon prices
  const emergencyLightEstimatePrice = (
    (parseFloat(emergencyLightBasePrice) || 0) +
    (parseFloat(emergencyLightPrice) || 0) +
    (parseFloat(emergencyLightFloorPrice) || 0) +
    (parseFloat(emergencyLightTypePrice) || 0) +
    (parseFloat(emergencyLightTestPrice) || 0)
  ).toFixed(2);

  // Training estimated price = base + 4 addon prices
  const trainingEstimatePrice = (
    (parseFloat(trainingBasePrice) || 0) +
    (parseFloat(trainingPeoplePrice) || 0) +
    (parseFloat(trainingPlacePrice) || 0) +
    (parseFloat(trainingTrainingPrice) || 0) +
    (parseFloat(trainingExperiencePrice) || 0)
  ).toFixed(2);

  // Consultancy estimated price = base + model price + hours price
  const consultancyEstimatePrice = (
    (parseFloat(consultancyBasePrice) || 0) +
    (parseFloat(consultancyModelPrice) || 0) +
    (parseFloat(consultancyHoursPrice) || 0)
  ).toFixed(2);

  const fraPropertyTypeNumericId = useMemo(() => {
    const p = propertyTypes.find((x) => x.property_type_name === propertyTypeId);
    return p?.id ?? null;
  }, [propertyTypes, propertyTypeId]);

  /** When user changes property type: reset addon rows and default selections (after options exist). */
  useEffect(() => {
    if (activeTab !== TAB_IDS.FRA_SERVICE) return;
    const prev = fraPrevPropertyNameRef.current;
    if (
      fraOptionsHydratedRef.current &&
      prev != null &&
      prev !== "" &&
      propertyTypeId !== "" &&
      prev !== propertyTypeId
    ) {
      setApproximatePeoplePrice("0");
      setNumberOfFloorsPrice("0");
      setUrgencyPrice("0");
      if (approximatePeople[0]) setApproximatePeopleId(approximatePeople[0].number_of_people);
      else setApproximatePeopleId("");
      if (floorOptions[0]) setFloorValue(floorOptions[0].floor);
      else setFloorValue("");
      if (urgencyOptions[0]) setUrgencyId(String(urgencyOptions[0].id));
      else setUrgencyId("");
    }
    fraPrevPropertyNameRef.current = propertyTypeId || null;
  }, [
    activeTab,
    propertyTypeId,
    approximatePeople,
    floorOptions,
    urgencyOptions,
  ]);

  /** Persist FRA dropdown selections for reload. */
  useEffect(() => {
    if (activeTab !== TAB_IDS.FRA_SERVICE || !propertyTypeId) return;
    writeFraPricingPersisted({
      propertyTypeName: propertyTypeId,
      approximatePeopleId,
      floorValue,
      urgencyId,
    });
  }, [activeTab, propertyTypeId, approximatePeopleId, floorValue, urgencyId]);

  /** Base price: POST /professional/get-fra-property-type */
  useEffect(() => {
    if (activeTab !== TAB_IDS.FRA_SERVICE) return;
    const api_token = getApiToken();
    if (!api_token || fraPropertyTypeNumericId == null) return;
    let cancelled = false;
    getFraPropertyTypePrice({
      api_token,
      property_type_id: fraPropertyTypeNumericId,
    })
      .then((res) => {
        if (cancelled) return;
        const n = parseFraGetPriceResponse(res);
        setPropertyTypePrice(String(n ?? 0));
      })
      .catch(() => {
        if (!cancelled) setPropertyTypePrice("0");
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, fraPropertyTypeNumericId]);

  /** People addon: POST /professional/get-fra-people */
  useEffect(() => {
    if (activeTab !== TAB_IDS.FRA_SERVICE) return;
    const api_token = getApiToken();
    if (!api_token || fraPropertyTypeNumericId == null) return;
    if (!approximatePeopleId || approximatePeopleId === "no-data") {
      setApproximatePeoplePrice("0");
      return;
    }
    const peopleOption = approximatePeople.find((a) => a.number_of_people === approximatePeopleId);
    if (!peopleOption) {
      setApproximatePeoplePrice("0");
      return;
    }
    let cancelled = false;
    getFraPeoplePriceFromApi({
      api_token,
      people_id: peopleOption.id,
      property_type_id: fraPropertyTypeNumericId,
    })
      .then((res) => {
        if (cancelled) return;
        setApproximatePeoplePrice(String(parseFraGetPriceResponse(res) ?? 0));
      })
      .catch(() => {
        if (!cancelled) setApproximatePeoplePrice("0");
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, fraPropertyTypeNumericId, approximatePeopleId, approximatePeople]);

  /** Floor addon: POST /professional/get-fra-floor */
  useEffect(() => {
    if (activeTab !== TAB_IDS.FRA_SERVICE) return;
    const api_token = getApiToken();
    if (!api_token || fraPropertyTypeNumericId == null) return;
    if (!floorValue || floorValue === "no-data") {
      setNumberOfFloorsPrice("0");
      return;
    }
    const floorOption = floorOptions.find((f) => f.floor === floorValue);
    if (!floorOption) {
      setNumberOfFloorsPrice("0");
      return;
    }
    const floorId = floorOption.id ?? (floorOption.floor ? parseInt(floorOption.floor, 10) : NaN);
    if (Number.isNaN(floorId)) {
      setNumberOfFloorsPrice("0");
      return;
    }
    let cancelled = false;
    getFraFloorPriceFromApi({
      api_token,
      floor_id: floorId,
      property_type_id: fraPropertyTypeNumericId,
    })
      .then((res) => {
        if (cancelled) return;
        setNumberOfFloorsPrice(String(parseFraGetPriceResponse(res) ?? 0));
      })
      .catch(() => {
        if (!cancelled) setNumberOfFloorsPrice("0");
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, fraPropertyTypeNumericId, floorValue, floorOptions]);

  /** Duration addon: POST /professional/get-fra-duraation */
  useEffect(() => {
    if (activeTab !== TAB_IDS.FRA_SERVICE) return;
    const api_token = getApiToken();
    if (!api_token || fraPropertyTypeNumericId == null) return;
    if (!urgencyId || urgencyId === "no-data") {
      setUrgencyPrice("0");
      return;
    }
    const durationId = parseInt(urgencyId, 10);
    if (Number.isNaN(durationId)) {
      setUrgencyPrice("0");
      return;
    }
    let cancelled = false;
    getFraDurationPriceFromApi({
      api_token,
      duration_id: durationId,
      property_type_id: fraPropertyTypeNumericId,
    })
      .then((res) => {
        if (cancelled) return;
        setUrgencyPrice(String(parseFraGetPriceResponse(res) ?? 0));
      })
      .catch(() => {
        if (!cancelled) setUrgencyPrice("0");
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, fraPropertyTypeNumericId, urgencyId]);

  // Save base price for selected property type (POST /professional/fra-property-type) — user-friendly: on blur of Base Price field
  const handleSaveBasePrice = async () => {
    const api_token = getApiToken();
    const propertyType = propertyTypes.find((p) => p.property_type_name === propertyTypeId);
    const priceNum = parseFloat(propertyTypePrice);
    if (!api_token) {
      setUpdateMessage({ type: "error", text: "Please log in to save the base price." });
      return;
    }
    if (!propertyType) {
      setUpdateMessage({ type: "error", text: "Please select a property type." });
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setUpdateMessage({ type: "error", text: "Please enter a valid base price." });
      return;
    }
    setSavingBasePrice(true);
    setUpdateMessage(null);
    try {
      await saveFraPropertyTypePrice({
        api_token,
        property_type_id: propertyType.id,
        price: priceNum,
      });
      setUpdateMessage({ type: "success", text: "Base price saved." });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save base price. Please try again.";
      setUpdateMessage({ type: "error", text: message });
    } finally {
      setSavingBasePrice(false);
    }
  };

  // Save people price (POST /professional/fra-people) — on blur of Approximate People price field
  const handleSavePeoplePrice = async () => {
    const api_token = getApiToken();
    const peopleOption = approximatePeople.find((a) => a.number_of_people === approximatePeopleId);
    const priceNum = parseFloat(approximatePeoplePrice);
    if (!api_token) {
      setUpdateMessage({ type: "error", text: "Please log in to save the people price." });
      return;
    }
    if (!peopleOption) {
      setUpdateMessage({ type: "error", text: "Please select approximate people." });
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setUpdateMessage({ type: "error", text: "Please enter a valid price." });
      return;
    }
    const propertyType = propertyTypes.find((p) => p.property_type_name === propertyTypeId);
    if (!propertyType) {
      setUpdateMessage({ type: "error", text: "Please select a property type first." });
      return;
    }
    setSavingPeoplePrice(true);
    setUpdateMessage(null);
    try {
      await saveFraPeoplePrice({
        api_token,
        people_id: peopleOption.id,
        property_type_id: propertyType.id,
        price: priceNum,
      });
      setUpdateMessage({ type: "success", text: "People price saved." });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save people price. Please try again.";
      setUpdateMessage({ type: "error", text: message });
    } finally {
      setSavingPeoplePrice(false);
    }
  };

  // Save floor price (POST /professional-fra-floor) — on blur of Number of Floors price field
  const handleSaveFloorPrice = async () => {
    const api_token = getApiToken();
    const floorOption = floorOptions.find((f) => f.floor === floorValue);
    const priceNum = parseFloat(numberOfFloorsPrice);
    if (!api_token) {
      setUpdateMessage({ type: "error", text: "Please log in to save the floor price." });
      return;
    }
    if (!floorOption) {
      setUpdateMessage({ type: "error", text: "Please select number of floors." });
      return;
    }
    const floorId = floorOption.id ?? (floorOption.floor ? parseInt(floorOption.floor, 10) : NaN);
    if (Number.isNaN(floorId)) {
      setUpdateMessage({ type: "error", text: "Invalid floor option. Please refresh and try again." });
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setUpdateMessage({ type: "error", text: "Please enter a valid price." });
      return;
    }
    const propertyType = propertyTypes.find((p) => p.property_type_name === propertyTypeId);
    if (!propertyType) {
      setUpdateMessage({ type: "error", text: "Please select a property type first." });
      return;
    }
    setSavingFloorPrice(true);
    setUpdateMessage(null);
    try {
      await saveFraFloorPrice({
        api_token,
        floor_id: floorId,
        property_type_id: propertyType.id,
        price: priceNum,
      });
      setUpdateMessage({ type: "success", text: "Floor price saved." });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save floor price. Please try again.";
      setUpdateMessage({ type: "error", text: message });
    } finally {
      setSavingFloorPrice(false);
    }
  };

  // Save duration/urgency price (POST /professional-fra-duration) — on blur of Select Urgency price field
  const handleSaveDurationPrice = async () => {
    const api_token = getApiToken();
    const durationId = urgencyId ? parseInt(urgencyId, 10) : NaN;
    const priceNum = parseFloat(urgencyPrice);
    if (!api_token) {
      setUpdateMessage({ type: "error", text: "Please log in to save the duration price." });
      return;
    }
    if (!urgencyId || Number.isNaN(durationId)) {
      setUpdateMessage({ type: "error", text: "Please select urgency." });
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setUpdateMessage({ type: "error", text: "Please enter a valid price." });
      return;
    }
    const propertyType = propertyTypes.find((p) => p.property_type_name === propertyTypeId);
    if (!propertyType) {
      setUpdateMessage({ type: "error", text: "Please select a property type first." });
      return;
    }
    setSavingDurationPrice(true);
    setUpdateMessage(null);
    try {
      await saveFraDurationPrice({
        api_token,
        duration_id: durationId,
        property_type_id: propertyType.id,
        price: priceNum,
      });
      setUpdateMessage({ type: "success", text: "Duration price saved." });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save duration price. Please try again.";
      setUpdateMessage({ type: "error", text: message });
    } finally {
      setSavingDurationPrice(false);
    }
  };

  // Fetch Property Type, Approximate People, Number of Floors from GET APIs when FRA Service tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.FRA_SERVICE) return;

    const fetchOptions = async () => {
      fraOptionsHydratedRef.current = false;
      setLoading(true);
      try {
        const [propTypes, people, floors, durations] = await Promise.all([
          fetchPropertyTypes(),
          fetchApproximatePeople(),
          fetchFloorPricing(),
          fetchFraDurations(),
        ]);
        const pt = Array.isArray(propTypes) ? propTypes : [];
        const ap = Array.isArray(people) ? people : [];
        const fp = Array.isArray(floors) ? floors : [];
        const durationsList = Array.isArray(durations) ? durations : [];
        setPropertyTypes(pt);
        setApproximatePeople(ap);
        setUrgencyOptions(durationsList);
        // Deduplicate by id when present so all API floor records display; otherwise by label
        const seen = new Set<string | number>();
        const uniqueFloors = fp.filter((item) => {
          const key = item.id != null ? item.id : (item.label || item.floor);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setFloorOptions(uniqueFloors);

        const persisted = readFraPricingPersisted();
        const persistedPropertyOk =
          persisted &&
          pt.some((p) => p.property_type_name === persisted.propertyTypeName);

        if (persistedPropertyOk && persisted) {
          setPropertyTypeId(persisted.propertyTypeName);
          if (ap.some((a) => a.number_of_people === persisted.approximatePeopleId)) {
            setApproximatePeopleId(persisted.approximatePeopleId);
          } else if (ap.length > 0) {
            setApproximatePeopleId(ap[0].number_of_people);
          }
          if (uniqueFloors.some((f) => f.floor === persisted.floorValue)) {
            setFloorValue(persisted.floorValue);
          } else if (uniqueFloors.length > 0) {
            setFloorValue(uniqueFloors[0].floor);
          }
          if (
            persisted.urgencyId &&
            durationsList.some((d) => String(d.id) === persisted.urgencyId)
          ) {
            setUrgencyId(persisted.urgencyId);
          } else if (durationsList.length > 0) {
            setUrgencyId(String(durationsList[0].id));
          }
        } else {
          if (pt.length > 0) setPropertyTypeId(pt[0].property_type_name);
          if (ap.length > 0) setApproximatePeopleId(ap[0].number_of_people);
          if (uniqueFloors.length > 0) setFloorValue(uniqueFloors[0].floor);
          if (durationsList.length > 0) setUrgencyId(String(durationsList[0].id));
        }
        fraOptionsHydratedRef.current = true;
      } catch (err) {
        console.error("Failed to fetch pricing options:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [activeTab]);

  // Fetch Fire Alarm dropdown options when Fire Alarm tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.FIRE_ALARM) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const load = async () => {
      setLoadingFireAlarmOptions(true);
      setFireAlarmUpdateMessage(null);
      try {
        const [detectors, callPoints, floors, panels, systemType, lastService, basePriceRes] = await Promise.all([
          fetchFireAlarmOptions(api_token, "ditectors"),
          fetchFireAlarmOptions(api_token, "call_points"),
          fetchFireAlarmOptions(api_token, "floors"),
          fetchFireAlarmOptions(api_token, "alarm_panels"),
          fetchFireAlarmOptions(api_token, "system_type"),
          fetchFireAlarmOptions(api_token, "last_service"),
          getProfessionalFireAlarmBasePrice(api_token),
        ]);
        const detectorsList = Array.isArray(detectors) ? detectors : [];
        const callPointsList = Array.isArray(callPoints) ? callPoints : [];
        const floorsList = Array.isArray(floors) ? floors : [];
        const panelsList = Array.isArray(panels) ? panels : [];
        const systemTypeList = Array.isArray(systemType) ? systemType : [];
        const lastServiceList = Array.isArray(lastService) ? lastService : [];

        setFireAlarmDetectorsOptions(detectorsList);
        setFireAlarmCallPointsOptions(callPointsList);
        setFireAlarmFloorsOptions(floorsList);
        setFireAlarmPanelsOptions(panelsList);
        setFireAlarmSystemTypeOptions(systemTypeList);
        setFireAlarmLastServiceOptions(lastServiceList);

        if (basePriceRes?.status && basePriceRes?.data?.price != null) {
          const p = String(basePriceRes.data.price).trim();
          if (p !== "") setFireAlarmBasePrice(p);
        } else if (basePriceRes && basePriceRes.status === false) {
          setFireAlarmUpdateMessage({
            type: "error",
            text:
              (basePriceRes.message && String(basePriceRes.message).trim()) ||
              "Could not load your saved Fire Alarm base price. You can still enter prices below.",
          });
        }

        const firstVal = (item: { value?: string; id?: number } | undefined) =>
          item ? (String(item.value ?? "").trim() || String(item.id ?? "")) : "";

        setFireAlarmSmokeDetectorsValue((prev) => prev || firstVal(detectorsList[0]));
        setFireAlarmManualCallPointsValue((prev) => prev || firstVal(callPointsList[0]));
        setFireAlarmFloorValue((prev) => prev || firstVal(floorsList[0]));
        setFireAlarmPanelsValue((prev) => prev || firstVal(panelsList[0]));
        setFireAlarmSystemTypeValue((prev) => prev || firstVal(systemTypeList[0]));
        setFireAlarmLastServiceValue((prev) => prev || firstVal(lastServiceList[0]));
      } catch (err) {
        console.error("Failed to fetch Fire Alarm options:", err);
      } finally {
        setLoadingFireAlarmOptions(false);
      }
    };
    load();
  }, [activeTab]);

  // Fetch Extinguisher dropdown options when Extinguishers tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.EXTINGUISHERS) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const load = async () => {
      setLoadingExtinguisherOptions(true);
      try {
        const [extinguisher, floor, extinguisherType, lastService, basePriceRes] = await Promise.all([
          fetchExtinguisherServiceOptions(api_token, "extinguisher"),
          fetchExtinguisherServiceOptions(api_token, "floor"),
          fetchExtinguisherServiceOptions(api_token, "metarials"),
          fetchExtinguisherServiceOptions(api_token, "last_service"),
          getProfessionalExtinguisherBasePrice(api_token),
        ]);
        const extinguisherList = Array.isArray(extinguisher) ? extinguisher : [];
        const floorList = Array.isArray(floor) ? floor : [];
        const typeList = Array.isArray(extinguisherType) ? extinguisherType : [];
        const lastServiceList = Array.isArray(lastService) ? lastService : [];

        setExtinguisherOptions(extinguisherList);
        setExtinguisherFloorOptions(floorList);
        setExtinguisherTypeOptions(typeList);
        setExtinguisherLastServiceOptions(lastServiceList);

        if (basePriceRes?.data != null && basePriceRes.data.price !== undefined) {
          const p = basePriceRes.data.price;
          setExtinguisherBasePrice(typeof p === "string" ? p : String(p));
        }

        const firstVal = (item: ExtinguisherServiceOptionItem | undefined) =>
          item ? (String(item.value ?? "").trim() || String(item.id ?? "")) : "";

        setExtinguisherValue((prev) => prev || firstVal(extinguisherList[0]));
        setExtinguisherFloorValue((prev) => prev || firstVal(floorList[0]));
        setExtinguisherTypeValue((prev) => prev || firstVal(typeList[0]));
        setExtinguisherLastServiceValue((prev) => prev || firstVal(lastServiceList[0]));
      } catch (err) {
        console.error("Failed to fetch Extinguisher options:", err);
      } finally {
        setLoadingExtinguisherOptions(false);
      }
    };
    load();
  }, [activeTab]);

  // When Fire Alarm selections change, fetch prices for the selected IDs and display them
  useEffect(() => {
    if (activeTab !== TAB_IDS.FIRE_ALARM || loadingFireAlarmOptions) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const findId = (val: string, opts: FireAlarmOptionItem[]) => {
      const v = (val ?? "").trim();
      if (!v || v === "no-data") return 0;
      const opt = opts.find((o) => (String(o.value ?? "").trim() || String(o.id)) === v);
      return opt?.id ?? 0;
    };

    const smoke_detectors_id = findId(fireAlarmSmokeDetectorsValue, fireAlarmDetectorsOptions);
    const call_point_id = findId(fireAlarmManualCallPointsValue, fireAlarmCallPointsOptions);
    const floor_id = findId(fireAlarmFloorValue, fireAlarmFloorsOptions);
    const panel_id = findId(fireAlarmPanelsValue, fireAlarmPanelsOptions);
    const system_type_id = findId(fireAlarmSystemTypeValue, fireAlarmSystemTypeOptions);
    const last_service_id = findId(fireAlarmLastServiceValue, fireAlarmLastServiceOptions);

    if (!smoke_detectors_id && !call_point_id && !floor_id && !panel_id && !system_type_id && !last_service_id) {
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await getProfessionalFireAlarmSinglePrices(api_token, {
          smoke_detectors_id: smoke_detectors_id || 0,
          call_point_id: call_point_id || 0,
          floor_id: floor_id || 0,
          panel_id: panel_id || 0,
          system_type_id: system_type_id || 0,
          last_service_id: last_service_id || 0,
        });
        if (!res?.status || !res.data) return;
        const d = res.data;
        const priceStr = (v: string | null | undefined) =>
          v != null && String(v).trim() !== "" ? String(v).trim() : "0.00";
        setFireAlarmSmokeDetectorsPrice(priceStr(d.smoke_detector?.price));
        setFireAlarmManualCallPointsPrice(priceStr(d.call_point?.price));
        setFireAlarmFloorPrice(priceStr(d.floor?.price));
        setFireAlarmPanelsPrice(priceStr(d.panel?.price));
        setFireAlarmSystemTypePrice(priceStr(d.system_type?.price));
        setFireAlarmLastServicePrice(priceStr(d.last_service?.price));
      } catch (err) {
        console.error("Failed to fetch Fire Alarm single prices:", err);
      }
    };

    fetchPrices();
  }, [
    activeTab,
    loadingFireAlarmOptions,
    fireAlarmSmokeDetectorsValue,
    fireAlarmManualCallPointsValue,
    fireAlarmFloorValue,
    fireAlarmPanelsValue,
    fireAlarmSystemTypeValue,
    fireAlarmLastServiceValue,
    fireAlarmDetectorsOptions,
    fireAlarmCallPointsOptions,
    fireAlarmFloorsOptions,
    fireAlarmPanelsOptions,
    fireAlarmSystemTypeOptions,
    fireAlarmLastServiceOptions,
  ]);

  // Fetch Emergency Light base price when Emergency Lighting tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.EMERGENCY_LIGHTING) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const load = async () => {
      try {
        const res = await getProfessionalEmergencyLightBasePrice(api_token);
        if (res?.data != null && res.data.price !== undefined) {
          const p = res.data.price;
          setEmergencyLightBasePrice(typeof p === "string" ? p : String(p));
        }
      } catch (err) {
        console.error("Failed to fetch Emergency Light base price:", err);
      }
    };
    load();
  }, [activeTab]);

  // Fetch Professional Marshal (Training) base price when Training tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.TRAINING) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const load = async () => {
      try {
        const res = await getProfessionalMarshalBasePrice(api_token);
        if (res?.data != null && res.data.price !== undefined) {
          const p = res.data.price;
          setTrainingBasePrice(typeof p === "string" ? p : String(p));
        }
      } catch (err) {
        console.error("Failed to fetch Marshal base price:", err);
      }
    };
    load();
  }, [activeTab]);

  // Fetch Emergency Light dropdown options when Emergency Lighting tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.EMERGENCY_LIGHTING) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const load = async () => {
      setLoadingEmergencyLightOptions(true);
      try {
        const [light, floor, lightType, lightTest] = await Promise.all([
          fetchEmergencyLightOptions("light"),
          fetchEmergencyLightOptions("floor"),
          fetchEmergencyLightOptions("light_type"),
          fetchEmergencyLightOptions("light_test"),
        ]);
        const lightList = Array.isArray(light) ? light : [];
        const floorList = Array.isArray(floor) ? floor : [];
        const typeList = Array.isArray(lightType) ? lightType : [];
        const testList = Array.isArray(lightTest) ? lightTest : [];

        setEmergencyLightOptions(lightList);
        setEmergencyLightFloorOptions(floorList);
        setEmergencyLightTypeOptions(typeList);
        setEmergencyLightTestOptions(testList);

        const firstVal = (item: EmergencyLightServiceOptionItem | undefined) =>
          item ? (String(item.value ?? "").trim() || String(item.id ?? "")) : "";

        setEmergencyLightValue((prev) => prev || firstVal(lightList[0]));
        setEmergencyLightFloorValue((prev) => prev || firstVal(floorList[0]));
        setEmergencyLightTypeValue((prev) => prev || firstVal(typeList[0]));
        setEmergencyLightTestValue((prev) => prev || firstVal(testList[0]));
      } catch (err) {
        console.error("Failed to fetch Emergency Light options:", err);
      } finally {
        setLoadingEmergencyLightOptions(false);
      }
    };
    load();
  }, [activeTab]);

  // Fetch Training (Marshal) dropdown options when Training tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.TRAINING) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const load = async () => {
      setLoadingTrainingOptions(true);
      try {
        const [people, place, training, experience] = await Promise.all([
          fetchMarshalOptions(api_token, "people"),
          fetchMarshalOptions(api_token, "training_place"),
          fetchMarshalOptions(api_token, "building_type"),
          fetchMarshalOptions(api_token, "experience"),
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
      } catch (err) {
        console.error("Failed to fetch Training (Marshal) options:", err);
      } finally {
        setLoadingTrainingOptions(false);
      }
    };
    load();
  }, [activeTab]);

  // Fetch Consultation (mode + hour) options and base price when Consultation tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.CONSULTANCY) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const load = async () => {
      setLoadingConsultationOptions(true);
      try {
        const [modeList, hourList] = await Promise.all([
          fetchFireConsultationOptions(api_token, "mode"),
          fetchFireConsultationOptions(api_token, "hour"),
        ]);
        const modeOptions = Array.isArray(modeList) ? modeList : [];
        const hourOptions = Array.isArray(hourList) ? hourList : [];

        setConsultancyModelOptions(modeOptions);
        setConsultancyHoursOptions(hourOptions);

        try {
          const basePriceRes = await getProfessionalConsultationBasePrice(api_token);
          if (basePriceRes?.data != null && basePriceRes.data.price !== undefined) {
            const p = basePriceRes.data.price;
            const displayPrice =
              typeof p === "string" ? p : typeof p === "number" ? p.toFixed(2) : String(p);
            setConsultancyBasePrice(displayPrice);
          }
        } catch (err) {
          console.error("Failed to fetch Consultation base price:", err);
        }

        const firstVal = (item: ConsultationOptionItem | undefined) =>
          item ? String(item.id) : "";

        setConsultancyModelValue((prev) => prev || firstVal(modeOptions[0]));
        setConsultancyHoursValue((prev) => prev || firstVal(hourOptions[0]));
      } catch (err) {
        console.error("Failed to fetch Consultation options:", err);
      } finally {
        setLoadingConsultationOptions(false);
      }
    };
    load();
  }, [activeTab]);

  // When Consultation mode or hour selection changes, fetch and display prices from API
  useEffect(() => {
    if (activeTab !== TAB_IDS.CONSULTANCY || loadingConsultationOptions) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const modeId = consultancyModelValue ? parseInt(consultancyModelValue, 10) : 0;
    const hourId = consultancyHoursValue ? parseInt(consultancyHoursValue, 10) : 0;
    if (!modeId || !hourId || consultancyModelValue === "no-data" || consultancyHoursValue === "no-data") return;

    const fetchPrices = async () => {
      try {
        const res = await getProfessionalConsultationSinglePrices(api_token, modeId, hourId);
        if (res?.data) {
          const modePrice = res.data.mode?.price;
          const placePrice = res.data.place?.price;
          if (modePrice !== undefined && modePrice !== null) {
            setConsultancyModelPrice(typeof modePrice === "string" ? modePrice : String(modePrice));
          }
          if (placePrice !== undefined && placePrice !== null) {
            setConsultancyHoursPrice(typeof placePrice === "string" ? placePrice : String(placePrice));
          }
        }
      } catch (err) {
        console.error("Failed to fetch Consultation prices:", err);
      }
    };
    fetchPrices();
  }, [activeTab, consultancyModelValue, consultancyHoursValue, loadingConsultationOptions]);

  // When Extinguisher selections change, fetch prices for the selected IDs and display them
  useEffect(() => {
    if (activeTab !== TAB_IDS.EXTINGUISHERS || loadingExtinguisherOptions) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const findId = (val: string, opts: ExtinguisherServiceOptionItem[]) => {
      const v = (val ?? "").trim();
      if (!v || v === "no-data") return 0;
      const opt = opts.find((o) => (String(o.value ?? "").trim() || String(o.id)) === v);
      return opt?.id ?? 0;
    };

    const extinguisher_id = findId(extinguisherValue, extinguisherOptions);
    const floor_id = findId(extinguisherFloorValue, extinguisherFloorOptions);
    const last_service_id = findId(extinguisherLastServiceValue, extinguisherLastServiceOptions);
    const extinguisher_type_id = findId(extinguisherTypeValue, extinguisherTypeOptions);

    if (!extinguisher_id && !floor_id && !last_service_id && !extinguisher_type_id) {
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await getProfessionalExtinguisherSinglePrices(api_token, {
          extinguisher_id: extinguisher_id || 0,
          floor_id: floor_id || 0,
          last_service_id: last_service_id || 0,
          extinguisher_type_id: extinguisher_type_id || 0,
        });
        if (!res?.data) return;
        const d = res.data;
        const priceStr = (v: string | null | undefined) =>
          v != null && String(v).trim() !== "" ? String(v).trim() : "0.00";
        setExtinguisherPrice(priceStr(d.extinguisher?.price));
        setExtinguisherFloorPrice(priceStr(d.floor?.price));
        setExtinguisherLastServicePrice(priceStr(d.last_service?.price));
        setExtinguisherTypePrice(priceStr(d.extinguisher_type?.price));
      } catch (err) {
        console.error("Failed to fetch Extinguisher single prices:", err);
      }
    };

    fetchPrices();
  }, [
    activeTab,
    loadingExtinguisherOptions,
    extinguisherValue,
    extinguisherFloorValue,
    extinguisherLastServiceValue,
    extinguisherTypeValue,
    extinguisherOptions,
    extinguisherFloorOptions,
    extinguisherLastServiceOptions,
    extinguisherTypeOptions,
  ]);

  // When Emergency Light selections change, fetch prices for the selected IDs and display them
  useEffect(() => {
    if (activeTab !== TAB_IDS.EMERGENCY_LIGHTING || loadingEmergencyLightOptions) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const findId = (val: string, opts: EmergencyLightServiceOptionItem[]) => {
      const v = (val ?? "").trim();
      if (!v || v === "no-data") return 0;
      const opt = opts.find((o) => (String(o.value ?? "").trim() || String(o.id)) === v);
      return opt?.id ?? 0;
    };

    const light_id = findId(emergencyLightValue, emergencyLightOptions);
    const floor_id = findId(emergencyLightFloorValue, emergencyLightFloorOptions);
    const light_test_id = findId(emergencyLightTestValue, emergencyLightTestOptions);
    const light_type_id = findId(emergencyLightTypeValue, emergencyLightTypeOptions);

    if (!light_id && !floor_id && !light_test_id && !light_type_id) {
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await getProfessionalEmergencyLightSinglePrices(api_token, {
          light_id: light_id || 0,
          floor_id: floor_id || 0,
          light_test_id: light_test_id || 0,
          light_type_id: light_type_id || 0,
        });
        if (!res?.data) return;
        const d = res.data;
        const priceStr = (v: string | null | undefined) =>
          v != null && String(v).trim() !== "" ? String(v).trim() : "0.00";
        setEmergencyLightPrice(priceStr(d.light?.price));
        setEmergencyLightFloorPrice(priceStr(d.floor?.price));
        setEmergencyLightTestPrice(priceStr(d.light_test?.price));
        setEmergencyLightTypePrice(priceStr(d.light_type?.price));
      } catch (err) {
        console.error("Failed to fetch Emergency Light single prices:", err);
      }
    };

    fetchPrices();
  }, [
    activeTab,
    loadingEmergencyLightOptions,
    emergencyLightValue,
    emergencyLightFloorValue,
    emergencyLightTestValue,
    emergencyLightTypeValue,
    emergencyLightOptions,
    emergencyLightFloorOptions,
    emergencyLightTestOptions,
    emergencyLightTypeOptions,
  ]);

  const saveEmergencyLightPriceNow = async () => {
    const token = getApiToken();
    if (!token) return;
    const v = (emergencyLightValue ?? "").trim();
    if (!v || v === "no-data") return;
    const opt = emergencyLightOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === v
    );
    const lightId = opt?.id ?? 0;
    if (!lightId) return;
    const price = parseFloat(emergencyLightPrice) || 0;
    setSavingEmergencyLightPrice(true);
    try {
      await createProfessionalEmergencyLightPrice(token, lightId, "light", price);
      setEmergencyLightUpdateMessage({ type: "success", text: "Emergency light price saved successfully." });
    } catch {
      setEmergencyLightUpdateMessage({ type: "error", text: "Failed to save Emergency light price." });
    } finally {
      setSavingEmergencyLightPrice(false);
    }
  };

  const saveEmergencyLightFloorPriceNow = async () => {
    const token = getApiToken();
    if (!token) return;
    const v = (emergencyLightFloorValue ?? "").trim();
    if (!v || v === "no-data") return;
    const opt = emergencyLightFloorOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === v
    );
    const floorId = opt?.id ?? 0;
    if (!floorId) return;
    const price = parseFloat(emergencyLightFloorPrice) || 0;
    setSavingEmergencyLightFloorPrice(true);
    try {
      await saveProfessionalEmergencyLightFloorPrice(token, floorId, price);
      setEmergencyLightUpdateMessage({ type: "success", text: "Emergency light floor price saved successfully." });
    } catch {
      setEmergencyLightUpdateMessage({ type: "error", text: "Failed to save Emergency light floor price." });
    } finally {
      setSavingEmergencyLightFloorPrice(false);
    }
  };

  // When Training (Marshal) selections change, fetch prices for the selected IDs and display them
  useEffect(() => {
    if (activeTab !== TAB_IDS.TRAINING || loadingTrainingOptions) return;
    const api_token = getApiToken();
    if (!api_token) return;

    const findId = (val: string, opts: MarshalServiceOptionItem[]) => {
      const v = (val ?? "").trim();
      if (!v || v === "no-data") return 0;
      const opt = opts.find((o) => (String(o.value ?? "").trim() || String(o.id)) === v);
      return opt?.id ?? 0;
    };

    const people_id = findId(trainingPeopleValue, trainingPeopleOptions);
    const place_id = findId(trainingPlaceValue, trainingPlaceOptions);
    const training_on_id = findId(trainingTrainingValue, trainingTrainingOptions);
    const experience_id = findId(trainingExperienceValue, trainingExperienceOptions);

    if (!people_id && !place_id && !training_on_id && !experience_id) {
      return;
    }

    const fetchPrices = async () => {
      try {
        const res = await getProfessionalMarshalSinglePrices(api_token, {
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
        setTrainingTotalPriceFromApi(
          d.total_price != null && String(d.total_price).trim() !== "" ? String(d.total_price).trim() : null
        );
      } catch (err) {
        console.error("Failed to fetch Training single prices:", err);
      }
    };

    fetchPrices();
  }, [
    activeTab,
    loadingTrainingOptions,
    trainingPeopleValue,
    trainingPlaceValue,
    trainingTrainingValue,
    trainingExperienceValue,
    trainingPeopleOptions,
    trainingPlaceOptions,
    trainingTrainingOptions,
    trainingExperienceOptions,
  ]);

  const handleUpdatePrice = async () => {
    const api_token = getApiToken();
    if (!api_token) {
      setUpdateMessage({ type: "error", text: "You must be logged in as a professional to update pricing." });
      return;
    }

    const propertyType = propertyTypes.find((p) => p.property_type_name === propertyTypeId);
    const peopleOption = approximatePeople.find((a) => a.number_of_people === approximatePeopleId);
    const floorOption = floorOptions.find((f) => f.floor === floorValue);

    if (!propertyType) {
      setUpdateMessage({ type: "error", text: "Please select a property type." });
      return;
    }
    if (!peopleOption) {
      setUpdateMessage({ type: "error", text: "Please select approximate people." });
      return;
    }
    if (!floorOption) {
      setUpdateMessage({ type: "error", text: "Please select number of floors." });
      return;
    }
    if (!urgencyId) {
      setUpdateMessage({ type: "error", text: "Please select urgency." });
      return;
    }

    const floorId = floorOption.id ?? (floorOption.floor ? parseInt(floorOption.floor, 10) : NaN);
    if (Number.isNaN(floorId)) {
      setUpdateMessage({ type: "error", text: "Invalid floor option. Please refresh and try again." });
      return;
    }
    const durationId = parseInt(urgencyId, 10);
    if (Number.isNaN(durationId)) {
      setUpdateMessage({ type: "error", text: "Invalid urgency. Please refresh and try again." });
      return;
    }

    const propertyTypePriceNum = parseFloat(propertyTypePrice) || 0;
    const peoplePriceNum = parseFloat(approximatePeoplePrice) || 0;
    const floorPriceNum = parseFloat(numberOfFloorsPrice) || 0;
    const durationPriceNum = parseFloat(urgencyPrice) || 0;

    setUpdateMessage(null);
    setUpdatingPrice(true);
    try {
      await Promise.all([
        saveFraPropertyTypePrice({
          api_token,
          property_type_id: propertyType.id,
          price: propertyTypePriceNum,
        }),
        saveFraPeoplePrice({
          api_token,
          people_id: peopleOption.id,
          property_type_id: propertyType.id,
          price: peoplePriceNum,
        }),
        saveFraFloorPrice({
          api_token,
          floor_id: floorId,
          property_type_id: propertyType.id,
          price: floorPriceNum,
        }),
        saveFraDurationPrice({
          api_token,
          duration_id: durationId,
          property_type_id: propertyType.id,
          price: durationPriceNum,
        }),
      ]);
      setUpdateMessage({ type: "success", text: "All FRA prices saved." });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to update price. Please try again.";
      setUpdateMessage({ type: "error", text: message });
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleUpdateFireAlarmPrice = async () => {
    const api_token = getApiToken();
    if (!api_token) {
      setFireAlarmUpdateMessage({ type: "error", text: "You must be logged in to update pricing." });
      return;
    }
    const priceNum = parseFloat(fireAlarmBasePrice) || 0;
    if (priceNum < 0) {
      setFireAlarmUpdateMessage({ type: "error", text: "Please enter a valid base price." });
      return;
    }
    setFireAlarmUpdateMessage(null);
    setUpdatingFireAlarmPrice(true);
    try {
      await saveProfessionalFireAlarmBasePrice(api_token, priceNum);

      const selectedDetectorVal = (fireAlarmSmokeDetectorsValue ?? "").trim();
      if (selectedDetectorVal && selectedDetectorVal !== "no-data") {
        const selectedOpt = fireAlarmDetectorsOptions.find(
          (opt) => (String(opt.value ?? "").trim() || String(opt.id)) === selectedDetectorVal
        );
        if (selectedOpt != null) {
          const detectorPrice = parseFloat(fireAlarmSmokeDetectorsPrice) || 0;
          await createProfessionalFireAlarmSmokeDetectorPrice(
            api_token,
            selectedOpt.id,
            detectorPrice
          );
        }
      }

      const selectedCallPointVal = (fireAlarmManualCallPointsValue ?? "").trim();
      if (selectedCallPointVal && selectedCallPointVal !== "no-data") {
        const selectedCallPoint = fireAlarmCallPointsOptions.find(
          (opt) => (String(opt.value ?? "").trim() || String(opt.id)) === selectedCallPointVal
        );
        if (selectedCallPoint != null) {
          const callPointPrice = parseFloat(fireAlarmManualCallPointsPrice) || 0;
          await createProfessionalFireAlarmCallPointPrice(
            api_token,
            selectedCallPoint.id,
            callPointPrice
          );
        }
      }

      const selectedFloorVal = (fireAlarmFloorValue ?? "").trim();
      if (selectedFloorVal && selectedFloorVal !== "no-data") {
        const selectedFloor = fireAlarmFloorsOptions.find(
          (opt) => (String(opt.value ?? "").trim() || String(opt.id)) === selectedFloorVal
        );
        if (selectedFloor != null) {
          const floorPrice = parseFloat(fireAlarmFloorPrice) || 0;
          await createProfessionalFireAlarmFloorPrice(
            api_token,
            selectedFloor.id,
            floorPrice
          );
        }
      }

      const selectedPanelVal = (fireAlarmPanelsValue ?? "").trim();
      if (selectedPanelVal && selectedPanelVal !== "no-data") {
        const selectedPanel = fireAlarmPanelsOptions.find(
          (opt) => (String(opt.value ?? "").trim() || String(opt.id)) === selectedPanelVal
        );
        if (selectedPanel != null) {
          const panelPrice = parseFloat(fireAlarmPanelsPrice) || 0;
          await createProfessionalFireAlarmPanelPrice(
            api_token,
            selectedPanel.id,
            panelPrice
          );
        }
      }

      const selectedSystemTypeVal = (fireAlarmSystemTypeValue ?? "").trim();
      if (selectedSystemTypeVal && selectedSystemTypeVal !== "no-data") {
        const selectedSystemType = fireAlarmSystemTypeOptions.find(
          (opt) => (String(opt.value ?? "").trim() || String(opt.id)) === selectedSystemTypeVal
        );
        if (selectedSystemType != null) {
          const systemTypePrice = parseFloat(fireAlarmSystemTypePrice) || 0;
          await createProfessionalFireAlarmSystemTypePrice(
            api_token,
            selectedSystemType.id,
            systemTypePrice
          );
        }
      }

      const selectedLastServiceVal = (fireAlarmLastServiceValue ?? "").trim();
      if (selectedLastServiceVal && selectedLastServiceVal !== "no-data") {
        const selectedLastService = fireAlarmLastServiceOptions.find(
          (opt) => (String(opt.value ?? "").trim() || String(opt.id)) === selectedLastServiceVal
        );
        if (selectedLastService != null) {
          const lastServicePrice = parseFloat(fireAlarmLastServicePrice) || 0;
          await createProfessionalFireAlarmLastServicePrice(
            api_token,
            selectedLastService.id,
            lastServicePrice
          );
        }
      }

      setFireAlarmUpdateMessage({
        type: "success",
        text: "Price updated successfully.",
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to update price. Please try again.";
      setFireAlarmUpdateMessage({ type: "error", text: message });
    } finally {
      setUpdatingFireAlarmPrice(false);
    }
  };

  const saveFireAlarmBasePriceOnBlur = async () => {
    const api_token = getApiToken();
    if (!api_token) return;
    const priceNum = parseFloat(fireAlarmBasePrice) || 0;
    if (priceNum < 0) return;
    try {
      await saveProfessionalFireAlarmBasePrice(api_token, priceNum);
      setFireAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
    } catch {
      setFireAlarmUpdateMessage({ type: "error", text: "Failed to save base price." });
    }
  };

  const saveFireAlarmSmokeDetectorPriceOnBlur = async () => {
    const api_token = getApiToken();
    if (!api_token) return;
    const val = (fireAlarmSmokeDetectorsValue ?? "").trim();
    if (!val || val === "no-data") return;
    const opt = fireAlarmDetectorsOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === val
    );
    if (!opt) return;
    try {
      await createProfessionalFireAlarmSmokeDetectorPrice(
        api_token,
        opt.id,
        parseFloat(fireAlarmSmokeDetectorsPrice) || 0
      );
      setFireAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
    } catch {
      setFireAlarmUpdateMessage({ type: "error", text: "Failed to save price." });
    }
  };

  const saveFireAlarmCallPointPriceOnBlur = async () => {
    const api_token = getApiToken();
    if (!api_token) return;
    const val = (fireAlarmManualCallPointsValue ?? "").trim();
    if (!val || val === "no-data") return;
    const opt = fireAlarmCallPointsOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === val
    );
    if (!opt) return;
    try {
      await createProfessionalFireAlarmCallPointPrice(
        api_token,
        opt.id,
        parseFloat(fireAlarmManualCallPointsPrice) || 0
      );
      setFireAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
    } catch {
      setFireAlarmUpdateMessage({ type: "error", text: "Failed to save price." });
    }
  };

  const saveFireAlarmFloorPriceOnBlur = async () => {
    const api_token = getApiToken();
    if (!api_token) return;
    const val = (fireAlarmFloorValue ?? "").trim();
    if (!val || val === "no-data") return;
    const opt = fireAlarmFloorsOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === val
    );
    if (!opt) return;
    try {
      await createProfessionalFireAlarmFloorPrice(
        api_token,
        opt.id,
        parseFloat(fireAlarmFloorPrice) || 0
      );
      setFireAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
    } catch {
      setFireAlarmUpdateMessage({ type: "error", text: "Failed to save price." });
    }
  };

  const saveFireAlarmPanelPriceOnBlur = async () => {
    const api_token = getApiToken();
    if (!api_token) return;
    const val = (fireAlarmPanelsValue ?? "").trim();
    if (!val || val === "no-data") return;
    const opt = fireAlarmPanelsOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === val
    );
    if (!opt) return;
    try {
      await createProfessionalFireAlarmPanelPrice(
        api_token,
        opt.id,
        parseFloat(fireAlarmPanelsPrice) || 0
      );
      setFireAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
    } catch {
      setFireAlarmUpdateMessage({ type: "error", text: "Failed to save price." });
    }
  };

  const saveFireAlarmSystemTypePriceOnBlur = async () => {
    const api_token = getApiToken();
    if (!api_token) return;
    const val = (fireAlarmSystemTypeValue ?? "").trim();
    if (!val || val === "no-data") return;
    const opt = fireAlarmSystemTypeOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === val
    );
    if (!opt) return;
    try {
      await createProfessionalFireAlarmSystemTypePrice(
        api_token,
        opt.id,
        parseFloat(fireAlarmSystemTypePrice) || 0
      );
      setFireAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
    } catch {
      setFireAlarmUpdateMessage({ type: "error", text: "Failed to save price." });
    }
  };

  const saveFireAlarmLastServicePriceOnBlur = async () => {
    const api_token = getApiToken();
    if (!api_token) return;
    const val = (fireAlarmLastServiceValue ?? "").trim();
    if (!val || val === "no-data") return;
    const opt = fireAlarmLastServiceOptions.find(
      (o) => (String(o.value ?? "").trim() || String(o.id)) === val
    );
    if (!opt) return;
    try {
      await createProfessionalFireAlarmLastServicePrice(
        api_token,
        opt.id,
        parseFloat(fireAlarmLastServicePrice) || 0
      );
      setFireAlarmUpdateMessage({ type: "success", text: "Price updated successfully." });
    } catch {
      setFireAlarmUpdateMessage({ type: "error", text: "Failed to save price." });
    }
  };

  // Keep the active category tab visible inside the mobile horizontal scroller
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const container = pricingTabsScrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(
      `[data-state="active"]`
    );
    activeEl?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeTab]);

  return (
    <div className="min-w-0 w-full max-w-full">
      {/* Page Header — compact on mobile, unchanged on desktop (md+) */}
      <div className="mb-4 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-[#0A1A2F] mb-1 md:mb-2">
          Service Pricing
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Configure your prices for each service category
        </p>
      </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="min-w-0 w-full">
        <div
          ref={pricingTabsScrollRef}
          className="mb-4 md:mb-6 min-w-0 w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] md:overflow-visible"
          aria-label="Service categories"
        >
          <TabsList className="!flex h-auto w-max min-w-full flex-nowrap justify-start gap-1.5 p-1.5 md:w-full md:justify-between md:gap-0 md:p-1 bg-gray-100 rounded-lg">
            {(Object.entries(TAB_LABELS) as [string, string][]).map(
              ([id, label]) => {
                const isActive = activeTab === id;
                const isDisabled =
                  id !== TAB_IDS.FRA_SERVICE &&
                  id !== TAB_IDS.FIRE_ALARM &&
                  id !== TAB_IDS.EXTINGUISHERS &&
                  id !== TAB_IDS.EMERGENCY_LIGHTING &&
                  id !== TAB_IDS.TRAINING &&
                  id !== TAB_IDS.CONSULTANCY;
                return (
                  <TabsTrigger
                    key={id}
                    value={id}
                    disabled={isDisabled}
                    className={`
                      shrink-0 whitespace-nowrap py-2.5 md:py-3 px-3 md:px-4 text-sm md:text-base rounded-md font-medium transition-all
                      ${isActive ? "bg-white shadow-sm text-red-600" : ""}
                      ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-200"}
                    `}
                  >
                    {label}
                  </TabsTrigger>
                );
              }
            )}
          </TabsList>
        </div>

        <TabsContent value={TAB_IDS.FRA_SERVICE} className="mt-0 w-full">
          <Card className="w-full border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="text-lg text-[#0A1A2F]">
                Fire Risk Assessment Pricing
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for FRA services
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-red-600 mb-4" />
                  <p className="text-gray-500">Loading options...</p>
                </div>
              ) : (
              <div className="space-y-4 md:space-y-6 w-full">
                {/* Row 1: Property Type (left, Select + Price) | Base Price (right, smaller) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                    Select Property Type 
                    </Label>
                    
                    <Select value={propertyTypeId} onValueChange={setPropertyTypeId}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.length === 0 ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          propertyTypes.map((opt) => (
                            <SelectItem key={opt.id} value={opt.property_type_name}>
                              {opt.property_type_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="base-price-1" className="text-gray-700 font-medium">
                      Base Price (£) {savingBasePrice && <span className="text-gray-400 font-normal">Saving...</span>}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="base-price-1"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={propertyTypePrice}
                        onChange={(e) =>
                          setPropertyTypePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={handleSaveBasePrice}
                        disabled={savingBasePrice}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Addon Price divider: left border, center text, right border */}
                <div className="flex flex-row flex-nowrap items-center gap-2 md:gap-4 w-full">
                  <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
                  <span className="flex-shrink-0 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Addon Price
                  </span>
                  <div className="flex-1 h-px min-w-0 bg-gray-400" aria-hidden />
                </div>

                {/* Row 2: Approximate People (left, Select + Price) | Base Price (right, smaller) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                      Select Approximate People 
                    </Label>
                    <Select value={approximatePeopleId} onValueChange={setApproximatePeopleId}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select approximate number" />
                      </SelectTrigger>
                      <SelectContent>
                        {approximatePeople.length === 0 ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          [...approximatePeople]
                            .sort(
                              (a, b) =>
                                getPeopleOptionSortKey(a.number_of_people) -
                                getPeopleOptionSortKey(b.number_of_people)
                            )
                            .map((opt) => (
                              <SelectItem key={opt.id} value={opt.number_of_people}>
                                {formatPeopleOptionLabel(opt.number_of_people)}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                   
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="base-price-2" className="text-gray-700 font-medium">
                      Price (£) {savingPeoplePrice && <span className="text-gray-400 font-normal">Saving...</span>}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="base-price-2"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={approximatePeoplePrice}
                        onChange={(e) =>
                          setApproximatePeoplePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={handleSavePeoplePrice}
                        disabled={savingPeoplePrice}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Number of Floors (left, Select + Price) | Base Price (right, smaller) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                    Select Number of Floors 
                    </Label>
                    <Select value={floorValue} onValueChange={setFloorValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <span
                          className={`flex-1 min-w-0 truncate text-left ${floorValue ? "" : "text-gray-500"}`}
                          title={floorOptions.find((o) => o.floor === floorValue)?.label ?? floorValue}
                        >
                          {floorOptions.find((o) => o.floor === floorValue)?.label ??
                            (floorValue || "Select number of floors")}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {floorOptions.length === 0 ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          floorOptions.map((opt) => (
                            <SelectItem key={opt.id ?? opt.floor} value={opt.floor}>
                              {opt.label || opt.floor}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="base-price-3" className="text-gray-700 font-medium">
                      Price (£) {savingFloorPrice && <span className="text-gray-400 font-normal">Saving...</span>}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="base-price-3"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={numberOfFloorsPrice}
                        onChange={(e) =>
                          setNumberOfFloorsPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={handleSaveFloorPrice}
                        disabled={savingFloorPrice}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Select Urgency (duration from GET /fra-durations) + Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                      Select Urgency
                    </Label>
                    <Select value={urgencyId} onValueChange={setUrgencyId}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <span
                          className={`flex-1 min-w-0 text-left ${urgencyId ? "" : "text-gray-500"}`}
                          title={urgencyOptions.find((o) => String(o.id) === urgencyId)?.duration}
                        >
                          {urgencyId
                            ? (urgencyOptions.find((o) => String(o.id) === urgencyId)?.duration ?? urgencyId)
                            : (loading ? "Loading..." : "Select urgency")}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {urgencyOptions.length === 0 ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          urgencyOptions.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)}>
                              {opt.duration}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="urgency-price" className="text-gray-700 font-medium">
                      Price (£) {savingDurationPrice && <span className="text-gray-400 font-normal">Saving...</span>}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="urgency-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={urgencyPrice}
                        onChange={(e) =>
                          setUrgencyPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={handleSaveDurationPrice}
                        disabled={savingDurationPrice}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Price: total_price from API when any option is selected */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="total-price" className="text-gray-700 font-medium">
                      Estimated Price(£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                      <Input
                        id="total-price"
                        type="text"
                        readOnly
                        placeholder="Select options to see total"
                        value={estimatePrice ? (Number(estimatePrice) ? Number(estimatePrice).toFixed(2) : estimatePrice) : ""}
                        className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
                </div>

                {updateMessage && (
                  <p
                    className={`text-sm ${
                      updateMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {updateMessage.text}
                  </p>
                )}
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={handleUpdatePrice}
                    disabled={updatingPrice}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
                  >
                    {updatingPrice ? (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={TAB_IDS.FIRE_ALARM} className="mt-0 w-full">
          <Card className="w-full border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="text-lg text-[#0A1A2F]">
                Fire Alarm Pricing
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Fire Alarm services
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-8">
              <div className="space-y-4 md:space-y-6 w-full">
                {/* Row 1: Fire Alarm - Base Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                      Fire Alarm Service 
                    </Label>
                    <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                    Fire Alarm Service
                    </div>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="fire-alarm-base-price" className="text-gray-700 font-medium">
                      Base Price (£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="fire-alarm-base-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={fireAlarmBasePrice}
                        onChange={(e) =>
                          setFireAlarmBasePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveFireAlarmBasePriceOnBlur}
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

                {/* Row 2: Select smoke/heat detectors – price (API: POST /fire-alarm/get-alarm, type: "ditectors", display data[].value e.g. "1-10 ditectors", "11-25 ditectors") */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select smoke/heat detectors</Label>
                    <Select value={fireAlarmSmokeDetectorsValue} onValueChange={setFireAlarmSmokeDetectorsValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingFireAlarmOptions ? "Loading..." : "Select smoke/heat detectors"}
                          label={String(
                            fireAlarmDetectorsOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (fireAlarmSmokeDetectorsValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {fireAlarmDetectorsOptions.length === 0 && !loadingFireAlarmOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          fireAlarmDetectorsOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="fire-alarm-smoke-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="fire-alarm-smoke-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={fireAlarmSmokeDetectorsPrice}
                        onChange={(e) =>
                          setFireAlarmSmokeDetectorsPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveFireAlarmSmokeDetectorPriceOnBlur}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Select manual call points – price (API: POST /fire-alarm/get-alarm, type: "call_points", display data[].value e.g. "6-10 call points", "11-20 call points") */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select manual call points</Label>
                    <Select value={fireAlarmManualCallPointsValue} onValueChange={setFireAlarmManualCallPointsValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingFireAlarmOptions ? "Loading..." : "Select manual call points"}
                          label={String(
                            fireAlarmCallPointsOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (fireAlarmManualCallPointsValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {fireAlarmCallPointsOptions.length === 0 && !loadingFireAlarmOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          fireAlarmCallPointsOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="fire-alarm-callpoints-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="fire-alarm-callpoints-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={fireAlarmManualCallPointsPrice}
                        onChange={(e) =>
                          setFireAlarmManualCallPointsPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveFireAlarmCallPointPriceOnBlur}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Select number of floor – price (API: POST /fire-alarm/get-alarm, type: "floors", display data[].value e.g. "1 floor", "2-3 floors") */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select number of floor</Label>
                    <Select value={fireAlarmFloorValue} onValueChange={setFireAlarmFloorValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingFireAlarmOptions ? "Loading..." : "Select number of floor"}
                          label={String(
                            fireAlarmFloorsOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (fireAlarmFloorValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {fireAlarmFloorsOptions.length === 0 && !loadingFireAlarmOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          fireAlarmFloorsOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="fire-alarm-floor-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="fire-alarm-floor-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={fireAlarmFloorPrice}
                        onChange={(e) =>
                          setFireAlarmFloorPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveFireAlarmFloorPriceOnBlur}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Select fire alarm panels – price (API: POST /fire-alarm/get-alarm, type: "alarm_panels", display data[].value e.g. "1 panel", "2 panels") */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select fire alarm panels</Label>
                    <Select value={fireAlarmPanelsValue} onValueChange={setFireAlarmPanelsValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingFireAlarmOptions ? "Loading..." : "Select fire alarm panel"}
                          label={String(
                            fireAlarmPanelsOptions.find(
                              (o) => String(o.value ?? "").trim() === (fireAlarmPanelsValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {fireAlarmPanelsOptions.length === 0 && !loadingFireAlarmOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          fireAlarmPanelsOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.value}>
                              {opt.value}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="fire-alarm-panels-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="fire-alarm-panels-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={fireAlarmPanelsPrice}
                        onChange={(e) =>
                          setFireAlarmPanelsPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveFireAlarmPanelPriceOnBlur}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 6: Select type of alarm system – price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select type of alarm system</Label>
                    <Select value={fireAlarmSystemTypeValue} onValueChange={setFireAlarmSystemTypeValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingFireAlarmOptions ? "Loading..." : "Select option"}
                          label={String(
                            fireAlarmSystemTypeOptions.find(
                              (o) => String(o.value ?? "").trim() === (fireAlarmSystemTypeValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {fireAlarmSystemTypeOptions.length === 0 && !loadingFireAlarmOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          fireAlarmSystemTypeOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.value}>
                              {opt.value}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="fire-alarm-system-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="fire-alarm-system-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={fireAlarmSystemTypePrice}
                        onChange={(e) =>
                          setFireAlarmSystemTypePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveFireAlarmSystemTypePriceOnBlur}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 7: Select last Service – price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select last Service</Label>
                    <Select value={fireAlarmLastServiceValue} onValueChange={setFireAlarmLastServiceValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingFireAlarmOptions ? "Loading..." : "Select option"}
                          label={String(
                            fireAlarmLastServiceOptions.find(
                              (o) => String(o.value ?? "").trim() === (fireAlarmLastServiceValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {fireAlarmLastServiceOptions.length === 0 && !loadingFireAlarmOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          fireAlarmLastServiceOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.value}>
                              {opt.value}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="fire-alarm-last-service-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="fire-alarm-last-service-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={fireAlarmLastServicePrice}
                        onChange={(e) =>
                          setFireAlarmLastServicePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveFireAlarmLastServicePriceOnBlur}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 8: Estimated Price(£) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="fire-alarm-estimate-price" className="text-gray-700 font-medium">
                      Estimated Price(£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                      <Input
                        id="fire-alarm-estimate-price"
                        type="text"
                        readOnly
                        placeholder="0.00"
                        value={fireAlarmEstimatePrice}
                        className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
                </div>

                {fireAlarmUpdateMessage && (
                  <p
                    className={`text-sm ${
                      fireAlarmUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {fireAlarmUpdateMessage.text}
                  </p>
                )}
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={handleUpdateFireAlarmPrice}
                    disabled={updatingFireAlarmPrice}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
                  >
                    {updatingFireAlarmPrice ? (
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value={TAB_IDS.EXTINGUISHERS} className="mt-0 w-full">
          <Card className="w-full border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="text-lg text-[#0A1A2F]">
                Fire Extinguisher Pricing
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Fire Extinguisher services
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-8">
              <div className="space-y-4 md:space-y-6 w-full">
                {/* Row 1: Fire Extinguisher Service – Base price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                      Fire Extinguisher Service
                    </Label>
                    <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                      Fire Extinguisher Service
                    </div>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="extinguisher-base-price" className="text-gray-700 font-medium">
                      Base Price (£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="extinguisher-base-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={extinguisherBasePrice}
                        onChange={(e) =>
                          setExtinguisherBasePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const price = parseFloat(extinguisherBasePrice) || 0;
                          try {
                            await saveProfessionalExtinguisherBasePrice(token, price);
                            setExtinguisherUpdateMessage({ type: "success", text: "Base price saved successfully." });
                          } catch {
                            setExtinguisherUpdateMessage({ type: "error", text: "Failed to save base price." });
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

                {/* Row 2: Select Extinguisher – Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select Extinguisher</Label>
                    <Select value={extinguisherValue} onValueChange={setExtinguisherValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingExtinguisherOptions ? "Loading..." : "Select extinguisher"}
                          label={String(
                            extinguisherOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (extinguisherValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {extinguisherOptions.length === 0 && !loadingExtinguisherOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          extinguisherOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="extinguisher-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="extinguisher-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={extinguisherPrice}
                        onChange={(e) =>
                          setExtinguisherPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const v = (extinguisherValue ?? "").trim();
                          if (!v || v === "no-data") return;
                          const opt = extinguisherOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          const extinguisherId = opt?.id ?? 0;
                          if (!extinguisherId) return;
                          const price = parseFloat(extinguisherPrice) || 0;
                          try {
                            await createProfessionalExtinguisherWisePrice(token, extinguisherId, "extinguisher", price);
                            setExtinguisherUpdateMessage({ type: "success", text: "Extinguisher price saved successfully." });
                          } catch {
                            setExtinguisherUpdateMessage({ type: "error", text: "Failed to save extinguisher price." });
                          }
                        }}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Select Floor – Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                    <Label className="text-gray-700 font-medium whitespace-nowrap">Select Floor</Label>
                    <Select value={extinguisherFloorValue} onValueChange={setExtinguisherFloorValue}>
                      <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingExtinguisherOptions ? "Loading..." : "Select floor"}
                          label={String(
                            extinguisherFloorOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (extinguisherFloorValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {extinguisherFloorOptions.length === 0 && !loadingExtinguisherOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          extinguisherFloorOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="extinguisher-floor-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="extinguisher-floor-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={extinguisherFloorPrice}
                        onChange={(e) =>
                          setExtinguisherFloorPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const v = (extinguisherFloorValue ?? "").trim();
                          if (!v || v === "no-data") return;
                          const opt = extinguisherFloorOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          const floorId = opt?.id ?? 0;
                          if (!floorId) return;
                          const price = parseFloat(extinguisherFloorPrice) || 0;
                          try {
                            await saveProfessionalExtinguisherFloorPrice(token, floorId, price);
                            setExtinguisherUpdateMessage({ type: "success", text: "Floor price saved successfully." });
                          } catch {
                            setExtinguisherUpdateMessage({ type: "error", text: "Failed to save floor price." });
                          }
                        }}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Select Extinguisher Type – Price (same structure as Select Floor) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                    <Label className="text-gray-700 font-medium whitespace-nowrap">Select Extinguisher Type</Label>
                    <Select value={extinguisherTypeValue} onValueChange={setExtinguisherTypeValue}>
                      <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingExtinguisherOptions ? "Loading..." : "Select extinguisher type"}
                          label={String(
                            extinguisherTypeOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (extinguisherTypeValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {extinguisherTypeOptions.length === 0 && !loadingExtinguisherOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          extinguisherTypeOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="extinguisher-type-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="extinguisher-type-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={extinguisherTypePrice}
                        onChange={(e) =>
                          setExtinguisherTypePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const v = (extinguisherTypeValue ?? "").trim();
                          if (!v || v === "no-data") return;
                          const opt = extinguisherTypeOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          const typeId = opt?.id ?? 0;
                          if (!typeId) return;
                          const price = parseFloat(extinguisherTypePrice) || 0;
                          try {
                            await saveProfessionalExtinguisherTypePrice(token, typeId, price);
                            setExtinguisherUpdateMessage({ type: "success", text: "Extinguisher type price saved successfully." });
                          } catch {
                            setExtinguisherUpdateMessage({ type: "error", text: "Failed to save extinguisher type price." });
                          }
                        }}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Select Last Service – Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select Last Service</Label>
                    <Select value={extinguisherLastServiceValue} onValueChange={setExtinguisherLastServiceValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingExtinguisherOptions ? "Loading..." : "Select last service"}
                          label={String(
                            extinguisherLastServiceOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (extinguisherLastServiceValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {extinguisherLastServiceOptions.length === 0 && !loadingExtinguisherOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          extinguisherLastServiceOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {val}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="extinguisher-last-service-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="extinguisher-last-service-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={extinguisherLastServicePrice}
                        onChange={(e) =>
                          setExtinguisherLastServicePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const v = (extinguisherLastServiceValue ?? "").trim();
                          if (!v || v === "no-data") return;
                          const opt = extinguisherLastServiceOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          const lastServiceId = opt?.id ?? 0;
                          if (!lastServiceId) return;
                          const price = parseFloat(extinguisherLastServicePrice) || 0;
                          try {
                            await saveProfessionalExtinguisherLastServicePrice(token, lastServiceId, price);
                            setExtinguisherUpdateMessage({ type: "success", text: "Last service price saved successfully." });
                          } catch {
                            setExtinguisherUpdateMessage({ type: "error", text: "Failed to save last service price." });
                          }
                        }}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Estimated Price(£) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="extinguisher-estimate-price" className="text-gray-700 font-medium">
                      Estimated Price(£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                      <Input
                        id="extinguisher-estimate-price"
                        type="text"
                        readOnly
                        placeholder="0.00"
                        value={extinguisherEstimatePrice}
                        className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
                </div>

                {extinguisherUpdateMessage && (
                  <p
                    className={`text-sm ${
                      extinguisherUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {extinguisherUpdateMessage.text}
                  </p>
                )}
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={async () => {
                      setExtinguisherUpdateMessage(null);
                      const token = getApiToken();
                      if (!token) {
                        setExtinguisherUpdateMessage({ type: "error", text: "Please log in to update prices." });
                        return;
                      }
                      setUpdatingExtinguisherPrice(true);
                      try {
                        const basePrice = parseFloat(extinguisherBasePrice) || 0;
                        await saveProfessionalExtinguisherBasePrice(token, basePrice);
                        const extinguisherId =
                          (() => {
                            const v = (extinguisherValue ?? "").trim();
                            if (!v || v === "no-data") return 0;
                            const opt = extinguisherOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                            );
                            return opt?.id ?? 0;
                          })();
                        if (extinguisherId) {
                          const price = parseFloat(extinguisherPrice) || 0;
                          await createProfessionalExtinguisherWisePrice(token, extinguisherId, "extinguisher", price);
                        }
                        const floorId =
                          (() => {
                            const v = (extinguisherFloorValue ?? "").trim();
                            if (!v || v === "no-data") return 0;
                            const opt = extinguisherFloorOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                            );
                            return opt?.id ?? 0;
                          })();
                        if (floorId) {
                          const floorPrice = parseFloat(extinguisherFloorPrice) || 0;
                          await saveProfessionalExtinguisherFloorPrice(token, floorId, floorPrice);
                        }
                        const extinguisherTypeId =
                          (() => {
                            const v = (extinguisherTypeValue ?? "").trim();
                            if (!v || v === "no-data") return 0;
                            const opt = extinguisherTypeOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                            );
                            return opt?.id ?? 0;
                          })();
                        if (extinguisherTypeId) {
                          const typePrice = parseFloat(extinguisherTypePrice) || 0;
                          await saveProfessionalExtinguisherTypePrice(token, extinguisherTypeId, typePrice);
                        }
                        const lastServiceId =
                          (() => {
                            const v = (extinguisherLastServiceValue ?? "").trim();
                            if (!v || v === "no-data") return 0;
                            const opt = extinguisherLastServiceOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                            );
                            return opt?.id ?? 0;
                          })();
                        if (lastServiceId) {
                          const lastServicePrice = parseFloat(extinguisherLastServicePrice) || 0;
                          await saveProfessionalExtinguisherLastServicePrice(token, lastServiceId, lastServicePrice);
                        }
                        setExtinguisherUpdateMessage({ type: "success", text: "Price updated successfully." });
                      } catch {
                        setExtinguisherUpdateMessage({ type: "error", text: "Failed to update price." });
                      } finally {
                        setUpdatingExtinguisherPrice(false);
                      }
                    }}
                    disabled={updatingExtinguisherPrice}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
                  >
                    {updatingExtinguisherPrice ? (
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value={TAB_IDS.EMERGENCY_LIGHTING} className="mt-0 w-full">
          <Card className="w-full border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="text-lg text-[#0A1A2F]">
                Emergency Lighting Pricing
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Emergency Lighting services
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-8">
              <div className="space-y-4 md:space-y-6 w-full">
                {/* Row 1: Emergency Light Service – Base price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                      Emergency Light Service
                    </Label>
                    <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                      Emergency Light Service
                    </div>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="emergency-light-base-price" className="text-gray-700 font-medium">
                      Base Price (£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="emergency-light-base-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={emergencyLightBasePrice}
                        onChange={(e) =>
                          setEmergencyLightBasePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const price = parseFloat(emergencyLightBasePrice) || 0;
                          try {
                            await saveProfessionalEmergencyLightBasePrice(token, price);
                            setEmergencyLightUpdateMessage({ type: "success", text: "Base price saved successfully." });
                          } catch {
                            setEmergencyLightUpdateMessage({ type: "error", text: "Failed to save base price." });
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

                {/* Row 2: Select emergency light – Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select Emergency light</Label>
                    <Select value={emergencyLightValue} onValueChange={setEmergencyLightValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingEmergencyLightOptions ? "Loading..." : "Select Emergency light"}
                          label={String(
                            emergencyLightOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (emergencyLightValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {emergencyLightOptions.length === 0 && !loadingEmergencyLightOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          emergencyLightOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="emergency-light-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="emergency-light-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={emergencyLightPrice}
                        onChange={(e) =>
                          setEmergencyLightPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveEmergencyLightPriceNow}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Select emergency light floor – Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                    <Label className="text-gray-700 font-medium whitespace-nowrap">Select Emergency light floor</Label>
                    <Select value={emergencyLightFloorValue} onValueChange={setEmergencyLightFloorValue}>
                      <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingEmergencyLightOptions ? "Loading..." : "Select floor"}
                          label={String(
                            emergencyLightFloorOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (emergencyLightFloorValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {emergencyLightFloorOptions.length === 0 && !loadingEmergencyLightOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          emergencyLightFloorOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="emergency-light-floor-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="emergency-light-floor-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={emergencyLightFloorPrice}
                        onChange={(e) =>
                          setEmergencyLightFloorPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={saveEmergencyLightFloorPriceNow}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Select emergency light type – Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                    <Label className="text-gray-700 font-medium whitespace-nowrap">Select Emergency light type</Label>
                    <Select value={emergencyLightTypeValue} onValueChange={setEmergencyLightTypeValue}>
                      <SelectTrigger className="w-full min-w-0 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingEmergencyLightOptions ? "Loading..." : "Select type"}
                          label={String(
                            emergencyLightTypeOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (emergencyLightTypeValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {emergencyLightTypeOptions.length === 0 && !loadingEmergencyLightOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          emergencyLightTypeOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="emergency-light-type-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="emergency-light-type-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={emergencyLightTypePrice}
                        onChange={(e) =>
                          setEmergencyLightTypePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const v = (emergencyLightTypeValue ?? "").trim();
                          if (!v || v === "no-data") return;
                          const opt = emergencyLightTypeOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          const lightTypeId = opt?.id ?? 0;
                          if (!lightTypeId) return;
                          const price = parseFloat(emergencyLightTypePrice) || 0;
                          try {
                            await saveProfessionalEmergencyLightTypePrice(token, lightTypeId, price);
                            setEmergencyLightUpdateMessage({ type: "success", text: "Emergency light type price saved successfully." });
                          } catch {
                            setEmergencyLightUpdateMessage({ type: "error", text: "Failed to save Emergency light type price." });
                          }
                        }}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Select emergency light test – Price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">Select Emergency light test</Label>
                    <Select value={emergencyLightTestValue} onValueChange={setEmergencyLightTestValue}>
                      <SelectTrigger className="w-full h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue
                          placeholder={loadingEmergencyLightOptions ? "Loading..." : "Select test"}
                          label={String(
                            emergencyLightTestOptions.find(
                              (o) => (String(o.value ?? "").trim() || String(o.id)) === (emergencyLightTestValue ?? "").trim()
                            )?.value ?? ""
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {emergencyLightTestOptions.length === 0 && !loadingEmergencyLightOptions ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          emergencyLightTestOptions.map((opt) => {
                            const val = String(opt.value ?? "").trim() || String(opt.id);
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="emergency-light-test-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="emergency-light-test-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={emergencyLightTestPrice}
                        onChange={(e) =>
                          setEmergencyLightTestPrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const v = (emergencyLightTestValue ?? "").trim();
                          if (!v || v === "no-data") return;
                          const opt = emergencyLightTestOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          const lightTestId = opt?.id ?? 0;
                          if (!lightTestId) return;
                          const price = parseFloat(emergencyLightTestPrice) || 0;
                          try {
                            await saveProfessionalEmergencyLightTestPrice(token, lightTestId, price);
                            setEmergencyLightUpdateMessage({ type: "success", text: "Emergency light test price saved successfully." });
                          } catch {
                            setEmergencyLightUpdateMessage({ type: "error", text: "Failed to save Emergency light test price." });
                          }
                        }}
                        className="w-full pl-8 h-12 text-base border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Estimated Price(£) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="emergency-light-estimate-price" className="text-gray-700 font-medium">
                      Estimated Price(£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                      <Input
                        id="emergency-light-estimate-price"
                        type="text"
                        readOnly
                        placeholder="0.00"
                        value={emergencyLightEstimatePrice}
                        className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
                </div>

                {emergencyLightUpdateMessage && (
                  <p
                    className={`text-sm ${
                      emergencyLightUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {emergencyLightUpdateMessage.text}
                  </p>
                )}
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={async () => {
                      setEmergencyLightUpdateMessage(null);
                      const token = getApiToken();
                      if (!token) {
                        setEmergencyLightUpdateMessage({ type: "error", text: "Please log in to update prices." });
                        return;
                      }
                      setUpdatingEmergencyLightPrice(true);
                      try {
                        const basePrice = parseFloat(emergencyLightBasePrice) || 0;
                        await saveProfessionalEmergencyLightBasePrice(token, basePrice);
                        const lightId = (() => {
                          const v = (emergencyLightValue ?? "").trim();
                          if (!v || v === "no-data") return 0;
                          const opt = emergencyLightOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          return opt?.id ?? 0;
                        })();
                        if (lightId) {
                          const price = parseFloat(emergencyLightPrice) || 0;
                          await createProfessionalEmergencyLightPrice(token, lightId, "light", price);
                        }
                        const floorId = (() => {
                          const v = (emergencyLightFloorValue ?? "").trim();
                          if (!v || v === "no-data") return 0;
                          const opt = emergencyLightFloorOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          return opt?.id ?? 0;
                        })();
                        if (floorId) {
                          const floorPrice = parseFloat(emergencyLightFloorPrice) || 0;
                          await saveProfessionalEmergencyLightFloorPrice(token, floorId, floorPrice);
                        }
                        const lightTypeId = (() => {
                          const v = (emergencyLightTypeValue ?? "").trim();
                          if (!v || v === "no-data") return 0;
                          const opt = emergencyLightTypeOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          return opt?.id ?? 0;
                        })();
                        if (lightTypeId) {
                          const typePrice = parseFloat(emergencyLightTypePrice) || 0;
                          await saveProfessionalEmergencyLightTypePrice(token, lightTypeId, typePrice);
                        }
                        const lightTestId = (() => {
                          const v = (emergencyLightTestValue ?? "").trim();
                          if (!v || v === "no-data") return 0;
                          const opt = emergencyLightTestOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === v
                          );
                          return opt?.id ?? 0;
                        })();
                        if (lightTestId) {
                          const testPrice = parseFloat(emergencyLightTestPrice) || 0;
                          await saveProfessionalEmergencyLightTestPrice(token, lightTestId, testPrice);
                        }
                        setEmergencyLightUpdateMessage({ type: "success", text: "Price updated successfully." });
                      } catch {
                        setEmergencyLightUpdateMessage({ type: "error", text: "Failed to update price." });
                      } finally {
                        setUpdatingEmergencyLightPrice(false);
                      }
                    }}
                    disabled={updatingEmergencyLightPrice}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
                  >
                    {updatingEmergencyLightPrice ? (
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value={TAB_IDS.TRAINING} className="mt-0 w-full">
          <Card className="w-full border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle className="text-lg text-[#0A1A2F]">
                Training Pricing
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Training services
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-8">
              <div className="space-y-4 md:space-y-6 w-full">
                {/* Row 1: Professional marshal – Base price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                      Professional Marshal
                    </Label>
                    <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                      Professional Marshal
                    </div>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="training-base-price" className="text-gray-700 font-medium">
                      Base Price (£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="training-base-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={trainingBasePrice}
                        onChange={(e) =>
                          setTrainingBasePrice(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const price = parseFloat(trainingBasePrice) || 0;
                          try {
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

                {/* Row 2: Select People – Price */}
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
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="training-people-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="training-people-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={trainingPeoplePrice}
                        onChange={(e) => {
                          setTrainingTotalPriceFromApi(null);
                          setTrainingPeoplePrice(e.target.value.replace(/[^0-9.]/g, ""));
                        }}
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const peopleOpt = trainingPeopleOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPeopleValue
                          );
                          if (!peopleOpt || !trainingPeopleValue || trainingPeopleValue === "no-data") return;
                          const price = parseFloat(trainingPeoplePrice) || 0;
                          try {
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


                {/* Row 3: Select Place – Price */}
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
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="training-place-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="training-place-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={trainingPlacePrice}
                        onChange={(e) => {
                          setTrainingTotalPriceFromApi(null);
                          setTrainingPlacePrice(e.target.value.replace(/[^0-9.]/g, ""));
                        }}
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const placeOpt = trainingPlaceOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPlaceValue
                          );
                          if (!placeOpt || !trainingPlaceValue || trainingPlaceValue === "no-data") return;
                          const price = parseFloat(trainingPlacePrice) || 0;
                          try {
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

                {/* Row 4: Select Training – Price */}
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
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="training-training-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="training-training-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={trainingTrainingPrice}
                        onChange={(e) => {
                          setTrainingTotalPriceFromApi(null);
                          setTrainingTrainingPrice(e.target.value.replace(/[^0-9.]/g, ""));
                        }}
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const trainingOnOpt = trainingTrainingOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingTrainingValue
                          );
                          if (!trainingOnOpt || !trainingTrainingValue || trainingTrainingValue === "no-data") return;
                          const price = parseFloat(trainingTrainingPrice) || 0;
                          try {
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

                {/* Row 5: Select Experience – Price */}
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
                            return (
                              <SelectItem key={opt.id} value={val}>
                                {opt.value}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="training-experience-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="training-experience-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={trainingExperiencePrice}
                        onChange={(e) => {
                          setTrainingTotalPriceFromApi(null);
                          setTrainingExperiencePrice(e.target.value.replace(/[^0-9.]/g, ""));
                        }}
                        onBlur={async () => {
                          const token = getApiToken();
                          if (!token) return;
                          const experienceOpt = trainingExperienceOptions.find(
                            (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingExperienceValue
                          );
                          if (!experienceOpt || !trainingExperienceValue || trainingExperienceValue === "no-data") return;
                          const price = parseFloat(trainingExperiencePrice) || 0;
                          try {
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

                {/* Estimated Price(£) – from API total when available, else sum of base + addon prices */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="training-estimate-price" className="text-gray-700 font-medium">
                      Estimated Price(£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                      <Input
                        id="training-estimate-price"
                        type="text"
                        readOnly
                        placeholder="0.00"
                        value={trainingTotalPriceFromApi ?? trainingEstimatePrice}
                        className="w-full pl-8 h-12 text-base font-semibold border-gray-200 bg-gray-50 focus:ring-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="hidden md:block flex-shrink-0 w-36 md:w-40" aria-hidden />
                </div>

                {trainingUpdateMessage && (
                  <p
                    className={`text-sm ${
                      trainingUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {trainingUpdateMessage.text}
                  </p>
                )}
                <div className="pt-4">
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
                        await saveProfessionalMarshalBasePrice(token, basePrice);
                        const peopleOpt = trainingPeopleOptions.find(
                          (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPeopleValue
                        );
                        if (peopleOpt && trainingPeopleValue && trainingPeopleValue !== "no-data") {
                          const peoplePrice = parseFloat(trainingPeoplePrice) || 0;
                          await saveProfessionalMarshalPeoplePrice(token, peopleOpt.id, peoplePrice);
                        }
                        const placeOpt = trainingPlaceOptions.find(
                          (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingPlaceValue
                        );
                        if (placeOpt && trainingPlaceValue && trainingPlaceValue !== "no-data") {
                          const placePrice = parseFloat(trainingPlacePrice) || 0;
                          await saveProfessionalMarshalPlacePrice(token, placeOpt.id, placePrice);
                        }
                        const trainingOnOpt = trainingTrainingOptions.find(
                          (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingTrainingValue
                        );
                        if (trainingOnOpt && trainingTrainingValue && trainingTrainingValue !== "no-data") {
                          const trainingOnPrice = parseFloat(trainingTrainingPrice) || 0;
                          await saveProfessionalMarshalTrainingOnPrice(token, trainingOnOpt.id, trainingOnPrice);
                        }
                        const experienceOpt = trainingExperienceOptions.find(
                          (o) => (String(o.value ?? "").trim() || String(o.id)) === trainingExperienceValue
                        );
                        if (experienceOpt && trainingExperienceValue && trainingExperienceValue !== "no-data") {
                          const experiencePrice = parseFloat(trainingExperiencePrice) || 0;
                          await saveProfessionalMarshalExperiencePrice(token, experienceOpt.id, experiencePrice);
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
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value={TAB_IDS.CONSULTANCY} className="mt-0 w-full">
          <Card className="w-full border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <div>
                <CardTitle className="text-lg text-[#0A1A2F]">
                  Consultancy Pricing
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Set your base and modifier prices for Consultancy services
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-8">
              <div className="space-y-4 md:space-y-6 w-full">
                {/* Row 1: Consultation – Base price */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label className="text-gray-700 font-medium">
                      Consultation
                    </Label>
                    <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                      Consultation
                    </div>
                  </div>
                  <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                    <Label htmlFor="consultancy-base-price" className="text-gray-700 font-medium">
                      Base Price (£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="consultancy-base-price"
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

                {/* Row 2: Select Consultation Model – Price */}
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
                    <Label htmlFor="consultancy-model-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="consultancy-model-price"
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

                {/* Row 3: Select Consultation Hours – Price */}
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
                    <Label htmlFor="consultancy-hours-price" className="text-gray-700 font-medium">Price (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                      <Input
                        id="consultancy-hours-price"
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

                {/* Estimated Price(£) */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Label htmlFor="consultancy-estimate-price" className="text-gray-700 font-medium">
                      Estimated Price(£)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                      <Input
                        id="consultancy-estimate-price"
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

                {consultancyUpdateMessage && (
                  <p
                    className={`text-sm ${
                      consultancyUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {consultancyUpdateMessage.text}
                  </p>
                )}
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={async () => {
                      setConsultancyUpdateMessage(null);
                      const token = getApiToken();
                      if (!token) {
                        setConsultancyUpdateMessage({ type: "error", text: "Please log in to update prices." });
                        return;
                      }
                      setUpdatingConsultancyPrice(true);
                      try {
                        // TODO: wire to consultancy base/model/hours price APIs when available
                        setConsultancyUpdateMessage({ type: "success", text: "Price updated successfully." });
                      } catch {
                        setConsultancyUpdateMessage({ type: "error", text: "Failed to update price." });
                      } finally {
                        setUpdatingConsultancyPrice(false);
                      }
                    }}
                    disabled={updatingConsultancyPrice}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 h-12 px-6 md:px-8 font-medium disabled:opacity-70"
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Consultancy Pricing Edit Modal */}
      <Dialog open={consultancyModalOpen} onOpenChange={setConsultancyModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b pl-6 pr-14 pt-6 pb-4">
            <div>
              <DialogTitle className="text-lg text-[#0A1A2F] font-semibold">
                Consultancy Pricing
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your base and modifier prices for Consultancy services
              </p>
            </div>
          </div>
          <div className="p-4 md:p-8">
            <div className="space-y-4 md:space-y-6 w-full">
              {/* Row 1: Consultation – Base price */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-gray-700 font-medium">Consultation</Label>
                  <div className="h-12 flex items-center text-gray-500 border border-gray-200 rounded-md px-3 bg-gray-50">
                    Consultation
                  </div>
                </div>
                <div className="space-y-2 flex-shrink-0 w-36 md:w-40">
                  <Label htmlFor="modal-consultancy-base-price" className="text-gray-700 font-medium">
                    Base Price (£)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-consultancy-base-price"
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

              {/* Row 2: Select Consultation Model – Price */}
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
                  <Label htmlFor="modal-consultancy-model-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-consultancy-model-price"
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

              {/* Row 3: Select Consultation Hours – Price */}
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
                  <Label htmlFor="modal-consultancy-hours-price" className="text-gray-700 font-medium">Price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <Input
                      id="modal-consultancy-hours-price"
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

              {/* Estimated Price(£) */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label htmlFor="modal-consultancy-estimate-price" className="text-gray-700 font-medium">
                    Estimated Price(£)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">£</span>
                    <Input
                      id="modal-consultancy-estimate-price"
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

              {consultancyUpdateMessage && (
                <p
                  className={`text-sm ${
                    consultancyUpdateMessage.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {consultancyUpdateMessage.text}
                </p>
              )}
              <div className="pt-4">
                <Button
                  type="button"
                  onClick={async () => {
                    setConsultancyUpdateMessage(null);
                    const token = getApiToken();
                    if (!token) {
                      setConsultancyUpdateMessage({ type: "error", text: "Please log in to update prices." });
                      return;
                    }
                    setUpdatingConsultancyPrice(true);
                    try {
                      setConsultancyUpdateMessage({ type: "success", text: "Price updated successfully." });
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComingSoonCard({ title }: { title: string }) {
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardContent className="p-12 text-center">
        <p className="text-gray-500 text-lg">{title} pricing coming soon.</p>
        <p className="text-gray-400 text-sm mt-2">This tab is currently disabled.</p>
      </CardContent>
    </Card>
  );
}
