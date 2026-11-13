import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, Alert, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { getParticipants, addFamily, addMember, addFriend } from '../services/tripService';

export function ParticipantsScreen({ route, navigation }) {
  const { tripId, tripType } = route.params;
  const isFriends = tripType === 'friends';

  const [participants, setParticipants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [memberType, setMemberType] = useState('adult'); // for family members
  const [activeFamilyId, setActiveFamilyId] = useState(null); // when adding member to a family

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

  const handleAddUnit = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }

    try {
      if (isFriends) {
        // Add single friend
        await addFriend({ tripId, name: nameInput.trim() });
      } else if (activeFamilyId) {
        // Add member to existing family
        const weight = memberType === 'child' ? 50 : 100;
        await addMember({
          tripId,
          familyId: activeFamilyId,
          name: nameInput.trim(),
          memberType,
          defaultWeight: weight,
        });
      } else {
        // Add new family
        await addFamily({ tripId, name: nameInput.trim() });
      }

      setNameInput('');
      setActiveFamilyId(null);
      setModalVisible(false);
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save participant.');
    }
  };

  const openAddFamily = () => {
    setActiveFamilyId(null);
    setNameInput('');
    setModalVisible(true);
  };

  const openAddMember = (familyId) => {
    setActiveFamilyId(familyId);
    setNameInput('');
    setMemberType('adult');
    setModalVisible(true);
  };

  const renderFriendItem = ({ item }) => {
    return (
      <Card style={styles.friendCard}>
        <View style={styles.friendRow}>
          <Text style={styles.friendAvatar}>🧑</Text>
          <Text style={styles.friendName}>{item.name}</Text>
        </View>
      </Card>
    );
  };

  const renderFamilyItem = ({ item }) => {
    return (
      <Card style={styles.familyCard}>
        <View style={styles.familyHeader}>
          <View style={styles.familyTitleContainer}>
            <Text style={styles.familyIcon}>🏠</Text>
            <Text style={styles.familyName}>{item.name}</Text>
          </View>
          <Button
            title="+ Add Member"
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
                      member.memberType === 'child' ? styles.childBadgeText : styles.adultBadgeText,
                    ]}
                  >
                    {member.memberType === 'child' ? 'Child (0.5x)' : 'Adult (1.0x)'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>{isFriends ? 'Friends List' : 'Trip Families'}</Text>
          <Text style={styles.pageSubtitle}>
            {isFriends
              ? 'Add friends to split trip expenses with'
              : 'Add families and their members (Adult/Child)'}
          </Text>
        </View>
        <Button
          title={isFriends ? '+ Add Friend' : '+ Add Family'}
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
            <Text style={styles.emptyTitle}>
              {isFriends ? 'No friends added yet' : 'No families added yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isFriends
                ? 'Click "+ Add Friend" above to add your travel buddies.'
                : 'Click "+ Add Family" above to create family groups.'}
            </Text>
          </View>
        }
      />

      {/* Modal for adding Friend / Family / Member */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isFriends
                ? 'Add New Friend'
                : activeFamilyId
                ? 'Add Family Member'
                : 'Add New Family'}
            </Text>

            <Input
              label={
                isFriends
                  ? "Friend's Name"
                  : activeFamilyId
                  ? "Member's Name"
                  : 'Family Name'
              }
              placeholder={
                isFriends
                  ? 'e.g. Rahul, Sneha, Vikram'
                  : activeFamilyId
                  ? 'e.g. Aarav, Ananya'
                  : 'e.g. Sharma Family'
              }
              value={nameInput}
              onChangeText={setNameInput}
            />

            {/* If adding a family member, show Adult / Child toggle */}
            {!isFriends && activeFamilyId ? (
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
                style={styles.modalActionBtn}
                onPress={handleAddUnit}
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
  friendAvatar: {
    fontSize: 22,
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
  },
  familyIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  familyName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
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
    paddingVertical: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
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
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
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
