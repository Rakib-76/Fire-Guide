import { publicAssetUrl } from "./publicAssetUrl";

export type ServiceCardTheme = {
  key: string;
  panelGradient: string;
  accent: string;
  arrowColor: string;
  hoverBorder: string;
  imageSrc: string;
};

function theme(
  partial: Omit<ServiceCardTheme, "imageSrc"> & { imageFile: string }
): ServiceCardTheme {
  return {
    ...partial,
    imageSrc: publicAssetUrl(`images/services/${partial.imageFile}`),
  };
}

const THEMES: Record<string, ServiceCardTheme> = {
  fra: theme({
    key: "fra",
    panelGradient:
      "radial-gradient(circle at 50% 45%, #ff6b6b 0%, #ef4444 38%, #dc2626 68%, #b91c1c 100%)",
    accent: "#dc2626",
    arrowColor: "#dc2626",
    hoverBorder: "#dc2626",
    imageFile: "FRA.png",
  }),
  alarm: theme({
    key: "alarm",
    panelGradient: "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
    accent: "#2563eb",
    arrowColor: "#2563eb",
    hoverBorder: "#2563eb",
    imageFile: "Alarm.png",
  }),
  extinguisher: theme({
    key: "extinguisher",
    panelGradient: "linear-gradient(180deg, #4ade80 0%, #16a34a 100%)",
    accent: "#16a34a",
    arrowColor: "#16a34a",
    hoverBorder: "#16a34a",
    imageFile: "Extinguisher.png",
  }),
  lighting: theme({
    key: "lighting",
    panelGradient: "linear-gradient(180deg, #c084fc 0%, #9333ea 100%)",
    accent: "#9333ea",
    arrowColor: "#9333ea",
    hoverBorder: "#9333ea",
    imageFile: "Light.png",
  }),
  marshal: theme({
    key: "marshal",
    panelGradient: "linear-gradient(180deg, #fb923c 0%, #ea580c 100%)",
    accent: "#ea580c",
    arrowColor: "#ea580c",
    hoverBorder: "#ea580c",
    imageFile: "Training.png",
  }),
  consultation: theme({
    key: "consultation",
    panelGradient: "linear-gradient(180deg, #2dd4bf 0%, #0d9488 100%)",
    accent: "#0d9488",
    arrowColor: "#0d9488",
    hoverBorder: "#0d9488",
    imageFile: "Consultation.png",
  }),
};

const DEFAULT_THEME = THEMES.fra;

export function getServiceCardTheme(serviceName: string | undefined): ServiceCardTheme {
  const n = (serviceName ?? "").toLowerCase();
  if (n.includes("consultation")) return THEMES.consultation;
  if (n.includes("marshal") || n.includes("warden")) return THEMES.marshal;
  if (n.includes("emergency lighting") || n.includes("lighting test")) return THEMES.lighting;
  if (n.includes("extinguisher")) return THEMES.extinguisher;
  if (n.includes("alarm")) return THEMES.alarm;
  if (n.includes("risk assessment")) return THEMES.fra;
  return DEFAULT_THEME;
}

export const FRA_ICON_FALLBACK = publicAssetUrl("images/services/fra-icon.png");
