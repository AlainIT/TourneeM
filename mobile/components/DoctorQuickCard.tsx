import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Doctor } from '../lib/types';
import { CIBLAGE_LABEL, MODE_RECEPTION_LABEL } from '../lib/types';
import { ciblageColor, colors, radius, spacing } from '../lib/theme';

interface Props {
  doctor: Doctor;
  lastVisitIso?: string;
  selected: boolean;
  onClose: () => void;
  onOpenDetail: () => void;
  onToggleSelect: () => void;
}

export function DoctorQuickCard({ doctor, lastVisitIso, selected, onClose, onOpenDetail, onToggleSelect }: Props) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.closeButton} hitSlop={12} onPress={onClose}>
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>

      <Pressable style={styles.content} onPress={onOpenDetail}>
        <View style={[styles.badge, { backgroundColor: ciblageColor[doctor.ciblage] }]}>
          <Text style={styles.badgeText}>{CIBLAGE_LABEL[doctor.ciblage]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nom} numberOfLines={1}>
            {doctor.nom} {doctor.prenom}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {doctor.specialite ?? ''} {doctor.ville ? `· ${doctor.ville}` : ''}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {doctor.mode_reception ? MODE_RECEPTION_LABEL[doctor.mode_reception] : '—'}
            {'  ·  '}Potentiel {doctor.potentiel_score ?? '—'}
            {'  ·  '}
            {lastVisitIso ? `vu le ${new Date(lastVisitIso).toLocaleDateString('fr-FR')}` : 'jamais visité'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, selected && styles.actionButtonActive]} onPress={onToggleSelect}>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'add-circle-outline'}
            size={18}
            color={selected ? colors.textInverse : colors.primary}
          />
          <Text style={[styles.actionText, selected && styles.actionTextActive]}>
            {selected ? 'Dans la tournée' : 'Ajouter à la tournée'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  closeButton: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 1, padding: spacing.xs },
  content: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.lg },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, marginRight: spacing.sm },
  badgeText: { color: colors.textInverse, fontWeight: '800', fontSize: 11 },
  nom: { fontWeight: '700', color: colors.textPrimary, fontSize: 15 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonActive: { backgroundColor: colors.primary },
  actionText: { marginLeft: spacing.xs, color: colors.primary, fontWeight: '700', fontSize: 13 },
  actionTextActive: { color: colors.textInverse },
});
