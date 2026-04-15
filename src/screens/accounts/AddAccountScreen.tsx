import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Colors, OwnerColors } from '../../constants/colors';
import { useOwnerLabels } from '../../lib/useOwnerLabels';
import { AccountType, Owner } from '../../types';
import { ACCOUNT_TYPE_LABELS } from '../../constants/categories';

const ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'emergency', 'investment', 'etc'];
const OWNERS: Owner[] = ['me', 'spouse', 'joint'];

export function AddAccountScreen({ navigation, route }: any) {
  const ownerLabels = useOwnerLabels();
  const existing = route?.params?.account;
  const { household } = useAuthStore();
  const { createAccount, updateAccount } = useDataStore();

  const [name, setName]               = useState(existing?.name ?? '');
  const [bankName, setBankName]       = useState(existing?.bank_name ?? '');
  const [balance, setBalance]         = useState(existing?.current_balance?.toString() ?? '0');
  const [accountType, setAccountType] = useState<AccountType>(existing?.account_type ?? 'checking');
  const [owner, setOwner]             = useState<Owner>(existing?.owner ?? 'me');
  const [isLoading, setIsLoading]     = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '통장 이름을 입력해주세요');
      return;
    }
    if (!household) return;

    const numBalance = parseFloat(balance.replace(/,/g, '')) || 0;

    setIsLoading(true);
    try {
      if (existing) {
        await updateAccount(existing.id, {
          name: name.trim(),
          bank_name: bankName.trim(),
          current_balance: numBalance,
          account_type: accountType,
          owner,
        });
      } else {
        await createAccount(household.id, {
          name: name.trim(),
          bank_name: bankName.trim(),
          current_balance: numBalance,
          account_type: accountType,
          owner,
        });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancel}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{existing ? '통장 수정' : '통장 추가'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <Text style={[styles.save, isLoading && { opacity: 0.5 }]}>
              {isLoading ? '저장중' : '저장'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* 통장명 */}
          <View style={styles.group}>
            <Text style={styles.label}>통장 이름 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="예: 급여통장, 생활비통장"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* 은행명 */}
          <View style={styles.group}>
            <Text style={styles.label}>은행명</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="예: 신한은행, 카카오뱅크"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* 현재 잔액 */}
          <View style={styles.group}>
            <Text style={styles.label}>현재 잔액</Text>
            <TextInput
              style={styles.input}
              value={balance}
              onChangeText={setBalance}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
            />
          </View>

          {/* 통장 유형 */}
          <View style={styles.group}>
            <Text style={styles.label}>통장 유형</Text>
            <View style={styles.chipRow}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, accountType === t && styles.chipActive]}
                  onPress={() => setAccountType(t)}
                >
                  <Text style={[styles.chipText, accountType === t && styles.chipTextActive]}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 소유자 */}
          <View style={styles.group}>
            <Text style={styles.label}>소유자</Text>
            <View style={styles.ownerRow}>
              {OWNERS.map(o => (
                <TouchableOpacity
                  key={o}
                  style={[
                    styles.ownerBtn,
                    owner === o && { backgroundColor: OwnerColors[o], borderColor: OwnerColors[o] },
                  ]}
                  onPress={() => setOwner(o)}
                >
                  <Text style={[styles.ownerBtnText, owner === o && { color: '#fff' }]}>
                    {ownerLabels[o]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancel: { fontSize: 16, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  save: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  content: { padding: 20 },
  group: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  ownerRow: { flexDirection: 'row', gap: 10 },
  ownerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  ownerBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
});
