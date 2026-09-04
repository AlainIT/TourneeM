import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Doctor } from '../lib/types';
import { CIBLAGE_LABEL, MODE_RECEPTION_LABEL } from '../lib/types';
import { ciblageColor, colors, radius, spacing } from '../lib/theme';

interface Props {
  doctor: Doctor;
  selected: boolean;
  selectionMode: boolean;
  lastVisitIso?: string;
  onPress: () => void;
  onToggleSelect: () => void;
}

export function DoctorListItem({ doctor, selected, selectionMode, lastVisitIso, onPress, onToggleSelect }: Props) {
  const color = ciblageColor[doctor.ciblage];

  return (
    <Pressable style={styles.row} onPress={selectionMode ? onToggleSelect : onPress} onLongPress={onToggleSelect}>
      {selectionMode && (
        <View style={[styles.checkbox, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          {selected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
        </View>
      )}
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{doctor.ciblage}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nom} numberOfLines={1}>
          {doctor.nom} {doctor.prenom}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {doctor.specialite ?? ''} · {doctor.ville ?? ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {doctor.mode_reception ? MODE_RECEPTION_LABEL[doctor.mode_reception] : '—'}
          {'  ·  '}Potentiel {doctor.potentiel_score ?? '—'}
          {lastVisitIso ? `  ·  vu le ${new Date(lastVisitIso).toLocaleDateString('fr-FR')}` : '  ·  jamais visité'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginRight: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  badgeText: { color: colors.textInverse, fontWeight: '800', fontSize: 11 },
  info: { flex: 1 },
  nom: { fontWeight: '700', color: colors.textPrimary, fontSize: 15 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
