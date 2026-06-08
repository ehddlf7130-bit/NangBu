import { colors } from '@/constants/theme';
import { STORAGE_LABELS, type Item } from '@/types/item';
import { StyleSheet, Text, View } from 'react-native';

/** 품목 정보를 읽기 전용으로 표시하는 컴포넌트 (재료 정보 화면 전용). */
export default function ItemDetail({ item }: { item: Item }) {
  return (
    <View style={styles.container}>
      <Row label="이름" value={item.name} />
      <Row label="카테고리" value={item.category || '-'} />
      <Row label="보관 방식" value={STORAGE_LABELS[item.storage]} />
      <Row label="보관법" value={item.storage_tip || '-'} />
      <Row label="유통기한" value={item.expire_date || '-'} />
      <Row label="수량" value={`${item.quantity}개`} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  row: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  value: { fontSize: 16, color: colors.textPrimary },
});
