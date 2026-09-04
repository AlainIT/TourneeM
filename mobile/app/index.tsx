import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSessionContext } from '../hooks/SessionContext';
import { colors } from '../lib/theme';

export default function Index() {
  const { session, loading } = useSessionContext();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={session ? '/(app)/map' : '/(auth)/login'} />;
}
