import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Community } from '../models/Community';
import { getCommunities, joinCommunity, submitCommunityRequest } from '../services/communityService';
import { awardPaws } from '../services/gamificationService';
import { useAuth } from '../context/AuthContext';

export const CommunitiesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeProfile, isPrimaryAdminOf, isSuperAdmin } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdminComm, setSelectedAdminComm] = useState<Community | null>(null);

  const [reqName, setReqName] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqInstagram, setReqInstagram] = useState('');
  const [reqComuna, setReqComuna] = useState('');
  const [reqSize, setReqSize] = useState('50');

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    const data = await getCommunities();
    setCommunities(data);
  };

  const handleJoin = async (community: Community) => {
    const res = await joinCommunity(community.id, activeProfile.user.id);
    alert(res.message);
    if (res.success) {
      await awardPaws(activeProfile.user.id, 'community_joined', community.id);
      loadCommunities();
    }
  };

  const handleSendRequest = async () => {
    if (!reqName || !reqInstagram || !reqComuna) {
      alert('Por favor completa el nombre, Instagram y comuna.');
      return;
    }

    const res = await submitCommunityRequest({
      communityName: reqName,
      applicantId: mockCurrentUser.id,
      applicantEmail: mockCurrentUser.email,
      applicantName: mockCurrentUser.displayName,
      description: reqDesc,
      instagramHandle: reqInstagram,
      verificationEvidenceUrls: [],
      region: 'Metropolitana',
      comuna: reqComuna,
      approximateSize: parseInt(reqSize, 10) || 50
    });

    if (res.success) {
      alert('¡Solicitud enviada a revisión oficial! Un Super Administrador revisará los antecedentes según el Plan Maestro.');
      setShowRequestModal(false);
      setReqName('');
      setReqDesc('');
      setReqInstagram('');
      setReqComuna('');
    } else {
      alert(res.message);
    }
  };

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.comuna.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🐾 Comunidades Caninas</Text>
          <Text style={styles.subtitle}>Encuentra el grupo ideal para tu perrito</Text>
        </View>
        <TouchableOpacity 
          style={styles.newCommButton} 
          onPress={() => setShowRequestModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.newCommButtonText}>Solicitar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#94A3B8" />
        <TextInput
          placeholder="Buscar por nombre o comuna..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredCommunities}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isPrimary = activeProfile.roleType === 'primary_admin' && activeProfile.communityIdManaged === item.id;
          const isSecondary = activeProfile.roleType === 'secondary_admin' && activeProfile.communityIdManaged === item.id;

          return (
            <View style={[styles.communityCard, isPrimary && styles.primaryCardBorder, isSecondary && styles.secondaryCardBorder]}>
              <Image source={{ uri: item.logoUrl }} style={styles.commLogo} />
              <View style={styles.commDetails}>
                <View style={styles.commNameRow}>
                  <Text style={styles.commName}>{item.name}</Text>
                  {item.isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color="#0284C7" style={{ marginLeft: 4 }} />
                  )}
                </View>

                {/* Badge visible de rol en la comunidad */}
                {isPrimary && (
                  <View style={styles.adminRoleBadge}>
                    <Ionicons name="ribbon" size={13} color="#B45309" />
                    <Text style={styles.adminRoleBadgeText}>Eres Administrador Principal (Titular)</Text>
                  </View>
                )}
                {isSecondary && (
                  <View style={[styles.adminRoleBadge, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="shield-half" size={13} color="#0284C7" />
                    <Text style={[styles.adminRoleBadgeText, { color: '#0369A1' }]}>Eres Administrador Secundario (Delegado)</Text>
                  </View>
                )}

                <Text style={styles.commLocation}>📍 {item.comuna}, {item.region}</Text>
                <Text style={styles.commDesc} numberOfLines={2}>{item.description}</Text>

                <View style={styles.commFooter}>
                  <Text style={styles.commStats}>
                    👥 {item.membersCount} miembros • 📅 {item.eventsCount} juntas
                  </Text>
                  <TouchableOpacity 
                    style={styles.joinButton} 
                    onPress={() => handleJoin(item)}
                  >
                    <Text style={styles.joinButtonText}>Unirme (+10 🐾)</Text>
                  </TouchableOpacity>
                </View>

                {/* Botón de Gestión exclusivo para Admin Principal */}
                {isPrimary && (
                  <TouchableOpacity 
                    style={styles.manageSecAdminsButton}
                    onPress={() => {
                      setSelectedAdminComm(item);
                      setShowAdminModal(true);
                    }}
                  >
                    <Ionicons name="people-circle" size={16} color="#B45309" />
                    <Text style={styles.manageSecAdminsText}>Gestionar Administradores Secundarios</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showRequestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solicitar Comunidad Oficial</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>
              Para evitar comunidades duplicadas y mantener la confianza de los tutores, un Super Administrador revisará los antecedentes.
            </Text>

            <TextInput
              placeholder="Nombre de la comunidad (ej: Beagles Santiago)"
              value={reqName}
              onChangeText={setReqName}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Instagram oficial (ej: @beaglessantiago)"
              value={reqInstagram}
              onChangeText={setReqInstagram}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Comuna o sector principal"
              value={reqComuna}
              onChangeText={setReqComuna}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Descripción y propósito"
              value={reqDesc}
              onChangeText={setReqDesc}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 70 }]}
            />

            <TouchableOpacity style={styles.submitReqButton} onPress={handleSendRequest}>
              <Text style={styles.submitReqButtonText}>Enviar Solicitud a Verificación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Gestión de Administradores Secundarios (Secciones 8 y 9 Plan Maestro) */}
      <Modal visible={showAdminModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👑 Gestión de Administradores</Text>
              <TouchableOpacity onPress={() => setShowAdminModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>
              {selectedAdminComm?.name}: Como Administrador Principal, tú tienes la titularidad exclusiva y delegas funciones a tus coordinadores.
            </Text>

            <View style={styles.secAdminList}>
              <View style={styles.secAdminItem}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200' }} 
                  style={styles.secAdminAvatar} 
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.secAdminName}>Andrea Soto</Text>
                  <Text style={styles.secAdminEmail}>andrea.soto@goldenretrieverschile.cl</Text>
                  <Text style={styles.secAdminRole}>Administrador Secundario (Delegada)</Text>
                </View>
              </View>
            </View>

            <View style={styles.permissionsBox}>
              <Text style={styles.permissionsTitle}>Permisos Otorgados a Andrea:</Text>
              <Text style={styles.permItem}>✅ Crear y publicar eventos/juntas oficiales</Text>
              <Text style={styles.permItem}>✅ Moderar publicaciones y comentarios</Text>
              <Text style={styles.permItem}>✅ Gestionar postulaciones de stands comerciales</Text>
            </View>

            {/* Regla Crítica del Plan Maestro */}
            <View style={styles.ruleNotice}>
              <Ionicons name="shield-checkmark" size={20} color="#D97706" />
              <Text style={styles.ruleNoticeText}>
                <Text style={{ fontWeight: 'bold' }}>Regla del Plan Maestro (Sección 8):</Text> Ningún Administrador Secundario puede removerte ni quitarte el control de la comunidad.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.transferButton} 
              onPress={() => {
                alert('Flujo de Transferencia de Titularidad iniciado. Se enviará un código de confirmación a tu correo.');
                setShowAdminModal(false);
              }}
            >
              <Text style={styles.transferButtonText}>Transferir Titularidad de Comunidad</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  newCommButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  newCommButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  communityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  commLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  commDetails: {
    flex: 1,
    marginLeft: 14,
  },
  commNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  commLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  commDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  commFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  commStats: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  joinButtonText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalIntro: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  submitReqButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitReqButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  primaryCardBorder: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  secondaryCardBorder: {
    borderColor: '#38BDF8',
    borderWidth: 2,
  },
  adminRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  adminRoleBadgeText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
  manageSecAdminsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  manageSecAdminsText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  secAdminList: {
    marginBottom: 14,
  },
  secAdminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secAdminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  secAdminName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  secAdminEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  secAdminRole: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },
  permissionsBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 6,
  },
  permItem: {
    fontSize: 12,
    color: '#15803D',
    marginBottom: 4,
  },
  ruleNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
    gap: 8,
  },
  ruleNoticeText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  transferButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  transferButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
