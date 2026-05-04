import { useEffect, useMemo, useState } from "react";
import { Search, Mail, CalendarDays } from "lucide-react";
import { getApiToken } from "../lib/auth";
import {
  getAdminProfessionalNoticePeriods,
  AdminNoticePeriodItem,
} from "../api/adminService";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { toast } from "sonner";

function professionalKey(item: AdminNoticePeriodItem): string {
  const p = item.professional;
  if (p?.id != null) return `id:${p.id}`;
  const name = (p?.name ?? "").trim();
  const email = (p?.email ?? "").trim();
  return `row:${item.id}|${name}|${email}`;
}

export function AdminNoticePeriod() {
  const [items, setItems] = useState<AdminNoticePeriodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProfessional, setFilterProfessional] = useState<string>("all");

  useEffect(() => {
    const token = getApiToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAdminProfessionalNoticePeriods(token)
      .then((res) => {
        if (cancelled) return;
        setItems(Array.isArray(res.data) ? res.data : []);
        if (!res.ok && res.message) {
          toast.error(res.message);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setItems([]);
          const msg =
            e && typeof e === "object" && "message" in e
              ? String((e as { message?: string }).message)
              : "Failed to load notice periods.";
          toast.error(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nameOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const row of items) {
      const key = professionalKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      const name = row.professional?.name?.trim() || "Unknown";
      opts.push({ value: key, label: name });
    }
    opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return opts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((row) => {
      const key = professionalKey(row);
      if (filterProfessional !== "all" && key !== filterProfessional) return false;
      if (!q) return true;
      const name = (row.professional?.name ?? "").toLowerCase();
      const email = (row.professional?.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [items, searchTerm, filterProfessional]);

  const selectedProfessionalLabel = useMemo(() => {
    if (filterProfessional === "all") return "All";
    return nameOptions.find((o) => o.value === filterProfessional)?.label ?? "All";
  }, [filterProfessional, nameOptions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-800 mb-1">Notice Period</h1>
        <p className="text-sm text-gray-500">
          View each professional&apos;s configured notice period (days).
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex w-full items-center gap-4">

            {/* { Search } */}
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search professional by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full h-11"
              />
            </div>
            {/* <Select value={filterProfessional} onValueChange={setFilterProfessional}>
              <SelectTrigger className="w-full md:w-56">
                <span>{selectedProfessionalLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {nameOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">Loading notice periods…</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No notice period records match your filters.
            </CardContent>
          </Card>
        ) : (
          filtered.map((row) => {
            const p = row.professional;
            const name = p?.name?.trim() || "—";
            const email = p?.email?.trim() || "—";
            const days = row.notice_days;

            return (
              <Card key={row.id}>
                <CardContent className="p-6">
                  <div className="min-w-0">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-xl text-[#0A1A2F] mb-2">{name}</h3>
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <p className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">{email}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="text-xs text-gray-500">Notice period</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {typeof days === "number" ? `${days} day${days === 1 ? "" : "s"}` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
