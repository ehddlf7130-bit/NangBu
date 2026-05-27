import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register/category" />
      <Stack.Screen name="register/new" />
      <Stack.Screen name="fridge/index" />
      <Stack.Screen name="fridge/[itemId]" />
    </Stack>
  );
}
