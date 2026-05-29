import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/items';
import { fetchNotifications, markNotificationRead } from '@/lib/notifications';
import type { AppNotification } from '@/types/notification';
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
    // 읽음 처리 후 해당 품목 상세로 이동. 읽음 실패해도 이동은 막지 않는다.
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      );
      markNotificationRead(n.id).catch(() => {});
    }
    router.push(`/(main)/fridge/${n.item_id}` as never);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>알림</Text>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => handlePress(item)} />
        )}
      />
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
  const author = notification.comment?.author?.display_name ?? '친구';
  const itemName = notification.item?.name ?? '품목';
  const content = notification.comment?.content;
  const unread = !notification.is_read;

  return (
    <TouchableOpacity style={[styles.row, unread && styles.rowUnread]} onPress={onPress}>
      {unread && <View style={styles.unreadDot} />}
      <View style={styles.rowMain}>
        <Text style={[styles.rowText, unread && styles.rowTextUnread]}>
          {author}님이 <Text style={styles.bold}>{itemName}</Text>에 코멘트를 남겼어요
        </Text>
        {content ? (
          <Text style={styles.preview} numberOfLines={1}>“{content}”</Text>
        ) : null}
        <Text style={styles.time}>{formatDateTime(notification.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>알림이 없어요</Text>
      <Text style={styles.emptyDesc}>친구가 내 품목에 코멘트를 남기면 여기에 표시돼요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowUnread: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 6,
    marginRight: 10,
  },
  rowMain: { flex: 1, gap: 4 },
  rowText: { fontSize: 15, color: '#444', lineHeight: 21 },
  rowTextUnread: { color: '#111' },
  bold: { fontWeight: '700' },
  preview: { fontSize: 13, color: '#888' },
  time: { fontSize: 12, color: '#aaa' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
});
