import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  getParticipants,
  addFamily,
  updateFamily,
  deleteFamily,
  addMember,
  updateMember,
  deleteMember,
  addFriend,
  updateFriend,
  deleteFriend,
} from '../services/tripService';
import {
  UserIcon,
  FamilyIcon,
  UsersIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from '../components/Icons';

export function ParticipantsScreen({ route, navigation }) {
  const { tripId, tripType } = route.params;
  const isFriends = tripType === 'friends';
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [participants, setParticipants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add_family');
  // 'add_family' | 'edit_family' | 'add_member' | 'edit_member' | 'add_friend' | 'edit_friend'

  const [nameInput, setNameInput] = useState('');
  const [memberType, setMemberType] = useState('adult'); // for family members
  const [activeFamilyId, setActiveFamilyId] = useState(null); // when adding/editing member
  const [editingTargetId, setEditingTargetId] = useState(null); // familyId or memberId being edited
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getParticipants(tripId);
      setParticipants(data || []);
    } catch (e) {
      console.error(e);
    }
  }, [tripId]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadData();
    });
    loadData();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, loadData]);

  // Modal Open Handlers
  const openAddFamily = () => {
    setModalMode(isFriends ? 'add_friend' : 'add_family');
    setActiveFamilyId(null);
    setEditingTargetId(null);
    setNameInput('');
    setModalVisible(true);
  };

  const openEditFamily = (family) => {
    setModalMode('edit_family');
    setEditingTargetId(family.id);
    setNameInput(family.name || '');
    setModalVisible(true);
  };

  const openAddMember = (familyId) => {
    setModalMode('add_member');
    setActiveFamilyId(familyId);
    setEditingTargetId(null);
    setNameInput('');
    setMemberType('adult');
    setModalVisible(true);
  };

  const openEditMember = (familyId, member) => {
    setModalMode('edit_member');
    setActiveFamilyId(familyId);
    setEditingTargetId(member.id);
    setNameInput(member.name || '');
    setMemberType(member.memberType || 'adult');
    setModalVisible(true);
  };

  const openEditFriend = (friend) => {
    setModalMode('edit_friend');
    setEditingTargetId(friend.id); // familyId
    setActiveFamilyId(friend.members?.[0]?.id || null); // memberId
    setNameInput(friend.name || '');
    setModalVisible(true);
  };

  // Delete Handlers using Custom Alert Modal
  const handleDeleteFamily = (family) => {
    showAlert({
      title: 'Delete Family',
      message: `Are you sure you want to delete "${family.name}" and all its members? All associated expenses and splits will be deleted.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteFamily(family.id);
          await loadData();
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to delete family.',
            type: 'danger',
          });
        }
      },
    });
  };

  const handleDeleteMember = (member) => {
    showAlert({
      title: 'Remove Member',
      message: `Are you sure you want to remove "${member.name}"?`,
      type: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteMember(member.id);
          await loadData();
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to remove member.',
            type: 'danger',
          });
        }
      },
    });
  };

  const handleDeleteFriend = (friend) => {
    showAlert({
      title: 'Remove Friend',
      message: `Are you sure you want to remove "${friend.name}"? Associated expenses and splits will be deleted.`,
      type: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteFriend(friend.id);
          await loadData();
        } catch (e) {
          console.error(e);
          showAlert({
            title: 'Error',
            message: 'Failed to delete friend.',
            type: 'danger',
          });
        }
      },
    });
  };

  // Save Modal Handler (Handles Add & Edit)
  const handleSaveModal = async () => {
    if (!nameInput.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please enter a name.',
        type: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'add_friend') {
        await addFriend({ tripId, name: nameInput.trim() });
      } else if (modalMode === 'edit_friend') {
        await updateFriend({
          familyId: editingTargetId,
          memberId: activeFamilyId,
          name: nameInput.trim(),
        });
      } else if (modalMode === 'add_family') {
        await addFamily({ tripId, name: nameInput.trim() });
      } else if (modalMode === 'edit_family') {
        await updateFamily(editingTargetId, { name: nameInput.trim() });
      } else if (modalMode === 'add_member') {
        const weight = memberType === 'child' ? 50 : 100;
        await addMember({
          tripId,
          familyId: activeFamilyId,
          name: nameInput.trim(),
          memberType,
          defaultWeight: weight,
        });
      } else if (modalMode === 'edit_member') {
        const weight = memberType === 'child' ? 50 : 100;
        await updateMember(editingTargetId, {
          name: nameInput.trim(),
          memberType,
          defaultWeight: weight,
        });
      }

      setNameInput('');
      setActiveFamilyId(null);
      setEditingTargetId(null);
      setModalVisible(false);
      await loadData();
    } catch (e) {
      console.error(e);
      showAlert({
        title: 'Error',
        message: 'Could not save participant.',
        type: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderFriendItem = ({ item }) => {
    return (
      <Card style={styles.friendCard}>
        <View style={styles.friendRow}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.secondaryLight }]}>
            <UserIcon size={18} color={colors.secondary} />
          </View>
          <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>

          <View style={styles.actionIconGroup}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => openEditFriend(item)}
              style={[styles.smallActionBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <EditIcon size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleDeleteFriend(item)}
              style={[styles.smallActionBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <TrashIcon size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  const renderFamilyItem = ({ item }) => {
    return (
      <Card style={styles.familyCard}>
        <View style={[styles.familyHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.familyTitleContainer}>
            <View style={[styles.familyIconCircle, { backgroundColor: colors.primaryLight }]}>
              <FamilyIcon size={18} color={colors.primaryDark} />
            </View>
            <Text style={[styles.familyName, { color: colors.text }]}>{item.name}</Text>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => openEditFamily(item)}
              style={styles.familyActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <EditIcon size={15} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleDeleteFamily(item)}
              style={styles.familyActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <TrashIcon size={15} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <Button
            title="Member"
            icon={<PlusIcon size={12} color={colors.primary} />}
            size="sm"
            variant="outline"
            onPress={() => openAddMember(item.id)}
          />
        </View>

        {item.members.length === 0 ? (
          <Text style={[styles.emptyMembersText, { color: colors.textMuted }]}>
            No members added yet
          </Text>
        ) : (
          <View style={styles.membersList}>
            {item.members.map(member => (
              <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                  <View
                    style={[
                      styles.memberBadge,
                      {
                        backgroundColor:
                          member.memberType === 'child'
                            ? colors.warningLight
                            : colors.secondaryLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberBadgeText,
                        {
                          color:
                            member.memberType === 'child'
                              ? colors.warning
                              : colors.secondary,
                        },
                      ]}
                    >
                      {member.memberType === 'child' ? 'Child (0.5x)' : 'Adult (1.0x)'}
                    </Text>
                  </View>
                </View>

                <View style={styles.memberActions}>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => openEditMember(item.id, member)}
                    style={[styles.smallActionBtn, { backgroundColor: colors.surface }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <EditIcon size={14} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => handleDeleteMember(member)}
                    style={[styles.smallActionBtn, { backgroundColor: colors.surface }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <TrashIcon size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  const getModalTitle = () => {
    switch (modalMode) {
      case 'add_friend':
        return 'Add Friend';
      case 'edit_friend':
        return 'Edit Friend';
      case 'add_family':
        return 'Add New Family';
      case 'edit_family':
        return 'Edit Family Name';
      case 'add_member':
        return 'Add Family Member';
      case 'edit_member':
        return 'Edit Family Member';
      default:
        return 'Participant';
    }
  };

  const getModalInputLabel = () => {
    if (modalMode.includes('friend')) return "Friend's Name";
    if (modalMode.includes('member')) return "Member's Name";
    return 'Family Name';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Clean Participants Header Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topBarTitleContainer}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            {isFriends ? 'Friends' : 'Families'}
          </Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
            {isFriends
              ? 'People sharing costs on this trip'
              : 'Family groups and split weights'}
          </Text>
        </View>
        <Button
          title={isFriends ? 'Add Friend' : 'Add Family'}
          icon={<PlusIcon size={14} color="#FFFFFF" />}
          size="sm"
          onPress={openAddFamily}
        />
      </View>

      <FlatList
        data={participants}
        keyExtractor={item => item.id}
        renderItem={isFriends ? renderFriendItem : renderFamilyItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              {isFriends ? (
                <UsersIcon size={44} color={colors.textMuted} />
              ) : (
                <FamilyIcon size={44} color={colors.textMuted} />
              )}
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isFriends ? 'No friends added yet' : 'No families added yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {isFriends
                ? 'Add the friends traveling with you to split expenses.'
                : 'Add families and members to start organizing splits.'}
            </Text>
          </View>
        }
      />

      {/* Modal for Adding & Editing Friend / Family / Member */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{getModalTitle()}</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.modalScrollBody}
            >
              <Input
                label={getModalInputLabel()}
                placeholder={
                  modalMode.includes('friend')
                    ? 'e.g. Rahul, Sneha, Vikram'
                    : modalMode.includes('member')
                    ? 'e.g. Aarav, Ananya'
                    : 'e.g. Sharma Family'
                }
                value={nameInput}
                onChangeText={setNameInput}
              />

              {modalMode === 'add_member' || modalMode === 'edit_member' ? (
                <View style={styles.typeSelectorContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Member Type</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        memberType === 'adult' && [
                          styles.toggleButtonActive,
                          { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                        ],
                      ]}
                      onPress={() => setMemberType('adult')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          { color: colors.textMuted },
                          memberType === 'adult' && [
                            styles.toggleTextActive,
                            { color: colors.primaryDark },
                          ],
                        ]}
                      >
                        Adult (1.0x Split)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        memberType === 'child' && [
                          styles.toggleButtonActive,
                          { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                        ],
                      ]}
                      onPress={() => setMemberType('child')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          { color: colors.textMuted },
                          memberType === 'child' && [
                            styles.toggleTextActive,
                            { color: colors.primaryDark },
                          ],
                        ]}
                      >
                        Child (0.5x Split)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                style={styles.modalActionBtn}
                onPress={() => setModalVisible(false)}
              />
              <Button
                title="Save"
                loading={saving}
                style={styles.modalActionBtn}
                onPress={handleSaveModal}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  friendCard: {
    padding: 14,
    marginBottom: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  actionIconGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    padding: 6,
    borderRadius: 8,
  },
  familyCard: {
    padding: 14,
    marginBottom: 12,
  },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  familyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  familyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  familyName: {
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  familyActionBtn: {
    padding: 4,
    marginRight: 4,
  },
  emptyMembersText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  membersList: {
    paddingTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIconContainer: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    maxHeight: '90%',
  },
  modalScrollBody: {
    flexShrink: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeSelectorContainer: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {},
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {},
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalActionBtn: {
    flex: 1,
  },
});
