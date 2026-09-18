import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ScrollView,
  Image, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Community, SecondaryAdminInfo, SecondaryAdminPermissions } from '../models/Community';
import { 
  getCommunities, 
  joinCommunity, 
  submitCommunityRequest, 
  createOfficialCommunity,
  getSecondaryAdminsForCommunity,
  updateSecondaryAdminPermissions,
  removeSecondaryAdmin,
  addSecondaryAdmin,
  DEFAULT_SECONDARY_PERMISSIONS
} from '../services/communityService';
import { 
  getCommunityPhotos, 
  uploadCommunityPhoto, 
  deleteCommunityPhoto, 
  toggleLikeCommunityPhoto,
  CommunityPhoto 
} from '../services/communityPhotoService';
import { Dog } from '../models/Dog';
import { getAllDogsFromDb, DEFAULT_DOG_PHOTOS } from '../services/dogService';
import { getEvents } from '../services/eventService';
import { DogEvent } from '../models/Event';
import { awardPaws } from '../services/gamificationService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getChileRegions, getComunasForRegion, ChileRegion, MASTER_CHILE_REGIONS } from '../services/locationService';
import { takePhoto, pickFromGallery } from '../services/imagePickerService';

export const CommunitiesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentUser, currentDogs, activeProfile, isPrimaryAdminOf, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  
  // Pestaña activa: Comunidades o Álbum de Fotos
  const [activeTab, setActiveTab] = useState<'communities' | 'photos'>('communities');

  const [communities, setCommunities] = useState<Community[]>([]);
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdminComm, setSelectedAdminComm] = useState<Community | null>(null);

  // Gestión de Administradores Secundarios (Coordinadores Delegados)
  const [secAdminsList, setSecAdminsList] = useState<SecondaryAdminInfo[]>([]);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<SecondaryAdminPermissions>(DEFAULT_SECONDARY_PERMISSIONS);
  const [showAddSecAdminForm, setShowAddSecAdminForm] = useState(false);
  const [newSecAdminName, setNewSecAdminName] = useState('');
  const [newSecAdminEmail, setNewSecAdminEmail] = useState('');

  // Estados de Ubicación (Región y Comuna de Chile)
  const [regionsList, setRegionsList] = useState<ChileRegion[]>(MASTER_CHILE_REGIONS);
  const [selectedRegionId, setSelectedRegionId] = useState('metropolitana');
  const [selectedRegionName, setSelectedRegionName] = useState('Región Metropolitana de Santiago');
  const [showRegionPickerModal, setShowRegionPickerModal] = useState(false);
  const [showComunaPickerModal, setShowComunaPickerModal] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const [comunaSearch, setComunaSearch] = useState('');

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
  const [reqComuna, setReqComuna] = useState('Las Condes');
  const [reqSize, setReqSize] = useState('50');

  // Modal de Detalle de Comunidad (Perritos Asistentes y Fotos)
  const [selectedCommunityDetail, setSelectedCommunityDetail] = useState<Community | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [communityDetailTab, setCommunityDetailTab] = useState<'dogs' | 'photos' | 'events'>('dogs');
  const [allGlobalDogs, setAllGlobalDogs] = useState<Dog[]>([]);
  const [communityEvents, setCommunityEvents] = useState<DogEvent[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCommunities();
    loadPhotos();
    getChileRegions().then(list => {
      if (list && list.length > 0) setRegionsList(list);
    }).catch(err => console.warn('Error cargando regiones:', err));
  }, []);

  const loadCommunities = async () => {
    const data = await getCommunities();
    setCommunities(data);
  };

  const loadPhotos = async () => {
    const data = await getCommunityPhotos();
    setPhotos(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCommunities(), loadPhotos()]);
    setRefreshing(false);
  };

  const handleSelectRegion = (reg: ChileRegion) => {
    setSelectedRegionId(reg.id);
    setSelectedRegionName(reg.name);
    // Seleccionar automáticamente la primera comuna de la región
    const comunas = getComunasForRegion(reg.id);
    setReqComuna(comunas[0] || '');
    setShowRegionPickerModal(false);
    setRegionSearch('');
  };

  const handleSelectComuna = (c: string) => {
    setReqComuna(c);
    setShowComunaPickerModal(false);
    setComunaSearch('');
  };

  const availableComunas = getComunasForRegion(selectedRegionId);
  const filteredRegions = regionsList.filter(r => 
    r.name.toLowerCase().includes(regionSearch.toLowerCase()) || 
    r.roman.toLowerCase().includes(regionSearch.toLowerCase())
  );
  const filteredComunas = availableComunas.filter(c => 
    c.toLowerCase().includes(comunaSearch.toLowerCase())
  );

  // Handlers para tomar y seleccionar foto en comunidad
  const handleTakeCommunityPhoto = async () => {
    const res = await takePhoto();
    if (res.success && res.uri) {
      setPhotoUrl(res.uri);
      showToast('¡Foto capturada con éxito!', 'success');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  };

  const handlePickCommunityPhotoGallery = async () => {
    const res = await pickFromGallery();
    if (res.success && res.uri) {
      setPhotoUrl(res.uri);
      showToast('¡Imagen seleccionada de tu galería!', 'success');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  };

  const handleJoin = async (community: Community) => {
    if (!currentUser || !currentUser.id) {
      showToast('Debes iniciar sesión para unirte a una comunidad.', 'warning');
      return;
    }
    const isAlreadyMember = (community.members && community.members.includes(currentUser.id)) || community.primaryAdminId === currentUser.id;
    if (isAlreadyMember) {
      showToast(`¡Ya eres miembro de la comunidad ${community.name}!`, 'info');
      return;
    }
    const res = await joinCommunity(community.id, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      await awardPaws(currentUser.id, 'community_joined', community.id);
      loadCommunities();
    }
  };

  const handleSendRequest = async () => {
    if (!reqName.trim() || !reqDesc.trim() || !reqInstagram.trim()) {
      showToast('Por favor completa todos los campos obligatorios para solicitar la comunidad.', 'warning');
      return;
    }

    if (!currentUser || !currentUser.id) {
      showToast('Debes iniciar sesión para realizar esta acción.', 'warning');
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
      region: selectedRegionName,
      comuna: reqComuna,
      approximateSize: parseInt(reqSize, 10) || 50
    });

    if (res.success) {
      showToast(
        '¡Solicitud enviada con éxito! Será validada pronto para que tu comunidad esté disponible para todos 🐾',
        'success',
        'Comunidad en Validación'
      );
      setShowRequestModal(false);
      setReqName('');
      setReqDesc('');
      setReqInstagram('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleOpenAdminModal = (comm: Community) => {
    setSelectedAdminComm(comm);
    const list = getSecondaryAdminsForCommunity(comm);
    setSecAdminsList(list);
    setEditingAdminId(null);
    setShowAddSecAdminForm(false);
    setShowAdminModal(true);
  };

  const handleTogglePermission = (permKey: keyof SecondaryAdminPermissions) => {
    setEditingPermissions(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const handleStartEditingPermissions = (admin: SecondaryAdminInfo) => {
    if (editingAdminId === admin.userId) {
      setEditingAdminId(null);
    } else {
      setEditingAdminId(admin.userId);
      setEditingPermissions({ ...admin.permissions });
    }
  };

  const handleSavePermissions = async (adminUserId: string) => {
    if (!selectedAdminComm) return;
    const res = await updateSecondaryAdminPermissions(
      selectedAdminComm.id,
      adminUserId,
      editingPermissions,
      currentUser.id
    );
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success && res.updatedAdmins) {
      setSecAdminsList(res.updatedAdmins);
      setEditingAdminId(null);
      loadCommunities();
    }
  };

  const handleRemoveSecondaryAdmin = async (admin: SecondaryAdminInfo) => {
    if (!selectedAdminComm) return;
    const confirmRevoke = confirm(`¿Estás seguro de que deseas revocar las atribuciones de Administrador Secundario a ${admin.name}?`);
    if (!confirmRevoke) return;

    const res = await removeSecondaryAdmin(
      selectedAdminComm.id,
      admin.userId,
      currentUser.id
    );
    showToast(res.message, res.success ? 'success' : 'info');
    if (res.success && res.updatedAdmins) {
      setSecAdminsList(res.updatedAdmins);
      if (editingAdminId === admin.userId) setEditingAdminId(null);
      loadCommunities();
    }
  };

  const handleAddSecondaryAdmin = async () => {
    if (!selectedAdminComm) return;
    if (!newSecAdminName.trim() || !newSecAdminEmail.trim()) {
      showToast('Por favor completa el nombre y correo del nuevo coordinador.', 'warning');
      return;
    }

    const res = await addSecondaryAdmin(
      selectedAdminComm.id,
      {
        name: newSecAdminName.trim(),
        email: newSecAdminEmail.trim(),
        permissions: DEFAULT_SECONDARY_PERMISSIONS
      },
      currentUser.id
    );

    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success && res.updatedAdmins) {
      setSecAdminsList(res.updatedAdmins);
      setNewSecAdminName('');
      setNewSecAdminEmail('');
      setShowAddSecAdminForm(false);
      loadCommunities();
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoCaption.trim()) {
      showToast('Por favor escribe un pie de foto o descripción.', 'warning');
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

    showToast(res.message, res.success ? 'success' : 'error');
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
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      loadPhotos();
    }
  };

  const handleToggleLike = async (photoId: string) => {
    const res = await toggleLikeCommunityPhoto(photoId, currentUser.id);
    if (res.success) {
      setPhotos(prev => prev.map(p => {
        if (p.id === photoId) {
          const likedBy = p.likedBy || [];
          const newLikedBy = res.liked 
            ? [...likedBy, currentUser.id] 
            : likedBy.filter(id => id !== currentUser.id);
          return {
            ...p,
            likesCount: res.newLikesCount,
            likedBy: newLikedBy
          };
        }
        return p;
      }));
      showToast(res.message, res.liked ? 'success' : 'info');
    }
  };

  const handleOpenCommunityDetail = async (comm: Community) => {
    setSelectedCommunityDetail(comm);
    setCommunityDetailTab('dogs');
    setShowDetailModal(true);
    try {
      const [dogs, evList] = await Promise.all([
        getAllDogsFromDb(),
        getEvents(comm.id)
      ]);
      setAllGlobalDogs(dogs);
      setCommunityEvents(evList);
    } catch (e) {
      console.warn('Error cargando detalles de comunidad:', e);
    }
  };

  const handleOpenUploadModal = (comm?: Community) => {
    if (comm) {
      setSelectedCommunityDetail(comm);
    }
    if (currentDogs && currentDogs.length > 0 && !selectedDogName) {
      setSelectedDogName(currentDogs[0].name);
    }
    setShowUploadModal(true);
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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0284C7']} tintColor="#0284C7" />
            }
            renderItem={({ item }) => {
              const isPrimary = (activeProfile.roleType === 'primary_admin' && activeProfile.communityIdManaged === item.id) || item.primaryAdminId === currentUser.id;
              const isSecondary = activeProfile.roleType === 'secondary_admin' && activeProfile.communityIdManaged === item.id;
              const isMember = isPrimary || isSecondary || (item.members && item.members.includes(currentUser.id));

              return (
                <TouchableOpacity 
                  style={[styles.communityCard, isPrimary && styles.primaryCardBorder, isSecondary && styles.secondaryCardBorder]}
                  onPress={() => handleOpenCommunityDetail(item)}
                  activeOpacity={0.88}
                >
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
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <TouchableOpacity 
                          style={styles.exploreBtn} 
                          onPress={() => handleOpenCommunityDetail(item)}
                        >
                          <Ionicons name="eye" size={13} color="#0284C7" />
                          <Text style={styles.exploreBtnText}>Ver</Text>
                        </TouchableOpacity>
                        {isMember ? (
                          <View style={styles.joinedBadge}>
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                            <Text style={styles.joinedBadgeText}>Miembro</Text>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={styles.joinButton} 
                            onPress={() => handleJoin(item)}
                          >
                            <Text style={styles.joinButtonText}>Unirme (+10 🐾)</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {isPrimary && (
                      <TouchableOpacity 
                        style={styles.manageSecAdminsButton}
                        onPress={() => handleOpenAdminModal(item)}
                      >
                        <Ionicons name="people-circle" size={16} color="#B45309" />
                        <Text style={styles.manageSecAdminsText}>Gestionar Administradores Secundarios</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0284C7']} tintColor="#0284C7" />
            }
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
                      <TouchableOpacity 
                        style={[
                          styles.photoLikesBadge,
                          item.likedBy?.includes(currentUser.id) && styles.photoLikesBadgeActive
                        ]}
                        onPress={() => handleToggleLike(item.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={item.likedBy?.includes(currentUser.id) ? "heart" : "heart-outline"} 
                          size={15} 
                          color="#EF4444" 
                        />
                        <Text style={[
                          styles.photoLikesCount,
                          item.likedBy?.includes(currentUser.id) && styles.photoLikesCountActive
                        ]}>
                          {item.likesCount}
                        </Text>
                      </TouchableOpacity>
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
              <Text style={styles.modalTitle}>🐶 Solicitar Fundación de Comunidad</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>
              Toda comunidad oficial debe ser revisada y aprobada por el Super Administrador en el Panel de Control (CRM) antes de ser visible y publicada en la app.
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

            <Text style={styles.inputSectionLabel}>Región Oficial:</Text>
            <TouchableOpacity 
              style={styles.locationSelectorBtn}
              onPress={() => setShowRegionPickerModal(true)}
            >
              <Ionicons name="map" size={18} color="#0284C7" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationSelectorTextSelected} numberOfLines={1}>
                  {selectedRegionName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <Text style={styles.inputSectionLabel}>Comuna de la Región:</Text>
            <TouchableOpacity 
              style={styles.locationSelectorBtn}
              onPress={() => setShowComunaPickerModal(true)}
            >
              <Ionicons name="location" size={18} color="#0284C7" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={reqComuna ? styles.locationSelectorTextSelected : styles.locationSelectorTextPlaceholder} numberOfLines={1}>
                  {reqComuna ? reqComuna : 'Seleccionar comuna...'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TextInput
              placeholder="Descripción y propósito"
              value={reqDesc}
              onChangeText={setReqDesc}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 70, marginTop: 8 }]}
            />

            <TouchableOpacity 
              style={styles.submitReqButton} 
              onPress={handleSendRequest}
            >
              <Text style={styles.submitReqButtonText}>
                Enviar para Validación
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
              Comparte fotos de tu perrito en juntas o paseos comunitarios. Ganarás +15 🐾 Huellitas.
            </Text>

            <Text style={styles.fieldLabel}>Perrito en la foto:</Text>
            {currentDogs && currentDogs.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {currentDogs.map(d => {
                    const isSelected = selectedDogName === d.name;
                    return (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.dogSelectCard, isSelected && styles.dogSelectCardActive]}
                        onPress={() => setSelectedDogName(d.name)}
                        activeOpacity={0.8}
                      >
                        <Image 
                          source={{ uri: d.photoUrls?.[0] || DEFAULT_DOG_PHOTOS[0] }} 
                          style={styles.dogSelectAvatar} 
                        />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={[styles.dogSelectName, isSelected && styles.dogSelectNameActive]}>
                            {d.name}
                          </Text>
                          <Text style={styles.dogSelectBreed}>{d.breed}</Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#0284C7" style={{ marginLeft: 6 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <TextInput
                placeholder="Nombre de tu perrito (ej: Firulais)"
                value={selectedDogName}
                onChangeText={setSelectedDogName}
                style={styles.modalInput}
              />
            )}

            <Text style={styles.fieldLabel}>Foto:</Text>
            <View style={styles.photoActionRow}>
              <TouchableOpacity style={styles.photoActionButton} onPress={handleTakeCommunityPhoto}>
                <Ionicons name="camera" size={18} color="#0284C7" />
                <Text style={styles.photoActionText}>Tomar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionButton} onPress={handlePickCommunityPhotoGallery}>
                <Ionicons name="images" size={18} color="#0284C7" />
                <Text style={styles.photoActionText}>De Galería</Text>
              </TouchableOpacity>
            </View>

            {photoUrl ? (
              <View style={styles.previewImageCard}>
                <Image source={{ uri: photoUrl }} style={styles.previewImageThumb} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.previewSuccessText}>✓ Foto lista para compartir</Text>
                  <TouchableOpacity onPress={() => setPhotoUrl('')} style={{ marginTop: 2 }}>
                    <Text style={styles.removePhotoText}>Cambiar foto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Pie de foto o experiencia:</Text>
            <TextInput
              placeholder="¿Qué estaban haciendo? (ej: ¡Paseo increíble en el parque!)"
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

      {/* Modal Detalle de la Comunidad (Perritos Asistentes, Fotos y Juntas) */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%', paddingBottom: 20 }]}>
            {selectedCommunityDetail && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                    <Image source={{ uri: selectedCommunityDetail.logoUrl }} style={styles.detailCommLogo} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.detailCommTitle} numberOfLines={1}>
                          {selectedCommunityDetail.name}
                        </Text>
                        {selectedCommunityDetail.isVerified && (
                          <Ionicons name="checkmark-circle" size={16} color="#0284C7" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <Text style={styles.detailCommLocation}>
                        📍 {selectedCommunityDetail.comuna}, {selectedCommunityDetail.region}
                      </Text>
                      {(() => {
                        const isPrimary = (activeProfile.roleType === 'primary_admin' && activeProfile.communityIdManaged === selectedCommunityDetail.id) || selectedCommunityDetail.primaryAdminId === currentUser.id;
                        const isSecondary = activeProfile.roleType === 'secondary_admin' && activeProfile.communityIdManaged === selectedCommunityDetail.id;
                        const isMember = isPrimary || isSecondary || (selectedCommunityDetail.members && selectedCommunityDetail.members.includes(currentUser.id));

                        if (isMember) {
                          return (
                            <View style={styles.detailMemberBadge}>
                              <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                              <Text style={styles.detailMemberBadgeText}>Eres miembro</Text>
                            </View>
                          );
                        }
                        return (
                          <TouchableOpacity 
                            style={styles.detailJoinBtn}
                            onPress={() => handleJoin(selectedCommunityDetail)}
                          >
                            <Ionicons name="add-circle" size={13} color="#FFFFFF" />
                            <Text style={styles.detailJoinBtnText}>Unirme (+10 🐾)</Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Subtabs del Detalle */}
                <View style={styles.detailTabsRow}>
                  <TouchableOpacity 
                    style={[styles.detailTabBtn, communityDetailTab === 'dogs' && styles.detailTabBtnActive]}
                    onPress={() => setCommunityDetailTab('dogs')}
                  >
                    <Ionicons name="paw" size={15} color={communityDetailTab === 'dogs' ? '#0284C7' : '#64748B'} />
                    <Text style={[styles.detailTabBtnText, communityDetailTab === 'dogs' && styles.detailTabBtnTextActive]}>
                      Perritos
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.detailTabBtn, communityDetailTab === 'photos' && styles.detailTabBtnActive]}
                    onPress={() => setCommunityDetailTab('photos')}
                  >
                    <Ionicons name="images" size={15} color={communityDetailTab === 'photos' ? '#0284C7' : '#64748B'} />
                    <Text style={[styles.detailTabBtnText, communityDetailTab === 'photos' && styles.detailTabBtnTextActive]}>
                      Fotos ({photos.filter(p => p.communityId === selectedCommunityDetail.id || p.communityName?.toLowerCase().includes(selectedCommunityDetail.name.toLowerCase())).length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.detailTabBtn, communityDetailTab === 'events' && styles.detailTabBtnActive]}
                    onPress={() => setCommunityDetailTab('events')}
                  >
                    <Ionicons name="calendar" size={15} color={communityDetailTab === 'events' ? '#0284C7' : '#64748B'} />
                    <Text style={[styles.detailTabBtnText, communityDetailTab === 'events' && styles.detailTabBtnTextActive]}>
                      Juntas ({communityEvents.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Contenido Pestaña 1: Perritos Asistentes y de la Comunidad */}
                {communityDetailTab === 'dogs' && (
                  <ScrollView style={styles.detailContentScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.detailSectionSub}>
                      Perritos que participan y asisten a las juntas de esta comunidad:
                    </Text>

                    {(() => {
                      const commLower = selectedCommunityDetail.name.toLowerCase();
                      const breedMatches = allGlobalDogs.filter(d => 
                        commLower.includes(d.breed.toLowerCase()) || 
                        d.breed.toLowerCase().includes(commLower.split(' ')[0]) ||
                        commLower.includes('chile') ||
                        commLower.includes('providencia') ||
                        commLower.includes('condes')
                      );
                      
                      const dogsToShow = breedMatches.length > 0 ? breedMatches : (
                        allGlobalDogs.length > 0 ? allGlobalDogs.slice(0, 5) : [
                          {
                            id: 'dog-comm-1',
                            ownerId: 'user-1',
                            name: 'Firulais',
                            breed: selectedCommunityDetail.name.includes('Golden') ? 'Golden Retriever' : 'Mestizo',
                            size: 'grande',
                            gender: 'macho',
                            photoUrls: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=300'],
                            passport: { attendedEventsCount: 4, honorTitle: 'Líder de Manada' }
                          },
                          {
                            id: 'dog-comm-2',
                            ownerId: 'user-2',
                            name: 'Thor',
                            breed: selectedCommunityDetail.name.includes('Golden') ? 'Golden Retriever' : 'Pastor Alemán',
                            size: 'grande',
                            gender: 'macho',
                            photoUrls: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300'],
                            passport: { attendedEventsCount: 2, honorTitle: 'Perrito Aventurero' }
                          },
                          {
                            id: 'dog-comm-3',
                            ownerId: 'user-3',
                            name: 'Luna',
                            breed: selectedCommunityDetail.name.includes('Golden') ? 'Golden Retriever' : 'Pug',
                            size: 'mediano',
                            gender: 'hembra',
                            photoUrls: ['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=300'],
                            passport: { attendedEventsCount: 3, honorTitle: 'Socializador Estrella' }
                          }
                        ]
                      );

                      return dogsToShow.map((d: any) => {
                        const isMyDog = currentDogs.some(cd => cd.name.toLowerCase() === d.name.toLowerCase());
                        return (
                          <View key={d.id} style={styles.communityDogCard}>
                            <Image 
                              source={{ uri: d.photoUrls?.[0] || DEFAULT_DOG_PHOTOS[0] }} 
                              style={styles.communityDogAvatar} 
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.communityDogName}>{d.name}</Text>
                                {isMyDog && (
                                  <View style={styles.myDogBadge}>
                                    <Text style={styles.myDogBadgeText}>Tu Perrito</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.communityDogBreed}>
                                {d.breed} • {d.gender || 'macho'}
                              </Text>
                              <View style={styles.communityDogStatsRow}>
                                <View style={styles.miniPawBadge}>
                                  <Ionicons name="paw" size={12} color="#D97706" />
                                  <Text style={styles.miniPawText}>
                                    {d.passport?.attendedEventsCount || 1} juntas asistidas
                                  </Text>
                                </View>
                                {d.passport?.honorTitle && (
                                  <Text style={styles.communityDogTitleText}>
                                    🏅 {d.passport.honorTitle}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </ScrollView>
                )}

                {/* Contenido Pestaña 2: Fotos Comunitarias */}
                {communityDetailTab === 'photos' && (
                  <ScrollView style={styles.detailContentScroll} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity 
                      style={[styles.uploadPhotoBtn, { marginVertical: 8 }]}
                      onPress={() => {
                        handleOpenUploadModal(selectedCommunityDetail);
                      }}
                    >
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                      <Text style={styles.uploadPhotoBtnText}>+ Compartir Foto en esta Comunidad (+15 🐾)</Text>
                    </TouchableOpacity>

                    {(() => {
                      const commPhotos = photos.filter(p => 
                        p.communityId === selectedCommunityDetail.id || 
                        p.communityName?.toLowerCase().includes(selectedCommunityDetail.name.toLowerCase())
                      );

                      if (commPhotos.length === 0) {
                        return (
                          <View style={styles.emptyCard}>
                            <Ionicons name="images-outline" size={36} color="#94A3B8" />
                            <Text style={styles.emptyText}>Aún no hay fotos en esta comunidad.</Text>
                            <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
                              ¡Toca el botón arriba para ser el primero en compartir un momento!
                            </Text>
                          </View>
                        );
                      }

                      return commPhotos.map(item => {
                        const isLiked = item.likedBy?.includes(currentUser.id);
                        return (
                          <View key={item.id} style={styles.photoCard}>
                            <View style={styles.photoCardHeader}>
                              <Image 
                                source={{ uri: item.uploaderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} 
                                style={styles.photoAuthorAvatar} 
                              />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.photoAuthorName}>{item.uploaderName}</Text>
                                <Text style={styles.photoDogTag}>🐾 Con {item.dogName || 'su perrito'}</Text>
                              </View>
                            </View>
                            <Image source={{ uri: item.photoUrl }} style={styles.photoImage} />
                            <View style={styles.photoCardBody}>
                              <Text style={styles.photoCaption}>{item.caption}</Text>
                              <View style={styles.photoFooter}>
                                <Text style={styles.photoCommunityTag}>📍 {item.communityName}</Text>
                                <TouchableOpacity 
                                  style={[styles.photoLikesBadge, isLiked && styles.photoLikesBadgeActive]}
                                  onPress={() => handleToggleLike(item.id)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons 
                                    name={isLiked ? "heart" : "heart-outline"} 
                                    size={15} 
                                    color="#EF4444" 
                                  />
                                  <Text style={[styles.photoLikesCount, isLiked && styles.photoLikesCountActive]}>
                                    {item.likesCount}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </ScrollView>
                )}

                {/* Contenido Pestaña 3: Juntas de la Comunidad */}
                {communityDetailTab === 'events' && (
                  <ScrollView style={styles.detailContentScroll} showsVerticalScrollIndicator={false}>
                    {communityEvents.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="calendar-outline" size={36} color="#94A3B8" />
                        <Text style={styles.emptyText}>No hay juntas programadas actualmente para esta comunidad.</Text>
                      </View>
                    ) : (
                      communityEvents.map(ev => (
                        <View key={ev.id} style={styles.commEventCard}>
                          <Text style={styles.commEventTitle}>{ev.title}</Text>
                          <Text style={styles.commEventMeta}>📍 {ev.location.placeName}, {ev.location.comuna}</Text>
                          <Text style={styles.commEventMeta}>👥 {ev.tutorsCount} tutores • 🐾 {ev.dogsCount} perritos</Text>
                          <Text style={styles.commEventDesc}>{ev.description}</Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Buscador de Regiones de Chile */}
      <Modal visible={showRegionPickerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>🇨🇱 Selecciona Región</Text>
                <Text style={styles.modalIntro}>16 Regiones oficiales de Chile en BD</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRegionPickerModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBar}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                placeholder="Buscar región (ej: Metropolitana, Valparaíso)..."
                value={regionSearch}
                onChangeText={setRegionSearch}
                style={styles.pickerSearchInput}
                autoFocus
              />
              {regionSearch.length > 0 && (
                <TouchableOpacity onPress={() => setRegionSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredRegions}
              keyExtractor={(item) => item.id}
              style={styles.pickerScroll}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItemRow,
                    selectedRegionId === item.id && styles.pickerItemRowActive
                  ]}
                  onPress={() => handleSelectRegion(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemTitle}>{item.name}</Text>
                    <Text style={styles.pickerItemSub}>{item.comunas.length} comunas oficiales</Text>
                  </View>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillBadgeText}>{item.roman}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Buscador de Comunas de Chile */}
      <Modal visible={showComunaPickerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>📍 Comunas de {selectedRegionName}</Text>
                <Text style={styles.modalIntro}>Elige la comuna correspondiente</Text>
              </View>
              <TouchableOpacity onPress={() => setShowComunaPickerModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBar}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                placeholder="Buscar comuna (ej: Las Condes, Santiago)..."
                value={comunaSearch}
                onChangeText={setComunaSearch}
                style={styles.pickerSearchInput}
                autoFocus
              />
              {comunaSearch.length > 0 && (
                <TouchableOpacity onPress={() => setComunaSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredComunas}
              keyExtractor={(item) => item}
              style={styles.pickerScroll}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItemRow,
                    reqComuna === item && styles.pickerItemRowActive
                  ]}
                  onPress={() => handleSelectComuna(item)}
                >
                  <Ionicons 
                    name={reqComuna === item ? "radio-button-on" : "radio-button-off"} 
                    size={18} 
                    color={reqComuna === item ? "#0284C7" : "#94A3B8"} 
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.pickerItemTitle}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de Gestión de Administradores Secundarios */}
      <Modal visible={showAdminModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>👑 Gestión de Administradores</Text>
                <Text style={[styles.modalIntro, { marginBottom: 0 }]}>
                  {selectedAdminComm?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAdminModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>
              Como Administrador Principal, tú tienes la titularidad exclusiva y delegas permisos a tus coordinadores para ayudarte a gestionar la comunidad.
            </Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.secAdminList}>
                {secAdminsList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="people-outline" size={32} color="#94A3B8" />
                    <Text style={styles.emptyText}>No hay administradores secundarios asignados aún.</Text>
                  </View>
                ) : (
                  secAdminsList.map(admin => {
                    const isEditing = editingAdminId === admin.userId;
                    return (
                      <View key={admin.userId} style={styles.secAdminCardContainer}>
                        <View style={styles.secAdminItem}>
                          <Image 
                            source={{ uri: admin.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200' }} 
                            style={styles.secAdminAvatar} 
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.secAdminName}>{admin.name}</Text>
                            <Text style={styles.secAdminEmail}>{admin.email}</Text>
                            <Text style={styles.secAdminRole}>Administrador Secundario (Delegado)</Text>
                          </View>
                        </View>

                        {/* Chips de Permisos Actuales */}
                        <View style={styles.permChipsRow}>
                          <View style={[styles.permChip, admin.permissions.canCreateEvents && styles.permChipActive]}>
                            <Ionicons name="calendar" size={11} color={admin.permissions.canCreateEvents ? '#0284C7' : '#94A3B8'} />
                            <Text style={[styles.permChipText, admin.permissions.canCreateEvents && styles.permChipTextActive]}>Crear Juntas</Text>
                          </View>
                          <View style={[styles.permChip, admin.permissions.canModeratePosts && styles.permChipActive]}>
                            <Ionicons name="shield" size={11} color={admin.permissions.canModeratePosts ? '#0284C7' : '#94A3B8'} />
                            <Text style={[styles.permChipText, admin.permissions.canModeratePosts && styles.permChipTextActive]}>Moderar Fotos</Text>
                          </View>
                          <View style={[styles.permChip, admin.permissions.canManageMembers && styles.permChipActive]}>
                            <Ionicons name="people" size={11} color={admin.permissions.canManageMembers ? '#0284C7' : '#94A3B8'} />
                            <Text style={[styles.permChipText, admin.permissions.canManageMembers && styles.permChipTextActive]}>Miembros</Text>
                          </View>
                          <View style={[styles.permChip, admin.permissions.canManageVendors && styles.permChipActive]}>
                            <Ionicons name="storefront" size={11} color={admin.permissions.canManageVendors ? '#0284C7' : '#94A3B8'} />
                            <Text style={[styles.permChipText, admin.permissions.canManageVendors && styles.permChipTextActive]}>Comercios</Text>
                          </View>
                        </View>

                        {/* Acciones de Gestión */}
                        <View style={styles.adminActionButtonsRow}>
                          <TouchableOpacity 
                            style={[styles.secAdminActionBtn, isEditing && styles.secAdminActionBtnActive]}
                            onPress={() => handleStartEditingPermissions(admin)}
                          >
                            <Ionicons name="options" size={13} color={isEditing ? '#0284C7' : '#475569'} />
                            <Text style={[styles.secAdminActionBtnText, isEditing && styles.secAdminActionBtnTextActive]}>
                              {isEditing ? 'Cerrar Permisos' : 'Configurar Permisos'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.secAdminRevokeBtn}
                            onPress={() => handleRemoveSecondaryAdmin(admin)}
                          >
                            <Ionicons name="person-remove" size={13} color="#DC2626" />
                            <Text style={styles.secAdminRevokeBtnText}>Revocar Rol</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Editor de Permisos Expandible */}
                        {isEditing && (
                          <View style={styles.permissionsEditorBox}>
                            <Text style={styles.permissionsEditorTitle}>Delegar Funciones Específicas:</Text>
                            
                            <TouchableOpacity 
                              style={styles.permCheckRow}
                              onPress={() => handleTogglePermission('canCreateEvents')}
                            >
                              <Ionicons name={editingPermissions.canCreateEvents ? "checkbox" : "square-outline"} size={20} color={editingPermissions.canCreateEvents ? "#0284C7" : "#94A3B8"} />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.permCheckLabel}>📅 Convocar Juntas Oficiales</Text>
                                <Text style={styles.permCheckDesc}>Permite publicar juntas a nombre de la comunidad</Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.permCheckRow}
                              onPress={() => handleTogglePermission('canEditEvents')}
                            >
                              <Ionicons name={editingPermissions.canEditEvents ? "checkbox" : "square-outline"} size={20} color={editingPermissions.canEditEvents ? "#0284C7" : "#94A3B8"} />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.permCheckLabel}>✏️ Editar y Reprogramar Juntas</Text>
                                <Text style={styles.permCheckDesc}>Permite actualizar fechas, lugares y capacidad</Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.permCheckRow}
                              onPress={() => handleTogglePermission('canModeratePosts')}
                            >
                              <Ionicons name={editingPermissions.canModeratePosts ? "checkbox" : "square-outline"} size={20} color={editingPermissions.canModeratePosts ? "#0284C7" : "#94A3B8"} />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.permCheckLabel}>🛡️ Moderar Álbum de Fotos</Text>
                                <Text style={styles.permCheckDesc}>Eliminar contenido inapropiado de la galería</Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.permCheckRow}
                              onPress={() => handleTogglePermission('canManageMembers')}
                            >
                              <Ionicons name={editingPermissions.canManageMembers ? "checkbox" : "square-outline"} size={20} color={editingPermissions.canManageMembers ? "#0284C7" : "#94A3B8"} />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.permCheckLabel}>👥 Gestionar Miembros y Solicitudes</Text>
                                <Text style={styles.permCheckDesc}>Aprobar nuevos integrantes del grupo</Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.permCheckRow}
                              onPress={() => handleTogglePermission('canManageAlbums')}
                            >
                              <Ionicons name={editingPermissions.canManageAlbums ? "checkbox" : "square-outline"} size={20} color={editingPermissions.canManageAlbums ? "#0284C7" : "#94A3B8"} />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.permCheckLabel}>📸 Organizar Álbumes Comunitarios</Text>
                                <Text style={styles.permCheckDesc}>Crear colecciones de fotos de eventos pasados</Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.permCheckRow}
                              onPress={() => handleTogglePermission('canManageVendors')}
                            >
                              <Ionicons name={editingPermissions.canManageVendors ? "checkbox" : "square-outline"} size={20} color={editingPermissions.canManageVendors ? "#0284C7" : "#94A3B8"} />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.permCheckLabel}>🏪 Aprobar Stands y Comercios</Text>
                                <Text style={styles.permCheckDesc}>Permite autorizar tiendas para participar en juntas</Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.savePermsBtn}
                              onPress={() => handleSavePermissions(admin.userId)}
                            >
                              <Text style={styles.savePermsBtnText}>Guardar Permisos Delegados</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* Botón y Formulario para Agregar Nuevo Administrador Secundario */}
              {showAddSecAdminForm ? (
                <View style={styles.addSecAdminBox}>
                  <Text style={styles.addSecAdminTitle}>Designar Nuevo Administrador Secundario</Text>
                  <TextInput
                    placeholder="Nombre completo del coordinador..."
                    value={newSecAdminName}
                    onChangeText={setNewSecAdminName}
                    style={styles.modalInput}
                  />
                  <TextInput
                    placeholder="Correo electrónico registrado..."
                    value={newSecAdminEmail}
                    onChangeText={setNewSecAdminEmail}
                    style={styles.modalInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity 
                      style={[styles.secAdminActionBtn, { flex: 1 }]}
                      onPress={() => setShowAddSecAdminForm(false)}
                    >
                      <Text style={styles.secAdminActionBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.submitReqButton, { flex: 1, marginTop: 0 }]}
                      onPress={handleAddSecondaryAdmin}
                    >
                      <Text style={styles.submitReqButtonText}>Designar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addSecAdminTrigger}
                  onPress={() => setShowAddSecAdminForm(true)}
                >
                  <Ionicons name="person-add" size={15} color="#0284C7" />
                  <Text style={styles.addSecAdminTriggerText}>+ Designar Nuevo Administrador Secundario</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.closeAdminModalBtn, { marginTop: 12 }]}
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
  inputSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 4,
  },
  locationSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  locationSelectorTextSelected: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  locationSelectorTextPlaceholder: {
    fontSize: 13,
    color: '#64748B',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  previewImageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },
  previewImageThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  previewSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  removePhotoText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  pickerScroll: {
    maxHeight: 340,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemRowActive: {
    backgroundColor: '#F0F9FF',
  },
  pickerItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  pickerItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pillBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  exploreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  photoLikesBadgeActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  photoLikesCountActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  dogSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    minWidth: 160,
  },
  dogSelectCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  dogSelectAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  dogSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  dogSelectNameActive: {
    color: '#0284C7',
  },
  dogSelectBreed: {
    fontSize: 11,
    color: '#64748B',
  },
  detailCommLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  detailCommTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailCommLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  detailTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  detailTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  detailTabBtnActive: {
    backgroundColor: '#E0F2FE',
  },
  detailTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  detailTabBtnTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  detailContentScroll: {
    maxHeight: 420,
  },
  detailSectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  communityDogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  communityDogAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  communityDogName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  communityDogBreed: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  communityDogStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  miniPawBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniPawText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  communityDogTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  myDogBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  myDogBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  commEventCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  commEventMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  commEventDesc: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  joinedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  detailMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  detailMemberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  detailJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  detailJoinBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secAdminCardContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  permChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  permChipActive: {
    backgroundColor: '#E0F2FE',
  },
  permChipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  permChipTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  adminActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  secAdminActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 6,
    borderRadius: 8,
  },
  secAdminActionBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  secAdminActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  secAdminActionBtnTextActive: {
    color: '#0284C7',
  },
  secAdminRevokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  secAdminRevokeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  permissionsEditorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    marginTop: 10,
  },
  permissionsEditorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 8,
  },
  permCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  permCheckLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  permCheckDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  savePermsBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  savePermsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addSecAdminBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  addSecAdminTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 8,
  },
  addSecAdminTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#BAE6FD',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  addSecAdminTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});
