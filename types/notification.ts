import type { CommentAuthor } from '@/types/comment';

export interface NotificationItemRef {
  id: string;
  name: string;
}

export interface NotificationCommentRef {
  id: string;
  content: string;
  author: CommentAuthor | null;
}

export type NotificationType = 'comment' | 'friend_accepted';

export interface AppNotification {
  id: string;
  type: NotificationType;
  item_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  item: NotificationItemRef | null;
  comment: NotificationCommentRef | null;
  actor: CommentAuthor | null; // friend_accepted 시 수락한 사람
}
