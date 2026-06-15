import { supabase } from './supabase';
import type { AppNotification } from '@/types/notification';

// 알림 + 연결된 품목명 + 코멘트(작성자 포함)를 한 번에 가져온다.
// notifications → items(item_id), notifications → comments(comment_id),
// comments → profiles(author_id) 모두 단일 FK라 임베드가 모호하지 않다.
const NOTIFICATION_SELECT =
  'id, type, item_id, comment_id, actor_id, is_read, created_at, ' +
  'item:items(id, name, expire_date), ' +
  'comment:comments(id, content, author:profiles(id, display_name, username)), ' +
  'actor:profiles!actor_id(id, display_name, username)';

/** 내가 받은 알림을 최신순으로 조회한다. (RLS: recipient만 조회 가능) */
export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

/** 내가 받은 알림 중 안 읽은(is_read=false) 것이 1개 이상 있는지 확인한다. (종 뱃지용) */
export async function hasUnreadNotifications(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** 알림을 읽음 처리한다. (RLS: recipient만 update 가능) */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
}
