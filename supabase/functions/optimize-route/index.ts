// Edge Function: optimize-route
//
// Entrée : { route_id: string, start: { lat: number, lon: number }, end?: { lat: number, lon: number } }
// Effet : recalcule l'ordre de passage des arrêts de la tournée (route_stops)
// par plus-proche-voisin + amélioration 2-opt, écrit le nouvel ordre ainsi
// que la distance et la durée estimées sur `routes`.
//
// `end` (optionnel, ex. le domicile de la déléguée) fixe le point d'arrivée :
// le trajet retour est alors inclus dans l'optimisation elle-même (l'ordre des
// arrêts en tient compte, pas seulement la distance affichée en plus à la fin).
//
// Coût utilisé pour l'optimisation : distance/durée réelles par la route (API
// Matrix de Mapbox) quand MAPBOX_TOKEN est configuré et que le nombre de
// points tient dans une seule requête (25 coordonnées max sur le plan
// gratuit) ; repli sur une estimation à vol d'oiseau × facteur de sinuosité
// sinon (token absent, tournée trop grande, ou API indisponible).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");

const ROAD_SINUOSITY_FACTOR = 1.3; // vol d'oiseau -> estimation route réelle (repli uniquement)
const AVERAGE_SPEED_KMH = 35; // vitesse moyenne trajets courts urbains/périurbains (repli uniquement)
const MAPBOX_MAX_POINTS = 25; // limite de l'API Matrix Mapbox (plan gratuit)

interface Point {
  id: string;
  lat: number;
  lon: number;
}

interface CostMatrix {
  distanceKm: number[][];
  durationMin: number[][];
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

function buildHaversineMatrix(points: { lat: number; lon: number }[]): number[][] {
  return points.map((a) => points.map((b) => haversineKm(a, b)));
}

// Matrice complète (tous points x tous points) de distance/durée réelles par
// la route, en un seul appel. `null` si le token n'est pas configuré, s'il y
// a trop de points pour une requête, ou si l'API échoue ou ne peut pas
// relier une paire de points (ex. pas de route routière connue) — dans tous
// ces cas, l'appelant retombe sur le vol d'oiseau.
async function buildMapboxMatrix(points: { lat: number; lon: number }[]): Promise<CostMatrix | null> {
  if (!MAPBOX_TOKEN || points.length < 2 || points.length > MAPBOX_MAX_POINTS) return null;

  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
    `?annotations=distance,duration&access_token=${MAPBOX_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const distancesM: (number | null)[][] | undefined = json.distances;
    const durationsS: (number | null)[][] | undefined = json.durations;
    if (!distancesM || !durationsS) return null;

    const n = points.length;
    const distanceKm: number[][] = [];
    const durationMin: number[][] = [];
    for (let i = 0; i < n; i++) {
      distanceKm.push([]);
      durationMin.push([]);
      for (let j = 0; j < n; j++) {
        const dm = distancesM[i]?.[j];
        const ds = durationsS[i]?.[j];
        if (dm == null || ds == null) return null;
        distanceKm[i].push(dm / 1000);
        durationMin[i].push(ds / 60);
      }
    }
    return { distanceKm, durationMin };
  } catch {
    return null;
  }
}

function nearestNeighborOrder(startIdx: number, candidateIdxs: number[], cost: number[][]): number[] {
  const remaining = [...candidateIdxs];
  const ordered: number[] = [];
  let current = startIdx;
  while (remaining.length) {
    let bestPos = 0;
    let bestCost = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = cost[current][remaining[i]];
      if (c < bestCost) {
        bestCost = c;
        bestPos = i;
      }
    }
    const [next] = remaining.splice(bestPos, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

function tourCost(startIdx: number, order: number[], cost: number[][], endIdx?: number): number {
  let total = 0;
  let prev = startIdx;
  for (const idx of order) {
    total += cost[prev][idx];
    prev = idx;
  }
  if (endIdx != null) total += cost[prev][endIdx];
  return total;
}

// Amélioration 2-opt : élimine les croisements évidents de l'itinéraire glouton.
function twoOpt(startIdx: number, order: number[], cost: number[][], endIdx?: number): number[] {
  let improved = true;
  let best = order;
  let bestCost = tourCost(startIdx, best, cost, endIdx);

  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateCost = tourCost(startIdx, candidate, cost, endIdx);
        if (candidateCost < bestCost - 1e-9) {
          best = candidate;
          bestCost = candidateCost;
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
    const { route_id, start, end: endInput } = await req.json();
    if (!route_id || !start || typeof start.lat !== "number" || typeof start.lon !== "number") {
      return new Response(JSON.stringify({ error: "route_id et start {lat, lon} requis" }), { status: 400 });
    }
    const end: { lat: number; lon: number } | undefined =
      endInput && typeof endInput.lat === "number" && typeof endInput.lon === "number"
        ? { lat: endInput.lat, lon: endInput.lon }
        : undefined;

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

    const doctorPoints: Point[] = (stops ?? [])
      .filter((s: any) => s.doctors?.latitude != null && s.doctors?.longitude != null)
      .map((s: any) => ({ id: s.doctor_id, lat: s.doctors.latitude, lon: s.doctors.longitude }));

    const missingGeo = (stops ?? []).length - doctorPoints.length;
    if (doctorPoints.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun médecin géocodé dans cette tournée." }),
        { status: 422 },
      );
    }

    // Index 0 = départ, 1..N = médecins, N+1 = arrivée (domicile) si fournie.
    const points: { lat: number; lon: number }[] = [start, ...doctorPoints, ...(end ? [end] : [])];
    const startIdx = 0;
    const candidateIdxs = doctorPoints.map((_, i) => i + 1);
    const endIdx = end ? points.length - 1 : undefined;

    const mapboxMatrix = await buildMapboxMatrix(points);
    const usingRealRouting = mapboxMatrix != null;
    const distanceMatrix = mapboxMatrix?.distanceKm ?? buildHaversineMatrix(points);
    // On optimise l'ORDRE sur la durée réelle quand elle existe (plus fidèle
    // à "éviter de perdre du temps sur la route" que la distance brute) ;
    // sur le vol d'oiseau, distance et durée sont de toute façon dérivées
    // l'une de l'autre (facteur fixe), donc optimiser sur l'une ou l'autre
    // donne le même ordre.
    const optimizationCost = mapboxMatrix?.durationMin ?? distanceMatrix;

    const greedy = nearestNeighborOrder(startIdx, candidateIdxs, optimizationCost);
    const optimizedIdxs = twoOpt(startIdx, greedy, optimizationCost, endIdx);
    const optimized = optimizedIdxs.map((idx) => doctorPoints[idx - 1]);

    let distanceEstimee: number;
    let dureeMin: number;
    if (usingRealRouting) {
      distanceEstimee = tourCost(startIdx, optimizedIdxs, mapboxMatrix!.distanceKm, endIdx);
      dureeMin = Math.round(tourCost(startIdx, optimizedIdxs, mapboxMatrix!.durationMin, endIdx));
    } else {
      const distanceVolOiseau = tourCost(startIdx, optimizedIdxs, distanceMatrix, endIdx);
      distanceEstimee = distanceVolOiseau * ROAD_SINUOSITY_FACTOR;
      dureeMin = Math.round((distanceEstimee / AVERAGE_SPEED_KMH) * 60);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // `route_stops` a une contrainte unique (route_id, ordre) : écrire toutes les
    // positions finales en parallèle peut faire collisionner transitoirement deux
    // arrêts qui échangent leurs positions (ex. 1<->3), et cet échec passait
    // silencieux (le résultat de l'update n'était pas vérifié). On passe donc par
    // des positions temporaires négatives (jamais en conflit avec les positions
    // existantes ni finales) avant d'écrire les positions définitives.
    const tempUpdates = await Promise.all(
      optimized.map((p, i) =>
        admin.from("route_stops").update({ ordre: -(i + 1) }).eq("route_id", route_id).eq("doctor_id", p.id)
      ),
    );
    const tempErr = tempUpdates.find((r) => r.error)?.error;
    if (tempErr) throw tempErr;

    const finalUpdates = await Promise.all(
      optimized.map((p, i) =>
        admin.from("route_stops").update({ ordre: i + 1 }).eq("route_id", route_id).eq("doctor_id", p.id)
      ),
    );
    const finalErr = finalUpdates.find((r) => r.error)?.error;
    if (finalErr) throw finalErr;

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
        mode_calcul: usingRealRouting ? "route_reelle" : "vol_oiseau",
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
