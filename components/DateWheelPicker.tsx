// 년/월/일을 각각 위아래로 스크롤해 고르는 휠 피커(바텀시트 모달).
// 새 패키지 없이 RN 코어 ScrollView의 snapToInterval + 가운데 강조 밴드 +
// 스크롤 위치 기반 opacity 페이드로 시안을 재현한다.
// 날짜만 고르며(보관방식은 호출부 칩에서 따로 선택), 결과는 'YYYY-MM-DD'로 돌려준다.
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// 시안 고정 치수(테마 토큰이 아닌 레이아웃 스펙).
const ITEM_HEIGHT = 44;   // 휠 항목 한 칸 높이
const VISIBLE_COUNT = 5;  // 한 번에 보이는 항목 수(가운데 + 위아래 각 2칸)
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2); // 위/아래 여백(첫·마지막 항목도 가운데로)

const NOW = new Date();
const YEAR_START = NOW.getFullYear() - 1;
const YEAR_END = NOW.getFullYear() + 10;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const pad2 = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

interface Props {
  visible: boolean;
  value: string; // 'YYYY-MM-DD' 또는 '' (빈값이면 오늘로 시작)
  onConfirm: (date: string) => void; // 'YYYY-MM-DD'
  onClose: () => void;
}

export default function DateWheelPicker({ visible, value, onConfirm, onClose }: Props) {
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [day, setDay] = useState(NOW.getDate());

  // 모달이 열릴 때 value(또는 오늘)로 초기화.
  useEffect(() => {
    if (!visible) return;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) {
      setYear(Number(m[1]));
      setMonth(Number(m[2]));
      setDay(Number(m[3]));
    } else {
      setYear(NOW.getFullYear());
      setMonth(NOW.getMonth() + 1);
      setDay(NOW.getDate());
    }
  }, [visible, value]);

  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  // 월 변경으로 일수가 줄면 선택 일을 말일로 보정.
  const safeDay = Math.min(day, days.length);

  function confirm() {
    onConfirm(`${year}-${pad2(month)}-${pad2(safeDay)}`);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.cancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>유통기한</Text>
          <TouchableOpacity onPress={confirm} hitSlop={8}>
            <Text style={styles.confirm}>확인</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.wheels}>
          {/* 가운데 강조 밴드(터치 통과) */}
          <View pointerEvents="none" style={styles.centerBand} />
          <WheelColumn data={YEARS} selectedIndex={Math.max(0, YEARS.indexOf(year))} suffix="년" onChange={(i) => setYear(YEARS[i])} />
          <WheelColumn data={MONTHS} selectedIndex={month - 1} suffix="월" onChange={(i) => setMonth(MONTHS[i])} />
          <WheelColumn data={days} selectedIndex={safeDay - 1} suffix="일" onChange={(i) => setDay(i + 1)} />
        </View>
      </View>
    </Modal>
  );
}

// 한 컬럼(년/월/일). 스냅 스크롤 + 가운데에서 멀어질수록 흐려지는 페이드.
function WheelColumn({
  data,
  selectedIndex,
  onChange,
  suffix,
}: {
  data: number[];
  selectedIndex: number;
  onChange: (index: number) => void;
  suffix: string;
}) {
  const scrollY = useRef(new Animated.Value(selectedIndex * ITEM_HEIGHT)).current;
  const ref = useRef<ScrollView>(null);

  // 선택 인덱스로 초기/보정 스크롤.
  useEffect(() => {
    const id = setTimeout(
      () => ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false }),
      0,
    );
    return () => clearTimeout(id);
  }, [selectedIndex]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    if (clamped !== selectedIndex) onChange(clamped);
  }

  return (
    <View style={styles.column}>
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {data.map((v, i) => {
          const inputRange = [
            (i - 2) * ITEM_HEIGHT,
            (i - 1) * ITEM_HEIGHT,
            i * ITEM_HEIGHT,
            (i + 1) * ITEM_HEIGHT,
            (i + 2) * ITEM_HEIGHT,
          ];
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.25, 0.5, 1, 0.5, 0.25],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={v} style={[styles.item, { opacity }]}>
              <Text style={styles.itemText}>
                {v}
                {suffix}
              </Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: { ...typography.heading2, color: colors.textPrimary },
  cancel: { ...typography.body, color: colors.textSecondary },
  confirm: { ...typography.body, color: colors.primary, fontWeight: '700' },

  wheels: { flexDirection: 'row', height: PICKER_HEIGHT, paddingHorizontal: spacing.lg },
  centerBand: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: PAD,
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  column: { flex: 1 },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { ...typography.heading2, color: colors.textPrimary },
});
