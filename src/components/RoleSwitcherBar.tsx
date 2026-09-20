import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../models/User';

export const RoleSwitcherBar: React.FC = () => {
  const { sessionState, currentUser, activeProfile, logout, loginAsSuperAdmin } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  // No mostrar la barra si está en onboarding o registro
  if (sessionState !== 'authenticated') {
    return null;
  }

  const getRoleIcon = (roleType: UserRole) => {
    switch (roleType) {
      case 'super_admin': return 'shield-checkmark';
      case 'primary_admin': return 'ribbon';
      case 'secondary_admin': return 'shield-half';
      case 'business_owner': return 'storefront';
      case 'member': return 'paw';
    }
  };

  return (
    <>
      {/* Barra superior de rol activo */}
      <View style={[styles.barContainer, { borderBottomColor: activeProfile.roleColor }]}>
        <View style={styles.leftInfo}>
          <View style={[styles.roleBadge, { backgroundColor: activeProfile.roleColor }]}>
            <Ionicons name={getRoleIcon(currentUser.roleType || 'member')} size={13} color="#FFFFFF" />
            <Text style={styles.roleBadgeText}>{activeProfile.roleLabel}</Text>
          </View>
          <Text style={styles.userNameText} numberOfLines={1}>
            {currentUser.displayName}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity 
            style={styles.switchButton} 
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="settings" size={14} color="#0284C7" />
            <Text style={styles.switchButtonText}>Perfil / Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Sesión & Roles */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>👤 Sesión Actual & Permisos</Text>
                <Text style={styles.modalSubtitle}>Usuario conectado a Firebase Firestore</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.currentUserBox}>
              <Text style={styles.currUserName}>{currentUser.displayName}</Text>
              <Text style={styles.currUserEmail}>{currentUser.email}</Text>
              <Text style={styles.currUserRole}>Rol: {activeProfile.roleLabel}</Text>
              <Text style={styles.currUserStatus}>Estado: {currentUser.status}</Text>
            </View>

            <View style={styles.modalActions}>
              {!currentUser.isSuperAdmin && (
                <TouchableOpacity 
                  style={styles.btnAdmin} 
                  onPress={() => {
                    loginAsSuperAdmin();
                    setModalVisible(false);
                  }}
                >
                  <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.btnAdminText}>Cambiar a Super Admin (CRM Global)</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.btnLogout} 
                onPress={() => {
                  setModalVisible(false);
                  logout();
                }}
              >
                <Ionicons name="log-out" size={16} color="#EF4444" />
                <Text style={styles.btnLogoutText}>Cerrar Sesión / Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
  },
  switchButtonText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  currentUserBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  currUserName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  currUserEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  currUserRole: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
    marginTop: 6,
  },
  currUserStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 2,
  },
  modalActions: {
    gap: 10,
  },
  btnAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnAdminText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnLogoutText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
