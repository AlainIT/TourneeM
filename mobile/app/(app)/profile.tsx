import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfile, useClearHomeAddress, useUpdateHomeAddress } from '../../hooks/useProfile';
import { searchAddress, type AddressSuggestion } from '../../lib/api/profile';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radius, spacing } from '../../lib/theme';

export default function Profile() {
  const { data: profile, isLoading } = useProfile();
  const updateHome = useUpdateHomeAddress();
  const clearHome = useClearHomeAddress();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    setSearching(true);
    try {
      const results = await searchAddress(query);
      setSuggestions(results);
      if (results.length === 0) setError('Aucune adresse trouvée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la recherche.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSelect(s: AddressSuggestion) {
    await updateHome.mutateAsync({ adresse: s.label, lat: s.lat, lon: s.lon });
    setQuery('');
    setSuggestions([]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresse de domicile</Text>
        <Text style={styles.sectionHint}>
          Utilisée pour que l'optimisation d'une tournée prévoie le trajet retour jusqu'à chez vous,
          plutôt que de s'arrêter au dernier médecin visité.
        </Text>

        {profile?.adresse_domicile ? (
          <View style={styles.currentAddress}>
            <Ionicons name="home" size={18} color={colors.primary} />
            <Text style={styles.currentAddressText} numberOfLines={2}>
              {profile.adresse_domicile}
            </Text>
            <Ionicons
              name="close"
              size={18}
              color={colors.textSecondary}
              onPress={() => clearHome.mutate()}
              hitSlop={8}
            />
          </View>
        ) : (
          <Text style={styles.noAddress}>Aucune adresse enregistrée.</Text>
        )}

        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Rechercher une nouvelle adresse"
              placeholder="12 rue de la Paix, 75002 Paris"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
        </View>
        <PrimaryButton label="Rechercher" onPress={handleSearch} loading={searching} disabled={query.trim().length < 3} />

        {error && <Text style={styles.error}>{error}</Text>}

        <FlatList
          data={suggestions}
          keyExtractor={(item, i) => `${item.lat},${item.lon},${i}`}
          renderItem={({ item }) => (
            <Pressable style={styles.suggestion} onPress={() => handleSelect(item)}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.suggestionText} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.primary },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  sectionTitle: { fontWeight: '700', color: colors.textPrimary, fontSize: 15, marginBottom: spacing.xs },
  sectionHint: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md },
  currentAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  currentAddressText: { flex: 1, marginHorizontal: spacing.sm, color: colors.textPrimary, fontWeight: '600' },
  noAddress: { color: colors.textSecondary, marginBottom: spacing.md, fontStyle: 'italic' },
  searchRow: { flexDirection: 'row' },
  error: { color: colors.danger, marginTop: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { marginLeft: spacing.sm, color: colors.textPrimary, flex: 1 },
});
