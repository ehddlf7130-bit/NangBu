import { colors, radius, spacing, typography } from '@/constants/theme';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage } from '@/lib/items';
import { fetchMyProfile, updateFridgePublic } from '@/lib/profiles';
import type { Profile } from '@/types/friend';
import { Ionicons } from '@expo/vector-icons';
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

// 라벨은 시안 표기, route는 기존 목적지 그대로 보존.
const MENU: MenuItem[] = [
  { label: '프로필 설정', route: '/(main)/mypage/profile' },
  { label: '알림설정', route: '/(main)/mypage/notification-settings' },
  { label: '기본 소비기한 설정', route: '/(main)/mypage/expiry/category' },
  { label: '공지사항', route: '/(main)/mypage/notice' },
];

const AVATAR_SIZE = 64; // 시안 고정 치수(node 55:371)

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
      {/* 헤더: 로고(왼) + 알림 벨(오) */}
      <View style={styles.header}>
        <Text style={styles.logo}>냉부</Text>
        <NotificationBell />
      </View>

      {/* 가운데 제목 */}
      <Text style={styles.title}>마이페이지</Text>

      {/* 프로필: 아바타 + 이름 + 이메일 */}
      <View style={styles.profileRow}>
        <Ionicons name="person-circle" size={AVATAR_SIZE} color={colors.textTertiary} />
        <View style={styles.profileText}>
          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
      </View>

      {/* 메뉴 (라벨 + › 셰브론, 행마다 아래 구분선) */}
      <View style={styles.menu}>
        {MENU.map((m) => (
          <TouchableOpacity
            key={m.label}
            style={styles.menuRow}
            disabled={m.soon}
            onPress={() => m.route && router.push(m.route as never)}
          >
            <Text style={[styles.menuLabel, m.soon && styles.menuLabelDisabled]}>{m.label}</Text>
            {m.soon ? (
              <Text style={styles.menuSoon}>준비 중</Text>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* 냉장고 공개 토글 (메뉴 아래 유지) */}
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

      {/* 로그아웃 (스크롤 맨 아래 유지) */}
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  // 헤더 + 제목
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { ...typography.heading1, color: colors.thumbnail }, // 'Logo' 자리 — 브랜드명(다크 그린)
  title: { ...typography.heading1, color: colors.textPrimary, textAlign: 'center' }, // 가운데 '마이페이지'

  // 프로필
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileText: { gap: spacing.xs },
  displayName: { ...typography.heading2, color: colors.textPrimary }, // 이름(시안 18 Bold ≈ heading2)
  username: { ...typography.caption, color: colors.textSecondary }, // @username

  // 메뉴
  menu: {}, // 행들을 묶는 영역(시안엔 외곽 박스 없이 행별 구분선만)
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong, // 시안 구분선 #D1D1D6 = borderStrong
  },
  // ⚠️ 시안 메뉴 라벨 16px/Medium → 토큰 없음. body(15/Regular)로 근사. (figma-token-reconcile 대상)
  menuLabel: { ...typography.body, color: colors.textPrimary },
  menuLabelDisabled: { color: colors.textDisabled },
  menuSoon: { ...typography.caption, color: colors.textDisabled },

  // 냉장고 공개 토글
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleTextWrap: { flex: 1, gap: spacing.xs },
  toggleLabel: { ...typography.body, color: colors.textPrimary },
  toggleDesc: { ...typography.caption, color: colors.textSecondary },

  // 로그아웃
  logoutButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dangerTintBorder,
    marginTop: spacing.sm,
  },
  logoutText: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  errorText: { ...typography.body, color: colors.danger },
});
