"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, UserCog } from "lucide-react";
import { isAxiosError } from "axios";

import { getUsers } from "@/features/users/api/getUsers";
import type { User } from "@/features/users/types";
import { createCompany } from "@/features/companies/api/createCompany";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  managerIds: z.array(z.string()).optional(),
});

type CompanyValues = z.infer<typeof companySchema>;

const LIST_ROUTE = "/dashboard/admin/team-management";

function managerName(u: User): string {
  return u.name ?? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ?? u.email ?? "—";
}

function managerDescription(u: User): string {
  return u.department ?? u.email ?? "Manager";
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-[rgb(34_34_204)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(34,34,204,0.15)]";
const labelClass = "text-xs font-medium text-slate-600";
const errorClass = "mt-1 text-xs text-red-600";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function OptionCard({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors ${
        selected
          ? "border-[rgb(34_34_204)] bg-[rgba(34,34,204,0.05)] ring-1 ring-[rgb(34_34_204)]"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-[rgb(34_34_204)] bg-[rgb(34_34_204)] text-white" : "border-slate-300"
        }`}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function AddCompanyPage() {
  const router = useRouter();

  const [managers, setManagers] = useState<User[]>([]);
  const [managersLoading, setManagersLoading] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "", managerIds: [] },
  });

  useEffect(() => {
    let active = true;
    setManagersLoading(true);
    getUsers({ role: "MANAGER", page: 1, limit: 100 })
      .then((res) => {
        if (active) setManagers(res.users);
      })
      .catch(() => {
        if (!active) return;
        setManagers([]);
        toast.error("Couldn't load managers", {
          description: "Please try again.",
        });
      })
      .finally(() => {
        if (active) setManagersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(values: CompanyValues) {
    try {
      const ids = values.managerIds ?? [];
      const company = await createCompany({
        name: values.name,
        managerIds: ids.length ? ids : undefined,
      });

      const assigned = company.assignments?.assigned ?? [];
      const failed = company.assignments?.errors ?? [];
      if (failed.length) {
        toast.warning("Company created with some issues", {
          description: `${assigned.length} manager${
            assigned.length === 1 ? "" : "s"
          } assigned, ${failed.length} failed.`,
        });
      } else {
        toast.success("Company created", {
          description: `${company.name} has been created.`,
        });
      }
      router.push(LIST_ROUTE);
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : err instanceof Error
          ? err.message
          : undefined;
      toast.error("Couldn't create company", {
        description: message ?? "Please try again.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={LIST_ROUTE}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Team Management
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Add Company</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a company and optionally assign managers.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card title="Company Information">
          <div>
            <label htmlFor="name" className={labelClass}>
              Company name
            </label>
            <input id="name" className={fieldClass} placeholder="Acme Corp" {...register("name")} />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-[rgb(34_34_204)]" />
              <span className="text-sm font-bold text-slate-900">Manager Assignment</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Assign one or more managers to this company (optional).
            </p>
            {managersLoading ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading managers…
              </div>
            ) : managers.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3.5 py-6 text-center text-sm text-slate-400">
                No managers available.
              </div>
            ) : (
              <Controller
                name="managerIds"
                control={control}
                render={({ field }) => {
                  const value = field.value ?? [];
                  const scrolls = managers.length > 4;
                  return (
                    <div
                      className={`mt-4 ${
                        scrolls
                          ? "scrollbar-slim max-h-44 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2 [scrollbar-gutter:stable]"
                          : ""
                      }`}
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {managers.map((m) => {
                          const selected = value.includes(m.id);
                          return (
                            <OptionCard
                              key={m.id}
                              selected={selected}
                              onClick={() =>
                                field.onChange(
                                  selected ? value.filter((id) => id !== m.id) : [...value, m.id],
                                )
                              }
                              label={managerName(m)}
                              description={managerDescription(m)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
            )}
            {errors.managerIds && <p className={errorClass}>{errors.managerIds.message}</p>}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={LIST_ROUTE}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[rgb(34_34_204)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[rgb(28_28_180)] disabled:opacity-70"
          >
            Create company
          </button>
        </div>
      </form>
    </div>
  );
}
