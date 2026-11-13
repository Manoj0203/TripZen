import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
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

  // Delete Handlers
  const handleDeleteFamily = (family) => {
    Alert.alert(
      'Delete Family',
      `Are you sure you want to delete "${family.name}" and all its members? All associated expenses and splits will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFamily(family.id);
              await loadData();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete family.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMember = (member) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove "${member.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMember(member.id);
              await loadData();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to remove member.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteFriend = (friend) => {
    Alert.alert(
      'Delete Friend',
      `Are you sure you want to remove "${friend.name}"? Associated expenses and splits will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFriend(friend.id);
              await loadData();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete friend.');
            }
          },
        },
      ]
    );
  };

  // Save Modal Handler (Handles Add & Edit)
  const handleSaveModal = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Required', 'Please enter a name.');
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
      Alert.alert('Error', 'Could not save participant.');
    } finally {
      setSaving(false);
    }
  };

  const renderFriendItem = ({ item }) => {
    return (
      <Card style={styles.friendCard}>
        <View style={styles.friendRow}>
          <View style={styles.avatarCircle}>
            <UserIcon size={18} color={colors.secondary} />
          </View>
          <Text style={styles.friendName}>{item.name}</Text>

          <View style={styles.actionIconGroup}>
            <TouchableOpacity
              onPress={() => openEditFriend(item)}
              style={styles.smallActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <EditIcon size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteFriend(item)}
              style={styles.smallActionBtn}
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
        <View style={styles.familyHeader}>
          <View style={styles.familyTitleContainer}>
            <View style={styles.familyIconCircle}>
              <FamilyIcon size={18} color={colors.primaryDark} />
            </View>
            <Text style={styles.familyName}>{item.name}</Text>

            <TouchableOpacity
              onPress={() => openEditFamily(item)}
              style={styles.familyActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <EditIcon size={15} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
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
          <Text style={styles.emptyMembersText}>No members added yet</Text>
        ) : (
          <View style={styles.membersList}>
            {item.members.map(member => (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View
                    style={[
                      styles.memberBadge,
                      member.memberType === 'child' ? styles.childBadge : styles.adultBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberBadgeText,
                        member.memberType === 'child'
                          ? styles.childBadgeText
                          : styles.adultBadgeText,
                      ]}
                    >
                      {member.memberType === 'child' ? 'Child (0.5x)' : 'Adult (1.0x)'}
                    </Text>
                  </View>
                </View>

                <View style={styles.memberActions}>
                  <TouchableOpacity
                    onPress={() => openEditMember(item.id, member)}
                    style={styles.smallActionBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <EditIcon size={14} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteMember(member)}
                    style={styles.smallActionBtn}
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
        return 'Add New Friend';
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
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarTitleContainer}>
          <Text style={styles.pageTitle}>{isFriends ? 'Friends List' : 'Trip Families'}</Text>
          <Text style={styles.pageSubtitle}>
            {isFriends
              ? 'Add friends to split trip expenses with'
              : 'Add families and their members (Adult/Child)'}
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
                <UsersIcon size={44} color="#CBD5E1" />
              ) : (
                <FamilyIcon size={44} color="#CBD5E1" />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {isFriends ? 'No friends added yet' : 'No families added yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isFriends
                ? 'Tap "Add Friend" above to add your travel buddies.'
                : 'Tap "Add Family" above to create family groups.'}
            </Text>
          </View>
        }
      />

      {/* Modal for Adding & Editing Friend / Family / Member */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>

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

            {/* If adding or editing a family member, show Adult / Child toggle */}
            {modalMode.includes('member') ? (
              <View style={styles.typeSelectorContainer}>
                <Text style={styles.inputLabel}>Member Category</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      memberType === 'adult' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setMemberType('adult')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        memberType === 'adult' && styles.toggleTextActive,
                      ]}
                    >
                      Adult (1.0x share)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      memberType === 'child' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setMemberType('child')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        memberType === 'child' && styles.toggleTextActive,
                      ]}
                    >
                      Child (0.5x share)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  friendCard: {
    padding: 14,
    marginBottom: 10,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  actionIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  familyCard: {
    padding: 16,
    marginBottom: 14,
  },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  familyName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  familyActionBtn: {
    padding: 4,
    marginRight: 4,
  },
  emptyMembersText: {
    fontSize: 13,
    color: colors.textMuted,
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
    borderBottomColor: '#F8FAFC',
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
    color: colors.text,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adultBadge: {
    backgroundColor: '#E0F2FE',
  },
  childBadge: {
    backgroundColor: '#FEF3C7',
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adultBadgeText: {
    color: '#0284C7',
  },
  childBadgeText: {
    color: '#D97706',
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
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.primaryDark,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalActionBtn: {
    flex: 1,
  },
});
