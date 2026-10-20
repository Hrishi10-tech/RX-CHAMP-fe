import { initialsOf } from "@/lib/text/initials";

/** Initials on the brand gradient: the portal's picture of a person. */
export function Avatar({
  name,
  className = "h-9 w-9 text-xs",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(34_34_204)] to-[rgb(86_86_224)] font-semibold text-white shadow-sm ring-1 ring-[rgba(34,34,204,0.25)] ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
