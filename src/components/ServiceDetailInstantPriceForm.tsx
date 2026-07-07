import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { getApiToken } from "../lib/auth";
import { detectServiceQuestionnaireFlags } from "../lib/serviceQuestionnaire";
import {
  convertRadiusToKm,
  filterProfessionalsByQuestionnaire,
  milesFromRadiusSelection,
  type LocationSearchData,
} from "../lib/filterProfessionalsByQuestionnaire";
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
  type FilterProfessionalForFraItem,
} from "../api/servicesService";

type SelectOption = { value: string; label: string };

type InstantPriceField = {
  key: string;
  label: string;
  options: SelectOption[];
};

const SKIP_VALUE = "__skip__";

export type ServiceDetailInstantPriceResult = {
  questionnaireData: Record<string, unknown>;
  locationData: LocationSearchData;
  professionals: FilterProfessionalForFraItem[];
};

interface ServiceDetailInstantPriceFormProps {
  serviceId: number;
  serviceName: string;
  disabled?: boolean;
  variant?: "sidebar" | "hero";
  idPrefix?: string;
  onSubmit: (result: ServiceDetailInstantPriceResult) => void;
}

const DEFAULT_RADIUS = "10mi";

function optionLabel(options: { id: number; value: string }[], value: string): string {
  const match = options.find((o) => String(o.id) === value);
  return match?.value?.trim() ?? "";
}

function mapToSelectOptions(
  items: Array<{ id?: number; label?: string; value?: string; floor?: string; number_of_people?: string; duration?: string }>,
  labelKey: "label" | "value" | "floor" | "number_of_people" | "duration" = "label"
): SelectOption[] {
  return items
    .map((item) => {
      const id = item.id;
      if (id == null) return null;
      let label = "";
      if (labelKey === "number_of_people" && item.number_of_people) {
        label = formatPeopleOptionLabel(item.number_of_people);
      } else if (labelKey === "duration" && item.duration) {
        label = item.duration;
      } else if (labelKey === "floor") {
        label = (item.label ?? item.floor ?? "").trim();
      } else {
        label = (item.label ?? item.value ?? "").trim();
      }
      if (!label) return null;
      return { value: String(id), label };
    })
    .filter((item): item is SelectOption => item != null);
}

function mapFireAlarmOptions(items: FireAlarmOptionItem[]): SelectOption[] {
  return items
    .map((item) => {
      const id = item.id;
      const label = (item.value ?? item.label ?? "").trim();
      if (id == null || !label) return null;
      return { value: String(id), label };
    })
    .filter((item): item is SelectOption => item != null);
}

function mapServiceOptions(items: ExtinguisherServiceOptionItem[] | EmergencyLightServiceOptionItem[] | MarshalServiceOptionItem[] | ConsultationOptionItem[]): SelectOption[] {
  return items
    .map((item) => {
      const id = item.id;
      const label = (item.value ?? item.label ?? "").trim();
      if (id == null || !label) return null;
      return { value: String(id), label };
    })
    .filter((item): item is SelectOption => item != null);
}

function mapPropertyTypes(items: PropertyTypeResponse[]): SelectOption[] {
  return items
    .map((item) => ({
      value: String(item.id),
      label: item.property_type_name.trim(),
    }))
    .filter((item) => item.label.length > 0);
}

export function ServiceDetailInstantPriceForm({
  serviceId,
  serviceName,
  disabled,
  variant = "sidebar",
  idPrefix = "service-detail",
  onSubmit,
}: ServiceDetailInstantPriceFormProps) {
  const isHeroVariant = variant === "hero";
  const submitLabel = isHeroVariant ? "Get Instant Price" : "See Instant Price";
  const flags = useMemo(
    () => detectServiceQuestionnaireFlags(serviceName, serviceId),
    [serviceName, serviceId]
  );
  const apiToken = getApiToken();

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [postcode, setPostcode] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<InstantPriceField[]>([]);

  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeResponse[]>([]);
  const [approximatePeopleOptions, setApproximatePeopleOptions] = useState<ApproximatePeopleResponse[]>([]);
  const [floorOptions, setFloorOptions] = useState<FloorPricingItem[]>([]);
  const [durationOptions, setDurationOptions] = useState<FraDurationItem[]>([]);
  const [fireAlarmDetectors, setFireAlarmDetectors] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmCallPoints, setFireAlarmCallPoints] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmFloors, setFireAlarmFloors] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmPanels, setFireAlarmPanels] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmSystemTypes, setFireAlarmSystemTypes] = useState<FireAlarmOptionItem[]>([]);
  const [fireAlarmLastServiceOptions, setFireAlarmLastServiceOptions] = useState<FireAlarmOptionItem[]>([]);
  const [extinguisherCounts, setExtinguisherCounts] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherFloors, setExtinguisherFloors] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherTypeOptions, setExtinguisherTypeOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [extinguisherLastServiceOptions, setExtinguisherLastServiceOptions] = useState<ExtinguisherServiceOptionItem[]>([]);
  const [emergencyLightCounts, setEmergencyLightCounts] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyFloors, setEmergencyFloors] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyLightTypeOptions, setEmergencyLightTypeOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [emergencyLightTestOptions, setEmergencyLightTestOptions] = useState<EmergencyLightServiceOptionItem[]>([]);
  const [marshalPeople, setMarshalPeople] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalBuildings, setMarshalBuildings] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalPlaceOptions, setMarshalPlaceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [marshalExperienceOptions, setMarshalExperienceOptions] = useState<MarshalServiceOptionItem[]>([]);
  const [consultationModes, setConsultationModes] = useState<ConsultationOptionItem[]>([]);
  const [consultationHours, setConsultationHours] = useState<ConsultationOptionItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const minPreferredDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    setPostcode("");
    setPreferredDate("");
    setAccessNotes("");
    setFieldValues({});
    setPriceError(null);
  }, [serviceId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingOptions(true);
      try {
        if (flags.isFireAlarmService) {
          const token = apiToken ?? null;
          const [detectors, callPoints, floors, panels, systemTypes, lastService] = await Promise.all([
            fetchFireAlarmOptions(token, "ditectors"),
            fetchFireAlarmOptions(token, "call_points"),
            fetchFireAlarmOptions(token, "floors"),
            fetchFireAlarmOptions(token, "alarm_panels"),
            fetchFireAlarmOptions(token, "system_type"),
            fetchFireAlarmOptions(token, "last_service"),
          ]);
          if (cancelled) return;
          setFireAlarmDetectors(detectors);
          setFireAlarmCallPoints(callPoints);
          setFireAlarmFloors(floors);
          setFireAlarmPanels(panels);
          setFireAlarmSystemTypes(systemTypes);
          setFireAlarmLastServiceOptions(lastService);
          const lastServiceOptions: SelectOption[] = [
            { value: SKIP_VALUE, label: "Skip (optional)" },
            ...mapFireAlarmOptions(lastService),
          ];
          setFields([
            { key: "fireAlarmDetectors", label: "Smoke / heat detectors", options: mapFireAlarmOptions(detectors) },
            { key: "fireAlarmCallPoints", label: "Manual call points", options: mapFireAlarmOptions(callPoints) },
            { key: "fireAlarmFloors", label: "Number of floors", options: mapFireAlarmOptions(floors) },
            { key: "fireAlarmPanels", label: "Fire alarm panels", options: mapFireAlarmOptions(panels) },
            {
              key: "alarmSystemType",
              label: "What type of fire alarm system?",
              options: mapFireAlarmOptions(systemTypes),
            },
            {
              key: "lastServiced",
              label: "When was it last serviced?",
              options: lastServiceOptions,
            },
          ]);
        } else if (flags.isFireExtinguisherService) {
          const token = apiToken ?? "";
          const [extinguishers, floors, types, lastService] = await Promise.all([
            fetchExtinguisherServiceOptions(token, "extinguisher"),
            fetchExtinguisherServiceOptions(token, "floor"),
            fetchExtinguisherServiceOptions(token, "metarials"),
            fetchExtinguisherServiceOptions(token, "last_service"),
          ]);
          if (cancelled) return;
          setExtinguisherCounts(extinguishers);
          setExtinguisherFloors(floors);
          setExtinguisherTypeOptions(types);
          setExtinguisherLastServiceOptions(lastService);
          const optionalWithSkip = (options: SelectOption[]): SelectOption[] => [
            { value: SKIP_VALUE, label: "Skip (optional)" },
            ...options,
          ];
          setFields([
            { key: "extinguisherCount", label: "Number of extinguishers", options: mapServiceOptions(extinguishers) },
            { key: "extinguisherFloors", label: "Number of floors", options: mapServiceOptions(floors) },
            {
              key: "extinguisherTypeId",
              label: "What types of extinguishers?",
              options: optionalWithSkip(mapServiceOptions(types)),
            },
            {
              key: "extinguisherLastServiced",
              label: "When were they last serviced?",
              options: optionalWithSkip(mapServiceOptions(lastService)),
            },
          ]);
        } else if (flags.isEmergencyLightingService) {
          const [lights, floors, lightTypes, lightTests] = await Promise.all([
            fetchEmergencyLightOptions("light"),
            fetchEmergencyLightOptions("floor"),
            fetchEmergencyLightOptions("light_type"),
            fetchEmergencyLightOptions("light_test"),
          ]);
          if (cancelled) return;
          setEmergencyLightCounts(lights);
          setEmergencyFloors(floors);
          setEmergencyLightTypeOptions(lightTypes);
          setEmergencyLightTestOptions(lightTests);
          const optionalWithSkip = (options: SelectOption[]): SelectOption[] => [
            { value: SKIP_VALUE, label: "Skip (optional)" },
            ...options,
          ];
          setFields([
            { key: "emergencyLightsCount", label: "Emergency lights", options: mapServiceOptions(lights) },
            { key: "emergencyFloors", label: "Number of floors", options: mapServiceOptions(floors) },
            {
              key: "emergencyLightType",
              label: "What type of emergency lighting? (optional)",
              options: optionalWithSkip(mapServiceOptions(lightTypes)),
            },
            {
              key: "emergencyLightTest",
              label: "How often are lights tested? (optional)",
              options: optionalWithSkip(mapServiceOptions(lightTests)),
            },
          ]);
        } else if (flags.isFireMarshalTrainingService) {
          const token = apiToken ?? "";
          const [people, places, buildings, experience] = await Promise.all([
            fetchMarshalOptions(token, "people"),
            fetchMarshalOptions(token, "training_place"),
            fetchMarshalOptions(token, "building_type"),
            fetchMarshalOptions(token, "experience"),
          ]);
          if (cancelled) return;
          setMarshalPeople(people);
          setMarshalPlaceOptions(places);
          setMarshalBuildings(buildings);
          setMarshalExperienceOptions(experience);
          const optionalWithSkip = (options: SelectOption[]): SelectOption[] => [
            { value: SKIP_VALUE, label: "Skip (optional)" },
            ...options,
          ];
          setFields([
            {
              key: "trainingPeopleCount",
              label: "How many people need training?",
              options: mapServiceOptions(people),
            },
            {
              key: "trainingLocation",
              label: "Where will training take place?",
              options: mapServiceOptions(places),
            },
            {
              key: "buildingType",
              label: "What type of building is it?",
              options: mapServiceOptions(buildings),
            },
            {
              key: "staffTrainingBefore",
              label: "Has staff had fire training before? (optional)",
              options: optionalWithSkip(mapServiceOptions(experience)),
            },
          ]);
        } else if (flags.isFireSafetyConsultationService) {
          const token = apiToken ?? "";
          const [modes, hours] = await Promise.all([
            fetchFireConsultationOptions(token, "mode"),
            fetchFireConsultationOptions(token, "hour"),
          ]);
          if (cancelled) return;
          setConsultationModes(modes);
          setConsultationHours(hours);
          setFields([
            { key: "consultationType", label: "Consultation type", options: mapServiceOptions(modes) },
            { key: "consultationHours", label: "Consultation hours", options: mapServiceOptions(hours) },
          ]);
        } else {
          const [types, people, floors, durations] = await Promise.all([
            fetchPropertyTypes(),
            fetchApproximatePeople(),
            fetchFloorPricing(),
            fetchFraDurations(),
          ]);
          if (cancelled) return;
          const sortedPeople = [...people].sort(
            (a, b) => getPeopleOptionSortKey(a.number_of_people) - getPeopleOptionSortKey(b.number_of_people)
          );
          setPropertyTypes(types);
          setApproximatePeopleOptions(sortedPeople);
          setFloorOptions(floors);
          setDurationOptions(durations);
          setFields([
            { key: "propertyType", label: "Property type", options: mapPropertyTypes(types) },
            {
              key: "approximatePeople",
              label: "Building occupancy",
              options: mapToSelectOptions(sortedPeople, "number_of_people"),
            },
            { key: "numberOfFloors", label: "Number of floors", options: mapToSelectOptions(floors, "floor") },
            {
              key: "duration",
              label: "When do you need it?",
              options: mapToSelectOptions(durations, "duration"),
            },
          ]);
        }
      } catch {
        if (!cancelled) setFields([]);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [flags, apiToken]);

  useEffect(() => {
    if (!fields.length) return;
    setFieldValues((prev) => {
      const next = { ...prev };
      for (const field of fields) {
        if (!next[field.key] && field.options[0]) {
          next[field.key] = field.options[0].value;
        }
      }
      return next;
    });
  }, [fields]);

  const buildQuestionnairePayload = useCallback((): Record<string, unknown> | null => {
    const preferred_date = preferredDate.trim();
    const access_note = accessNotes.trim();

    if (flags.isFireAlarmService) {
      const detectors = fieldValues.fireAlarmDetectors;
      const callPoints = fieldValues.fireAlarmCallPoints;
      const floors = fieldValues.fireAlarmFloors;
      const panels = fieldValues.fireAlarmPanels;
      const systemType = fieldValues.alarmSystemType;
      const lastServiced = fieldValues.lastServiced;
      if (!detectors || !callPoints || !floors || !panels || !systemType || !lastServiced) return null;

      const systemLabel = optionLabel(
        fireAlarmSystemTypes.map((o) => ({ id: o.id, value: o.value })),
        systemType
      );
      const lastServiceLabel =
        lastServiced === SKIP_VALUE
          ? ""
          : optionLabel(
              fireAlarmLastServiceOptions.map((o) => ({ id: o.id, value: o.value })),
              lastServiced
            );

      return {
        is_fire_alarm: true,
        fire_alarm_smoke_detector_id: parseInt(detectors, 10) || 0,
        fire_alarm_call_point_id: parseInt(callPoints, 10) || 0,
        fire_alarm_floor_id: parseInt(floors, 10) || 0,
        fire_alarm_panel_id: parseInt(panels, 10) || 0,
        fire_alarm_system_type_id: parseInt(systemType, 10) || 0,
        ...(lastServiced && lastServiced !== SKIP_VALUE
          ? { fire_alarm_last_service_id: parseInt(lastServiced, 10) || undefined }
          : {}),
        preferred_date,
        access_note: access_note || undefined,
        detector_count: optionLabel(
          fireAlarmDetectors.map((o) => ({ id: o.id, value: o.value })),
          detectors
        ),
        manual_call_points_count: optionLabel(
          fireAlarmCallPoints.map((o) => ({ id: o.id, value: o.value })),
          callPoints
        ),
        number_of_floors: optionLabel(
          fireAlarmFloors.map((o) => ({ id: o.id, value: o.value })),
          floors
        ),
        fire_alarm_panels_count: optionLabel(
          fireAlarmPanels.map((o) => ({ id: o.id, value: o.value })),
          panels
        ),
        alarm_system_type: systemLabel,
        last_serviced: lastServiceLabel,
      };
    }

    if (flags.isFireExtinguisherService) {
      const count = fieldValues.extinguisherCount;
      const floors = fieldValues.extinguisherFloors;
      const typeId = fieldValues.extinguisherTypeId;
      const lastServiced = fieldValues.extinguisherLastServiced;
      if (!count || !floors || !typeId || !lastServiced) return null;

      const typeLabel =
        typeId === SKIP_VALUE
          ? ""
          : optionLabel(
              extinguisherTypeOptions.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
              typeId
            );
      const lastServiceLabel =
        lastServiced === SKIP_VALUE
          ? ""
          : optionLabel(
              extinguisherLastServiceOptions.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
              lastServiced
            );

      return {
        is_fire_extinguisher: true,
        extinguisher_id: parseInt(count, 10) || 0,
        floor_id: parseInt(floors, 10) || 0,
        ...(typeId && typeId !== SKIP_VALUE
          ? { type_id: parseInt(typeId, 10) || undefined }
          : {}),
        ...(lastServiced && lastServiced !== SKIP_VALUE
          ? { last_service_id: parseInt(lastServiced, 10) || undefined }
          : {}),
        preferred_date,
        access_note: access_note || undefined,
        extinguisher_count: optionLabel(
          extinguisherCounts.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          count
        ),
        number_of_floors: optionLabel(
          extinguisherFloors.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          floors
        ),
        extinguisher_type: typeLabel,
        last_serviced: lastServiceLabel,
      };
    }

    if (flags.isEmergencyLightingService) {
      const lights = fieldValues.emergencyLightsCount;
      const floors = fieldValues.emergencyFloors;
      const lightType = fieldValues.emergencyLightType;
      const lightTest = fieldValues.emergencyLightTest;
      if (!lights || !floors || !lightType || !lightTest) return null;

      const typeLabel =
        lightType === SKIP_VALUE
          ? ""
          : optionLabel(
              emergencyLightTypeOptions.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
              lightType
            );
      const testLabel =
        lightTest === SKIP_VALUE
          ? ""
          : optionLabel(
              emergencyLightTestOptions.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
              lightTest
            );
      const lightTypeId =
        lightType && lightType !== SKIP_VALUE ? parseInt(lightType, 10) || null : null;
      const lightTestId =
        lightTest && lightTest !== SKIP_VALUE ? parseInt(lightTest, 10) || null : null;

      return {
        emergency_light_id: parseInt(lights, 10) || 1,
        emergency_floor_id: parseInt(floors, 10) || 1,
        emergency_light_type_id: lightTypeId,
        emergency_light_test_id: lightTestId,
        preferred_date,
        access_note: access_note || undefined,
        emergency_lights_count: optionLabel(
          emergencyLightCounts.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          lights
        ),
        number_of_floors: optionLabel(
          emergencyFloors.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          floors
        ),
        request_data: {
          emergency_light_type_id: lightTypeId,
          emergency_light_test_id: lightTestId,
        },
        ...(typeLabel ? { emergency_light_type: typeLabel } : {}),
        ...(testLabel ? { emergency_light_test: testLabel } : {}),
      };
    }

    if (flags.isFireMarshalTrainingService) {
      const people = fieldValues.trainingPeopleCount;
      const location = fieldValues.trainingLocation;
      const building = fieldValues.buildingType;
      const staffTraining = fieldValues.staffTrainingBefore;
      if (!people || !location || !building || !staffTraining) return null;

      const experienceId =
        staffTraining && staffTraining !== SKIP_VALUE
          ? parseInt(staffTraining, 10) || null
          : null;
      const staffTrainingLabel =
        staffTraining === SKIP_VALUE
          ? ""
          : optionLabel(
              marshalExperienceOptions.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
              staffTraining
            );

      return {
        people_id: parseInt(people, 10) || 1,
        place_id: parseInt(location, 10) || 1,
        building_type_id: parseInt(building, 10) || 1,
        experience_id: experienceId,
        preferred_date,
        access_note: access_note || undefined,
        training_people_count: optionLabel(
          marshalPeople.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          people
        ),
        training_location: optionLabel(
          marshalPlaceOptions.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          location
        ),
        building_type: optionLabel(
          marshalBuildings.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          building
        ),
        staff_training_before: staffTrainingLabel,
        request_data: {
          people_id: parseInt(people, 10) || 1,
          place_id: parseInt(location, 10) || 1,
          building_type_id: parseInt(building, 10) || 1,
          experience_id: experienceId,
        },
      };
    }

    if (flags.isFireSafetyConsultationService) {
      const mode = fieldValues.consultationType;
      const hours = fieldValues.consultationHours;
      if (!mode || !hours) return null;
      return {
        mode_id: parseInt(mode, 10) || 1,
        hour_id: parseInt(hours, 10) || 1,
        preferred_date,
        access_note: access_note || undefined,
        consultation_type: optionLabel(
          consultationModes.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          mode
        ),
        consultation_hours: optionLabel(
          consultationHours.map((o) => ({ id: o.id, value: o.value ?? o.label ?? "" })),
          hours
        ),
        request_data: {
          mode_id: parseInt(mode, 10) || 1,
          hour_id: parseInt(hours, 10) || 1,
        },
      };
    }

    const propertyType = fieldValues.propertyType;
    const people = fieldValues.approximatePeople;
    const floors = fieldValues.numberOfFloors;
    const duration = fieldValues.duration;
    if (!propertyType || !people || !floors || !duration) return null;

    const floorId = parseInt(floors, 10);
    const durationId = parseInt(duration, 10);

    return {
      property_type_id: parseInt(propertyType, 10) || 0,
      approximate_people_id: parseInt(people, 10) || 0,
      number_of_floors: String(floorId || floors),
      ...(floorId > 0 ? { number_of_floors_id: floorId } : {}),
      duration_id: durationId > 0 ? durationId : Number(durationOptions[0]?.id ?? 2),
      preferred_date,
      access_note: access_note || undefined,
      property_type_label: optionLabel(
        propertyTypes.map((p) => ({ id: p.id, value: p.property_type_name })),
        propertyType
      ),
      approximate_people_label: optionLabel(
        approximatePeopleOptions.map((p) => ({ id: p.id, value: p.number_of_people })),
        people
      ),
      fra_assessment_type: optionLabel(
        durationOptions.map((d) => ({ id: d.id, value: d.duration })),
        duration
      ),
      service_id: serviceId,
      service_name: serviceName,
    };
  }, [
    approximatePeopleOptions,
    consultationHours,
    consultationModes,
    durationOptions,
    emergencyFloors,
    emergencyLightCounts,
    emergencyLightTestOptions,
    emergencyLightTypeOptions,
    extinguisherCounts,
    extinguisherFloors,
    extinguisherLastServiceOptions,
    extinguisherTypeOptions,
    fieldValues,
    fireAlarmCallPoints,
    fireAlarmDetectors,
    fireAlarmFloors,
    fireAlarmLastServiceOptions,
    fireAlarmPanels,
    fireAlarmSystemTypes,
    flags,
    accessNotes,
    marshalBuildings,
    marshalExperienceOptions,
    marshalPeople,
    marshalPlaceOptions,
    preferredDate,
    propertyTypes,
    serviceId,
    serviceName,
  ]);

  const buildLocationData = useCallback((): LocationSearchData | null => {
    const trimmed = postcode.trim();
    if (!trimmed) return null;
    const miles = milesFromRadiusSelection(DEFAULT_RADIUS);
    return {
      post_code: trimmed,
      search_radius: convertRadiusToKm(DEFAULT_RADIUS),
      miles,
      service_id: serviceId,
    };
  }, [postcode, serviceId]);

  const isFormComplete = useMemo(() => {
    if (!postcode.trim() || !preferredDate.trim() || loadingOptions) return false;
    return fields.every((field) => Boolean(fieldValues[field.key]));
  }, [fieldValues, fields, loadingOptions, postcode, preferredDate]);

  const handleSubmit = async () => {
    const questionnaireData = buildQuestionnairePayload();
    const locationData = buildLocationData();
    if (!questionnaireData || !locationData) return;

    setSubmitting(true);
    setPriceError(null);
    try {
      const professionals = await filterProfessionalsByQuestionnaire({
        serviceId,
        questionnaireData,
        location: {
          post_code: locationData.post_code,
          miles: locationData.miles,
        },
      });
      onSubmit({
        questionnaireData: {
          ...questionnaireData,
          service_id: serviceId,
          service_name: serviceName,
        },
        locationData,
        professionals,
      });
    } catch {
      setPriceError("Could not find professionals. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside
      className={`service-detail-calculator${isHeroVariant ? " service-detail-calculator--hero" : ""}`}
      aria-label="Instant price calculator"
    >
      {!isHeroVariant ? (
        <h2 className="service-detail-calculator__title">Get an instant price</h2>
      ) : null}

      <div className="service-detail-calculator__field">
        <label className="service-detail-calculator__label" htmlFor={`${idPrefix}-postcode`}>
          Postcode
        </label>
        <input
          id={`${idPrefix}-postcode`}
          className="service-detail-calculator__input"
          type="text"
          placeholder="e.g. SW1A 1AA"
          value={postcode}
          onChange={(event) => setPostcode(event.target.value)}
          autoComplete="postal-code"
          disabled={disabled || loadingOptions}
        />
      </div>

      {loadingOptions ? (
        <div className="service-detail-calculator__loading">
          <Loader2 className="h-5 w-5 animate-spin text-red-600" aria-hidden />
          <span>Loading options…</span>
        </div>
      ) : (
        fields.map((field) => (
          <div key={field.key} className="service-detail-calculator__field">
            <label className="service-detail-calculator__label" htmlFor={`${idPrefix}-${field.key}`}>
              {field.label}
            </label>
            <select
              id={`${idPrefix}-${field.key}`}
              className="service-detail-calculator__select"
              value={fieldValues[field.key] ?? ""}
              onChange={(event) =>
                setFieldValues((prev) => ({ ...prev, [field.key]: event.target.value }))
              }
              disabled={disabled || field.options.length === 0}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))
      )}

      {!loadingOptions ? (
        <>
          <div className="service-detail-calculator__field">
            <label className="service-detail-calculator__label" htmlFor={`${idPrefix}-preferred-date`}>
              Select preferred date
            </label>
            <input
              id={`${idPrefix}-preferred-date`}
              className="service-detail-calculator__input"
              type="date"
              value={preferredDate}
              min={minPreferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              disabled={disabled}
            />
            {/* <p className="service-detail-calculator__hint">
              We&apos;ll show you available professionals for this date
            </p> */}
          </div>

          <div className="service-detail-calculator__field service-detail-calculator__field--full">
            <label className="service-detail-calculator__label" htmlFor={`${idPrefix}-access-notes`}>
              Optional notes for the assessor
            </label>
            <textarea
              id={`${idPrefix}-access-notes`}
              className="service-detail-calculator__textarea"
              placeholder="e.g., Gate code required, parking available, building under construction..."
              value={accessNotes}
              onChange={(event) => setAccessNotes(event.target.value)}
              rows={3}
              disabled={disabled}
            />
            <p className="service-detail-calculator__hint">
              This helps the professional prepare for the visit (optional)
            </p>
          </div>
        </>
      ) : null}

      {priceError ? <p className="service-detail-calculator__price-note">{priceError}</p> : null}

      <button
        type="button"
        className="service-detail-calculator__submit"
        disabled={disabled || loadingOptions || submitting || !isFormComplete}
        onClick={() => void handleSubmit()}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Finding prices…
          </>
        ) : (
          <>
            {submitLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <p className="service-detail-calculator__secure">
        <Lock className="service-detail-calculator__secure-icon" aria-hidden />
        Your details are 100% secure
      </p>
    </aside>
  );
}
