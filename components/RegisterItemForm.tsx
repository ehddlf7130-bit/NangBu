// 식품 등록(create) 전용 폼. register/new.tsx에서만 사용한다.
// ItemForm(create/edit/readonly 공유)과 분리해, 등록 화면의 Figma 디자인을
// edit/readonly 화면에 영향 주지 않고 독립적으로 입힌다.
// 비주얼만 Figma를 따르고, 입력 필드·검증·유통기한 자동채움 로직은 전부 유지한다.
import { button, colors, radius, spacing, typography } from '@/constants/theme';
import DateWheelPicker from '@/components/DateWheelPicker';
import { CATEGORIES } from '@/constants/categories';
import { addDaysToToday } from '@/lib/expiry';
import { formatExpireDate } from '@/lib/format';
import { extractErrorMessage } from '@/lib/items';
import { STORAGE_LABELS, type ItemFormValues, type StorageType } from '@/types/item';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

// 시안 고정 치수(테마 토큰이 아닌 레이아웃 스펙).
const MULTILINE_HEIGHT = 80; // 보관법 정보 멀티라인 입력 높이
const QUANTITY_MIN_WIDTH = 28; // 수량 숫자 입력 최소 폭

const STORAGE_OPTIONS: StorageType[] = ['fridge', 'freezer', 'room'];

const DEFAULT_VALUES: ItemFormValues = {
  name: '',
  category: '',
  storage: 'fridge',
  storage_tip: '',
  expire_date: '',
  quantity: 1,
};

interface Props {
  initialValues?: Partial<ItemFormValues>;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  // 카테고리+보관방식으로 기본 소비기한(일수) 조회. 유통기한이 비어있을 때만 자동채움.
  resolveExpiry: (category: string, storage: StorageType) => Promise<number | null>;
  // (표준 재료 선택 시) 보관방식별 마스터 권장 일수. 0 = 비권장 → 해당 칩 비활성.
  ingredientDays?: Record<StorageType, number> | null;
}

export default function RegisterItemForm({
  initialValues,
  onSubmit,
  resolveExpiry,
  ingredientDays,
}: Props) {
  const [values, setValues] = useState<ItemFormValues>({ ...DEFAULT_VALUES, ...initialValues });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false); // 유통기한 휠 피커 표시 여부
  const [manualExpiry, setManualExpiry] = useState(false); // 사용자가 휠로 직접 유통기한을 고쳤는지

  // 유통기한 자동채움: 카테고리/보관방식이 정해지면 그 보관방식의 일수로 다시 계산해 채운다.
  // 보관방식을 바꾸면 재계산되도록 항상 갱신하되, 사용자가 휠로 직접 고른 값(manualExpiry)은 보존한다.
  useEffect(() => {
    if (manualExpiry) return; // 직접 수정값은 덮어쓰지 않는다
    if (!values.category || !values.storage) return;
    let active = true;
    resolveExpiry(values.category, values.storage)
      .then((days) => {
        if (!active || days == null) return; // 일수 정보가 없으면 기존 값 유지
        setValues((prev) => ({ ...prev, expire_date: addDaysToToday(days) }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [values.category, values.storage, resolveExpiry, manualExpiry]);

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

  // 보관방식 + 유통기한 요약 배지(시안의 초록 배지). 유통기한이 있을 때만 노출.
  const expirySummary = values.expire_date
    ? `${STORAGE_LABELS[values.storage]}-${formatExpireDate(values.expire_date)}까지`
    : null;

  return (
    <View style={styles.screen}>
      {/* 상단: 뒤로가기 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 타이틀 */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>선택한 재료를 다시 한 번 확인해 주세요</Text>
          <Text style={styles.subtitle}>보관 방법에 따라 소비기한을 안내해 드려요</Text>
        </View>

        {/* 이름 + 요약 배지 */}
        <View style={styles.nameRow}>
          <View style={styles.nameCol}>
            <TextInput
              style={styles.nameInput}
              value={values.name}
              onChangeText={(v) => set('name', v)}
              placeholder="식재료 이름"
              placeholderTextColor={colors.textDisabled}
            />
            {values.category ? <Text style={styles.categoryText}>{values.category}</Text> : null}
          </View>
          {/* 배지 탭 → 휠 피커로 날짜만 수정(보관방식은 아래 칩에서 선택) */}
          <TouchableOpacity
            style={[styles.badge, !expirySummary && styles.badgeEmpty]}
            onPress={() => setPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="유통기한 수정"
          >
            <Text style={[styles.badgeText, !expirySummary && styles.badgeTextEmpty]}>
              {expirySummary ?? '유통기한 설정'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hr} />

        {/* 카테고리 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>카테고리</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const selected = values.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => set('category', cat)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.hr} />

        {/* 보관 방식 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {values.name ? `${values.name}의 보관 방법을 선택해 주세요` : '보관 방법을 선택해 주세요'}
          </Text>
          <View style={styles.chipRow}>
            {STORAGE_OPTIONS.map((opt) => {
              // 표준 재료의 일수가 0인 보관방식은 '비권장' → 비활성. 직접 입력이면 모두 활성.
              const discouraged = !!ingredientDays && ingredientDays[opt] <= 0;
              const selected = values.storage === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    discouraged && styles.chipDisabled,
                  ]}
                  onPress={() => !discouraged && set('storage', opt)}
                  disabled={discouraged}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {STORAGE_LABELS[opt]}
                    {discouraged ? ' (비권장)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.hr} />

        {/* 수량 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>수량</Text>
          <View style={styles.quantityPill}>
            <TextInput
              style={styles.quantityInput}
              value={String(values.quantity)}
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                if (!isNaN(n)) set('quantity', n);
                else if (v === '') set('quantity', 0);
              }}
              keyboardType="number-pad"
            />
            <Text style={styles.quantityUnit}>개</Text>
          </View>
        </View>

        <View style={styles.hr} />

        {/* 보관법 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>보관법 정보</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={values.storage_tip}
            onChangeText={(v) => set('storage_tip', v)}
            placeholder="보관 시 주의사항 (선택)"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* 고정 CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.ctaText}>확인</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 유통기한 휠 피커: 배지 탭으로 열림. 자동채움값(또는 오늘)을 초기값으로. */}
      <DateWheelPicker
        visible={pickerVisible}
        value={values.expire_date}
        onConfirm={(date) => {
          set('expire_date', date);
          setManualExpiry(true); // 직접 고른 값은 이후 보관방식 변경에도 보존
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // 상단 뒤로가기
  topBar: { paddingTop: spacing.xl, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },

  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },

  // 타이틀
  titleBlock: { alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading1, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  // 이름 + 요약 배지
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  nameCol: { flex: 1, gap: spacing.xs },
  nameInput: { ...typography.heading1, color: colors.textPrimary, padding: 0 },
  categoryText: { ...typography.caption, color: colors.textDisabled },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: { ...typography.caption, color: colors.background, fontWeight: '600' },
  badgeEmpty: { backgroundColor: colors.surface }, // 유통기한 미설정 — 탭 유도 플레이스홀더
  badgeTextEmpty: { color: colors.textSecondary },

  // 구분선
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },

  // 섹션
  section: { gap: spacing.md },
  sectionLabel: { ...typography.heading2, color: colors.textSecondary },

  // 칩 (보관방식·카테고리 공통) — 시안: 선택=진회색/흰 글씨, 비선택=연회색/회색 글씨
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.textSecondary },
  chipDisabled: { opacity: 0.5 },
  chipText: { ...typography.body, color: colors.textSecondary },
  chipTextSelected: { color: colors.background, fontWeight: '600' },

  // 수량 필
  quantityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  quantityInput: {
    ...typography.body,
    color: colors.textSecondary,
    minWidth: QUANTITY_MIN_WIDTH,
    padding: 0,
    textAlign: 'center',
  },
  quantityUnit: { ...typography.body, color: colors.textSecondary },

  // 일반 입력(보관법 정보·유통기한)
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  multiline: { height: MULTILINE_HEIGHT, textAlignVertical: 'top' },

  errorText: { ...typography.caption, color: colors.danger },

  // 고정 CTA
  ctaBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  cta: {
    height: button.height,
    borderRadius: button.radius,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...typography.heading2, color: colors.background, fontWeight: '700' },
});
