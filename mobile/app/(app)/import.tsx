import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSector } from '../../hooks/useSector';
import { useImports, useRunImport } from '../../hooks/useImports';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radius, spacing } from '../../lib/theme';
import type { ImportResult } from '../../lib/api/imports';

export default function ImportScreen() {
  const { data: sector } = useSector();
  const { data: imports = [], refetch, isRefetching } = useImports(sector?.id);
  const runImport = useRunImport(sector?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  async function handleImport() {
    setError(null);
    setLastResult(null);
    setLoading(true);
    try {
      const result = await runImport();
      if (result) setLastResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l\'import.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Import du ciblage</Text>
        <Text style={styles.subtitle}>
          Importer le fichier Excel/CSV du cycle de ciblage. Les médecins déjà connus sont mis à jour ; les médecins
          retirés du ciblage sont conservés (historique) mais marqués inactifs.
        </Text>

        <PrimaryButton label="Choisir un fichier à importer" onPress={handleImport} loading={loading} />

        {error && <Text style={styles.error}>{error}</Text>}

        {lastResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Import terminé</Text>
            <Text style={styles.resultLine}>{lastResult.nb_lignes_total} lignes lues</Text>
            <Text style={styles.resultLine}>{lastResult.nb_crees} médecins créés</Text>
            <Text style={styles.resultLine}>{lastResult.nb_maj} médecins mis à jour</Text>
            <Text style={styles.resultLine}>{lastResult.nb_retires} médecins retirés du ciblage</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Historique des imports</Text>
      <FlatList
        style={{ flex: 1 }}
        data={imports}
        keyExtractor={(i) => i.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <View style={styles.importRow}>
            <Ionicons
              name={item.statut === 'termine' ? 'checkmark-circle' : item.statut === 'erreur' ? 'alert-circle' : 'time'}
              size={20}
              color={item.statut === 'termine' ? colors.success : item.statut === 'erreur' ? colors.danger : colors.textSecondary}
            />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={styles.importFile}>{item.nom_fichier}</Text>
              <Text style={styles.importMeta}>
                {new Date(item.date_import).toLocaleString('fr-FR')} · {item.nb_crees} créés · {item.nb_maj} maj ·{' '}
                {item.nb_retires} retirés
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun import pour le moment.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md, fontSize: 13 },
  error: { color: colors.danger, marginTop: spacing.sm },
  resultCard: { marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  resultTitle: { fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  resultLine: { color: colors.textSecondary, fontSize: 13 },
  sectionTitle: { marginHorizontal: spacing.md, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', fontSize: 12, marginBottom: spacing.xs },
  importRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  importFile: { fontWeight: '700', color: colors.textPrimary },
  importMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textSecondary, marginHorizontal: spacing.md },
});
