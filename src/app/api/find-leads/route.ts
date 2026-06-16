import { type NextRequest } from "next/server";
import { leadsSupabase } from "@/lib/leadsSupabase";

// ---- Constants --------------------------------------------------------------

const PLACES_BASE = "https://places.googleapis.com/v1/places";

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.addressComponents," +
  "places.location,places.nationalPhoneNumber,places.internationalPhoneNumber," +
  "places.websiteUri,places.businessStatus,places.primaryType,places.types," +
  "places.rating,nextPageToken";

const CATEGORY_MAP: Record<string, string> = {
  restaurant: "restaurants",
  cafe: "cafes",
  bar: "bars",
  bakery: "bakeries",
  takeaway: "imbiss takeaway",
};

const MAX_API_CALLS = 200;
const MAX_PAGES = 3;
const COST_PER_CALL = 0.032;

// ---- Types ------------------------------------------------------------------

interface AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface PlaceResult {
  id?: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  rating?: number;
}

export interface MappedLead {
  placeId: string;
  name: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  postal: string;
  rating: number;
  reviews: number;
  category: string;
  subtypes: string;
  photo: string;
  description: string;
  verified: boolean;
  internationalPhone: string;
}

// ---- Helpers ----------------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function hatEigeneWebsite(url?: string): boolean {
  if (!url) return false;
  const blocked = [
    "facebook.com", "fb.com", "instagram.com", "tiktok.com",
    "lieferando.de", "ubereats.com", "wolt.com",
    "tripadvisor.com", "tripadvisor.de", "yelp.com", "yelp.de",
    "opentable.com", "thefork.com", "thefork.de",
    "google.com", "goo.gl", "maps.app.goo.gl",
    "gelbeseiten.de", "dasoertliche.de",
  ];
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return !blocked.some((b) => host === b || host.endsWith("." + b));
  } catch {
    return false;
  }
}

function parseAddress(components?: AddressComponent[]) {
  const find = (type: string) =>
    components?.find((c) => c.types?.includes(type))?.longText ?? null;
  return {
    city: find("locality") ?? find("postal_town"),
    postcode: find("postal_code"),
    country: find("country"),
  };
}

function buildGrid(centerLat: number, centerLon: number, radiusKm: number) {
  const offsetDeg = (radiusKm / 2) / 111;
  const points = [];
  for (const dLat of [-offsetDeg, 0, offsetDeg]) {
    for (const dLon of [-offsetDeg, 0, offsetDeg]) {
      points.push({
        lat: centerLat + dLat,
        lon: centerLon + dLon,
        radiusMeters: (radiusKm / 2) * 1000 * 1.2,
      });
    }
  }
  return points;
}

function mapToLead(p: PlaceResult): MappedLead {
  return {
    placeId: p.id ?? "",
    name: p.displayName?.text ?? "Unbekannt",
    phone: p.nationalPhoneNumber ?? "",
    website: "",
    address: p.formattedAddress ?? "",
    city: parseAddress(p.addressComponents).city ?? "",
    postal: parseAddress(p.addressComponents).postcode ?? "",
    rating: p.rating ?? 0,
    reviews: 0,
    category: (p.primaryType ?? "").replace(/_/g, " "),
    subtypes: (p.types ?? []).map((t) => t.replace(/_/g, " ")).join(", "),
    photo: "",
    description: "",
    verified: p.businessStatus === "OPERATIONAL",
    internationalPhone: p.internationalPhoneNumber ?? "",
  };
}

function mapToDbRow(p: PlaceResult, city: string) {
  const addr = parseAddress(p.addressComponents);
  const now = new Date().toISOString();
  return {
    place_id: p.id!,
    name: p.displayName?.text ?? "Unbekannt",
    address: p.formattedAddress ?? null,
    city: addr.city,
    postcode: addr.postcode,
    country: addr.country,
    phone: p.nationalPhoneNumber ?? null,
    international_phone: p.internationalPhoneNumber ?? null,
    lat: p.location?.latitude ?? null,
    lon: p.location?.longitude ?? null,
    business_status: p.businessStatus ?? null,
    primary_type: p.primaryType ?? null,
    types: p.types ?? null,
    rating: p.rating ?? null,
    has_website: false,
    website_url: null,
    source_search: city,
    last_seen_at: now,
  };
}

// ---- API Fetching -----------------------------------------------------------

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        const delay = 2000 * Math.pow(2, attempt);
        console.warn(`[Places API] 429, retry in ${delay}ms (attempt ${attempt + 1})`);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries) throw err;
      await sleep(2000 * Math.pow(2, attempt));
    }
  }
  throw Object.assign(new Error("rate_limit"), { status: 429 });
}

async function fetchAllPages(
  endpoint: "searchNearby" | "searchText",
  body: Record<string, unknown>,
  apiKey: string,
  apiCallCounter: { count: number }
): Promise<PlaceResult[]> {
  const allPlaces: PlaceResult[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (apiCallCounter.count >= MAX_API_CALLS) {
      console.warn("[Places API] Max API calls reached, stopping pagination");
      break;
    }

    const requestBody = pageToken ? { ...body, pageToken } : body;

    const res = await fetchWithRetry(`${PLACES_BASE}:${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    });

    apiCallCounter.count++;

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Places API] ${res.status} on ${endpoint}:`, text.slice(0, 300));
      break;
    }

    const data = await res.json();
    const places: PlaceResult[] = data.places ?? [];
    allPlaces.push(...places);

    pageToken = data.nextPageToken;
    if (!pageToken) break;

    // Google benötigt kurze Pause bevor nextPageToken nutzbar
    await sleep(2000);
  }

  return allPlaces;
}

// Führt Tasks in Batches aus (max concurrent = batchSize)
async function batchRun<T>(
  tasks: (() => Promise<T>)[],
  batchSize = 5
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

// ---- Route Handler ----------------------------------------------------------

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { success: false, error: "GOOGLE_PLACES_API_KEY nicht konfiguriert." },
      { status: 500 }
    );
  }

  let body: { city?: string; radius_km?: number; categories?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Ungültiger Request-Body" }, { status: 400 });
  }

  const rawCity = (body.city ?? "").trim();
  if (!rawCity) {
    return Response.json({ success: false, error: "Bitte eine Stadt eingeben." }, { status: 400 });
  }
  const city = rawCity.charAt(0).toUpperCase() + rawCity.slice(1);
  const radiusKm = Math.min(Math.max(body.radius_km ?? 5, 1), 15);
  const categories = body.categories?.length ? body.categories : ["restaurant"];

  const apiCallCounter = { count: 0 };

  try {
    // ── Stage 1: Geocode ──────────────────────────────────────────────────────
    const geoRes = await fetchWithRetry(`${PLACES_BASE}:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.location",
      },
      body: JSON.stringify({
        textQuery: `${city}, Germany`,
        languageCode: "de",
        regionCode: "DE",
        maxResultCount: 1,
      }),
    });
    apiCallCounter.count++;

    if (!geoRes.ok) {
      const t = await geoRes.text();
      throw new Error(`Geocoding fehlgeschlagen (${geoRes.status}): ${t}`);
    }

    const geoData = await geoRes.json();
    const loc = geoData.places?.[0]?.location;
    if (!loc) {
      return Response.json(
        { success: false, error: `Stadt "${city}" nicht gefunden.` },
        { status: 422 }
      );
    }

    const { latitude: centerLat, longitude: centerLon } = loc;
    const gridPoints = buildGrid(centerLat, centerLon, radiusKm);

    console.log(`\n[Find Leads] ${city}, ${radiusKm}km`);
    console.log(`  Grid: ${gridPoints.length} Punkte × ${categories.length} Kategorien`);

    // ── Stage 2: Nearby Search (Grid × Kategorien) ───────────────────────────
    const allPlaces: PlaceResult[] = [];
    const nearbyTypes = categories.filter((c) => c !== "takeaway");

    if (nearbyTypes.length > 0) {
      // Eine Task pro Grid-Punkt; alle Grid-Punkte einer Kategorie parallel (Batch 5)
      for (const cat of nearbyTypes) {
        const tasks = gridPoints.map((point) => async () => {
          const results = await fetchAllPages(
            "searchNearby",
            {
              includedTypes: [cat],
              locationRestriction: {
                circle: {
                  center: { latitude: point.lat, longitude: point.lon },
                  radius: point.radiusMeters,
                },
              },
              languageCode: "de",
              maxResultCount: 20,
            },
            apiKey,
            apiCallCounter
          );
          return results;
        });

        const catResults = await batchRun(tasks, 5);
        catResults.flat().forEach((p) => allPlaces.push(p));
      }
    }

    // ── Stage 3: Text Search pro Kategorie (Backup) ──────────────────────────
    for (const cat of categories) {
      if (apiCallCounter.count >= MAX_API_CALLS) break;
      const term = CATEGORY_MAP[cat] ?? cat;
      const results = await fetchAllPages(
        "searchText",
        {
          textQuery: `${term} in ${city}, Germany`,
          languageCode: "de",
          regionCode: "DE",
          maxResultCount: 20,
        },
        apiKey,
        apiCallCounter
      );
      allPlaces.push(...results);
    }

    const rawCount = allPlaces.length;

    // ── Stage 4: Dedup + Website-Filter ──────────────────────────────────────
    const seen = new Set<string>();
    const unique: PlaceResult[] = [];
    for (const p of allPlaces) {
      if (p.id && !seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    }

    const withoutWebsite = unique.filter((p) => !hatEigeneWebsite(p.websiteUri));

    console.log(`  API Calls: ${apiCallCounter.count}`);
    console.log(`  Raw places: ${rawCount}`);
    console.log(`  Nach Dedup: ${unique.length}`);
    console.log(`  Ohne eigene Website: ${withoutWebsite.length}`);

    // ── Stage 5: Supabase Dedup & Insert ─────────────────────────────────────
    let newLeadsCount = 0;
    let duplicatesCount = 0;
    let newPlacesForUi: PlaceResult[] = withoutWebsite; // Fallback: alle zeigen

    if (leadsSupabase && withoutWebsite.length > 0) {
      try {
        const placeIds = withoutWebsite.map((p) => p.id!);

        const { data: existing, error: fetchErr } = await leadsSupabase
          .from("leads")
          .select("place_id")
          .in("place_id", placeIds);

        if (fetchErr) throw fetchErr;

        const existingIds = new Set((existing ?? []).map((e) => e.place_id));
        const newPlaces = withoutWebsite.filter((p) => !existingIds.has(p.id!));
        const dupPlaces = withoutWebsite.filter((p) => existingIds.has(p.id!));

        if (newPlaces.length > 0) {
          const { error: insertErr } = await leadsSupabase
            .from("leads")
            .insert(newPlaces.map((p) => mapToDbRow(p, city)));
          if (insertErr) throw insertErr;
        }

        if (dupPlaces.length > 0) {
          await leadsSupabase
            .from("leads")
            .update({ last_seen_at: new Date().toISOString() })
            .in("place_id", dupPlaces.map((p) => p.id!));
        }

        newLeadsCount = newPlaces.length;
        duplicatesCount = dupPlaces.length;
        newPlacesForUi = newPlaces; // Nur neue Leads in der UI anzeigen

        console.log(`  New leads: ${newLeadsCount}, Duplicates: ${duplicatesCount}`);
      } catch (err) {
        console.warn("[Supabase] Fehler, fahre ohne Dedup fort:", err);
        newLeadsCount = withoutWebsite.length;
      }
    } else {
      newLeadsCount = withoutWebsite.length;
      if (!leadsSupabase) console.warn("[Supabase] Client nicht konfiguriert, kein Dedup");
    }

    // ── Stage 6: Search Run loggen ────────────────────────────────────────────
    const estimatedCostUsd = parseFloat((apiCallCounter.count * COST_PER_CALL).toFixed(3));
    const durationMs = Date.now() - startTime;

    console.log(`  Estimated cost: $${estimatedCostUsd.toFixed(2)}`);
    console.log(`  Duration: ${durationMs}ms`);

    if (leadsSupabase) {
      try {
        await leadsSupabase.from("search_runs").insert({
          city,
          radius_km: radiusKm,
          categories,
          found_total: unique.length,
          new_leads: newLeadsCount,
          duplicate_leads: duplicatesCount,
          api_calls: apiCallCounter.count,
          estimated_cost_usd: estimatedCostUsd,
        });
      } catch (err) {
        console.warn("[Supabase] search_runs insert failed:", err);
      }
    }

    // ── Stage 7: Response ─────────────────────────────────────────────────────
    const leadsForUi = newPlacesForUi.slice(0, 200).map(mapToLead);

    if (withoutWebsite.length === 0) {
      return Response.json({
        success: true,
        city,
        stats: {
          found_total: unique.length,
          new_leads: 0,
          duplicates: 0,
          api_calls: apiCallCounter.count,
          estimated_cost_usd: estimatedCostUsd,
          duration_ms: durationMs,
        },
        leads: [],
        message: `Keine Restaurants ohne Website in "${city}" gefunden.`,
      });
    }

    if (leadsForUi.length === 0) {
      return Response.json({
        success: true,
        city,
        stats: {
          found_total: unique.length,
          new_leads: 0,
          duplicates: duplicatesCount,
          api_calls: apiCallCounter.count,
          estimated_cost_usd: estimatedCostUsd,
          duration_ms: durationMs,
        },
        leads: [],
        message: `Alle ${duplicatesCount} gefundenen Leads sind bereits in deiner Datenbank.`,
      });
    }

    return Response.json({
      success: true,
      city,
      stats: {
        found_total: unique.length,
        new_leads: newLeadsCount,
        duplicates: duplicatesCount,
        api_calls: apiCallCounter.count,
        estimated_cost_usd: estimatedCostUsd,
        duration_ms: durationMs,
      },
      leads: leadsForUi,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 429) {
      return Response.json(
        { success: false, error: "Zu viele Anfragen, bitte 1 Minute warten." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
    console.error("[find-leads] Fehler:", e.message);
    return Response.json(
      { success: false, error: e.message ?? "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
