import { colors, radius, spacing } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/items';
import { deleteRecipe, fetchRecipe, updateRecipe } from '@/lib/recipes';
import type { Recipe } from '@/types/recipe';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RecipeDetailScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recipeId) return;
    let active = true;
    fetchRecipe(recipeId)
      .then((r) => {
        if (!active) return;
        setRecipe(r);
        setTitle(r.title);
        setBody(r.body);
      })
      .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recipeId]);

  async function handleSave() {
    if (!recipeId) return;
    const t = title.trim();
    if (!t) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateRecipe(recipeId, { title: t, body: body.trim() });
      setRecipe(updated);
      setEditing(false);
    } catch (e: unknown) {
      Alert.alert('수정 실패', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!recipe) return;
    setTitle(recipe.title);
    setBody(recipe.body);
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert('레시피 삭제', `"${recipe?.title}"을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if (!recipeId) return;
          try {
            await deleteRecipe(recipeId);
            router.replace('/(main)/recipes' as never);
          } catch (e: unknown) {
            Alert.alert('오류', extractErrorMessage(e));
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '레시피를 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleCancel} disabled={saving}>
                <Text style={styles.actionText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.actionText}>저장</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={() => setEditing(true)}>
                <Text style={styles.actionText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Text style={styles.deleteText}>삭제</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {editing ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>제목 *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="레시피 제목"
              placeholderTextColor={colors.textDisabled}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>내용</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={body}
              onChangeText={setBody}
              placeholder="재료, 조리 순서 등"
              placeholderTextColor={colors.textDisabled}
              multiline
              textAlignVertical="top"
            />
          </View>
        </>
      ) : recipe.source === 'ai' && recipe.ai_meta ? (
        <AiRecipeView recipe={recipe} />
      ) : (
        <>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.date}>{formatDateTime(recipe.created_at)}</Text>
          <Text style={styles.body}>{recipe.body || '내용이 없습니다.'}</Text>
        </>
      )}
    </ScrollView>
  );
}

/* ── AI 레시피 읽기 뷰 (Figma node 1-410, recipes/new.tsx 미리보기와 동일 톤) ── */
function AiRecipeView({ recipe }: { recipe: Recipe }) {
  const meta = recipe.ai_meta; // 호출부에서 non-null 보장
  // difficulty: 숫자 아니면 3 폴백 → 1~5 클램프 → 점 5개 중 채움
  const safeDifficulty =
    typeof meta?.difficulty === 'number' && Number.isFinite(meta.difficulty)
      ? meta.difficulty
      : 3;
  const filledDots = Math.min(Math.max(Math.round(safeDifficulty), 1), 5);
  // cook_time_minutes: 숫자 아니면 "-"
  const cookTimeLabel =
    typeof meta?.cook_time_minutes === 'number' && Number.isFinite(meta.cook_time_minutes)
      ? `${meta.cook_time_minutes}분`
      : '-';
  const neededIngredients = meta?.needed_ingredients ?? [];

  return (
    <>
      <Text style={styles.recipeTitle}>{recipe.title}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.metaTime}>{cookTimeLabel}</Text>
        <Text style={styles.metaSep}>l</Text>
        <Text style={styles.metaLabel}>난이도</Text>
        <View style={styles.dots}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < filledDots ? styles.dotFilled : styles.dotEmpty]}
            />
          ))}
        </View>
      </View>

      {!!recipe.body && <Text style={styles.recipeBody}>{recipe.body}</Text>}

      {neededIngredients.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>부족한 재료</Text>
          <View style={styles.chipWrap}>
            {neededIngredients.map((ing, i) => (
              <View key={`${ing.name}-${i}`} style={styles.chip}>
                <Ionicons name="checkmark" size={12} color={colors.thumbnail} />
                <Text style={styles.chipText}>
                  {ing.amount ? `${ing.name} ${ing.amount}` : ing.name}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 28, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: { fontSize: 15, color: colors.primary },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6 },
  actionText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  deleteText: { fontSize: 15, color: colors.danger, fontWeight: '600' },
  recipeTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: 13, color: colors.textSecondary, marginTop: -8 },
  body: { fontSize: 16, color: colors.textPrimary, lineHeight: 24 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  multiline: { minHeight: 160 },
  errorText: { color: colors.danger, fontSize: 15 },

  // ── AI 레시피 읽기 뷰 (Figma node 1-410, new.tsx 미리보기와 동일) ──
  // 메타: 시계 + "{시간} l 난이도" + 점, Figma var(grays/gray) = textSecondary
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaTime: { fontSize: 16, color: colors.textSecondary, letterSpacing: -0.4 },
  metaSep: { fontSize: 20, fontWeight: '300', color: colors.textSecondary, marginHorizontal: 2 },
  metaLabel: { fontSize: 16, color: colors.textSecondary, letterSpacing: -0.4 },
  // 난이도 점 5개 (시안에 값 표현 없어 신규 — 채움=primary / 빈=borderStrong)
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotFilled: { backgroundColor: colors.primary },
  dotEmpty: { backgroundColor: colors.borderStrong },
  // 본문(조리 과정): 시안 스타일(14px, grays/gray=textSecondary)
  recipeBody: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, letterSpacing: -0.4 },
  // 구분선: Figma 1px var(grays/gray-4) = borderStrong
  divider: { height: 1, backgroundColor: colors.borderStrong },
  // 섹션 라벨 "부족한 재료": Figma 12px grays/gray = textSecondary
  sectionLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: -spacing.sm },
  // 칩: bg var(grays/gray-6)=surface, 알약형, 체크 + "이름 amount"(thumbnail #213A24)
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.thumbnail, letterSpacing: 0.35 },
});
