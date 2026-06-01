import CommentList from '@/components/CommentList';
import ItemDetail from '@/components/ItemDetail';
import { useAuth } from '@/contexts/AuthContext';
import { createComment, fetchComments } from '@/lib/comments';
import { extractErrorMessage, fetchItem } from '@/lib/items';
import type { Comment } from '@/types/comment';
import type { Item } from '@/types/item';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// 재료 정보(읽기 전용) 화면.
// 내 재료로 진입 → '편집' 버튼(편집 화면으로 이동).
// 친구 재료로 진입 → 코멘트 목록 + 작성.
export default function ItemInfoScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchItem(itemId)
      .then((data) => { if (active) setItem(data); })
      .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '품목을 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  const isOwner = item.owner_id === user?.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
      </View>

      {isOwner ? (
        <OwnerView item={item} />
      ) : (
        <FriendView item={item} userId={user?.id ?? null} />
      )}
    </View>
  );
}

/** 내 재료: 정보 + 편집 버튼 + 코멘트 목록(읽기 전용). */
function OwnerView({ item }: { item: Item }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCommentLoading(true);
    setCommentError(null);
    fetchComments(item.id)
      .then((c) => { if (active) setComments(c); })
      .catch((e: unknown) => { if (active) setCommentError(extractErrorMessage(e)); })
      .finally(() => { if (active) setCommentLoading(false); });
    return () => { active = false; };
  }, [item.id]);

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardShouldPersistTaps="handled"
    >
      <ItemDetail item={item} />
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push(`/(main)/fridge/${item.id}` as never)}
      >
        <Text style={styles.editText}>편집</Text>
      </TouchableOpacity>
      <View style={styles.commentSection}>
        <Text style={styles.commentTitle}>코멘트</Text>
        <CommentList comments={comments} loading={commentLoading} error={commentError} />
      </View>
    </ScrollView>
  );
}

/** 친구 재료: 정보 + 코멘트 목록/작성. */
function FriendView({ item, userId }: { item: Item; userId: string | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    setCommentLoading(true);
    setCommentError(null);
    fetchComments(item.id)
      .then((c) => { if (active) setComments(c); })
      .catch((e: unknown) => { if (active) setCommentError(extractErrorMessage(e)); })
      .finally(() => { if (active) setCommentLoading(false); });
    return () => { active = false; };
  }, [item.id]);

  async function handlePost() {
    if (!userId) return;
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    try {
      await createComment(item.id, userId, content);
      setText('');
      setComments(await fetchComments(item.id));
    } catch (e: unknown) {
      Alert.alert('작성 실패', extractErrorMessage(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.body}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ItemDetail item={item} />
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>코멘트</Text>
          <CommentList comments={comments} loading={commentLoading} error={commentError} />
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.commentInput}
          value={text}
          onChangeText={setText}
          placeholder="코멘트를 남겨보세요"
          placeholderTextColor="#bbb"
          editable={!posting}
          multiline
        />
        <TouchableOpacity
          style={[styles.postButton, (posting || !text.trim()) && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={posting || !text.trim()}
        >
          {posting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>작성</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, gap: 4 },
  backText: { fontSize: 15, color: '#3b82f6', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 20 },
  editButton: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  editText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  commentSection: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  commentTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fff',
  },
  postButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 18,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#ef4444', fontSize: 15 },
});
