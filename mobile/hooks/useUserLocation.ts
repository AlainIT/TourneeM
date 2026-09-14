import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  lat: number;
  lon: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Position fraîche à la demande (ex. juste avant un tri par proximité) :
  // la position ambiante ci-dessous n'est mise à jour que tous les 50m ou
  // 15s, donc potentiellement obsolète au moment précis où on en a besoin.
  const refresh = useCallback(async (): Promise<UserLocation | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      return null;
    }
    setRefreshing(true);
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const fresh = { lat: current.coords.latitude, lon: current.coords.longitude };
      setLocation(fresh);
      return fresh;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: current.coords.latitude, lon: current.coords.longitude });

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 50 },
        (update) => setLocation({ lat: update.coords.latitude, lon: update.coords.longitude }),
      );
    })();

    return () => subscription?.remove();
  }, []);

  return { location, permissionDenied, refreshing, refresh };
}
