import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CiblageCoverage } from '../lib/filters';
import { ciblageColor, colors, radius, spacing } from '../lib/theme';

interface Props {
  coverage: CiblageCoverage[];
}

// Où concentrer l'effort de visite en un coup d'œil : combien de médecins de
// chaque priorité ont déjà été vus au moins une fois.
export function CoverageBar({ coverage }: Props) {
  const withDoctors = coverage.filter((c) => c.total > 0);
  if (withDoctors.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {withDoctors.map((c) => (
        <View key={c.ciblage} style={styles.chip}>
          <View style={[styles.dot, { backgroundColor: ciblageColor[c.ciblage] }]} />
          <Text style={styles.label}>
            {c.ciblage} : {c.visited}/{c.total} visités
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  label: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
});
