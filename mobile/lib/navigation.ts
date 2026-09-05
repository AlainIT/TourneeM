import { Alert, Linking, Platform } from 'react-native';

// Liens universels https (maps.apple.com / google.com/maps) plutôt que des
// schémas personnalisés (maps://, comgooglemaps://) : ces derniers exigent une
// déclaration LSApplicationQueriesSchemes sur iOS et échouaient silencieusement
// sans elle. Un lien https ouvre l'app native si elle est installée, sinon une
// page web — fiable dans tous les cas, sans configuration supplémentaire.
export async function openNavigationTo(params: { lat: number; lon: number; label?: string }): Promise<void> {
  const destination = `${params.lat},${params.lon}`;
  const url = Platform.select({
    ios: `https://maps.apple.com/?daddr=${destination}${params.label ? `&q=${encodeURIComponent(params.label)}` : ''}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
  });

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Impossible d'ouvrir l'itinéraire", "Aucune application de navigation n'a pu être ouverte.");
  }
}

export function openMultiStopNavigation(stops: { lat: number; lon: number }[]): void {
  if (stops.length === 0) return;
  const coords = stops.map((s) => `${s.lat},${s.lon}`);
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(0, -1).join('|');
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}${
    waypoints ? `&waypoints=${waypoints}` : ''
  }&travelmode=driving`;
  Linking.openURL(url).catch(() => {
    Alert.alert("Impossible d'ouvrir l'itinéraire", "Aucune application de navigation n'a pu être ouverte.");
  });
}
