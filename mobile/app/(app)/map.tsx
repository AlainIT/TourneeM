import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSector } from '../../hooks/useSector';
import { useDoctors } from '../../hooks/useDoctors';
import { useLastVisits } from '../../hooks/useLastVisits';
import { useUserLocation } from '../../hooks/useUserLocation';
import { DoctorMapView } from '../../components/DoctorMapView';
import { FilterPanel } from '../../components/FilterPanel';
import { DoctorListItem } from '../../components/DoctorListItem';
import { PrimaryButton } from '../../components/PrimaryButton';
import { applyFilters, DEFAULT_FILTERS, distinctSpecialites, sortDoctors, type DoctorFilters, type SortMode } from '../../lib/filters';
import { createRoute } from '../../lib/api/routes';
import { colors, spacing } from '../../lib/theme';

const TABLET_BREAKPOINT = 768;

export default function MapScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  // Calculé ici (dans l'arbre principal, où le SafeAreaProvider racine est bien
  // initialisé) plutôt que dans le <Modal> ci-dessous : react-native-safe-area-context
  // ne reçoit pas de mesures fiables du provider racine à l'intérieur d'un Modal
  // iOS (nouvelle fenêtre native), ce qui faisait chevaucher "Filtres" avec la
  // barre de statut et rendait la croix de fermeture (sous la zone système) inerte.
  const insets = useSafeAreaInsets();

  const { data: sector } = useSector();
  const { data: doctors = [], isLoading, refetch, isRefetching } = useDoctors(sector?.id);
  const { data: lastVisits = new Map() } = useLastVisits(sector?.id);
  const { location } = useUserLocation();

  const [filters, setFilters] = useState<DoctorFilters>(DEFAULT_FILTERS);
  const [sortMode, setSortMode] = useState<SortMode>('nom');
  const [viewMode, setViewMode] = useState<'carte' | 'liste'>('carte');
  const [showFilters, setShowFilters] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingRoute, setCreatingRoute] = useState(false);

  const specialites = useMemo(() => distinctSpecialites(doctors), [doctors]);
  const filtered = useMemo(() => applyFilters(doctors, filters, lastVisits), [doctors, filters, lastVisits]);
  const sorted = useMemo(() => sortDoctors(filtered, sortMode, location), [filtered, sortMode, location]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openDoctor(id: string) {
    router.push(`/(app)/doctor/${id}`);
  }

  async function handleCreateRoute() {
    if (!sector || selectedIds.size === 0) return;
    setCreatingRoute(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const route = await createRoute({ sectorId: sector.id, date: today, doctorIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
      setSelectionMode(false);
      router.push(`/(app)/routes/${route.id}`);
    } finally {
      setCreatingRoute(false);
    }
  }

  const filterPanel = (
    <FilterPanel
      filters={filters}
      onChange={setFilters}
      specialites={specialites}
      sortMode={sortMode}
      onSortChange={setSortMode}
      resultCount={sorted.length}
    />
  );

  const listContent = (
    <FlatList
      style={styles.list}
      data={sorted}
      keyExtractor={(d) => d.id}
      refreshing={isRefetching}
      onRefresh={refetch}
      renderItem={({ item }) => (
        <DoctorListItem
          doctor={item}
          selected={selectedIds.has(item.id)}
          selectionMode={selectionMode}
          lastVisitIso={lastVisits.get(item.id)}
          onPress={() => openDoctor(item.id)}
          onToggleSelect={() => toggleSelect(item.id)}
        />
      )}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun médecin ne correspond aux filtres.</Text>
          </View>
        ) : null
      }
    />
  );

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{sector?.nom ?? 'TourneeM'}</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.iconButton, selectionMode && styles.iconButtonActive]}
            onPress={() => {
              setSelectionMode((v) => !v);
              if (selectionMode) setSelectedIds(new Set());
            }}
          >
            <Ionicons name="checkbox-outline" size={20} color={selectionMode ? colors.textInverse : colors.primary} />
          </Pressable>
          {!isTablet && (
            <Pressable style={styles.iconButton} onPress={() => setShowFilters(true)}>
              <Ionicons name="filter" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {!isTablet && (
        <View style={styles.segmented}>
          {(['carte', 'liste'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.segment, viewMode === mode && styles.segmentActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.segmentText, viewMode === mode && styles.segmentTextActive]}>
                {mode === 'carte' ? 'Carte' : 'Liste'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.body}>
        {isTablet && (
          <View style={styles.sidePanel}>
            <View style={styles.sidePanelFilters}>{filterPanel}</View>
            <View style={styles.sidePanelList}>{listContent}</View>
          </View>
        )}

        <View style={styles.mainPanel}>
          {isTablet || viewMode === 'carte' ? (
            <DoctorMapView doctors={sorted} selectedIds={selectedIds} onDoctorPress={openDoctor} centerOn={location} />
          ) : (
            listContent
          )}
        </View>
      </View>

      {selectedIds.size > 0 && (
        <View style={styles.fabBar}>
          <PrimaryButton
            label={`Créer la tournée du jour (${selectedIds.size})`}
            onPress={handleCreateRoute}
            loading={creatingRoute}
          />
        </View>
      )}

    </SafeAreaView>

    {!isTablet && showFilters && (
      // Superposition affichée en sœur du SafeAreaView (pas à l'intérieur, pour
      // que le padding de zone sûre ne s'applique qu'une fois, via `insets` ci-dessous)
      // et sans <Modal> : sur iPhone à encoche/Dynamic Island, <Modal> ouvre une
      // fenêtre native séparée dont les zones tactiles se sont révélées peu
      // fiables au-dessus de la caméra/capteur Face ID.
      <View style={[styles.filtersOverlay, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filtres</Text>
          <Pressable
            hitSlop={16}
            style={styles.modalCloseButton}
            onPress={() => setShowFilters(false)}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        {filterPanel}
        <View style={styles.modalFooter}>
          <PrimaryButton
            label={`Voir les résultats (${sorted.length})`}
            onPress={() => setShowFilters(false)}
          />
        </View>
      </View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.primary },
  headerActions: { flexDirection: 'row' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  iconButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmented: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: colors.textInverse },
  body: { flex: 1, flexDirection: 'row' },
  list: { flex: 1 },
  sidePanel: { width: 360, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.surface, flexDirection: 'column' },
  sidePanelFilters: { height: 340, borderBottomWidth: 1, borderBottomColor: colors.border, overflow: 'hidden' },
  sidePanelList: { flex: 1 },
  mainPanel: { flex: 1 },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textSecondary },
  fabBar: { position: 'absolute', bottom: spacing.md, left: spacing.md, right: spacing.md },
  filtersOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modalCloseButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalFooter: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
