import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, Building2, Users, Layers, Calendar, FileText, ChevronLeft, Loader2, HelpCircle, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { fetchPropertyTypes, PropertyTypeResponse, fetchApproximatePeople, ApproximatePeopleResponse, formatPeopleOptionLabel, getPeopleOptionSortKey, fetchFloorPricing, FloorPricingItem, fetchFraDurations, FraDurationItem, fetchFireAlarmOptions, FireAlarmOptionItem, fetchExtinguisherServiceOptions, ExtinguisherServiceOptionItem, fetchEmergencyLightOptions, EmergencyLightServiceOptionItem, fetchMarshalOptions, MarshalServiceOptionItem, fetchFireConsultationOptions, ConsultationOptionItem } from "../api/servicesService";
import { storeCustomQuoteRequest, type CustomQuoteRequestData } from "../api/customQuoteRequestsService";
import { getApiToken, getUserFullName, getUserEmail, getUserPhone } from "../lib/auth";
import { toast } from "sonner";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";

/** Label shown in SelectTrigger when options are `{ id, value }` and stored value is usually `String(id)` (also supports static items where value is the label text). */
function marshalSelectTriggerLabel(
  options: { id: number; value: string }[],
  value: string,
  placeholder: string
): string {
  const v = (value || "").trim();
  if (!v) return placeholder;
  const byId = options.find((o) => String(o.id) === v);
  if (byId?.value) return byId.value;
  const byValue = options.find((o) => (o.value || "").trim() === v);
  if (byValue?.value) return byValue.value;
  return v || placeholder;
}

/**
 * Custom-quote dropdowns store option `id` in form state; using `parseInt(id)` as "floor count" is wrong
 * (e.g. option id 6 can mean "2–3 floors"). Prefer digits from the option label, then fall back to id.
 */
function quoteFloorsNumericFromSelection(args: {
  showCustomInput: boolean;
  customNumericRaw: string;
  presetIdOrRaw: string;
  labelFromOption: string;
}): number {
  if (args.showCustomInput) {
    const n = parseInt(String(args.customNumericRaw).trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  const label = (args.labelFromOption || "").trim();
  const matches = label.match(/\d+/g);
  if (matches?.length) {
    const nums = matches.map((m) => parseInt(m, 10)).filter((x) => Number.isFinite(x));
    if (nums.length) return Math.max(...nums);
  }
  const idFallback = parseInt(String(args.presetIdOrRaw), 10);
  return Number.isFinite(idFallback) && idFallback > 0 ? idFallback : 0;
}

interface SmartQuestionnaireProps {
  service: string;
  serviceId?: number;
  /** When provided, used to show Fire Alarm–specific steps (e.g. smoke/heat detectors) only for Fire Alarm service */
  serviceName?: string;
  onComplete: (formData: {
    property_type_id: number;
    approximate_people_id: number;
    number_of_floors: string;
    property_type_label?: string;
    approximate_people_label?: string;
    number_of_floors_id?: number;
    preferred_date: string;
    access_note: string;
    duration_id?: number;
    detector_count?: string;
    isCustomQuote?: boolean;
    request_data?: { building_type: string; people_count: string; floors: number };
    service_id?: number;
  }) => void;
  onBack: () => void;
  /** Custom content rendered at the bottom, below the navigation buttons */
  bottomContent?: React.ReactNode;
}

export function SmartQuestionnaire({ service, serviceId, serviceName, onComplete, onBack, bottomContent }: SmartQuestionnaireProps) {
  const navigate = useNavigate();
  const isFireAlarmService = (serviceName?.toLowerCase().includes("alarm") ?? false);
  const isFireRiskAssessmentService = ((serviceName?.toLowerCase().includes("risk") && serviceName?.toLowerCase().includes("assessment")) ?? false);
  const isFireExtinguisherService = (serviceName?.toLowerCase().includes("extinguisher") ?? false);
  const isEmergencyLightingService = (serviceName?.toLowerCase().includes("lighting") ?? false);
  const isFireSafetyConsultationService = (serviceName?.toLowerCase().includes("consultation") ?? false);
  const isFireMarshalTrainingService = ((serviceName?.toLowerCase().includes("marshal") || serviceName?.toLowerCase().includes("warden") || serviceName?.toLowerCase().includes("training")) ?? false);
  const totalSteps = isFireAlarmService ? 8 : isFireExtinguisherService ? 6 : isEmergencyLightingService ? 6 : isFireSafetyConsultationService ? 4 : isFireMarshalTrainingService ? 6 : isFireRiskAssessmentService ? 6 : 6;

  const [currentStep, setCurrentStep] = useState(1);
  /** After Back, skip one auto-advance on `currentStep` so we do not immediately jump forward again. */
  const wentBackRef = useRef(false);
  const [formData, setFormData] = useState({
    propertyTypeId: "",
    customPropertyType: "",
    approximatePeopleId: "",
    customPeopleCount: "",
    detectorCount: "",
    customDetectorCount: "",
    manualCallPoints: "",
    customManualCallPoints: "",
    fireAlarmFloors: "",
    customFireAlarmFloors: "",
    fireAlarmPanels: "",
    customFireAlarmPanels: "",
    alarmSystemType: "",
    lastServiced: "",
    numberOfFloors: "",
    customFloorsCount: "",
    extinguisherCount: "",
    customExtinguisherCount: "",
    extinguisherFloors: "",
    customExtinguisherFloors: "",
    extinguisherTypesKnow: "",
    extinguisherTypesList: "",
    extinguisherTypeId: "",
    extinguisherLastServiced: "",
    emergencyLightsCount: "",
    customEmergencyLightsCount: "",
    emergencyLightsFloors: "",
    customEmergencyLightsFloors: "",
    emergencyLightingType: "",
    emergencyLightingTestFrequency: "",
    consultationType: "",
    consultationHours: "",
    customConsultationHours: "",
    trainingPeopleCount: "",
    customTrainingPeopleCount: "",
    trainingLocation: "",
    buildingTypeForTraining: "",
    staffTrainingBefore: "",
    fraAssessmentType: "",
    assessmentDate: "",
    accessNotes: "",
    durationId: ""
  });
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeResponse[]>([]);
  const [loadingPropertyTypes, setLoadingPropertyTypes] = useState<boolean>(true);
  const [approximatePeople, setApproximatePeople] = useState<ApproximatePeopleResponse[]>([]);
  const [loadingApproximatePeople, setLoadingApproximatePeople] = useState<boolean>(true);
  const [floorPricing, setFloorPricing] = useState<FloorPricingItem[]>([]);
  const [loadingFloorPricing, setLoadingFloorPricing] = useState<boolean>(true);
  const [fraDurations, setFraDurations] = useState<FraDurationItem[]>([]);
  const [loadingFraDurations, setLoadingFraDurations] = useState<boolean>(true);
  const [submittingCustomQuote, setSubmittingCustomQuote] = useState(false);
  const [fireAlarmDetectorsOptions, setFireAlarmDetectorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmCallPointsOptions, setFireAlarmCallPointsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmFloorsOptions, setFireAlarmFloorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmPanelsOptions, setFireAlarmPanelsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmSystemTypeOptions, setFireAlarmSystemTypeOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmLastServiceOptions, setFireAlarmLastServiceOptions] = useState<FireAlarmOptionItem[]>([]);
  const [loadingFireAlarmOptions, setLoadingFireAlarmOptions] = useState(false);
  const [extinguisherCountOptions, setExtinguisherCountOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherFloorOptions, setExtinguisherFloorOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherTypeOptions, setExtinguisherTypeOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherLastServiceOptions, setExtinguisherLastServiceOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [loadingExtinguisherOptions, setLoadingExtinguisherOptions] = useState(false);
  const [emergencyLightCountOptions, setEmergencyLightCountOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyLightFloorOptions, setEmergencyLightFloorOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyLightTypeOptions, setEmergencyLightTypeOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyLightTestOptions, setEmergencyLightTestOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [loadingEmergencyLightOptions, setLoadingEmergencyLightOptions] = useState(false);
  const [marshalPeopleOptions, setMarshalPeopleOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalPlaceOptions, setMarshalPlaceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalBuildingTypeOptions, setMarshalBuildingTypeOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalExperienceOptions, setMarshalExperienceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [loadingMarshalOptions, setLoadingMarshalOptions] = useState(false);
  const [consultationModeOptions, setConsultationModeOptions] = useState<ConsultationOptionItem[]>([]);
  const [consultationHourOptions, setConsultationHourOptions] = useState<ConsultationOptionItem[]>([]);
  const [loadingConsultationOptions, setLoadingConsultationOptions] = useState(false);

  const CUSTOM_PEOPLE_OPTION_VALUE = "More than 500 people";
  const CUSTOM_FLOORS_OPTION_VALUE = "More than 5 floors"; // Same approach as people: one custom option that shows custom input
  const isMoreThan500People = (value: string) =>
    /more than 500|500\+|501\+/i.test(value) || value.toLowerCase().includes("500");
  const showCustomPeopleInput = isMoreThan500People(formData.approximatePeopleId);
  const peopleCountDisplay = showCustomPeopleInput && formData.customPeopleCount.trim()
    ? formData.customPeopleCount.trim()
    : formData.approximatePeopleId;
  const isCustomFloorsOption = formData.numberOfFloors === CUSTOM_FLOORS_OPTION_VALUE;
  const floorOptions = useMemo(() => {
    const seen = new Set<string>();
    return floorPricing.filter((item) => {
      if (seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    });
  }, [floorPricing]);
  const CUSTOM_FA_DETECTORS = "__custom_fa_detectors__";
  const CUSTOM_FA_CALL_POINTS = "__custom_fa_call_points__";
  const CUSTOM_FA_FLOORS = "__custom_fa_floors__";
  const CUSTOM_FA_PANELS = "__custom_fa_panels__";
  const showCustomDetectorInput = formData.detectorCount === CUSTOM_FA_DETECTORS;
  const detectorDisplay = showCustomDetectorInput && formData.customDetectorCount.trim()
    ? formData.customDetectorCount.trim()
    : (fireAlarmDetectorsOptions.find((o) => String(o.id) === formData.detectorCount)?.value ?? formData.detectorCount);
  const showCustomManualCallPointsInput = formData.manualCallPoints === CUSTOM_FA_CALL_POINTS;
  const manualCallPointsDisplay = showCustomManualCallPointsInput && formData.customManualCallPoints.trim()
    ? formData.customManualCallPoints.trim()
    : (fireAlarmCallPointsOptions.find((o) => String(o.id) === formData.manualCallPoints)?.value ?? formData.manualCallPoints);
  const showCustomFireAlarmFloorsInput = formData.fireAlarmFloors === CUSTOM_FA_FLOORS;
  const fireAlarmFloorsDisplay = showCustomFireAlarmFloorsInput && formData.customFireAlarmFloors.trim()
    ? formData.customFireAlarmFloors.trim()
    : (fireAlarmFloorsOptions.find((o) => String(o.id) === formData.fireAlarmFloors)?.value ?? formData.fireAlarmFloors);
  const showCustomFireAlarmPanelsInput = formData.fireAlarmPanels === CUSTOM_FA_PANELS;
  const fireAlarmPanelsDisplay = showCustomFireAlarmPanelsInput && formData.customFireAlarmPanels.trim()
    ? formData.customFireAlarmPanels.trim()
    : (fireAlarmPanelsOptions.find((o) => String(o.id) === formData.fireAlarmPanels)?.value ?? formData.fireAlarmPanels);
  const alarmSystemTypeDisplay = fireAlarmSystemTypeOptions.find((o) => String(o.id) === formData.alarmSystemType)?.value ?? formData.alarmSystemType;
  const lastServicedDisplay = formData.lastServiced === "__skip__" || !formData.lastServiced
    ? ""
    : (fireAlarmLastServiceOptions.find((o) => String(o.id) === formData.lastServiced)?.value ?? formData.lastServiced);
  const CUSTOM_EXT_COUNT = "__custom_ext_count__";
  const CUSTOM_EXT_FLOORS = "__custom_ext_floors__";
  const showCustomExtinguisherInput = formData.extinguisherCount === CUSTOM_EXT_COUNT;
  const extinguisherCountDisplay = showCustomExtinguisherInput && formData.customExtinguisherCount.trim()
    ? formData.customExtinguisherCount.trim()
    : (extinguisherCountOptions.find((o) => String(o.id) === formData.extinguisherCount)?.value ?? formData.extinguisherCount);
  const showCustomExtinguisherFloorsInput = formData.extinguisherFloors === CUSTOM_EXT_FLOORS;
  const extinguisherFloorsDisplay = showCustomExtinguisherFloorsInput && formData.customExtinguisherFloors.trim()
    ? formData.customExtinguisherFloors.trim()
    : (extinguisherFloorOptions.find((o) => String(o.id) === formData.extinguisherFloors)?.value ?? formData.extinguisherFloors);
  const extinguisherTypeDisplay = formData.extinguisherTypeId && formData.extinguisherTypeId !== "__skip__"
    ? (extinguisherTypeOptions.find((o) => String(o.id) === formData.extinguisherTypeId)?.value ?? "")
    : "";
  const extinguisherLastServicedDisplay = formData.extinguisherLastServiced && formData.extinguisherLastServiced !== "__skip__"
    ? (extinguisherLastServiceOptions.find((o) => String(o.id) === formData.extinguisherLastServiced)?.value ?? formData.extinguisherLastServiced)
    : "";
  const CUSTOM_EL_LIGHTS = "__custom_el_lights__";
  const CUSTOM_EL_FLOORS = "__custom_el_floors__";
  const showCustomEmergencyLightsInput = formData.emergencyLightsCount === CUSTOM_EL_LIGHTS;
  const emergencyLightsCountDisplay = showCustomEmergencyLightsInput && formData.customEmergencyLightsCount.trim()
    ? formData.customEmergencyLightsCount.trim()
    : (emergencyLightCountOptions.find((o) => String(o.id) === formData.emergencyLightsCount)?.value ?? formData.emergencyLightsCount);
  const showCustomEmergencyLightsFloorsInput = formData.emergencyLightsFloors === CUSTOM_EL_FLOORS;
  const emergencyLightsFloorsDisplay = showCustomEmergencyLightsFloorsInput && formData.customEmergencyLightsFloors.trim()
    ? formData.customEmergencyLightsFloors.trim()
    : (emergencyLightFloorOptions.find((o) => String(o.id) === formData.emergencyLightsFloors)?.value ?? formData.emergencyLightsFloors);
  const showCustomConsultationHoursInput = formData.consultationHours === "4+";
  const consultationHoursDisplay = showCustomConsultationHoursInput && formData.customConsultationHours.trim()
    ? formData.customConsultationHours.trim()
    : formData.consultationHours;
  const CUSTOM_MARSHAL_PEOPLE = "__custom_marshal_people__";
  const showCustomTrainingPeopleInput = formData.trainingPeopleCount === CUSTOM_MARSHAL_PEOPLE || formData.trainingPeopleCount === "40+";
  const trainingPeopleCountDisplay = showCustomTrainingPeopleInput && formData.customTrainingPeopleCount.trim()
    ? formData.customTrainingPeopleCount.trim()
    : (marshalPeopleOptions.find((o) => String(o.id) === formData.trainingPeopleCount)?.value ?? formData.trainingPeopleCount);
  const showCustomFloorsInput = isCustomFloorsOption;
  const floorsDisplay = showCustomFloorsInput && formData.customFloorsCount.trim()
    ? formData.customFloorsCount.trim()
    : formData.numberOfFloors;

  useEffect(() => {
    const loadPropertyTypes = async () => {
      try {
        setLoadingPropertyTypes(true);
        const data = await fetchPropertyTypes();
        setPropertyTypes(data);
      } catch (err: any) {
        console.error("Error loading property types:", err);
        // Continue with empty array if fetch fails
        setPropertyTypes([]);
      } finally {
        setLoadingPropertyTypes(false);
      }
    };

    loadPropertyTypes();
  }, []);

  useEffect(() => {
    const loadApproximatePeople = async () => {
      try {
        setLoadingApproximatePeople(true);
        const data = await fetchApproximatePeople();
        // Sort by serial range: 1–10, 11–25, 26–50, 51–100, 100+, then More than 500
        const sortedData = [...data].sort(
          (a, b) => getPeopleOptionSortKey(a.number_of_people) - getPeopleOptionSortKey(b.number_of_people)
        );
        setApproximatePeople(sortedData);
      } catch (err: any) {
        console.error("Error loading approximate people:", err);
        // Continue with empty array if fetch fails
        setApproximatePeople([]);
      } finally {
        setLoadingApproximatePeople(false);
      }
    };

    loadApproximatePeople();
  }, []);

  useEffect(() => {
    const loadFloorPricing = async () => {
      try {
        setLoadingFloorPricing(true);
        const data = await fetchFloorPricing();
        setFloorPricing(data);
      } catch (err: any) {
        console.error("Error loading floor pricing:", err);
        setFloorPricing([]);
      } finally {
        setLoadingFloorPricing(false);
      }
    };
    loadFloorPricing();
  }, []);

  useEffect(() => {
    const loadFraDurations = async () => {
      try {
        setLoadingFraDurations(true);
        const data = await fetchFraDurations();
        setFraDurations(data);
      } catch (err: any) {
        console.error("Error loading FRA durations:", err);
        setFraDurations([]);
      } finally {
        setLoadingFraDurations(false);
      }
    };
    loadFraDurations();
  }, []);

  useEffect(() => {
    if (!isFireAlarmService) return;
    const token = getApiToken();
    const load = async () => {
      setLoadingFireAlarmOptions(true);
      try {
        const [detectors, callPoints, floors, panels, systemType, lastService] = await Promise.all([
          fetchFireAlarmOptions(token, "ditectors"),
          fetchFireAlarmOptions(token, "call_points"),
          fetchFireAlarmOptions(token, "floors"),
          fetchFireAlarmOptions(token, "alarm_panels"),
          fetchFireAlarmOptions(token, "system_type"),
          fetchFireAlarmOptions(token, "last_service"),
        ]);
        setFireAlarmDetectorsOptions(detectors);
        setFireAlarmCallPointsOptions(callPoints);
        setFireAlarmFloorsOptions(floors);
        setFireAlarmPanelsOptions(panels);
        setFireAlarmSystemTypeOptions(systemType);
        setFireAlarmLastServiceOptions(lastService);
      } catch (e) {
        console.error("Error loading fire alarm options:", e);
      } finally {
        setLoadingFireAlarmOptions(false);
      }
    };
    load();
  }, [isFireAlarmService]);

  useEffect(() => {
    if (!isFireExtinguisherService) return;
    const load = async () => {
      setLoadingExtinguisherOptions(true);
      try {
        const token = getApiToken() ?? "";
        const [extinguisher, floor, metarials, lastService] = await Promise.all([
          fetchExtinguisherServiceOptions(token, "extinguisher"),
          fetchExtinguisherServiceOptions(token, "floor"),
          fetchExtinguisherServiceOptions(token, "metarials"),
          fetchExtinguisherServiceOptions(token, "last_service"),
        ]);
        setExtinguisherCountOptions(extinguisher);
        setExtinguisherFloorOptions(floor);
        setExtinguisherTypeOptions(metarials);
        setExtinguisherLastServiceOptions(lastService);
      } catch (e) {
        console.error("Error loading fire extinguisher options:", e);
      } finally {
        setLoadingExtinguisherOptions(false);
      }
    };
    load();
  }, [isFireExtinguisherService]);

  useEffect(() => {
    if (!isEmergencyLightingService) return;
    const load = async () => {
      setLoadingEmergencyLightOptions(true);
      try {
        const [light, floor, lightType, lightTest] = await Promise.all([
          fetchEmergencyLightOptions("light"),
          fetchEmergencyLightOptions("floor"),
          fetchEmergencyLightOptions("light_type"),
          fetchEmergencyLightOptions("light_test"),
        ]);
        setEmergencyLightCountOptions(light);
        setEmergencyLightFloorOptions(floor);
        setEmergencyLightTypeOptions(lightType);
        setEmergencyLightTestOptions(lightTest);
      } catch (e) {
        console.error("Error loading emergency light options:", e);
      } finally {
        setLoadingEmergencyLightOptions(false);
      }
    };
    load();
  }, [isEmergencyLightingService]);

  useEffect(() => {
    if (!isFireMarshalTrainingService) return;
    const load = async () => {
      setLoadingMarshalOptions(true);
      try {
        const apiToken = getApiToken();
        const [people, place, buildingType, experience] = await Promise.all([
          fetchMarshalOptions(apiToken ?? "", "people"),
          fetchMarshalOptions(apiToken ?? "", "training_place"),
          fetchMarshalOptions(apiToken ?? "", "building_type"),
          fetchMarshalOptions(apiToken ?? "", "experience"),
        ]);
        setMarshalPeopleOptions(people);
        setMarshalPlaceOptions(place);
        setMarshalBuildingTypeOptions(buildingType);
        setMarshalExperienceOptions(experience);
      } catch (e) {
        console.error("Error loading fire marshal options:", e);
      } finally {
        setLoadingMarshalOptions(false);
      }
    };
    load();
  }, [isFireMarshalTrainingService]);

  useEffect(() => {
    if (!isFireSafetyConsultationService) return;
    const load = async () => {
      setLoadingConsultationOptions(true);
      try {
        const apiToken = getApiToken() ?? "";
        const [mode, hour] = await Promise.all([
          fetchFireConsultationOptions(apiToken, "mode"),
          fetchFireConsultationOptions(apiToken, "hour"),
        ]);
        setConsultationModeOptions(mode);
        setConsultationHourOptions(hour);
      } catch (e) {
        console.error("Error loading fire consultation options:", e);
      } finally {
        setLoadingConsultationOptions(false);
      }
    };
    load();
  }, [isFireSafetyConsultationService]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const EXTINGUISHER_TYPES = ["Water", "Foam", "CO₂", "Powder", "Wet Chemical"];
  const toggleExtinguisherType = (type: string) => {
    setFormData((prev) => {
      const current = (prev.extinguisherTypesList || "").split(",").map((s) => s.trim()).filter(Boolean);
      const has = current.includes(type);
      const next = has ? current.filter((t) => t !== type) : [...current, type];
      return { ...prev, extinguisherTypesList: next.join(", ") };
    });
  };

  const isFireAlarmCustomQuote = isFireAlarmService && (showCustomDetectorInput || showCustomManualCallPointsInput || showCustomFireAlarmFloorsInput || showCustomFireAlarmPanelsInput);

  const isExtinguisherCustomQuote = isFireExtinguisherService && (showCustomExtinguisherInput || showCustomExtinguisherFloorsInput);

  const isEmergencyLightingCustomQuote = isEmergencyLightingService && (showCustomEmergencyLightsInput || showCustomEmergencyLightsFloorsInput);

  const isFireMarshalCustomQuote = isFireMarshalTrainingService && showCustomTrainingPeopleInput;

  /** Full payload for POST /custom-quote-requests/store — only used from handleComplete after all steps. */
  const buildCustomQuoteStorePayload = (
    accessNote: string,
    ctx: {
      propertyTypeDisplay: string;
      peopleCountDisplayForComplete: string;
      floorsNum: number;
      durationIdNum: number | undefined;
    }
  ): CustomQuoteRequestData => {
    const { propertyTypeDisplay, peopleCountDisplayForComplete, floorsNum, durationIdNum } = ctx;
    const preferred_date = formData.assessmentDate?.trim() || undefined;
    const access_note = accessNote?.trim() || undefined;
    const durationEligible =
      isFireRiskAssessmentService ||
      (!isFireAlarmService &&
        !isFireExtinguisherService &&
        !isEmergencyLightingService &&
        !isFireSafetyConsultationService &&
        !isFireMarshalTrainingService);
    const duration_id =
      durationIdNum != null && !Number.isNaN(durationIdNum) && durationEligible ? durationIdNum : undefined;
    const fra_assessment_type =
      isFireRiskAssessmentService && formData.fraAssessmentType?.trim()
        ? formData.fraAssessmentType.trim()
        : undefined;

    const common: Pick<
      CustomQuoteRequestData,
      "preferred_date" | "access_note" | "duration_id" | "fra_assessment_type"
    > = {
      ...(preferred_date && { preferred_date }),
      ...(access_note && { access_note }),
      ...(duration_id != null && { duration_id }),
      ...(fra_assessment_type && { fra_assessment_type }),
    };

    if (isFireMarshalTrainingService) {
      const marshalPeopleNum =
        (showCustomTrainingPeopleInput
          ? parseInt(formData.customTrainingPeopleCount, 10)
          : parseInt(formData.trainingPeopleCount, 10)) || 0;
      return { people: marshalPeopleNum, ...common };
    }

    if (isFireAlarmService) {
      const isCustomPt = formData.propertyTypeId === "__custom__";
      const building =
        isCustomPt ? formData.customPropertyType.trim() : (formData.propertyTypeId || propertyTypeDisplay || "Not specified");
      const smokeDetectors =
        (showCustomDetectorInput ? parseInt(formData.customDetectorCount, 10) : parseInt(formData.detectorCount, 10)) || 0;
      const callPoint =
        (showCustomManualCallPointsInput ? parseInt(formData.customManualCallPoints, 10) : parseInt(formData.manualCallPoints, 10)) || 0;
      const panels =
        (showCustomFireAlarmPanelsInput ? parseInt(formData.customFireAlarmPanels, 10) : parseInt(formData.fireAlarmPanels, 10)) || 0;
      const floors = quoteFloorsNumericFromSelection({
        showCustomInput: showCustomFireAlarmFloorsInput,
        customNumericRaw: formData.customFireAlarmFloors,
        presetIdOrRaw: formData.fireAlarmFloors,
        labelFromOption: String(fireAlarmFloorsDisplay ?? ""),
      });
      return {
        building_type: alarmSystemTypeDisplay?.trim() || building || "Not specified",
        people_count: peopleCountDisplay || formData.approximatePeopleId || "Not specified",
        floors,
        smoke_detectors: smokeDetectors,
        call_point: callPoint,
        panels,
        ...common,
      };
    }

    if (isFireExtinguisherService) {
      const extinguisherCount =
        (showCustomExtinguisherInput ? parseInt(formData.customExtinguisherCount, 10) : parseInt(formData.extinguisherCount, 10)) || 0;
      const floors = quoteFloorsNumericFromSelection({
        showCustomInput: showCustomExtinguisherFloorsInput,
        customNumericRaw: formData.customExtinguisherFloors,
        presetIdOrRaw: formData.extinguisherFloors,
        labelFromOption: String(extinguisherFloorsDisplay ?? ""),
      });
      return {
        building_type: extinguisherTypeDisplay?.trim() || "Fire extinguisher service",
        people_count: extinguisherCountDisplay?.trim() || "N/A",
        floors,
        extinguisher: extinguisherCount,
        ...common,
      };
    }

    if (isEmergencyLightingService) {
      const emergencyLightCount =
        (showCustomEmergencyLightsInput
          ? parseInt(formData.customEmergencyLightsCount, 10)
          : parseInt(formData.emergencyLightsCount, 10)) || 0;
      const floors = quoteFloorsNumericFromSelection({
        showCustomInput: showCustomEmergencyLightsFloorsInput,
        customNumericRaw: formData.customEmergencyLightsFloors,
        presetIdOrRaw: formData.emergencyLightsFloors,
        labelFromOption: String(emergencyLightsFloorsDisplay ?? ""),
      });
      const lightingTypeLabel =
        formData.emergencyLightingType && formData.emergencyLightingType !== "__skip__"
          ? (emergencyLightTypeOptions.find((o) => String(o.id) === formData.emergencyLightingType)?.value ?? "").trim()
          : "";
      const testFreqLabel =
        formData.emergencyLightingTestFrequency && formData.emergencyLightingTestFrequency !== "__skip__"
          ? (emergencyLightTestOptions.find((o) => String(o.id) === formData.emergencyLightingTestFrequency)?.value ?? "").trim()
          : "";
      return {
        building_type: lightingTypeLabel || "Emergency lighting",
        people_count: testFreqLabel || "N/A",
        floors,
        emergency_light: emergencyLightCount,
        ...common,
      };
    }

    if (isFireSafetyConsultationService) {
      const modeLabel =
        consultationModeOptions.find((o) => String(o.id) === formData.consultationType)?.value ?? formData.consultationType;
      const hoursLabel = consultationHoursDisplay;
      return {
        building_type: modeLabel || "Consultation",
        people_count: hoursLabel || "Not specified",
        floors: 1,
        consultation_mode: modeLabel,
        consultation_hours: hoursLabel,
        ...common,
      };
    }

    const peopleForRequest =
      showCustomPeopleInput && formData.customPeopleCount.trim()
        ? formData.customPeopleCount.trim()
        : peopleCountDisplayForComplete;
    return {
      building_type: propertyTypeDisplay || "Not specified",
      people_count: peopleForRequest || "Not specified",
      floors: Number.isFinite(floorsNum) && !isNaN(floorsNum) ? floorsNum : 0,
      ...common,
    };
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      wentBackRef.current = true;
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const isCustomPropertyType = formData.propertyTypeId === "__custom__";

  const isStepValid = () => {
    if (isFireAlarmService) {
      switch (currentStep) {
        case 1: return formData.detectorCount === CUSTOM_FA_DETECTORS ? formData.customDetectorCount.trim() !== "" : formData.detectorCount !== "";
        case 2: return formData.manualCallPoints === CUSTOM_FA_CALL_POINTS ? formData.customManualCallPoints.trim() !== "" : formData.manualCallPoints !== "";
        case 3: return formData.fireAlarmFloors === CUSTOM_FA_FLOORS ? formData.customFireAlarmFloors.trim() !== "" : formData.fireAlarmFloors !== "";
        case 4: return formData.fireAlarmPanels === CUSTOM_FA_PANELS ? formData.customFireAlarmPanels.trim() !== "" : formData.fireAlarmPanels !== "";
        case 5: return formData.alarmSystemType !== "";
        /** Must pick an option or explicit Skip; `return true` here caused auto-advance to skip this step entirely. */
        case 6: return formData.lastServiced !== "";
        case 7: return formData.assessmentDate !== "";
        /** Final step: notes optional; no auto-advance past totalSteps. */
        case 8: return true;
        default: return false;
      }
    }
    if (isFireExtinguisherService) {
      switch (currentStep) {
        case 1: return formData.extinguisherCount === CUSTOM_EXT_COUNT ? formData.customExtinguisherCount.trim() !== "" : formData.extinguisherCount !== "";
        case 2: return formData.extinguisherFloors === CUSTOM_EXT_FLOORS ? formData.customExtinguisherFloors.trim() !== "" : formData.extinguisherFloors !== "";
        /** Optional answers must still be chosen explicitly (`__skip__` counts), otherwise auto-advance skips these steps entirely. */
        case 3: return formData.extinguisherTypeId !== "";
        case 4: return formData.extinguisherLastServiced !== "";
        case 5: return formData.assessmentDate !== "";
        case 6: return true;
        default: return false;
      }
    }
    if (isEmergencyLightingService) {
      switch (currentStep) {
        case 1: return formData.emergencyLightsCount === CUSTOM_EL_LIGHTS ? formData.customEmergencyLightsCount.trim() !== "" : formData.emergencyLightsCount !== "";
        case 2: return formData.emergencyLightsFloors === CUSTOM_EL_FLOORS ? formData.customEmergencyLightsFloors.trim() !== "" : formData.emergencyLightsFloors !== "";
        /** Same as extinguisher: optional UI until user picks an option or `__skip__`; avoids auto-advance skipping steps 3–4. */
        case 3: return formData.emergencyLightingType !== "";
        case 4: return formData.emergencyLightingTestFrequency !== "";
        case 5: return formData.assessmentDate !== "";
        case 6: return true;
        default: return false;
      }
    }
    if (isFireSafetyConsultationService) {
      switch (currentStep) {
        case 1: return formData.consultationType !== "";
        case 2: return formData.consultationHours === "4+" ? formData.customConsultationHours.trim() !== "" : formData.consultationHours !== "";
        case 3: return formData.assessmentDate !== ""; // Calendar - same as Fire Alarm
        case 4: return true;
        default: return false;
      }
    }
    if (isFireMarshalTrainingService) {
      switch (currentStep) {
        case 1: return (formData.trainingPeopleCount === CUSTOM_MARSHAL_PEOPLE || formData.trainingPeopleCount === "40+") ? formData.customTrainingPeopleCount.trim() !== "" : formData.trainingPeopleCount !== "";
        case 2: return formData.trainingLocation !== "";
        case 3: return formData.buildingTypeForTraining !== "";
        /** Require explicit choice (including Skip); avoid auto-advance skipping this optional step. */
        case 4: return formData.staffTrainingBefore !== "";
        case 5: return formData.assessmentDate !== "";
        case 6: return true;
        default: return false;
      }
    }
    if (isFireRiskAssessmentService) {
      switch (currentStep) {
        case 1: return formData.propertyTypeId === "__custom__" ? formData.customPropertyType.trim() !== "" : formData.propertyTypeId !== "";
        case 2: return formData.approximatePeopleId !== "";
        case 3: return isCustomFloorsOption ? formData.customFloorsCount.trim() !== "" : formData.numberOfFloors !== "";
        case 4: return formData.durationId !== "";
        case 5: return formData.assessmentDate !== "";
        case 6: return true;
        default: return false;
      }
    }
    switch (currentStep) {
      case 1:
        if (formData.propertyTypeId === "__custom__") return formData.customPropertyType.trim() !== "";
        return formData.propertyTypeId !== "";
      case 2:
        return formData.approximatePeopleId !== "";
      case 3:
        if (isCustomFloorsOption) return formData.customFloorsCount.trim() !== "";
        return formData.numberOfFloors !== "";
      case 4:
        return formData.durationId !== "";
      case 5:
        return formData.assessmentDate !== "";
      case 6:
        return true;
      default:
        return false;
    }
  };

  /**
   * When the current step becomes valid, advance the same way as the old "Next" button.
   * - `[formData]`: answers changed via select, date, or text fields.
   * - `[currentStep]`: landing on a step that is already valid (e.g. optional questions) moves forward.
   * - After Back, `wentBackRef` prevents immediately jumping forward while old answers still validate.
   */
  useEffect(() => {
    if (submittingCustomQuote) return;
    if (wentBackRef.current) return;
    if (currentStep >= totalSteps) return;
    if (!isStepValid()) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      void handleNext();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [formData]);

  useEffect(() => {
    if (submittingCustomQuote) return;
    if (wentBackRef.current) {
      wentBackRef.current = false;
      return;
    }
    if (currentStep >= totalSteps) return;
    if (!isStepValid()) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      void handleNext();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [currentStep]);

  const handleComplete = async () => {
    let propertyTypeId: number;
    let approximatePeopleIdResolved: number;
    let propertyTypeDisplay: string;
    let peopleCountDisplayForComplete: string;

    if (isFireAlarmService || isFireExtinguisherService || isEmergencyLightingService || isFireSafetyConsultationService || isFireMarshalTrainingService) {
      propertyTypeId = propertyTypes[0]?.id ?? 0;
      approximatePeopleIdResolved = approximatePeople[0]?.id ?? 0;
      propertyTypeDisplay = "Not specified";
      peopleCountDisplayForComplete = "Not specified";
    } else {
      const isCustom = formData.propertyTypeId === "__custom__";
      propertyTypeDisplay = isCustom ? formData.customPropertyType.trim() : formData.propertyTypeId;
      const selectedPropertyType = isCustom
        ? null
        : propertyTypes.find(pt => pt.property_type_name === formData.propertyTypeId);
      const selectedApproximatePeople = approximatePeople.find(ap => ap.number_of_people === formData.approximatePeopleId);
      let resolved = selectedApproximatePeople?.id;
      if (resolved == null && isMoreThan500People(formData.approximatePeopleId)) {
        resolved = approximatePeople.find(ap => isMoreThan500People(ap.number_of_people))?.id
          ?? approximatePeople[approximatePeople.length - 1]?.id ?? 0;
      }
      if (resolved == null) return;
      approximatePeopleIdResolved = resolved;
      propertyTypeId = isCustom
        ? (propertyTypes.find(pt => /other|custom/i.test(pt.property_type_name))?.id ?? propertyTypes[0]?.id ?? 0)
        : (selectedPropertyType?.id ?? 0);
      peopleCountDisplayForComplete = peopleCountDisplay || formData.approximatePeopleId;
    }

    const resolvedServiceId = serviceId ?? (typeof service === "string" && /^\d+$/.test(service) ? parseInt(service, 10) : undefined);

    const parts: string[] = [];
    const elLightingLabelForNote =
      isEmergencyLightingService &&
      formData.emergencyLightingType &&
      formData.emergencyLightingType !== "__skip__"
        ? (
            emergencyLightTypeOptions.find((o) => String(o.id) === formData.emergencyLightingType)?.value ??
            formData.emergencyLightingType
          ).trim()
        : "";
    const elTestLabelForNote =
      isEmergencyLightingService &&
      formData.emergencyLightingTestFrequency &&
      formData.emergencyLightingTestFrequency !== "__skip__"
        ? (
            emergencyLightTestOptions.find((o) => String(o.id) === formData.emergencyLightingTestFrequency)?.value ??
            formData.emergencyLightingTestFrequency
          ).trim()
        : "";
    if (isFireRiskAssessmentService && formData.fraAssessmentType) parts.push(`Assessment type: ${formData.fraAssessmentType}`);
    if (!isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireSafetyConsultationService && !isFireMarshalTrainingService && formData.propertyTypeId) {
      const isCustom = formData.propertyTypeId === "__custom__";
      parts.push(`Property type: ${isCustom ? formData.customPropertyType.trim() : propertyTypeDisplay}`);
    }
    if (!isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireSafetyConsultationService && !isFireMarshalTrainingService && showCustomPeopleInput && formData.customPeopleCount.trim()) {
      parts.push(`People count: ${formData.customPeopleCount.trim()}`);
    }
    if (isFireAlarmService && fireAlarmFloorsDisplay) parts.push(`Floors: ${fireAlarmFloorsDisplay}`);
    else if (isFireExtinguisherService && extinguisherFloorsDisplay) parts.push(`Floors: ${extinguisherFloorsDisplay}`);
    else if (isEmergencyLightingService && emergencyLightsFloorsDisplay) parts.push(`Floors: ${emergencyLightsFloorsDisplay}`);
    if (isFireSafetyConsultationService && formData.consultationType) parts.push(`Consultation type: ${formData.consultationType}`);
    if (isFireSafetyConsultationService && consultationHoursDisplay) parts.push(`Hours needed: ${consultationHoursDisplay}`);
    if (isFireMarshalTrainingService && trainingPeopleCountDisplay) parts.push(`People for training: ${trainingPeopleCountDisplay}`);
    if (isFireMarshalTrainingService && formData.trainingLocation) parts.push(`Training location: ${formData.trainingLocation}`);
    if (isFireMarshalTrainingService && formData.buildingTypeForTraining) parts.push(`Building type: ${formData.buildingTypeForTraining}`);
    if (isFireMarshalTrainingService && formData.staffTrainingBefore && formData.staffTrainingBefore !== "__skip__") parts.push(`Staff training before: ${formData.staffTrainingBefore}`);
    if (!isFireMarshalTrainingService && showCustomFloorsInput && formData.customFloorsCount.trim()) {
      parts.push(`Floors: ${formData.customFloorsCount.trim()}`);
    } else if (formData.numberOfFloors) parts.push(`Floors: ${floorsDisplay}`);
    if (isFireAlarmService && detectorDisplay) parts.push(`Detectors: ${detectorDisplay}`);
    if (isFireAlarmService && manualCallPointsDisplay) parts.push(`Manual call points: ${manualCallPointsDisplay}`);
    if (isFireAlarmService && fireAlarmPanelsDisplay) parts.push(`Fire alarm panels: ${fireAlarmPanelsDisplay}`);
    if (isFireAlarmService && alarmSystemTypeDisplay) parts.push(`Alarm system: ${alarmSystemTypeDisplay}`);
    if (isFireAlarmService && lastServicedDisplay) parts.push(`Last serviced: ${lastServicedDisplay}`);
    if (isFireExtinguisherService && extinguisherCountDisplay) parts.push(`Fire extinguishers: ${extinguisherCountDisplay}`);
    if (isFireExtinguisherService && extinguisherTypeDisplay) parts.push(`Extinguisher type: ${extinguisherTypeDisplay}`);
    if (isFireExtinguisherService && extinguisherLastServicedDisplay) parts.push(`Last serviced: ${extinguisherLastServicedDisplay}`);
    if (isEmergencyLightingService && emergencyLightsCountDisplay) parts.push(`Emergency lights: ${emergencyLightsCountDisplay}`);
    if (elLightingLabelForNote) parts.push(`Lighting type: ${elLightingLabelForNote}`);
    if (elTestLabelForNote) parts.push(`Test frequency: ${elTestLabelForNote}`);
    if (formData.accessNotes?.trim()) parts.push(formData.accessNotes.trim());
    if (formData.assessmentDate?.trim()) {
      parts.push(`Preferred date: ${formData.assessmentDate.trim()}`);
    }
    const accessNote = parts.join(". ");

    const isCustomQuote = isFireAlarmService
      ? (showCustomDetectorInput || showCustomManualCallPointsInput || showCustomFireAlarmFloorsInput || showCustomFireAlarmPanelsInput)
      : isFireExtinguisherService
        ? showCustomExtinguisherInput || showCustomExtinguisherFloorsInput
        : isEmergencyLightingService
          ? showCustomEmergencyLightsInput || showCustomEmergencyLightsFloorsInput
          : isFireSafetyConsultationService
            ? showCustomConsultationHoursInput
            : isFireMarshalTrainingService
              ? showCustomTrainingPeopleInput
              : (formData.propertyTypeId === "__custom__" || isMoreThan500People(formData.approximatePeopleId) || showCustomFloorsInput);
    const floorsNum = isFireAlarmService
      ? quoteFloorsNumericFromSelection({
          showCustomInput: showCustomFireAlarmFloorsInput,
          customNumericRaw: formData.customFireAlarmFloors,
          presetIdOrRaw: formData.fireAlarmFloors,
          labelFromOption: String(fireAlarmFloorsDisplay ?? ""),
        })
      : isFireExtinguisherService
        ? quoteFloorsNumericFromSelection({
            showCustomInput: showCustomExtinguisherFloorsInput,
            customNumericRaw: formData.customExtinguisherFloors,
            presetIdOrRaw: formData.extinguisherFloors,
            labelFromOption: String(extinguisherFloorsDisplay ?? ""),
          })
        : isEmergencyLightingService
          ? quoteFloorsNumericFromSelection({
              showCustomInput: showCustomEmergencyLightsFloorsInput,
              customNumericRaw: formData.customEmergencyLightsFloors,
              presetIdOrRaw: formData.emergencyLightsFloors,
              labelFromOption: String(emergencyLightsFloorsDisplay ?? ""),
            })
          : isFireSafetyConsultationService
            ? 1
            : isFireMarshalTrainingService
              ? 1
              : (showCustomFloorsInput ? parseInt(formData.customFloorsCount, 10) : parseInt(formData.numberOfFloors, 10));
    const number_of_floors = isFireAlarmService
      ? (fireAlarmFloorsDisplay || formData.fireAlarmFloors)
      : isFireExtinguisherService
        ? (extinguisherFloorsDisplay || formData.extinguisherFloors)
        : isEmergencyLightingService
          ? (emergencyLightsFloorsDisplay || formData.emergencyLightsFloors)
          : isFireSafetyConsultationService
            ? "1"
            : isFireMarshalTrainingService
              ? "1"
              : (floorsDisplay || formData.numberOfFloors);
    const selectedFloorOption = floorOptions.find((o) => o.floor === formData.numberOfFloors);
    const number_of_floors_id = selectedFloorOption?.id;

    const durationIdNum = formData.durationId ? parseInt(formData.durationId, 10) : undefined;
    const hasDurationStep = isFireRiskAssessmentService || (!isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireSafetyConsultationService && !isFireMarshalTrainingService);

    if (isCustomQuote && resolvedServiceId) {
      const name = getUserFullName()?.trim() ?? "";
      const email = getUserEmail()?.trim() ?? "";
      const phone = getUserPhone()?.trim() ?? "";
      if (!name || !email || !phone) {
        toast.error(
          "Sign in and add your name, email, and phone in your profile so we can submit your custom quote request."
        );
        return;
      }
      setSubmittingCustomQuote(true);
      try {
        const payload = buildCustomQuoteStorePayload(accessNote, {
          propertyTypeDisplay,
          peopleCountDisplayForComplete,
          floorsNum,
          durationIdNum,
        });
        await storeCustomQuoteRequest(getApiToken(), resolvedServiceId, name, email, phone, payload);
        toast.success("Custom quote request submitted successfully. We'll contact you soon.");
        navigate("/services");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit custom quote request.");
      } finally {
        setSubmittingCustomQuote(false);
      }
      return;
    }

    onComplete({
      property_type_id: propertyTypeId,
      approximate_people_id: approximatePeopleIdResolved,
      number_of_floors,
      property_type_label: propertyTypeDisplay,
      approximate_people_label: peopleCountDisplayForComplete,
      ...(number_of_floors_id != null && { number_of_floors_id }),
      preferred_date: formData.assessmentDate,
      access_note: accessNote,
      ...(hasDurationStep && durationIdNum != null && !isNaN(durationIdNum) && { duration_id: durationIdNum }),
      ...(isFireAlarmService && detectorDisplay && { detector_count: detectorDisplay }),
      ...(isFireExtinguisherService && extinguisherCountDisplay && { extinguisher_count: extinguisherCountDisplay }),
      ...(isEmergencyLightingService && emergencyLightsCountDisplay && { emergency_lights_count: emergencyLightsCountDisplay }),
      ...(isFireSafetyConsultationService && formData.consultationType && { consultation_type: formData.consultationType }),
      ...(isFireSafetyConsultationService && consultationHoursDisplay && { consultation_hours: consultationHoursDisplay }),
      ...(isFireSafetyConsultationService && {
        mode_id: (() => { const v = formData.consultationType; const num = parseInt(String(v), 10); if (!Number.isNaN(num)) return num; const opt = consultationModeOptions.find((o) => String(o.id) === v) ?? consultationModeOptions.find((o) => (o.value || "").trim() === v); return opt?.id ?? consultationModeOptions[0]?.id ?? 1; })(),
        hour_id: (() => { const v = formData.consultationHours === "4+" ? formData.customConsultationHours.trim() || "4" : formData.consultationHours; const num = parseInt(String(v), 10); if (!Number.isNaN(num)) return num; const opt = consultationHourOptions.find((o) => String(o.id) === v) ?? consultationHourOptions.find((o) => (o.value || "").trim() === v); return opt?.id ?? consultationHourOptions[0]?.id ?? 1; })(),
      }),
      ...(isFireMarshalTrainingService && trainingPeopleCountDisplay && { training_people_count: trainingPeopleCountDisplay }),
      ...(isFireMarshalTrainingService && formData.trainingLocation && { training_location: formData.trainingLocation }),
      ...(isFireMarshalTrainingService && formData.buildingTypeForTraining && { building_type: formData.buildingTypeForTraining }),
      ...(isFireMarshalTrainingService && formData.staffTrainingBefore && formData.staffTrainingBefore !== "__skip__" && { staff_training_before: formData.staffTrainingBefore }),
      ...(isFireRiskAssessmentService && formData.fraAssessmentType && { fra_assessment_type: formData.fraAssessmentType }),
      ...(isFireAlarmService && {
        is_fire_alarm: true,
        fire_alarm_smoke_detector_id: parseInt(String(formData.detectorCount), 10) || 0,
        fire_alarm_call_point_id: parseInt(String(formData.manualCallPoints), 10) || 0,
        fire_alarm_floor_id: parseInt(String(formData.fireAlarmFloors), 10) || 0,
        fire_alarm_panel_id: parseInt(String(formData.fireAlarmPanels), 10) || 0,
        fire_alarm_system_type_id: parseInt(String(formData.alarmSystemType), 10) || 0,
        fire_alarm_last_service_id: formData.lastServiced && formData.lastServiced !== "__skip__" ? (parseInt(String(formData.lastServiced), 10) || 0) : 0,
      }),
      ...(isFireExtinguisherService && {
        is_fire_extinguisher: true,
        extinguisher_id: parseInt(String(formData.extinguisherCount), 10) || 0,
        floor_id: parseInt(String(formData.extinguisherFloors), 10) || 0,
        type_id: formData.extinguisherTypeId && formData.extinguisherTypeId !== "__skip__" ? (parseInt(String(formData.extinguisherTypeId), 10) || 0) : 0,
        last_service_id: formData.extinguisherLastServiced && formData.extinguisherLastServiced !== "__skip__" ? (parseInt(String(formData.extinguisherLastServiced), 10) || 0) : 0,
      }),
      ...(isEmergencyLightingService && {
        emergency_light_id: (() => { const id = parseInt(String(formData.emergencyLightsCount), 10); return Number.isNaN(id) ? 0 : id; })(),
        emergency_floor_id: (() => { const id = parseInt(String(formData.emergencyLightsFloors), 10); return Number.isNaN(id) ? 0 : id; })(),
        emergency_light_type_id: formData.emergencyLightingType && formData.emergencyLightingType !== "__skip__" ? (parseInt(String(formData.emergencyLightingType), 10) || 0) : (emergencyLightTypeOptions[0]?.id ?? 0),
        emergency_light_test_id: formData.emergencyLightingTestFrequency && formData.emergencyLightingTestFrequency !== "__skip__" ? (parseInt(String(formData.emergencyLightingTestFrequency), 10) || 0) : (emergencyLightTestOptions[0]?.id ?? 0),
      }),
      ...(isFireMarshalTrainingService && {
        people_id: (() => { const v = formData.trainingPeopleCount; const num = parseInt(String(v), 10); if (!Number.isNaN(num)) return num; const opt = marshalPeopleOptions.find((o) => String(o.id) === v) ?? marshalPeopleOptions.find((o) => (o.value || "").trim() === v); return opt?.id ?? marshalPeopleOptions[0]?.id ?? 1; })(),
        place_id: (() => { const v = formData.trainingLocation; const num = parseInt(String(v), 10); if (!Number.isNaN(num)) return num; const opt = marshalPlaceOptions.find((o) => String(o.id) === v) ?? marshalPlaceOptions.find((o) => (o.value || "").trim() === v); return opt?.id ?? marshalPlaceOptions[0]?.id ?? 1; })(),
        building_type_id: (() => { const v = formData.buildingTypeForTraining; const num = parseInt(String(v), 10); if (!Number.isNaN(num)) return num; const opt = marshalBuildingTypeOptions.find((o) => String(o.id) === v) ?? marshalBuildingTypeOptions.find((o) => (o.value || "").trim() === v); return opt?.id ?? marshalBuildingTypeOptions[0]?.id ?? 1; })(),
        experience_id: (() => { const v = formData.staffTrainingBefore; if (!v || v === "__skip__") return marshalExperienceOptions[0]?.id ?? 1; const num = parseInt(String(v), 10); if (!Number.isNaN(num)) return num; const opt = marshalExperienceOptions.find((o) => String(o.id) === v) ?? marshalExperienceOptions.find((o) => (o.value || "").trim() === v); return opt?.id ?? marshalExperienceOptions[0]?.id ?? 1; })(),
      }),
      ...(isCustomQuote && {
        isCustomQuote: true,
        service_id: resolvedServiceId,
        request_data: {
          building_type: propertyTypeDisplay || "Not specified",
          people_count: peopleCountDisplayForComplete,
          floors: isNaN(floorsNum) ? 0 : floorsNum,
        },
      }),
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link
            to="/"
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4 px-4 md:px-6 border-b">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <a href="/" className="hover:text-red-600 transition-colors">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="#" className="hover:text-red-600 transition-colors">Select Service</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Details</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-12 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-gray-600">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Container */}
          <div className="bg-white border rounded-lg p-8 mb-8 min-h-[400px]">
            {/* Step 1: Property Type (generic flow only), Step 1 for Fire Risk Assessment */}
            {((currentStep === 1 && !isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireSafetyConsultationService && !isFireMarshalTrainingService && !isFireRiskAssessmentService) || (currentStep === 1 && isFireRiskAssessmentService)) && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">What type of property is it?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Select property type</Label>
                  {loadingPropertyTypes ? (
                    <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-center">
                      Loading property types...
                    </div>
                  ) : (
                    <Select
                      value={formData.propertyTypeId}
                      onValueChange={(value) => updateFormData("propertyTypeId", value)}
                    >
                      <SelectTrigger id="propertyType" className="w-full">
                        <SelectValue placeholder="Choose property type" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.length === 0 ? (
                          <SelectItem value="no-data">No property types available</SelectItem>
                        ) : (
                          <>
                            {propertyTypes.map((propertyType) => (
                              <SelectItem key={propertyType.id} value={propertyType.property_type_name}>
                                {propertyType.property_type_name}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">More</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {isCustomPropertyType && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customPropertyType">Enter your property type</Label>
                      <Input
                        id="customPropertyType"
                        placeholder="e.g. Warehouse, Mixed-use, Educational"
                        value={formData.customPropertyType}
                        onChange={(e) => updateFormData("customPropertyType", e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Number of People (generic flow only), Step 2 for Fire Risk Assessment */}
            {((currentStep === 2 && !isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireSafetyConsultationService && !isFireMarshalTrainingService && !isFireRiskAssessmentService) || (currentStep === 2 && isFireRiskAssessmentService)) && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">How many people use the building?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfPeople">Select approximate number</Label>
                  {loadingApproximatePeople ? (
                    <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-center">
                      Loading options...
                    </div>
                  ) : (
                    <Select
                      value={formData.approximatePeopleId}
                      onValueChange={(value) => updateFormData("approximatePeopleId", value)}
                    >
                      <SelectTrigger id="numberOfPeople" className="w-full">
                        <SelectValue placeholder="Choose number of people" />
                      </SelectTrigger>
                      <SelectContent>
                        {approximatePeople.length === 0 ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : null}
                        {approximatePeople.map((option) => (
                          <SelectItem key={option.id} value={option.number_of_people}>
                            {formatPeopleOptionLabel(option.number_of_people)}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_PEOPLE_OPTION_VALUE}>
                          {formatPeopleOptionLabel(CUSTOM_PEOPLE_OPTION_VALUE)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {showCustomPeopleInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customPeopleCount">Enter number of people</Label>
                      <Input
                        id="customPeopleCount"
                        type="text"
                        placeholder="e.g. 600, 750, 1000"
                        value={formData.customPeopleCount}
                        onChange={(e) => updateFormData("customPeopleCount", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of people using the building (optional)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Consultation type (Fire Safety Consultation) */}
            {currentStep === 1 && isFireSafetyConsultationService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 1: How would you like the consultation?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultationType">Choose consultation type</Label>
                  <p className="text-sm text-gray-500 mb-2">This decides <strong>which</strong> hourly rate is used.</p>
                  <Select
                    value={formData.consultationType}
                    onValueChange={(value) => updateFormData("consultationType", value)}
                  >
                    <SelectTrigger id="consultationType" className="w-full" disabled={loadingConsultationOptions}>
                      <span className="block truncate text-left">
                        {loadingConsultationOptions ? "Loading..." : marshalSelectTriggerLabel(consultationModeOptions, formData.consultationType, "Choose consultation type")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {consultationModeOptions.length > 0 ? consultationModeOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      )) : (
                        <>
                          <SelectItem value="Phone / Video call">Phone / Video call</SelectItem>
                          <SelectItem value="On-site visit">On-site visit</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Consultation hours (Fire Safety Consultation) */}
            {currentStep === 2 && isFireSafetyConsultationService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 2: How many hours do you need?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultationHours">Choose hours</Label>
                  <Select
                    value={formData.consultationHours}
                    onValueChange={(value) => updateFormData("consultationHours", value)}
                  >
                    <SelectTrigger id="consultationHours" className="w-full" disabled={loadingConsultationOptions}>
                      <span className="block truncate text-left">
                        {loadingConsultationOptions
                          ? "Loading..."
                          : formData.consultationHours === "4+"
                            ? "More than 4 hours → Custom Quote"
                            : marshalSelectTriggerLabel(consultationHourOptions, formData.consultationHours, "Choose hours")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {consultationHourOptions.length > 0 ? (
                        <>
                          {consultationHourOptions.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                          ))}
                          <SelectItem value="4+">More than 4 hours → Custom Quote</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="3">3 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="4+">More than 4 hours → Custom Quote</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {showCustomConsultationHoursInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customConsultationHours">Enter number of hours</Label>
                      <Input
                        id="customConsultationHours"
                        type="text"
                        placeholder="e.g. 5, 6, 8"
                        value={formData.customConsultationHours}
                        onChange={(e) => updateFormData("customConsultationHours", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the number of hours for more than 4 (Custom Quote)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: How many people need training? (Fire Marshal / Warden Training) */}
            {currentStep === 1 && isFireMarshalTrainingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 1: How many people need training?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainingPeopleCount">Select number of people</Label>
                  <Select
                    value={formData.trainingPeopleCount}
                    onValueChange={(value) => updateFormData("trainingPeopleCount", value)}
                  >
                    <SelectTrigger id="trainingPeopleCount" className="w-full" disabled={loadingMarshalOptions}>
                      <span className="block truncate text-left">
                        {loadingMarshalOptions
                          ? "Loading..."
                          : formData.trainingPeopleCount === CUSTOM_MARSHAL_PEOPLE || formData.trainingPeopleCount === "40+"
                            ? "More than 40 (Custom Quote)"
                            : marshalSelectTriggerLabel(marshalPeopleOptions, formData.trainingPeopleCount, "Choose number of people")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {marshalPeopleOptions.length > 0 ? marshalPeopleOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      )) : (
                        <>
                          <SelectItem value="1-5">1-5 people</SelectItem>
                          <SelectItem value="6-10">6-10 people</SelectItem>
                          <SelectItem value="11-20">11-20 people</SelectItem>
                          <SelectItem value="21-40">21-40 people</SelectItem>
                        </>
                      )}
                      <SelectItem value={CUSTOM_MARSHAL_PEOPLE}>More than 40 (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomTrainingPeopleInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customTrainingPeopleCount">Enter number of people</Label>
                      <Input
                        id="customTrainingPeopleCount"
                        type="text"
                        placeholder="e.g. 50, 60, 80"
                        value={formData.customTrainingPeopleCount}
                        onChange={(e) => updateFormData("customTrainingPeopleCount", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the number of people for more than 40 (Custom Quote)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Where will the training take place? (Fire Marshal / Warden Training) */}
            {currentStep === 2 && isFireMarshalTrainingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 2: Where will the training take place?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainingLocation">Select location</Label>
                  <Select
                    value={formData.trainingLocation}
                    onValueChange={(value) => updateFormData("trainingLocation", value)}
                  >
                    <SelectTrigger id="trainingLocation" className="w-full" disabled={loadingMarshalOptions}>
                      <span className="block truncate text-left">
                        {loadingMarshalOptions ? "Loading..." : marshalSelectTriggerLabel(marshalPlaceOptions, formData.trainingLocation, "Choose location")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {marshalPlaceOptions.length > 0 ? marshalPlaceOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      )) : (
                        <>
                          <SelectItem value="At our premises (on-site)">At our premises (on-site)</SelectItem>
                          <SelectItem value="Online (video call)">Online (video call)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: What type of building? (Fire Marshal / Warden Training) */}
            {currentStep === 3 && isFireMarshalTrainingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 3: What type of building is this for?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buildingTypeForTraining">Select building type</Label>
                  <Select
                    value={formData.buildingTypeForTraining}
                    onValueChange={(value) => updateFormData("buildingTypeForTraining", value)}
                  >
                    <SelectTrigger id="buildingTypeForTraining" className="w-full" disabled={loadingMarshalOptions}>
                      <span className="block truncate text-left">
                        {loadingMarshalOptions ? "Loading..." : marshalSelectTriggerLabel(marshalBuildingTypeOptions, formData.buildingTypeForTraining, "Choose building type")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {marshalBuildingTypeOptions.length > 0 ? marshalBuildingTypeOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      )) : (
                        <>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Shop / Retail">Shop / Retail</SelectItem>
                          <SelectItem value="Warehouse">Warehouse</SelectItem>
                          <SelectItem value="School">School</SelectItem>
                          <SelectItem value="Care Home">Care Home</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Factory / Industrial">Factory / Industrial</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 4: Have staff had fire training before? (Fire Marshal / Warden Training - optional) */}
            {currentStep === 4 && isFireMarshalTrainingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 4 (OPTIONAL BUT REALISTIC): Have staff had fire training before?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffTrainingBefore">Select option</Label>
                  <Select
                    value={formData.staffTrainingBefore}
                    onValueChange={(value) => updateFormData("staffTrainingBefore", value)}
                  >
                    <SelectTrigger id="staffTrainingBefore" className="w-full" disabled={loadingMarshalOptions}>
                      <span className="block truncate text-left">
                        {loadingMarshalOptions
                          ? "Loading..."
                          : formData.staffTrainingBefore === "__skip__"
                            ? "Skip (optional)"
                            : marshalSelectTriggerLabel(marshalExperienceOptions, formData.staffTrainingBefore, "Choose (optional)")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip (optional)</SelectItem>
                      {marshalExperienceOptions.length > 0 ? marshalExperienceOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      )) : (
                        <>
                          <SelectItem value="Yes (refresher training)">Yes (refresher training)</SelectItem>
                          <SelectItem value="No (first time)">No (first time)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 1: Emergency lights (Emergency Lighting) */}
            {currentStep === 1 && isEmergencyLightingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 1: How many emergency lights?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyLightsCount">Select number of lights</Label>
                  <Select
                    value={formData.emergencyLightsCount}
                    onValueChange={(value) => updateFormData("emergencyLightsCount", value)}
                  >
                    <SelectTrigger id="emergencyLightsCount" className="w-full" disabled={loadingEmergencyLightOptions}>
                      <span className="block truncate text-left">
                        {loadingEmergencyLightOptions ? "Loading..." : (formData.emergencyLightsCount === CUSTOM_EL_LIGHTS ? "More than 100 (Custom Quote)" : emergencyLightCountOptions.find((o) => String(o.id) === formData.emergencyLightsCount)?.value ?? "Choose number of lights")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {emergencyLightCountOptions.length === 0 && !loadingEmergencyLightOptions ? (
                        <SelectItem value="">No options available</SelectItem>
                      ) : (
                        emergencyLightCountOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                        ))
                      )}
                      <SelectItem value={CUSTOM_EL_LIGHTS}>More than 100 (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomEmergencyLightsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customEmergencyLightsCount">Enter number of lights</Label>
                      <Input
                        id="customEmergencyLightsCount"
                        type="text"
                        placeholder="e.g. 120, 150"
                        value={formData.customEmergencyLightsCount}
                        onChange={(e) => updateFormData("customEmergencyLightsCount", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the number of lights for more than 100 (Custom Quote)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Emergency Lighting floors */}
            {currentStep === 2 && isEmergencyLightingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Layers className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 2: How many floors does the building have?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyLightsFloors">Select number of floors</Label>
                  <Select
                    value={formData.emergencyLightsFloors}
                    onValueChange={(value) => updateFormData("emergencyLightsFloors", value)}
                  >
                    <SelectTrigger id="emergencyLightsFloors" className="w-full" disabled={loadingEmergencyLightOptions}>
                      <span className="block truncate text-left">
                        {loadingEmergencyLightOptions ? "Loading..." : (formData.emergencyLightsFloors === CUSTOM_EL_FLOORS ? "7+ floors (Custom Quote)" : emergencyLightFloorOptions.find((o) => String(o.id) === formData.emergencyLightsFloors)?.value ?? "Choose number of floors")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {emergencyLightFloorOptions.length === 0 && !loadingEmergencyLightOptions ? (
                        <SelectItem value="">No options available</SelectItem>
                      ) : (
                        emergencyLightFloorOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                        ))
                      )}
                      <SelectItem value={CUSTOM_EL_FLOORS}>7+ floors (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomEmergencyLightsFloorsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customEmergencyLightsFloors">Enter number of floors</Label>
                      <Input
                        id="customEmergencyLightsFloors"
                        type="text"
                        placeholder="e.g. 10, 12, 15"
                        value={formData.customEmergencyLightsFloors}
                        onChange={(e) => updateFormData("customEmergencyLightsFloors", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the number of floors for 7+ (Custom Quote)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Type of emergency lighting (optional – Emergency Lighting) */}
            {currentStep === 3 && isEmergencyLightingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 3 (OPTIONAL BUT USEFUL): What type of emergency lighting is it?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyLightingType">Select type</Label>
                  <Select
                    value={formData.emergencyLightingType}
                    onValueChange={(value) => updateFormData("emergencyLightingType", value)}
                  >
                    <SelectTrigger id="emergencyLightingType" className="w-full" disabled={loadingEmergencyLightOptions}>
                      <span className="block truncate text-left">
                        {loadingEmergencyLightOptions ? "Loading..." : (formData.emergencyLightingType === "__skip__" ? "Skip (optional)" : emergencyLightTypeOptions.find((o) => String(o.id) === formData.emergencyLightingType)?.value ?? "Choose (optional)")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip (optional)</SelectItem>
                      {emergencyLightTypeOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Central battery systems take longer. Self-contained → +£0, Central battery → +£100.</p>
                </div>
              </div>
            )}

            {/* Step 4: Test frequency (optional – Emergency Lighting) */}
            {currentStep === 4 && isEmergencyLightingService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 4 (OPTIONAL): Is this a monthly, 6-monthly, or annual test?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyLightingTestFrequency">Select test frequency</Label>
                  <Select
                    value={formData.emergencyLightingTestFrequency}
                    onValueChange={(value) => updateFormData("emergencyLightingTestFrequency", value)}
                  >
                    <SelectTrigger id="emergencyLightingTestFrequency" className="w-full" disabled={loadingEmergencyLightOptions}>
                      <span className="block truncate text-left">
                        {loadingEmergencyLightOptions ? "Loading..." : (formData.emergencyLightingTestFrequency === "__skip__" ? "Skip (optional)" : emergencyLightTestOptions.find((o) => String(o.id) === formData.emergencyLightingTestFrequency)?.value ?? "Choose (optional)")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip (optional)</SelectItem>
                      {emergencyLightTestOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Annual (3-hour) tests take much longer. Monthly → +£0, 6-monthly → +£40, Annual → +£120.</p>
                </div>
              </div>
            )}

            {/* Step 1: Fire extinguishers (Fire Extinguisher) */}
            {currentStep === 1 && isFireExtinguisherService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 1: How many fire extinguishers?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extinguisherCount">Select number of extinguishers</Label>
                  <Select
                    value={formData.extinguisherCount}
                    onValueChange={(value) => updateFormData("extinguisherCount", value)}
                  >
                    <SelectTrigger id="extinguisherCount" className="w-full" disabled={loadingExtinguisherOptions}>
                      <span className="block truncate text-left">
                        {loadingExtinguisherOptions ? "Loading..." : (formData.extinguisherCount === CUSTOM_EXT_COUNT ? "More than 40 (Custom Quote)" : extinguisherCountOptions.find((o) => String(o.id) === formData.extinguisherCount)?.value ?? "Choose number of extinguishers")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {extinguisherCountOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_EXT_COUNT}>More than 40 (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomExtinguisherInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customExtinguisherCount">Enter number of fire extinguishers</Label>
                      <Input
                        id="customExtinguisherCount"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 50, 60, 80"
                        value={formData.customExtinguisherCount}
                        onChange={(e) => updateFormData("customExtinguisherCount", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of fire extinguishers</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Fire Extinguisher floors */}
            {currentStep === 2 && isFireExtinguisherService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Layers className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 2: How many floors does the building have?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extinguisherFloors">Select number of floors</Label>
                  <Select
                    value={formData.extinguisherFloors}
                    onValueChange={(value) => updateFormData("extinguisherFloors", value)}
                  >
                    <SelectTrigger id="extinguisherFloors" className="w-full" disabled={loadingExtinguisherOptions}>
                      <span className="block truncate text-left">
                        {loadingExtinguisherOptions ? "Loading..." : (formData.extinguisherFloors === CUSTOM_EXT_FLOORS ? "7+ floors (Custom Quote)" : extinguisherFloorOptions.find((o) => String(o.id) === formData.extinguisherFloors)?.value ?? "Choose number of floors")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {extinguisherFloorOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_EXT_FLOORS}>7+ floors (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomExtinguisherFloorsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customExtinguisherFloors">Enter number of floors</Label>
                      <Input
                        id="customExtinguisherFloors"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 8, 10, 12"
                        value={formData.customExtinguisherFloors}
                        onChange={(e) => updateFormData("customExtinguisherFloors", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of floors (include all levels, basements, and ground floor)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Extinguisher type (optional) */}
            {currentStep === 3 && isFireExtinguisherService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 3 (OPTIONAL): What type of extinguisher?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extinguisherTypeId">Select type</Label>
                  <Select
                    value={formData.extinguisherTypeId}
                    onValueChange={(value) => updateFormData("extinguisherTypeId", value)}
                  >
                    <SelectTrigger id="extinguisherTypeId" className="w-full" disabled={loadingExtinguisherOptions}>
                      <SelectValue
                        placeholder={loadingExtinguisherOptions ? "Loading..." : "Choose (optional)"}
                        label={
                          formData.extinguisherTypeId === "__skip__"
                            ? "Skip / Not sure"
                            : formData.extinguisherTypeId
                              ? (extinguisherTypeOptions.find((o) => String(o.id) === formData.extinguisherTypeId)?.value ?? "")
                              : ""
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip / Not sure</SelectItem>
                      {extinguisherTypeOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 4: Fire Extinguisher last serviced (optional) */}
            {currentStep === 4 && isFireExtinguisherService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 4 (OPTIONAL): When were they last serviced?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extinguisherLastServiced">Select when last serviced</Label>
                  <Select
                    value={formData.extinguisherLastServiced}
                    onValueChange={(value) => updateFormData("extinguisherLastServiced", value)}
                  >
                    <SelectTrigger id="extinguisherLastServiced" className="w-full" disabled={loadingExtinguisherOptions}>
                      <SelectValue
                        placeholder={loadingExtinguisherOptions ? "Loading..." : "Choose (optional)"}
                        label={
                          formData.extinguisherLastServiced === "__skip__"
                            ? "Skip (optional)"
                            : formData.extinguisherLastServiced
                              ? (extinguisherLastServiceOptions.find((o) => String(o.id) === formData.extinguisherLastServiced)?.value ?? "")
                              : ""
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip (optional)</SelectItem>
                      {extinguisherLastServiceOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Old or missed services take longer.</p>
                </div>
              </div>
            )}

            {/* Step 1: Smoke/heat detectors (Fire Alarm) */}
            {currentStep === 1 && isFireAlarmService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 1: How many smoke/heat detectors?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detectorCount">Select number of detectors</Label>
                  <Select
                    value={formData.detectorCount}
                    onValueChange={(value) => updateFormData("detectorCount", value)}
                  >
                    <SelectTrigger id="detectorCount" className="w-full" disabled={loadingFireAlarmOptions}>
                      <span className="block truncate text-left">
                        {loadingFireAlarmOptions ? "Loading..." : (formData.detectorCount === CUSTOM_FA_DETECTORS ? "More than 100 (Custom Quote)" : fireAlarmDetectorsOptions.find((o) => String(o.id) === formData.detectorCount)?.value ?? "Choose number of detectors")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fireAlarmDetectorsOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_FA_DETECTORS}>More than 100 (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomDetectorInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customDetectorCount">Enter number of detectors</Label>
                      <Input
                        id="customDetectorCount"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 150, 200, 250"
                        value={formData.customDetectorCount}
                        onChange={(e) => updateFormData("customDetectorCount", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of smoke/heat detectors</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Manual call points (Fire Alarm) */}
            {currentStep === 2 && isFireAlarmService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 2: How many manual call points?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualCallPoints">Select number of call points</Label>
                  <Select
                    value={formData.manualCallPoints}
                    onValueChange={(value) => updateFormData("manualCallPoints", value)}
                  >
                    <SelectTrigger id="manualCallPoints" className="w-full" disabled={loadingFireAlarmOptions}>
                      <span className="block truncate text-left">
                        {loadingFireAlarmOptions ? "Loading..." : (formData.manualCallPoints === CUSTOM_FA_CALL_POINTS ? "More than 20 (Custom Quote)" : fireAlarmCallPointsOptions.find((o) => String(o.id) === formData.manualCallPoints)?.value ?? "Choose number of call points")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fireAlarmCallPointsOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_FA_CALL_POINTS}>More than 20 (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomManualCallPointsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customManualCallPoints">Enter number of manual call points</Label>
                      <Input
                        id="customManualCallPoints"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 25, 30, 40"
                        value={formData.customManualCallPoints}
                        onChange={(e) => updateFormData("customManualCallPoints", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of manual call points</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Number of Floors (generic flow only), Step 3 for Fire Risk Assessment */}
            {((currentStep === 3 && !isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireSafetyConsultationService && !isFireMarshalTrainingService && !isFireRiskAssessmentService) || (currentStep === 3 && isFireRiskAssessmentService)) && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Layers className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">How many floors does the building have?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfFloors">Select approximate number</Label>
                  {loadingFloorPricing ? (
                    <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-center">
                      Loading options...
                    </div>
                  ) : (
                    <Select
                      value={formData.numberOfFloors}
                      onValueChange={(value) => updateFormData("numberOfFloors", value)}
                    >
                      <SelectTrigger id="numberOfFloors" className="w-full">
                        <span className="block truncate text-left">
                          {!formData.numberOfFloors ? "Choose number of floors" : formData.numberOfFloors === CUSTOM_FLOORS_OPTION_VALUE ? "More" : (floorOptions.find((o) => o.floor === formData.numberOfFloors)?.label ?? formData.numberOfFloors)}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {floorOptions.length === 0 ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : null}
                        {floorOptions.map((option) => (
                          <SelectItem key={option.floor} value={option.floor}>
                            {option.label}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_FLOORS_OPTION_VALUE}>
                          More
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {showCustomFloorsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customFloorsCount">Enter number of floors</Label>
                      <Input
                        id="customFloorsCount"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 10, 12, 15"
                        value={formData.customFloorsCount}
                        onChange={(e) => updateFormData("customFloorsCount", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of floors (optional)</p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">Include all levels, basements, and ground floor</p>
                </div>
              </div>
            )}

            {/* Step 4: Preferred turnaround / duration (generic + FRA only) */}
            {currentStep === 4 && (isFireRiskAssessmentService || (!isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireSafetyConsultationService && !isFireMarshalTrainingService)) && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Clock className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">When do you need it?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationId">Select preferred turnaround</Label>
                  {loadingFraDurations ? (
                    <div className="w-full p-3 border rounded-md bg-gray-50 text-gray-500 text-center">
                      Loading options...
                    </div>
                  ) : (
                    <Select
                      value={formData.durationId}
                      onValueChange={(value) => updateFormData("durationId", value)}
                    >
                      <SelectTrigger id="durationId" className="w-full">
                        <span>
                          {formData.durationId
                            ? fraDurations.find((d) => String(d.id) === formData.durationId)?.duration ?? formData.durationId
                            : "Choose turnaround time"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {fraDurations.length === 0 ? (
                          <SelectItem value="no-data">No options available</SelectItem>
                        ) : (
                          fraDurations.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)}>
                              {opt.duration}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-sm text-gray-500">e.g. Same / next day, 1–2 days, 3–6 days, 7+ days</p>
                </div>
              </div>
            )}

            {/* Step 3: Fire Alarm floors (Fire Alarm) */}
            {currentStep === 3 && isFireAlarmService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Layers className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 3: How many floors does the building have?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fireAlarmFloors">Select number of floors</Label>
                  <Select
                    value={formData.fireAlarmFloors}
                    onValueChange={(value) => updateFormData("fireAlarmFloors", value)}
                  >
                    <SelectTrigger id="fireAlarmFloors" className="w-full" disabled={loadingFireAlarmOptions}>
                      <span className="block truncate text-left">
                        {loadingFireAlarmOptions ? "Loading..." : (formData.fireAlarmFloors === CUSTOM_FA_FLOORS ? "7+ floors (Custom Quote)" : fireAlarmFloorsOptions.find((o) => String(o.id) === formData.fireAlarmFloors)?.value ?? "Choose number of floors")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fireAlarmFloorsOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_FA_FLOORS}>7+ floors (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomFireAlarmFloorsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customFireAlarmFloors">Enter number of floors</Label>
                      <Input
                        id="customFireAlarmFloors"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 8, 10, 12"
                        value={formData.customFireAlarmFloors}
                        onChange={(e) => updateFormData("customFireAlarmFloors", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of floors (include all levels, basements, and ground floor)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Fire alarm panels (Fire Alarm) */}
            {currentStep === 4 && isFireAlarmService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 4: How many fire alarm panels?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fireAlarmPanels">Select number of panels</Label>
                  <Select
                    value={formData.fireAlarmPanels}
                    onValueChange={(value) => updateFormData("fireAlarmPanels", value)}
                  >
                    <SelectTrigger id="fireAlarmPanels" className="w-full" disabled={loadingFireAlarmOptions}>
                      <span className="block truncate text-left">
                        {loadingFireAlarmOptions ? "Loading..." : (formData.fireAlarmPanels === CUSTOM_FA_PANELS ? "3+ panels (Custom Quote)" : fireAlarmPanelsOptions.find((o) => String(o.id) === formData.fireAlarmPanels)?.value ?? "Choose number of panels")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {fireAlarmPanelsOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_FA_PANELS}>3+ panels (Custom Quote)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomFireAlarmPanelsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customFireAlarmPanels">Enter number of fire alarm panels</Label>
                      <Input
                        id="customFireAlarmPanels"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 4, 5, 6"
                        value={formData.customFireAlarmPanels}
                        onChange={(e) => updateFormData("customFireAlarmPanels", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">Enter the approximate number of fire alarm panels</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Alarm system type (Fire Alarm) */}
            {currentStep === 5 && isFireAlarmService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 5: What type of alarm system is it?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alarmSystemType">Select type</Label>
                  <Select
                    value={formData.alarmSystemType}
                    onValueChange={(value) => updateFormData("alarmSystemType", value)}
                  >
                    <SelectTrigger id="alarmSystemType" className="w-full" disabled={loadingFireAlarmOptions}>
                      <SelectValue
                        placeholder={loadingFireAlarmOptions ? "Loading..." : "Choose alarm system type"}
                        label={
                          formData.alarmSystemType
                            ? (fireAlarmSystemTypeOptions.find((o) => String(o.id) === formData.alarmSystemType)?.value ?? "")
                            : ""
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {fireAlarmSystemTypeOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 6: Last serviced (optional – Fire Alarm) */}
            {currentStep === 6 && isFireAlarmService && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Question 6 (OPTIONAL BUT RECOMMENDED): When was it last serviced?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastServiced">Select when last serviced</Label>
                  <Select
                    value={formData.lastServiced}
                    onValueChange={(value) => updateFormData("lastServiced", value)}
                  >
                    <SelectTrigger id="lastServiced" className="w-full" disabled={loadingFireAlarmOptions}>
                      <SelectValue
                        placeholder={loadingFireAlarmOptions ? "Loading..." : "Choose (optional)"}
                        label={
                          formData.lastServiced === "__skip__"
                            ? "Skip (optional)"
                            : formData.lastServiced
                              ? (fireAlarmLastServiceOptions.find((o) => String(o.id) === formData.lastServiced)?.value ?? "")
                              : ""
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip (optional)</SelectItem>
                      {fireAlarmLastServiceOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 7: Assessment Date (Fire Alarm), Step 5 (Fire Extinguisher / Emergency Lighting / Fire Marshal), Step 5 (Fire Risk Assessment / generic with duration), Step 3 (Consultation) */}
            {currentStep === (isFireAlarmService ? 7 : isFireExtinguisherService || isEmergencyLightingService || isFireMarshalTrainingService ? 5 : isFireRiskAssessmentService ? 5 : isFireSafetyConsultationService ? 3 : 5) && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">When do you need the assessment?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessmentDate">Select preferred date</Label>
                  <Input
                    id="assessmentDate"
                    type="date"
                    value={formData.assessmentDate}
                    onChange={(e) => updateFormData("assessmentDate", e.target.value)}
                    className="text-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-sm text-gray-500">We'll show you available professionals for this date</p>
                </div>
              </div>
            )}

            {/* Step 8: Access Notes (Fire Alarm), Step 6 (Fire Extinguisher / Emergency Lighting / Fire Marshal), Step 6 (Fire Risk Assessment / generic), Step 4 (Consultation) */}
            {currentStep === (isFireAlarmService ? 8 : isFireExtinguisherService || isEmergencyLightingService || isFireMarshalTrainingService ? 6 : isFireRiskAssessmentService ? 6 : isFireSafetyConsultationService ? 4 : 6) && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-[#0A1A2F]">Any access notes or special requirements?</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessNotes">Optional notes for the assessor</Label>
                  <Textarea
                    id="accessNotes"
                    placeholder="e.g., Gate code required, parking available, building under construction..."
                    value={formData.accessNotes}
                    onChange={(e) => updateFormData("accessNotes", e.target.value)}
                    className="min-h-[150px] text-base"
                  />
                  <p className="text-sm text-gray-500">This helps the professional prepare for the visit (optional)</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation: Back always; intermediate steps advance when answers validate (same as former Next). */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleBack}
              variant="outline"
              className="px-8 py-6 text-lg"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            {currentStep === totalSteps && (
              <Button
                onClick={handleNext}
                disabled={!isStepValid() || submittingCustomQuote}
                className="bg-red-600 hover:bg-red-700 px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingCustomQuote ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>View Results</>
                )}
              </Button>
            )}
            {/*
            Former intermediate "Next" (same handler as auto-advance useEffects above):
            <Button
              onClick={handleNext}
              disabled={!isStepValid() || submittingCustomQuote}
              className="bg-red-600 hover:bg-red-700 px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingCustomQuote ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {currentStep === totalSteps ? "View Results" : "Next"}
                  {currentStep < totalSteps && <ChevronRight className="w-5 h-5 ml-2" />}
                </>
              )}
            </Button>
            (Shown for every step; now only final-step View Results is rendered live.)
            */}
          </div>

          {bottomContent && (
            <div className="mt-8">
              {bottomContent}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}