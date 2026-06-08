import { colors } from '@/constants/theme';
import { fetchIngredientsByCategory } from '@/lib/ingredients';
import { extractErrorMessage } from '@/lib/items';
import type { IngredientMaster } from '@/types/ingredient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function IngredientScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const [items, setItems] = useState<IngredientMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) return;
    let active = true;
    setLoading(true);
    fetchIngredientsByCategory(category)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((e) => {
        if (active) setError(extractErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category]);

  // 표준 재료 선택 → 등록 화면으로 ingredientId 전달(이름·보관팁·유통기한 프리필).
  function selectIngredient(ing: IngredientMaster) {
    router.push({
      pathname: '/(main)/register/new' as never,
      params: { category, ingredientId: ing.id },
    });
  }

  // 표준 목록에 없는 재료 → 기존 수동 등록 경로(이름·유통기한 직접 입력).
  function manualEntry() {
    router.push({ pathname: '/(main)/register/new' as never, params: { category } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{category}</Text>
      <Text style={styles.subtitle}>표준 재료를 선택하거나 직접 입력하세요.</Text>

      <TouchableOpacity style={styles.manualButton} onPress={manualEntry}>
        <Text style={styles.manualText}>+ 직접 입력</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              이 카테고리의 표준 재료가 없습니다. &apos;직접 입력&apos;을 이용하세요.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => selectIngredient(item)}>
              <View style={styles.itemBody}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.storage_tip ? (
                  <Text style={styles.itemTip} numberOfLines={1}>
                    {item.storage_tip}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  manualButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    marginBottom: 16,
    alignItems: 'center',
  },
  manualText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  loading: { marginTop: 24 },
  error: { color: colors.danger, fontSize: 14, marginTop: 16 },
  empty: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 24 },
  list: { gap: 10, paddingBottom: 40 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemBody: { flex: 1, gap: 2 },
  itemName: { fontSize: 17, fontWeight: '500', color: colors.textPrimary },
  itemTip: { fontSize: 13, color: colors.textSecondary },
  arrow: { fontSize: 22, color: colors.textSecondary, marginLeft: 12 },
});
