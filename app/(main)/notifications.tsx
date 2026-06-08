import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/items';
import { fetchNotifications, markNotificationRead } from '@/lib/notifications';
import type { AppNotification } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const THUMB_SIZE = 40; // 시안 고정 치수
const UNREAD_DOT_SIZE = 7;
const BACK_ICON_SIZE = 26;

// 타입별 제목/본문 생성. (타입·라우팅·읽음 로직은 그대로, 시안 레이아웃에 맞춰 제목/본문으로만 분리)
function notificationContent(n: AppNotification): { title: string; body: string | null } {
  if (n.type === 'friend_accepted') {
    const actorName = n.actor?.display_name ?? '친구';
    return { title: `${actorName}님과 친구가 되었어요`, body: '친구 요청을 수락했어요.' };
  }
  // comment
  const author = n.comment?.author?.display_name ?? '친구';
  const itemName = n.item?.name ?? '품목';
  const content = n.comment?.content;
  return {
    title: `${itemName}에 새 코멘트`,
    body: content ? `${author}: ${content}` : `${author}님이 코멘트를 남겼어요.`,
  };
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchNotifications(user.id)
      .then((data) => { if (active) setNotifications(data); })
      .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useFocusEffect(load);

  async function handlePress(n: AppNotification) {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      );
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.type === 'friend_accepted' && n.actor_id) {
      router.push(`/(main)/friends/${n.actor_id}` as never);
    } else if (n.item_id) {
      router.push(`/(main)/item/${n.item_id}` as never);
    }
  }

  return (
    <View style={styles.container}>
      <Header />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
        <Ionicons name="chevron-back" size={BACK_ICON_SIZE} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>알림</Text>
      {/* 제목을 가운데 정렬하기 위한 좌우 균형용 여백 */}
      <View style={styles.backButton} />
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const unread = !notification.is_read;
  const { title, body } = notificationContent(notification);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.thumb} />

      <View style={styles.rowMain}>
        <View style={styles.titleLine}>
          <View style={styles.titleLeft}>
            {unread && <View style={styles.unreadDot} />}
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
          <Text style={styles.time}>{formatRelativeTime(notification.created_at)}</Text>
        </View>
        {body ? (
          <Text style={styles.body} numberOfLines={2}>{body}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>알림이 없어요</Text>
      <Text style={styles.emptyDesc}>친구가 코멘트를 남기거나 친구 요청을 수락하면 여기에 표시돼요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // 헤더: 좌측 뒤로가기 + 가운데 제목
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: { width: BACK_ICON_SIZE + spacing.sm, alignItems: 'flex-start' },
  headerTitle: { ...typography.heading2, color: colors.textPrimary },

  list: { paddingBottom: spacing.xl },
  emptyContainer: { flex: 1 },

  // 알림 행
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.thumbnail,
  },
  rowMain: { flex: 1, marginLeft: spacing.md, gap: spacing.xs },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  unreadDot: {
    width: UNREAD_DOT_SIZE,
    height: UNREAD_DOT_SIZE,
    borderRadius: UNREAD_DOT_SIZE / 2,
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.body,
    fontWeight: typography.heading2.fontWeight,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  time: { ...typography.caption, color: colors.textSecondary },
  body: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

  // 빈 상태
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.heading2, color: colors.textPrimary },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  errorText: { ...typography.body, color: colors.danger },
});
