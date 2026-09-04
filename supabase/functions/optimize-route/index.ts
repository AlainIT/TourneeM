// Edge Function: optimize-route
//
// Entrée : { route_id: string, start: { lat: number, lon: number } }
// Effet : recalcule l'ordre de passage des arrêts de la tournée (route_stops)
// par plus-proche-voisin + amélioration 2-opt sur distances Haversine, écrit
// le nouvel ordre ainsi que la distance et la durée estimées sur `routes`.
//
// V1 : distance à vol d'oiseau majorée d'un facteur de sinuosité (routes réelles),
// pas d'appel à une API de routage payante. Le facteur et la vitesse moyenne sont
// volontairement simples (visite en zone urbaine/périurbaine) ; à affiner en V2 si
// besoin avec un vrai temps de trajet (Mapbox/Google Directions).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ROAD_SINUOSITY_FACTOR = 1.3; // vol d'oiseau -> estimation route réelle
const AVERAGE_SPEED_KMH = 35; // vitesse moyenne trajets courts urbains/périurbains

interface Point {
  id: string;
  lat: number;
  lon: number;
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestNeighborOrder(start: { lat: number; lon: number }, points: Point[]): Point[] {
  const remaining = [...points];
  const ordered: Point[] = [];
  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

function tourLength(start: { lat: number; lon: number }, order: Point[]): number {
  let total = 0;
  let prev = start;
  for (const p of order) {
    total += haversineKm(prev, p);
    prev = p;
  }
  return total;
}

// Amélioration 2-opt : élimine les croisements évidents de l'itinéraire glouton.
function twoOpt(start: { lat: number; lon: number }, order: Point[]): Point[] {
  let improved = true;
  let best = order;
  let bestLen = tourLength(start, best);

  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateLen = tourLength(start, candidate);
        if (candidateLen < bestLen - 1e-9) {
          best = candidate;
          bestLen = candidateLen;
          improved = true;
        }
      }
    }
  }
  return best;
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { route_id, start } = await req.json();
    if (!route_id || !start || typeof start.lat !== "number" || typeof start.lon !== "number") {
      return new Response(JSON.stringify({ error: "route_id et start {lat, lon} requis" }), { status: 400 });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: route, error: routeErr } = await userClient
      .from("routes")
      .select("id, sector_id")
      .eq("id", route_id)
      .maybeSingle();
    if (routeErr || !route) {
      return new Response(JSON.stringify({ error: "Tournée inaccessible" }), { status: 403 });
    }

    const { data: stops, error: stopsErr } = await userClient
      .from("route_stops")
      .select("id, doctor_id, doctors(id, latitude, longitude)")
      .eq("route_id", route_id);
    if (stopsErr) throw stopsErr;

    const points: Point[] = (stops ?? [])
      .filter((s: any) => s.doctors?.latitude != null && s.doctors?.longitude != null)
      .map((s: any) => ({ id: s.doctor_id, lat: s.doctors.latitude, lon: s.doctors.longitude }));

    const missingGeo = (stops ?? []).length - points.length;
    if (points.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun médecin géocodé dans cette tournée." }),
        { status: 422 },
      );
    }

    const greedy = nearestNeighborOrder(start, points);
    const optimized = twoOpt(start, greedy);
    const distanceVolOiseau = tourLength(start, optimized);
    const distanceEstimee = distanceVolOiseau * ROAD_SINUOSITY_FACTOR;
    const dureeMin = Math.round((distanceEstimee / AVERAGE_SPEED_KMH) * 60);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    await Promise.all(
      optimized.map((p, i) =>
        admin.from("route_stops").update({ ordre: i + 1 }).eq("route_id", route_id).eq("doctor_id", p.id)
      ),
    );

    await admin
      .from("routes")
      .update({
        distance_totale_km: Math.round(distanceEstimee * 10) / 10,
        duree_totale_min: dureeMin,
        point_depart_lat: start.lat,
        point_depart_lon: start.lon,
      })
      .eq("id", route_id);

    return new Response(
      JSON.stringify({
        ordre: optimized.map((p) => p.id),
        distance_totale_km: Math.round(distanceEstimee * 10) / 10,
        duree_totale_min: dureeMin,
        medecins_non_geocodes_ignores: missingGeo,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
    });
  }
});
