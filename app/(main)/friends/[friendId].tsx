import CommentList from '@/components/CommentList';
import ItemForm from '@/components/ItemForm';
import { useAuth } from '@/contexts/AuthContext';
import { createComment, fetchComments } from '@/lib/comments';
import { fetchFriendItems, fetchFriendProfile } from '@/lib/friends';
import { extractErrorMessage, itemToFormValues } from '@/lib/items';
import type { Comment } from '@/types/comment';
import type { Profile } from '@/types/friend';
import { STORAGE_LABELS, type Item } from '@/types/item';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function FriendFridgeScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!friendId) return;
      let active = true;
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const p = await fetchFriendProfile(friendId);
          if (!active) return;
          setProfile(p);
          // 비공개 냉장고는 RLS가 어차피 막지만, "공개하지 않음"과
          // "품목 없음"을 구분하려고 공개일 때만 품목을 불러온다.
          setItems(p.fridge_public ? await fetchFriendItems(friendId) : []);
        } catch (e: unknown) {
          if (active) setError(extractErrorMessage(e));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [friendId]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '친구를 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{profile.display_name}님의 냉장고</Text>
        <Text style={styles.subtitle}>@{profile.username}</Text>
      </View>

      {!profile.fridge_public ? (
        <PrivateState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <ItemRow item={item} onPress={() => setSelectedItem(item)} />
          )}
        />
      )}

      <ItemCommentModal
        item={selectedItem}
        userId={user?.id ?? null}
        onClose={() => setSelectedItem(null)}
      />
    </View>
  );
}

/** 친구 품목을 readonly로 보여주고 코멘트 목록 + 작성란을 제공하는 모달. */
function ItemCommentModal({
  item,
  userId,
  onClose,
}: {
  item: Item | null;
  userId: string | null;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  // 모달이 열릴 때(품목 선택) 해당 품목의 코멘트를 불러온다.
  useEffect(() => {
    if (!item) {
      setComments([]);
      setText('');
      setCommentError(null);
      return;
    }
    let active = true;
    setCommentLoading(true);
    setCommentError(null);
    fetchComments(item.id)
      .then((c) => { if (active) setComments(c); })
      .catch((e: unknown) => { if (active) setCommentError(extractErrorMessage(e)); })
      .finally(() => { if (active) setCommentLoading(false); });
    return () => { active = false; };
  }, [item]);

  async function handlePost() {
    if (!item || !userId) return;
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
    <Modal
      visible={item !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {item?.name}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* 배경(폼·코멘트 영역)을 탭하면 키보드를 닫는다. 버튼/스크롤은 그대로 동작. */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>
              {item && (
                <ItemForm mode="readonly" initialValues={itemToFormValues(item)} scrollable={false} />
              )}
              <View style={styles.commentSection}>
                <Text style={styles.commentTitle}>코멘트</Text>
                <CommentList comments={comments} loading={commentLoading} error={commentError} />
              </View>
            </View>
          </TouchableWithoutFeedback>
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
    </Modal>
  );
}

function ItemRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const isExpired = item.expire_date ? new Date(item.expire_date) < new Date() : false;
  const isSoon = !isExpired && item.expire_date
    ? (new Date(item.expire_date).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.category}  ·  {STORAGE_LABELS[item.storage]}  ·  {item.quantity}개
        </Text>
      </View>
      {item.expire_date && (
        <Text style={[styles.expireText, isExpired && styles.expired, isSoon && styles.soon]}>
          {isExpired ? '만료' : isSoon ? '임박' : item.expire_date}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function PrivateState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔒</Text>
      <Text style={styles.emptyTitle}>공개하지 않음</Text>
      <Text style={styles.emptyDesc}>이 친구는 냉장고를 공개하지 않았어요.</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧊</Text>
      <Text style={styles.emptyTitle}>냉장고가 비어있어요</Text>
      <Text style={styles.emptyDesc}>아직 등록된 품목이 없어요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, gap: 4 },
  backText: { fontSize: 15, color: '#3b82f6', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 13, color: '#888' },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowMain: { gap: 4, flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 13, color: '#888' },
  expireText: { fontSize: 13, color: '#888', marginLeft: 8 },
  expired: { color: '#ef4444', fontWeight: '600' },
  soon: { color: '#f59e0b', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    // 풀스크린 모달이라 iOS에선 노치/상태바를 피하도록 위 여백을 더 준다.
    paddingTop: Platform.select({ ios: 56, default: 20 }),
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111', flex: 1, marginRight: 12 },
  closeButton: { paddingHorizontal: 12, paddingVertical: 6 },
  closeText: { fontSize: 15, color: '#3b82f6', fontWeight: '600' },
  modalBody: { flex: 1 },
  modalBodyContent: { paddingBottom: 20 },
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
});
