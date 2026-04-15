import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Colors, OwnerColors } from '../../constants/colors';
import { generateInviteCode } from '../../lib/helpers';

type SetupMode = 'create' | 'join';

export function SetupHouseholdScreen() {
  const { user, loadHousehold } = useAuthStore();
  const [mode, setMode] = useState<SetupMode>('create');
  const [householdName, setHouseholdName] = useState('우리 가족');
  const [displayName, setDisplayName] = useState('나');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim() || !displayName.trim()) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요');
      return;
    }

    // store의 user가 없을 경우 Supabase에서 직접 가져옴
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const userId = user?.id ?? currentUser?.id;
    if (!userId) {
      Alert.alert('오류', '로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // RPC 함수로 가구 생성 + 멤버 등록 (SECURITY DEFINER로 RLS 우회)
      const { data, error } = await supabase.rpc('create_household_with_member', {
        p_household_name: householdName.trim(),
        p_invite_code:    generateInviteCode(),
        p_display_name:   displayName.trim(),
        p_role:           'me',
        p_color:          OwnerColors.me,
      });

      if (error) throw error;

      await loadHousehold(userId);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !displayName.trim()) {
      Alert.alert('입력 오류', '초대 코드와 이름을 입력해주세요');
      return;
    }
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const userId = user?.id ?? currentUser?.id;
    if (!userId) {
      Alert.alert('오류', '로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_household_with_code', {
        p_invite_code:  inviteCode.trim(),
        p_display_name: displayName.trim(),
        p_color:        OwnerColors.spouse,
      });

      if (error) throw error;

      await loadHousehold(userId);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>가구 설정</Text>
        <Text style={styles.subtitle}>
          새 가구를 만들거나 파트너의 초대 코드로 참여하세요
        </Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'create' && styles.modeBtnActive]}
            onPress={() => setMode('create')}
          >
            <Text style={[styles.modeBtnText, mode === 'create' && styles.modeBtnTextActive]}>
              새로 만들기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'join' && styles.modeBtnActive]}
            onPress={() => setMode('join')}
          >
            <Text style={[styles.modeBtnText, mode === 'join' && styles.modeBtnTextActive]}>
              참여하기
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>내 이름</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="예: 남편, 아내"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {mode === 'create' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>가구 이름</Text>
              <TextInput
                style={styles.input}
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder="예: 우리 가족"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>초대 코드</Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="6자리 코드 입력"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
          onPress={mode === 'create' ? handleCreate : handleJoin}
          disabled={isLoading}
        >
          <Text style={styles.submitBtnText}>
            {isLoading ? '처리 중...' : mode === 'create' ? '가구 만들기' : '참여하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary },
  modeBtnTextActive: { fontWeight: '700', color: Colors.textPrimary },
  form: { marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
