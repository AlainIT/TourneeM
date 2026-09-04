import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';

export default function Signup() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  async function handleSignup() {
    setError(null);
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nom } },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (data.session) {
      router.replace('/(app)/map');
    } else {
      // Confirmation par e-mail activée côté projet Supabase.
      setConfirmation(true);
    }
  }

  if (confirmation) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <View style={styles.card}>
          <Text style={styles.title}>Vérifiez vos e-mails</Text>
          <Text style={styles.subtitle}>
            Un e-mail de confirmation a été envoyé à {email}. Cliquez sur le lien pour activer votre compte.
          </Text>
          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkText}>Retour à la connexion</Text>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Créer un compte</Text>

        <TextField label="Nom" value={nom} onChangeText={setNom} />
        <TextField
          label="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="Mot de passe (8 caractères min.)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Créer mon compte"
          onPress={handleSignup}
          loading={loading}
          disabled={!email || password.length < 8}
        />

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Déjà un compte ? Se connecter</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, textAlign: 'center', marginBottom: spacing.lg },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, textAlign: 'center' },
  link: { marginTop: spacing.md, alignSelf: 'center' },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
