import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useManagedSectors } from '../../hooks/useTeam';
import { useDoctors } from '../../hooks/useDoctors';
import { useLastVisits } from '../../hooks/useLastVisits';
import { computeCoverageByCiblage } from '../../lib/filters';
import { listOverdueDoctors } from '../../lib/reminders';
import { CoverageBar } from '../../components/CoverageBar';
import type { Sector } from '../../lib/types';
import { colors, radius, spacing } from '../../lib/theme';

function SectorCard({ sector }: { sector: Sector }) {
  const { data: doctors = [], isLoading } = useDoctors(sector.id);
  const { data: lastVisits = {} } = useLastVisits(sector.id);
  const coverage = computeCoverageByCiblage(doctors, lastVisits);
  const overdueCount = listOverdueDoctors(doctors, lastVisits).length;
  const activeCount = doctors.filter((d) => d.actif).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="location" size={16} color={colors.primary} />
        <Text style={styles.cardTitle}>{sector.nom}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
      ) : (
        <>
          <Text style={styles.cardMeta}>{activeCount} médecin{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}</Text>
          <CoverageBar coverage={coverage} />
          {overdueCount > 0 && (
            <View style={styles.overdueRow}>
              <Ionicons name="alarm" size={14} color={colors.danger} />
              <Text style={styles.overdueText}>
                {overdueCount} médecin{overdueCount > 1 ? 's' : ''} en retard de visite
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function Team() {
  const { data: managed = [], isLoading } = useManagedSectors();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Équipe</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : managed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            Vous n'êtes manager d'aucun secteur pour l'instant. Une déléguée peut vous inviter depuis son
            onglet Profil.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
          {managed.map(({ sector }) => (
            <SectorCard key={sector.id} sector={sector} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  cardTitle: { marginLeft: spacing.xs, fontWeight: '800', fontSize: 15, color: colors.textPrimary },
  cardMeta: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xs },
  overdueRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  overdueText: { marginLeft: spacing.xs, color: colors.danger, fontWeight: '600', fontSize: 12 },
});
