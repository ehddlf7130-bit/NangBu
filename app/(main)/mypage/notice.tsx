import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Notice = { id: string; title: string; date: string; body: string };

// 초기에는 정적 공지. 추후 테이블로 옮길 수 있다.
const NOTICES: Notice[] = [
  {
    id: '1',
    title: 'NangBu 베타 오픈 안내',
    date: '2026-06-01',
    body: '냉장고 식재료 관리 앱 NangBu의 베타 버전이 오픈되었습니다. 친구와 냉장고를 공유하고 코멘트를 남겨보세요.',
  },
  {
    id: '2',
    title: '레시피 / 소비기한 기능 준비 중',
    date: '2026-06-01',
    body: '레시피 저장·추천과 카테고리별 기본 소비기한 설정 기능을 준비하고 있습니다. 곧 만나보실 수 있어요.',
  },
];

export default function NoticeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>공지사항</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {NOTICES.map((n) => (
          <View key={n.id} style={styles.card}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.cardDate}>{n.date}</Text>
            <Text style={styles.cardBody}>{n.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, gap: 4 },
  backText: { fontSize: 15, color: '#3b82f6', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardDate: { fontSize: 12, color: '#aaa' },
  cardBody: { fontSize: 14, color: '#444', lineHeight: 20 },
});
