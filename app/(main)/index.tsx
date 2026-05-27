import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: '식품 등록', icon: '➕', route: '/(main)/register/category' },
  { label: '나의 냉장고', icon: '🧊', route: '/(main)/fridge' },
  { label: '친구', icon: '👥', route: '/(main)/friends' },
  { label: '알림', icon: '🔔', route: '/(main)/notifications' },
  { label: '설정', icon: '⚙️', route: '/(main)/settings' },
  { label: 'AI 챗봇', icon: '🤖', route: '/(main)/chatbot' },
];

export default function MainScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧊 NangBu</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.grid}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.card}
            onPress={() => router.push(item.route as never)}
          >
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <Text style={styles.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 4 },
  email: { fontSize: 14, color: '#888', marginBottom: 28 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    aspectRatio: 1.4,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardIcon: { fontSize: 28 },
  cardLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  logoutButton: {
    marginTop: 28,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
});
