import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

// AuthRedirect(_layout.tsx)가 1차로 처리하고, 이 컴포넌트가 2차 안전망 역할을 한다.
export default function Index() {
  const { session, loading } = useAuth();

  console.log(`[Index] loading=${loading} session=${!!session}`);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  console.log(`[Index] <Redirect> → ${session ? '/(main)/(tabs)' : '/(auth)/login'}`);
  return session ? <Redirect href="/(main)/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
