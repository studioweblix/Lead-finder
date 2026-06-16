"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { scoreLead, getScoreInfo } from "@/lib/scoring";
import type { MappedLead } from "@/app/api/find-leads/route";

// ---- Types ------------------------------------------------------------------

type ScoredLead = MappedLead & { _s: number; _r: string[] };
type FilterType = "all" | "hot" | "has-phone" | "no-phone";
type SortType = "score" | "name" | "rating";

// ---- Constants --------------------------------------------------------------

const CATEGORIES = [
  { id: "restaurant", label: "Restaurant" },
  { id: "cafe", label: "Café" },
  { id: "bar", label: "Bar" },
  { id: "bakery", label: "Bäckerei" },
  { id: "takeaway", label: "Imbiss / Take-Away" },
];

// ---- Sub-components ---------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  const info = getScoreInfo(score);
  return (
    <span
      className={`${info.bg} ${info.border} ${info.text} border px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap`}
    >
      {score}% {info.label}
    </span>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <svg
      className={`animate-spin ${cls} text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm text-sm
        ${type === "success" ? "bg-zinc-900 border-green-800 text-green-300" : "bg-zinc-900 border-red-800 text-red-300"}`}
    >
      <span className="mt-0.5 text-base">{type === "success" ? "✓" : "✕"}</span>
      <p className="flex-1">{msg}</p>
      <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none ml-1">×</button>
    </div>
  );
}

// ---- Main -------------------------------------------------------------------

export default function Home() {
  // Form state
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [categories, setCategories] = useState<string[]>(["restaurant"]);

  // App state
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [rawLeads, setRawLeads] = useState<MappedLead[]>([]);
  const [searchedCity, setSearchedCity] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // List state
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("score");
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggleCategory = (id: string) =>
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || categories.length === 0) return;

    setLoading(true);
    setToast(null);
    setHasSearched(false);
    setRawLeads([]);
    setExpanded(null);
    setFilter("all");
    setSearch("");

    try {
      const res = await fetch("/api/find-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), radius_km: radiusKm, categories }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setToast({ msg: data.error ?? `Fehler ${res.status}`, type: "error" });
        return;
      }

      setRawLeads(data.leads ?? []);
      setSearchedCity(data.city ?? city.trim());
      setHasSearched(true);

      if ((data.leads ?? []).length === 0) {
        setToast({
          msg: data.message ?? `Keine Restaurants ohne Website in "${city}" gefunden.`,
          type: "error",
        });
      } else {
        const s = data.stats;
        const costStr = s ? `~$${s.estimated_cost_usd.toFixed(2)}` : "";
        const dupStr = s && s.duplicates > 0 ? ` (${s.duplicates} bereits bekannt)` : "";
        setToast({
          msg: `${s?.new_leads ?? (data.leads ?? []).length} neue Leads gefunden${dupStr}${costStr ? " · " + costStr : ""}`,
          type: "success",
        });
      }
    } catch (err: unknown) {
      setToast({ msg: (err as Error).message ?? "Netzwerkfehler", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const scored: ScoredLead[] = useMemo(
    () =>
      rawLeads.map((l) => {
        const { score, reasons } = scoreLead({ ...l, reviews: l.reviews ?? 0 });
        return { ...l, _s: score, _r: reasons };
      }),
    [rawLeads]
  );

  const stats = useMemo(
    () => ({
      total: scored.length,
      hot: scored.filter((r) => r._s >= 55).length,
      hasPhone: scored.filter((r) => !!r.phone).length,
      noPhone: scored.filter((r) => !r.phone).length,
    }),
    [scored]
  );

  const filtered = useMemo(() => {
    let rows = [...scored];
    if (filter === "hot") rows = rows.filter((r) => r._s >= 55);
    if (filter === "has-phone") rows = rows.filter((r) => !!r.phone);
    if (filter === "no-phone") rows = rows.filter((r) => !r.phone);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.name + r.category + r.city + r.address + r.subtypes).toLowerCase().includes(q)
      );
    }
    if (sortBy === "score") rows.sort((a, b) => b._s - a._s);
    else if (sortBy === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "de"));
    else if (sortBy === "rating") rows.sort((a, b) => b.rating - a.rating);
    return rows;
  }, [scored, filter, search, sortBy]);

  const mapDbLeads = (rows: Record<string, unknown>[]): MappedLead[] =>
    rows.map((l) => ({
      placeId: String(l.place_id ?? ""),
      name: String(l.name ?? ""),
      phone: String(l.phone ?? ""),
      website: String(l.website_url ?? ""),
      address: String(l.address ?? ""),
      city: String(l.city ?? ""),
      postal: String(l.postcode ?? ""),
      rating: Number(l.rating ?? 0),
      reviews: 0,
      category: String(l.primary_type ?? "").replace(/_/g, " "),
      subtypes: Array.isArray(l.types) ? (l.types as string[]).join(", ") : "",
      photo: "",
      description: "",
      verified: l.business_status === "OPERATIONAL",
      internationalPhone: String(l.international_phone ?? ""),
    }));

  const handleFetchAllLeads = async (statusFilter?: string) => {
    setLoadingAll(true);
    setToast(null);
    try {
      const url = statusFilter
        ? `/api/leads?limit=200&status=${statusFilter}`
        : "/api/leads?limit=200";
      const res = await fetch(url);
      if (!res.ok) {
        const d = await res.json();
        setToast({ msg: d.error ?? `Fehler ${res.status}`, type: "error" });
        return;
      }
      const d = await res.json();
      const dbLeads = mapDbLeads(d.leads ?? []);
      if (dbLeads.length === 0) {
        setToast({
          msg: statusFilter === "saved" ? "Keine gespeicherten Leads vorhanden." : "Keine Leads in der Datenbank.",
          type: "error",
        });
        return;
      }
      // Saved IDs aus den geladenen Leads übernehmen
      const newSaved = new Set<string>(
        (d.leads ?? [])
          .filter((l: Record<string, unknown>) => l.status === "saved")
          .map((l: Record<string, unknown>) => String(l.place_id))
      );
      setSavedIds(newSaved);
      setRawLeads(dbLeads);
      setSearchedCity(statusFilter === "saved" ? "Gespeichert" : "Alle");
      setHasSearched(true);
      setFilter("all");
      setSearch("");
      setExpanded(null);
      setToast({
        msg: `${dbLeads.length} Lead${dbLeads.length !== 1 ? "s" : ""} geladen.`,
        type: "success",
      });
    } catch (err: unknown) {
      setToast({ msg: (err as Error).message ?? "Netzwerkfehler", type: "error" });
    } finally {
      setLoadingAll(false);
    }
  };

  const handleSaveLead = async (placeId: string) => {
    if (!placeId || savingId === placeId) return;
    const isAlreadySaved = savedIds.has(placeId);
    const newStatus = isAlreadySaved ? "new" : "saved";

    setSavingId(placeId);
    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isAlreadySaved) next.delete(placeId);
      else next.add(placeId);
      return next;
    });

    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId, status: newStatus }),
      });
      if (!res.ok) {
        // Rollback
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (isAlreadySaved) next.add(placeId);
          else next.delete(placeId);
          return next;
        });
        const d = await res.json();
        setToast({ msg: d.error ?? "Speichern fehlgeschlagen", type: "error" });
      }
    } catch {
      // Rollback
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isAlreadySaved) next.add(placeId);
        else next.delete(placeId);
        return next;
      });
      setToast({ msg: "Netzwerkfehler beim Speichern", type: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const doExport = () => {
    const cols = ["Name", "Telefon", "Adresse", "Stadt", "PLZ", "Kategorie", "Bewertung", "Bewertungen", "Score"];
    const csv = [
      cols.join(","),
      ...filtered.map((r) =>
        [r.name, r.phone || r.internationalPhone, r.address, r.city, r.postal, r.category, r.rating, r.reviews, r._s]
          .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `leads-${searchedCity}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const statCards: { label: string; value: number; color: string; filterKey: FilterType }[] = [
    { label: "Gesamt", value: stats.total, color: "text-white", filterKey: "all" },
    { label: "Heiße Leads", value: stats.hot, color: "text-green-400", filterKey: "hot" },
    { label: "Mit Telefon", value: stats.hasPhone, color: "text-blue-400", filterKey: "has-phone" },
    { label: "Ohne Telefon", value: stats.noPhone, color: "text-zinc-500", filterKey: "no-phone" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="px-5 py-3.5 border-b border-zinc-900 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[4px] text-green-400 font-extrabold">STUDIOWEBLIX</span>
          <span className="text-zinc-800">|</span>
          <span className="text-xs text-zinc-500">Lead Finder</span>
        </div>
        <div className="flex gap-1.5">
          <Link
            href="/crm"
            className="bg-transparent border border-zinc-700 text-zinc-400 hover:border-green-700 hover:text-green-400 px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5"
          >
            📋 CRM
          </Link>
          <button
            onClick={() => handleFetchAllLeads()}
            disabled={loadingAll || loading}
            className="bg-transparent border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40 px-3.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1.5"
          >
            Alle Leads
          </button>
          {hasSearched && filtered.length > 0 && (
            <button
              onClick={doExport}
              className="bg-green-400 text-black px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-green-300 transition-colors"
            >
              ↓ CSV Export
            </button>
          )}
        </div>
      </header>

      {/* Search Form */}
      <div className="max-w-2xl mx-auto px-5 pt-10 pb-6">
        {!hasSearched && (
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Restaurants ohne Website finden
            </h1>
            <p className="text-sm text-zinc-500">
              Gibt Stadt und Radius ein – die Google Places API sucht automatisch nach potenziellen Kunden.
            </p>
          </div>
        )}

        <form onSubmit={handleSearch} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
          {/* City */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Stadt</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="z.B. Kempten, München, Hamburg..."
              disabled={loading}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Radius</label>
              <span className="text-xs font-bold text-white bg-zinc-800 px-2.5 py-1 rounded-lg">
                {radiusKm} km
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              disabled={loading}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-700 accent-green-400 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>1 km</span><span>15 km</span>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Kategorien</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
                      active
                        ? "bg-green-950 border-green-700 text-green-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !city.trim() || categories.length === 0}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                Suche läuft (kann 30–60 Sekunden dauern)...
              </>
            ) : (
              "Leads finden"
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {hasSearched && scored.length > 0 && (
        <div className="max-w-5xl mx-auto px-5 pb-12">
          {/* Stats */}
          <div className="flex gap-2 flex-wrap mb-3">
            {statCards.map((s) => (
              <div
                key={s.filterKey}
                onClick={() => setFilter(s.filterKey)}
                className={`${
                  filter === s.filterKey ? "bg-zinc-900" : "bg-zinc-950/80"
                } ${
                  filter === s.filterKey
                    ? `border ${s.color.replace("text-", "border-")}`
                    : "border border-zinc-900"
                } rounded-xl px-4 py-3 cursor-pointer min-w-[90px] flex-1 hover:bg-zinc-900/80 transition-colors`}
              >
                <div className="text-[10px] text-zinc-600 mb-1">{s.label}</div>
                <div className={`text-[22px] font-extrabold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Search + Sort bar */}
          <div className="flex gap-1.5 flex-wrap items-center mb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Name, Stadt, Kategorie..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-xs flex-1 min-w-[200px] outline-none focus:border-zinc-600 placeholder:text-zinc-600 transition-colors"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] outline-none cursor-pointer"
            >
              <option value="score">Score</option>
              <option value="name">Name</option>
              <option value="rating">Bewertung</option>
            </select>
            <span className="text-[11px] text-zinc-600">{filtered.length} Leads</span>
          </div>

          {/* Lead Cards */}
          <div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-sm">
                Keine Leads für diese Filtereinstellung.
              </div>
            )}

            {filtered.map((r, i) => {
              const isExpanded = expanded === i;
              return (
                <div
                  key={r.name + i}
                  onClick={() => setExpanded(isExpanded ? null : i)}
                  className={`bg-zinc-900/50 rounded-lg mb-0.5 border cursor-pointer overflow-hidden hover:bg-zinc-900/70 transition-colors ${
                    isExpanded ? "border-zinc-700" : "border-zinc-900"
                  }`}
                >
                  {/* Row */}
                  <div className="px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap">
                    <div className="w-[75px] shrink-0">
                      <ScoreBadge score={r._s} />
                    </div>

                    <div className="flex-1 min-w-[110px]">
                      <div className="font-bold text-[13px]">{r.name}</div>
                      <div className="text-[10px] text-zinc-600">
                        {r.category}
                        {r.city ? " · " + r.city : ""}
                      </div>
                    </div>

                    <div className="flex-1 min-w-[100px]">
                      {r.phone ? (
                        <a
                          href={"tel:" + (r.internationalPhone || r.phone)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-400 text-xs no-underline hover:text-blue-300"
                        >
                          📞 {r.phone}
                        </a>
                      ) : (
                        <span className="text-zinc-700 text-[11px]">Kein Telefon</span>
                      )}
                    </div>

                    <div className="w-[130px] shrink-0">
                      <span className="text-red-400 text-[11px] font-bold">🚫 Keine Website</span>
                    </div>

                    <div className="w-[60px] shrink-0 text-right">
                      {r.rating > 0 ? (
                        <>
                          <span className="text-yellow-300 text-xs">★{r.rating.toFixed(1)}</span>
                          {r.reviews > 0 && (
                            <div className="text-zinc-600 text-[9px]">{r.reviews} Bew.</div>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      {r._r.map((reason, j) => (
                        <span key={j} className="bg-zinc-800 text-zinc-500 text-[9px] px-1.5 py-0.5 rounded">
                          {reason}
                        </span>
                      ))}
                    </div>

                    {/* Save button (inline) */}
                    {r.placeId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveLead(r.placeId); }}
                        disabled={savingId === r.placeId}
                        title={savedIds.has(r.placeId) ? "Gespeichert – klicken zum Entfernen" : "Lead speichern"}
                        className={`ml-auto shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                          savedIds.has(r.placeId)
                            ? "bg-green-950 border-green-700 text-green-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                        } ${savingId === r.placeId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {savedIds.has(r.placeId) ? "✓ CRM" : "+ CRM"}
                      </button>
                    )}
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3 border-t border-zinc-800">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2.5 text-[11px]">
                        {r.address && (
                          <div>
                            <span className="text-zinc-600">Adresse:</span>{" "}
                            <span className="text-zinc-400">{r.address}</span>
                          </div>
                        )}
                        {r.city && (
                          <div>
                            <span className="text-zinc-600">Stadt:</span>{" "}
                            <span className="text-zinc-400">
                              {r.postal} {r.city}
                            </span>
                          </div>
                        )}
                        {r.subtypes && (
                          <div className="col-span-2">
                            <span className="text-zinc-600">Typen:</span>{" "}
                            <span className="text-zinc-400">{r.subtypes}</span>
                          </div>
                        )}
                        {r.verified && (
                          <div>
                            <span className="text-zinc-600">Status:</span>{" "}
                            <span className="text-green-400">Geöffnet / Aktiv</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        {r.phone && (
                          <a
                            href={"tel:" + (r.internationalPhone || r.phone)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-green-400 text-black px-3 py-1 rounded-md text-[11px] font-bold no-underline hover:bg-green-300 transition-colors"
                          >
                            📞 Anrufen
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + " " + r.city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-md text-[11px] no-underline hover:bg-zinc-700 transition-colors"
                        >
                          📍 Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
