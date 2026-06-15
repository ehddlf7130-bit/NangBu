// 개별 재료 소비기한 설정 상세. category.tsx의 재료 그리드에서 재료를 탭하면 들어온다.
// 보관방식(냉장/냉동/실온)별 기본 소비기한(일)을 +/− 스테퍼로 설정한다.
// 초기값 = 개별값(ingredient_expiry) 우선, 없으면 ingredient_master 일수(비권장=0이면 1).
// 저장은 "사용자가 실제로 바꾼 보관방식"만 — 안 바꾼 칸은 마스터 폴백을 유지한다.
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { deleteIngredientExpiry, fetchIngredientExpiries, upsertIngredientExpiry } from '@/lib/expiry';
import { fetchIngredientById } from '@/lib/ingredients';
import { extractErrorMessage } from '@/lib/items';
import { STORAGE_LABELS, type StorageType } from '@/types/item';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const STORAGES: StorageType[] = ['fridge', 'freezer', 'room'];
const DAY_MIN = 1;            // 하한 — DB CHECK default_days > 0 과 일치
const DAY_MAX = 365;          // 상한 — 1년
const STEP_BTN_SIZE = 36;     // 스테퍼 +/− 버튼 지름(레이아웃 스펙)

type Days = Record<StorageType, number>;

const clamp = (n: number) => Math.max(DAY_MIN, Math.min(DAY_MAX, n));

export default function IngredientExpiryDetailScreen() {
  // ingredientId = 라우트 세그먼트. 재료명(헤더)은 아래 master 조회에서 채운다.
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState<string>('소비기한 설정');

  // value = 현재 스테퍼 값(항상 1~365). initial = 로드 시점 값(변경 추적용). masterDays = 마스터 일수(0=비권장).
  const [value, setValue] = useState<Days>({ fridge: DAY_MIN, freezer: DAY_MIN, room: DAY_MIN });
  const [initial, setInitial] = useState<Days>({ fridge: DAY_MIN, freezer: DAY_MIN, room: DAY_MIN });
  const [masterDays, setMasterDays] = useState<Days>({ fridge: 0, freezer: 0, room: 0 });

  // 진입 시: 마스터(폴백·재료명)와 개별 설정값을 로드해 초기값 구성.
  // 마스터와 개별값을 분리 로드 — 개별값(ingredient_expiry) 조회가 실패해도 마스터 폴백 표시는 살린다.
  useEffect(() => {
    if (!user || !ingredientId) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const master = await fetchIngredientById(ingredientId);
        console.log('MASTER_RAW', JSON.stringify(master)); // 진단용 — 확인 후 제거
        if (!active) return;
        if (master?.name) setTitle(master.name);
        const md: Days = {
          fridge: master.fridge_days,
          freezer: master.freezer_days,
          room: master.room_days,
        };
        // 개별 설정값은 실패해도 마스터 폴백 표시를 막지 않는다(별도 try).
        const indiv: Partial<Days> = {};
        try {
          const rows = await fetchIngredientExpiries(user.id, ingredientId);
          rows.forEach((r) => { indiv[r.storage] = r.default_days; });
        } catch (e: unknown) {
          console.warn('INGREDIENT_EXPIRY_LOAD_FAIL', extractErrorMessage(e)); // 진단용
        }
        if (!active) return;
        const init: Days = { fridge: DAY_MIN, freezer: DAY_MIN, room: DAY_MIN };
        for (const s of STORAGES) {
          // 1순위 개별값 → 2순위 마스터(>0) → 비권장(0)이면 1
          init[s] = clamp(indiv[s] ?? (md[s] > 0 ? md[s] : DAY_MIN));
        }
        setMasterDays(md);
        setInitial(init);
        setValue(init);
      } catch (e: unknown) {
        if (active) Alert.alert('오류', extractErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, ingredientId]);

  function step(s: StorageType, delta: number) {
    setValue((prev) => ({ ...prev, [s]: clamp(prev[s] + delta) }));
  }

  async function handleSave() {
    if (!user || !ingredientId) return;
    setSaving(true);
    try {
      for (const s of STORAGES) {
        const cur = value[s];
        if (cur === initial[s]) continue; // 사용자가 안 바꾼 칸 → 저장 안 함(마스터 폴백/기존 개별행 유지)
        const master = masterDays[s];
        if (master > 0 && cur === master) {
          await deleteIngredientExpiry(user.id, ingredientId, s); // 마스터값으로 되돌림 → 개별행 제거(폴백 복원)
        } else {
          await upsertIngredientExpiry(user.id, ingredientId, s, cur);
        }
      }
      Alert.alert('완료', '소비기한 설정을 저장했습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert('저장 실패', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>보관 방식별 기본 소비기한(일)을 설정하세요. 기본값에서 바꾼 항목만 저장돼요.</Text>
      </View>

      <View style={styles.list}>
        {STORAGES.map((s) => {
          const discouraged = masterDays[s] <= 0; // 마스터 0 = 비권장
          const atMin = value[s] <= DAY_MIN;
          const atMax = value[s] >= DAY_MAX;
          return (
            <View key={s} style={styles.row}>
              <View style={styles.labelWrap}>
                <Text style={styles.rowLabel}>{STORAGE_LABELS[s]}</Text>
                {discouraged && <Text style={styles.badge}>비권장</Text>}
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepBtn, atMin && styles.stepBtnDisabled]}
                  onPress={() => step(s, -1)}
                  disabled={atMin}
                  accessibilityRole="button"
                  accessibilityLabel={`${STORAGE_LABELS[s]} 일수 줄이기`}
                >
                  <Ionicons name="remove" size={20} color={atMin ? colors.textDisabled : colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{value[s]}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
                  onPress={() => step(s, 1)}
                  disabled={atMax}
                  accessibilityRole="button"
                  accessibilityLabel={`${STORAGE_LABELS[s]} 일수 늘리기`}
                >
                  <Ionicons name="add" size={20} color={atMax ? colors.textDisabled : colors.primary} />
                </TouchableOpacity>
                <Text style={styles.unit}>일</Text>
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>저장</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xs },
  backText: { ...typography.body, color: colors.primary, marginBottom: spacing.xs },
  title: { ...typography.heading1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  badge: {
    ...typography.caption,
    color: colors.warning,
    backgroundColor: colors.warningTint,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: STEP_BTN_SIZE,
    height: STEP_BTN_SIZE,
    borderRadius: STEP_BTN_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.5 },
  stepValue: { ...typography.body, fontWeight: '600', color: colors.textPrimary, minWidth: STEP_BTN_SIZE, textAlign: 'center' },
  unit: { ...typography.body, color: colors.textSecondary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...typography.body, color: colors.background, fontWeight: '700' },
});
