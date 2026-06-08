import { Stack } from 'expo-router';

// (main) = Stack. 탭 묶음((tabs))을 첫 화면으로 두고, 상세 화면들은 그 위로 push된다.
// 이렇게 해야 상세 화면에서 화면을 왼쪽으로 밀어(iOS 엣지 스와이프) 뒤로가기가 동작한다.
// (Android는 시스템 뒤로가기로 동일하게 pop)
export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true, // 스와이프 뒤로가기
      }}
    >
      <Stack.Screen name="(tabs)" />
      {/* 나머지 상세 화면(item/[itemId], fridge/[itemId], register/*, friends/[friendId],
          recipes/new, recipes/[recipeId], notifications, mypage/* )은 파일 경로로 자동 등록된다. */}
    </Stack>
  );
}
