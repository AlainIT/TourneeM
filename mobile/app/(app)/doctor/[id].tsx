import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDoctor } from '../../../hooks/useDoctor';
import { useDoctorVisits, useMarkVisited } from '../../../hooks/useDoctorVisits';
import { useSector } from '../../../hooks/useSector';
import { CIBLAGE_LABEL, MODE_RECEPTION_LABEL } from '../../../lib/types';
import { ciblageColor, colors, radius, spacing } from '../../../lib/theme';
import { PrimaryButton } from '../../../components/PrimaryButton';

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ width: 24 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function DoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: doctor, isLoading } = useDoctor(id);
  const { data: sector } = useSector();
  const { data: visits = [] } = useDoctorVisits(id);
  const markVisited = useMarkVisited(id, sector?.id);
  const [marking, setMarking] = useState(false);

  if (isLoading || !doctor) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const adresseComplete = [doctor.adresse, `${doctor.code_postal ?? ''} ${doctor.ville ?? ''}`.trim()]
    .filter(Boolean)
    .join(', ');

  async function handleMarkVisited() {
    setMarking(true);
    try {
      await markVisited();
    } finally {
      setMarking(false);
    }
  }

  function openNavigation() {
    if (doctor?.latitude == null || doctor?.longitude == null) return;
    const query = encodeURIComponent(adresseComplete || `${doctor.latitude},${doctor.longitude}`);
    const url = Platform.select({
      ios: `maps://?daddr=${query}`,
      android: `google.navigation:q=${query}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.header}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} onPress={() => router.back()} />
          <View style={[styles.badge, { backgroundColor: ciblageColor[doctor.ciblage] }]}>
            <Text style={styles.badgeText}>{CIBLAGE_LABEL[doctor.ciblage]}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.nom}>
            {doctor.nom} {doctor.prenom}
          </Text>
          <Text style={styles.specialite}>{doctor.specialite ?? ''}</Text>

          <View style={styles.card}>
            <InfoRow icon="business" label="Établissement" value={doctor.etablissement ?? '—'} />
            <InfoRow icon="location" label="Adresse" value={adresseComplete || '—'} />
            <InfoRow
              icon="calendar"
              label="Mode de réception"
              value={doctor.mode_reception ? MODE_RECEPTION_LABEL[doctor.mode_reception] : '—'}
            />
            <InfoRow icon="trending-up" label="Potentiel de prescription" value={`${doctor.potentiel_score ?? '—'} / 100`} />
            {doctor.frequence_max != null && (
              <InfoRow icon="repeat" label="Fréquence max / an" value={String(doctor.frequence_max)} />
            )}
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Marquer comme visité" onPress={handleMarkVisited} loading={marking} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton label="Ouvrir l'itinéraire" onPress={openNavigation} variant="secondary" />
          </View>

          <Text style={styles.sectionTitle}>Historique des visites</Text>
          {visits.length === 0 ? (
            <Text style={styles.emptyText}>Jamais visité.</Text>
          ) : (
            visits.map((v) => (
              <View key={v.id} style={styles.visitRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.visitDate}>{new Date(v.date_visite).toLocaleString('fr-FR')}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  badgeText: { color: colors.textInverse, fontWeight: '800', fontSize: 12 },
  body: { paddingHorizontal: spacing.md },
  nom: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  specialite: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: 'row', marginBottom: spacing.md },
  infoLabel: { fontSize: 12, color: colors.textSecondary },
  infoValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  actions: { marginTop: spacing.lg },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', fontSize: 12 },
  emptyText: { color: colors.textSecondary },
  visitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  visitDate: { marginLeft: spacing.sm, color: colors.textPrimary },
});
