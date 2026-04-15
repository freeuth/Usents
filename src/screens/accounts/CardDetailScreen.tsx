import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, OwnerColors, OwnerLabels } from '../../constants/colors';
import { useDataStore } from '../../stores/dataStore';
import { useFilterStore } from '../../stores/filterStore';
import { CARD_TYPE_LABELS } from '../../constants/categories';
import { formatCurrency } from '../../lib/helpers';
import { CardType, Owner } from '../../types';

const CARD_TYPES: { key: CardType; label: string }[] = [
  { key: 'credit', label: '신용카드' },
  { key: 'debit',  label: '체크카드' },
];
const OWNERS: Owner[] = ['me', 'spouse', 'joint'];

export function CardDetailScreen({ route, navigation }: any) {
  const { cardId } = route.params;
  const { cards, accounts, updateCard, deleteCard, getCardForecast } = useDataStore();
  const { selectedMonth } = useFilterStore();

  const card = cards.find(c => c.id === cardId);
  const forecast = card ? getCardForecast(card.id, selectedMonth) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(card?.name ?? '');
  const [cardType, setCardType] = useState<CardType>(card?.card_type ?? 'credit');
  const [paymentDay, setPaymentDay] = useState(String(card?.payment_day ?? 25));
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(card?.linked_account_id ?? null);
  const [owner, setOwner] = useState<Owner>(card?.owner ?? 'me');
  const [isSaving, setIsSaving] = useState(false);

  if (!card) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카드 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>카드를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('오류', '카드 이름을 입력해주세요'); return; }
    const day = parseInt(paymentDay);
    if (!day || day < 1 || day > 31) { Alert.alert('오류', '1~31 사이의 결제일을 입력해주세요'); return; }
    setIsSaving(true);
    try {
      await updateCard(card.id, { name: name.trim(), card_type: cardType, payment_day: day, linked_account_id: linkedAccountId, owner });
      setIsEditing(false);
      Alert.alert('저장 완료');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('카드 삭제', `"${card.name}"을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCard(card.id);
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
        <Text style={styles.headerTitle}>카드 상세</Text>
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
          {/* Summary card */}
          <View style={[styles.summaryCard, { borderLeftColor: OwnerColors[card.owner] }]}>
            <View style={styles.summaryRow}>
              <MaterialIcons name="credit-card" size={24} color={OwnerColors[card.owner]} />
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryName}>{card.name}</Text>
                <Text style={styles.summaryType}>{CARD_TYPE_LABELS[card.card_type]}</Text>
              </View>
              <View style={[styles.ownerBadge, { backgroundColor: OwnerColors[card.owner] + '20' }]}>
                <Text style={[styles.ownerBadgeText, { color: OwnerColors[card.owner] }]}>
                  {OwnerLabels[card.owner]}
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>이번 달 사용액</Text>
                <Text style={[styles.statValue, { color: Colors.expense }]}>
                  {formatCurrency(forecast?.usageAmount ?? 0)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>결제 예정일</Text>
                <Text style={styles.statValue}>{forecast?.paymentDate ?? `매월 ${card.payment_day}일`}</Text>
              </View>
            </View>
          </View>

          {/* Basic info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>카드 이름</Text>
                {isEditing
                  ? <TextInput style={styles.input} value={name} onChangeText={setName} />
                  : <Text style={styles.fieldValue}>{card.name}</Text>
                }
              </View>
              <View style={[styles.field, styles.fieldBorder]}>
                <Text style={styles.fieldLabel}>결제일</Text>
                {isEditing
                  ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TextInput
                        style={[styles.input, { width: 50 }]}
                        value={paymentDay}
                        onChangeText={setPaymentDay}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={styles.fieldValue}>일</Text>
                    </View>
                  )
                  : <Text style={styles.fieldValue}>매월 {card.payment_day}일</Text>
                }
              </View>
            </View>
          </View>

          {isEditing && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>카드 종류</Text>
                <View style={styles.chipRow}>
                  {CARD_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.chip, cardType === t.key && styles.chipActive]}
                      onPress={() => setCardType(t.key)}
                    >
                      <Text style={[styles.chipText, cardType === t.key && { color: Colors.primary }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>연결 통장 (결제 계좌)</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !linkedAccountId && styles.chipActive]}
                    onPress={() => setLinkedAccountId(null)}
                  >
                    <Text style={[styles.chipText, !linkedAccountId && { color: Colors.primary }]}>없음</Text>
                  </TouchableOpacity>
                  {accounts.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.chip, linkedAccountId === a.id && styles.chipActive]}
                      onPress={() => setLinkedAccountId(a.id)}
                    >
                      <Text style={[styles.chipText, linkedAccountId === a.id && { color: Colors.primary }]}>
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {!isEditing && card.linked_account && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>연결 통장</Text>
              <View style={styles.card}>
                <View style={styles.field}>
                  <Text style={styles.fieldValue}>{card.linked_account.name}</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <MaterialIcons name="delete-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>카드 삭제</Text>
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

  summaryCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryInfo: { flex: 1, marginLeft: 12 },
  summaryName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  summaryType: { fontSize: 13, color: Colors.textSecondary },
  ownerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ownerBadgeText: { fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 12 },

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
