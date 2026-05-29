import { formatDateTime } from '@/lib/format';
import type { Comment } from '@/types/comment';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface CommentListProps {
  comments: Comment[];
  loading?: boolean;
  error?: string | null;
}

/** 품목에 달린 코멘트 목록 표시 전용 컴포넌트 (친구 냉장고/내 품목 화면 공용). */
export default function CommentList({ comments, loading, error }: CommentListProps) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
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
        <View key={c.id} style={styles.row}>
          <View style={styles.header}>
            <Text style={styles.author}>{c.author?.display_name ?? '알 수 없음'}</Text>
            <Text style={styles.time}>{formatDateTime(c.created_at)}</Text>
          </View>
          <Text style={styles.content}>{c.content}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 16, alignItems: 'center' },
  list: { gap: 10 },
  row: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 4,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: 14, fontWeight: '600', color: '#111' },
  time: { fontSize: 12, color: '#aaa' },
  content: { fontSize: 14, color: '#333', lineHeight: 20 },
  empty: { fontSize: 14, color: '#aaa', textAlign: 'center', paddingVertical: 16 },
  error: { fontSize: 14, color: '#ef4444', paddingVertical: 8 },
});
