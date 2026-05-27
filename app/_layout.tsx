import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// 세션 상태를 감시하며 (auth) ↔ (main) 사이를 자동으로 전환한다.
function AuthRedirect() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log(`[AuthRedirect] loading=${loading} session=${!!session} segments=${JSON.stringify(segments)}`);
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';

    if (!session && !inAuthGroup) {
      console.log('[AuthRedirect] → /(auth)/login');
      router.replace('/(auth)/login');
    } else if (session && !inMainGroup) {
      // 앱 재시작(index) 또는 로그인 후(auth 그룹) 모두 처리
      console.log('[AuthRedirect] → /(main)');
      router.replace('/(main)');
    } else {
      console.log('[AuthRedirect] 이미 올바른 위치, 이동 없음');
    }
  }, [session, loading, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthRedirect />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
