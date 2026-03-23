import { Lead, ScoreInfo } from "./types";

export function scoreLead(r: Lead): { score: number; reasons: string[] } {
  let s = 0;
  const reasons: string[] = [];

  if (!r.website) {
    s += 40;
    reasons.push("Keine Website");
  } else {
    s += 5;
  }

  if (r.phone) {
    s += 15;
    reasons.push("Telefon");
  }

  if (r.rating >= 4.0 && r.reviews < 50) {
    s += 10;
    reasons.push("Gut, wenig Präsenz");
  }

  if (r.rating > 0) s += 5;
  if (r.reviews > 0) s += 3;
  if (r.reviews > 10) s += 3;
  if (r.reviews > 50) s += 2;
  if (r.verified) s += 2;

  return { score: Math.min(s, 100), reasons };
}

export function getScoreInfo(score: number): ScoreInfo {
  if (score >= 55) {
    return { bg: "bg-green-950", border: "border-green-800", text: "text-green-400", label: "Heiß" };
  }
  if (score >= 30) {
    return { bg: "bg-yellow-950", border: "border-yellow-700", text: "text-yellow-300", label: "Warm" };
  }
  return { bg: "bg-zinc-900", border: "border-zinc-800", text: "text-zinc-600", label: "Kalt" };
}
