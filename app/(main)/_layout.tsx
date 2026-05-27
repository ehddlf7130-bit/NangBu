import { Stack } from 'expo-router';

// 마일스톤 4에서 하단 탭(Tabs)으로 교체 예정
export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
