// 알림 화면. 냉장고 메인 화면 오른쪽 위 '알림 종' 아이콘을 누르면 들어오는 화면이다.
// 헤더(뒤로가기+제목 '알림') 아래에 알림 목록(NotificationRow)을 그린다.
// 각 행: 썸네일 + 제목/본문 + 시간, 안 읽음이면 파란 점. 탭하면 읽음 처리 후 관련 화면(친구/재료)으로 이동.
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { DDAY_DANGER_THRESHOLD, getDday, getDdayColor } from '@/lib/expiry';
import { formatRelativeTime } from '@/lib/format';
import { extractErrorMessage } from '@/lib/items';
import { fetchNotifications, markNotificationRead } from '@/lib/notifications';
import type { AppNotification } from '@/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const THUMB_SIZE = 40; // 시안 고정 치수
const UNREAD_DOT_SIZE = 7;
const BACK_ICON_SIZE = 26;
const EXPIRY_ICON_SIZE = 22; // expiry 썸네일 안 시계 아이콘 크기(THUMB_SIZE 안에 들어가도록)

// 타입별 제목/본문 생성. (타입·라우팅·읽음 로직은 그대로, 시안 레이아웃에 맞춰 제목/본문으로만 분리)
function notificationContent(n: AppNotification): { title: string; body: string | null } {
  if (n.type === 'friend_accepted') {
    const actorName = n.actor?.display_name ?? '친구';
    return { title: `${actorName}님과 친구가 되었어요`, body: '친구 요청을 수락했어요.' };
  }
  if (n.type === 'expiry') {
    const itemName = n.item?.name ?? '재료';
    const title = `${itemName} 소비기한 알림`;
    // expire_date가 임베드돼 있으면 live로 D-day를 계산해 문구를 만든다(음수/0/양수 모두 처리).
    const expireDate = n.item?.expire_date;
    if (!expireDate) return { title, body: '소비기한을 확인해 주세요' };
    const dday = getDday(expireDate);
    const body =
      dday < 0
        ? `소비기한이 ${Math.abs(dday)}일 지났어요`
        : dday === 0
          ? '오늘까지예요'
          : `${dday}일 남았어요`;
    return { title, body };
  }
  // comment
  const author = n.comment?.author?.display_name ?? '친구';
  const itemName = n.item?.name ?? '품목';
  const content = n.comment?.content;
  return {
    title: `${itemName}에 새 코멘트`,
    body: content ? `${author}: ${content}` : `${author}님이 코멘트를 남겼어요.`,
  };
}

export default function NotificationsScreen() {
  const { user } = useAuth(); // 지금 로그인한 사용자. 이 사람에게 온 알림만 불러온다
  // state = "화면이 기억하는 값". 바뀌면 화면이 자동으로 다시 그려진다.
  const [notifications, setNotifications] = useState<AppNotification[]>([]); // 불러온 알림 목록
  const [loading, setLoading] = useState(true); // 불러오는 중인지. true면 로딩 동그라미를 보여준다
  const [error, setError] = useState<string | null>(null); // 실패 메시지. 값이 있으면 목록 대신 에러 문구를 보여준다

  const load = useCallback(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchNotifications(user.id)
      .then((data) => { if (active) setNotifications(data); })
      .catch((e: unknown) => { if (active) setError(extractErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useFocusEffect(load);

  async function handlePress(n: AppNotification) {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      );
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.type === 'friend_accepted' && n.actor_id) {
      router.push(`/(main)/friends/${n.actor_id}` as never);
    } else if (n.item_id) {
      router.push(`/(main)/item/${n.item_id}` as never);
    }
  }

  return (
    <View style={styles.container}>
      {/* ── 헤더(뒤로가기 + 제목) ── */}
      <Header />

      {/* ── 알림 목록 (로딩 / 에러 / 목록·빈상태) ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        // 알림을 한 줄씩(NotificationRow) 쌓아 보여주는 목록
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          // 알림이 없으면 가운데 정렬용 틀, 있으면 일반 목록 여백
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
          // 알림이 하나도 없을 때 대신 보여줄 안내 화면
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </View>
  );
}

// 화면 맨 위 헤더: 왼쪽 뒤로가기 화살표 + 가운데 '알림' 제목.
function Header() {
  return (
    <View style={styles.header}>
      {/* 왼쪽: 누르면 이전 화면으로 돌아가는 < 화살표 */}
      <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
        <Ionicons name="chevron-back" size={BACK_ICON_SIZE} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>알림</Text>
      {/* 제목을 가운데 정렬하기 위한 좌우 균형용 여백 */}
      <View style={styles.backButton} />
    </View>
  );
}

// 알림 한 행: 썸네일 + (안읽음 점·제목·시간) + 본문 2줄.
// notification = 보여줄 알림 한 건(props로 받음), onPress = 이 행을 눌렀을 때 할 일.
function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const unread = !notification.is_read; // 아직 안 읽은 알림인지
  const { title, body } = notificationContent(notification); // 알림 종류에 맞는 제목/본문 문구

  return (
    // 행 전체가 버튼 — 누르면 onPress 실행(읽음 처리 후 관련 화면으로 이동)
    <TouchableOpacity style={styles.row} onPress={onPress}>
      {/* 왼쪽: 정사각형 썸네일 자리. expiry 알림만 시계 아이콘으로 분기 렌더(나머지는 단색) */}
      {notification.type === 'expiry' ? (
        <ExpiryThumb expireDate={notification.item?.expire_date ?? null} />
      ) : (
        <View style={styles.thumb} />
      )}

      {/* 오른쪽 본문 영역 */}
      <View style={styles.rowMain}>
        {/* 윗줄: (안읽음 점 + 제목) ──양끝── 시간 */}
        <View style={styles.titleLine}>
          <View style={styles.titleLeft}>
            {/* 안 읽음일 때만 파란 점 표시 */}
            {unread && <View style={styles.unreadDot} />}
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
          <Text style={styles.time}>{formatRelativeTime(notification.created_at)}</Text>
        </View>
        {/* 아랫줄: 본문(최대 2줄). 본문이 있을 때만 보여주고, 없으면 아무것도 안 그린다 */}
        {body ? (
          <Text style={styles.body} numberOfLines={2}>{body}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// expiry 알림 전용 썸네일: 단색 사각형 대신 시계(alarm) 아이콘 + D-day 상태 tint 배경.
// 색/배경은 getDdayColor 임계값을 그대로 따른다(임박할수록 danger). expire_date가 없으면 warning 기본.
function ExpiryThumb({ expireDate }: { expireDate: string | null }) {
  const dday = expireDate != null ? getDday(expireDate) : null;
  const iconColor = dday != null ? getDdayColor(dday) : colors.warning;
  const tintBg = dday != null && dday <= DDAY_DANGER_THRESHOLD ? colors.dangerTint : colors.warningTint;
  return (
    <View style={[styles.thumb, styles.expiryThumb, { backgroundColor: tintBg }]}>
      <Ionicons name="alarm-outline" size={EXPIRY_ICON_SIZE} color={iconColor} />
    </View>
  );
}

// 알림이 하나도 없을 때 목록 자리에 보여주는 안내(종 이모지 + 제목 + 설명).
function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>알림이 없어요</Text>
      <Text style={styles.emptyDesc}>친구가 코멘트를 남기거나 친구 요청을 수락하면 여기에 표시돼요.</Text>
    </View>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, // 화면 전체를 감싸는 바깥 틀(배경색)
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, // 로딩 동그라미·에러 문구를 화면 한가운데 놓는 틀

  // 헤더: 좌측 뒤로가기 + 가운데 제목
  header: { // 맨 위 헤더 줄 — 뒤로가기/제목/여백을 한 줄에 배치하고 아래에 구분선
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: { width: BACK_ICON_SIZE + spacing.sm, alignItems: 'flex-start' }, // 뒤로가기 화살표 칸. 제목을 가운데로 맞추려고 오른쪽에도 같은 폭의 빈 칸으로 재사용
  headerTitle: { ...typography.heading2, color: colors.textPrimary }, // 가운데 '알림' 제목 글자

  list: { paddingBottom: spacing.xl }, // 알림이 있을 때 목록 아래쪽 여백
  emptyContainer: { flex: 1 }, // 알림이 없을 때 빈 화면을 가운데로 채우기 위한 틀

  // 알림 행
  row: { // 알림 한 줄 전체 — 썸네일과 본문을 가로로 두고 아래에 구분선
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  thumb: { // 행 왼쪽 정사각형 썸네일(지금은 단색 자리)
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.thumbnail,
  },
  expiryThumb: { alignItems: 'center', justifyContent: 'center' }, // expiry 썸네일 — 아이콘을 가운데 정렬(배경색은 D-day에 따라 인라인 지정)
  rowMain: { flex: 1, marginLeft: spacing.md, gap: spacing.xs }, // 썸네일 오른쪽 본문 묶음(제목줄 + 본문줄)
  titleLine: { // 제목줄 — 왼쪽(점+제목)과 오른쪽(시간)을 양끝으로 배치
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }, // 제목줄 왼쪽(안읽음 점 + 제목)을 가로로 묶음
  unreadDot: { // 안 읽은 알림 앞의 작은 파란 점
    width: UNREAD_DOT_SIZE,
    height: UNREAD_DOT_SIZE,
    borderRadius: UNREAD_DOT_SIZE / 2,
    backgroundColor: colors.primary,
  },
  title: { // 알림 제목 글자(굵게)
    ...typography.body,
    fontWeight: typography.heading2.fontWeight,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  time: { ...typography.caption, color: colors.textSecondary }, // 제목줄 오른쪽 시간 글자(예: '3분 전')
  body: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 }, // 제목 아래 본문 글자(최대 2줄)

  // 빈 상태
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80 }, // 빈 상태 안내(이모지+제목+설명)를 화면 가운데 모음
  emptyIcon: { fontSize: 48 }, // 빈 상태 큰 종 이모지(🔔)
  emptyTitle: { ...typography.heading2, color: colors.textPrimary }, // 빈 상태 제목 글자
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' }, // 빈 상태 설명 글자
  errorText: { ...typography.body, color: colors.danger }, // 에러 메시지 글자(빨간색)
});
