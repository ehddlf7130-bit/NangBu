import { CATEGORIES } from '@/constants/categories';
import { extractErrorMessage } from '@/lib/items';
import { type ItemFormValues, STORAGE_LABELS, type StorageType } from '@/types/item';
import { useState } from 'react';
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
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadonly = mode === 'readonly';
  const submitLabel = mode === 'create' ? '등록' : '수정';

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
          placeholderTextColor="#bbb"
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
          {STORAGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                values.storage === opt && styles.chipSelected,
                isReadonly && styles.chipDisabled,
              ]}
              onPress={() => !isReadonly && set('storage', opt)}
              disabled={isReadonly}
            >
              <Text
                style={[
                  styles.chipText,
                  values.storage === opt && styles.chipTextSelected,
                ]}
              >
                {STORAGE_LABELS[opt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label="보관법 정보">
        <TextInput
          style={[styles.input, styles.multiline, isReadonly && styles.inputDisabled]}
          value={values.storage_tip}
          onChangeText={(v) => set('storage_tip', v)}
          editable={!isReadonly}
          placeholder="보관 시 주의사항 (선택)"
          placeholderTextColor="#bbb"
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
          placeholderTextColor="#bbb"
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
            <ActivityIndicator color="#fff" />
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
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, gap: 20, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#f5f5f5', color: '#888' },
  inputNarrow: { width: 100 },
  multiline: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  chipDisabled: { opacity: 0.6 },
  chipText: { fontSize: 14, color: '#555' },
  chipTextSelected: { color: '#3b82f6', fontWeight: '600' },
  errorText: { color: '#ef4444', fontSize: 14, marginTop: -8 },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
