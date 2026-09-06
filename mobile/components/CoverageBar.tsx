import { StyleSheet, Text, View } from 'react-native';
import type { CiblageCoverage } from '../lib/filters';
import { ciblageColor, colors, spacing } from '../lib/theme';

interface Props {
  coverage: CiblageCoverage[];
}

// Où concentrer l'effort de visite en un coup d'œil : combien de médecins de
// chaque priorité ont déjà été vus au moins une fois. Une seule ligne fine,
// discrète — ce n'est qu'un repère, pas un bloc à mettre en avant.
export function CoverageBar({ coverage }: Props) {
  const withDoctors = coverage.filter((c) => c.total > 0);
  if (withDoctors.length === 0) return null;

  return (
    <View style={styles.row}>
      {withDoctors.map((c, i) => (
        <View key={c.ciblage} style={styles.item}>
          {i > 0 && <Text style={styles.separator}>·</Text>}
          <View style={[styles.dot, { backgroundColor: ciblageColor[c.ciblage] }]} />
          <Text style={styles.label}>
            {c.ciblage} {c.visited}/{c.total}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center' },
  separator: { color: colors.border, marginHorizontal: spacing.xs, fontSize: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  label: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});
