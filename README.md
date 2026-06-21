# Lead Finder

Findet Restaurants (und andere Gastro-Betriebe) **ohne eigene Website** über die
Google Places API, speichert sie in Supabase und verwaltet sie in einem CRM für
Cold Calls.

## Voraussetzungen

- Node.js 18+
- Ein **Google Places API** Key (mit aktivierter "Places API (New)" und Billing)
- Ein **Supabase** Projekt

## Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Environment-Variablen anlegen

Die App braucht API-Keys, die aus Sicherheitsgründen **nicht** im Git-Repo liegen.
Kopiere die Vorlage und trage deine eigenen Werte ein:

```bash
cp .env.example .env.local
```

Dann `.env.local` öffnen und ausfüllen:

| Variable | Wo bekomme ich das? |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `LEADS_SUPABASE_URL` | Supabase Dashboard → Project Settings → Data API |
| `LEADS_SUPABASE_SERVICE_KEY` | Supabase Dashboard → Project Settings → API Keys (service_role) |

> **Wichtig:** Ohne `GOOGLE_PLACES_API_KEY` zeigt die Suche den Fehler
> *"GOOGLE_PLACES_API_KEY nicht konfiguriert"*. Das ist der häufigste Grund,
> warum die App bei einem neuen Rechner nicht funktioniert.

### 3. Datenbank-Tabellen anlegen

Im Supabase SQL-Editor ausführen:

```sql
create table if not exists public.leads (
  place_id            text primary key,
  name                text not null,
  address             text,
  city                text,
  postcode            text,
  country             text,
  phone               text,
  international_phone  text,
  lat                 double precision,
  lon                 double precision,
  business_status     text,
  primary_type        text,
  types               text[],
  rating              numeric,
  has_website         boolean default false,
  website_url         text,
  instagram           text,
  source_search       text,
  status              text default 'new',
  notes               text,
  last_seen_at        timestamptz,
  created_at          timestamptz default now()
);

create table if not exists public.search_runs (
  id                 bigint generated always as identity primary key,
  city               text,
  radius_km          numeric,
  categories         text[],
  found_total        integer,
  new_leads          integer,
  duplicate_leads    integer,
  api_calls          integer,
  estimated_cost_usd numeric,
  created_at         timestamptz default now()
);
```

### 4. Dev-Server starten

```bash
npm run dev
```

Die App läuft dann unter [http://localhost:3001](http://localhost:3001).

## Troubleshooting

**"GOOGLE_PLACES_API_KEY nicht konfiguriert"**
→ `.env.local` fehlt oder der Key ist leer. Schritt 2 prüfen, danach Dev-Server neu starten.

**"column leads.instagram does not exist" o. ä.**
→ Die Datenbank-Tabellen wurden nicht (oder im falschen Supabase-Projekt) angelegt. Schritt 3 prüfen.

**Suche liefert 0 Ergebnisse**
→ Entweder gibt es in der Stadt keine Betriebe ohne Website, oder der Google API
Key hat kein Billing aktiviert. In der Google Cloud Console prüfen.
