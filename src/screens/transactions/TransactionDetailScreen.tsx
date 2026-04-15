import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, KeyboardAvoidingView, Platform, Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, OwnerColors } from '../../constants/colors';
import { useOwnerLabels } from '../../lib/useOwnerLabels';
import { useDataStore } from '../../stores/dataStore';
import { useFilterStore } from '../../stores/filterStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../lib/helpers';
import { format, parseISO } from 'date-fns';
import { TransactionType, Owner, PaymentMethodType } from '../../types';
import { CARD_TYPE_LABELS } from '../../constants/categories';

const OWNERS: Owner[] = ['me', 'spouse', 'joint'];
const PAYMENT_TYPES: { key: PaymentMethodType; label: string }[] = [
  { key: 'card',    label: '카드' },
  { key: 'account', label: '통장' },
  { key: 'cash',    label: '현금' },
];

export function TransactionDetailScreen({ route, navigation }: any) {
  const ownerLabels = useOwnerLabels();
  const { transactionId } = route.params;
  const { household } = useAuthStore();
  const { transactions, categories, accounts, cards,
    loadCategories, loadAccounts, loadCards,
    updateTransaction, deleteTransaction } = useDataStore();
  const { selectedMonth } = useFilterStore();

  const tx = transactions.find(t => t.id === transactionId);

  useEffect(() => {
    if (!household) return;
    if (categories.length === 0) loadCategories(household.id);
    if (accounts.length === 0) loadAccounts(household.id);
    if (cards.length === 0) loadCards(household.id);
  }, [household]);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [txType, setTxType]         = useState<TransactionType>(tx?.type ?? 'expense');
  const [amount, setAmount]         = useState(tx ? String(tx.amount) : '');
  const [selectedDate, setSelectedDate] = useState(tx ? parseISO(tx.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(tx?.category_id ?? '');
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType>(tx?.payment_method_type ?? 'card');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(tx?.payment_method_id ?? null);
  const [owner, setOwner]           = useState<Owner>(tx?.owner ?? 'me');
  const [memo, setMemo]             = useState(tx?.memo ?? '');
  const [isSaving, setIsSaving]     = useState(false);

  const filteredCategories = categories.filter(c =>
    !c.parent_id && (txType === 'income' ? c.type === 'income' : c.type === 'expense')
  );

  const dateStr   = format(selectedDate, 'yyyy-MM-dd');
  const dateLabel = format(selectedDate, 'M월 d일 (eee)').replace(
    /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/,
    d => ({ Mon:'월',Tue:'화',Wed:'수',Thu:'목',Fri:'금',Sat:'토',Sun:'일' }[d] ?? d)
  );

  const handleNumpad = (val: string) => {
    if (val === '⌫') { setAmount(a => a.slice(0, -1)); return; }
    if (val === '00' && !amount) return;
    if (amount.length >= 11) return;
    setAmount(a => a + val);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { Alert.alert('오류', '금액을 입력해주세요'); return; }
    if (!selectedCategoryId) { Alert.alert('오류', '카테고리를 선택해주세요'); return; }
    setIsSaving(true);
    try {
      await updateTransaction(transactionId, {
        type: txType,
        amount: numAmount,
        date: dateStr,
        category_id: selectedCategoryId,
        payment_method_type: paymentMethodType,
        payment_method_id: paymentMethodId,
        owner,
        memo: memo.trim() || undefined,
      });
      setIsEditing(false);
      Alert.alert('수정 완료');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('거래 삭제', '이 거래를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(transactionId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('오류', e.message);
          }
        },
      },
    ]);
  };

  if (!tx) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>거래 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyText}>거래를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── View Mode ─────────────────────────────────────────
  if (!isEditing) {
    const category = categories.find(c => c.id === tx.category_id) ?? tx.category;
    const card     = cards.find(c => c.id === tx.payment_method_id);
    const account  = accounts.find(a => a.id === tx.payment_method_id);

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>거래 상세</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerBtn}>
              <MaterialIcons name="edit" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
              <MaterialIcons name="delete-outline" size={20} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Amount hero */}
          <View style={[styles.heroCard, {
            borderLeftColor: tx.type === 'income' ? Colors.income : Colors.expense,
          }]}>
            <View style={styles.heroTop}>
              <View style={[styles.categoryIconBox, { backgroundColor: (category?.color ?? Colors.primary) + '20' }]}>
                <MaterialIcons name={(category?.icon ?? 'payments') as any} size={28} color={category?.color ?? Colors.primary} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroCategory}>{category?.name ?? '카테고리 없음'}</Text>
                <View style={[styles.typeBadge, {
                  backgroundColor: tx.type === 'income' ? Colors.income + '15' : Colors.expense + '15',
                }]}>
                  <Text style={[styles.typeBadgeText, {
                    color: tx.type === 'income' ? Colors.income : Colors.expense,
                  }]}>
                    {tx.type === 'income' ? '수입' : '지출'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.heroAmount, {
              color: tx.type === 'income' ? Colors.income : Colors.expense,
            }]}>
              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
            </Text>
          </View>

          {/* Detail rows */}
          <View style={styles.detailCard}>
            <DetailRow icon="calendar-today" label="날짜" value={
              format(parseISO(tx.date), 'yyyy년 M월 d일 (eee)').replace(
                /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/,
                d => ({ Mon:'월',Tue:'화',Wed:'수',Thu:'목',Fri:'금',Sat:'토',Sun:'일' }[d] ?? d)
              )
            } />
            <DetailRow icon="person" label="대상" value={ownerLabels[tx.owner]} isLast={false} />
            <DetailRow icon="payment" label="결제수단" value={
              tx.payment_method_type === 'card'
                ? (card ? `💳 ${card.name}` : '카드')
                : tx.payment_method_type === 'account'
                ? (account ? `🏦 ${account.name}` : '통장')
                : '현금'
            } />
            {tx.memo && (
              <DetailRow icon="notes" label="메모" value={tx.memo} isLast />
            )}
            {tx.is_recurring && (
              <DetailRow icon="repeat" label="반복거래" value="자동 생성" isLast />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Edit Mode ─────────────────────────────────────────
  const displayAmount = amount ? parseInt(amount).toLocaleString('ko-KR') : '0';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsEditing(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>거래 수정</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
        >
          <Text style={styles.saveBtnText}>{isSaving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editBody}>
          {/* Type toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, txType === 'expense' && styles.typeBtnExpense]}
              onPress={() => { setTxType('expense'); setSelectedCategoryId(''); }}
            >
              <Text style={[styles.typeBtnText, txType === 'expense' && { color: '#fff' }]}>지출</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, txType === 'income' && styles.typeBtnIncome]}
              onPress={() => { setTxType('income'); setSelectedCategoryId(''); }}
            >
              <Text style={[styles.typeBtnText, txType === 'income' && { color: '#fff' }]}>수입</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.amountBox}>
            <Text style={[styles.amountText, { color: txType === 'expense' ? Colors.expense : Colors.income }]}>
              ₩ {displayAmount}
            </Text>
          </View>

          {/* Date */}
          <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
            <MaterialIcons name="calendar-today" size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>{dateLabel}</Text>
            <MaterialIcons name="expand-more" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          {showDatePicker && Platform.OS === 'ios' && (
            <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
              <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                <View style={styles.dateModalOverlay} />
              </TouchableWithoutFeedback>
              <View style={styles.dateModalSheet}>
                <View style={styles.dateModalHeader}>
                  <Text style={styles.dateModalTitle}>날짜 선택</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 4 }}>
                    <Text style={styles.dateModalDoneText}>완료</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  locale="ko-KR"
                  onChange={(_, d) => { if (d) setSelectedDate(d); }}
                  style={{ backgroundColor: Colors.surface }}
                />
              </View>
            </Modal>
          )}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(_, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }}
            />
          )}

          {/* Owner */}
          <Text style={styles.label}>대상</Text>
          <View style={styles.row}>
            {OWNERS.map(o => (
              <TouchableOpacity
                key={o}
                style={[styles.ownerBtn, owner === o && { backgroundColor: OwnerColors[o], borderColor: OwnerColors[o] }]}
                onPress={() => setOwner(o)}
              >
                <Text style={[styles.ownerBtnText, owner === o && { color: '#fff' }]}>{ownerLabels[o]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={styles.label}>카테고리</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {filteredCategories.map(cat => {
              const isSel = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, isSel && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <MaterialIcons name={cat.icon as any} size={14} color={isSel ? '#fff' : cat.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.catLabel, isSel && { color: '#fff' }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Payment method */}
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

          {/* Memo */}
          <TextInput
            style={styles.memoInput}
            placeholder="메모 (선택)"
            placeholderTextColor={Colors.textTertiary}
            value={memo}
            onChangeText={setMemo}
          />

          {/* Numpad */}
          <View style={styles.numpad}>
            {['1','2','3','4','5','6','7','8','9','00','0','⌫'].map(k => (
              <TouchableOpacity
                key={k} style={styles.numKey}
                onPress={() => k === '00' ? (setAmount(a => a.length ? a + '00' : a)) : handleNumpad(k)}
                activeOpacity={0.6}
              >
                <Text style={styles.numKeyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value, isLast = false }: {
  icon: string; label: string; value: string; isLast?: boolean;
}) {
  return (
    <View style={[detailStyles.row, !isLast && detailStyles.rowBorder]}>
      <MaterialIcons name={icon as any} size={18} color={Colors.textTertiary} style={{ marginRight: 12 }} />
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}
const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  label: { fontSize: 14, color: Colors.textSecondary, width: 70 },
  value: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 6 },
  saveBtn: { backgroundColor: Colors.primary + '15', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  heroCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  categoryIconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  heroInfo: { flex: 1 },
  heroCategory: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  heroAmount: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },

  detailCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  // Edit mode
  editBody: { paddingHorizontal: 20, paddingBottom: 60 },
  typeToggle: {
    flexDirection: 'row', backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, padding: 3, marginBottom: 12,
  },
  typeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  typeBtnExpense: { backgroundColor: Colors.expense },
  typeBtnIncome:  { backgroundColor: Colors.income },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  amountBox: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
  amountText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  dateText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  ownerBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  ownerBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.surface,
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
  memoInput: {
    height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 14, color: Colors.textPrimary, marginBottom: 12,
  },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  numKey: {
    width: '31%', height: 50, backgroundColor: Colors.surfaceAlt,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  numKeyText: { fontSize: 20, fontWeight: '500', color: Colors.textPrimary },

  // Date modal
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dateModalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dateModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  dateModalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  dateModalDoneText: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
});
