import heroPhotoFra from "figma:asset/189ec7e3689608dad914f59dd7c02d25da91583d.png";
import heroPhotoAlarm from "figma:asset/4a602fcb2197368c8ba48f35530a0c308f2262bb.png";
import heroPhotoExtinguisher from "figma:asset/6d3b45bdbd70d604c743717e8996da118e1d2ab9.png";
import heroPhotoLighting from "figma:asset/480b0c0a77e9ab632fe90d62f30d6330c18adff5.png";
import heroPhotoTraining from "figma:asset/dcc0d6fdc32b7d65870a8a7a4cf0cb3e7dad77d5.png";
import heroPhotoConsultation from "figma:asset/9f9a1b825f2bba8823c5d3f17dd17fcac7ef3c43.png";
import heroPhotoDefault from "figma:asset/06f1b3e41c2783f18bdafecd74ab9e64333871d6.png";
import { getServiceCardTheme } from "./serviceCardTheme";

export type ServiceDetailHeroBackdrop = {
  photoSrc: string;
  serviceImageSrc: string;
  accent: string;
  accentGlow: string;
};

const PHOTO_BY_THEME_KEY: Record<string, string> = {
  fra: heroPhotoFra,
  alarm: heroPhotoAlarm,
  extinguisher: heroPhotoExtinguisher,
  lighting: heroPhotoLighting,
  marshal: heroPhotoTraining,
  consultation: heroPhotoConsultation,
};

function accentToGlow(accent: string): string {
  const hex = accent.replace("#", "");
  if (hex.length !== 6) return "rgba(220, 38, 38, 0.18)";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.22)`;
}

export function getServiceDetailHeroBackdrop(serviceName: string): ServiceDetailHeroBackdrop {
  const theme = getServiceCardTheme(serviceName);
  const photoSrc = PHOTO_BY_THEME_KEY[theme.key] ?? heroPhotoDefault;

  return {
    photoSrc,
    serviceImageSrc: theme.imageSrc,
    accent: theme.accent,
    accentGlow: accentToGlow(theme.accent),
  };
}
