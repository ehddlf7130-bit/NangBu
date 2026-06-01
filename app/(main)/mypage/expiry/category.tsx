import { CATEGORIES } from '@/constants/categories';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExpiryCategoryScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>기본 소비기한 설정</Text>
        <Text style={styles.subtitle}>카테고리를 선택해 보관 방식별 소비기한을 정해보세요.</Text>
      </View>
      <View style={styles.list}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={styles.item}
            onPress={() => router.push(`/(main)/mypage/expiry/${cat}` as never)}
          >
            <Text style={styles.itemText}>{cat}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  header: { paddingTop: 28, paddingBottom: 20, gap: 4 },
  backText: { fontSize: 15, color: '#3b82f6', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 14, color: '#888' },
  list: { gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemText: { fontSize: 17, fontWeight: '500', color: '#111' },
  arrow: { fontSize: 22, color: '#aaa' },
});
