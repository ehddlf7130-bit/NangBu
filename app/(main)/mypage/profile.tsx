import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAccount } from '@/lib/account';
import { extractErrorMessage } from '@/lib/items';
import { fetchMyProfile, updateDisplayName, updatePassword } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileEditScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      fetchMyProfile(user.id)
        .then((p) => { if (active) setDisplayName(p.display_name); })
        .catch((e: unknown) => { if (active) Alert.alert('오류', extractErrorMessage(e)); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [user]),
  );

  async function handleSaveName() {
    if (!user) return;
    const name = displayName.trim();
    if (!name) {
      Alert.alert('알림', '회원명을 입력해주세요.');
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(user.id, name);
      Alert.alert('완료', '회원명을 변경했습니다.');
    } catch (e: unknown) {
      Alert.alert('변경 실패', extractErrorMessage(e));
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(password);
      setPassword('');
      setPasswordConfirm('');
      Alert.alert('완료', '비밀번호를 변경했습니다.');
    } catch (e: unknown) {
      Alert.alert('변경 실패', extractErrorMessage(e));
    } finally {
      setSavingPassword(false);
    }
  }

  async function runDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      // 탈퇴로 토큰이 무효화되므로 로컬 세션만 비우고 로그인 화면으로 이동.
      await supabase.auth.signOut().catch(() => {});
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      const msg = extractErrorMessage(e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(msg);
      else Alert.alert('회원 탈퇴 실패', msg);
      setDeleting(false);
    }
  }

  // 탈퇴 확인. 웹에서는 Alert가 동작하지 않아 window.confirm을 사용한다.
  function confirmDeleteAccount() {
    if (deleting) return;
    const message = '회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다. 탈퇴하시겠습니까?';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) runDeleteAccount();
      return;
    }
    Alert.alert('회원 탈퇴', message, [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: runDeleteAccount },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>프로필 수정</Text>
      </View>

      {/* 회원명 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>회원명</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="회원명"
          placeholderTextColor={colors.textDisabled}
        />
        <TouchableOpacity
          style={[styles.button, savingName && styles.buttonDisabled]}
          onPress={handleSaveName}
          disabled={savingName}
        >
          {savingName ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>회원명 저장</Text>}
        </TouchableOpacity>
      </View>

      {/* 비밀번호 변경 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>비밀번호 변경</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="새 비밀번호 (6자 이상)"
          placeholderTextColor={colors.textDisabled}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="새 비밀번호 확인"
          placeholderTextColor={colors.textDisabled}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, savingPassword && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={savingPassword}
        >
          {savingPassword ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>비밀번호 변경</Text>}
        </TouchableOpacity>
      </View>

      {/* 회원 탈퇴 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>회원 탈퇴</Text>
        <Text style={styles.notice}>
          탈퇴 시 등록한 식재료·친구·코멘트·레시피 등 모든 데이터가 삭제되며 복구할 수 없습니다.
        </Text>
        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.buttonDisabled]}
          onPress={confirmDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.deleteButtonText}>회원 탈퇴</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 28, gap: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { gap: 4 },
  backText: { fontSize: 15, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.background, fontSize: 15, fontWeight: '700' },
  notice: { fontSize: 14, color: colors.textSecondary },
  deleteButton: {
    backgroundColor: colors.dangerTint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerTintBorder,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteButtonText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
