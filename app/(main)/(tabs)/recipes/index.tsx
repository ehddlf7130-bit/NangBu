import { colors, radius } from '@/constants/theme';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/items';
import { fetchMyRecipes } from '@/lib/recipes';
import type { Recipe } from '@/types/recipe';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RecipesScreen() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      setError(null);
      fetchMyRecipes(user.id)
        .then((data) => { if (active) setRecipes(data); })
        .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [user]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>레시피</Text>
        <View style={styles.headerActions}>
          <NotificationBell />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(main)/recipes/new' as never)}
          >
            <Text style={styles.addButtonText}>＋ 추가</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={recipes.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <RecipeRow recipe={item} onPress={() => router.push(`/(main)/recipes/${item.id}` as never)} />
        )}
      />
    </View>
  );
}

function RecipeRow({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowTitle} numberOfLines={1}>{recipe.title}</Text>
      <Text style={styles.rowMeta}>{formatDateTime(recipe.created_at)}</Text>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🍳</Text>
      <Text style={styles.emptyTitle}>저장된 레시피가 없어요</Text>
      <Text style={styles.emptyDesc}>오른쪽 위 ＋ 추가 버튼으로 레시피를 저장해보세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  addButtonText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer: { flex: 1 },
  row: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  rowMeta: { fontSize: 13, color: colors.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 15 },
});
