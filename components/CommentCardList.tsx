// 코멘트 목록을 "흰 카드(CommentCard)" 모양으로 그리는 부품(컴포넌트).
// 로딩/에러/빈 상태 처리 + 목록 매핑까지 담당하고, 한 줄 한 줄은 CommentCard에게 그리게 시킨다.
// 기존 CommentList(회색 면+테두리)와 props 시그니처가 같아 화면에서 1:1로 갈아끼울 수 있다.
import CommentCard from '@/components/CommentCard';
import { colors } from '@/constants/theme';
import type { Comment } from '@/types/comment';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface CommentCardListProps {
  comments: Comment[];
  loading?: boolean;
  error?: string | null;
  // 있으면 각 카드 우상단에 휴지통(삭제)을 노출하고, 누르면 해당 코멘트를 넘겨준다. 없으면 휴지통 숨김.
  onDelete?: (comment: Comment) => void;
}

/** 품목에 달린 코멘트를 카드 목록으로 표시 (친구 냉장고/내 품목 화면 공용). CommentList의 카드형 대체. */
export default function CommentCardList({ comments, loading, error, onDelete }: CommentCardListProps) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (comments.length === 0) {
    return <Text style={styles.empty}>아직 코멘트가 없어요.</Text>;
  }

  return (
    <View style={styles.list}>
      {comments.map((c) => (
        <CommentCard
          key={c.id}
          // 작성자는 핸들(username) 우선 — Figma 시안의 초록 텍스트가 핸들 형태였다. 없으면 표시명/대체문구.
          username={c.author?.username ?? c.author?.display_name ?? '알 수 없음'}
          message={c.content}
          onDelete={onDelete ? () => onDelete(c) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 }, // 카드 사이 간격 (CommentList와 동일)
  center: { paddingVertical: 16, alignItems: 'center' }, // 로딩 동그라미를 가운데
  empty: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 }, // 코멘트 없을 때 안내
  error: { fontSize: 14, color: colors.danger, paddingVertical: 8 }, // 불러오기 실패 메시지
});
