"use client";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CloudUpload,
  Coffee,
  Download,
  Eye,
  FileChartColumn,
  Hourglass,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  MousePointerClick,
  Network,
  Pause,
  Play,
  Settings,
  ShieldCheck,
  Timer,
  UserCog,
  UserPlus,
  Users,
  Video,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { ROLE_LABEL, hasAnyGrant, isOrgAdmin, type Grants, type Role } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";

interface Step {
  icon: LucideIcon;
  label: string;
}

/** A small left-to-right diagram: icons joined by arrows, wrapping on a phone. */
export function StepFlow({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label="Steps">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-card bg-card py-1 pl-1 pr-2.5 text-xs font-semibold text-body shadow-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand">
              <s.icon className="h-3 w-3" aria-hidden />
            </span>
            {s.label}
          </span>
          {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-neutral" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

interface Guide {
  id: string;
  icon: LucideIcon;
  title: string;
  text: string;
  steps?: Step[];
  /** Who sees this card. */
  show: (role: Role, grants: Grants) => boolean;
}

const everyone = () => true;
const admins = (role: Role) => isOrgAdmin(role);

const GUIDES: Guide[] = [
  {
    id: "organisations",
    icon: Building2,
    title: "Organisations",
    text: "Each organisation is separate: its own Admin, people, shifts and settings. Pick one in the header to work inside it; All organisations shows the platform overview.",
    steps: [
      { icon: Building2, label: "Add organisation" },
      { icon: ShieldCheck, label: "Create its Admin" },
      { icon: LayoutDashboard, label: "Open it" },
    ],
    show: (role) => role === "SUPER_ADMIN",
  },
  {
    id: "overview",
    icon: LayoutDashboard,
    title: "Overview",
    text: "Who is working, on a break, in a meeting or away right now; focus today against target; approvals waiting; the month so far; and what needs a look. It refreshes every minute.",
    show: everyone,
  },
  {
    id: "team",
    icon: Users,
    title: "Team",
    text: "Everyone with a day open (Active) or everyone (All). Open a person for their day: focus, timeline, screenshots and activity, and export their timesheet as PDF or Excel.",
    steps: [
      { icon: Users, label: "Team" },
      { icon: Eye, label: "Open a person" },
      { icon: Download, label: "Export timesheet" },
    ],
    show: (role, grants) => role !== "MANAGER" || hasAnyGrant(grants),
  },
  {
    id: "grants",
    icon: Eye,
    title: "What managers can see",
    text: "A manager sees screenshots, timelines or keyboard and mouse activity of their departments' staff only when the Admin grants it, and only those sections. Managers never add, edit or delete people.",
    steps: [
      { icon: UserCog, label: "Team management" },
      { icon: Eye, label: "Grants" },
      { icon: Users, label: "Team page appears" },
    ],
    show: everyone,
  },
  {
    id: "people",
    icon: UserCog,
    title: "Team management",
    text: "Add Managers and Staff, put them in departments, choose their shift, turn screenshots and input tracking on or off, get their app installer, set passwords, block or delete.",
    steps: [
      { icon: UserPlus, label: "Add member" },
      { icon: Network, label: "Department" },
      { icon: Download, label: "Download agent" },
    ],
    show: admins,
  },
  {
    id: "departments",
    icon: Network,
    title: "Departments",
    text: "Staff belong to one department; managers look after one or more. Each department has an icon, and can have its own input tracking.",
    show: admins,
  },
  {
    id: "approvals",
    icon: ClipboardCheck,
    title: "Approvals",
    text: "Breaks taken off schedule, skipped breaks, meetings and away time with a reason wait here. Approving away time or a meeting counts it as focus; rejecting needs a short note the person sees.",
    steps: [
      { icon: Hourglass, label: "Request arrives" },
      { icon: CheckCircle2, label: "Approve or reject" },
      { icon: Timer, label: "Focus updates" },
    ],
    show: everyone,
  },
  {
    id: "breaks",
    icon: Coffee,
    title: "Breaks and the paid allowance",
    text: "Scheduled breaks plus a 10-minute buffer a day are paid; quick breaks and overruns use the buffer first, then count as unpaid. The daily focus target is the shift minus that allowance.",
    show: everyone,
  },
  {
    id: "reports",
    icon: FileChartColumn,
    title: "Reports",
    text: "Day and month reports for a person, a department or everyone: focus against target, paid and unpaid breaks, away time. As pages, PDF or Excel. Admins lock a month for payroll once nothing is waiting.",
    show: everyone,
  },
  {
    id: "calendar",
    icon: CalendarDays,
    title: "Calendar",
    text: "The working week and holidays. Monthly focus targets count only working days. Admins click a day to make it a day off (with a name) or a working day.",
    show: everyone,
  },
  {
    id: "tracking",
    icon: MousePointerClick,
    title: "Input tracking",
    text: "With no keyboard or mouse input for a few minutes, the app asks why: a break, thinking, a short meeting, hardware work or your own reasons. Set it for the organisation, each department or one person.",
    steps: [
      { icon: Hourglass, label: "Away 5 min" },
      { icon: MessageSquare, label: "App asks why" },
      { icon: ClipboardCheck, label: "Approve" },
    ],
    show: admins,
  },
  {
    id: "keys",
    icon: KeyRound,
    title: "Sign-out keys",
    text: "The app only signs out with a key from the Admin: for one person, departments or everyone, valid 24 hours, shown once. The app uploads everything first.",
    steps: [
      { icon: KeyRound, label: "Create key" },
      { icon: MessageSquare, label: "Share it" },
      { icon: LogOut, label: "They sign out" },
    ],
    show: admins,
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings",
    text: "How long approvals may wait, what a full or half day is, the paid break buffer, quiet hours, and when a forgotten day closes.",
    show: admins,
  },
];

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Card as="article" className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/8 text-brand">
          <guide.icon className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-base font-bold text-primary">{guide.title}</h2>
      </div>
      <p className="text-sm leading-relaxed text-soft">{guide.text}</p>
      {guide.steps && (
        <div className="mt-auto rounded-xl bg-fill p-3">
          <StepFlow steps={guide.steps} />
        </div>
      )}
    </Card>
  );
}

/** A drawing of the app's four tiles, so a manager knows what staff are looking at. */
function AppMock() {
  const tiles: { icon: LucideIcon; title: string; sub: string; tone: string }[] = [
    {
      icon: Coffee,
      title: "Quick break",
      sub: "Any time · 5, 10 or 15 min",
      tone: "bg-attention-wash text-attention",
    },
    {
      icon: Timer,
      title: "Next break",
      sub: "Lunch at 1:00 PM",
      tone: "bg-working-wash text-working",
    },
    {
      icon: Play,
      title: "Focus work",
      sub: "4h 12m today",
      tone: "bg-brand/8 text-brand",
    },
    {
      icon: Video,
      title: "Meeting",
      sub: "Start now or log earlier",
      tone: "bg-brand-wash text-brand",
    },
  ];
  return (
    <div
      className="mx-auto w-full max-w-sm rounded-[1.75rem] border-[6px] border-strong bg-fill p-3 shadow-xl"
      aria-hidden
    >
      <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm">
        <span className="text-xs font-bold text-primary">RX Vision</span>
        <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-working">
          <span className="h-1.5 w-1.5 rounded-full bg-working" /> Working since 9:05 AM
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div key={t.title} className="rounded-xl bg-card p-2.5 shadow-sm">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.tone}`}>
              <t.icon className="h-3.5 w-3.5" />
            </span>
            <p className="mt-1.5 text-[0.6875rem] font-bold text-strong">{t.title}</p>
            <p className="text-[0.5625rem] text-quiet">{t.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-xl bg-card p-2.5 shadow-sm">
        <p className="text-[0.625rem] font-semibold text-quiet">
          Paid breaks 1h 05m of 1h 30m · unpaid 0m
        </p>
        <div className="mt-1 h-1.5 rounded-full bg-panel">
          <div className="h-full w-3/4 rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}

function AwayMock() {
  return (
    <div
      className="mx-auto w-full max-w-xs rounded-2xl border border-card bg-card p-4 shadow-xl"
      aria-hidden
    >
      <p className="text-xs font-bold text-primary">Away since 2:05 PM · 23 min</p>
      <p className="mt-0.5 text-[0.6875rem] text-quiet">What were you doing?</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {["Took a break", "Thinking", "Short meeting", "Other work"].map((r, i) => (
          <span
            key={r}
            className={`rounded-lg border px-2 py-1.5 text-center text-[0.625rem] font-semibold ${
              i === 2 ? "border-brand bg-brand/6 text-brand" : "border-card text-soft"
            }`}
          >
            {r}
          </span>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-6 rounded-md border border-card px-2 text-[0.625rem] leading-6 text-quiet">
          Participants
        </div>
        <div className="h-6 rounded-md border border-card px-2 text-[0.625rem] leading-6 text-quiet">
          Who will mail the minutes
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-brand py-1.5 text-center text-[0.6875rem] font-bold text-on-brand">
        Submit
      </div>
    </div>
  );
}

const STAFF_POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Play,
    title: "Start and end the day",
    text: "In the app only. The portal never starts or ends anyone's day.",
  },
  {
    icon: Coffee,
    title: "Breaks",
    text: "Scheduled breaks open in their window; quick breaks any time. Every End asks to confirm.",
  },
  {
    icon: Pause,
    title: "Pause and resume",
    text: "A scheduled break can pause and resume inside its window; focus restarts while paused.",
  },
  {
    icon: Video,
    title: "Meetings",
    text: "Start one or log one afterwards, with participants and who will mail the minutes.",
  },
  {
    icon: Hourglass,
    title: "Away pop-up",
    text: "After a few idle minutes it asks why. Anything but a break waits for your approval.",
  },
  {
    icon: BadgeCheck,
    title: "History",
    text: "Their days and month: focus against target, meetings and what is still pending.",
  },
  {
    icon: WifiOff,
    title: "Offline",
    text: "Everything works offline and syncs in order once the connection is back.",
  },
  {
    icon: Lock,
    title: "Signing out",
    text: "Needs internet and a sign-out key from the Admin. Quit is not in the menus.",
  },
  {
    icon: CloudUpload,
    title: "Nothing lost",
    text: "Every action is saved on the computer first, so a restart never loses a press.",
  },
];

/**
 * SPEC 7.2 Instructions: an illustrated guide to the menus this person has,
 * plus what staff see in the RX Vision app.
 */
export function InstructionsView() {
  const { role, grants } = useSession();
  const r: Role = role ?? "MANAGER";
  const guides = GUIDES.filter((g) => g.show(r, grants));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instructions"
        subtitle={`How RX Vision works for you as ${ROLE_LABEL[r] === "Admin" ? "an" : "a"} ${ROLE_LABEL[r]}, and what your staff see in the app.`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </div>

      <Card as="section" className="overflow-hidden" aria-labelledby="staff-heading">
        <div className="border-b border-divider px-5 py-4">
          <h2 id="staff-heading" className="text-lg font-bold text-primary">
            What staff see in the app
          </h2>
          <p className="text-sm text-quiet">
            Staff never use this portal. Their day, breaks, meetings and history live in the RX
            Vision app on their computer.
          </p>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <figure>
              <AppMock />
              <figcaption className="mt-2 text-center text-xs text-quiet">
                The four tiles
              </figcaption>
            </figure>
            <figure>
              <AwayMock />
              <figcaption className="mt-2 text-center text-xs text-quiet">
                The away pop-up
              </figcaption>
            </figure>
          </div>
          <ul className="grid content-start gap-3 sm:grid-cols-2">
            {STAFF_POINTS.map((p) => (
              <li key={p.title} className="flex gap-3 rounded-xl border border-divider p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel text-soft">
                  <p.icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-strong">{p.title}</span>
                  <span className="block text-xs leading-relaxed text-quiet">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
