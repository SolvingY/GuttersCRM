import { Globe, Phone, Users, UserPlus, Building, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const leadSourceConfig: Record<string, { label: string; icon: LucideIcon; leadType: string }> = {
  internet: { label: "Internet/Website", icon: Globe, leadType: "internet" },
  phone_general: { label: "Phone - General", icon: Phone, leadType: "internet" },
  phone_canvasser: { label: "Phone - From Canvasser", icon: Users, leadType: "canvasser" },
  referral: { label: "Referral", icon: UserPlus, leadType: "internet" },
  walk_in: { label: "Walk-In", icon: Building, leadType: "internet" },
  other: { label: "Other", icon: HelpCircle, leadType: "internet" },
};

export const getLeadSourceIcon = (source: string): LucideIcon => {
  return leadSourceConfig[source]?.icon || Globe;
};

export const getLeadSourceLabel = (source: string): string => {
  return leadSourceConfig[source]?.label || source;
};
