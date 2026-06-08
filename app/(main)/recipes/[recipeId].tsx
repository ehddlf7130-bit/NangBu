import { colors } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/items';
import { deleteRecipe, fetchRecipe, updateRecipe } from '@/lib/recipes';
import type { Recipe } from '@/types/recipe';
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
});
