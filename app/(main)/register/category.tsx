import { CATEGORIES } from '@/constants/categories';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CategoryScreen() {
  function handleSelect(category: string) {
    // typedRoutes가 새 경로를 인식하기 전까지 cast 필요
    router.push({ pathname: '/(main)/register/new' as never, params: { category } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>카테고리 선택</Text>
      <Text style={styles.subtitle}>등록할 식재료의 카테고리를 선택해주세요.</Text>
      <View style={styles.list}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={styles.item}
            onPress={() => handleSelect(cat)}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 28 },
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
