export type ServiceQuestionnaireFlags = {
  isFireAlarmService: boolean;
  isFireExtinguisherService: boolean;
  isEmergencyLightingService: boolean;
  isFireMarshalTrainingService: boolean;
  isFireSafetyConsultationService: boolean;
  isFireRiskAssessmentService: boolean;
};

export function detectServiceQuestionnaireFlags(
  name: string,
  serviceId: number
): ServiceQuestionnaireFlags {
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
