import { Lead } from "./types";

export function parseCSVtoLeads(text: string): Lead[] | null {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;

  const isTab = lines[0].includes("\t");
  const sep = isTab ? "\t" : null;

  const parseRow = (line: string): string[] => {
    if (sep) return line.split(sep).map((v) => v.trim());
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === "," && !inQ) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);

  const find = (candidates: string[]): number => {
    for (const c of candidates) {
      const idx = headers.findIndex((h) => h && h.toLowerCase() === c);
      if (idx !== -1) return idx;
    }
    for (const c of candidates) {
      const idx = headers.findIndex((h) => h && h.toLowerCase().includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const ni = find(["name"]);
  const pi = find(["phone"]);
  const wi = find(["website", "site"]);
  const ai = find(["address", "full_address"]);
  const ci = find(["city"]);
  const zi = find(["postal_code"]);
  const ri = find(["rating"]);
  const rvi = find(["reviews"]);
  const cai = find(["category"]);
  const si = find(["subtypes"]);
  const phi = find(["photo"]);
  const di = find(["description"]);
  const vi = find(["verified"]);

  const rows: Lead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseRow(lines[i]);
    if (vals.length < 3) continue;

    const g = (idx: number): string => {
      const v = idx >= 0 ? vals[idx] || "" : "";
      return v === "None" || v === "null" || v === "undefined" ? "" : v;
    };

    const name = g(ni);
    if (!name) continue;

    rows.push({
      name,
      phone: g(pi),
      website: g(wi),
      address: g(ai),
      city: g(ci),
      postal: g(zi),
      rating: parseFloat(g(ri)) || 0,
      reviews: parseInt(g(rvi)) || 0,
      category: g(cai),
      subtypes: g(si),
      photo: g(phi),
      description: g(di),
      verified: g(vi) === "True" || g(vi) === "true",
    });
  }

  return rows.length > 0 ? rows : null;
}
