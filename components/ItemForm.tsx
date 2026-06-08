import { colors } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import { addDaysToToday } from '@/lib/expiry';
import { extractErrorMessage } from '@/lib/items';
import { type ItemFormValues, STORAGE_LABELS, type StorageType } from '@/types/item';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type ItemFormMode = 'create' | 'edit' | 'readonly';

interface ItemFormProps {
  mode: ItemFormMode;
  initialValues?: Partial<ItemFormValues>;
  onSubmit?: (values: ItemFormValues) => Promise<void>;
  // false면 내부 ScrollView 없이 렌더 → 바깥 스크롤(코멘트 등)에 얹어 쓸 때 사용. 기본 true.
  scrollable?: boolean;
  // (등록 전용) 카테고리+보관방식으로 기본 소비기한(일수)을 조회. 유통기한이 비어있을 때만 자동 채움.
  resolveExpiry?: (category: string, storage: StorageType) => Promise<number | null>;
  // (표준 재료 선택 시) 보관방식별 마스터 권장 일수. 0 = 비권장 → 해당 칩 비활성. null/미지정이면 모든 보관방식 활성(직접 입력 흐름).
  ingredientDays?: Record<StorageType, number> | null;
}

const STORAGE_OPTIONS: StorageType[] = ['fridge', 'freezer', 'room'];

const DEFAULT_VALUES: ItemFormValues = {
  name: '',
  category: '',
  storage: 'fridge',
  storage_tip: '',
  expire_date: '',
  quantity: 1,
};

export default function ItemForm({
  mode,
  initialValues,
  onSubmit,
  scrollable = true,
  resolveExpiry,
  ingredientDays,
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadonly = mode === 'readonly';
  const submitLabel = mode === 'create' ? '등록' : '수정';

  // 카테고리/보관방식이 정해지면 기본 소비기한을 조회해 유통기한을 자동 채운다.
  // 단, 유통기한이 비어있을 때만 채워 사용자가 입력/수정한 값은 덮어쓰지 않는다.
  useEffect(() => {
    if (!resolveExpiry) return;
    if (!values.category || !values.storage) return;
    let active = true;
    resolveExpiry(values.category, values.storage)
      .then((days) => {
        if (!active || days == null) return;
        setValues((prev) =>
          prev.expire_date ? prev : { ...prev, expire_date: addDaysToToday(days) },
        );
      })
      .catch(() => {});
    return () => { active = false; };
  }, [values.category, values.storage, resolveExpiry]);

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!values.name.trim()) return '이름을 입력해주세요.';
    if (values.quantity < 0) return '수량은 0 이상이어야 합니다.';
    if (values.expire_date && !/^\d{4}-\d{2}-\d{2}$/.test(values.expire_date)) {
      return '유통기한 형식이 올바르지 않습니다. (예: 2025-12-31)';
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!onSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (e: unknown) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const body = (
    <>
      <Field label="이름 *">
        <TextInput
          style={[styles.input, isReadonly && styles.inputDisabled]}
          value={values.name}
          onChangeText={(v) => set('name', v)}
          editable={!isReadonly}
          placeholder="식재료 이름"
          placeholderTextColor={colors.textDisabled}
        />
      </Field>

      <Field label="카테고리">
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                values.category === cat && styles.chipSelected,
                isReadonly && styles.chipDisabled,
              ]}
              onPress={() => !isReadonly && set('category', cat)}
              disabled={isReadonly}
            >
              <Text
                style={[
                  styles.chipText,
                  values.category === cat && styles.chipTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label="보관 방식 *">
        <View style={styles.chipRow}>
          {STORAGE_OPTIONS.map((opt) => {
            // 표준 재료 선택 시 일수가 0인 보관방식은 '비권장' → 비활성. 직접 입력이면 모두 활성.
            const discouraged = !!ingredientDays && ingredientDays[opt] <= 0;
            const disabled = isReadonly || discouraged;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  values.storage === opt && styles.chipSelected,
                  disabled && styles.chipDisabled,
                ]}
                onPress={() => !disabled && set('storage', opt)}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.chipText,
                    values.storage === opt && styles.chipTextSelected,
                  ]}
                >
                  {STORAGE_LABELS[opt]}
                  {discouraged ? ' (비권장)' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Field>

      <Field label="보관법 정보">
        <TextInput
          style={[styles.input, styles.multiline, isReadonly && styles.inputDisabled]}
          value={values.storage_tip}
          onChangeText={(v) => set('storage_tip', v)}
          editable={!isReadonly}
          placeholder="보관 시 주의사항 (선택)"
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={3}
        />
      </Field>

      <Field label="유통기한">
        <TextInput
          style={[styles.input, isReadonly && styles.inputDisabled]}
          value={values.expire_date}
          onChangeText={(v) => set('expire_date', v)}
          editable={!isReadonly}
          placeholder="YYYY-MM-DD (선택)"
          placeholderTextColor={colors.textDisabled}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      </Field>

      <Field label="수량 *">
        <TextInput
          style={[styles.input, styles.inputNarrow, isReadonly && styles.inputDisabled]}
          value={String(values.quantity)}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n)) set('quantity', n);
            else if (v === '') set('quantity', 0);
          }}
          editable={!isReadonly}
          keyboardType="number-pad"
        />
      </Field>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!isReadonly && (
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
      )}
    </>
  );

  // scrollable=false면 바깥 스크롤에 얹기 위해 ScrollView 없이 View로 감싼다.
  if (!scrollable) {
    return <View style={styles.container}>{body}</View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {body}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, gap: 20, paddingBottom: 40 },
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
  inputDisabled: { backgroundColor: colors.surface, color: colors.textSecondary },
  inputNarrow: { width: 100 },
  multiline: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  chipDisabled: { opacity: 0.6 },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
  errorText: { color: colors.danger, fontSize: 14, marginTop: -8 },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
