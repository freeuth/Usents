import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, OwnerColors, OwnerLabels } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Owner, PaymentMethodType, RecurringType } from '../../types';
import { format } from 'date-fns';

const OWNERS: Owner[] = ['me', 'spouse', 'joint'];
const PAYMENT_TYPES: { key: PaymentMethodType; label: string }[] = [
  { key: 'card', label: '카드' },
  { key: 'account', label: '통장' },
  { key: 'cash', label: '현금' },
];

export function AddRecurringScreen({ navigation }: any) {
  const { household, member } = useAuthStore();
  const { accounts, cards, categories, loadCategories, loadAccounts, loadCards, createRecurring } = useDataStore();

  useEffect(() => {
    if (!household) return;
    if (categories.length === 0) loadCategories(household.id);
    if (accounts.length === 0) loadAccounts(household.id);
    if (cards.length === 0) loadCards(household.id);
  }, [household]);

  const [txType, setTxType] = useState<RecurringType>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>('card');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [owner, setOwner] = useState<Owner>('me');
  const [isSaving, setIsSaving] = useState(false);

  const filteredCategories = categories.filter(c =>
    !c.parent_id && (txType === 'income' ? c.type === 'income' : c.type === 'expense')
  );

  const handleNumpad = (val: string) => {
    if (val === '⌫') { setAmount(a => a.slice(0, -1)); return; }
    if (val === '00' && !amount) return;
    if (amount.length >= 11) return;
    setAmount(a => a + val);
  };

  const displayAmount = amount ? parseInt(amount).toLocaleString('ko-KR') : '0';

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('오류', '이름을 입력해주세요'); return; }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { Alert.alert('오류', '금액을 입력해주세요'); return; }
    if (!selectedCategoryId) { Alert.alert('오류', '카테고리를 선택해주세요'); return; }
    const day = parseInt(dayOfMonth);
    if (!day || day < 1 || day > 31) { Alert.alert('오류', '1~31 사이의 날짜를 입력해주세요'); return; }
    if (!household) return;

    setIsSaving(true);
    try {
      await createRecurring(household.id, {
        type: txType,
        name: name.trim(),
        amount: numAmount,
        day_of_month: day,
        category_id: selectedCategoryId,
        payment_method_type: paymentMethodType,
        payment_method_id: paymentMethodId,
        owner,
        start_date: format(new Date(), 'yyyy-MM-dd'),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>반복거래 추가</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.body}>
            {/* Type toggle */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'expense' && styles.typeBtnExpense]}
                onPress={() => { setTxType('expense'); setSelectedCategoryId(''); }}
              >
                <Text style={[styles.typeBtnText, txType === 'expense' && { color: '#fff' }]}>고정지출</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'income' && styles.typeBtnIncome]}
                onPress={() => { setTxType('income'); setSelectedCategoryId(''); }}
              >
                <Text style={[styles.typeBtnText, txType === 'income' && { color: '#fff' }]}>고정수입</Text>
              </TouchableOpacity>
            </View>

            {/* Amount display */}
            <View style={styles.amountBox}>
              <Text style={[styles.amountText, { color: txType === 'expense' ? Colors.expense : Colors.income }]}>
                ₩ {displayAmount}
              </Text>
            </View>

            {/* Name */}
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="예: 월급, 넷플릭스, 월세..."
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
            />

            {/* Day of month */}
            <Text style={styles.label}>매월 발생일</Text>
            <View style={styles.dayRow}>
              {['1','5','10','15','20','25'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayBtn, dayOfMonth === d && styles.dayBtnActive]}
                  onPress={() => setDayOfMonth(d)}
                >
                  <Text style={[styles.dayBtnText, dayOfMonth === d && { color: Colors.primary }]}>{d}일</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dayCustomRow}>
              <Text style={styles.dayCustomLabel}>직접 입력:</Text>
              <TextInput
                style={styles.dayInput}
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="1-31"
                placeholderTextColor={Colors.textTertiary}
              />
              <Text style={styles.dayCustomLabel}>일</Text>
            </View>

            {/* Owner */}
            <Text style={styles.label}>대상</Text>
            <View style={styles.row}>
              {OWNERS.map(o => (
                <TouchableOpacity
                  key={o}
                  style={[styles.ownerBtn, owner === o && { backgroundColor: OwnerColors[o], borderColor: OwnerColors[o] }]}
                  onPress={() => setOwner(o)}
                >
                  <Text style={[styles.ownerBtnText, owner === o && { color: '#fff' }]}>
                    {OwnerLabels[o]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={styles.label}>카테고리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {filteredCategories.map(cat => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, isSelected && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <MaterialIcons name={cat.icon as any} size={14} color={isSelected ? '#fff' : cat.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.catLabel, isSelected && { color: '#fff' }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Payment */}
            <Text style={styles.label}>결제수단</Text>
            <View style={[styles.row, { marginBottom: 8 }]}>
              {PAYMENT_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.key}
                  style={[styles.payTypeBtn, paymentMethodType === pt.key && styles.payTypeBtnActive]}
                  onPress={() => { setPaymentMethodType(pt.key); setPaymentMethodId(null); }}
                >
                  <Text style={[styles.payTypeBtnText, paymentMethodType === pt.key && { color: Colors.primary }]}>
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentMethodType === 'card' && cards.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {cards.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.methodChip, paymentMethodId === c.id && styles.methodChipActive]}
                    onPress={() => setPaymentMethodId(c.id)}
                  >
                    <Text style={styles.methodChipText}>💳 {c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {paymentMethodType === 'account' && accounts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.methodChip, paymentMethodId === a.id && styles.methodChipActive]}
                    onPress={() => setPaymentMethodId(a.id)}
                  >
                    <Text style={styles.methodChipText}>🏦 {a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Numpad */}
            <View style={styles.numpad}>
              {['1','2','3','4','5','6','7','8','9','00','0','⌫'].map(k => (
                <TouchableOpacity
                  key={k} style={styles.numKey}
                  onPress={() => handleNumpad(k)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numKeyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.submitBtn, isSaving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.submitBtnText}>{isSaving ? '저장 중...' : '반복거래 추가'}</Text>
            </TouchableOpacity>
          </View>
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
  body: { paddingHorizontal: 20 },

  typeToggle: {
    flexDirection: 'row', backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, padding: 3, marginBottom: 12,
  },
  typeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  typeBtnExpense: { backgroundColor: Colors.expense },
  typeBtnIncome:  { backgroundColor: Colors.income },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },

  amountBox: { alignItems: 'center', paddingVertical: 8, marginBottom: 16 },
  amountText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },

  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },

  nameInput: {
    height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: Colors.textPrimary, marginBottom: 16,
  },

  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  dayBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  dayBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  dayBtnText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  dayCustomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dayCustomLabel: { fontSize: 14, color: Colors.textSecondary },
  dayInput: {
    width: 56, height: 36, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 10, fontSize: 15, color: Colors.textPrimary,
    textAlign: 'center',
  },

  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  ownerBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  ownerBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 8,
    backgroundColor: Colors.surface,
  },
  catLabel: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },

  payTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  payTypeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  payTypeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  methodChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 8,
  },
  methodChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  methodChipText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },

  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  numKey: {
    width: '31%', height: 50, backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  numKeyText: { fontSize: 20, fontWeight: '500', color: Colors.textPrimary },

  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
