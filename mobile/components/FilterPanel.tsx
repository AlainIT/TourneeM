import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ciblageColor, colors, spacing } from '../lib/theme';
import { CIBLAGE_LABEL, MODE_RECEPTION_LABEL, type Ciblage, type ModeReception } from '../lib/types';
import { Chip } from './Chip';
import { DEFAULT_FILTERS, type DoctorFilters, type SortMode, type VisitStatusFilter } from '../lib/filters';

interface Props {
  filters: DoctorFilters;
  onChange: (filters: DoctorFilters) => void;
  specialites: string[];
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  resultCount: number;
}

const CIBLAGE_OPTIONS: Ciblage[] = ['P1', 'P2', 'P3', 'HC'];
const MODE_OPTIONS: ModeReception[] = ['LIBRE', 'SUR_RDV', 'ALEATOIRE', 'NRP'];
const VISIT_STATUS_OPTIONS: { value: VisitStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'never', label: 'Jamais visité' },
  { value: 'visited', label: 'Déjà visité' },
  { value: 'stale', label: 'Non vu depuis 60j+' },
];
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'nom', label: 'Nom' },
  { value: 'potentiel', label: 'Potentiel' },
  { value: 'proximite', label: 'Proximité' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanel({ filters, onChange, specialites, sortMode, onSortChange, resultCount }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.headerRow}>
        <Text style={styles.resultCount}>{resultCount} médecin{resultCount > 1 ? 's' : ''}</Text>
        <Text style={styles.reset} onPress={() => onChange(DEFAULT_FILTERS)}>
          Réinitialiser
        </Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Rechercher un nom, une ville, un établissement..."
        placeholderTextColor={colors.textSecondary}
        value={filters.search}
        onChangeText={(search) => onChange({ ...filters, search })}
      />

      <Text style={styles.sectionTitle}>Trier par</Text>
      <View style={styles.row}>
        {SORT_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} selected={sortMode === opt.value} onPress={() => onSortChange(opt.value)} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Priorité de ciblage</Text>
      <View style={styles.row}>
        {CIBLAGE_OPTIONS.map((c) => (
          <Chip
            key={c}
            label={CIBLAGE_LABEL[c]}
            color={ciblageColor[c]}
            selected={filters.ciblage.includes(c)}
            onPress={() => onChange({ ...filters, ciblage: toggle(filters.ciblage, c) })}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Mode de réception</Text>
      <View style={styles.row}>
        {MODE_OPTIONS.map((m) => (
          <Chip
            key={m}
            label={MODE_RECEPTION_LABEL[m]}
            selected={filters.modeReception.includes(m)}
            onPress={() => onChange({ ...filters, modeReception: toggle(filters.modeReception, m) })}
          />
        ))}
      </View>

      {specialites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Spécialité</Text>
          <View style={styles.row}>
            {specialites.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={filters.specialite.includes(s)}
                onPress={() => onChange({ ...filters, specialite: toggle(filters.specialite, s) })}
              />
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Statut de visite</Text>
      <View style={styles.row}>
        {VISIT_STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={filters.visitStatus === opt.value}
            onPress={() => onChange({ ...filters, visitStatus: opt.value })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  resultCount: { fontWeight: '700', color: colors.textPrimary, fontSize: 15 },
  reset: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  sectionTitle: { fontWeight: '700', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
