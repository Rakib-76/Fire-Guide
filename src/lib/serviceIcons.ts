import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ClipboardCheck,
  DoorOpen,
  FireExtinguisher,
  GraduationCap,
  Lightbulb,
  MessageSquare,
} from "lucide-react";

/**
 * Icons by service name (and API type fallback). Order: most specific phrases first.
 */
export function getLucideIconForService(
  serviceName: string | undefined,
  serviceType: string | undefined
): LucideIcon {
  const n = (serviceName ?? "").toLowerCase().trim();

  if (n.includes("consultation")) return MessageSquare;
  if (n.includes("marshal") || n.includes("warden")) return GraduationCap;
  if (n.includes("emergency lighting") || n.includes("lighting test")) return Lightbulb;
  if (n.includes("fire door") || (n.includes("door") && n.includes("inspection"))) return DoorOpen;
  if (n.includes("extinguisher")) return FireExtinguisher;
  if (n.includes("alarm")) return Bell;
  if (n.includes("risk assessment")) return ClipboardCheck;

  const t = (serviceType ?? "").toUpperCase();
  if (t.includes("CONSULTATION")) return MessageSquare;
  if (t.includes("TRAINING") || t.includes("MARSHAL") || t.includes("WARDEN")) return GraduationCap;
  if (t.includes("LIGHTING")) return Lightbulb;
  if (t.includes("DOOR")) return DoorOpen;
  if (t.includes("EXTINGUISHER") || t.includes("DELIVERY")) return FireExtinguisher;
  if (t.includes("ALARM")) return Bell;
  if (t.includes("ASSESSMENT")) return ClipboardCheck;

  return ClipboardCheck;
}
