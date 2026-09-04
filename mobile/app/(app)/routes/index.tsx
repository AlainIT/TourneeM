import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSector } from '../../../hooks/useSector';
import { useRoutes } from '../../../hooks/useRoutes';
import { colors, radius, spacing } from '../../../lib/theme';
import type { RouteStatut } from '../../../lib/types';

const STATUT_LABEL: Record<RouteStatut, string> = {
  brouillon: 'Brouillon',
  en_cours: 'En cours',
  terminee: 'Terminée',
};

const STATUT_COLOR: Record<RouteStatut, string> = {
  brouillon: colors.textSecondary,
  en_cours: colors.warning,
  terminee: colors.success,
};

export default function RoutesList() {
  const { data: sector } = useSector();
  const { data: routes = [], refetch, isRefetching } = useRoutes(sector?.id);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Tournées</Text>
      <FlatList
        data={routes}
        keyExtractor={(r) => r.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(app)/routes/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.date}>{new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              <Text style={styles.meta}>
                {item.distance_totale_km != null ? `${item.distance_totale_km} km · ${item.duree_totale_min} min` : 'Ordre non optimisé'}
              </Text>
            </View>
            <View style={[styles.statutBadge, { backgroundColor: STATUT_COLOR[item.statut] }]}>
              <Text style={styles.statutText}>{STATUT_LABEL[item.statut]}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Aucune tournée pour le moment. Sélectionnez des médecins depuis la carte ou la liste pour créer votre
              première tournée.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  date: { fontWeight: '700', color: colors.textPrimary, textTransform: 'capitalize' },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  statutBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, marginRight: spacing.sm },
  statutText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
});
