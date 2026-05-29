// 코멘트 작성자(profiles에서 임베드)
export interface CommentAuthor {
  id: string;
  display_name: string;
  username: string;
}

// comments 테이블 행 + 작성자 정보
export interface Comment {
  id: string;
  item_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: CommentAuthor | null;
}
