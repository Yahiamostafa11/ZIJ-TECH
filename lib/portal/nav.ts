import {
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  History,
  LayoutDashboard,
  Layers,
  type LucideIcon,
  MessageSquareWarning,
  NotebookPen,
  PhoneCall,
  Presentation,
  ShieldCheck,
  StickyNote,
  Star,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

/** Roadmap phase a module ships in; shown on placeholder pages. */
export type Phase = "0" | "1a" | "1b" | "2" | "3";

export type NavItem = {
  /** Path segment under the portal root. Empty string is the portal home. */
  slug: string;
  /** Key under the `nav` messages namespace. */
  key: string;
  icon: LucideIcon;
  permission: Permission;
  phase: Phase;
};

export type NavSection = { key: string; items: NavItem[] };

export const ACADEMY_NAV: NavSection[] = [
  {
    key: "overview",
    items: [
      { slug: "", key: "overview", icon: LayoutDashboard, permission: "academy.overview", phase: "0" },
    ],
  },
  {
    key: "admissions",
    items: [
      { slug: "leads", key: "leads", icon: UserPlus, permission: "leads.read", phase: "2" },
      { slug: "trials", key: "trials", icon: Presentation, permission: "leads.read", phase: "2" },
    ],
  },
  {
    key: "people",
    items: [
      { slug: "students", key: "students", icon: GraduationCap, permission: "students.read", phase: "1a" },
      { slug: "families", key: "families", icon: UsersRound, permission: "students.read", phase: "1a" },
      { slug: "instructors", key: "instructors", icon: Users, permission: "instructors.manage", phase: "1a" },
    ],
  },
  {
    key: "academics",
    items: [
      { slug: "levels", key: "levels", icon: Layers, permission: "levels.manage", phase: "1a" },
      { slug: "groups", key: "groups", icon: Boxes, permission: "groups.read", phase: "1a" },
      { slug: "schedule", key: "schedule", icon: CalendarDays, permission: "sessions.read", phase: "1b" },
      { slug: "attendance", key: "attendance", icon: ClipboardCheck, permission: "attendance.read", phase: "1b" },
      { slug: "grades", key: "grades", icon: Star, permission: "grades.read", phase: "1b" },
      { slug: "homework", key: "homework", icon: NotebookPen, permission: "homework.read", phase: "1b" },
      { slug: "warnings", key: "warnings", icon: MessageSquareWarning, permission: "warnings.read", phase: "1b" },
    ],
  },
  {
    key: "finance",
    items: [
      { slug: "payments", key: "payments", icon: Banknote, permission: "payments.read", phase: "1a" },
      { slug: "balances", key: "balances", icon: Wallet, permission: "payments.read", phase: "1a" },
    ],
  },
  {
    key: "followup",
    items: [
      { slug: "calls", key: "calls", icon: PhoneCall, permission: "followup.read", phase: "1b" },
      { slug: "notes", key: "notes", icon: StickyNote, permission: "followup.read", phase: "1b" },
    ],
  },
  {
    key: "operations",
    items: [
      { slug: "branches", key: "branches", icon: Building2, permission: "branches.manage", phase: "1a" },
      { slug: "inventory", key: "inventory", icon: Boxes, permission: "inventory.manage", phase: "3" },
      { slug: "reports", key: "reports", icon: BarChart3, permission: "reports.read", phase: "2" },
    ],
  },
  {
    key: "settings",
    items: [
      { slug: "import", key: "import", icon: FileSpreadsheet, permission: "students.import", phase: "1a" },
      { slug: "users", key: "users", icon: ShieldCheck, permission: "users.manage", phase: "1a" },
      { slug: "audit", key: "audit", icon: History, permission: "audit.read", phase: "1a" },
    ],
  },
];

export const INSTRUCTOR_NAV: NavSection[] = [
  {
    key: "teaching",
    items: [
      { slug: "", key: "today", icon: CalendarDays, permission: "portal.instructor", phase: "1b" },
      { slug: "groups", key: "myGroups", icon: Boxes, permission: "portal.instructor", phase: "1b" },
      { slug: "homework", key: "homework", icon: NotebookPen, permission: "teaching.homework", phase: "1b" },
      { slug: "warnings", key: "warnings", icon: MessageSquareWarning, permission: "teaching.warnings", phase: "1b" },
    ],
  },
];

export function findNavItem(nav: NavSection[], slug: string) {
  for (const section of nav) {
    const item = section.items.find((candidate) => candidate.slug === slug);
    if (item) return item;
  }
  return null;
}
