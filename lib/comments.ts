import { supabase } from './supabase';
import type { Comment } from '@/types/comment';

// 코멘트 + 작성자 프로필을 한 번에 가져온다.
// comments → profiles 관계는 author_id 하나뿐이라 임베드가 모호하지 않다.
const COMMENT_SELECT = 'id, item_id, author_id, content, created_at, author:profiles(id, display_name, username)';

/** 특정 품목에 달린 코멘트를 오래된 순으로 조회한다. */
export async function fetchComments(itemId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

/**
 * 친구 품목에 코멘트를 작성한다.
 * RLS(comments: insert as accepted friend)가 "수락된 친구 + 공개 냉장고"인지 검증한다.
 * 코멘트가 들어가면 DB 트리거가 notifications를 자동 생성하므로 앱은 추가 작업이 없다.
 */
export async function createComment(
  itemId: string,
  authorId: string,
  content: string,
): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ item_id: itemId, author_id: authorId, content })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Comment;
}
