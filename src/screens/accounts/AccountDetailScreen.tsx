import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, OwnerColors, OwnerLabels } from '../../constants/colors';
import { useDataStore } from '../../stores/dataStore';
import { ACCOUNT_TYPE_LABELS } from '../../constants/categories';
import { formatCurrency } from '../../lib/helpers';
import { AccountType, Owner } from '../../types';

const ACCOUNT_TYPES: { key: AccountType; label: string }[] = [
  { key: 'checking',   label: '입출금' },
  { key: 'savings',    label: '저축' },
  { key: 'emergency',  label: '비상금' },
  { key: 'investment', label: '투자' },
  { key: 'etc',        label: '기타' },
];
const OWNERS: Owner[] = ['me', 'spouse', 'joint'];

export function AccountDetailScreen({ route, navigation }: any) {
  const { accountId } = route.params;
  const { accounts, updateAccount, updateAccountBalance, deleteAccount } = useDataStore();
  const account = accounts.find(a => a.id === accountId);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(account?.name ?? '');
  const [bankName, setBankName] = useState(account?.bank_name ?? '');
  const [accountType, setAccountType] = useState<AccountType>(account?.account_type ?? 'checking');
  const [owner, setOwner] = useState<Owner>(account?.owner ?? 'me');
  const [balanceInput, setBalanceInput] = useState(String(account?.current_balance ?? 0));
  const [isSaving, setIsSaving] = useState(false);

  if (!account) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>통장 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>통장을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!name.trim() || !bankName.trim()) {
      Alert.alert('오류', '이름과 은행명을 입력해주세요'); return;
    }
    setIsSaving(true);
    try {
      await updateAccount(account.id, { name: name.trim(), bank_name: bankName.trim(), account_type: accountType, owner });
      const newBalance = parseFloat(balanceInput.replace(/,/g, ''));
      if (!isNaN(newBalance) && newBalance !== account.current_balance) {
        await updateAccountBalance(account.id, newBalance);
      }
      setIsEditing(false);
      Alert.alert('저장 완료');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('통장 삭제', `"${account.name}"을 삭제하시겠습니까?\n거래내역은 유지됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(account.id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('오류', e.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>통장 상세</Text>
        <TouchableOpacity
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          style={styles.editBtn}
        >
          <Text style={styles.editBtnText}>{isEditing ? (isSaving ? '저장 중...' : '완료') : '수정'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Balance card */}
          <View style={[styles.balanceCard, { borderLeftColor: OwnerColors[account.owner] }]}>
            <Text style={styles.balanceLabel}>현재 잔액</Text>
            {isEditing ? (
              <TextInput
                style={styles.balanceInput}
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.balanceAmount}>{formatCurrency(account.current_balance)}</Text>
            )}
            <View style={[styles.ownerBadge, { backgroundColor: OwnerColors[account.owner] + '20' }]}>
              <Text style={[styles.ownerBadgeText, { color: OwnerColors[account.owner] }]}>
                {OwnerLabels[account.owner]}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>통장 이름</Text>
                {isEditing
                  ? <TextInput style={styles.input} value={name} onChangeText={setName} />
                  : <Text style={styles.fieldValue}>{account.name}</Text>
                }
              </View>
              <View style={[styles.field, styles.fieldBorder]}>
                <Text style={styles.fieldLabel}>은행명</Text>
                {isEditing
                  ? <TextInput style={styles.input} value={bankName} onChangeText={setBankName} />
                  : <Text style={styles.fieldValue}>{account.bank_name}</Text>
                }
              </View>
            </View>
          </View>

          {isEditing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>계좌 유형</Text>
              <View style={styles.chipRow}>
                {ACCOUNT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chip, accountType === t.key && styles.chipActive]}
                    onPress={() => setAccountType(t.key)}
                  >
                    <Text style={[styles.chipText, accountType === t.key && { color: Colors.primary }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {!isEditing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>계좌 유형</Text>
              <View style={styles.card}>
                <View style={styles.field}>
                  <Text style={styles.fieldValue}>{ACCOUNT_TYPE_LABELS[account.account_type]}</Text>
                </View>
              </View>
            </View>
          )}

          {isEditing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>소유자</Text>
              <View style={styles.chipRow}>
                {OWNERS.map(o => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.chip, owner === o && { borderColor: OwnerColors[o], backgroundColor: OwnerColors[o] + '10' }]}
                    onPress={() => setOwner(o)}
                  >
                    <Text style={[styles.chipText, owner === o && { color: OwnerColors[o] }]}>
                      {OwnerLabels[o]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <MaterialIcons name="delete-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>통장 삭제</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  editBtn: { backgroundColor: Colors.primary + '15', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  balanceCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  balanceLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 6 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  balanceInput: {
    fontSize: 28, fontWeight: '800', color: Colors.textPrimary,
    borderBottomWidth: 2, borderBottomColor: Colors.primary, marginBottom: 8, paddingVertical: 0,
  },
  ownerBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ownerBadgeText: { fontSize: 12, fontWeight: '700' },

  section: { marginBottom: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  field: { paddingHorizontal: 16, paddingVertical: 14 },
  fieldBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  fieldLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 4 },
  fieldValue: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary },
  input: {
    fontSize: 16, fontWeight: '500', color: Colors.textPrimary,
    borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 2,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    margin: 16, padding: 14, backgroundColor: Colors.danger + '10', borderRadius: 14,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: Colors.danger },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
});
