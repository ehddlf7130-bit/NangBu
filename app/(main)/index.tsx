import { useAuth } from '@/contexts/AuthContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 마일스톤 4에서 실제 메인 화면(6개 메뉴)으로 교체 예정
export default function MainScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧊 NangBu</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.notice}>메인 화면 — 마일스톤 4에서 구현 예정</Text>
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  email: {
    fontSize: 15,
    color: '#666',
  },
  notice: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
