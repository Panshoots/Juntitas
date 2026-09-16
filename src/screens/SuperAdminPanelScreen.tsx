import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ScrollView, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { AppUser, UserRole, UserStatus } from '../models/User';
import { CommunityRequest, Community } from '../models/Community';
import { AuditLog } from '../models/AuditAndReport';
import { 
  getUsersFromDb, 
  updateUserStatusInDb, 
  updateUserRoleInDb, 
  updateUserDetailsInDb 
} from '../services/userService';
import { 
  getCommunityRequests, 
  approveCommunityRequest, 
  getCommunities 
} from '../services/communityService';
import { getAuditLogs } from '../services/auditService';

type CrmTab = 'users' | 'communities' | 'businesses' | 'audit';

export const SuperAdminPanelScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<CrmTab>('users');
  const [loading, setLoading] = useState(false);

  // Datos CRM Usuarios
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modales de Usuario
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('member');

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editComuna, setEditComuna] = useState('');
  const [editBio, setEditBio] = useState('');

  // Datos CRM Comunidades y Tiendas
  const [communityRequests, setCommunityRequests] = useState<CommunityRequest[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    loadAllCrmData();
  }, []);

  const loadAllCrmData = async () => {
    setLoading(true);
    const [uData, reqData, commData, auditData] = await Promise.all([
      getUsersFromDb(),
      getCommunityRequests(),
      getCommunities(),
      getAuditLogs()
    ]);
    setUsers(uData);
    setCommunityRequests(reqData);
    setCommunities(commData);
    setAuditLogs(auditData);
    setLoading(false);
  };

  // Acciones de Usuario
  const handleApproveUser = async (user: AppUser) => {
    const res = await updateUserStatusInDb(
      user.id, 
      'ACTIVO', 
      'Usuario verificado y habilitado por el Super Admin en el CRM.',
      currentUser.id
    );
    alert(res.message);
    loadAllCrmData();
  };

  const handleConfirmSuspend = async () => {
    if (!selectedUser) return;
    if (!suspendReason.trim()) {
      alert('Debes ingresar un motivo de suspensión obligatorio (Regla R-2401).');
      return;
    }

    const res = await updateUserStatusInDb(
      selectedUser.id,
      'SUSPENDIDO',
      suspendReason,
      currentUser.id
    );
    alert(res.message);
    setShowSuspendModal(false);
    setSuspendReason('');
    loadAllCrmData();
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    const res = await updateUserRoleInDb(selectedUser.id, selectedNewRole, currentUser.id);
    alert(res.message);
    setShowRoleModal(false);
    loadAllCrmData();
  };

  const handleConfirmEditUser = async () => {
    if (!selectedUser) return;
    const res = await updateUserDetailsInDb(
      selectedUser.id,
      {
        displayName: editDisplayName,
        bio: editBio,
        location: { region: selectedUser.location?.region || 'Metropolitana', comuna: editComuna }
      },
      currentUser.id
    );
    alert(res.message);
    setShowEditUserModal(false);
    loadAllCrmData();
  };

  const handleApproveCommunity = async (reqId: string) => {
    const res = await approveCommunityRequest(reqId, currentUser.id);
    alert(res.message);
    loadAllCrmData();
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (userStatusFilter === 'PENDING') {
      return u.status === 'PENDIENTE_APROBACION';
    }
    if (userStatusFilter === 'ACTIVE') {
      return u.status === 'ACTIVO' || u.status === 'active';
    }
    if (userStatusFilter === 'SUSPENDED') {
      return u.status === 'SUSPENDIDO' || u.status === 'suspended' || u.status === 'banned';
    }
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Cabecera CRM */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeAdmin}>
            <Ionicons name="shield-checkmark" size={14} color="#EF4444" />
            <Text style={styles.badgeAdminText}>Panel CRM Super Administrador</Text>
          </View>
          <Text style={styles.title}>Control Global de Plataforma</Text>
        </View>

        <TouchableOpacity style={styles.reloadBtn} onPress={loadAllCrmData}>
          <Ionicons name="refresh" size={18} color="#0284C7" />
        </TouchableOpacity>
      </View>

      {/* Selector de Pestañas CRM */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons name="people" size={16} color={activeTab === 'users' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'users' && styles.tabBtnTextActive]}>
            Usuarios ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'communities' && styles.tabBtnActive]}
          onPress={() => setActiveTab('communities')}
        >
          <Ionicons name="paw" size={16} color={activeTab === 'communities' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'communities' && styles.tabBtnTextActive]}>
            Comunidades ({communityRequests.filter(r => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'audit' && styles.tabBtnActive]}
          onPress={() => setActiveTab('audit')}
        >
          <Ionicons name="document-text" size={16} color={activeTab === 'audit' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'audit' && styles.tabBtnTextActive]}>
            Auditoría ({auditLogs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO PESTAÑA: CRM DE USUARIOS */}
      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
          {/* Barra de búsqueda y Filtros */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Buscar por nombre o correo..."
              value={userSearch}
              onChangeText={setUserSearch}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filterPillsRow}>
            {(['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const).map(f => (
              <TouchableOpacity 
                key={f}
                style={[styles.pill, userStatusFilter === f && styles.pillActive]}
                onPress={() => setUserStatusFilter(f)}
              >
                <Text style={[styles.pillText, userStatusFilter === f && styles.pillTextActive]}>
                  {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendientes ⏳' : f === 'ACTIVE' ? 'Activos ✅' : 'Suspendidos ⛔'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Listado de Usuarios */}
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No hay usuarios que coincidan con el filtro.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isPending = item.status === 'PENDIENTE_APROBACION';
              const isSuspended = item.status === 'SUSPENDIDO' || item.status === 'suspended' || item.status === 'banned';

              return (
                <View style={[styles.userCard, isPending && styles.userCardPending, isSuspended && styles.userCardSuspended]}>
                  <View style={styles.userCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{item.displayName}</Text>
                      <Text style={styles.userEmail}>{item.email} • 📍 {item.location?.comuna || 'Sin comuna'}</Text>
                    </View>

                    <View style={[
                      styles.statusPill, 
                      isPending ? styles.statusPillPending : isSuspended ? styles.statusPillSuspended : styles.statusPillActive
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        isPending ? { color: '#B45309' } : isSuspended ? { color: '#B91C1C' } : { color: '#15803D' }
                      ]}>
                        {isPending ? 'PENDIENTE' : isSuspended ? 'SUSPENDIDO' : 'ACTIVO'}
                      </Text>
                    </View>
                  </View>

                  {/* Detalle de Rol y Solicitud */}
                  <View style={styles.userMetaRow}>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>Rol: {item.roleType}</Text>
                    </View>
                    {item.requestedCommunityName && (
                      <Text style={styles.requestNote}>Comunidad pedida: {item.requestedCommunityName}</Text>
                    )}
                    {item.requestedBusinessName && (
                      <Text style={styles.requestNote}>Tienda pedida: {item.requestedBusinessName}</Text>
                    )}
                  </View>

                  {isSuspended && item.suspendedReason && (
                    <Text style={styles.reasonText}>Motivo suspensión: {item.suspendedReason}</Text>
                  )}

                  {/* Barra de Acciones del CRM */}
                  <View style={styles.actionsBar}>
                    {/* Habilitar si está pendiente o suspendido */}
                    {(isPending || isSuspended) && (
                      <TouchableOpacity 
                        style={styles.actionBtnApprove} 
                        onPress={() => handleApproveUser(item)}
                      >
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Habilitar</Text>
                      </TouchableOpacity>
                    )}

                    {/* Bloquear / Suspender */}
                    {!isSuspended && (
                      <TouchableOpacity 
                        style={styles.actionBtnSuspend} 
                        onPress={() => {
                          setSelectedUser(item);
                          setShowSuspendModal(true);
                        }}
                      >
                        <Ionicons name="ban" size={14} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Suspender</Text>
                      </TouchableOpacity>
                    )}

                    {/* Cambiar Rol */}
                    <TouchableOpacity 
                      style={styles.actionBtnRole} 
                      onPress={() => {
                        setSelectedUser(item);
                        setSelectedNewRole(item.roleType);
                        setShowRoleModal(true);
                      }}
                    >
                      <Ionicons name="key" size={14} color="#0284C7" />
                      <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>Rol</Text>
                    </TouchableOpacity>

                    {/* Editar Datos */}
                    <TouchableOpacity 
                      style={styles.actionBtnEdit} 
                      onPress={() => {
                        setSelectedUser(item);
                        setEditDisplayName(item.displayName);
                        setEditComuna(item.location?.comuna || '');
                        setEditBio(item.bio || '');
                        setShowEditUserModal(true);
                      }}
                    >
                      <Ionicons name="pencil" size={14} color="#475569" />
                      <Text style={[styles.actionBtnText, { color: '#475569' }]}>Editar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* CONTENIDO PESTAÑA: COMUNIDADES */}
      {activeTab === 'communities' && (
        <ScrollView style={styles.tabContentScroll} contentContainerStyle={{ paddingBottom: 100 }}>
          <Text style={styles.subSectionTitle}>Solicitudes de Comunidades ({communityRequests.filter(r => r.status === 'pending').length})</Text>

          {communityRequests.filter(r => r.status === 'pending').length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay solicitudes pendientes de comunidades.</Text>
            </View>
          ) : (
            communityRequests.filter(r => r.status === 'pending').map(req => (
              <View key={req.id} style={styles.reqCard}>
                <Text style={styles.reqTitle}>{req.communityName}</Text>
                <Text style={styles.reqMeta}>Solicitante: {req.applicantName} ({req.applicantEmail})</Text>
                <Text style={styles.reqMeta}>Instagram: {req.instagramHandle} • 📍 {req.comuna}</Text>
                <Text style={styles.reqDesc}>{req.description}</Text>

                <TouchableOpacity 
                  style={styles.approveReqBtn} 
                  onPress={() => handleApproveCommunity(req.id)}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.approveReqBtnText}>Aprobar & Nombrar Admin Principal</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={[styles.subSectionTitle, { marginTop: 24 }]}>Comunidades Aprobadas ({communities.length})</Text>
          {communities.map(c => (
            <View key={c.id} style={styles.approvedCommCard}>
              <Text style={styles.approvedCommName}>{c.name}</Text>
              <Text style={styles.approvedCommMeta}>📍 {c.comuna} • {c.membersCount} miembros</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* CONTENIDO PESTAÑA: AUDITORÍA */}
      {activeTab === 'audit' && (
        <FlatList
          data={auditLogs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.auditCard}>
              <View style={styles.auditHeaderRow}>
                <Text style={styles.auditAction}>{item.action}</Text>
                <Text style={styles.auditDate}>
                  {item.timestamp?.toLocaleDateString ? item.timestamp.toLocaleDateString() : 'Hoy'}
                </Text>
              </View>
              <Text style={styles.auditReason}>{item.reason}</Text>
              <Text style={styles.auditMeta}>
                Actor: {item.actorUserId} • Entidad: {item.entityType}/{item.entityId}
              </Text>
            </View>
          )}
        />
      )}

      {/* MODAL: SUSPENDER USUARIO CON MOTIVO OBLIGATORIO (R-2401) */}
      <Modal visible={showSuspendModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#B91C1C' }]}>⛔ Suspender Usuario</Text>
              <TouchableOpacity onPress={() => setShowSuspendModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Usuario: {selectedUser?.displayName} ({selectedUser?.email})
            </Text>

            <Text style={styles.inputLabel}>Motivo obligatorio de suspensión (Regla R-2401):</Text>
            <TextInput
              placeholder="Ej: Publicación de contenido inapropiado o perfil falso"
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 70 }]}
            />

            <TouchableOpacity style={styles.btnDanger} onPress={handleConfirmSuspend}>
              <Text style={styles.btnDangerText}>Confirmar Suspensión en el CRM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CAMBIAR ROL */}
      <Modal visible={showRoleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔄 Cambiar Rol de Usuario</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Asignar nuevo rol a {selectedUser?.displayName}:
            </Text>

            {(['member', 'primary_admin', 'secondary_admin', 'business_owner', 'super_admin'] as const).map(role => (
              <TouchableOpacity 
                key={role}
                style={[styles.roleSelectOption, selectedNewRole === role && styles.roleSelectOptionActive]}
                onPress={() => setSelectedNewRole(role)}
              >
                <Ionicons 
                  name={selectedNewRole === role ? "radio-button-on" : "radio-button-off"} 
                  size={18} 
                  color={selectedNewRole === role ? "#0284C7" : "#94A3B8"} 
                />
                <Text style={styles.roleSelectText}>
                  {role === 'member' ? 'Miembro / Tutor Estándar' :
                   role === 'primary_admin' ? 'Administrador Principal de Comunidad' :
                   role === 'secondary_admin' ? 'Administrador Secundario (Delegado)' :
                   role === 'business_owner' ? 'Dueño de Tienda / Comercio' :
                   'Super Administrador Global'}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleConfirmRoleChange}>
              <Text style={styles.btnPrimaryText}>Guardar Nuevo Rol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDITAR DATOS DE USUARIO */}
      <Modal visible={showEditUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Modificar Datos de Usuario</Text>
              <TouchableOpacity onPress={() => setShowEditUserModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre visible:</Text>
            <TextInput
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Comuna:</Text>
            <TextInput
              value={editComuna}
              onChangeText={setEditComuna}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Biografía:</Text>
            <TextInput
              value={editBio}
              onChangeText={setEditBio}
              multiline
              numberOfLines={2}
              style={[styles.modalInput, { height: 60 }]}
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleConfirmEditUser}>
              <Text style={styles.btnPrimaryText}>Actualizar Datos en Firestore</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 12,
  },
  badgeAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  badgeAdminText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  reloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  pillActive: {
    backgroundColor: '#0F172A',
  },
  pillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  userCardPending: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF5',
  },
  userCardSuspended: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillSuspended: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  requestNote: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionBtnApprove: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnSuspend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnRole: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabContentScroll: {
    paddingHorizontal: 20,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  reqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  reqTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  reqMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  reqDesc: {
    fontSize: 13,
    color: '#334155',
    marginVertical: 8,
  },
  approveReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveReqBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  approvedCommCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  approvedCommName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  approvedCommMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  auditHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  auditAction: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  auditDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  auditReason: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  auditMeta: {
    fontSize: 10,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  btnDanger: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDangerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  roleSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 8,
  },
  roleSelectOptionActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  roleSelectText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
});
