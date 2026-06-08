import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage, fetchMyItems } from '@/lib/items';
import { createRecipe, requestAiRecipe } from '@/lib/recipes';
import type { Item } from '@/types/item';
import type { AiRecipeResult } from '@/types/recipe';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

type Mode = 'choose' | 'manual' | 'ai';

export default function RecipeNewScreen() {
  const [mode, setMode] = useState<Mode>('choose');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (mode === 'choose' ? router.back() : setMode('choose'))}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>레시피 추가</Text>
      </View>

      {mode === 'choose' && <ModeChooser onSelect={setMode} />}
      {mode === 'manual' && <ManualForm />}
      {mode === 'ai' && <AiRecommend />}
    </ScrollView>
  );
}

/* ── 모드 선택 ──────────────────────────────────────────── */
function ModeChooser({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <View style={styles.chooser}>
      <TouchableOpacity style={styles.choiceCard} onPress={() => onSelect('manual')}>
        <Text style={styles.choiceIcon}>✍️</Text>
        <Text style={styles.choiceTitle}>직접 작성</Text>
        <Text style={styles.choiceDesc}>제목과 내용을 직접 입력해요.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.choiceCard} onPress={() => onSelect('ai')}>
        <Text style={styles.choiceIcon}>🤖</Text>
        <Text style={styles.choiceTitle}>AI 추천</Text>
        <Text style={styles.choiceDesc}>냉장고 재료로 레시피를 추천받아요.</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── 직접 작성 (기존 수동 흐름) ──────────────────────────── */
function ManualForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    const t = title.trim();
    if (!t) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await createRecipe(user.id, { title: t, body: body.trim() });
      router.replace('/(main)/recipes' as never);
    } catch (e: unknown) {
      Alert.alert('저장 실패', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
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
          placeholder="재료, 조리 순서 등을 자유롭게 적어보세요."
          placeholderTextColor={colors.textDisabled}
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>저장</Text>}
      </TouchableOpacity>
    </>
  );
}

/* ── AI 추천 ────────────────────────────────────────────── */

// expire_date 임박 순 정렬 (null은 맨 뒤로)
function sortByExpiry(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.expire_date === b.expire_date) return 0;
    if (!a.expire_date) return 1;
    if (!b.expire_date) return -1;
    return a.expire_date < b.expire_date ? -1 : 1;
  });
}

function AiRecommend() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recommending, setRecommending] = useState(false);
  const [result, setResult] = useState<AiRecipeResult | null>(null);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(() => {
    if (!user) return;
    let active = true;
    setLoadingItems(true);
    setLoadError(null);
    fetchMyItems(user.id)
      .then((data) => {
        if (!active) return;
        const sorted = sortByExpiry(data);
        setItems(sorted);
        setSelectedIds(new Set(sorted.map((it) => it.id))); // 전체 기본 선택
      })
      .catch((e: unknown) => {
        if (active) setLoadError(extractErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const cleanup = loadItems();
    return cleanup;
  }, [loadItems]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRecommend() {
    const selected = items.filter((it) => selectedIds.has(it.id));
    if (selected.length === 0) {
      Alert.alert('알림', '재료를 한 개 이상 선택해주세요.');
      return;
    }
    setRecommending(true);
    try {
      const recipe = await requestAiRecipe(selected);
      setResult(recipe);
    } catch (e: unknown) {
      Alert.alert('추천 실패', extractErrorMessage(e));
    } finally {
      setRecommending(false);
    }
  }

  async function handleSave() {
    if (!user || !result) return;
    setSaving(true);
    try {
      await createRecipe(user.id, { title: result.title, body: result.body }, 'ai');
      router.replace('/(main)/recipes' as never);
    } catch (e: unknown) {
      Alert.alert('저장 실패', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loadingItems) {
    return (
      <View style={styles.centerBlock}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centerBlock}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centerBlock}>
        <Text style={styles.emptyIcon}>🧊</Text>
        <Text style={styles.emptyTitle}>냉장고에 재료가 없어요</Text>
        <Text style={styles.emptyDesc}>재료를 먼저 등록한 뒤 추천을 받아보세요.</Text>
      </View>
    );
  }

  // 결과 미리보기
  if (result) {
    return (
      <View style={styles.previewWrap}>
        <View style={styles.previewCard}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI 추천</Text>
          </View>
          <Text style={styles.previewTitle}>{result.title}</Text>
          <Text style={styles.previewBody}>{result.body}</Text>

          {result.used_ingredients.length > 0 && (
            <View style={styles.usedWrap}>
              <Text style={styles.usedLabel}>사용한 재료</Text>
              <View style={styles.chipRow}>
                {result.used_ingredients.map((name, i) => (
                  <View key={`${name}-${i}`} style={styles.usedChip}>
                    <Text style={styles.usedChipText}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>저장</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, saving && styles.buttonDisabled]}
          onPress={() => setResult(null)}
          disabled={saving}
        >
          <Text style={styles.secondaryButtonText}>다시 추천</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 재료 선택
  return (
    <>
      <Text style={styles.hint}>추천에 사용할 재료를 선택하세요. (임박 순)</Text>

      <View style={styles.itemList}>
        {items.map((item) => {
          const checked = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemRow, checked && styles.itemRowChecked]}
              onPress={() => toggle(item.id)}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.category}
                  {item.expire_date ? ` · ~${item.expire_date}` : ' · 기한 없음'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.button, recommending && styles.buttonDisabled]}
        onPress={handleRecommend}
        disabled={recommending}
      >
        {recommending ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>추천받기</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 28, gap: 20 },
  header: { gap: 4 },
  backText: { fontSize: 15, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },

  // 공통
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 16, fontWeight: '700' },

  // 모드 선택
  chooser: { gap: 14 },
  choiceCard: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  choiceIcon: { fontSize: 32 },
  choiceTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  choiceDesc: { fontSize: 14, color: colors.textSecondary },

  // 안내/로딩
  centerBlock: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  errorText: { color: colors.danger, fontSize: 15 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  hint: { fontSize: 14, color: colors.textSecondary },

  // 재료 선택 목록
  itemList: { gap: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRowChecked: { backgroundColor: colors.primaryTint, borderColor: colors.primaryTintBorder },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.background, fontSize: 14, fontWeight: '700' },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  itemMeta: { fontSize: 13, color: colors.textSecondary },

  // 결과 미리보기
  previewWrap: { gap: 12 },
  previewCard: {
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  aiBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  previewTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  previewBody: { fontSize: 15, lineHeight: 23, color: colors.textPrimary },
  usedWrap: { gap: 8 },
  usedLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  usedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usedChipText: { fontSize: 13, color: colors.textSecondary },
});
