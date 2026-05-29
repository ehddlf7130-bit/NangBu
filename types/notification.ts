import type { CommentAuthor } from '@/types/comment';

// 알림이 가리키는 품목 (items에서 임베드)
export interface NotificationItemRef {
  id: string;
  name: string;
}

// 알림을 일으킨 코멘트 (comments에서 임베드, 작성자 포함)
export interface NotificationCommentRef {
  id: string;
  content: string;
  author: CommentAuthor | null;
}

// notifications 테이블 행 + 연결된 품목/코멘트 정보
export interface AppNotification {
  id: string;
  type: string;
  item_id: string;
  comment_id: string;
  is_read: boolean;
  created_at: string;
  item: NotificationItemRef | null;
  comment: NotificationCommentRef | null;
}
