import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore, CategoryInput } from '../../stores/dataStore';
import { Category, CategoryType } from '../../types';

const EMOJI_OPTIONS = [
  '🍽️','🍜','🛒','🚗','🏠','🏥','🛍️','🎮','📱','📚',
  '📺','🛡️','💄','🐾','💸','💰','🎁','💼','📈','💵',
  '🏦','🔒','📊','📉','🏢','🔄','💳','☕','🍺','✈️',
  '🚇','🚕','💪','🧖','🎵','🎬','📖','🎨','🔧','🛺',
  '🎓','🏋️','🌿','🐶','🐱','🎂','🎉','🌟','🏆','🎯',
  '🛏️','🚿','💊','🩺','🏪','🏬','⚽','🎾','🎸','🎹',
];

const COLOR_OPTIONS = [
  '#EF4444','#F97316','#F59E0B','#EAB308','#84CC16','#22C55E','#10B981','#14B8A6',
  '#06B6D4','#0EA5E9','#3B82F6','#6366F1','#8B5CF6','#A855F7','#EC4899','#6B7280',
];

const TYPE_TABS: { key: CategoryType; label: string }[] = [
  { key: 'expense',    label: '지출' },
  { key: 'income',     label: '수입' },
  { key: 'savings',    label: '저축' },
  { key: 'investment', label: '투자' },
];

interface EditModalProps {
  visible: boolean;
  initial?: Partial<CategoryInput>;
  onSave: (input: CategoryInput) => void;
  onClose: () => void;
  categoryType: CategoryType;
}

function EditModal({ visible, initial, onSave, onClose, categoryType }: EditModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '💸');
  const [color, setColor] = useState(initial?.color ?? '#6366F1');

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setIcon(initial?.icon ?? '💸');
      setColor(initial?.color ?? '#6366F1');
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('이름을 입력해주세요'); return; }
    onSave({ name: name.trim(), icon, color, type: categoryType });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            {initial?.name ? '카테고리 수정' : '카테고리 추가'}
          </Text>

          {/* Preview */}
          <View style={styles.preview}>
            <View style={[styles.previewIcon, { backgroundColor: color + '25' }]}>
              <Text style={{ fontSize: 28 }}>{icon}</Text>
            </View>
            <Text style={[styles.previewName, { color }]}>{name || '이름 없음'}</Text>
          </View>

          {/* Name input */}
          <TextInput
            style={styles.nameInput}
            placeholder="카테고리 이름"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
          />

          {/* Color picker */}
          <Text style={styles.pickerLabel}>색상</Text>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                onPress={() => setColor(c)}
              >
                {color === c && <MaterialIcons name="check" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Emoji picker */}
          <Text style={styles.pickerLabel}>아이콘</Text>
          <ScrollView style={styles.iconScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.iconGrid}>
              {EMOJI_OPTIONS.map(em => (
                <TouchableOpacity
                  key={em}
                  style={[styles.iconBtn, icon === em && { backgroundColor: color + '20', borderColor: color }]}
                  onPress={() => setIcon(em)}
                >
                  <Text style={{ fontSize: 22 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CategoriesScreen({ navigation }: any) {
  const { household } = useAuthStore();
  const { categories, loadCategories, createCategory, updateCategory, deleteCategory } = useDataStore();

  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  useEffect(() => {
    if (household) loadCategories(household.id);
  }, [household]);

  const filtered = categories.filter(c => c.type === activeType && !c.parent_id);

  const handleSave = async (input: CategoryInput) => {
    if (!household) return;
    try {
      if (editTarget) {
        await updateCategory(editTarget.id, input);
      } else {
        await createCategory(household.id, { ...input, type: activeType });
      }
      setEditModal(false);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
  };

  const handleDelete = (cat: Category) => {
    if (!cat.household_id) {
      Alert.alert('알림', '기본 카테고리는 삭제할 수 없습니다');
      return;
    }
    Alert.alert('카테고리 삭제', `"${cat.name}"을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try { await deleteCategory(cat.id); }
          catch (e: any) { Alert.alert('오류', e.message); }
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
        <Text style={styles.headerTitle}>카테고리 관리</Text>
        <TouchableOpacity
          onPress={() => { setEditTarget(null); setEditModal(true); }}
          style={styles.addBtnBox}
        >
          <MaterialIcons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>추가</Text>
        </TouchableOpacity>
      </View>

      {/* Type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TYPE_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeType === tab.key && styles.tabActive]}
            onPress={() => setActiveType(tab.key)}
          >
            <Text style={[styles.tabText, activeType === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.list}>
          {filtered.map((cat, idx) => (
            <View
              key={cat.id}
              style={[styles.item, idx < filtered.length - 1 && styles.itemBorder]}
            >
              <View style={[styles.iconBox, { backgroundColor: cat.color + '20' }]}>
                <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
              </View>
              <Text style={styles.itemName}>{cat.name}</Text>
              {!cat.household_id && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>기본</Text>
                </View>
              )}
              {!!cat.household_id && (
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => { setEditTarget(cat); setEditModal(true); }} style={styles.actionBtn}>
                    <MaterialIcons name="edit" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(cat)} style={styles.actionBtn}>
                    <MaterialIcons name="delete-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>카테고리가 없습니다</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <EditModal
        visible={editModal}
        initial={editTarget ? { name: editTarget.name, icon: editTarget.icon, color: editTarget.color } : undefined}
        onSave={handleSave}
        onClose={() => setEditModal(false)}
        categoryType={activeType}
      />
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
  addBtnBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  tabScroll: { flexGrow: 0 },
  tabContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  list: {
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  itemName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  defaultBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  defaultBadgeText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textTertiary },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 8,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  preview: { alignItems: 'center', marginBottom: 20, gap: 8 },
  previewIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 16, fontWeight: '700' },
  nameInput: {
    height: 48, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: Colors.textPrimary, marginBottom: 16,
  },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  iconScroll: { maxHeight: 200, marginBottom: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: Colors.textSecondary },
});
