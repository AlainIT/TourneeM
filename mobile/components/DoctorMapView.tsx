import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
  type GeoJSONSourceRef,
} from '@maplibre/maplibre-react-native';
import type { PressEventWithFeatures } from '@maplibre/maplibre-react-native';
import type { Doctor } from '../lib/types';
import { doctorsToGeoJSON } from '../lib/geojson';
import { colors } from '../lib/theme';

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

// Zoom maximal auquel les points sont encore regroupés en bulles ; au-delà,
// chaque médecin a son propre marqueur.
const CLUSTER_MAX_ZOOM = 16;

// Paris par défaut si aucun médecin géocodé / pas encore de position utilisateur.
const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566];

interface Props {
  doctors: Doctor[];
  selectedIds: Set<string>;
  onDoctorPress: (doctorId: string) => void;
  centerOn?: { lat: number; lon: number } | null;
}

export function DoctorMapView({ doctors, selectedIds, onDoctorPress, centerOn }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const geojson = useMemo(() => doctorsToGeoJSON(doctors, selectedIds), [doctors, selectedIds]);
  // La mise à jour de la prop `data` d'un GeoJSONSource déjà monté ne se
  // répercute pas de façon fiable sur les couches natives (constaté : la carte
  // reste figée sur l'ancien jeu de points, voire vide, après un changement de
  // filtres). On force un remontage propre de la source dès que le jeu de
  // médecins affichés ou la sélection change réellement, via une clé dérivée.
  const sourceKey = useMemo(
    () => `${doctors.map((d) => d.id).sort().join(',')}|${Array.from(selectedIds).sort().join(',')}`,
    [doctors, selectedIds],
  );

  const center: [number, number] = centerOn
    ? [centerOn.lon, centerOn.lat]
    : geojson.features[0]
      ? (geojson.features[0].geometry.coordinates as [number, number])
      : DEFAULT_CENTER;

  // `initialViewState` de la Camera ne s'applique qu'au montage. La position de
  // l'utilisatrice arrive de façon asynchrone (et continue d'être mise à jour
  // ensuite) : on ne recentre dessus qu'une seule fois, à sa toute première
  // résolution, pour ne pas faire sauter la carte pendant que l'utilisatrice la
  // consulte.
  const hasCenteredOnUser = useRef(false);
  useEffect(() => {
    if (!centerOn || hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;
    cameraRef.current?.easeTo({ center: [centerOn.lon, centerOn.lat], zoom: 12, duration: 500 });
  }, [centerOn]);

  async function handlePress(event: NativeSyntheticEvent<PressEventWithFeatures>) {
    const feature = event.nativeEvent.features?.[0];
    if (!feature) return;

    const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

    if (feature.properties?.cluster) {
      // Zoom exact nécessaire pour éclater CETTE bulle précisément (et pas une
      // autre) — un tap sur une bulle dense zoome moins loin qu'un tap sur une
      // petite bulle voisine ; retaper sur la bulle restante zoome encore plus,
      // jusqu'à voir chaque médecin individuellement.
      const clusterId = feature.properties.cluster_id as number;
      let targetZoom = CLUSTER_MAX_ZOOM;
      try {
        const expansionZoom = await sourceRef.current?.getClusterExpansionZoom(clusterId);
        if (expansionZoom != null) targetZoom = Math.min(expansionZoom + 0.5, CLUSTER_MAX_ZOOM + 2);
      } catch {
        // Repli silencieux sur le zoom max de clustering si l'appel natif échoue.
      }
      cameraRef.current?.easeTo({ center: coordinates, zoom: targetZoom, duration: 400 });
      return;
    }

    if (feature.properties?.id) {
      onDoctorPress(feature.properties.id as string);
    }
  }

  return (
    <View style={styles.container}>
      <MapLibreMap style={styles.map} mapStyle={STYLE_URL}>
        <Camera ref={cameraRef} initialViewState={{ center, zoom: 11 }} />

        <GeoJSONSource
          key={sourceKey}
          ref={sourceRef}
          id="doctors-source"
          data={geojson}
          cluster
          clusterRadius={45}
          clusterMaxZoom={CLUSTER_MAX_ZOOM}
          onPress={handlePress}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': colors.primary,
              'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 26],
              'circle-opacity': 0.9,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count}',
              'text-size': 13,
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            }}
            paint={{ 'text-color': '#FFFFFF' }}
          />
          <Layer
            id="doctor-points"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': [
                'match',
                ['get', 'ciblage'],
                'P1', colors.p1,
                'P2', colors.p2,
                'P3', colors.p3,
                colors.hc,
              ],
              'circle-radius': [
                'interpolate', ['linear'], ['get', 'potentiel_score'],
                0, 7,
                50, 10,
                100, 15,
              ],
              'circle-opacity': 0.92,
              'circle-stroke-width': ['case', ['get', 'selected'], 4, 1.5],
              'circle-stroke-color': ['case', ['get', 'selected'], colors.primary, '#FFFFFF'],
            }}
          />
          <Layer
            id="doctor-mode-badge"
            type="symbol"
            filter={['!', ['has', 'point_count']]}
            layout={{
              'text-field': [
                'match', ['get', 'mode_reception'],
                'SUR_RDV', 'RDV',
                'LIBRE', 'L',
                'ALEATOIRE', 'A',
                'NRP', 'X',
                '',
              ],
              'text-size': 10,
              'text-offset': [0, -1.6],
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': colors.primary,
              'text-halo-color': '#FFFFFF',
              'text-halo-width': 1.5,
            }}
          />
        </GeoJSONSource>
      </MapLibreMap>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
