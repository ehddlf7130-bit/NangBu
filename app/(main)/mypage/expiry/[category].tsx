import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteCategoryExpiry,
  fetchCategoryExpiries,
  upsertCategoryExpiry,
} from '@/lib/expiry';
import { extractErrorMessage } from '@/lib/items';
import { STORAGE_LABELS, type StorageType } from '@/types/item';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STORAGES: StorageType[] = ['fridge', 'freezer', 'room'];

export default function ExpiryCategoryDetailScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // 보관방식별 입력값 (문자열로 관리; 빈칸 = 설정 없음)
  const [days, setDays] = useState<Record<StorageType, string>>({
    fridge: '',
    freezer: '',
    room: '',
  });

  useEffect(() => {
    if (!user || !category) return;
    let active = true;
    setLoading(true);
    fetchCategoryExpiries(user.id, category)
      .then((rows) => {
        if (!active) return;
        const next: Record<StorageType, string> = { fridge: '', freezer: '', room: '' };
        rows.forEach((r) => { next[r.storage] = String(r.default_days); });
        setDays(next);
      })
      .catch((e: unknown) => { if (active) Alert.alert('오류', extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, category]);

  async function handleSave() {
    if (!user || !category) return;
    // 입력 검증: 비어있지 않은 값은 0 이상 정수여야 함
    for (const s of STORAGES) {
      const v = days[s].trim();
      if (v !== '' && (!/^\d+$/.test(v))) {
        Alert.alert('알림', `${STORAGE_LABELS[s]} 일수는 0 이상의 숫자여야 합니다.`);
        return;
      }
    }
    setSaving(true);
    try {
      for (const s of STORAGES) {
        const v = days[s].trim();
        if (v === '') {
          await deleteCategoryExpiry(user.id, category, s);
        } else {
          await upsertCategoryExpiry(user.id, category, s, parseInt(v, 10));
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
        <Text style={styles.title}>{category}</Text>
        <Text style={styles.subtitle}>보관 방식별 기본 소비기한(일)을 입력하세요. 비우면 설정 안 함.</Text>
      </View>

      <View style={styles.list}>
        {STORAGES.map((s) => (
          <View key={s} style={styles.row}>
            <Text style={styles.rowLabel}>{STORAGE_LABELS[s]}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={days[s]}
                onChangeText={(v) => setDays((prev) => ({ ...prev, [s]: v }))}
                placeholder="-"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={styles.unit}>일</Text>
            </View>
          </View>
        ))}
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
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { paddingTop: 28, paddingBottom: 20, gap: 4 },
  backText: { fontSize: 15, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    width: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'right',
    backgroundColor: colors.background,
  },
  unit: { fontSize: 15, color: colors.textSecondary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
