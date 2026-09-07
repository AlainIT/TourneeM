import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../lib/theme';

interface Props {
  count: number;
  active: boolean;
  onPress: () => void;
}

// Rappel discret mais visible : combien de médecins ont dépassé leur
// fréquence de visite cible (frequence_max, ou un défaut par ciblage), qu'ils
// aient déjà été vus ou jamais. Tap = filtre direct sur cette liste.
export function RemindersBanner({ count, active, onPress }: Props) {
  if (count === 0) return null;
  return (
    <Pressable style={[styles.banner, active && styles.bannerActive]} onPress={onPress}>
      <Ionicons name="alarm" size={16} color={active ? colors.textInverse : colors.danger} />
      <Text style={[styles.text, active && styles.textActive]}>
        {count} médecin{count > 1 ? 's' : ''} en retard de visite
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: '#FDECEC',
  },
  bannerActive: { backgroundColor: colors.danger },
  text: { marginLeft: spacing.xs, color: colors.danger, fontWeight: '700', fontSize: 12 },
  textActive: { color: colors.textInverse },
});
