import { colors, radius } from '@/constants/theme';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage } from '@/lib/items';
import { fetchMyProfile, updateFridgePublic } from '@/lib/profiles';
import type { Profile } from '@/types/friend';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type MenuItem = { label: string; route?: string; soon?: boolean };

const MENU: MenuItem[] = [
  { label: '프로필 수정', route: '/(main)/mypage/profile' },
  { label: '알림 설정', route: '/(main)/mypage/notification-settings' },
  { label: '기본 소비기한 설정', route: '/(main)/mypage/expiry/category' },
  { label: '공지사항', route: '/(main)/mypage/notice' },
];

export default function MyPageScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPublic, setSavingPublic] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      setError(null);
      fetchMyProfile(user.id)
        .then((p) => { if (active) setProfile(p); })
        .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [user]),
  );

  async function toggleFridgePublic(value: boolean) {
    if (!user || !profile) return;
    setSavingPublic(true);
    setProfile({ ...profile, fridge_public: value });
    try {
      await updateFridgePublic(user.id, value);
    } catch (e: unknown) {
      setProfile({ ...profile, fridge_public: !value }); // 실패 시 롤백
      Alert.alert('저장 실패', extractErrorMessage(e));
    } finally {
      setSavingPublic(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '프로필을 불러올 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>마이페이지</Text>
        <NotificationBell />
      </View>

      {/* 프로필 요약 */}
      <View style={styles.profileCard}>
        <Text style={styles.displayName}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* 냉장고 공개 토글 */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleTextWrap}>
          <Text style={styles.toggleLabel}>냉장고 공개</Text>
          <Text style={styles.toggleDesc}>친구가 내 냉장고를 볼 수 있어요.</Text>
        </View>
        <Switch
          value={profile.fridge_public}
          onValueChange={toggleFridgePublic}
          disabled={savingPublic}
        />
      </View>

      {/* 메뉴 */}
      <View style={styles.menu}>
        {MENU.map((m) => (
          <TouchableOpacity
            key={m.label}
            style={styles.menuRow}
            disabled={m.soon}
            onPress={() => m.route && router.push(m.route as never)}
          >
            <Text style={[styles.menuLabel, m.soon && styles.menuLabelDisabled]}>{m.label}</Text>
            <Text style={styles.menuRight}>{m.soon ? '준비 중' : '›'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 28, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  displayName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  username: { fontSize: 14, color: colors.primary },
  email: { fontSize: 13, color: colors.textSecondary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  toggleTextWrap: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  toggleDesc: { fontSize: 13, color: colors.textSecondary },
  menu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: { fontSize: 16, color: colors.textPrimary },
  menuLabelDisabled: { color: colors.textDisabled },
  menuRight: { fontSize: 15, color: colors.textDisabled },
  logoutButton: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dangerTintBorder,
    marginTop: 8,
  },
  logoutText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 15 },
});
