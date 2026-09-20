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
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { AppUser, UserRole, UserStatus } from '../models/User';
import { CommunityRequest, Community } from '../models/Community';
import { AuditLog } from '../models/AuditAndReport';
import { DogEvent, EventStatus } from '../models/Event';
import { 
  getUsersFromDb, 
  updateUserStatusInDb, 
  updateUserRoleInDb, 
  updateUserDetailsInDb 
} from '../services/userService';
import { 
  getCommunityRequests, 
  approveCommunityRequest, 
  rejectCommunityRequest,
  getCommunities 
} from '../services/communityService';
import { getAuditLogs, logAuditAction } from '../services/auditService';
import { 
  getEvents, 
  updateEventStatusInDb, 
  cancelEventByAdmin, 
  deleteEventInDb 
} from '../services/eventService';
import { resetEntireApp, seedRealisticData } from '../services/seedService';
import { useToast } from '../context/ToastContext';

type CrmTab = 'users' | 'communities' | 'events' | 'audit';

export const SuperAdminPanelScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser, sendPasswordReset } = useAuth();
  const { showToast } = useToast();

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

  // Modal para restablecer contraseña desde CRM
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [userToResetPwd, setUserToResetPwd] = useState<AppUser | null>(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Datos CRM Comunidades y Tiendas
  const [communityRequests, setCommunityRequests] = useState<CommunityRequest[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Datos CRM Juntas
  const [events, setEvents] = useState<DogEvent[]>([]);
  const [eventSearch, setEventSearch] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<'ALL' | EventStatus>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<DogEvent | null>(null);
  const [showCancelEventModal, setShowCancelEventModal] = useState(false);
  const [cancelEventReason, setCancelEventReason] = useState('');
  const [showEventStatusModal, setShowEventStatusModal] = useState(false);
  const [selectedNewEventStatus, setSelectedNewEventStatus] = useState<EventStatus>('programada');

  useEffect(() => {
    loadAllCrmData();
  }, []);

  const loadAllCrmData = async () => {
    const startTime = Date.now();
    setLoading(true);
    try {
      const [uData, reqData, commData, auditData, evData] = await Promise.all([
        getUsersFromDb(),
        getCommunityRequests(),
        getCommunities(),
        getAuditLogs(),
        getEvents()
      ]);
      setUsers(uData);
      setCommunityRequests(reqData);
      setCommunities(commData);
      setAuditLogs(auditData);
      setEvents(evData);
    } catch (e) {
      console.warn('Error cargando datos del CRM:', e);
    } finally {
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 400 - elapsed);
      if (minDelay > 0) await new Promise(r => setTimeout(r, minDelay));
      setLoading(false);
    }
  };

  // Acciones de Usuario
  const handleApproveUser = async (user: AppUser) => {
    const res = await updateUserStatusInDb(
      user.id, 
      'ACTIVO', 
      'Usuario verificado y habilitado por el Super Admin en el CRM.',
      currentUser.id
    );
    showToast(res.message, res.success ? 'success' : 'error');
    loadAllCrmData();
  };

  const handleConfirmSuspend = async () => {
    if (!selectedUser) return;
    if (!suspendReason.trim()) {
      showToast('Debes ingresar un motivo de suspensión obligatorio (Regla R-2401).', 'warning');
      return;
    }

    const res = await updateUserStatusInDb(
      selectedUser.id,
      'SUSPENDIDO',
      suspendReason,
      currentUser.id
    );
    showToast(res.message, res.success ? 'success' : 'error');
    setShowSuspendModal(false);
    setSuspendReason('');
    loadAllCrmData();
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    const res = await updateUserRoleInDb(selectedUser.id, selectedNewRole, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
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
    showToast(res.message, res.success ? 'success' : 'error');
    setShowEditUserModal(false);
    loadAllCrmData();
  };

  const handleApproveCommunity = async (reqId: string) => {
    const res = await approveCommunityRequest(reqId, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
    loadAllCrmData();
  };

  const handleRejectCommunity = async (reqId: string) => {
    const res = await rejectCommunityRequest(reqId, currentUser.id);
    showToast(res.message, res.success ? 'warning' : 'error');
    loadAllCrmData();
  };

  const handleResetApp = async () => {
    const confirmReset = window ? window.confirm('⚠️ ¿Estás seguro de que deseas VACIAR TODA LA APLICACIÓN? Se eliminarán todos los usuarios de prueba, comunidades, juntas y tiendas, dejando la app en blanco.') : true;
    if (!confirmReset) return;

    setLoading(true);
    const res = await resetEntireApp(currentUser.id);
    setLoading(false);
    showToast(res.message, res.success ? 'success' : 'error');
    loadAllCrmData();
  };

  const handleSeedData = async () => {
    setLoading(true);
    const res = await seedRealisticData(currentUser.id);
    setLoading(false);
    showToast(res.message, res.success ? 'success' : 'error');
    loadAllCrmData();
  };

  // Restablecimiento de contraseña por Super Admin
  const handleConfirmSendResetEmail = async () => {
    if (!userToResetPwd?.email) return;
    setSendingResetEmail(true);
    const res = await sendPasswordReset(userToResetPwd.email);
    setSendingResetEmail(false);
    if (res.success) {
      await logAuditAction(
        currentUser.id,
        'PASSWORD_RESET_DISPATCH',
        'users',
        userToResetPwd.id,
        `SuperAdmin despachó correo de recuperación de contraseña a: ${userToResetPwd.email}`
      );
      showToast(`¡Enlace de recuperación enviado exitosamente a ${userToResetPwd.email}!`, 'success');
      setShowResetPwdModal(false);
      setUserToResetPwd(null);
      loadAllCrmData();
    } else {
      showToast(res.message, 'error');
    }
  };

  // Acciones de Gestión de Juntas
  const handleConfirmChangeEventStatus = async () => {
    if (!selectedEvent) return;
    const res = await updateEventStatusInDb(selectedEvent.id, selectedNewEventStatus, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
    setShowEventStatusModal(false);
    setSelectedEvent(null);
    loadAllCrmData();
  };

  const handleConfirmCancelEvent = async () => {
    if (!selectedEvent) return;
    if (!cancelEventReason.trim()) {
      showToast('Debes ingresar un motivo de moderación/cancelación.', 'warning');
      return;
    }
    const res = await cancelEventByAdmin(selectedEvent.id, cancelEventReason, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
    setShowCancelEventModal(false);
    setCancelEventReason('');
    setSelectedEvent(null);
    loadAllCrmData();
  };

  const handleDeleteEvent = async (ev: DogEvent) => {
    const confirmDelete = window ? window.confirm(`⚠️ ¿Deseas ELIMINAR definitivamente la junta "${ev.title}"? Esta acción removerá el evento por completo.`) : true;
    if (!confirmDelete) return;

    const res = await deleteEventInDb(ev.id, 'Eliminación administrativa desde panel CRM', currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
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

  // Filtrado de juntas
  const filteredEvents = events.filter(e => {
    const term = eventSearch.toLowerCase();
    const matchesSearch = 
      (e.title || '').toLowerCase().includes(term) ||
      (e.communityName || '').toLowerCase().includes(term) ||
      (e.location?.placeName || '').toLowerCase().includes(term) ||
      (e.location?.comuna || '').toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (eventStatusFilter !== 'ALL') {
      return e.status === eventStatusFilter;
    }
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Cabecera CRM */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={styles.badgeAdmin}>
            <Ionicons name="shield-checkmark" size={13} color="#DC2626" />
            <Text style={styles.badgeAdminText}>SUPER ADMIN • FRANCISCO JUILLET</Text>
          </View>
          <Text style={styles.title}>Panel CRM & Control Global</Text>
          <Text style={styles.subtitle}>Supervisión integral de usuarios, comunidades, juntas y auditoría</Text>
        </View>

        <TouchableOpacity 
          style={styles.reloadBtn} 
          onPress={loadAllCrmData}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={18} color="#0284C7" />
        </TouchableOpacity>
      </View>

      {/* Barra de Gestión de Datos de la Base de Datos */}
      <View style={styles.databaseToolbar}>
        <TouchableOpacity 
          style={[styles.dbActionBtn, styles.dbResetBtn]} 
          onPress={handleResetApp}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-bin" size={15} color="#DC2626" />
          <Text style={styles.dbResetText}>Vaciar Toda la App</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dbActionBtn, styles.dbSeedBtn]} 
          onPress={handleSeedData}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={15} color="#15803D" />
          <Text style={styles.dbSeedText}>Poblar 10 Usuarios & 4 Tiendas</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de Pestañas CRM con scroll horizontal suave */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
        style={styles.tabsScrollView}
      >
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={16} color={activeTab === 'users' ? '#FFFFFF' : '#0284C7'} />
          <Text style={[styles.tabBtnText, activeTab === 'users' && styles.tabBtnTextActive]}>
            Usuarios
          </Text>
          <View style={[styles.tabCountBadge, activeTab === 'users' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'users' && styles.tabCountTextActive]}>
              {users.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'communities' && styles.tabBtnActive]}
          onPress={() => setActiveTab('communities')}
          activeOpacity={0.8}
        >
          <Ionicons name="paw" size={16} color={activeTab === 'communities' ? '#FFFFFF' : '#D97706'} />
          <Text style={[styles.tabBtnText, activeTab === 'communities' && styles.tabBtnTextActive]}>
            Comunidades
          </Text>
          <View style={[styles.tabCountBadge, activeTab === 'communities' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'communities' && styles.tabCountTextActive]}>
              {communities.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'events' && styles.tabBtnActive]}
          onPress={() => setActiveTab('events')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar" size={16} color={activeTab === 'events' ? '#FFFFFF' : '#0284C7'} />
          <Text style={[styles.tabBtnText, activeTab === 'events' && styles.tabBtnTextActive]}>
            Juntas
          </Text>
          <View style={[styles.tabCountBadge, activeTab === 'events' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'events' && styles.tabCountTextActive]}>
              {events.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'audit' && styles.tabBtnActive]}
          onPress={() => setActiveTab('audit')}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text" size={16} color={activeTab === 'audit' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'audit' && styles.tabBtnTextActive]}>
            Auditoría
          </Text>
          <View style={[styles.tabCountBadge, activeTab === 'audit' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'audit' && styles.tabCountTextActive]}>
              {auditLogs.length}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* EXPERIENCIA DE CARGA REAL DEL CRM */}
      {loading ? (
        <View style={styles.crmLoadingContainer}>
          <View style={styles.crmSpinnerCircle}>
            <ActivityIndicator size="large" color="#0284C7" />
          </View>
          <Text style={styles.crmLoadingTitle}>Sincronizando Panel CRM...</Text>
          <Text style={styles.crmLoadingSub}>
            Consultando usuarios, comunidades, juntas y registros de auditoría en tiempo real 🛡️
          </Text>
        </View>
      ) : (
        <>
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
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadAllCrmData} colors={['#0284C7']} tintColor="#0284C7" />
            }
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
                        setSelectedNewRole(item.roleType || 'member');
                        setShowRoleModal(true);
                      }}
                    >
                      <Ionicons name="key" size={14} color="#0284C7" />
                      <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>Rol</Text>
                    </TouchableOpacity>

                    {/* Restablecer Contraseña por Correo */}
                    <TouchableOpacity 
                      style={styles.actionBtnResetPwd} 
                      onPress={() => {
                        setUserToResetPwd(item);
                        setShowResetPwdModal(true);
                      }}
                    >
                      <Ionicons name="mail" size={14} color="#0D9488" />
                      <Text style={[styles.actionBtnText, { color: '#0D9488' }]}>Clave</Text>
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
        <ScrollView 
          style={styles.tabContentScroll} 
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadAllCrmData} colors={['#0284C7']} tintColor="#0284C7" />
          }
        >
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

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity 
                    style={[styles.approveReqBtn, { flex: 1 }]} 
                    onPress={() => handleApproveCommunity(req.id)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.approveReqBtnText}>Aprobar & Activar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.rejectReqBtn, { flex: 1 }]} 
                    onPress={() => handleRejectCommunity(req.id)}
                  >
                    <Ionicons name="close-circle" size={16} color="#DC2626" />
                    <Text style={styles.rejectReqBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
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

      {/* CONTENIDO PESTAÑA: GESTIÓN DE JUNTAS */}
      {activeTab === 'events' && (
        <View style={{ flex: 1 }}>
          {/* Barra de búsqueda de Juntas */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Buscar por título, comunidad o comuna..."
              value={eventSearch}
              onChangeText={setEventSearch}
              style={styles.searchInput}
            />
          </View>

          {/* Filtros de Estado de Junta */}
          <View style={{ marginBottom: 10 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {[
                { key: 'ALL', label: 'Todas' },
                { key: 'programada', label: 'Programadas 📅' },
                { key: 'confirmada', label: 'Confirmadas ✅' },
                { key: 'en_curso', label: 'En Curso 🐕' },
                { key: 'finalizada', label: 'Finalizadas 🏁' },
                { key: 'cancelada', label: 'Canceladas ⛔' },
              ].map(f => (
                <TouchableOpacity 
                  key={f.key}
                  style={[styles.pill, eventStatusFilter === f.key && styles.pillActive]}
                  onPress={() => setEventStatusFilter(f.key as any)}
                >
                  <Text style={[styles.pillText, eventStatusFilter === f.key && styles.pillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Listado de Juntas */}
          <FlatList
            data={filteredEvents}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadAllCrmData} colors={['#0284C7']} tintColor="#0284C7" />
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No hay juntas que coincidan con el filtro.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isScheduled = item.status === 'programada';
              const isConfirmed = item.status === 'confirmada';
              const isInProgress = item.status === 'en_curso';
              const isFinished = item.status === 'finalizada';
              const isCancelled = item.status === 'cancelada';

              const dateStr = item.startDate 
                ? (item.startDate.toLocaleDateString 
                    ? item.startDate.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) 
                    : String(item.startDate))
                : 'Fecha pendiente';

              return (
                <View style={[styles.eventCard, isCancelled && styles.eventCardCancelled]}>
                  {/* Encabezado del Evento */}
                  <View style={styles.eventCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.eventCommTag}>
                        <Ionicons name="paw" size={12} color="#0284C7" />
                        <Text style={styles.eventCommTagText}>{item.communityName}</Text>
                      </View>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                    </View>

                    <View style={[
                      styles.statusPill,
                      isScheduled ? styles.statusPillPending :
                      isConfirmed ? styles.statusPillActive :
                      isInProgress ? styles.statusPillInProgress :
                      isCancelled ? styles.statusPillSuspended :
                      styles.statusPillFinished
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        isScheduled ? { color: '#B45309' } :
                        isConfirmed ? { color: '#15803D' } :
                        isInProgress ? { color: '#1D4ED8' } :
                        isCancelled ? { color: '#B91C1C' } :
                        { color: '#475569' }
                      ]}>
                        {isScheduled ? 'PROGRAMADA' :
                         isConfirmed ? 'CONFIRMADA' :
                         isInProgress ? 'EN CURSO' :
                         isCancelled ? 'CANCELADA' : 'FINALIZADA'}
                      </Text>
                    </View>
                  </View>

                  {/* Detalles de Fecha y Lugar */}
                  <View style={styles.eventDetailsRow}>
                    <View style={styles.eventDetailItem}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text style={styles.eventDetailText}>{dateStr}</Text>
                    </View>

                    <View style={styles.eventDetailItem}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.eventDetailText} numberOfLines={1}>
                        {item.location?.placeName || 'Lugar'} • {item.location?.comuna || 'Sin comuna'}
                      </Text>
                    </View>
                  </View>

                  {/* Asistentes: Tutores y Perritos */}
                  <View style={styles.eventAttendanceRow}>
                    <View style={styles.eventAttendeeBadge}>
                      <Ionicons name="people" size={13} color="#0284C7" />
                      <Text style={styles.eventAttendeeBadgeText}>{item.tutorsCount || 0} tutores</Text>
                    </View>

                    <View style={styles.eventAttendeeBadge}>
                      <Ionicons name="paw" size={13} color="#10B981" />
                      <Text style={[styles.eventAttendeeBadgeText, { color: '#10B981' }]}>{item.dogsCount || 0} perritos</Text>
                    </View>

                    {item.acceptsBusinesses && (
                      <View style={[styles.eventAttendeeBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="storefront" size={13} color="#D97706" />
                        <Text style={[styles.eventAttendeeBadgeText, { color: '#D97706' }]}>Comercios</Text>
                      </View>
                    )}
                  </View>

                  {/* Acciones de Moderación del Super Admin */}
                  <View style={styles.actionsBar}>
                    {/* Cambiar Estado */}
                    <TouchableOpacity 
                      style={styles.actionBtnStatus} 
                      onPress={() => {
                        setSelectedEvent(item);
                        setSelectedNewEventStatus(item.status);
                        setShowEventStatusModal(true);
                      }}
                    >
                      <Ionicons name="swap-horizontal" size={14} color="#0284C7" />
                      <Text style={[styles.actionBtnText, { color: '#0284C7' }]}>Estado</Text>
                    </TouchableOpacity>

                    {/* Cancelar / Moderar */}
                    {!isCancelled && (
                      <TouchableOpacity 
                        style={styles.actionBtnCancelEvent} 
                        onPress={() => {
                          setSelectedEvent(item);
                          setShowCancelEventModal(true);
                        }}
                      >
                        <Ionicons name="ban" size={14} color="#DC2626" />
                        <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancelar</Text>
                      </TouchableOpacity>
                    )}

                    {/* Eliminar Definitivamente */}
                    <TouchableOpacity 
                      style={styles.actionBtnDelete} 
                      onPress={() => handleDeleteEvent(item)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#64748B" />
                      <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* CONTENIDO PESTAÑA: AUDITORÍA */}
      {activeTab === 'audit' && (
        <FlatList
          data={auditLogs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadAllCrmData} colors={['#0284C7']} tintColor="#0284C7" />
          }
          renderItem={({ item }) => (
            <View style={styles.auditCard}>
              <View style={styles.auditHeaderRow}>
                <Text style={styles.auditAction}>{item.action}</Text>
                <Text style={styles.auditDate}>
                  {item.timestamp?.toLocaleDateString ? item.timestamp.toLocaleDateString() : 'Hoy'}
                </Text>
              </View>
              <Text style={styles.auditReason}>{item.details?.reason || (item as any).reason || 'Acción administrativa registrada'}</Text>
              <Text style={styles.auditMeta}>
                Actor: {item.actorUserId} • Entidad: {item.targetEntityType || (item as any).entityType}/{item.targetEntityId || (item as any).entityId}
              </Text>
            </View>
          )}
        />
      )}
        </>
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

      {/* MODAL: ENVIAR CORREO RESTABLECIMIENTO DE CONTRASEÑA */}
      <Modal visible={showResetPwdModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#0F766E' }]}>📧 Restablecer Contraseña</Text>
              <TouchableOpacity onPress={() => setShowResetPwdModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Se enviará un correo de recuperación oficial de Firebase para que el usuario pueda restablecer su contraseña de forma segura.
            </Text>

            <View style={styles.pwdResetUserInfo}>
              <Text style={styles.pwdResetLabel}>Usuario:</Text>
              <Text style={styles.pwdResetVal}>{userToResetPwd?.displayName}</Text>

              <Text style={[styles.pwdResetLabel, { marginTop: 6 }]}>Correo Destinatario:</Text>
              <Text style={styles.pwdResetValEmail}>{userToResetPwd?.email}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.btnTeal, sendingResetEmail && { opacity: 0.6 }]} 
              onPress={handleConfirmSendResetEmail}
              disabled={sendingResetEmail}
            >
              <Ionicons name="mail" size={16} color="#FFFFFF" />
              <Text style={styles.btnTealText}>
                {sendingResetEmail ? 'Enviando enlace oficial...' : 'Enviar Correo de Restablecimiento'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CAMBIAR ESTADO DE JUNTA */}
      <Modal visible={showEventStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔄 Cambiar Estado de la Junta</Text>
              <TouchableOpacity onPress={() => setShowEventStatusModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Junta: "{selectedEvent?.title}" ({selectedEvent?.communityName})
            </Text>

            {([
              { key: 'programada', label: '📅 Programada (En preparación)', color: '#B45309' },
              { key: 'confirmada', label: '✅ Confirmada (Punto de encuentro listo)', color: '#15803D' },
              { key: 'en_curso', label: '🐕 En Curso (Junta ocurriendo ahora)', color: '#1D4ED8' },
              { key: 'finalizada', label: '🏁 Finalizada (Junta terminada)', color: '#475569' },
              { key: 'cancelada', label: '⛔ Cancelada (Suspendida por la organización)', color: '#B91C1C' },
            ] as const).map(st => (
              <TouchableOpacity 
                key={st.key}
                style={[styles.roleSelectOption, selectedNewEventStatus === st.key && styles.roleSelectOptionActive]}
                onPress={() => setSelectedNewEventStatus(st.key as EventStatus)}
              >
                <Ionicons 
                  name={selectedNewEventStatus === st.key ? "radio-button-on" : "radio-button-off"} 
                  size={18} 
                  color={selectedNewEventStatus === st.key ? "#0284C7" : "#94A3B8"} 
                />
                <Text style={[styles.roleSelectText, { color: st.color }]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleConfirmChangeEventStatus}>
              <Text style={styles.btnPrimaryText}>Actualizar Estado de la Junta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CANCELAR / MODERAR JUNTA */}
      <Modal visible={showCancelEventModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#B91C1C' }]}>⛔ Cancelar / Moderar Junta</Text>
              <TouchableOpacity onPress={() => setShowCancelEventModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Junta: "{selectedEvent?.title}" • {selectedEvent?.communityName}
            </Text>

            <Text style={styles.inputLabel}>Motivo obligatorio de moderación / cancelación:</Text>
            <TextInput
              placeholder="Ej: Condiciones climáticas adversas o falta de permisos municipales"
              value={cancelEventReason}
              onChangeText={setCancelEventReason}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 70 }]}
            />

            <TouchableOpacity style={styles.btnDanger} onPress={handleConfirmCancelEvent}>
              <Text style={styles.btnDangerText}>Confirmar Cancelación de Junta</Text>
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
    paddingTop: 14,
    paddingBottom: 8,
    marginBottom: 8,
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
    fontSize: 10,
    fontWeight: '900',
    color: '#B91C1C',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  reloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tabsScrollView: {
    maxHeight: 52,
    marginBottom: 12,
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tabBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  tabCountTextActive: {
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
  statusPillInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusPillFinished: {
    backgroundColor: '#F1F5F9',
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
  actionBtnResetPwd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  eventCardCancelled: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventCommTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventCommTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  eventDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  eventAttendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  eventAttendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  eventAttendeeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  actionBtnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnCancelEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  pwdResetUserInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  pwdResetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pwdResetVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pwdResetValEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F766E',
  },
  btnTeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  btnTealText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
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
  rejectReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  rejectReqBtnText: {
    color: '#DC2626',
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
  databaseToolbar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dbActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dbResetBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dbResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.2,
  },
  dbSeedBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  dbSeedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: -0.2,
  },
  crmLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 90,
    paddingHorizontal: 24,
  },
  crmSpinnerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  crmLoadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  crmLoadingSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 19,
  },
});


