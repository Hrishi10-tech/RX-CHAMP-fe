import {
  BadgeCheck,
  BookOpen,
  Boxes,
  Briefcase,
  Building,
  Calculator,
  Camera,
  ChartColumn,
  ChartLine,
  CircuitBoard,
  ClipboardList,
  Code,
  Cpu,
  Factory,
  FlaskConical,
  Globe,
  GraduationCap,
  HardHat,
  Headphones,
  HeartPulse,
  Landmark,
  Leaf,
  Megaphone,
  MessagesSquare,
  Microscope,
  Package,
  Palette,
  Pencil,
  Rocket,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** SPEC 7.6: the keys the server accepts for a department's icon. */
export const DEPARTMENT_ICON_KEYS = [
  "code",
  "cpu",
  "circuit-board",
  "wrench",
  "flask",
  "microscope",
  "heart-pulse",
  "stethoscope",
  "package",
  "truck",
  "warehouse",
  "shopping-cart",
  "bar-chart",
  "line-chart",
  "megaphone",
  "headphones",
  "users",
  "user-cog",
  "wallet",
  "calculator",
  "scale",
  "shield-check",
  "badge-check",
  "settings",
  "pencil",
  "palette",
  "camera",
  "book-open",
  "graduation-cap",
  "building",
  "briefcase",
  "globe",
  "factory",
  "boxes",
  "clipboard-list",
  "messages",
  "rocket",
  "leaf",
  "landmark",
  "hard-hat",
] as const;

export type DepartmentIconKey = (typeof DEPARTMENT_ICON_KEYS)[number];

export const DEFAULT_DEPARTMENT_ICON: DepartmentIconKey = "briefcase";

interface IconMeta {
  icon: LucideIcon;
  /** What the picker announces: "Code", "Heart pulse". */
  label: string;
}

export const DEPARTMENT_ICONS: Record<DepartmentIconKey, IconMeta> = {
  code: { icon: Code, label: "Code" },
  cpu: { icon: Cpu, label: "Chip" },
  "circuit-board": { icon: CircuitBoard, label: "Circuit board" },
  wrench: { icon: Wrench, label: "Wrench" },
  flask: { icon: FlaskConical, label: "Flask" },
  microscope: { icon: Microscope, label: "Microscope" },
  "heart-pulse": { icon: HeartPulse, label: "Heart pulse" },
  stethoscope: { icon: Stethoscope, label: "Stethoscope" },
  package: { icon: Package, label: "Package" },
  truck: { icon: Truck, label: "Truck" },
  warehouse: { icon: Warehouse, label: "Warehouse" },
  "shopping-cart": { icon: ShoppingCart, label: "Shopping cart" },
  "bar-chart": { icon: ChartColumn, label: "Bar chart" },
  "line-chart": { icon: ChartLine, label: "Line chart" },
  megaphone: { icon: Megaphone, label: "Megaphone" },
  headphones: { icon: Headphones, label: "Headphones" },
  users: { icon: Users, label: "People" },
  "user-cog": { icon: UserCog, label: "Person with cog" },
  wallet: { icon: Wallet, label: "Wallet" },
  calculator: { icon: Calculator, label: "Calculator" },
  scale: { icon: Scale, label: "Scales" },
  "shield-check": { icon: ShieldCheck, label: "Shield" },
  "badge-check": { icon: BadgeCheck, label: "Badge" },
  settings: { icon: Settings, label: "Cog" },
  pencil: { icon: Pencil, label: "Pencil" },
  palette: { icon: Palette, label: "Palette" },
  camera: { icon: Camera, label: "Camera" },
  "book-open": { icon: BookOpen, label: "Book" },
  "graduation-cap": { icon: GraduationCap, label: "Graduation cap" },
  building: { icon: Building, label: "Building" },
  briefcase: { icon: Briefcase, label: "Briefcase" },
  globe: { icon: Globe, label: "Globe" },
  factory: { icon: Factory, label: "Factory" },
  boxes: { icon: Boxes, label: "Boxes" },
  "clipboard-list": { icon: ClipboardList, label: "Clipboard" },
  messages: { icon: MessagesSquare, label: "Messages" },
  rocket: { icon: Rocket, label: "Rocket" },
  leaf: { icon: Leaf, label: "Leaf" },
  landmark: { icon: Landmark, label: "Landmark" },
  "hard-hat": { icon: HardHat, label: "Hard hat" },
};

/** The picker's themes: every key appears exactly once. */
export const ICON_THEMES: { title: string; keys: DepartmentIconKey[] }[] = [
  {
    title: "Engineering and making",
    keys: ["code", "cpu", "circuit-board", "wrench", "hard-hat", "factory"],
  },
  {
    title: "Health and science",
    keys: ["flask", "microscope", "heart-pulse", "stethoscope", "leaf"],
  },
  {
    title: "Operations",
    keys: ["package", "truck", "warehouse", "boxes", "clipboard-list", "settings"],
  },
  {
    title: "Sales and marketing",
    keys: ["shopping-cart", "bar-chart", "line-chart", "megaphone", "rocket", "globe"],
  },
  {
    title: "People and support",
    keys: ["headphones", "users", "user-cog", "messages", "graduation-cap", "book-open"],
  },
  {
    title: "Finance and legal",
    keys: ["wallet", "calculator", "scale", "landmark", "shield-check", "badge-check"],
  },
  { title: "Creative and general", keys: ["pencil", "palette", "camera", "building", "briefcase"] },
];

export function isDepartmentIconKey(value: unknown): value is DepartmentIconKey {
  return typeof value === "string" && (DEPARTMENT_ICON_KEYS as readonly string[]).includes(value);
}

/** The lucide icon for a key; an unknown or missing key draws the briefcase. */
export function departmentIcon(key: string | null | undefined): LucideIcon {
  return isDepartmentIconKey(key) ? DEPARTMENT_ICONS[key].icon : DEPARTMENT_ICONS.briefcase.icon;
}

/** Words in a department name that point to an icon, checked in order. */
const NAME_HINTS: [RegExp, DepartmentIconKey][] = [
  [/hardware|electronic|embedded|pcb/, "circuit-board"],
  [/software|engineer|develop|tech|it\b|devops|platform/, "code"],
  [/firmware|chip|silicon/, "cpu"],
  [/maint|service|repair|field/, "wrench"],
  [/lab|research|r ?& ?d|r&d|science/, "flask"],
  [/quality|qa\b|qc\b|test/, "badge-check"],
  [/clinic|medical|health|nurs/, "stethoscope"],
  [/regulat|compliance|legal/, "scale"],
  [/security/, "shield-check"],
  [/sales|revenue|business dev/, "bar-chart"],
  [/analytic|data|insight|growth/, "line-chart"],
  [/market|brand|pr\b|communication/, "megaphone"],
  [/support|help ?desk|customer/, "headphones"],
  [/hr\b|human|people|talent|recruit/, "users"],
  [/admin/, "user-cog"],
  [/financ|payroll/, "wallet"],
  [/account/, "calculator"],
  [/design|creative|ux|ui\b/, "palette"],
  [/content|writ|editor/, "pencil"],
  [/media|photo|video/, "camera"],
  [/train|learn|education/, "graduation-cap"],
  [/procure|purchas|buy/, "shopping-cart"],
  [/logistic|ship|deliver|dispatch/, "truck"],
  [/inventory|store|stock|warehouse/, "warehouse"],
  [/production|manufactur|assembly|plant/, "factory"],
  [/product/, "rocket"],
  [/operation|ops\b/, "settings"],
  [/project|pmo|planning/, "clipboard-list"],
  [/international|export|global/, "globe"],
  [/facility|facilities|office/, "building"],
];

/** A sensible icon for a department name, as the 4.0 migration picks them (SPEC 3.3). */
export function suggestIcon(name: string): DepartmentIconKey {
  const n = name.trim().toLowerCase();
  if (!n) return DEFAULT_DEPARTMENT_ICON;
  for (const [pattern, key] of NAME_HINTS) {
    if (pattern.test(n)) return key;
  }
  return DEFAULT_DEPARTMENT_ICON;
}

/** Names offered while typing a new department, each with its usual icon. */
export const NAME_SUGGESTIONS: { name: string; icon: DepartmentIconKey }[] = [
  { name: "Engineering", icon: "code" },
  { name: "Hardware", icon: "circuit-board" },
  { name: "Firmware", icon: "cpu" },
  { name: "Research and Development", icon: "flask" },
  { name: "Quality Assurance", icon: "badge-check" },
  { name: "Regulatory Affairs", icon: "scale" },
  { name: "Clinical", icon: "stethoscope" },
  { name: "Production", icon: "factory" },
  { name: "Procurement", icon: "shopping-cart" },
  { name: "Logistics", icon: "truck" },
  { name: "Inventory", icon: "warehouse" },
  { name: "Sales", icon: "bar-chart" },
  { name: "Marketing", icon: "megaphone" },
  { name: "Customer Support", icon: "headphones" },
  { name: "Human Resources", icon: "users" },
  { name: "Finance", icon: "wallet" },
  { name: "Accounts", icon: "calculator" },
  { name: "Design", icon: "palette" },
  { name: "Product", icon: "rocket" },
  { name: "Operations", icon: "settings" },
  { name: "Administration", icon: "user-cog" },
  { name: "Legal", icon: "landmark" },
];

/** Suggestions that match what has been typed and are not taken yet. */
export function nameSuggestions(
  typed: string,
  taken: string[],
  limit = 6,
): { name: string; icon: DepartmentIconKey }[] {
  const q = typed.trim().toLowerCase();
  const used = new Set(taken.map((t) => normalizeName(t)));
  return NAME_SUGGESTIONS.filter(
    (s) => !used.has(normalizeName(s.name)) && (!q || s.name.toLowerCase().includes(q)),
  ).slice(0, limit);
}

/** How the server compares names: ignoring case and spacing (SPEC 2.1). */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}
