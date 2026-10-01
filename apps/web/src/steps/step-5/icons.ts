/**
 * The icons of step 5 (onboarding-spec 3, step 5, and 2.5 "Icons": Lucide at stroke 1.5; the mockup's
 * glyphs redrawn from Lucide, onboarding-spec 6.2 "Icon glitches"). Decorative only: every option is
 * named by its words. The question gutter icons are drawn at 32px, the option icons at 24px (the
 * render test reads a drawing above 32px as unreadable pixels).
 */
import {
  BedDouble,
  Briefcase,
  Building2,
  CalendarDays,
  ChartColumn,
  Clock,
  Ellipsis,
  History,
  Hospital,
  House,
  ShoppingBag,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** The icon beside each question, by question id. */
export const QUESTION_ICONS: Readonly<Record<string, LucideIcon>> = {
  'q.building.type': Building2,
  'q.project.occupancy': Users,
  'q.project.operatingSchedule': Clock,
};

/** The icon of each option, by field key, then option key. */
export const OPTION_ICONS: Readonly<Record<string, Readonly<Record<string, LucideIcon>>>> = {
  'building.type': { hotel: BedDouble, office: Building2, retail: ShoppingBag, hospital: Hospital, residential: House, other: Ellipsis },
  'project.occupancy': { mostly_occupied: Users, mixed: ChartColumn, low: User },
  'project.operatingSchedule': { '24_7': History, business_hours: Briefcase, extended_hours: Clock, seasonal: CalendarDays },
};
