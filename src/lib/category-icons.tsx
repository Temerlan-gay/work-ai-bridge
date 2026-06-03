import {
  Code,
  Palette,
  Megaphone,
  FileText,
  Film,
  Languages,
  Camera,
  Music,
  Sparkles,
  LayoutTemplate,
  Server,
  Smartphone,
  PenTool,
  Layers,
  Share2,
  Play,
  Bug,
  Cloud,
  BarChart3,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Programming: Code,
  Design: Palette,
  Marketing: Megaphone,
  Copywriting: FileText,
  "Video editing": Film,
  Translation: Languages,
  Photography: Camera,
  "Music & Audio": Music,
  Other: Sparkles,
};

const SPECIALIZATION_ICON_MAP: Record<string, LucideIcon> = {
  "Fullstack Developer": Code,
  "Frontend Developer": LayoutTemplate,
  "Backend Developer": Server,
  "Mobile Developer": Smartphone,
  "UI/UX Designer": Palette,
  "Graphic Designer": PenTool,
  "Product Designer": Layers,
  Marketer: Megaphone,
  "SMM Manager": Share2,
  Copywriter: FileText,
  "Video Editor": Film,
  "Motion Designer": Play,
  Translator: Languages,
  Photographer: Camera,
  "QA Engineer": Bug,
  "DevOps Engineer": Cloud,
  "Data Analyst": BarChart3,
  "Project Manager": Users,
  Other: Sparkles,
};

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICON_MAP[name] ?? Sparkles;
}

export function getSpecializationIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Sparkles;
  return SPECIALIZATION_ICON_MAP[name] ?? Sparkles;
}
