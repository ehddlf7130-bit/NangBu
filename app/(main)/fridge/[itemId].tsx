import { colors, radius } from '@/constants/theme';
import CommentCardList from '@/components/CommentCardList';
import ItemForm from '@/components/ItemForm';
import { fetchComments } from '@/lib/comments';
import { deleteItem, extractErrorMessage, fetchItem, itemToFormValues, updateItem } from '@/lib/items';
import type { Comment } from '@/types/comment';
import type { Item, ItemFormValues } from '@/types/item';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    fetchItem(itemId)
      .then(setItem)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(() => {
    if (!itemId) return;
    fetchComments(itemId)
      .then(setComments)
      .catch((e: unknown) => setCommentError(extractErrorMessage(e)))
      .finally(() => setCommentLoading(false));
  }, [itemId]);

  async function handleUpdate(values: ItemFormValues) {
    if (!itemId) return;
    await updateItem(itemId, values);
    router.back();
  }

  function handleDelete() {
    if (!itemId) return;
    const message = `"${item?.name}"을(를) 삭제하시겠습니까?`;

    // 실제 삭제 실행 (확인 후 호출). 웹은 Alert 버튼 콜백이 동작하지 않아 window.alert로 에러 표시.
    const doDelete = async () => {
      try {
        await deleteItem(itemId);
        router.replace('/(main)/(tabs)' as never);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '삭제에 실패했습니다.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(msg);
        else Alert.alert('오류', msg);
      }
    };

    // 웹에서는 Alert.alert의 버튼 콜백이 동작하지 않으므로 window.confirm으로 분기.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) doDelete();
      return;
    }
    Alert.alert('품목 삭제', message, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: doDelete },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
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

  const initialValues: ItemFormValues = itemToFormValues(item);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.name}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>삭제</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 탭 화면이라 인스턴스가 유지된다. 다른 재료를 편집할 때 이전 값이 남지 않도록 key로 재마운트. */}
        <ItemForm key={itemId} mode="edit" initialValues={initialValues} onSubmit={handleUpdate} scrollable={false} />
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>코멘트</Text>
          <CommentCardList comments={comments} loading={commentLoading} error={commentError} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dangerTintBorder,
  },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 32 },
  commentSection: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  commentTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  errorText: { color: colors.danger, fontSize: 15 },
});
