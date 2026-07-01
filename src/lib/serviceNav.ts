import type { ServiceResponse } from "../api/servicesService";
import { formatServiceFromPrice } from "../api/servicesService";

export type NavServiceColor = "red" | "blue" | "green" | "purple" | "orange";

export type NavService = {
  id: number;
  name: string;
  price: string;
  color: NavServiceColor;
  type?: string;
};

const COLOR_OPTIONS: NavServiceColor[] = ["red", "blue", "green", "purple", "orange"];

const SERVICE_ORDER: Record<string, number> = {
  "fire risk assessment": 1,
  "fire alarm": 2,
  "fire extinguisher": 3,
  "emergency lighting": 4,
  warden: 5,
  marshal: 5,
  "fire safety consultation": 6,
};

function getServiceSortOrder(name: string | undefined): number {
  const lower = name?.toLowerCase() ?? "";
  for (const [key, value] of Object.entries(SERVICE_ORDER)) {
    if (lower.includes(key)) return value;
  }
  return 99;
}

export function sortActiveServices(apiServices: ServiceResponse[]): ServiceResponse[] {
  return apiServices
    .filter((service) => service.status?.toUpperCase() === "ACTIVE")
    .sort((a, b) => getServiceSortOrder(a.service_name) - getServiceSortOrder(b.service_name));
}

export function mapApiServiceToNavService(apiService: ServiceResponse, index = 0): NavService {
  return {
    id: apiService.id,
    name: apiService.service_name || "Service",
    price: formatServiceFromPrice(apiService),
    color: COLOR_OPTIONS[index % COLOR_OPTIONS.length],
    type: apiService.type,
  };
}

export function formatNavServicePrice(price: string): string {
  return price.replace(/\.00$/, "");
}

/** Stable theme colour per service name (matches landing / nav card palette). */
export function getServiceColorForName(serviceName: string): NavServiceColor {
  const n = serviceName.toLowerCase();
  if (n.includes("consultation")) return "orange";
  if (n.includes("marshal") || n.includes("warden")) return "orange";
  if (n.includes("emergency lighting") || n.includes("lighting test")) return "purple";
  if (n.includes("extinguisher")) return "green";
  if (n.includes("alarm")) return "blue";
  if (n.includes("risk assessment")) return "red";
  return "red";
}
