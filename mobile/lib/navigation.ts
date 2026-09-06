import { Alert, Linking } from 'react-native';

// Waze ne gère la navigation que vers une destination unique (pas d'itinéraire
// multi-arrêts via URL) ; Google Maps gère les deux. On propose donc un choix
// pour un médecin seul, et pour une tournée complète on réserve Waze au
// premier arrêt.
function wazeUrl(lat: number, lon: number): string {
  return `waze://?ll=${lat},${lon}&navigate=yes`;
}

function appleMapsUrl(lat: number, lon: number, label?: string): string {
  return `https://maps.apple.com/?daddr=${lat},${lon}${label ? `&q=${encodeURIComponent(label)}` : ''}`;
}

function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
}

async function tryOpen(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export function openNavigationTo(params: { lat: number; lon: number; label?: string }): void {
  Alert.alert("Ouvrir l'itinéraire avec", undefined, [
    { text: 'Google Maps', onPress: () => tryOpen(googleMapsUrl(params.lat, params.lon)) },
    {
      text: 'Waze',
      onPress: async () => {
        const opened = await tryOpen(wazeUrl(params.lat, params.lon));
        if (!opened) Alert.alert('Waze non installé', "L'application Waze n'a pas pu être ouverte.");
      },
    },
    { text: 'Plans (Apple)', onPress: () => tryOpen(appleMapsUrl(params.lat, params.lon, params.label)) },
    { text: 'Annuler', style: 'cancel' },
  ]);
}

export function openMultiStopNavigation(stops: { lat: number; lon: number }[]): void {
  if (stops.length === 0) return;
  const coords = stops.map((s) => `${s.lat},${s.lon}`);
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(0, -1).join('|');
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}${
    waypoints ? `&waypoints=${waypoints}` : ''
  }&travelmode=driving`;

  Alert.alert(
    "Ouvrir l'itinéraire avec",
    stops.length > 1 ? 'Waze ne gère qu\'une destination : il vous emmènera au premier arrêt.' : undefined,
    [
      { text: `Google Maps (${stops.length} arrêt${stops.length > 1 ? 's' : ''})`, onPress: () => tryOpen(googleUrl) },
      {
        text: 'Waze (1er arrêt)',
        onPress: async () => {
          const opened = await tryOpen(wazeUrl(stops[0].lat, stops[0].lon));
          if (!opened) Alert.alert('Waze non installé', "L'application Waze n'a pas pu être ouverte.");
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ],
  );
}
