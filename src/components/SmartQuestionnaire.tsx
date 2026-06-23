import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  OptionCardSelect,
  QuestionnaireStepShell,
} from "./questionnaire/QuestionnaireStepUI";
import {
  getQuestionnaireServiceKind,
  getQuestionnaireStepMeta,
} from "../lib/questionnaireStepMeta";
import { resolveContextualStepMeta } from "../lib/questionnaireContextMeta";
import {
  isOtherPropertyTypeName,
  QUESTIONNAIRE_OTHERS_LABEL,
} from "../lib/questionnaireOptionLabels";
import {
  fetchApproximatePeople,
  fetchEmergencyLightOptions,
  fetchExtinguisherServiceOptions,
  fetchFireAlarmOptions,
  fetchFireConsultationOptions,
  fetchFloorPricing,
  fetchFraDurations,
  fetchMarshalOptions,
  fetchPropertyTypes,
  formatPeopleOptionLabel,
  getPeopleOptionSortKey,
  type ApproximatePeopleResponse,
  type ConsultationOptionItem,
  type EmergencyLightServiceOptionItem,
  type ExtinguisherServiceOptionItem,
  type FireAlarmOptionItem,
  type FloorPricingItem,
  type FraDurationItem,
  type MarshalServiceOptionItem,
  type PropertyTypeResponse,
} from "../api/servicesService";
import type { CustomQuoteRequestData } from "../api/customQuoteRequestsService";
import { getApiToken } from "../lib/auth";
import {
  customQuoteDetailsPath,
  savePendingCustomQuote,
} from "../lib/pendingCustomQuote";

interface SmartQuestionnaireProps {
  service?: string;
  serviceId?: number;
  serviceName?: string;
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

type FormData = {
  propertyType: string;
  customPropertyType: string;
  approximatePeople: string;
  customApproximatePeople: string;
  numberOfFloors: string;
  customFloors: string;
  duration: string;
  assessmentDate: string;
  accessNotes: string;
  fireAlarmDetectors: string;
  customFireAlarmDetectors: string;
  fireAlarmCallPoints: string;
  customFireAlarmCallPoints: string;
  fireAlarmFloors: string;
  customFireAlarmFloors: string;
  fireAlarmPanels: string;
  customFireAlarmPanels: string;
  alarmSystemType: string;
  lastServiced: string;
  extinguisherCount: string;
  customExtinguisherCount: string;
  extinguisherFloors: string;
  extinguisherTypeId: string;
  extinguisherLastServiced: string;
  emergencyLightsCount: string;
  customEmergencyLightsCount: string;
  emergencyFloors: string;
  emergencyLightType: string;
  emergencyLightTest: string;
  trainingPeopleCount: string;
  customTrainingPeopleCount: string;
  trainingLocation: string;
  buildingType: string;
  staffTrainingBefore: string;
  consultationType: string;
  consultationHours: string;
};

const SKIP_VALUE = "__skip__";
const CUSTOM_FA_DETECTORS = "__custom_fa_detectors__";
const CUSTOM_FA_CALL_POINTS = "__custom_fa_call_points__";
const CUSTOM_FA_FLOORS = "__custom_fa_floors__";
const CUSTOM_FA_PANELS = "__custom_fa_panels__";
const CUSTOM_EXTINGUISHERS = "__custom_extinguishers__";
const CUSTOM_EMERGENCY_LIGHTS = "__custom_emergency_lights__";
const CUSTOM_FLOORS = "__custom_floors__";
const CUSTOM_TRAINING_PEOPLE = "__custom_training_people__";

function isPeopleCustomQuoteLabel(text: string): boolean {
  const t = (text ?? "").trim().toLowerCase();
  return /100\+/.test(t) || /custom\s*quote/.test(t) || /more than 500|500\+/.test(t);
}

function isFloorCustomQuoteOption(opt: FloorPricingItem): boolean {
  if (opt.custom_quote) return true;
  const label = (opt.label ?? opt.floor ?? "").trim().toLowerCase();
  return /custom\s*quote/.test(label) || /7\+|8\+|more than \d+/.test(label);
}

const CUSTOM_QUOTE_OPTION_VALUES = new Set([
  CUSTOM_FA_DETECTORS,
  CUSTOM_FA_CALL_POINTS,
  CUSTOM_FA_FLOORS,
  CUSTOM_FA_PANELS,
  CUSTOM_EXTINGUISHERS,
  CUSTOM_EMERGENCY_LIGHTS,
  CUSTOM_FLOORS,
  CUSTOM_TRAINING_PEOPLE,
]);

function isCustomQuoteOptionSelection(
  field: keyof FormData,
  value: string,
  propertyTypes: PropertyTypeResponse[],
  approximatePeopleOptions: ApproximatePeopleResponse[],
  floorOptions: FloorPricingItem[]
): boolean {
  if (CUSTOM_QUOTE_OPTION_VALUES.has(value)) return true;
  if (field === "propertyType") {
    const opt = propertyTypes.find((p) => String(p.id) === value);
    if (opt && isOtherPropertyTypeName(opt.property_type_name)) return true;
  }
  if (field === "approximatePeople") {
    const opt = approximatePeopleOptions.find((p) => String(p.id) === value);
    if (opt && isPeopleCustomQuoteLabel(opt.number_of_people)) return true;
  }
  if (field === "numberOfFloors") {
    const opt = floorOptions.find((f) => String(f.id ?? f.floor) === value);
    if (opt && isFloorCustomQuoteOption(opt)) return true;
  }
  return false;
}

const EMPTY_FORM: FormData = {
  propertyType: "",
  customPropertyType: "",
  approximatePeople: "",
  customApproximatePeople: "",
  numberOfFloors: "",
  customFloors: "",
  duration: "",
  assessmentDate: "",
  accessNotes: "",
  fireAlarmDetectors: "",
  customFireAlarmDetectors: "",
  fireAlarmCallPoints: "",
  customFireAlarmCallPoints: "",
  fireAlarmFloors: "",
  customFireAlarmFloors: "",
  fireAlarmPanels: "",
  customFireAlarmPanels: "",
  alarmSystemType: "",
  lastServiced: "",
  extinguisherCount: "",
  customExtinguisherCount: "",
  extinguisherFloors: "",
  extinguisherTypeId: "",
  extinguisherLastServiced: "",
  emergencyLightsCount: "",
  customEmergencyLightsCount: "",
  emergencyFloors: "",
  emergencyLightType: "",
  emergencyLightTest: "",
  trainingPeopleCount: "",
  customTrainingPeopleCount: "",
  trainingLocation: "",
  buildingType: "",
  staffTrainingBefore: "",
  consultationType: "",
  consultationHours: "",
};

function resolveServiceName(serviceName?: string, service?: string): string {
  return (serviceName ?? "").trim() || String(service ?? "").trim();
}

function resolveServiceId(serviceId?: number, service?: string): number {
  if (serviceId != null && !Number.isNaN(serviceId)) return serviceId;
  if (service && /^\d+$/.test(service)) return parseInt(service, 10);
  return 0;
}

function detectServiceFlags(name: string, serviceId: number) {
  const n = name.toLowerCase();
  const isFireAlarmService = n.includes("fire alarm") || serviceId === 42;
  const isFireExtinguisherService = n.includes("extinguisher") || serviceId === 41;
  const isEmergencyLightingService = n.includes("emergency") || serviceId === 39;
  const isFireMarshalTrainingService =
    n.includes("marshal") || n.includes("warden") || serviceId === 45;
  const isFireSafetyConsultationService = n.includes("consultation") || serviceId === 46;
  const isFireRiskAssessmentService =
    n.includes("fire risk") ||
    n.includes("assessment") ||
    (!isFireAlarmService &&
      !isFireExtinguisherService &&
      !isEmergencyLightingService &&
      !isFireMarshalTrainingService &&
      !isFireSafetyConsultationService);

  return {
    isFireAlarmService,
    isFireExtinguisherService,
    isEmergencyLightingService,
    isFireMarshalTrainingService,
    isFireSafetyConsultationService,
    isFireRiskAssessmentService,
  };
}

function optionLabel(
  options: { id: number; value: string }[],
  value: string
): string {
  const match = options.find((o) => String(o.id) === value);
  return match?.value?.trim() ?? "";
}

function parsePositiveInt(value: string): number | undefined {
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function SmartQuestionnaire({
  service,
  serviceId,
  serviceName,
  onComplete,
  onBack,
}: SmartQuestionnaireProps) {
  const navigate = useNavigate();
  const resolvedName = resolveServiceName(serviceName, service);
  const resolvedServiceId = resolveServiceId(serviceId, service);
  const flags = useMemo(
    () => detectServiceFlags(resolvedName, resolvedServiceId),
    [resolvedName, resolvedServiceId]
  );

  const {
    isFireAlarmService,
    isFireExtinguisherService,
    isEmergencyLightingService,
    isFireMarshalTrainingService,
    isFireSafetyConsultationService,
    isFireRiskAssessmentService,
  } = flags;

  const totalSteps = isFireAlarmService
    ? 8
    : isFireExtinguisherService || isEmergencyLightingService || isFireMarshalTrainingService
      ? 6
      : isFireSafetyConsultationService
        ? 4
        : 6;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeResponse[]>([]);
  const [approximatePeopleOptions, setApproximatePeopleOptions] = useState<ApproximatePeopleResponse[]>([]);
  const [floorOptions, setFloorOptions] = useState<FloorPricingItem[]>([]);
  const [durationOptions, setDurationOptions] = useState<FraDurationItem[]>([]);
  const [fireAlarmDetectorsOptions, setFireAlarmDetectorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmCallPointsOptions, setFireAlarmCallPointsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmFloorsOptions, setFireAlarmFloorsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmPanelsOptions, setFireAlarmPanelsOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmSystemTypeOptions, setFireAlarmSystemTypeOptions] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmLastServiceOptions, setFireAlarmLastServiceOptions] = useState<FireAlarmOptionItem[]>([]);
  const [extinguisherCountOptions, setExtinguisherCountOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherFloorOptions, setExtinguisherFloorOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherTypeOptions, setExtinguisherTypeOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherLastServiceOptions, setExtinguisherLastServiceOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [emergencyLightOptions, setEmergencyLightOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyFloorOptions, setEmergencyFloorOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyLightTypeOptions, setEmergencyLightTypeOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyLightTestOptions, setEmergencyLightTestOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [marshalPeopleOptions, setMarshalPeopleOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalPlaceOptions, setMarshalPlaceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalBuildingOptions, setMarshalBuildingOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalExperienceOptions, setMarshalExperienceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [consultationModeOptions, setConsultationModeOptions] = useState<ConsultationOptionItem[]>([]);
  const [consultationHourOptions, setConsultationHourOptions] = useState<ConsultationOptionItem[]>([]);
  const [loadingFraOptions, setLoadingFraOptions] = useState(false);
  const [loadingFireAlarmOptions, setLoadingFireAlarmOptions] = useState(false);
  const [loadingExtinguisherOptions, setLoadingExtinguisherOptions] = useState(false);
  const [loadingEmergencyOptions, setLoadingEmergencyOptions] = useState(false);
  const [loadingMarshalOptions, setLoadingMarshalOptions] = useState(false);
  const [loadingConsultationOptions, setLoadingConsultationOptions] = useState(false);

  const apiToken = getApiToken();

  const showCustomFireAlarmDetectorsInput = formData.fireAlarmDetectors === CUSTOM_FA_DETECTORS;
  const showCustomFireAlarmCallPointsInput = formData.fireAlarmCallPoints === CUSTOM_FA_CALL_POINTS;
  const showCustomFireAlarmFloorsInput = formData.fireAlarmFloors === CUSTOM_FA_FLOORS;
  const showCustomFireAlarmPanelsInput = formData.fireAlarmPanels === CUSTOM_FA_PANELS;
  const showCustomExtinguisherCountInput = formData.extinguisherCount === CUSTOM_EXTINGUISHERS;
  const showCustomEmergencyLightsInput = formData.emergencyLightsCount === CUSTOM_EMERGENCY_LIGHTS;
  const showCustomFloorsInput =
    formData.numberOfFloors === CUSTOM_FLOORS ||
    floorOptions.some(
      (opt) => isFloorCustomQuoteOption(opt) && String(opt.id ?? opt.floor) === formData.numberOfFloors
    );
  const showCustomTrainingPeopleInput = formData.trainingPeopleCount === CUSTOM_TRAINING_PEOPLE;

  const sortedApproximatePeopleOptions = useMemo(
    () =>
      [...approximatePeopleOptions].sort(
        (a, b) =>
          getPeopleOptionSortKey(a.number_of_people) - getPeopleOptionSortKey(b.number_of_people)
      ),
    [approximatePeopleOptions]
  );

  const selectedApproximatePeopleOption = useMemo(
    () =>
      sortedApproximatePeopleOptions.find((opt) => String(opt.id) === formData.approximatePeople) ??
      null,
    [sortedApproximatePeopleOptions, formData.approximatePeople]
  );

  const showCustomPeopleInput = Boolean(
    selectedApproximatePeopleOption &&
      isPeopleCustomQuoteLabel(selectedApproximatePeopleOption.number_of_people)
  );

  const selectedPropertyType = useMemo(
    () => propertyTypes.find((p) => String(p.id) === formData.propertyType) ?? null,
    [propertyTypes, formData.propertyType]
  );

  const showCustomPropertyTypeInput = Boolean(
    selectedPropertyType && isOtherPropertyTypeName(selectedPropertyType.property_type_name)
  );

  const hasApiCustomFloorOption = useMemo(
    () => floorOptions.some((opt) => isFloorCustomQuoteOption(opt)),
    [floorOptions]
  );

  const serviceKind = getQuestionnaireServiceKind({
    isFireAlarmService,
    isFireExtinguisherService,
    isEmergencyLightingService,
    isFireSafetyConsultationService,
    isFireMarshalTrainingService,
    isFireRiskAssessmentService,
  });
  const baseStepMeta = getQuestionnaireStepMeta(serviceKind, currentStep, totalSteps);
  const stepMeta = useMemo(() => {
    const peopleLabel = selectedApproximatePeopleOption
      ? formatPeopleOptionLabel(selectedApproximatePeopleOption.number_of_people)
      : undefined;
    const durationItem = durationOptions.find((item) => String(item.id) === formData.duration);
    const selectedFloorOption = floorOptions.find(
      (item) => String(item.id ?? item.floor) === formData.numberOfFloors
    );
    const floorLabel =
      showCustomFloorsInput && formData.customFloors.trim()
        ? `${formData.customFloors.trim()} floors`
        : selectedFloorOption?.label ?? selectedFloorOption?.floor;

    return resolveContextualStepMeta(baseStepMeta, currentStep, {
      propertyTypeId: formData.propertyType || undefined,
      propertyTypes,
      approximatePeopleLabel: peopleLabel,
      showCustomPeopleInput,
      customApproximatePeople: formData.customApproximatePeople,
      floorLabel,
      showCustomFloorsInput,
      customFloorsCount: formData.customFloors,
      durationLabel: durationItem?.duration,
    });
  }, [
    baseStepMeta,
    currentStep,
    durationOptions,
    floorOptions,
    formData.customApproximatePeople,
    formData.customFloors,
    formData.duration,
    formData.numberOfFloors,
    formData.propertyType,
    propertyTypes,
    selectedApproximatePeopleOption,
    showCustomFloorsInput,
    showCustomPeopleInput,
  ]);

  const updateFormData = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    if (isFireRiskAssessmentService || (!isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireMarshalTrainingService && !isFireSafetyConsultationService)) {
      setLoadingFraOptions(true);
      Promise.all([fetchPropertyTypes(), fetchApproximatePeople(), fetchFloorPricing(), fetchFraDurations()])
        .then(([types, people, floors, durations]) => {
          setPropertyTypes(types);
          setApproximatePeopleOptions(people);
          setFloorOptions(floors);
          setDurationOptions(durations);
        })
        .catch(() => {})
        .finally(() => setLoadingFraOptions(false));
    }
  }, [isFireAlarmService, isFireExtinguisherService, isEmergencyLightingService, isFireMarshalTrainingService, isFireSafetyConsultationService, isFireRiskAssessmentService]);

  useEffect(() => {
    if (!isFireAlarmService) return;
    setLoadingFireAlarmOptions(true);
    const token = apiToken ?? null;
    Promise.all([
      fetchFireAlarmOptions(token, "ditectors"),
      fetchFireAlarmOptions(token, "call_points"),
      fetchFireAlarmOptions(token, "floors"),
      fetchFireAlarmOptions(token, "alarm_panels"),
      fetchFireAlarmOptions(token, "system_type"),
      fetchFireAlarmOptions(token, "last_service"),
    ])
      .then(([detectors, callPoints, floors, panels, systemType, lastService]) => {
        setFireAlarmDetectorsOptions(detectors);
        setFireAlarmCallPointsOptions(callPoints);
        setFireAlarmFloorsOptions(floors);
        setFireAlarmPanelsOptions(panels);
        setFireAlarmSystemTypeOptions(systemType);
        setFireAlarmLastServiceOptions(lastService);
      })
      .catch(() => {})
      .finally(() => setLoadingFireAlarmOptions(false));
  }, [isFireAlarmService, apiToken]);

  useEffect(() => {
    if (!isFireExtinguisherService) return;
    setLoadingExtinguisherOptions(true);
    const token = apiToken ?? "";
    Promise.all([
      fetchExtinguisherServiceOptions(token, "extinguisher"),
      fetchExtinguisherServiceOptions(token, "floor"),
      fetchExtinguisherServiceOptions(token, "metarials"),
      fetchExtinguisherServiceOptions(token, "last_service"),
    ])
      .then(([extinguishers, floors, types, lastService]) => {
        setExtinguisherCountOptions(extinguishers);
        setExtinguisherFloorOptions(floors);
        setExtinguisherTypeOptions(types);
        setExtinguisherLastServiceOptions(lastService);
      })
      .catch(() => {})
      .finally(() => setLoadingExtinguisherOptions(false));
  }, [isFireExtinguisherService, apiToken]);

  useEffect(() => {
    if (!isEmergencyLightingService) return;
    setLoadingEmergencyOptions(true);
    Promise.all([
      fetchEmergencyLightOptions("light"),
      fetchEmergencyLightOptions("floor"),
      fetchEmergencyLightOptions("light_type"),
      fetchEmergencyLightOptions("light_test"),
    ])
      .then(([lights, floors, types, tests]) => {
        setEmergencyLightOptions(lights);
        setEmergencyFloorOptions(floors);
        setEmergencyLightTypeOptions(types);
        setEmergencyLightTestOptions(tests);
      })
      .catch(() => {})
      .finally(() => setLoadingEmergencyOptions(false));
  }, [isEmergencyLightingService]);

  useEffect(() => {
    if (!isFireMarshalTrainingService) return;
    setLoadingMarshalOptions(true);
    const token = apiToken ?? "";
    Promise.all([
      fetchMarshalOptions(token, "people"),
      fetchMarshalOptions(token, "training_place"),
      fetchMarshalOptions(token, "building_type"),
      fetchMarshalOptions(token, "experience"),
    ])
      .then(([people, place, building, experience]) => {
        setMarshalPeopleOptions(people);
        setMarshalPlaceOptions(place);
        setMarshalBuildingOptions(building);
        setMarshalExperienceOptions(experience);
      })
      .catch(() => {})
      .finally(() => setLoadingMarshalOptions(false));
  }, [isFireMarshalTrainingService, apiToken]);

  useEffect(() => {
    if (!isFireSafetyConsultationService) return;
    setLoadingConsultationOptions(true);
    const token = apiToken ?? "";
    Promise.all([
      fetchFireConsultationOptions(token, "mode"),
      fetchFireConsultationOptions(token, "hour"),
    ])
      .then(([modes, hours]) => {
        setConsultationModeOptions(modes);
        setConsultationHourOptions(hours);
      })
      .catch(() => {})
      .finally(() => setLoadingConsultationOptions(false));
  }, [isFireSafetyConsultationService, apiToken]);

  const isCustomQuoteFlow = useMemo(() => {
    if (isFireAlarmService) {
      return (
        formData.fireAlarmDetectors === CUSTOM_FA_DETECTORS ||
        formData.fireAlarmCallPoints === CUSTOM_FA_CALL_POINTS ||
        formData.fireAlarmFloors === CUSTOM_FA_FLOORS ||
        formData.fireAlarmPanels === CUSTOM_FA_PANELS
      );
    }
    if (isFireExtinguisherService) {
      return formData.extinguisherCount === CUSTOM_EXTINGUISHERS;
    }
    if (isEmergencyLightingService) {
      return formData.emergencyLightsCount === CUSTOM_EMERGENCY_LIGHTS;
    }
    if (isFireMarshalTrainingService) {
      return formData.trainingPeopleCount === CUSTOM_TRAINING_PEOPLE;
    }
    if (isFireRiskAssessmentService) {
      return (
        formData.numberOfFloors === CUSTOM_FLOORS ||
        floorOptions.some(
          (opt) => isFloorCustomQuoteOption(opt) && String(opt.id ?? opt.floor) === formData.numberOfFloors
        ) ||
        showCustomPeopleInput
      );
    }
    return false;
  }, [formData, flags, floorOptions, isFireAlarmService, isFireExtinguisherService, isEmergencyLightingService, isFireMarshalTrainingService, isFireRiskAssessmentService, showCustomPeopleInput]);

  const isStepValid = useCallback((): boolean => {
    if (isFireAlarmService) {
      switch (currentStep) {
        case 1:
          return showCustomFireAlarmDetectorsInput
            ? Boolean(formData.customFireAlarmDetectors.trim())
            : Boolean(formData.fireAlarmDetectors);
        case 2:
          return showCustomFireAlarmCallPointsInput
            ? Boolean(formData.customFireAlarmCallPoints.trim())
            : Boolean(formData.fireAlarmCallPoints);
        case 3:
          return showCustomFireAlarmFloorsInput
            ? Boolean(formData.customFireAlarmFloors.trim())
            : Boolean(formData.fireAlarmFloors);
        case 4:
          return showCustomFireAlarmPanelsInput
            ? Boolean(formData.customFireAlarmPanels.trim())
            : Boolean(formData.fireAlarmPanels);
        case 5:
          return Boolean(formData.alarmSystemType);
        case 6:
          return Boolean(formData.lastServiced);
        case 7:
          return Boolean(formData.assessmentDate);
        case 8:
          return true;
        default:
          return false;
      }
    }

    if (isFireExtinguisherService) {
      switch (currentStep) {
        case 1:
          return showCustomExtinguisherCountInput
            ? Boolean(formData.customExtinguisherCount.trim())
            : Boolean(formData.extinguisherCount);
        case 2:
          return Boolean(formData.extinguisherFloors);
        case 3:
          return Boolean(formData.extinguisherTypeId);
        case 4:
          return Boolean(formData.extinguisherLastServiced);
        case 5:
          return Boolean(formData.assessmentDate);
        case 6:
          return true;
        default:
          return false;
      }
    }

    if (isEmergencyLightingService) {
      switch (currentStep) {
        case 1:
          return showCustomEmergencyLightsInput
            ? Boolean(formData.customEmergencyLightsCount.trim())
            : Boolean(formData.emergencyLightsCount);
        case 2:
          return Boolean(formData.emergencyFloors);
        case 3:
          return Boolean(formData.emergencyLightType);
        case 4:
          return Boolean(formData.emergencyLightTest);
        case 5:
          return Boolean(formData.assessmentDate);
        case 6:
          return true;
        default:
          return false;
      }
    }

    if (isFireMarshalTrainingService) {
      switch (currentStep) {
        case 1:
          return showCustomTrainingPeopleInput
            ? Boolean(formData.customTrainingPeopleCount.trim())
            : Boolean(formData.trainingPeopleCount);
        case 2:
          return Boolean(formData.trainingLocation);
        case 3:
          return Boolean(formData.buildingType);
        case 4:
          return Boolean(formData.staffTrainingBefore);
        case 5:
          return Boolean(formData.assessmentDate);
        case 6:
          return true;
        default:
          return false;
      }
    }

    if (isFireSafetyConsultationService) {
      switch (currentStep) {
        case 1:
          return Boolean(formData.consultationType);
        case 2:
          return Boolean(formData.consultationHours);
        case 3:
          return Boolean(formData.assessmentDate);
        case 4:
          return true;
        default:
          return false;
      }
    }

    switch (currentStep) {
      case 1:
        return showCustomPropertyTypeInput
          ? Boolean(formData.customPropertyType.trim())
          : Boolean(formData.propertyType);
      case 2:
        return showCustomPeopleInput
          ? Boolean(formData.customApproximatePeople.trim())
          : Boolean(formData.approximatePeople);
      case 3:
        return showCustomFloorsInput ? Boolean(formData.customFloors.trim()) : Boolean(formData.numberOfFloors);
      case 4:
        return Boolean(formData.duration);
      case 5:
        return Boolean(formData.assessmentDate);
      case 6:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData, flags, showCustomEmergencyLightsInput, showCustomExtinguisherCountInput, showCustomFireAlarmCallPointsInput, showCustomFireAlarmDetectorsInput, showCustomFireAlarmFloorsInput, showCustomFireAlarmPanelsInput, showCustomFloorsInput, showCustomPeopleInput, showCustomPropertyTypeInput, showCustomTrainingPeopleInput]);

  const buildCustomQuoteRequestData = (): CustomQuoteRequestData => {
    const base: CustomQuoteRequestData = {
      preferred_date: formData.assessmentDate,
      access_note: formData.accessNotes.trim() || undefined,
    };

    if (isFireAlarmService) {
      return {
        ...base,
        smoke_detectors: parsePositiveInt(
          showCustomFireAlarmDetectorsInput
            ? formData.customFireAlarmDetectors
            : formData.fireAlarmDetectors
        ),
        call_point: parsePositiveInt(
          showCustomFireAlarmCallPointsInput
            ? formData.customFireAlarmCallPoints
            : formData.fireAlarmCallPoints
        ),
        floors: parsePositiveInt(
          showCustomFireAlarmFloorsInput ? formData.customFireAlarmFloors : formData.fireAlarmFloors
        ),
        panels: parsePositiveInt(
          showCustomFireAlarmPanelsInput ? formData.customFireAlarmPanels : formData.fireAlarmPanels
        ),
      };
    }

    if (isFireExtinguisherService) {
      return {
        ...base,
        extinguisher: parsePositiveInt(
          showCustomExtinguisherCountInput
            ? formData.customExtinguisherCount
            : formData.extinguisherCount
        ),
      };
    }

    if (isEmergencyLightingService) {
      return {
        ...base,
        emergency_light: parsePositiveInt(
          showCustomEmergencyLightsInput
            ? formData.customEmergencyLightsCount
            : formData.emergencyLightsCount
        ),
      };
    }

    if (isFireMarshalTrainingService) {
      return {
        ...base,
        people: parsePositiveInt(
          showCustomTrainingPeopleInput
            ? formData.customTrainingPeopleCount
            : formData.trainingPeopleCount
        ),
        building_type: optionLabel(marshalBuildingOptions, formData.buildingType),
      };
    }

    return {
      ...base,
      building_type: showCustomPropertyTypeInput
        ? formData.customPropertyType.trim()
        : optionLabel(propertyTypes.map((p) => ({ id: p.id, value: p.property_type_name })), formData.propertyType),
      people_count: showCustomPeopleInput
        ? `${formData.customApproximatePeople.trim()} people`
        : optionLabel(
            approximatePeopleOptions.map((p) => ({ id: p.id, value: p.number_of_people })),
            formData.approximatePeople
          ),
      floors: parsePositiveInt(showCustomFloorsInput ? formData.customFloors : formData.numberOfFloors),
      duration_id: parsePositiveInt(formData.duration),
      fra_assessment_type: optionLabel(durationOptions.map((d) => ({ id: d.id, value: d.duration })), formData.duration),
    };
  };

  const buildCompletionPayload = (): Record<string, unknown> => {
    const preferred_date = formData.assessmentDate;
    const access_note = formData.accessNotes.trim();

    if (isFireAlarmService) {
      const detectorLabel = showCustomFireAlarmDetectorsInput
        ? `${formData.customFireAlarmDetectors.trim()} detectors`
        : optionLabel(fireAlarmDetectorsOptions, formData.fireAlarmDetectors);
      const callPointLabel = showCustomFireAlarmCallPointsInput
        ? `${formData.customFireAlarmCallPoints.trim()} call points`
        : optionLabel(fireAlarmCallPointsOptions, formData.fireAlarmCallPoints);
      const floorLabel = showCustomFireAlarmFloorsInput
        ? `${formData.customFireAlarmFloors.trim()} floors`
        : optionLabel(fireAlarmFloorsOptions, formData.fireAlarmFloors);
      const panelLabel = showCustomFireAlarmPanelsInput
        ? `${formData.customFireAlarmPanels.trim()} panels`
        : optionLabel(fireAlarmPanelsOptions, formData.fireAlarmPanels);
      const systemLabel = optionLabel(fireAlarmSystemTypeOptions, formData.alarmSystemType);
      const lastServiceLabel =
        formData.lastServiced === SKIP_VALUE
          ? ""
          : optionLabel(fireAlarmLastServiceOptions, formData.lastServiced);

      return {
        is_fire_alarm: true,
        fire_alarm_smoke_detector_id:
          parseInt(String(formData.fireAlarmDetectors), 10) || 0,
        fire_alarm_call_point_id: parseInt(String(formData.fireAlarmCallPoints), 10) || 0,
        fire_alarm_floor_id: parseInt(String(formData.fireAlarmFloors), 10) || 0,
        fire_alarm_panel_id: parseInt(String(formData.fireAlarmPanels), 10) || 0,
        fire_alarm_system_type_id: parseInt(String(formData.alarmSystemType), 10) || 0,
        ...(formData.lastServiced && formData.lastServiced !== SKIP_VALUE
          ? {
              fire_alarm_last_service_id:
                parseInt(String(formData.lastServiced), 10) || undefined,
            }
          : {}),
        preferred_date,
        access_note,
        detector_count: detectorLabel,
        manual_call_points_count: callPointLabel,
        number_of_floors: floorLabel,
        fire_alarm_panels_count: panelLabel,
        alarm_system_type: systemLabel,
        last_serviced: lastServiceLabel,
      };
    }

    if (isFireExtinguisherService) {
      const extinguisherLabel = showCustomExtinguisherCountInput
        ? `${formData.customExtinguisherCount.trim()} extinguishers`
        : optionLabel(extinguisherCountOptions, formData.extinguisherCount);
      const floorLabel = optionLabel(extinguisherFloorOptions, formData.extinguisherFloors);
      const typeLabel =
        formData.extinguisherTypeId === SKIP_VALUE
          ? ""
          : optionLabel(extinguisherTypeOptions, formData.extinguisherTypeId);
      const lastServiceLabel =
        formData.extinguisherLastServiced === SKIP_VALUE
          ? ""
          : optionLabel(extinguisherLastServiceOptions, formData.extinguisherLastServiced);

      return {
        is_fire_extinguisher: true,
        extinguisher_id: parseInt(String(formData.extinguisherCount), 10) || 0,
        floor_id: parseInt(String(formData.extinguisherFloors), 10) || 0,
        ...(formData.extinguisherTypeId && formData.extinguisherTypeId !== SKIP_VALUE
          ? { type_id: parseInt(String(formData.extinguisherTypeId), 10) || undefined }
          : {}),
        ...(formData.extinguisherLastServiced && formData.extinguisherLastServiced !== SKIP_VALUE
          ? {
              last_service_id:
                parseInt(String(formData.extinguisherLastServiced), 10) || undefined,
            }
          : {}),
        preferred_date,
        access_note,
        extinguisher_count: extinguisherLabel,
        number_of_floors: floorLabel,
        extinguisher_type: typeLabel,
        last_serviced: lastServiceLabel,
      };
    }

    if (isEmergencyLightingService) {
      const lightsLabel = showCustomEmergencyLightsInput
        ? `${formData.customEmergencyLightsCount.trim()} lights`
        : optionLabel(emergencyLightOptions, formData.emergencyLightsCount);
      const floorLabel = optionLabel(emergencyFloorOptions, formData.emergencyFloors);
      const typeLabel =
        formData.emergencyLightType === SKIP_VALUE
          ? ""
          : optionLabel(emergencyLightTypeOptions, formData.emergencyLightType);
      const testLabel =
        formData.emergencyLightTest === SKIP_VALUE
          ? ""
          : optionLabel(emergencyLightTestOptions, formData.emergencyLightTest);

      const lightTypeId =
        formData.emergencyLightType && formData.emergencyLightType !== SKIP_VALUE
          ? parseInt(String(formData.emergencyLightType), 10) || null
          : null;
      const lightTestId =
        formData.emergencyLightTest && formData.emergencyLightTest !== SKIP_VALUE
          ? parseInt(String(formData.emergencyLightTest), 10) || null
          : null;

      const combinedAccessNote = [typeLabel && `Lighting type: ${typeLabel}`, testLabel && `Test frequency: ${testLabel}`, access_note]
        .filter(Boolean)
        .join(". ");

      return {
        emergency_light_id: parseInt(String(formData.emergencyLightsCount), 10) || 1,
        emergency_floor_id: parseInt(String(formData.emergencyFloors), 10) || 1,
        emergency_light_type_id: lightTypeId,
        emergency_light_test_id: lightTestId,
        preferred_date,
        access_note: combinedAccessNote,
        emergency_lights_count: lightsLabel,
        number_of_floors: floorLabel,
        request_data: {
          emergency_light_type_id: lightTypeId,
          emergency_light_test_id: lightTestId,
        },
      };
    }

    if (isFireMarshalTrainingService) {
      const peopleLabel = showCustomTrainingPeopleInput
        ? `${formData.customTrainingPeopleCount.trim()} people`
        : optionLabel(marshalPeopleOptions, formData.trainingPeopleCount);
      const experienceId =
        formData.staffTrainingBefore && formData.staffTrainingBefore !== SKIP_VALUE
          ? parseInt(String(formData.staffTrainingBefore), 10) || null
          : null;
      const staffTrainingLabel =
        formData.staffTrainingBefore === SKIP_VALUE
          ? ""
          : optionLabel(marshalExperienceOptions, formData.staffTrainingBefore);

      return {
        people_id: parseInt(String(formData.trainingPeopleCount), 10) || 1,
        place_id: parseInt(String(formData.trainingLocation), 10) || 1,
        building_type_id: parseInt(String(formData.buildingType), 10) || 1,
        experience_id: experienceId,
        preferred_date,
        access_note,
        training_people_count: peopleLabel,
        building_type: optionLabel(marshalBuildingOptions, formData.buildingType),
        training_location: optionLabel(marshalPlaceOptions, formData.trainingLocation),
        staff_training_before: staffTrainingLabel,
        request_data: {
          people_id: parseInt(String(formData.trainingPeopleCount), 10) || 1,
          place_id: parseInt(String(formData.trainingLocation), 10) || 1,
          building_type_id: parseInt(String(formData.buildingType), 10) || 1,
          experience_id: experienceId,
        },
      };
    }

    if (isFireSafetyConsultationService) {
      return {
        mode_id: parseInt(String(formData.consultationType), 10) || 1,
        hour_id: parseInt(String(formData.consultationHours), 10) || 1,
        preferred_date,
        access_note,
        consultation_type: optionLabel(consultationModeOptions, formData.consultationType),
        consultation_hours: optionLabel(consultationHourOptions, formData.consultationHours),
        request_data: {
          mode_id: parseInt(String(formData.consultationType), 10) || 1,
          hour_id: parseInt(String(formData.consultationHours), 10) || 1,
        },
      };
    }

    const propertyTypeLabel = showCustomPropertyTypeInput
      ? formData.customPropertyType.trim()
      : optionLabel(
          propertyTypes.map((p) => ({ id: p.id, value: p.property_type_name })),
          formData.propertyType
        );
    const peopleLabel = showCustomPeopleInput
      ? `${formData.customApproximatePeople.trim()} people`
      : optionLabel(
          approximatePeopleOptions.map((p) => ({ id: p.id, value: p.number_of_people })),
          formData.approximatePeople
        );
    const floorLabel = showCustomFloorsInput
      ? `${formData.customFloors.trim()} floors`
      : optionLabel(
          floorOptions.map((f) => ({ id: f.id ?? 0, value: f.label ?? f.floor })),
          formData.numberOfFloors
        );
    const durationLabel = optionLabel(
      durationOptions.map((d) => ({ id: d.id, value: d.duration })),
      formData.duration
    );
    const floorId = parseInt(String(formData.numberOfFloors), 10);

    return {
      property_type_id: parseInt(String(formData.propertyType), 10) || 0,
      approximate_people_id: parseInt(String(formData.approximatePeople), 10) || 0,
      number_of_floors: showCustomFloorsInput ? formData.customFloors.trim() : String(floorId || formData.numberOfFloors),
      ...(floorId > 0 && !showCustomFloorsInput ? { number_of_floors_id: floorId } : {}),
      duration_id: parseInt(String(formData.duration), 10) || undefined,
      preferred_date,
      access_note,
      property_type_label: propertyTypeLabel,
      approximate_people_label: peopleLabel,
      fra_assessment_type: durationLabel,
    };
  };

  const handleStepBack = () => {
    if (currentStep <= 1) {
      onBack();
      return;
    }
    setCurrentStep((s) => s - 1);
  };

  const assessmentStep =
    isFireAlarmService ? 7 : isFireExtinguisherService || isEmergencyLightingService || isFireMarshalTrainingService ? 5 : isFireRiskAssessmentService ? 5 : isFireSafetyConsultationService ? 3 : 5;
  const accessNotesStep =
    isFireAlarmService ? 8 : isFireExtinguisherService || isEmergencyLightingService || isFireMarshalTrainingService ? 6 : isFireRiskAssessmentService ? 6 : isFireSafetyConsultationService ? 4 : 6;

  const showCustomInputOnCurrentStep = useMemo(() => {
    if (isFireAlarmService) {
      if (currentStep === 1) return showCustomFireAlarmDetectorsInput;
      if (currentStep === 2) return showCustomFireAlarmCallPointsInput;
      if (currentStep === 3) return showCustomFireAlarmFloorsInput;
      if (currentStep === 4) return showCustomFireAlarmPanelsInput;
      return false;
    }
    if (isFireExtinguisherService) {
      return currentStep === 1 && showCustomExtinguisherCountInput;
    }
    if (isEmergencyLightingService) {
      return currentStep === 1 && showCustomEmergencyLightsInput;
    }
    if (isFireMarshalTrainingService) {
      return currentStep === 1 && showCustomTrainingPeopleInput;
    }
    if (isFireRiskAssessmentService || (!isFireAlarmService && !isFireExtinguisherService && !isEmergencyLightingService && !isFireMarshalTrainingService && !isFireSafetyConsultationService)) {
      if (currentStep === 1) return showCustomPropertyTypeInput;
      if (currentStep === 2) return showCustomPeopleInput;
      if (currentStep === 3) return showCustomFloorsInput;
    }
    return false;
  }, [
    currentStep,
    isFireAlarmService,
    isFireExtinguisherService,
    isEmergencyLightingService,
    isFireMarshalTrainingService,
    isFireRiskAssessmentService,
    isFireSafetyConsultationService,
    showCustomFireAlarmCallPointsInput,
    showCustomFireAlarmDetectorsInput,
    showCustomFireAlarmFloorsInput,
    showCustomFireAlarmPanelsInput,
    showCustomExtinguisherCountInput,
    showCustomEmergencyLightsInput,
    showCustomFloorsInput,
    showCustomPeopleInput,
    showCustomPropertyTypeInput,
    showCustomTrainingPeopleInput,
  ]);

  const showContinueButton =
    showCustomInputOnCurrentStep || currentStep === totalSteps;

  const advanceStep = useCallback(() => {
    setCurrentStep((s) => (s < totalSteps ? s + 1 : s));
  }, [totalSteps]);

  const handleOptionSelect = useCallback(
    (field: keyof FormData, value: string) => {
      updateFormData(field, value);
      if (!isCustomQuoteOptionSelection(field, value, propertyTypes, approximatePeopleOptions, floorOptions)) {
        window.setTimeout(() => advanceStep(), 0);
      }
    },
    [advanceStep, approximatePeopleOptions, floorOptions, propertyTypes, updateFormData]
  );

  const handleAssessmentDateChange = useCallback(
    (value: string) => {
      updateFormData("assessmentDate", value);
      if (value.trim()) {
        window.setTimeout(() => advanceStep(), 0);
      }
    },
    [advanceStep, updateFormData]
  );

  const handleContinue = () => {
    if (!isStepValid()) return;

    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
      return;
    }

    const sid = resolvedServiceId;
    if (isCustomQuoteFlow && sid > 0) {
      savePendingCustomQuote({
        serviceId: sid,
        requestData: buildCustomQuoteRequestData(),
        serviceName: resolvedName || undefined,
        returnPath: `/services/${sid}/questionnaire`,
      });
      navigate(customQuoteDetailsPath(sid), {
        state: resolvedName ? { serviceName: resolvedName } : undefined,
      });
      return;
    }

    onComplete(buildCompletionPayload());
  };

  const continueLabel =
    currentStep === totalSteps
      ? isCustomQuoteFlow
        ? "Continue to custom quote"
        : "Continue to location"
      : "Continue";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl items-center">
          <Link to="/" className="flex items-center transition-opacity hover:opacity-90" aria-label="Go to home">
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      <div className="border-b bg-gray-50 px-4 py-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/" className="transition-colors hover:text-red-600">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/services" className="transition-colors hover:text-red-600">
              Select Service
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900">Details</span>
          </div>
        </div>
      </div>

      <main className="px-4 py-10 md:px-6 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <div className="mb-3 flex items-center justify-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Building2 className="h-6 w-6" />
              </span>
              <h1 className="text-2xl font-semibold text-[#0A1A2F]">
                {resolvedName || "Service questionnaire"}
              </h1>
            </div>
            <p className="text-gray-600">Answer a few questions so we can match you with the right professionals.</p>
          </div>

          <QuestionnaireStepShell
            meta={stepMeta}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onBack={handleStepBack}
            onContinue={handleContinue}
            continueDisabled={!isStepValid()}
            continueLabel={continueLabel}
            showContinue={showContinueButton}
          >
            <div className="space-y-6">
              {isFireAlarmService && currentStep === 1 && (
                <div className="space-y-2">
                  <Label>Select number of detectors</Label>
                  <OptionCardSelect
                    value={formData.fireAlarmDetectors}
                    onValueChange={(value) => handleOptionSelect("fireAlarmDetectors", value)}
                    loading={loadingFireAlarmOptions}
                    options={[
                      ...fireAlarmDetectorsOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                      { value: CUSTOM_FA_DETECTORS, label: QUESTIONNAIRE_OTHERS_LABEL },
                    ]}
                  />
                  {showCustomFireAlarmDetectorsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customFireAlarmDetectors">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                      <Input
                        id="customFireAlarmDetectors"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 20, 30, 50"
                        value={formData.customFireAlarmDetectors}
                        onChange={(e) => updateFormData("customFireAlarmDetectors", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {isFireAlarmService && currentStep === 2 && (
                <div className="space-y-2">
                  <Label>Select number of call points</Label>
                  <OptionCardSelect
                    value={formData.fireAlarmCallPoints}
                    onValueChange={(value) => handleOptionSelect("fireAlarmCallPoints", value)}
                    loading={loadingFireAlarmOptions}
                    options={[
                      ...fireAlarmCallPointsOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                      { value: CUSTOM_FA_CALL_POINTS, label: QUESTIONNAIRE_OTHERS_LABEL },
                    ]}
                  />
                  {showCustomFireAlarmCallPointsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customFireAlarmCallPoints">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                      <Input
                        id="customFireAlarmCallPoints"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 12, 15, 20"
                        value={formData.customFireAlarmCallPoints}
                        onChange={(e) => updateFormData("customFireAlarmCallPoints", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {isFireAlarmService && currentStep === 3 && (
                <div className="space-y-2">
                  <Label>Select number of floors</Label>
                  <OptionCardSelect
                    value={formData.fireAlarmFloors}
                    onValueChange={(value) => handleOptionSelect("fireAlarmFloors", value)}
                    loading={loadingFireAlarmOptions}
                    options={[
                      ...fireAlarmFloorsOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                      { value: CUSTOM_FA_FLOORS, label: QUESTIONNAIRE_OTHERS_LABEL },
                    ]}
                  />
                  {showCustomFireAlarmFloorsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customFireAlarmFloors">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                      <Input
                        id="customFireAlarmFloors"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 8, 10, 12"
                        value={formData.customFireAlarmFloors}
                        onChange={(e) => updateFormData("customFireAlarmFloors", e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">
                        Enter the approximate number of floors (include all levels, basements, and ground floor)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 4 && isFireAlarmService && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select number of panels</Label>
                    <OptionCardSelect
                      value={formData.fireAlarmPanels}
                      onValueChange={(value) => handleOptionSelect("fireAlarmPanels", value)}
                      loading={loadingFireAlarmOptions}
                      options={[
                        ...fireAlarmPanelsOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                        { value: CUSTOM_FA_PANELS, label: QUESTIONNAIRE_OTHERS_LABEL },
                      ]}
                    />
                    {showCustomFireAlarmPanelsInput && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="customFireAlarmPanels">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
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

              {currentStep === 5 && isFireAlarmService && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select type</Label>
                    <OptionCardSelect
                      value={formData.alarmSystemType}
                      onValueChange={(value) => handleOptionSelect("alarmSystemType", value)}
                      loading={loadingFireAlarmOptions}
                      options={fireAlarmSystemTypeOptions.map((opt) => ({ value: String(opt.id), label: opt.value }))}
                    />
                  </div>
                </div>
              )}

              {currentStep === 6 && isFireAlarmService && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Select when last serviced</Label>
                    <OptionCardSelect
                      value={formData.lastServiced}
                      onValueChange={(value) => handleOptionSelect("lastServiced", value)}
                      loading={loadingFireAlarmOptions}
                      options={[
                        { value: SKIP_VALUE, label: "Skip (optional)" },
                        ...fireAlarmLastServiceOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                      ]}
                    />
                  </div>
                </div>
              )}

              {isFireExtinguisherService && currentStep === 1 && (
                <div className="space-y-2">
                  <Label>Select number of extinguishers</Label>
                  <OptionCardSelect
                    value={formData.extinguisherCount}
                    onValueChange={(value) => handleOptionSelect("extinguisherCount", value)}
                    loading={loadingExtinguisherOptions}
                    options={[
                      ...extinguisherCountOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                      { value: CUSTOM_EXTINGUISHERS, label: QUESTIONNAIRE_OTHERS_LABEL },
                    ]}
                  />
                  {showCustomExtinguisherCountInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customExtinguisherCount">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                      <Input
                        id="customExtinguisherCount"
                        type="text"
                        inputMode="numeric"
                        value={formData.customExtinguisherCount}
                        onChange={(e) => updateFormData("customExtinguisherCount", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {isFireExtinguisherService && currentStep === 2 && (
                <div className="space-y-2">
                  <Label>Select number of floors</Label>
                  <OptionCardSelect
                    value={formData.extinguisherFloors}
                    onValueChange={(value) => handleOptionSelect("extinguisherFloors", value)}
                    loading={loadingExtinguisherOptions}
                    options={extinguisherFloorOptions.map((opt) => ({ value: String(opt.id), label: opt.value }))}
                  />
                </div>
              )}

              {isFireExtinguisherService && currentStep === 3 && (
                <div className="space-y-2">
                  <Label>Select extinguisher type</Label>
                  <OptionCardSelect
                    value={formData.extinguisherTypeId}
                    onValueChange={(value) => handleOptionSelect("extinguisherTypeId", value)}
                    loading={loadingExtinguisherOptions}
                    options={[
                      { value: SKIP_VALUE, label: "Skip (optional)" },
                      ...extinguisherTypeOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                    ]}
                  />
                </div>
              )}

              {isFireExtinguisherService && currentStep === 4 && (
                <div className="space-y-2">
                  <Label>Select when last serviced</Label>
                  <OptionCardSelect
                    value={formData.extinguisherLastServiced}
                    onValueChange={(value) => handleOptionSelect("extinguisherLastServiced", value)}
                    loading={loadingExtinguisherOptions}
                    options={[
                      { value: SKIP_VALUE, label: "Skip (optional)" },
                      ...extinguisherLastServiceOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                    ]}
                  />
                </div>
              )}

              {isEmergencyLightingService && currentStep === 1 && (
                <div className="space-y-2">
                  <Label>Select number of emergency lights</Label>
                  <OptionCardSelect
                    value={formData.emergencyLightsCount}
                    onValueChange={(value) => handleOptionSelect("emergencyLightsCount", value)}
                    loading={loadingEmergencyOptions}
                    options={[
                      ...emergencyLightOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                      { value: CUSTOM_EMERGENCY_LIGHTS, label: QUESTIONNAIRE_OTHERS_LABEL },
                    ]}
                  />
                  {showCustomEmergencyLightsInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customEmergencyLightsCount">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                      <Input
                        id="customEmergencyLightsCount"
                        type="text"
                        inputMode="numeric"
                        value={formData.customEmergencyLightsCount}
                        onChange={(e) => updateFormData("customEmergencyLightsCount", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {isEmergencyLightingService && currentStep === 2 && (
                <div className="space-y-2">
                  <Label>Select number of floors</Label>
                  <OptionCardSelect
                    value={formData.emergencyFloors}
                    onValueChange={(value) => handleOptionSelect("emergencyFloors", value)}
                    loading={loadingEmergencyOptions}
                    options={emergencyFloorOptions.map((opt) => ({ value: String(opt.id), label: opt.value }))}
                  />
                </div>
              )}

              {isEmergencyLightingService && currentStep === 3 && (
                <div className="space-y-2">
                  <Label>Select lighting type</Label>
                  <OptionCardSelect
                    value={formData.emergencyLightType}
                    onValueChange={(value) => handleOptionSelect("emergencyLightType", value)}
                    loading={loadingEmergencyOptions}
                    options={[
                      { value: SKIP_VALUE, label: "Skip (optional)" },
                      ...emergencyLightTypeOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                    ]}
                  />
                </div>
              )}

              {isEmergencyLightingService && currentStep === 4 && (
                <div className="space-y-2">
                  <Label>Select test frequency</Label>
                  <OptionCardSelect
                    value={formData.emergencyLightTest}
                    onValueChange={(value) => handleOptionSelect("emergencyLightTest", value)}
                    loading={loadingEmergencyOptions}
                    options={[
                      { value: SKIP_VALUE, label: "Skip (optional)" },
                      ...emergencyLightTestOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                    ]}
                  />
                </div>
              )}

              {isFireMarshalTrainingService && currentStep === 1 && (
                <div className="space-y-2">
                  <Label>How many people need training?</Label>
                  <OptionCardSelect
                    value={formData.trainingPeopleCount}
                    onValueChange={(value) => handleOptionSelect("trainingPeopleCount", value)}
                    loading={loadingMarshalOptions}
                    options={[
                      ...marshalPeopleOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                      { value: CUSTOM_TRAINING_PEOPLE, label: QUESTIONNAIRE_OTHERS_LABEL },
                    ]}
                  />
                  {showCustomTrainingPeopleInput && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="customTrainingPeopleCount">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                      <Input
                        id="customTrainingPeopleCount"
                        type="text"
                        inputMode="numeric"
                        value={formData.customTrainingPeopleCount}
                        onChange={(e) => updateFormData("customTrainingPeopleCount", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {isFireMarshalTrainingService && currentStep === 2 && (
                <div className="space-y-2">
                  <Label>Where will training take place?</Label>
                  <OptionCardSelect
                    value={formData.trainingLocation}
                    onValueChange={(value) => handleOptionSelect("trainingLocation", value)}
                    loading={loadingMarshalOptions}
                    options={marshalPlaceOptions.map((opt) => ({ value: String(opt.id), label: opt.value }))}
                  />
                </div>
              )}

              {isFireMarshalTrainingService && currentStep === 3 && (
                <div className="space-y-2">
                  <Label>What type of building is it?</Label>
                  <OptionCardSelect
                    value={formData.buildingType}
                    onValueChange={(value) => handleOptionSelect("buildingType", value)}
                    loading={loadingMarshalOptions}
                    options={marshalBuildingOptions.map((opt) => ({ value: String(opt.id), label: opt.value }))}
                  />
                </div>
              )}

              {isFireMarshalTrainingService && currentStep === 4 && (
                <div className="space-y-2">
                  <Label>Has staff had fire training before?</Label>
                  <OptionCardSelect
                    value={formData.staffTrainingBefore}
                    onValueChange={(value) => handleOptionSelect("staffTrainingBefore", value)}
                    loading={loadingMarshalOptions}
                    options={[
                      { value: SKIP_VALUE, label: "Skip (optional)" },
                      ...marshalExperienceOptions.map((opt) => ({ value: String(opt.id), label: opt.value })),
                    ]}
                  />
                </div>
              )}

              {isFireSafetyConsultationService && currentStep === 1 && (
                <div className="space-y-2">
                  <Label>How would you like the consultation?</Label>
                  <OptionCardSelect
                    value={formData.consultationType}
                    onValueChange={(value) => handleOptionSelect("consultationType", value)}
                    loading={loadingConsultationOptions}
                    options={consultationModeOptions.map((opt) => ({ value: String(opt.id), label: opt.value }))}
                  />
                </div>
              )}

              {isFireSafetyConsultationService && currentStep === 2 && (
                <div className="space-y-2">
                  <Label>How many hours do you need?</Label>
                  <OptionCardSelect
                    value={formData.consultationHours}
                    onValueChange={(value) => handleOptionSelect("consultationHours", value)}
                    loading={loadingConsultationOptions}
                    options={consultationHourOptions.map((opt) => ({ value: String(opt.id), label: opt.value }))}
                  />
                </div>
              )}

              {(isFireRiskAssessmentService ||
                (!isFireAlarmService &&
                  !isFireExtinguisherService &&
                  !isEmergencyLightingService &&
                  !isFireMarshalTrainingService &&
                  !isFireSafetyConsultationService)) && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-2">
                      <Label>What type of property is it?</Label>
                      <OptionCardSelect
                        value={formData.propertyType}
                        onValueChange={(value) => handleOptionSelect("propertyType", value)}
                        loading={loadingFraOptions}
                        columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
                        options={propertyTypes.map((opt) => ({
                          value: String(opt.id),
                          label: isOtherPropertyTypeName(opt.property_type_name)
                            ? QUESTIONNAIRE_OTHERS_LABEL
                            : opt.property_type_name,
                          helper: isOtherPropertyTypeName(opt.property_type_name)
                            ? undefined
                            : opt.property_type_description,
                        }))}
                      />
                      {showCustomPropertyTypeInput && (
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="customPropertyType">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                          <Input
                            id="customPropertyType"
                            type="text"
                            placeholder="e.g. Mixed-use, Place of worship, Storage unit"
                            value={formData.customPropertyType}
                            onChange={(e) => updateFormData("customPropertyType", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {currentStep === 2 && (
                    <div className="space-y-2">
                      <Label>How many people use the building?</Label>
                      <OptionCardSelect
                        value={formData.approximatePeople}
                        onValueChange={(value) => handleOptionSelect("approximatePeople", value)}
                        loading={loadingFraOptions}
                        options={sortedApproximatePeopleOptions.map((opt) => ({
                          value: String(opt.id),
                          label: formatPeopleOptionLabel(opt.number_of_people),
                        }))}
                      />
                      {showCustomPeopleInput && (
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="customApproximatePeople">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                          <Input
                            id="customApproximatePeople"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 120, 250, 500"
                            value={formData.customApproximatePeople}
                            onChange={(e) => updateFormData("customApproximatePeople", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {currentStep === 3 && (
                    <div className="space-y-2">
                      <Label>How many floors does the building have?</Label>
                      <OptionCardSelect
                        value={formData.numberOfFloors}
                        onValueChange={(value) => handleOptionSelect("numberOfFloors", value)}
                        loading={loadingFraOptions}
                        options={[
                          ...floorOptions.map((opt) => ({
                            value: String(opt.id ?? opt.floor),
                            label: isFloorCustomQuoteOption(opt)
                              ? QUESTIONNAIRE_OTHERS_LABEL
                              : (opt.label ?? opt.floor),
                          })),
                          ...(hasApiCustomFloorOption
                            ? []
                            : [{ value: CUSTOM_FLOORS, label: QUESTIONNAIRE_OTHERS_LABEL }]),
                        ]}
                      />
                      {showCustomFloorsInput && (
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="customFloors">{QUESTIONNAIRE_OTHERS_LABEL}</Label>
                          <Input
                            id="customFloors"
                            type="text"
                            inputMode="numeric"
                            value={formData.customFloors}
                            onChange={(e) => updateFormData("customFloors", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {currentStep === 4 && (
                    <div className="space-y-2">
                      <Label>When do you need it?</Label>
                      <OptionCardSelect
                        value={formData.duration}
                        onValueChange={(value) => handleOptionSelect("duration", value)}
                        loading={loadingFraOptions}
                        options={durationOptions.map((opt) => ({
                          value: String(opt.id),
                          label: opt.duration,
                        }))}
                      />
                    </div>
                  )}
                </>
              )}

              {currentStep === assessmentStep && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="assessmentDate">Select preferred date</Label>
                    <Input
                      id="assessmentDate"
                      type="date"
                      value={formData.assessmentDate}
                      onChange={(e) => handleAssessmentDateChange(e.target.value)}
                      className="text-lg"
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-sm text-gray-500">
                      We&apos;ll show you available professionals for this date
                    </p>
                  </div>
                </div>
              )}

              {currentStep === accessNotesStep && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="accessNotes">Optional notes for the assessor</Label>
                    <Textarea
                      id="accessNotes"
                      placeholder="e.g., Gate code required, parking available, building under construction..."
                      value={formData.accessNotes}
                      onChange={(e) => updateFormData("accessNotes", e.target.value)}
                      className="min-h-[150px] text-base"
                    />
                    <p className="text-sm text-gray-500">
                      This helps the professional prepare for the visit (optional)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </QuestionnaireStepShell>

          <div className="mt-6 flex justify-start">
            <Button type="button" variant="ghost" onClick={onBack} className="gap-2 text-gray-600">
              <ChevronLeft className="h-4 w-4" />
              Back to services
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
