const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export interface DrivingResult {
  distanceKm: number;
  durationMin: number;
}

// L'API Matrix de Mapbox limite à 25 coordonnées par appel (1 origine +
// jusqu'à 24 destinations) sur le plan gratuit — on découpe donc en paquets.
const MAX_DESTINATIONS_PER_CALL = 24;

// Distance ET durée de trajet réelles (route), pas à vol d'oiseau — une seule
// origine (la position actuelle) vers plusieurs destinations (les médecins
// affichés), en un minimum d'appels réseau.
export async function getDrivingMatrix(
  origin: { lat: number; lon: number },
  destinations: { id: string; lat: number; lon: number }[],
): Promise<Record<string, DrivingResult>> {
  if (!MAPBOX_TOKEN || destinations.length === 0) return {};

  const result: Record<string, DrivingResult> = {};

  for (let i = 0; i < destinations.length; i += MAX_DESTINATIONS_PER_CALL) {
    const chunk = destinations.slice(i, i + MAX_DESTINATIONS_PER_CALL);
    const coords = [`${origin.lon},${origin.lat}`, ...chunk.map((d) => `${d.lon},${d.lat}`)].join(';');
    const destinationIndexes = chunk.map((_, idx) => idx + 1).join(';');
    const url =
      `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
      `?sources=0&destinations=${destinationIndexes}&annotations=distance,duration&access_token=${MAPBOX_TOKEN}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const distances: (number | null)[] = json.distances?.[0] ?? [];
      const durations: (number | null)[] = json.durations?.[0] ?? [];
      chunk.forEach((d, idx) => {
        const distanceM = distances[idx];
        const durationS = durations[idx];
        if (distanceM != null && durationS != null) {
          result[d.id] = { distanceKm: distanceM / 1000, durationMin: durationS / 60 };
        }
      });
    } catch {
      // Ce paquet échoue (réseau, quota...) : on garde ce qu'on a déjà, le
      // repli sur le vol d'oiseau (côté appelant) couvre les médecins manquants.
    }
  }

  return result;
}
