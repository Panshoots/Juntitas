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
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Community, SecondaryAdminInfo, SecondaryAdminPermissions, CommunityAccessType } from '../models/Community';
import { 
  getCommunities, 
  joinCommunity, 
  submitCommunityRequest, 
  createOfficialCommunity,
  getSecondaryAdminsForCommunity,
  updateSecondaryAdminPermissions,
  removeSecondaryAdmin,
  addSecondaryAdmin,
  DEFAULT_SECONDARY_PERMISSIONS,
  updateCommunityPhotosAndInfo,
  approveMemberRequest,
  rejectMemberRequest,
  updateCommunityAccessType,
  removeMemberFromCommunity
} from '../services/communityService';
import { AppUser } from '../models/User';
import { getUsersFromDb } from '../services/userService';
import { 
  getCommunityPhotos, 
  uploadCommunityPhoto, 
  deleteCommunityPhoto, 
  toggleLikeCommunityPhoto,
  moderateCommunityPhoto,
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
  const [returnToDetailOnClose, setReturnToDetailOnClose] = useState(false);

  // Campos para solicitud / creación directa de comunidad
  const [reqName, setReqName] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqInstagram, setReqInstagram] = useState('');
  const [reqComuna, setReqComuna] = useState('Las Condes');
  const [reqSize, setReqSize] = useState('50');
  const [reqAccessType, setReqAccessType] = useState<CommunityAccessType>('open');

  // Solicitudes de miembros pendientes (Modelo Híbrido Con Aprobación)
  const [pendingApplicants, setPendingApplicants] = useState<{
    userId: string;
    user?: AppUser;
    dogs: Dog[];
  }[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);

  // Gestión y Expulsión de Miembros de la Manada
  const [adminModalTab, setAdminModalTab] = useState<'access_and_requests' | 'members' | 'coordinators'>('access_and_requests');
  const [activeMembersList, setActiveMembersList] = useState<{
    userId: string;
    user?: AppUser;
    dogs: Dog[];
    isPrimaryAdmin: boolean;
    isSecondaryAdmin: boolean;
  }[]>([]);
  const [loadingActiveMembers, setLoadingActiveMembers] = useState(false);
  const [showExpelModal, setShowExpelModal] = useState(false);
  const [memberToExpel, setMemberToExpel] = useState<{
    userId: string;
    user?: AppUser;
    dogs: Dog[];
    isPrimaryAdmin: boolean;
    isSecondaryAdmin: boolean;
  } | null>(null);
  const [expelReason, setExpelReason] = useState('Incumplimiento de normas de convivencia');
  const [expelling, setExpelling] = useState(false);

  // Modal de Detalle de Comunidad (Perritos Asistentes y Fotos)
  const [selectedCommunityDetail, setSelectedCommunityDetail] = useState<Community | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [communityDetailTab, setCommunityDetailTab] = useState<'dogs' | 'photos' | 'events'>('dogs');
  const [allGlobalDogs, setAllGlobalDogs] = useState<Dog[]>([]);
  const [communityEvents, setCommunityEvents] = useState<DogEvent[]>([]);

  // Estados para cambiar foto de comunidad por administrador
  const [showEditCommPhotoModal, setShowEditCommPhotoModal] = useState(false);
  const [selectedCommForPhoto, setSelectedCommForPhoto] = useState<Community | null>(null);
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [savingCommPhoto, setSavingCommPhoto] = useState(false);

  // Estados para moderación de fotos (bloqueo legal y edición de pie de foto)
  const [photoToModerate, setPhotoToModerate] = useState<CommunityPhoto | null>(null);
  const [showBlockPhotoModal, setShowBlockPhotoModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showEditCaptionModal, setShowEditCaptionModal] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [moderatingPhoto, setModeratingPhoto] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const canModerate = isSuperAdmin || activeProfile.roleType === 'primary_admin' || activeProfile.roleType === 'secondary_admin';

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
    getChileRegions().then(list => {
      if (list && list.length > 0) setRegionsList(list);
    }).catch(err => console.warn('Error cargando regiones:', err));
  }, []);

  const loadInitialData = async () => {
    const startTime = Date.now();
    setLoading(true);
    try {
      await Promise.all([loadCommunities(), loadPhotos()]);
    } catch (e) {
      console.warn('Error cargando datos de comunidades:', e);
    } finally {
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 350 - elapsed);
      if (minDelay > 0) await new Promise(r => setTimeout(r, minDelay));
      setLoading(false);
    }
  };

  const loadCommunities = async () => {
    const data = await getCommunities();
    setCommunities(data);
  };

  const loadPhotos = async () => {
    const canSeeBlocked = isSuperAdmin || activeProfile.roleType === 'primary_admin' || activeProfile.roleType === 'secondary_admin';
    const data = await getCommunityPhotos(undefined, canSeeBlocked);
    // Fotos aleatorias dinámicas de la comunidad para mostrar variedad
    const randomized = [...data].sort(() => Math.random() - 0.5);
    setPhotos(randomized);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCommunities(), loadPhotos()]);
    setRefreshing(false);
  };

  const handleOpenEditCommPhoto = (comm: Community) => {
    setSelectedCommForPhoto(comm);
    setEditLogoUrl(comm.logoUrl || '');
    setEditCoverUrl(comm.coverPhotoUrl || '');
    setShowEditCommPhotoModal(true);
  };

  const handlePickLogoFromGallery = async () => {
    const res = await pickFromGallery();
    if (res.success && res.uri) setEditLogoUrl(res.uri);
  };

  const handleTakeLogoWithCamera = async () => {
    const res = await takePhoto();
    if (res.success && res.uri) setEditLogoUrl(res.uri);
  };

  const handleSaveCommunityPhoto = async () => {
    if (!selectedCommForPhoto) return;
    if (!editLogoUrl.trim()) {
      showToast('Por favor ingresa o selecciona una imagen válida.', 'warning');
      return;
    }
    setSavingCommPhoto(true);
    const res = await updateCommunityPhotosAndInfo(
      selectedCommForPhoto.id, 
      { logoUrl: editLogoUrl, coverPhotoUrl: editCoverUrl }, 
      currentUser.id
    );
    setSavingCommPhoto(false);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setShowEditCommPhotoModal(false);
      loadCommunities();
      if (selectedCommunityDetail && selectedCommunityDetail.id === selectedCommForPhoto.id) {
        setSelectedCommunityDetail(prev => prev ? ({ ...prev, logoUrl: editLogoUrl, coverPhotoUrl: editCoverUrl }) : null);
      }
    }
  };

  const handleOpenBlockPhoto = (photo: CommunityPhoto) => {
    setPhotoToModerate(photo);
    setBlockReason('');
    setShowBlockPhotoModal(true);
  };

  const handleConfirmBlockPhoto = async () => {
    if (!photoToModerate) return;
    if (!blockReason.trim()) {
      showToast('Debes ingresar el motivo de incumplimiento legal o normativo.', 'warning');
      return;
    }
    setModeratingPhoto(true);
    const res = await moderateCommunityPhoto(photoToModerate.id, 'block', currentUser.id, blockReason);
    setModeratingPhoto(false);
    showToast(res.message, res.success ? 'warning' : 'error');
    if (res.success) {
      setShowBlockPhotoModal(false);
      setPhotoToModerate(null);
      loadPhotos();
    }
  };

  const handleOpenEditCaption = (photo: CommunityPhoto) => {
    setPhotoToModerate(photo);
    setEditCaptionText(photo.caption || '');
    setShowEditCaptionModal(true);
  };

  const handleConfirmEditCaption = async () => {
    if (!photoToModerate) return;
    if (!editCaptionText.trim()) {
      showToast('La descripción de la foto no puede quedar vacía.', 'warning');
      return;
    }
    setModeratingPhoto(true);
    const res = await moderateCommunityPhoto(photoToModerate.id, 'edit_caption', currentUser.id, editCaptionText);
    setModeratingPhoto(false);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setShowEditCaptionModal(false);
      setPhotoToModerate(null);
      loadPhotos();
    }
  };

  const handleReactivatePhoto = async (photo: CommunityPhoto) => {
    const res = await moderateCommunityPhoto(photo.id, 'activate', currentUser.id, 'Reactivada por administrador');
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      loadPhotos();
    }
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
    const isAlreadyPending = community.pendingMembers && community.pendingMembers.includes(currentUser.id);
    if (isAlreadyPending) {
      showToast(`Tu solicitud para ${community.name} ya fue enviada y está en revisión por el creador.`, 'info');
      return;
    }
    const res = await joinCommunity(community.id, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      if (res.status === 'JOINED') {
        await awardPaws(currentUser.id, 'community_joined', community.id);
      }
      await loadCommunities();
      if (selectedCommunityDetail && selectedCommunityDetail.id === community.id) {
        const comms = await getCommunities();
        const updated = comms.find(c => c.id === community.id);
        if (updated) setSelectedCommunityDetail(updated);
      }
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

    if (isSuperAdmin) {
      const res = await createOfficialCommunity({
        name: reqName,
        description: reqDesc,
        instagramHandle: reqInstagram,
        region: selectedRegionName,
        comuna: reqComuna,
        primaryAdminId: currentUser.id,
        accessType: reqAccessType
      });
      if (res.success) {
        showToast(`¡Comunidad oficial "${reqName}" creada y publicada exitosamente!`, 'success');
        setShowRequestModal(false);
        setReqName('');
        setReqDesc('');
        setReqInstagram('');
        setReqAccessType('open');
        loadCommunities();
      } else {
        showToast(res.message, 'error');
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
      region: selectedRegionName,
      comuna: reqComuna,
      approximateSize: parseInt(reqSize, 10) || 50,
      accessType: reqAccessType
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
      setReqAccessType('open');
    } else {
      showToast(res.message, 'error');
    }
  };

  const loadPendingApplicants = async (comm: Community) => {
    if (!comm.pendingMembers || comm.pendingMembers.length === 0) {
      setPendingApplicants([]);
      return;
    }
    setLoadingPending(true);
    try {
      const [allUsers, allDogs] = await Promise.all([
        getUsersFromDb(),
        getAllDogsFromDb()
      ]);
      const list = (comm.pendingMembers || []).map(userId => {
        const u = allUsers.find(user => user.id === userId);
        const userDogs = allDogs.filter(dog => dog.ownerId === userId);
        return {
          userId,
          user: u,
          dogs: userDogs
        };
      });
      setPendingApplicants(list);
    } catch (err) {
      console.warn('Error cargando aspirantes pendientes:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadActiveMembers = async (comm: Community) => {
    const memberIds = comm.members || (comm.primaryAdminId ? [comm.primaryAdminId] : []);
    if (memberIds.length === 0) {
      setActiveMembersList([]);
      return;
    }
    setLoadingActiveMembers(true);
    try {
      const [allUsers, allDogs] = await Promise.all([
        getUsersFromDb(),
        getAllDogsFromDb()
      ]);
      const list = memberIds.map(userId => {
        const u = allUsers.find(user => user.id === userId);
        const userDogs = allDogs.filter(dog => dog.ownerId === userId);
        const isPrimary = comm.primaryAdminId === userId;
        const isSecondary = (comm.secondaryAdmins || []).some(sa => sa.userId === userId);
        return {
          userId,
          user: u,
          dogs: userDogs,
          isPrimaryAdmin: isPrimary,
          isSecondaryAdmin: isSecondary
        };
      });
      setActiveMembersList(list);
    } catch (err) {
      console.warn('Error cargando miembros activos:', err);
    } finally {
      setLoadingActiveMembers(false);
    }
  };

  const handleOpenExpelModal = (member: {
    userId: string;
    user?: AppUser;
    dogs: Dog[];
    isPrimaryAdmin: boolean;
    isSecondaryAdmin: boolean;
  }) => {
    setMemberToExpel(member);
    setExpelReason('Incumplimiento de normas de convivencia');
    setShowExpelModal(true);
  };

  const handleConfirmExpelMember = async () => {
    if (!selectedAdminComm || !memberToExpel) return;
    setExpelling(true);
    const res = await removeMemberFromCommunity(
      selectedAdminComm.id,
      memberToExpel.userId,
      currentUser.id,
      expelReason
    );
    setExpelling(false);
    showToast(res.message, res.success ? 'warning' : 'error');

    if (res.success) {
      const updatedMembers = (selectedAdminComm.members || []).filter(id => id !== memberToExpel.userId);
      const newCount = Math.max(1, (selectedAdminComm.membersCount || 1) - 1);
      const updatedComm: Community = {
        ...selectedAdminComm,
        members: updatedMembers,
        membersCount: newCount
      };
      setSelectedAdminComm(updatedComm);
      setActiveMembersList(prev => prev.filter(m => m.userId !== memberToExpel.userId));
      setShowExpelModal(false);
      setMemberToExpel(null);
      await loadCommunities();
      if (selectedCommunityDetail && selectedCommunityDetail.id === selectedAdminComm.id) {
        setSelectedCommunityDetail(prev => prev ? ({
          ...prev,
          members: updatedMembers,
          membersCount: newCount
        }) : null);
      }
    }
  };

  const handleOpenAdminModal = async (comm: Community) => {
    setSelectedAdminComm(comm);
    setAdminModalTab('access_and_requests');
    const list = getSecondaryAdminsForCommunity(comm);
    setSecAdminsList(list);
    setEditingAdminId(null);
    setShowAddSecAdminForm(false);
    setShowAdminModal(true);
    await Promise.all([
      loadPendingApplicants(comm),
      loadActiveMembers(comm)
    ]);
  };

  const handleApproveApplicant = async (applicantUserId: string) => {
    if (!selectedAdminComm) return;
    setActionLoadingUserId(applicantUserId);
    const res = await approveMemberRequest(selectedAdminComm.id, applicantUserId, currentUser.id);
    setActionLoadingUserId(null);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      const updatedPending = (selectedAdminComm.pendingMembers || []).filter(id => id !== applicantUserId);
      const updatedMembers = [...(selectedAdminComm.members || []), applicantUserId];
      const updatedComm: Community = {
        ...selectedAdminComm,
        pendingMembers: updatedPending,
        members: updatedMembers,
        membersCount: (selectedAdminComm.membersCount || 0) + 1
      };
      setSelectedAdminComm(updatedComm);
      setPendingApplicants(prev => prev.filter(p => p.userId !== applicantUserId));
      loadCommunities();
      loadActiveMembers(updatedComm);
    }
  };

  const handleRejectApplicant = async (applicantUserId: string) => {
    if (!selectedAdminComm) return;
    const confirmReject = confirm('¿Estás seguro de que deseas rechazar esta solicitud de ingreso?');
    if (!confirmReject) return;

    setActionLoadingUserId(applicantUserId);
    const res = await rejectMemberRequest(selectedAdminComm.id, applicantUserId, currentUser.id);
    setActionLoadingUserId(null);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      const updatedPending = (selectedAdminComm.pendingMembers || []).filter(id => id !== applicantUserId);
      const updatedComm: Community = {
        ...selectedAdminComm,
        pendingMembers: updatedPending
      };
      setSelectedAdminComm(updatedComm);
      setPendingApplicants(prev => prev.filter(p => p.userId !== applicantUserId));
      loadCommunities();
    }
  };

  const handleToggleAccessType = async (newType: CommunityAccessType) => {
    if (!selectedAdminComm) return;
    if (selectedAdminComm.accessType === newType) return;
    const res = await updateCommunityAccessType(selectedAdminComm.id, newType, currentUser.id);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      setSelectedAdminComm(prev => prev ? ({ ...prev, accessType: newType }) : null);
      loadCommunities();
      if (selectedCommunityDetail && selectedCommunityDetail.id === selectedAdminComm.id) {
        setSelectedCommunityDetail(prev => prev ? ({ ...prev, accessType: newType }) : null);
      }
    }
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
    const targetCommId = selectedCommunityDetail?.id || 'general';
    const targetCommName = selectedCommunityDetail?.name || 'Comunidad Oficial Juntitas';

    const res = await uploadCommunityPhoto({
      communityId: targetCommId,
      communityName: targetCommName,
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
      if (returnToDetailOnClose) {
        setShowDetailModal(true);
        setReturnToDetailOnClose(false);
      }
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
    const targetComm = comm || selectedCommunityDetail;
    if (targetComm) {
      const isPrimary = (activeProfile.roleType === 'primary_admin' && activeProfile.communityIdManaged === targetComm.id) || targetComm.primaryAdminId === currentUser.id;
      const isSecondary = activeProfile.roleType === 'secondary_admin' && activeProfile.communityIdManaged === targetComm.id;
      const isMember = isPrimary || isSecondary || (targetComm.members && targetComm.members.includes(currentUser.id)) || isSuperAdmin;

      if (!isMember) {
        showToast(`Debes unirte primero a la comunidad "${targetComm.name}" para poder compartir fotos.`, 'warning');
        return;
      }
      setSelectedCommunityDetail(targetComm);
    }

    if (currentDogs && currentDogs.length > 0 && !selectedDogName) {
      setSelectedDogName(currentDogs[0].name);
    }

    if (showDetailModal) {
      setReturnToDetailOnClose(true);
      setShowDetailModal(false);
    } else {
      setReturnToDetailOnClose(false);
    }

    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    if (returnToDetailOnClose) {
      setShowDetailModal(true);
      setReturnToDetailOnClose(false);
    }
  };

  const isTutor = currentUser?.filterProfileType === 'tutor' || (!isSuperAdmin && currentUser?.roleType === 'member');
  const canCreateOrRequestCommunity = !isTutor && (
    isSuperAdmin || 
    currentUser?.roleType === 'primary_admin' || 
    currentUser?.roleType === 'secondary_admin' || 
    currentUser?.filterProfileType === 'community_admin'
  );

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
        {canCreateOrRequestCommunity && (
          <TouchableOpacity 
            style={[styles.newCommButton, isSuperAdmin && { backgroundColor: '#DC2626' }]} 
            onPress={() => setShowRequestModal(true)}
          >
            <Ionicons name={isSuperAdmin ? "shield-checkmark" : "add"} size={18} color="#FFFFFF" />
            <Text style={styles.newCommButtonText}>{isSuperAdmin ? 'Crear Oficial' : 'Solicitar'}</Text>
          </TouchableOpacity>
        )}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinnerCircle}>
            <ActivityIndicator size="large" color="#0284C7" />
          </View>
          <Text style={styles.loadingTitle}>Cargando Manadas & Álbumes...</Text>
          <Text style={styles.loadingSubtitle}>Sincronizando comunidades y fotos caninas en tiempo real 🐾</Text>
        </View>
      ) : activeTab === 'communities' ? (
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
              const isPending = !isMember && item.pendingMembers && item.pendingMembers.includes(currentUser.id);
              const pendingCount = item.pendingMembers?.length || 0;

              return (
                <TouchableOpacity 
                  style={[styles.communityCard, isPrimary && styles.primaryCardBorder, isSecondary && styles.secondaryCardBorder]}
                  onPress={() => handleOpenCommunityDetail(item)}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: item.logoUrl }} style={styles.commLogo} />
                  <View style={styles.commDetails}>
                    <View style={styles.commNameRow}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={styles.commName}>{item.name}</Text>
                        {item.isVerified && (
                          <Ionicons name="checkmark-circle" size={17} color="#0284C7" />
                        )}
                        {item.accessType === 'approval_required' ? (
                          <View style={styles.accessBadgeApproval}>
                            <Ionicons name="lock-closed" size={10} color="#B45309" />
                            <Text style={styles.accessBadgeApprovalText}>Con Aprobación</Text>
                          </View>
                        ) : (
                          <View style={styles.accessBadgeOpen}>
                            <Ionicons name="globe-outline" size={10} color="#059669" />
                            <Text style={styles.accessBadgeOpenText}>Abierta</Text>
                          </View>
                        )}
                      </View>
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
                        ) : isPending ? (
                          <View style={[styles.joinedBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]}>
                            <Ionicons name="time" size={12} color="#D97706" />
                            <Text style={[styles.joinedBadgeText, { color: '#B45309', fontSize: 11 }]}>Pendiente</Text>
                          </View>
                        ) : item.accessType === 'approval_required' ? (
                          <TouchableOpacity 
                            style={[styles.joinButton, { backgroundColor: '#D97706' }]} 
                            onPress={() => handleJoin(item)}
                          >
                            <Ionicons name="mail" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.joinButtonText}>Solicitar</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.joinButton} 
                            onPress={() => handleJoin(item)}
                          >
                            <Text style={styles.joinButtonText}>+ Unirme (+10 🐾)</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {(isPrimary || isSuperAdmin) && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity 
                          style={[styles.manageSecAdminsButton, { flex: 1, marginTop: 0 }]}
                          onPress={() => handleOpenAdminModal(item)}
                        >
                          <Ionicons name="people-circle" size={15} color="#B45309" />
                          <Text style={styles.manageSecAdminsText}>Administración</Text>
                          {pendingCount > 0 && (
                            <View style={styles.pendingBadgeCounter}>
                              <Text style={styles.pendingBadgeCounterText}>{pendingCount}</Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.changeCommPhotoBtn}
                          onPress={() => handleOpenEditCommPhoto(item)}
                        >
                          <Ionicons name="camera" size={14} color="#0284C7" />
                          <Text style={styles.changeCommPhotoBtnText}>Foto</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      ) : (
        /* Vista de Álbum & Fotos Comunitarias */
        <View style={{ flex: 1 }}>
          {/* Botón para subir fotos (exclusivo para Admins) o Banner Informativo para Miembros */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            {(isSuperAdmin || activeProfile.roleType === 'primary_admin' || activeProfile.roleType === 'secondary_admin') ? (
              <TouchableOpacity 
                style={styles.uploadPhotoBtn}
                onPress={() => setShowUploadModal(true)}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.uploadPhotoBtnText}>+ Subir Foto Oficial de la Manada</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.albumInfoBanner}>
                <Ionicons name="sparkles" size={16} color="#0284C7" />
                <Text style={styles.albumInfoText}>
                  Álbum Oficial: Fotos aleatorias y seleccionadas de las manadas. ¡Reacciona con tu like a tus perritos favoritos! ❤️
                </Text>
              </View>
            )}
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

                    {/* Botones de Moderación para Administradores */}
                    {canModerate && (
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {item.status === 'blocked' ? (
                          <TouchableOpacity 
                            style={styles.modReactivateBtn}
                            onPress={() => handleReactivatePhoto(item)}
                          >
                            <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                            <Text style={styles.modReactivateText}>Reactivar</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.modBlockBtn}
                            onPress={() => handleOpenBlockPhoto(item)}
                          >
                            <Ionicons name="ban" size={13} color="#DC2626" />
                            <Text style={styles.modBlockText}>Bloquear</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                          style={styles.modEditBtn}
                          onPress={() => handleOpenEditCaption(item)}
                        >
                          <Ionicons name="pencil" size={13} color="#0284C7" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.modDeleteBtn}
                          onPress={() => handleDeletePhoto(item.id)}
                        >
                          <Ionicons name="trash" size={13} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Banner de Foto Bloqueada por Incumplimiento Legal */}
                  {item.status === 'blocked' && (
                    <View style={styles.photoBlockedBanner}>
                      <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                      <Text style={styles.photoBlockedBannerText} numberOfLines={2}>
                        Foto Bloqueada: {item.moderationReason || 'Incumplimiento legal o normativo.'}
                      </Text>
                    </View>
                  )}

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

            <Text style={styles.inputSectionLabel}>Tipo de Acceso:</Text>
            <View style={styles.accessTypeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.accessTypeCard,
                  reqAccessType === 'open' && styles.accessTypeCardActive
                ]}
                onPress={() => setReqAccessType('open')}
              >
                <Ionicons 
                  name={reqAccessType === 'open' ? 'radio-button-on' : 'radio-button-off'} 
                  size={16} 
                  color={reqAccessType === 'open' ? '#0284C7' : '#94A3B8'} 
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.accessTypeCardTitle, reqAccessType === 'open' && styles.accessTypeCardTitleActive]}>
                    🌐 Abierta a Todos
                  </Text>
                  <Text style={styles.accessTypeCardSub}>
                    Cualquiera se une directamente con 1 clic
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accessTypeCard,
                  reqAccessType === 'approval_required' && styles.accessTypeCardActive
                ]}
                onPress={() => setReqAccessType('approval_required')}
              >
                <Ionicons 
                  name={reqAccessType === 'approval_required' ? 'radio-button-on' : 'radio-button-off'} 
                  size={16} 
                  color={reqAccessType === 'approval_required' ? '#0284C7' : '#94A3B8'} 
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.accessTypeCardTitle, reqAccessType === 'approval_required' && styles.accessTypeCardTitleActive]}>
                    🔒 Con Aprobación
                  </Text>
                  <Text style={styles.accessTypeCardSub}>
                    Requiere autorización previa del creador
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

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
                {isSuperAdmin ? 'Crear y Publicar Comunidad Oficial' : 'Enviar para Validación'}
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={styles.detailCommTitle} numberOfLines={1}>
                          {selectedCommunityDetail.name}
                        </Text>
                        {selectedCommunityDetail.isVerified && (
                          <Ionicons name="checkmark-circle" size={16} color="#0284C7" />
                        )}
                        {selectedCommunityDetail.accessType === 'approval_required' ? (
                          <View style={styles.accessBadgeApproval}>
                            <Ionicons name="lock-closed" size={10} color="#B45309" />
                            <Text style={styles.accessBadgeApprovalText}>Con Aprobación</Text>
                          </View>
                        ) : (
                          <View style={styles.accessBadgeOpen}>
                            <Ionicons name="globe-outline" size={10} color="#059669" />
                            <Text style={styles.accessBadgeOpenText}>Abierta</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.detailCommLocation}>
                        📍 {selectedCommunityDetail.comuna}, {selectedCommunityDetail.region}
                      </Text>
                      {(() => {
                        const isPrimary = (activeProfile.roleType === 'primary_admin' && activeProfile.communityIdManaged === selectedCommunityDetail.id) || selectedCommunityDetail.primaryAdminId === currentUser.id;
                        const isSecondary = activeProfile.roleType === 'secondary_admin' && activeProfile.communityIdManaged === selectedCommunityDetail.id;
                        const isMember = isPrimary || isSecondary || (selectedCommunityDetail.members && selectedCommunityDetail.members.includes(currentUser.id));
                        const isPending = !isMember && selectedCommunityDetail.pendingMembers && selectedCommunityDetail.pendingMembers.includes(currentUser.id);

                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            {isMember ? (
                              <View style={styles.detailMemberBadge}>
                                <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                                <Text style={styles.detailMemberBadgeText}>Eres miembro</Text>
                              </View>
                            ) : isPending ? (
                              <View style={[styles.detailMemberBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]}>
                                <Ionicons name="time" size={13} color="#D97706" />
                                <Text style={[styles.detailMemberBadgeText, { color: '#B45309' }]}>Solicitud Pendiente</Text>
                              </View>
                            ) : selectedCommunityDetail.accessType === 'approval_required' ? (
                              <TouchableOpacity 
                                style={[styles.detailJoinBtn, { backgroundColor: '#D97706' }]}
                                onPress={() => handleJoin(selectedCommunityDetail)}
                              >
                                <Ionicons name="mail" size={13} color="#FFFFFF" />
                                <Text style={styles.detailJoinBtnText}>Solicitar Ingreso</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity 
                                style={styles.detailJoinBtn}
                                onPress={() => handleJoin(selectedCommunityDetail)}
                              >
                                <Ionicons name="add-circle" size={13} color="#FFFFFF" />
                                <Text style={styles.detailJoinBtnText}>Unirme (+10 🐾)</Text>
                              </TouchableOpacity>
                            )}

                            {(isSuperAdmin || isPrimary) && (
                              <TouchableOpacity 
                                style={styles.changeCommPhotoDetailBtn}
                                onPress={() => handleOpenEditCommPhoto(selectedCommunityDetail)}
                              >
                                <Ionicons name="camera" size={12} color="#0284C7" />
                                <Text style={styles.changeCommPhotoDetailText}>Cambiar Foto</Text>
                              </TouchableOpacity>
                            )}
                          </View>
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
                    {(() => {
                      const isPrimary = (activeProfile.roleType === 'primary_admin' && activeProfile.communityIdManaged === selectedCommunityDetail.id) || selectedCommunityDetail.primaryAdminId === currentUser.id;
                      const isSecondary = activeProfile.roleType === 'secondary_admin' && activeProfile.communityIdManaged === selectedCommunityDetail.id;
                      const isMember = isPrimary || isSecondary || (selectedCommunityDetail.members && selectedCommunityDetail.members.includes(currentUser.id)) || isSuperAdmin;

                      if (!isMember) {
                        const isPending = selectedCommunityDetail.pendingMembers && selectedCommunityDetail.pendingMembers.includes(currentUser.id);
                        return (
                          <View style={styles.notJoinedBanner}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Ionicons name="lock-closed" size={16} color="#B45309" />
                              <Text style={styles.notJoinedBannerTitle}>Solo miembros pueden compartir fotos</Text>
                            </View>
                            <Text style={styles.notJoinedBannerSub}>
                              {isPending 
                                ? 'Tu solicitud de ingreso fue enviada y está en revisión por el creador de la comunidad. Una vez aprobada, podrás compartir fotos de tus perritos y ganar +15 🐾 Huellitas.'
                                : selectedCommunityDetail.accessType === 'approval_required'
                                ? 'Esta comunidad requiere aprobación previa. Solicita tu ingreso para compartir fotos de tus perritos y ganar +15 🐾 Huellitas.'
                                : `Únete a ${selectedCommunityDetail.name} para subir fotos de tus perritos y ganar +15 🐾 Huellitas.`
                              }
                            </Text>
                            {isPending ? (
                              <View style={[styles.joinedBadge, { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 }]}>
                                <Ionicons name="time" size={14} color="#D97706" />
                                <Text style={[styles.joinedBadgeText, { color: '#B45309' }]}>Solicitud en Revisión</Text>
                              </View>
                            ) : (
                              <TouchableOpacity 
                                style={[styles.notJoinedBannerBtn, selectedCommunityDetail.accessType === 'approval_required' && { backgroundColor: '#D97706' }]}
                                onPress={() => handleJoin(selectedCommunityDetail)}
                              >
                                <Ionicons name={selectedCommunityDetail.accessType === 'approval_required' ? "mail" : "add-circle"} size={14} color="#FFFFFF" />
                                <Text style={styles.notJoinedBannerBtnText}>
                                  {selectedCommunityDetail.accessType === 'approval_required' ? 'Solicitar Ingreso a la Comunidad' : 'Unirme a esta comunidad (+10 🐾)'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      }

                      return (
                        <TouchableOpacity 
                          style={[styles.uploadPhotoBtn, { marginVertical: 8 }]}
                          onPress={() => {
                            handleOpenUploadModal(selectedCommunityDetail);
                          }}
                        >
                          <Ionicons name="camera" size={16} color="#FFFFFF" />
                          <Text style={styles.uploadPhotoBtnText}>+ Compartir Foto en esta Comunidad (+15 🐾)</Text>
                        </TouchableOpacity>
                      );
                    })()}

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

                              {/* Moderación para Administradores */}
                              {canModerate && (
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                  {item.status === 'blocked' ? (
                                    <TouchableOpacity 
                                      style={styles.modReactivateBtn}
                                      onPress={() => handleReactivatePhoto(item)}
                                    >
                                      <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                                      <Text style={styles.modReactivateText}>Reactivar</Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <TouchableOpacity 
                                      style={styles.modBlockBtn}
                                      onPress={() => handleOpenBlockPhoto(item)}
                                    >
                                      <Ionicons name="ban" size={13} color="#DC2626" />
                                      <Text style={styles.modBlockText}>Bloquear</Text>
                                    </TouchableOpacity>
                                  )}

                                  <TouchableOpacity 
                                    style={styles.modEditBtn}
                                    onPress={() => handleOpenEditCaption(item)}
                                  >
                                    <Ionicons name="pencil" size={13} color="#0284C7" />
                                  </TouchableOpacity>

                                  <TouchableOpacity 
                                    style={styles.modDeleteBtn}
                                    onPress={() => handleDeletePhoto(item.id)}
                                  >
                                    <Ionicons name="trash" size={13} color="#64748B" />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>

                            {/* Banner de Foto Bloqueada por Incumplimiento Legal */}
                            {item.status === 'blocked' && (
                              <View style={styles.photoBlockedBanner}>
                                <Ionicons name="alert-circle" size={14} color="#B91C1C" />
                                <Text style={styles.photoBlockedBannerText} numberOfLines={2}>
                                  Foto Bloqueada: {item.moderationReason || 'Incumplimiento legal o normativo.'}
                                </Text>
                              </View>
                            )}

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

      {/* Modal para Compartir Fotos en la Galería (Renderizado por encima de todos los modales) */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { zIndex: 99999 }]}>
          <View style={[styles.modalCard, { zIndex: 100000, elevation: 30 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 Compartir Foto en la Galería</Text>
              <TouchableOpacity onPress={handleCloseUploadModal}>
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
                <Text style={styles.modalTitle}>👑 Gestión de Comunidad</Text>
                <Text style={[styles.modalIntro, { marginBottom: 0 }]}>
                  {selectedAdminComm?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAdminModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Sub-tabs de Gestión de Comunidad */}
            <View style={styles.adminSubTabRow}>
              <TouchableOpacity
                style={[
                  styles.adminSubTabBtn,
                  adminModalTab === 'access_and_requests' && styles.adminSubTabBtnActive
                ]}
                onPress={() => setAdminModalTab('access_and_requests')}
              >
                <Ionicons 
                  name="shield-checkmark" 
                  size={13} 
                  color={adminModalTab === 'access_and_requests' ? '#0284C7' : '#64748B'} 
                />
                <Text style={[
                  styles.adminSubTabBtnText,
                  adminModalTab === 'access_and_requests' && styles.adminSubTabBtnTextActive
                ]}>
                  Acceso {pendingApplicants.length > 0 ? `(${pendingApplicants.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.adminSubTabBtn,
                  adminModalTab === 'members' && styles.adminSubTabBtnActive
                ]}
                onPress={() => setAdminModalTab('members')}
              >
                <Ionicons 
                  name="people" 
                  size={13} 
                  color={adminModalTab === 'members' ? '#0284C7' : '#64748B'} 
                />
                <Text style={[
                  styles.adminSubTabBtnText,
                  adminModalTab === 'members' && styles.adminSubTabBtnTextActive
                ]}>
                  Miembros ({activeMembersList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.adminSubTabBtn,
                  adminModalTab === 'coordinators' && styles.adminSubTabBtnActive
                ]}
                onPress={() => setAdminModalTab('coordinators')}
              >
                <Ionicons 
                  name="ribbon" 
                  size={13} 
                  color={adminModalTab === 'coordinators' ? '#0284C7' : '#64748B'} 
                />
                <Text style={[
                  styles.adminSubTabBtnText,
                  adminModalTab === 'coordinators' && styles.adminSubTabBtnTextActive
                ]}>
                  Coordinadores ({secAdminsList.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {adminModalTab === 'access_and_requests' && (
                <>
              {/* SECCIÓN 1: CONFIGURACIÓN DE MODELO DE ACCESO */}
              <View style={styles.adminSectionBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
                  <Text style={styles.adminSectionTitle}>Modelo de Acceso a la Manada</Text>
                </View>
                <Text style={styles.adminSectionDesc}>
                  Configura cómo pueden ingresar los nuevos tutores a tu comunidad:
                </Text>

                <View style={styles.accessToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.accessToggleBtn,
                      (selectedAdminComm?.accessType || 'open') === 'open' && styles.accessToggleBtnActive
                    ]}
                    onPress={() => handleToggleAccessType('open')}
                  >
                    <Ionicons 
                      name="globe-outline" 
                      size={16} 
                      color={(selectedAdminComm?.accessType || 'open') === 'open' ? '#059669' : '#64748B'} 
                    />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={[
                        styles.accessToggleTitle,
                        (selectedAdminComm?.accessType || 'open') === 'open' && styles.accessToggleTitleActive
                      ]}>
                        🌐 Abierta a Todos
                      </Text>
                      <Text style={styles.accessToggleSub}>
                        Cualquier tutor entra con 1 clic
                      </Text>
                    </View>
                    {(selectedAdminComm?.accessType || 'open') === 'open' && (
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.accessToggleBtn,
                      selectedAdminComm?.accessType === 'approval_required' && styles.accessToggleBtnActiveApproval
                    ]}
                    onPress={() => handleToggleAccessType('approval_required')}
                  >
                    <Ionicons 
                      name="lock-closed" 
                      size={16} 
                      color={selectedAdminComm?.accessType === 'approval_required' ? '#D97706' : '#64748B'} 
                    />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={[
                        styles.accessToggleTitle,
                        selectedAdminComm?.accessType === 'approval_required' && styles.accessToggleTitleActiveApproval
                      ]}>
                        🔒 Con Aprobación
                      </Text>
                      <Text style={styles.accessToggleSub}>
                        Tú autorizas a cada aspirante
                      </Text>
                    </View>
                    {selectedAdminComm?.accessType === 'approval_required' && (
                      <Ionicons name="checkmark-circle" size={18} color="#D97706" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECCIÓN 2: SOLICITUDES DE INGRESO PENDIENTES */}
              <View style={styles.adminSectionBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="mail-unread" size={16} color="#D97706" />
                    <Text style={styles.adminSectionTitle}>
                      Solicitudes de Ingreso Pendientes ({pendingApplicants.length})
                    </Text>
                  </View>
                  {loadingPending && <ActivityIndicator size="small" color="#D97706" />}
                </View>

                {loadingPending ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0284C7" />
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Buscando aspirantes...</Text>
                  </View>
                ) : pendingApplicants.length === 0 ? (
                  <View style={styles.emptyApplicantBox}>
                    <Ionicons name="checkmark-circle-outline" size={26} color="#10B981" />
                    <Text style={styles.emptyApplicantText}>No hay solicitudes pendientes en este momento.</Text>
                  </View>
                ) : (
                  pendingApplicants.map(applicant => {
                    const isProcessing = actionLoadingUserId === applicant.userId;
                    return (
                      <View key={applicant.userId} style={styles.applicantCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Image 
                            source={{ uri: applicant.user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} 
                            style={styles.applicantAvatar} 
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.applicantName}>{applicant.user?.displayName || 'Tutor Canino'}</Text>
                            <Text style={styles.applicantMeta}>
                              📍 {applicant.user?.location?.comuna || 'Santiago'}, {applicant.user?.location?.region || 'Metropolitana'}
                            </Text>
                            <Text style={styles.applicantEmail}>{applicant.user?.email || ''}</Text>
                          </View>
                        </View>

                        {/* Perritos del Tutor */}
                        <View style={styles.applicantDogsRow}>
                          <Text style={styles.applicantDogsLabel}>🐾 Perrito(s):</Text>
                          {applicant.dogs.length > 0 ? (
                            applicant.dogs.map(dog => (
                              <View key={dog.id} style={styles.applicantDogChip}>
                                <Text style={styles.applicantDogChipText}>
                                  🐶 {dog.name} ({dog.breed})
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.applicantNoDogsText}>Aún no registra perrito</Text>
                          )}
                        </View>

                        {/* Acciones de Validación */}
                        <View style={styles.applicantActionRow}>
                          <TouchableOpacity
                            style={[styles.applicantRejectBtn, isProcessing && { opacity: 0.6 }]}
                            onPress={() => handleRejectApplicant(applicant.userId)}
                            disabled={isProcessing}
                          >
                            <Ionicons name="close-circle" size={14} color="#DC2626" />
                            <Text style={styles.applicantRejectBtnText}>Rechazar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.applicantApproveBtn, isProcessing && { opacity: 0.6 }]}
                            onPress={() => handleApproveApplicant(applicant.userId)}
                            disabled={isProcessing}
                          >
                            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                            <Text style={styles.applicantApproveBtnText}>Aprobar (+10 🐾)</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
              </>
              )}

              {/* PESTAÑA 2: MIEMBROS OFICIALES Y EXPULSIÓN */}
              {adminModalTab === 'members' && (
                <View style={styles.adminSectionBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="people" size={16} color="#0284C7" />
                      <Text style={styles.adminSectionTitle}>
                        Miembros Oficiales de la Manada ({activeMembersList.length})
                      </Text>
                    </View>
                    {loadingActiveMembers && <ActivityIndicator size="small" color="#0284C7" />}
                  </View>

                  <Text style={styles.adminSectionDesc}>
                    Como administrador, moderas la convivencia de la comunidad. Si un tutor incumple las reglas o incurre en conductas inapropiadas, puedes expulsarlo de la manada.
                  </Text>

                  {loadingActiveMembers ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#0284C7" />
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Cargando tutores miembros...</Text>
                    </View>
                  ) : activeMembersList.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="people-outline" size={32} color="#94A3B8" />
                      <Text style={styles.emptyText}>No hay miembros registrados aún.</Text>
                    </View>
                  ) : (
                    activeMembersList.map(member => (
                      <View key={member.userId} style={styles.memberCardItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Image 
                            source={{ uri: member.user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} 
                            style={styles.applicantAvatar} 
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Text style={styles.applicantName}>{member.user?.displayName || 'Tutor Canino'}</Text>
                              {member.isPrimaryAdmin && (
                                <View style={styles.titularBadge}>
                                  <Ionicons name="ribbon" size={10} color="#B45309" />
                                  <Text style={styles.titularBadgeText}>Creador / Titular</Text>
                                </View>
                              )}
                              {member.isSecondaryAdmin && (
                                <View style={styles.coordBadge}>
                                  <Ionicons name="shield-half" size={10} color="#0369A1" />
                                  <Text style={styles.coordBadgeText}>Coordinador</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.applicantMeta}>
                              📍 {member.user?.location?.comuna || 'Santiago'}, {member.user?.location?.region || 'Metropolitana'}
                            </Text>
                            <Text style={styles.applicantEmail}>{member.user?.email || ''}</Text>
                          </View>
                        </View>

                        {/* Perritos del Tutor */}
                        <View style={styles.applicantDogsRow}>
                          <Text style={styles.applicantDogsLabel}>🐾 Perrito(s):</Text>
                          {member.dogs.length > 0 ? (
                            member.dogs.map(dog => (
                              <View key={dog.id} style={styles.applicantDogChip}>
                                <Text style={styles.applicantDogChipText}>
                                  🐶 {dog.name} ({dog.breed})
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.applicantNoDogsText}>Sin perritos registrados</Text>
                          )}
                        </View>

                        {/* Botón de Expulsión (solo para tutores miembros, no para el creador titular) */}
                        {!member.isPrimaryAdmin && (
                          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
                            <TouchableOpacity
                              style={styles.expelMemberActionBtn}
                              onPress={() => handleOpenExpelModal(member)}
                            >
                              <Ionicons name="ban" size={13} color="#DC2626" />
                              <Text style={styles.expelMemberActionBtnText}>Expulsar de la Comunidad</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* PESTAÑA 3: COORDINADORES DELEGADOS */}
              {adminModalTab === 'coordinators' && (
              <View style={[styles.adminSectionBox, { marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="people" size={16} color="#B45309" />
                  <Text style={styles.adminSectionTitle}>Coordinadores Delegados</Text>
                </View>
                <Text style={styles.adminSectionDesc}>
                  Como Administrador Principal, tú tienes la titularidad exclusiva y delegas permisos a tus coordinadores para ayudarte a gestionar la comunidad.
                </Text>
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
              </View>
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

      {/* Modal de Confirmación de Expulsión de Tutor */}
      <Modal visible={showExpelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 460 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={22} color="#DC2626" />
                <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Expulsar de la Manada</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExpelModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {memberToExpel && (
              <View style={styles.expelTargetCard}>
                <Image 
                  source={{ uri: memberToExpel.user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} 
                  style={styles.expelTargetAvatar} 
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.expelTargetName}>{memberToExpel.user?.displayName || 'Tutor Canino'}</Text>
                  <Text style={styles.expelTargetMeta}>
                    📍 {memberToExpel.user?.location?.comuna || 'Santiago'} • {memberToExpel.dogs.length} perrito(s)
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.expelWarningBox}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={styles.expelWarningText}>
                Esta acción removerá la membresía del tutor en "{selectedAdminComm?.name}". El usuario perderá acceso a publicar fotos y a las juntas exclusivas de la comunidad.
              </Text>
            </View>

            <Text style={styles.inputSectionLabel}>Selecciona el motivo de la expulsión:</Text>
            <View style={styles.expelReasonsList}>
              {[
                'Incumplimiento reiterado de normas de convivencia',
                'Conducta inapropiada o agresiva de tutor/mascota',
                'Publicación de fotos inadecuadas o prohibidas',
                'Spam o comercio no autorizado en la comunidad',
              ].map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.expelReasonChip,
                    expelReason === reason && styles.expelReasonChipActive
                  ]}
                  onPress={() => setExpelReason(reason)}
                >
                  <Ionicons 
                    name={expelReason === reason ? "radio-button-on" : "radio-button-off"} 
                    size={15} 
                    color={expelReason === reason ? "#DC2626" : "#94A3B8"} 
                  />
                  <Text style={[
                    styles.expelReasonChipText,
                    expelReason === reason && styles.expelReasonChipTextActive
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="O escribe un motivo detallado..."
              value={expelReason}
              onChangeText={setExpelReason}
              style={[styles.modalInput, { marginTop: 6 }]}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.secAdminActionBtn, { flex: 1 }]}
                onPress={() => setShowExpelModal(false)}
                disabled={expelling}
              >
                <Text style={styles.secAdminActionBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnDanger, { flex: 1.3, paddingVertical: 10 }, expelling && { opacity: 0.6 }]}
                onPress={handleConfirmExpelMember}
                disabled={expelling}
              >
                <Text style={styles.btnDangerText}>
                  {expelling ? 'Expulsando...' : 'Confirmar Expulsión'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CAMBIAR FOTO DE COMUNIDAD (ADMINISTRADOR) */}
      <Modal visible={showEditCommPhotoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="camera" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Cambiar Foto de Comunidad</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditCommPhotoModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Comunidad: {selectedCommForPhoto?.name}
            </Text>

            {/* Previsualización del Logo Actual */}
            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <Image 
                source={{ uri: editLogoUrl || selectedCommForPhoto?.logoUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300' }} 
                style={styles.commPhotoPreviewAvatar} 
              />
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Vista previa del Avatar Oficial</Text>
            </View>

            {/* Opciones de Cámara / Galería */}
            <View style={styles.photoActionRow}>
              <TouchableOpacity style={styles.photoActionButton} onPress={handleTakeLogoWithCamera}>
                <Ionicons name="camera" size={18} color="#0284C7" />
                <Text style={styles.photoActionText}>Tomar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionButton} onPress={handlePickLogoFromGallery}>
                <Ionicons name="images" size={18} color="#0284C7" />
                <Text style={styles.photoActionText}>De Galería</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputSectionLabel}>O pegar URL de la imagen:</Text>
            <TextInput
              placeholder="https://..."
              value={editLogoUrl}
              onChangeText={setEditLogoUrl}
              style={styles.modalInput}
              autoCapitalize="none"
            />

            <Text style={styles.inputSectionLabel}>URL Portada / Banner (Opcional):</Text>
            <TextInput
              placeholder="https://..."
              value={editCoverUrl}
              onChangeText={setEditCoverUrl}
              style={styles.modalInput}
              autoCapitalize="none"
            />

            <TouchableOpacity 
              style={[styles.btnPrimary, savingCommPhoto && { opacity: 0.6 }]}
              onPress={handleSaveCommunityPhoto}
              disabled={savingCommPhoto}
            >
              <Text style={styles.btnPrimaryText}>
                {savingCommPhoto ? 'Guardando cambios...' : 'Guardar Nueva Foto de Comunidad'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: BLOQUEAR FOTO POR INCUMPLIMIENTO LEGAL */}
      <Modal visible={showBlockPhotoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Bloquear Foto (Moderación Legal)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBlockPhotoModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Subida por: {photoToModerate?.uploaderName} • "{photoToModerate?.caption}"
            </Text>

            <Text style={styles.inputLabel}>
              Motivo obligatorio del bloqueo legal / normativo:
            </Text>
            <TextInput
              placeholder="Ej: Publicidad o venta no autorizada, contenido que viola la Ley Cholito, o imagen inapropiada"
              value={blockReason}
              onChangeText={setBlockReason}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 75 }]}
            />

            <Text style={styles.legalNoticeText}>
              ⚖️ Al bloquear esta foto, dejará de ser visible para los miembros y tutores de la plataforma. El registro quedará guardado en la auditoría de moderación.
            </Text>

            <TouchableOpacity 
              style={[styles.btnDanger, moderatingPhoto && { opacity: 0.6 }]}
              onPress={handleConfirmBlockPhoto}
              disabled={moderatingPhoto}
            >
              <Text style={styles.btnDangerText}>
                {moderatingPhoto ? 'Aplicando bloqueo...' : 'Confirmar Bloqueo de Foto'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDITAR PIE DE FOTO */}
      <Modal visible={showEditCaptionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="pencil" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Editar Pie de Foto</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditCaptionModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Corrige o modera el texto de la publicación:
            </Text>

            <TextInput
              value={editCaptionText}
              onChangeText={setEditCaptionText}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 80 }]}
            />

            <TouchableOpacity 
              style={[styles.btnPrimary, moderatingPhoto && { opacity: 0.6 }]}
              onPress={handleConfirmEditCaption}
              disabled={moderatingPhoto}
            >
              <Text style={styles.btnPrimaryText}>
                {moderatingPhoto ? 'Guardando...' : 'Actualizar Pie de Foto'}
              </Text>
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
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
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
  changeCommPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  changeCommPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  changeCommPhotoDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeCommPhotoDetailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  commPhotoPreviewAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#0284C7',
    backgroundColor: '#F1F5F9',
  },
  modReactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modReactivateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  modBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modBlockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  modEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoBlockedBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  legalNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  loadingSpinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  albumInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  albumInfoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    lineHeight: 16,
  },
  notJoinedBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
  },
  notJoinedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  notJoinedBannerSub: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 10,
  },
  notJoinedBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  notJoinedBannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accessBadgeApproval: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  accessBadgeApprovalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  accessBadgeOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  accessBadgeOpenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  pendingBadgeCounter: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  pendingBadgeCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  accessTypeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  accessTypeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  accessTypeCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  accessTypeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  accessTypeCardTitleActive: {
    color: '#0284C7',
  },
  accessTypeCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 13,
  },
  adminSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  adminSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminSectionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 15,
  },
  accessToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accessToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  accessToggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  accessToggleBtnActiveApproval: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  accessToggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  accessToggleTitleActive: {
    color: '#047857',
  },
  accessToggleTitleActiveApproval: {
    color: '#B45309',
  },
  accessToggleSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  emptyApplicantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  emptyApplicantText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    flex: 1,
  },
  applicantCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  applicantName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  applicantMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  applicantEmail: {
    fontSize: 10,
    color: '#94A3B8',
  },
  applicantDogsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  applicantDogsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  applicantDogChip: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  applicantDogChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  applicantNoDogsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  applicantActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  applicantRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  applicantRejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  applicantApproveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  applicantApproveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminSubTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  adminSubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  adminSubTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  adminSubTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  adminSubTabBtnTextActive: {
    color: '#0284C7',
  },
  memberCardItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  titularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  titularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  coordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  coordBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  expelMemberActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 6,
    gap: 5,
  },
  expelMemberActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  expelTargetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  expelTargetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  expelTargetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  expelTargetMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  expelWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  expelWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
  },
  expelReasonsList: {
    gap: 6,
    marginBottom: 8,
  },
  expelReasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  expelReasonChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  expelReasonChipText: {
    fontSize: 12,
    color: '#475569',
  },
  expelReasonChipTextActive: {
    color: '#B91C1C',
    fontWeight: '600',
  },
});
