import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      {/* 하단 탭: 냉장고 / 커뮤니티 / 레시피 / 알림 / 마이페이지 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '냉장고',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends/index"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes/index"
        options={{
          title: '레시피',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage/index"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />

      {/* 탭에는 노출하지 않지만 router.push로 이동하는 화면들 */}
      <Tabs.Screen name="item/[itemId]" options={{ href: null }} />
      <Tabs.Screen name="register/category" options={{ href: null }} />
      <Tabs.Screen name="register/new" options={{ href: null }} />
      <Tabs.Screen name="fridge/[itemId]" options={{ href: null }} />
      <Tabs.Screen name="friends/[friendId]" options={{ href: null }} />
      <Tabs.Screen name="recipes/new" options={{ href: null }} />
      <Tabs.Screen name="recipes/[recipeId]" options={{ href: null }} />
      <Tabs.Screen name="mypage/profile" options={{ href: null }} />
      <Tabs.Screen name="mypage/notification-settings" options={{ href: null }} />
      <Tabs.Screen name="mypage/notice" options={{ href: null }} />
    </Tabs>
  );
}
