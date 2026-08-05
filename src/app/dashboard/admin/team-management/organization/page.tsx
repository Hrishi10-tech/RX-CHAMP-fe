"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { getCompanies } from "@/features/companies/api/getCompanies";
import { OrganizationPanel } from "@/features/companies/components/OrganizationPanel";
import type { Company } from "@/features/companies/types";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCompanies({ page: 1, limit: 20 })
      .then((res) => {
        if (active) setCompanies(res.companies);
      })
      .catch(() => {
        if (!active) return;
        setCompanies([]);
        toast.error("Couldn't load companies", {
          description: "Please try again.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.name, ...(c.managers ?? []).map((m) => m.name)].some((v) => v.toLowerCase().includes(q)),
    );
  }, [companies, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Companies" subtitle="Browse organizations and their managers." />

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies…"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[rgb(34_34_204)] sm:w-72"
            />
          </div>
          <Link
            href="/dashboard/admin/team-management/company"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Add company
          </Link>
        </div>
      </div>

      <OrganizationPanel companies={filtered} loading={loading} />
    </div>
  );
}
