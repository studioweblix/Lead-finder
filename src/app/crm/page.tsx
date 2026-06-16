"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

// ---- Types ------------------------------------------------------------------

interface CrmLead {
  place_id: string;
  name: string;
  phone: string | null;
  international_phone: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  primary_type: string | null;
  rating: number | null;
  business_status: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  last_seen_at: string | null;
}

type CrmStatus = "saved" | "called" | "callback" | "interested" | "not_interested" | "converted";
type FilterTab = "all" | CrmStatus;

// ---- Config -----------------------------------------------------------------

const STATUS_CONFIG: Record<CrmStatus, { label: string; dot: string; active: string; activeText: string }> = {
  saved:          { label: "Offen",        dot: "bg-zinc-500",    active: "bg-zinc-800 text-zinc-200 border-zinc-600",    activeText: "text-zinc-400"   },
  called:         { label: "Angerufen",    dot: "bg-sky-500",     active: "bg-sky-950 text-sky-300 border-sky-800",       activeText: "text-sky-400"    },
  callback:       { label: "Rückruf",      dot: "bg-amber-400",   active: "bg-amber-950 text-amber-300 border-amber-700", activeText: "text-amber-400"  },
  interested:     { label: "Interessiert", dot: "bg-emerald-500", active: "bg-emerald-950 text-emerald-300 border-emerald-700", activeText: "text-emerald-400"},
  not_interested: { label: "Abgesagt",     dot: "bg-red-500",     active: "bg-red-950 text-red-400 border-red-800",       activeText: "text-red-500"    },
  converted:      { label: "Gewonnen",     dot: "bg-green-400",   active: "bg-green-950 text-green-300 border-green-700", activeText: "text-green-400"  },
};

const CRM_STATUSES = Object.keys(STATUS_CONFIG) as CrmStatus[];

// ---- Helpers ----------------------------------------------------------------

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function StatusDot({ status }: { status: string }) {
  const dot = STATUS_CONFIG[status as CrmStatus]?.dot ?? "bg-zinc-600";
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />;
}

// ---- Main -------------------------------------------------------------------

export default function CrmPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notesSaving, setNotesSaving] = useState<Set<string>>(new Set());
  const [notesSaved, setNotesSaved] = useState<Set<string>>(new Set());
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads?limit=500");
      if (!res.ok) return;
      const d = await res.json();
      setLeads((d.leads ?? []).filter((l: CrmLead) => l.status !== "new"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const updateStatus = async (placeId: string, status: CrmStatus) => {
    setSavingId(placeId);
    setLeads((prev) => prev.map((l) => l.place_id === placeId ? { ...l, status } : l));
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId, status }),
      });
    } finally {
      setSavingId(null);
    }
  };

  const removeLead = async (placeId: string) => {
    setRemovingId(placeId);
    setLeads((prev) => prev.filter((l) => l.place_id !== placeId));
    await fetch(`/api/leads?place_id=${encodeURIComponent(placeId)}`, { method: "DELETE" });
    setRemovingId(null);
  };

  const updateNotes = (placeId: string, notes: string) => {
    setLeads((prev) => prev.map((l) => l.place_id === placeId ? { ...l, notes } : l));
    if (debounceTimers.current[placeId]) clearTimeout(debounceTimers.current[placeId]);
    setNotesSaved((prev) => { const n = new Set(prev); n.delete(placeId); return n; });
    debounceTimers.current[placeId] = setTimeout(async () => {
      setNotesSaving((prev) => new Set(prev).add(placeId));
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId, notes }),
      });
      setNotesSaving((prev) => { const n = new Set(prev); n.delete(placeId); return n; });
      setNotesSaved((prev) => new Set(prev).add(placeId));
      setTimeout(() => setNotesSaved((prev) => { const n = new Set(prev); n.delete(placeId); return n; }), 2000);
    }, 1000);
  };

  const stats = CRM_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (l.name + l.city + l.primary_type + l.phone + (l.notes ?? "")).toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-[4px] text-green-400 font-extrabold">STUDIOWEBLIX</span>
          <span className="text-zinc-700">·</span>
          <span className="text-sm text-zinc-400">CRM</span>
        </div>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Lead Finder
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Pipeline summary */}
        <div className="flex items-center gap-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-sm transition-colors ${filter === "all" ? "text-white font-semibold" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            Alle <span className="ml-1 text-zinc-500 font-normal">{leads.length}</span>
          </button>
          {CRM_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "all" : s)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                filter === s ? "text-white font-semibold" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <StatusDot status={s} />
              {STATUS_CONFIG[s].label}
              <span className="text-zinc-600 font-normal">{stats[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen…"
          className="w-full bg-transparent border-b border-zinc-800 py-2 text-sm text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors"
        />

        {/* States */}
        {loading && (
          <p className="text-sm text-zinc-600 py-8 text-center">Lädt…</p>
        )}

        {!loading && leads.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <p className="text-zinc-400 text-sm">Noch keine gespeicherten Leads.</p>
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 underline transition-colors">
              Zum Lead Finder →
            </Link>
          </div>
        )}

        {!loading && leads.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-zinc-600 py-8 text-center">Keine Ergebnisse.</p>
        )}

        {/* Lead list */}
        <div className="space-y-2">
          {filtered.map((lead) => {
            const phone = lead.phone ?? lead.international_phone;
            const cfg = STATUS_CONFIG[lead.status as CrmStatus] ?? STATUS_CONFIG.saved;

            return (
              <div key={lead.place_id} className="border border-zinc-800/70 rounded-xl px-5 py-4 space-y-3 hover:border-zinc-700 transition-colors">
                {/* Row 1: status dot + name + call */}
                <div className="flex items-start gap-3">
                  <StatusDot status={lead.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight">{lead.name}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {[
                        lead.primary_type?.replace(/_/g, " "),
                        lead.city,
                        lead.rating ? "★" + lead.rating.toFixed(1) : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {phone ? (
                    <a
                      href={"tel:" + (lead.international_phone ?? phone)}
                      onClick={() => { if (lead.status === "saved") updateStatus(lead.place_id, "called"); }}
                      className="text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-all shrink-0 font-mono"
                    >
                      {phone}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-700">Kein Telefon</span>
                  )}
                  <button
                    onClick={() => removeLead(lead.place_id)}
                    disabled={removingId === lead.place_id}
                    title="Lead entfernen"
                    className="text-zinc-700 hover:text-zinc-400 transition-colors text-base leading-none shrink-0 disabled:opacity-30 ml-1"
                  >
                    ×
                  </button>
                </div>

                {/* Row 2: status pills */}
                <div className="flex flex-wrap gap-1.5 pl-[18px]">
                  {CRM_STATUSES.map((s) => {
                    const isActive = lead.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(lead.place_id, s)}
                        disabled={savingId === lead.place_id}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-all disabled:opacity-40 ${
                          isActive
                            ? cfg.active
                            : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                        }`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    );
                  })}
                </div>

                {/* Row 3: notes */}
                <div className="pl-[18px] relative">
                  <textarea
                    value={lead.notes ?? ""}
                    onChange={(e) => updateNotes(lead.place_id, e.target.value)}
                    placeholder="Notizen…"
                    rows={lead.notes ? Math.min(Math.ceil(lead.notes.length / 80) + 1, 4) : 1}
                    className="w-full bg-transparent text-xs text-zinc-400 placeholder:text-zinc-700 outline-none resize-none border-none leading-relaxed"
                  />
                  <span className="absolute right-0 bottom-0 text-[9px] text-zinc-700">
                    {notesSaving.has(lead.place_id) && "speichert…"}
                    {notesSaved.has(lead.place_id) && "gespeichert"}
                  </span>
                </div>

                {/* Row 4: meta */}
                <p className="pl-[18px] text-[10px] text-zinc-700">
                  {formatDate(lead.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
