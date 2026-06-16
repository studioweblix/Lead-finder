import { createClient } from "@supabase/supabase-js";

const url = process.env.LEADS_SUPABASE_URL;
const key = process.env.LEADS_SUPABASE_SERVICE_KEY;

export const leadsSupabase =
  url && key
    ? createClient(url, key, { auth: { persistSession: false } })
    : null;
