// 재료 한 개의 정보를 "보기 전용"으로 예쁘게 그려주는 부품(컴포넌트).
// 재료 정보 화면(item/[itemId])이 위쪽에 이 부품을 놓아 사진·이름·소비기한·보관 팁을 보여준다.
// 위에서부터: 큰 이미지 자리 / 이름+보관방식 / 소비기한+상태점 / 안내 박스 / 보관 팁 순으로 그린다.
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getDday, getDdayColor } from '@/lib/expiry';
import { formatExpireDate } from '@/lib/format';
import { ingredientImageUrl } from '@/lib/ingredients';
import { STORAGE_LABELS, type Item } from '@/types/item';
import { Image, StyleSheet, Text, View } from 'react-native';

const IMAGE_HEIGHT = 184; // 시안 고정 치수 (node 1-937). 이미지 없으면 단색 placeholder
const STATUS_DOT_SIZE = 10;

// 표준 보관 정보가 단정적으로 들리지 않도록 한 중립 안내 문구.
const NOTICE_TEXT = '표준 보관 정보는 참고용이에요. 식품 상태를 직접 확인해 주세요.';

/** 품목 정보를 읽기 전용으로 표시하는 컴포넌트 (재료 정보 화면 전용). */
// item = 보여줄 재료 한 개의 정보(부모 화면이 props로 넘겨준다).
export default function ItemDetail({ item }: { item: Item }) {
  const tip = item.storage_tip?.trim(); // 보관 팁 글(앞뒤 공백 제거)
  const hasTip = !!tip; // 보관 팁이 있는지. 없으면 안내 박스·팁 섹션을 통째로 숨긴다
  const dday = item.expire_date ? getDday(item.expire_date) : null; // 남은 일수. 유통기한 없으면 null(소비기한 줄 숨김)
  const uri = ingredientImageUrl(item.image_path); // 연결된 표준 재료의 대표 이미지 URL. 없으면 null(단색 placeholder 유지)

  // 줄바꿈이 있으면 불릿 리스트, 없으면 한 단락.
  const tipLines = hasTip ? tip.split('\n').map((l) => l.trim()).filter(Boolean) : []; // 팁을 줄 단위로 나눈 것
  const asBullets = (tip?.includes('\n') ?? false) && tipLines.length > 1; // 여러 줄이면 점(•) 목록으로 보여줄지 여부

  return (
    <View>
      {/* 2. 상단 대표 이미지. 있으면 영역을 꽉 채우고, 없으면 단색 placeholder 유지 */}
      <View style={styles.image}>
        {uri && (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        )}
      </View>

      <View style={styles.content}>
        {/* 3. 이름 + 보관방식 */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.storage}>{STORAGE_LABELS[item.storage]}</Text>
        </View>

        {/* 4. 소비기한 + 상태점 (유통기한 없으면 숨김) */}
        {item.expire_date && dday !== null && (
          <View style={styles.expiryRow}>
            <Text style={styles.expiryText}>
              권장 소비기한 <Text style={styles.expiryDate}>{formatExpireDate(item.expire_date)}</Text> 까지
            </Text>
            <View style={[styles.statusDot, { backgroundColor: getDdayColor(dday) }]} />
          </View>
        )}

        {/* 5. 안내 박스 (보관 정보가 있을 때만) */}
        {hasTip && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{NOTICE_TEXT}</Text>
          </View>
        )}

        {/* 6 + 7. 구분선 + 보관 팁 섹션 (보관 정보가 있을 때만) */}
        {hasTip && (
          <>
            <View style={styles.divider} />
            <Text style={styles.tipTitle}>{STORAGE_LABELS[item.storage]} 보관</Text>
            <View style={styles.tipBox}>
              {asBullets ? (
                tipLines.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.bulletText}>{tip}</Text>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  image: { // 맨 위 대표 이미지 영역. 이미지 없으면 단색, 있으면 이미지가 덮음
    width: '100%',
    height: IMAGE_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.background, // contain 여백을 흰색으로 (초록 대신)
    overflow: 'hidden', // 안의 이미지가 둥근 모서리 밖으로 삐져나오지 않게
  },
  content: { // 이미지 아래 글자 영역 전체의 안쪽 여백과 요소 간격
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  nameRow: { // 이름(왼쪽)과 보관방식(오른쪽)을 양끝으로 둔 줄
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { ...typography.heading1, color: colors.textPrimary, flexShrink: 1 }, // 재료 이름(가장 큰 제목 글자)
  storage: { ...typography.body, color: colors.textSecondary }, // 이름 오른쪽 보관방식 글자(냉장/냉동/실온)
  expiryRow: { // 소비기한 문구(왼쪽)와 상태점(오른쪽)을 양끝으로 둔 줄
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  expiryText: { ...typography.body, color: colors.textSecondary, flexShrink: 1 }, // '권장 소비기한 … 까지' 문구
  expiryDate: { color: colors.textPrimary, fontWeight: typography.heading2.fontWeight }, // 그 문구 안 날짜 부분만 진하게 강조
  statusDot: { // 소비기한 줄 오른쪽 임박도 색점
    width: STATUS_DOT_SIZE,
    height: STATUS_DOT_SIZE,
    borderRadius: STATUS_DOT_SIZE / 2,
  },
  noticeBox: { // '참고용이에요' 안내 박스(테두리만 있는 박스)
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  noticeText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 }, // 안내 박스 안 글자
  divider: { // 안내 박스와 보관 팁 섹션을 나누는 얇은 가로 구분선
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  tipTitle: { ...typography.heading2, color: colors.textPrimary }, // 보관 팁 섹션 소제목(예: '냉장 보관')
  tipBox: { // 보관 팁 내용을 담는 회색 박스
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bulletRow: { flexDirection: 'row', gap: spacing.sm }, // 팁이 여러 줄일 때 점(•) 한 줄(점 + 글)을 가로로 배치
  bullet: { ...typography.body, color: colors.textPrimary }, // 줄 앞의 점(•) 기호
  bulletText: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 21 }, // 팁 글자(한 단락 또는 점 목록의 한 줄)
});
