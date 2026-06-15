// 레시피 목록 화면(하단 탭 '레시피').
// 헤더(로고+알림종+추가) · '나의 레시피' 제목 · 레시피 카드 리스트를 그린다.
// 카드 탭 → 상세, 우상단 + → 작성 화면 진입.
import { colors, radius, spacing, typography } from '@/constants/theme';
import AddButton from '@/components/AddButton';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
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
      {/* 헤더: 로고 + 알림종 + 추가 */}
      <View style={styles.header}>
        <Text style={styles.logo}>Pantree</Text>
        <View style={styles.headerActions}>
          <NotificationBell />
          <AddButton
            onPress={() => router.push('/(main)/recipes/new' as never)}
            size={28}
            accessibilityLabel="레시피 추가"
          />
        </View>
      </View>

      {/* 화면 제목 */}
      <Text style={styles.screenTitle}>나의 레시피</Text>

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

// 레시피 한 장의 카드. 제목 + 내용(body) 2줄 미리보기.
function RecipeRow({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle} numberOfLines={1}>{recipe.title}</Text>
      {recipe.body ? (
        <Text style={styles.cardBody} numberOfLines={2}>{recipe.body}</Text>
      ) : null}
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
  container: { flex: 1, backgroundColor: colors.surface }, // 시안의 옅은 회색 페이지(F4F6F4→surface)
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  logo: { ...typography.heading1, color: colors.thumbnail }, // 좌상단 '냉부' 로고(다크 그린)
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  // 화면 제목
  screenTitle: { ...typography.heading1, color: colors.textPrimary, textAlign: 'center', paddingBottom: spacing.md },

  // 리스트
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  emptyContainer: { flex: 1 },

  // 카드
  card: {
    backgroundColor: colors.background, // 흰 카드
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: colors.thumbnail, // 시안 그림자색 rgba(33,58,36,…) = thumbnail(#213A24)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { ...typography.heading2, color: colors.textPrimary },
  cardBody: { ...typography.caption, color: colors.textSecondary },

  // 빈 상태
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.heading2, color: colors.textPrimary },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  errorText: { ...typography.body, color: colors.danger },
});
