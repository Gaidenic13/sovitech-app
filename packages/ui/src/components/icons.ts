/**
 * The Lucide icons the wizard draws (onboarding-spec 2.5, "Icons": Lucide at stroke 1.5), re-exported
 * so every caller takes them from the kit and draws them through `Icon` or a component's `icon` prop
 * (24px, 32px at most: the render test reads a larger drawing as unreadable pixels). A screen may
 * import another Lucide icon; this list is the kit's own vocabulary and the one its harness pages use.
 */
export {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  CloudUpload,
  Eye,
  FileText,
  Flame,
  Globe,
  Hotel,
  Info,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react';
