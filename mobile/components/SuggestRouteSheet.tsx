import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SuggestedDoctor } from '../lib/suggestions';
import { PrimaryButton } from './PrimaryButton';
import { ciblageColor, colors, radius, spacing } from '../lib/theme';

interface Props {
  suggestions: SuggestedDoctor[];
  paddingTop: number;
  onClose: () => void;
  onConfirm: (doctorIds: string[]) => void;
}

// Aperçu (et ajustement) de la tournée du jour suggérée automatiquement à
// partir du ciblage, du retard de visite, du potentiel et de la proximité —
// avant de l'ajouter réellement à la tournée. Décochage possible médecin par
// médecin, comme une liste de courses qu'on affine avant de valider.
export function SuggestRouteSheet({ suggestions, paddingTop, onClose, onConfirm }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setChecked(new Set(suggestions.map((s) => s.doctor.id)));
  }, [suggestions]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View style={[styles.overlay, { paddingTop }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tournée suggérée</Text>
          <Text style={styles.subtitle}>Priorité, retard de visite, potentiel et proximité combinés</Text>
        </View>
        <Pressable hitSlop={16} style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {suggestions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            Rien à suggérer : tous les médecins pertinents sont déjà dans une tournée ou à jour de
            leur fréquence de visite.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
          {suggestions.map(({ doctor, reasons }) => {
            const isChecked = checked.has(doctor.id);
            return (
              <Pressable
                key={doctor.id}
                style={[styles.row, !isChecked && styles.rowUnchecked]}
                onPress={() => toggle(doctor.id)}
              >
                <Ionicons
                  name={isChecked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isChecked ? colors.primary : colors.textSecondary}
                />
                <View style={[styles.badge, { backgroundColor: ciblageColor[doctor.ciblage] }]}>
                  <Text style={styles.badgeText}>{doctor.ciblage}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nom} numberOfLines={1}>
                    {doctor.nom} {doctor.prenom ?? ''}
                  </Text>
                  <Text style={styles.reasons} numberOfLines={1}>
                    {reasons.slice(1).join(' · ') || doctor.ville || ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {suggestions.length > 0 && (
        <View style={styles.footer}>
          <PrimaryButton
            label={`Ajouter ${checked.size} médecin${checked.size > 1 ? 's' : ''} à la tournée`}
            onPress={() => onConfirm(Array.from(checked))}
            disabled={checked.size === 0}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 260 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  rowUnchecked: { opacity: 0.5 },
  badge: { paddingHorizontal: spacing.xs + 2, paddingVertical: 2, borderRadius: radius.pill, marginHorizontal: spacing.sm },
  badgeText: { color: colors.textInverse, fontWeight: '800', fontSize: 10 },
  nom: { fontWeight: '700', color: colors.textPrimary },
  reasons: { color: colors.textSecondary, fontSize: 12, marginTop: 1 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
