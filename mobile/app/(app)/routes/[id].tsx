import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRoute, useRouteStops } from '../../../hooks/useRoutes';
import { useUserLocation } from '../../../hooks/useUserLocation';
import { useSector } from '../../../hooks/useSector';
import { markStopVisited, optimizeRoute, removeStopFromRoute } from '../../../lib/api/routes';
import { markVisited } from '../../../lib/api/visits';
import { exportCsvAndShare } from '../../../lib/export';
import { openMultiStopNavigation } from '../../../lib/navigation';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ciblageColor, colors, radius, spacing } from '../../../lib/theme';

export default function RouteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: route } = useRoute(id);
  const { data: stops = [], refetch } = useRouteStops(id);
  const { location } = useUserLocation();
  const { data: sector } = useSector();

  const [optimizing, setOptimizing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: ['route', id] });
    await queryClient.invalidateQueries({ queryKey: ['route-stops', id] });
  }

  async function handleOptimize() {
    if (!location) {
      setError("Position introuvable — activez la localisation pour optimiser l'ordre de passage.");
      return;
    }
    setError(null);
    setOptimizing(true);
    try {
      await optimizeRoute(id, location);
      await invalidateAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l\'optimisation.');
    } finally {
      setOptimizing(false);
    }
  }

  function openNavigation() {
    const withCoords = stops
      .filter((s) => s.doctor.latitude != null && s.doctor.longitude != null)
      .map((s) => ({ lat: s.doctor.latitude as number, lon: s.doctor.longitude as number }));
    if (withCoords.length === 0) {
      Alert.alert(
        'Aucun médecin géolocalisé',
        "Aucun arrêt de cette tournée n'a de coordonnées GPS valides.",
      );
      return;
    }
    if (withCoords.length < stops.length) {
      Alert.alert(
        'Certains arrêts sont ignorés',
        `${stops.length - withCoords.length} médecin(s) sans coordonnées GPS valides ne figureront pas dans l'itinéraire.`,
        [{ text: 'Continuer', onPress: () => openMultiStopNavigation(withCoords) }],
      );
      return;
    }
    openMultiStopNavigation(withCoords);
  }

  async function handleMarkStopVisited(stopId: string, doctorId: string) {
    if (!sector) return;
    await markStopVisited(stopId);
    await markVisited({ doctorId, sectorId: sector.id, routeId: id });
    await invalidateAll();
    await queryClient.invalidateQueries({ queryKey: ['visits', 'last-per-doctor', sector.id] });
  }

  function handleRemoveStop(doctorId: string) {
    Alert.alert('Retirer de la tournée', 'Retirer ce médecin de la tournée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          await removeStopFromRoute(id, doctorId);
          await invalidateAll();
        },
      },
    ]);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const rows = stops.map((s) => ({
        ordre: s.ordre,
        nom: s.doctor.nom,
        prenom: s.doctor.prenom ?? '',
        specialite: s.doctor.specialite ?? '',
        etablissement: s.doctor.etablissement ?? '',
        adresse: s.doctor.adresse ?? '',
        ville: s.doctor.ville ?? '',
        code_postal: s.doctor.code_postal ?? '',
        ciblage: s.doctor.ciblage,
        mode_reception: s.doctor.mode_reception ?? '',
        statut: s.statut,
      }));
      await exportCsvAndShare(`tournee-${route?.date ?? id}.csv`, rows);
    } finally {
      setExporting(false);
    }
  }

  if (!route) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.header}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} onPress={() => router.back()} />
          <Text style={styles.title}>{new Date(route.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <View style={{ width: 26 }} />
        </View>

        {route.distance_totale_km != null && (
          <View style={styles.summary}>
            <Ionicons name="speedometer" size={16} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              {route.distance_totale_km} km estimés · {route.duree_totale_min} min
            </Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actionsRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <PrimaryButton label="Optimiser l'ordre" onPress={handleOptimize} loading={optimizing} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Itinéraire" onPress={openNavigation} variant="secondary" />
          </View>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <PrimaryButton label="Exporter en CSV" onPress={handleExportCsv} loading={exporting} variant="secondary" />
        </View>

        <Text style={styles.sectionTitle}>{stops.length} arrêt{stops.length > 1 ? 's' : ''}</Text>
        {stops.map((stop) => (
          <View key={stop.id} style={styles.stopRow}>
            <View style={styles.stopNumber}>
              <Text style={styles.stopNumberText}>{stop.ordre}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: ciblageColor[stop.doctor.ciblage] }]}>
              <Text style={styles.badgeText}>{stop.doctor.ciblage}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stopNom} numberOfLines={1}>
                {stop.doctor.nom} {stop.doctor.prenom}
              </Text>
              <Text style={styles.stopMeta} numberOfLines={1}>
                {stop.doctor.ville ?? ''}
              </Text>
            </View>
            {stop.statut === 'fait' ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color={colors.textSecondary}
                onPress={() => handleMarkStopVisited(stop.id, stop.doctor_id)}
              />
            )}
            <Ionicons
              name="close"
              size={20}
              color={colors.textSecondary}
              style={{ marginLeft: spacing.sm }}
              onPress={() => handleRemoveStop(stop.doctor_id)}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  title: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, textTransform: 'capitalize' },
  summary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  summaryText: { marginLeft: spacing.xs, color: colors.textSecondary },
  error: { color: colors.danger, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', paddingHorizontal: spacing.md },
  sectionTitle: { marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', fontSize: 12 },
  stopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  stopNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  stopNumberText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  badge: { paddingHorizontal: spacing.xs + 2, paddingVertical: 2, borderRadius: radius.pill, marginRight: spacing.sm },
  badgeText: { color: colors.textInverse, fontWeight: '800', fontSize: 10 },
  stopNom: { fontWeight: '700', color: colors.textPrimary },
  stopMeta: { color: colors.textSecondary, fontSize: 12 },
});
