import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage } from '@/lib/items';
import { fetchMyProfile, updateNotifyComments, updateNotifyExpiry } from '@/lib/profiles';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyExpiry, setNotifyExpiry] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      fetchMyProfile(user.id)
        .then((p) => {
          if (!active) return;
          setNotifyComments(p.notify_comments);
          setNotifyExpiry(p.notify_expiry);
        })
        .catch((e: unknown) => { if (active) Alert.alert('오류', extractErrorMessage(e)); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [user]),
  );

  async function toggle(
    kind: 'comments' | 'expiry',
    value: boolean,
  ) {
    if (!user) return;
    const setLocal = kind === 'comments' ? setNotifyComments : setNotifyExpiry;
    const save = kind === 'comments' ? updateNotifyComments : updateNotifyExpiry;
    setLocal(value);
    setSaving(true);
    try {
      await save(user.id, value);
    } catch (e: unknown) {
      setLocal(!value); // 실패 시 롤백
      Alert.alert('저장 실패', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>알림 설정</Text>
      </View>

      <View style={styles.list}>
        <Row
          label="코멘트 알림"
          desc="친구가 내 품목에 코멘트를 남기면 알려드려요."
          value={notifyComments}
          disabled={saving}
          onChange={(v) => toggle('comments', v)}
        />
        <Row
          label="소비기한 임박 알림"
          desc="유통기한이 다가오면 알려드려요. (준비 중)"
          value={notifyExpiry}
          disabled={saving}
          onChange={(v) => toggle('expiry', v)}
        />
      </View>
    </View>
  );
}

function Row({
  label,
  desc,
  value,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, gap: 4 },
  backText: { fontSize: 15, color: '#3b82f6', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  list: { paddingHorizontal: 20, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  rowText: { flex: 1, gap: 2, marginRight: 12 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowDesc: { fontSize: 13, color: '#888' },
});
