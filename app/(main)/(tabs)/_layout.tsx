import CustomTabBar from '@/components/CustomTabBar';
import { Tabs } from 'expo-router';

// 하단 탭(4개)만 담당. 상세 화면들은 상위 Stack((main)/_layout)에 있어
// push 시 스와이프 뒤로가기가 동작한다.
// 탭바 모양은 Figma 시안 기반 커스텀(CustomTabBar)이 그린다 — 아이콘·색·활성표시를 직접 처리하므로
// 여기서는 각 탭의 name/title(라벨)만 지정한다.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: '냉장고' }} />
      <Tabs.Screen name="friends/index" options={{ title: '커뮤니티' }} />
      <Tabs.Screen name="recipes/index" options={{ title: '레시피' }} />
      <Tabs.Screen name="mypage/index" options={{ title: '마이페이지' }} />
    </Tabs>
  );
}
