"use client";

import { useState, useMemo, useRef } from "react";
import { Lead, ScoredLead, FilterType, SortType } from "@/lib/types";
import { parseCSVtoLeads } from "@/lib/csv-parser";
import { scoreLead, getScoreInfo } from "@/lib/scoring";
import { DEFAULT_DATA } from "@/lib/default-data";

function ScoreBadge({ score }: { score: number }) {
  const info = getScoreInfo(score);
  return (
    <span className={`${info.bg} ${info.border} ${info.text} border px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap`}>
      {score}% {info.label}
    </span>
  );
}

export default function Home() {
  const [rawData, setRawData] = useState<Lead[]>(DEFAULT_DATA);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("score");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [fileName, setFileName] = useState("Restaurant Bayern (Standard)");
  const [drag, setDrag] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadErr(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      setUploadErr(
        "XLSX wird nicht direkt unterstützt. Bitte speichere die Datei als CSV (Datei → Speichern unter → CSV) und lade die CSV hoch."
      );
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCSVtoLeads(text);
      if (!parsed) {
        setUploadErr("Konnte die Daten nicht lesen. Stelle sicher dass es eine CSV oder TSV Datei ist.");
        return;
      }
      setRawData(parsed);
      setFileName(file.name);
      setFilter("all");
      setSearch("");
      setExpanded(null);
    } catch (e) {
      setUploadErr("Fehler: " + (e as Error).message);
    }
  };

  const leads: ScoredLead[] = useMemo(
    () =>
      rawData.map((r) => {
        const { score, reasons } = scoreLead(r);
        return { ...r, _s: score, _r: reasons };
      }),
    [rawData]
  );

  const stats = useMemo(
    () => ({
      total: leads.length,
      noWeb: leads.filter((r) => !r.website).length,
      hasWeb: leads.filter((r) => !!r.website).length,
      hasPhone: leads.filter((r) => !!r.phone).length,
      hot: leads.filter((r) => r._s >= 55).length,
    }),
    [leads]
  );

  const filtered = useMemo(() => {
    let rows = [...leads];
    if (filter === "hot") rows = rows.filter((r) => r._s >= 55);
    if (filter === "no-website") rows = rows.filter((r) => !r.website);
    if (filter === "has-website") rows = rows.filter((r) => !!r.website);
    if (filter === "has-phone") rows = rows.filter((r) => !!r.phone);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.name + r.category + r.city + r.address + r.subtypes).toLowerCase().includes(q)
      );
    }

    if (sortBy === "score") rows.sort((a, b) => b._s - a._s);
    else if (sortBy === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "rating") rows.sort((a, b) => b.rating - a.rating);

    return rows;
  }, [leads, filter, search, sortBy]);

  const doExport = () => {
    const cols = ["Name", "Telefon", "Website", "Adresse", "Stadt", "Kategorie", "Bewertung", "Bewertungen", "Score", "Status"];
    const csv = [
      cols.join(","),
      ...filtered.map((r) =>
        [r.name, r.phone, r.website, r.address, r.city, r.category, r.rating, r.reviews, r._s, getScoreInfo(r._s).label]
          .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `leads-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const statCards: { label: string; value: number; color: string; filterKey: FilterType }[] = [
    { label: "Gesamt", value: stats.total, color: "text-white", filterKey: "all" },
    { label: "Heiße Leads", value: stats.hot, color: "text-green-400", filterKey: "hot" },
    { label: "Keine Website", value: stats.noWeb, color: "text-red-400", filterKey: "no-website" },
    { label: "Mit Website", value: stats.hasWeb, color: "text-blue-400", filterKey: "has-website" },
    { label: "Mit Telefon", value: stats.hasPhone, color: "text-violet-400", filterKey: "has-phone" },
  ];

  const borderForCard = (key: FilterType, color: string) =>
    filter === key ? `border ${color.replace("text-", "border-")}` : "border border-zinc-900";

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="px-5 py-3.5 border-b border-zinc-900 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[4px] text-green-400 font-extrabold">STUDIOWEBLIX</span>
          <span className="text-zinc-800">|</span>
          <span className="text-xs text-zinc-500">Lead Filter</span>
          <span className="text-[10px] text-zinc-700 bg-zinc-900 px-2 py-0.5 rounded">
            {fileName}
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={doExport}
            className="bg-green-400 text-black border-none px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-green-300 transition-colors"
          >
            ↓ Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-transparent text-zinc-500 border border-zinc-800 px-3.5 py-1.5 rounded-lg text-[11px] cursor-pointer hover:border-zinc-600 hover:text-zinc-300 transition-colors"
          >
            Neue Datei laden
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      </header>

      {/* Drop Zone Wrapper */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className="transition-all"
      >
        {drag && (
          <div className="p-8 text-center bg-green-400/5 border-2 border-dashed border-green-400 mx-5 mt-3 rounded-xl">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-green-400 text-sm">Datei hier loslassen</div>
          </div>
        )}

        {uploadErr && (
          <div className="mx-5 mt-2 px-4 py-2.5 bg-red-950/50 border border-red-900 rounded-lg text-xs text-red-300">
            {uploadErr}
          </div>
        )}

        {/* Stats */}
        <div className="px-5 pt-4 flex gap-2 flex-wrap">
          {statCards.map((s) => (
            <div
              key={s.filterKey}
              onClick={() => setFilter(s.filterKey)}
              className={`${
                filter === s.filterKey ? "bg-zinc-900" : "bg-zinc-950/80"
              } ${borderForCard(s.filterKey, s.color)} rounded-xl px-4 py-3 cursor-pointer min-w-[100px] flex-1 hover:bg-zinc-900/80 transition-colors`}
            >
              <div className="text-[10px] text-zinc-600 mb-1">{s.label}</div>
              <div className={`text-[22px] font-extrabold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="px-5 py-3 flex gap-1.5 flex-wrap items-center">
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

        {/* Lead List */}
        <div className="px-5 pb-9">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-zinc-600 text-sm">
              Keine Leads gefunden.
            </div>
          )}

          {filtered.map((r, i) => {
            const isExpanded = expanded === i;
            return (
              <div
                key={i}
                onClick={() => setExpanded(isExpanded ? null : i)}
                className={`bg-zinc-900/50 rounded-lg mb-0.5 border cursor-pointer overflow-hidden hover:bg-zinc-900/70 transition-colors ${
                  isExpanded ? "border-zinc-700" : "border-zinc-900"
                }`}
              >
                {/* Row */}
                <div className="px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap">
                  {r.photo && (
                    <img
                      src={r.photo}
                      alt=""
                      className="w-[34px] h-[34px] rounded-md object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}

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
                        href={"tel:" + r.phone}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-400 text-xs no-underline hover:text-blue-300"
                      >
                        📞 {r.phone}
                      </a>
                    ) : (
                      <span className="text-zinc-700 text-[11px]">Kein Telefon</span>
                    )}
                  </div>

                  <div className="w-[110px] shrink-0">
                    {r.website ? (
                      <a
                        href={r.website}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="text-zinc-500 text-[11px] no-underline hover:text-zinc-300"
                      >
                        🌐 Hat Website
                      </a>
                    ) : (
                      <span className="text-red-400 text-[11px] font-bold">🚫 Keine Website</span>
                    )}
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
                      <span
                        key={j}
                        className="bg-zinc-800 text-zinc-500 text-[9px] px-1.5 py-0.5 rounded"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded Details */}
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
                      {r.description && (
                        <div className="col-span-2">
                          <span className="text-zinc-600">Info:</span>{" "}
                          <span className="text-zinc-400">{r.description}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {r.phone && (
                        <a
                          href={"tel:" + r.phone}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-green-400 text-black px-3 py-1 rounded-md text-[11px] font-bold no-underline hover:bg-green-300 transition-colors"
                        >
                          📞 Anrufen
                        </a>
                      )}
                      {r.website && (
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-md text-[11px] no-underline hover:bg-zinc-700 transition-colors"
                        >
                          🌐 Website öffnen
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
