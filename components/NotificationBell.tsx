import { useAuth } from '@/contexts/AuthContext';
import { hasUnreadNotifications } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

// 임시 디자인 값. 디자인 토큰이 정해지면 여기만 교체하면 된다.
// (종은 기본 텍스트 색, 빨간 점은 danger 계열)
const BELL_SIZE = 24;
const BELL_COLOR = '#111'; // TODO: theme.text 로 교체
const BADGE_COLOR = '#ef4444'; // TODO: theme.danger 로 교체
const BADGE_SIZE = 9;

/** 상단 헤더 우측에 두는 알림 종 아이콘. 안 읽은 알림이 있으면 빨간 점을 표시한다. */
export default function NotificationBell() {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  // 화면 포커스 시마다 다시 확인한다. (알림 화면에서 읽고 돌아오면 갱신)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      hasUnreadNotifications(user.id)
        .then((v) => { if (active) setHasUnread(v); })
        .catch(() => {});
      return () => { active = false; };
    }, [user]),
  );

  return (
    <TouchableOpacity
      onPress={() => router.push('/(main)/notifications' as never)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? '알림 (새 알림 있음)' : '알림'}
    >
      <Ionicons name="notifications-outline" size={BELL_SIZE} color={BELL_COLOR} />
      {hasUnread && <View style={styles.badge} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: BADGE_COLOR,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
