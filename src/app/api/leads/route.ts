import { type NextRequest } from "next/server";
import { leadsSupabase } from "@/lib/leadsSupabase";

export async function GET(request: NextRequest) {
  if (!leadsSupabase) {
    return Response.json(
      { error: "Supabase nicht konfiguriert." },
      { status: 503 }
    );
  }

  const params = request.nextUrl.searchParams;

  // Sonderfall: distinct gesuchte Städte zurückgeben
  if (params.get("distinct_cities") === "true") {
    const { data, error } = await leadsSupabase
      .from("leads")
      .select("source_search")
      .not("source_search", "is", null);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const cities = [...new Set((data ?? []).map((r) => r.source_search as string).filter(Boolean))];
    return Response.json({ cities });
  }

  const city = params.get("city");
  const status = params.get("status");
  const limit = Math.min(parseInt(params.get("limit") ?? "200"), 500);

  let query = leadsSupabase
    .from("leads")
    .select(
      "place_id, name, phone, international_phone, address, city, postcode, " +
      "country, primary_type, types, rating, has_website, website_url, " +
      "business_status, status, notes, instagram, created_at, last_seen_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (city) query = query.ilike("city", `%${city}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ leads: data ?? [], count: (data ?? []).length });
}

export async function DELETE(request: NextRequest) {
  if (!leadsSupabase) {
    return Response.json({ error: "Supabase nicht konfiguriert." }, { status: 503 });
  }

  const place_id = request.nextUrl.searchParams.get("place_id");
  if (!place_id) {
    return Response.json({ error: "place_id fehlt" }, { status: 400 });
  }

  const { error } = await leadsSupabase
    .from("leads")
    .update({ status: "new" })
    .eq("place_id", place_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  if (!leadsSupabase) {
    return Response.json({ error: "Supabase nicht konfiguriert." }, { status: 503 });
  }

  let body: { place_id?: string; status?: string; notes?: string; instagram?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ungültiger Body" }, { status: 400 });
  }

  const { place_id, status, notes, instagram } = body;
  if (!place_id) {
    return Response.json({ error: "place_id ist erforderlich" }, { status: 400 });
  }
  if (!status && notes === undefined && instagram === undefined) {
    return Response.json({ error: "Mindestens ein Feld muss angegeben werden" }, { status: 400 });
  }

  const ALLOWED_STATUSES = ["new", "saved", "called", "callback", "interested", "not_interested", "converted"];
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return Response.json({ error: `Ungültiger Status. Erlaubt: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (status) update.status = status;
  if (notes !== undefined) update.notes = notes;
  if (instagram !== undefined) update.instagram = instagram;

  const { error } = await leadsSupabase
    .from("leads")
    .update(update)
    .eq("place_id", place_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, place_id, ...update });
}
