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
import { getCommunities, joinCommunity, submitCommunityRequest, createOfficialCommunity } from '../services/communityService';
import { getCommunityPhotos, uploadCommunityPhoto, deleteCommunityPhoto, CommunityPhoto } from '../services/communityPhotoService';
import { awardPaws } from '../services/gamificationService';
import { useAuth } from '../context/AuthContext';

export const CommunitiesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser, currentDogs, activeProfile, isPrimaryAdminOf, isSuperAdmin } = useAuth();
  
  // Pestaña activa: Comunidades o Álbum de Fotos
  const [activeTab, setActiveTab] = useState<'communities' | 'photos'>('communities');

  const [communities, setCommunities] = useState<Community[]>([]);
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdminComm, setSelectedAdminComm] = useState<Community | null>(null);

  // Modal para subir fotos a la comunidad
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedDogName, setSelectedDogName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Campos para solicitud / creación directa de comunidad
  const [reqName, setReqName] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqInstagram, setReqInstagram] = useState('');
  const [reqComuna, setReqComuna] = useState('');
  const [reqSize, setReqSize] = useState('50');

  useEffect(() => {
    loadCommunities();
    loadPhotos();
  }, []);

  const loadCommunities = async () => {
    const data = await getCommunities();
    setCommunities(data);
  };

  const loadPhotos = async () => {
    const data = await getCommunityPhotos();
    setPhotos(data);
  };

  const handleJoin = async (community: Community) => {
    if (!currentUser || !currentUser.id) {
      alert('Debes iniciar sesión para unirte a una comunidad.');
      return;
    }
    const res = await joinCommunity(community.id, currentUser.id);
    alert(res.message);
    if (res.success) {
      await awardPaws(currentUser.id, 'community_joined', community.id);
      loadCommunities();
    }
  };

  const handleSendRequest = async () => {
    if (!reqName || !reqInstagram || !reqComuna) {
      alert('Por favor completa el nombre, Instagram y comuna.');
      return;
    }

    if (!currentUser || !currentUser.id) {
      alert('Debes iniciar sesión para realizar esta acción.');
      return;
    }

    if (isSuperAdmin) {
      const res = await createOfficialCommunity({
        name: reqName,
        description: reqDesc,
        instagramHandle: reqInstagram,
        region: 'Metropolitana',
        comuna: reqComuna,
        primaryAdminId: currentUser.id
      });
      alert(res.message);
      if (res.success) {
        setShowRequestModal(false);
        setReqName('');
        setReqDesc('');
        setReqInstagram('');
        setReqComuna('');
        loadCommunities();
      }
      return;
    }

    const res = await submitCommunityRequest({
      communityName: reqName,
      applicantId: currentUser.id,
      applicantEmail: currentUser.email,
      applicantName: currentUser.displayName,
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

  const handleUploadPhoto = async () => {
    if (!photoCaption.trim()) {
      alert('Por favor escribe un pie de foto o descripción.');
      return;
    }

    const finalUrl = photoUrl.trim() || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800';

    setUploading(true);
    const res = await uploadCommunityPhoto({
      communityId: 'general',
      communityName: 'Comunidad Oficial Juntitas',
      uploaderId: currentUser.id,
      uploaderName: currentUser.displayName,
      uploaderAvatar: currentUser.photoURL || undefined,
      dogName: selectedDogName || (currentDogs[0]?.name) || 'Mi Perrito',
      photoUrl: finalUrl,
      caption: photoCaption
    });
    setUploading(false);

    alert(res.message);
    if (res.success) {
      setShowUploadModal(false);
      setPhotoCaption('');
      setPhotoUrl('');
      loadPhotos();
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    const confirmDelete = confirm('¿Estás seguro de que deseas eliminar esta foto de la galería comunitaria?');
    if (!confirmDelete) return;

    const res = await deleteCommunityPhoto(photoId, currentUser.id);
    alert(res.message);
    if (res.success) {
      loadPhotos();
    }
  };

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.comuna.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.title}>🐾 Comunidades Caninas</Text>
          <Text style={styles.subtitle}>Encuentra el grupo ideal para tu perrito</Text>
        </View>
        <TouchableOpacity 
          style={[styles.newCommButton, isSuperAdmin && { backgroundColor: '#DC2626' }]} 
          onPress={() => setShowRequestModal(true)}
        >
          <Ionicons name={isSuperAdmin ? "shield-checkmark" : "add"} size={18} color="#FFFFFF" />
          <Text style={styles.newCommButtonText}>{isSuperAdmin ? 'Crear Oficial' : 'Solicitar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de Pestañas: Comunidades vs Álbum de Fotos */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity 
          style={[styles.subTabButton, activeTab === 'communities' && styles.subTabButtonActive]}
          onPress={() => setActiveTab('communities')}
        >
          <Ionicons name="people" size={16} color={activeTab === 'communities' ? '#0284C7' : '#64748B'} />
          <Text style={[styles.subTabText, activeTab === 'communities' && styles.subTabTextActive]}>
            Comunidades ({communities.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.subTabButton, activeTab === 'photos' && styles.subTabButtonActive]}
          onPress={() => setActiveTab('photos')}
        >
          <Ionicons name="images" size={16} color={activeTab === 'photos' ? '#0284C7' : '#64748B'} />
          <Text style={[styles.subTabText, activeTab === 'photos' && styles.subTabTextActive]}>
            Álbum & Fotos ({photos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Vista de Comunidades */}
      {activeTab === 'communities' && (
        <>
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
        </>
      )}

      {/* Vista de Álbum & Fotos Comunitarias */}
      {activeTab === 'photos' && (
        <View style={{ flex: 1 }}>
          {/* Botón para subir fotos */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <TouchableOpacity 
              style={styles.uploadPhotoBtn}
              onPress={() => setShowUploadModal(true)}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.uploadPhotoBtnText}>+ Compartir Foto de mi Perrito (+15 🐾)</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={photos}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const canModerate = isSuperAdmin || activeProfile.roleType === 'primary_admin' || activeProfile.roleType === 'secondary_admin';

              return (
                <View style={styles.photoCard}>
                  {/* Encabezado de la Foto */}
                  <View style={styles.photoCardHeader}>
                    <Image 
                      source={{ uri: item.uploaderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} 
                      style={styles.photoAuthorAvatar} 
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.photoAuthorName}>{item.uploaderName}</Text>
                      <Text style={styles.photoDogTag}>🐾 Con {item.dogName || 'su perrito'}</Text>
                    </View>

                    {/* Botón de Moderación para Administradores */}
                    {canModerate && (
                      <TouchableOpacity 
                        style={styles.modDeleteBtn}
                        onPress={() => handleDeletePhoto(item.id)}
                      >
                        <Ionicons name="trash" size={14} color="#DC2626" />
                        <Text style={styles.modDeleteText}>Moderar</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Imagen */}
                  <Image source={{ uri: item.photoUrl }} style={styles.photoImage} />

                  {/* Pie de Foto */}
                  <View style={styles.photoCardBody}>
                    <Text style={styles.photoCaption}>{item.caption}</Text>
                    <View style={styles.photoFooter}>
                      <Text style={styles.photoCommunityTag}>📍 {item.communityName || 'Comunidad Oficial'}</Text>
                      <View style={styles.photoLikesBadge}>
                        <Ionicons name="heart" size={14} color="#EF4444" />
                        <Text style={styles.photoLikesCount}>{item.likesCount}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Modal para Solicitar o Crear Comunidad */}
      <Modal visible={showRequestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isSuperAdmin ? '👑 Crear Comunidad Oficial' : 'Solicitar Comunidad Oficial'}
              </Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>
              {isSuperAdmin 
                ? 'Como Super Administrador Supremo, la comunidad quedará activa, verificada y publicada de inmediato.' 
                : 'Para evitar comunidades duplicadas y mantener la confianza de los tutores, un Super Administrador revisará los antecedentes.'}
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

            <TouchableOpacity 
              style={[styles.submitReqButton, isSuperAdmin && { backgroundColor: '#DC2626' }]} 
              onPress={handleSendRequest}
            >
              <Text style={styles.submitReqButtonText}>
                {isSuperAdmin ? '🚀 Publicar Comunidad Inmediatamente' : 'Enviar Solicitud a Verificación'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Compartir Fotos en la Galería */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 Compartir Foto en la Galería</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>
              Comparte momentos de tu perrito jugando o asistiendo a juntas oficiales. Ganarás +15 🐾 Huellitas.
            </Text>

            <Text style={styles.fieldLabel}>Perrito en la foto:</Text>
            <TextInput
              placeholder="Nombre de tu perrito (ej: Firulais)"
              value={selectedDogName}
              onChangeText={setSelectedDogName}
              style={styles.modalInput}
            />

            <Text style={styles.fieldLabel}>URL de la Foto (o deja en blanco para predeterminada):</Text>
            <TextInput
              placeholder="https://... (URL de imagen)"
              value={photoUrl}
              onChangeText={setPhotoUrl}
              autoCapitalize="none"
              style={styles.modalInput}
            />

            <Text style={styles.fieldLabel}>Pie de foto o experiencia:</Text>
            <TextInput
              placeholder="¿Qué estaban haciendo? (ej: ¡Feliz en la junta en el parque!)"
              value={photoCaption}
              onChangeText={setPhotoCaption}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 70 }]}
            />

            <TouchableOpacity 
              style={[styles.submitReqButton, uploading && { opacity: 0.6 }]} 
              onPress={handleUploadPhoto}
              disabled={uploading}
            >
              <Text style={styles.submitReqButtonText}>
                {uploading ? 'Subiendo foto...' : 'Publicar Foto (+15 🐾)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Gestión de Administradores Secundarios */}
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

            <TouchableOpacity 
              style={styles.closeAdminModalBtn}
              onPress={() => setShowAdminModal(false)}
            >
              <Text style={styles.closeAdminModalText}>Cerrar Panel de Gestión</Text>
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
    marginBottom: 12,
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
    borderRadius: 14,
    gap: 4,
  },
  newCommButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 20,
    padding: 4,
    marginBottom: 14,
  },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  subTabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  uploadPhotoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
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
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  primaryCardBorder: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  secondaryCardBorder: {
    borderColor: '#0284C7',
    borderWidth: 1.5,
  },
  commLogo: {
    width: 65,
    height: 65,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  commDetails: {
    flex: 1,
    marginLeft: 12,
  },
  commNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  adminRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  commLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  commDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
  commFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  commStats: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  manageSecAdminsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  manageSecAdminsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  photoAuthorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  photoAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoDogTag: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  modDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  modDeleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  photoImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E2E8F0',
  },
  photoCardBody: {
    padding: 12,
  },
  photoCaption: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 8,
  },
  photoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCommunityTag: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  photoLikesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoLikesCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
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
  modalIntro: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  submitReqButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  submitReqButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secAdminList: {
    marginVertical: 14,
  },
  secAdminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secAdminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  secAdminName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  secAdminEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  secAdminRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
    marginTop: 2,
  },
  closeAdminModalBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeAdminModalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
