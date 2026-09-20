import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Community, CommunityRequest, SecondaryAdminPermissions, SecondaryAdminInfo, CommunityAccessType } from '../models/Community';
import { logAuditAction } from './auditService';
import { awardPaws } from './gamificationService';

let localCommunities: Community[] = [];
let localRequests: CommunityRequest[] = [];

export const submitCommunityRequest = async (
  requestData: Omit<CommunityRequest, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; id?: string; message: string }> => {
  const req: CommunityRequest = {
    ...requestData,
    id: 'req-' + Date.now(),
    status: 'pending',
    createdAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'communityRequests'), {
      ...requestData,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    req.id = docRef.id;
  } catch (err) {
    console.warn('Guardando solicitud de comunidad localmente:', err);
  }

  localRequests.unshift(req);
  await logAuditAction(
    requestData.applicantId,
    'COMMUNITY_REQUEST_SUBMIT',
    'communityRequests',
    req.id,
    `Solicitud para fundar la comunidad: ${requestData.communityName}`
  );

  return { success: true, id: req.id, message: '¡Solicitud enviada con éxito! Será validada pronto para que tu comunidad esté disponible.' };
};

export const getCommunityRequests = async (): Promise<CommunityRequest[]> => {
  try {
    const snap = await getDocs(collection(db, 'communityRequests'));
    if (!snap.empty) {
      const list: CommunityRequest[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          communityName: data.communityName || '',
          applicantId: data.applicantId || '',
          applicantName: data.applicantName || '',
          applicantEmail: data.applicantEmail || '',
          description: data.description || '',
          instagramHandle: data.instagramHandle || '',
          verificationEvidenceUrls: data.verificationEvidenceUrls || [],
          region: data.region || 'Metropolitana',
          comuna: data.comuna || 'Santiago',
          approximateSize: data.approximateSize || 50,
          status: data.status || 'pending',
          feedbackNote: data.feedbackNote || data.adminReviewNotes,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        });
      });
      localRequests = list;
      return list;
    }
  } catch (err) {
    console.warn('Leyendo solicitudes locales:', err);
  }
  return [...localRequests];
};

export const approveCommunityRequest = async (
  requestId: string,
  adminUserId: string
): Promise<{ success: boolean; communityId?: string; message: string }> => {
  let req = localRequests.find(r => r.id === requestId);
  if (!req) {
    try {
      const snap = await getDoc(doc(db, 'communityRequests', requestId));
      if (snap.exists()) {
        const d = snap.data();
        req = {
          id: snap.id,
          communityName: d.communityName || 'Nueva Comunidad',
          applicantId: d.applicantId || adminUserId,
          applicantName: d.applicantName || '',
          applicantEmail: d.applicantEmail || '',
          description: d.description || '',
          instagramHandle: d.instagramHandle || '',
          verificationEvidenceUrls: d.verificationEvidenceUrls || [],
          region: d.region || 'Metropolitana',
          comuna: d.comuna || 'Santiago',
          approximateSize: d.approximateSize || 50,
          status: 'pending',
          createdAt: new Date()
        };
      }
    } catch (e) {
      console.warn('Error recuperando solicitud de Firestore:', e);
    }
  }

  const commId = 'comm-' + Date.now();

  const newComm: Community = {
    id: commId,
    name: req ? req.communityName : 'Nueva Comunidad',
    slug: req ? req.communityName.toLowerCase().replace(/\s+/g, '-') : 'nueva-comunidad',
    description: req ? req.description : 'Comunidad canina oficial',
    logoUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
    instagramHandle: req ? req.instagramHandle : '@comunidad.perruna',
    region: req ? req.region : 'Metropolitana',
    comuna: req ? req.comuna : 'Santiago',
    status: 'active',
    accessType: req?.accessType || 'open',
    pendingMembers: [],
    isVerified: true,
    membersCount: 1,
    eventsCount: 0,
    primaryAdminId: req ? req.applicantId : adminUserId,
    secondaryAdmins: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    await setDoc(doc(db, 'communities', commId), {
      ...newComm,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'communityRequests', requestId), {
      status: 'approved',
      reviewedBy: adminUserId,
      reviewedAt: serverTimestamp()
    });
    if (req?.applicantId) {
      await updateDoc(doc(db, 'users', req.applicantId), {
        roleType: 'primary_admin',
        communityIdManaged: commId,
        communityNameManaged: newComm.name,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Aprobando comunidad en Firestore/local:', err);
  }

  localCommunities.unshift(newComm);
  if (req) req.status = 'approved';

  await logAuditAction(
    adminUserId,
    'COMMUNITY_APPROVE',
    'communities',
    commId,
    `Comunidad aprobada: ${newComm.name}. Solicitante asignado como Administrador Principal (R-0601, R-0602).`
  );

  return { success: true, communityId: commId, message: `¡Comunidad "${newComm.name}" aprobada exitosamente y publicada en la app!` };
};

export const rejectCommunityRequest = async (
  requestId: string,
  adminUserId: string,
  reason: string = 'Antecedentes no verificables'
): Promise<{ success: boolean; message: string }> => {
  try {
    await updateDoc(doc(db, 'communityRequests', requestId), {
      status: 'rejected',
      adminReviewNotes: reason,
      reviewedBy: adminUserId,
      reviewedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Rechazando comunidad en Firestore/local:', err);
  }

  const req = localRequests.find(r => r.id === requestId);
  if (req) {
    req.status = 'rejected';
    req.feedbackNote = reason;
  }

  await logAuditAction(
    adminUserId,
    'COMMUNITY_REJECT',
    'communityRequests',
    requestId,
    `Solicitud de comunidad rechazada: ${reason}`
  );

  return { success: true, message: 'Solicitud rechazada.' };
};

export const getCommunities = async (): Promise<Community[]> => {
  try {
    const snap = await getDocs(collection(db, 'communities'));
    const list: Community[] = [];
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300',
          coverPhotoUrl: data.coverPhotoUrl || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
          instagramHandle: data.instagramHandle || '',
          region: data.region || 'Metropolitana',
          comuna: data.comuna || 'Santiago',
          status: (data.status === 'activa' ? 'active' : (data.status || 'active')),
          accessType: (data.accessType || 'open') as CommunityAccessType,
          pendingMembers: data.pendingMembers || [],
          isVerified: !!data.isVerified,
          membersCount: data.membersCount || 1,
          approximateMembers: data.approximateMembers || data.membersCount || 1,
          members: data.members || (data.primaryAdminId ? [data.primaryAdminId] : []),
          eventsCount: data.eventsCount || 0,
          primaryAdminId: data.primaryAdminId || '',
          secondaryAdmins: data.secondaryAdmins || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        });
      });
    }
    localCommunities = list;
    return list;
  } catch (err) {
    console.warn('Leyendo comunidades locales:', err);
    return [...localCommunities];
  }
};

export const joinCommunity = async (
  communityId: string, 
  userId: string
): Promise<{ 
  success: boolean; 
  status: 'JOINED' | 'PENDING_APPROVAL' | 'ALREADY_MEMBER' | 'ALREADY_PENDING'; 
  message: string 
}> => {
  try {
    const commRef = doc(db, 'communities', communityId);
    const commSnap = await getDoc(commRef);
    if (commSnap.exists()) {
      const data = commSnap.data();
      const currentMembers: string[] = data.members || [];
      const pending: string[] = data.pendingMembers || [];
      const accessType: CommunityAccessType = (data.accessType || 'open') as CommunityAccessType;

      if (currentMembers.includes(userId) || data.primaryAdminId === userId) {
        return { success: false, status: 'ALREADY_MEMBER', message: `¡Ya eres miembro de la comunidad ${data.name || ''}!` };
      }

      // Si requiere aprobación del creador
      if (accessType === 'approval_required') {
        if (pending.includes(userId)) {
          return { success: false, status: 'ALREADY_PENDING', message: `Tu solicitud ya fue enviada y está en revisión por el creador.` };
        }
        await updateDoc(commRef, {
          pendingMembers: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
        const local = localCommunities.find(c => c.id === communityId);
        if (local) {
          if (!local.pendingMembers) local.pendingMembers = [];
          if (!local.pendingMembers.includes(userId)) local.pendingMembers.push(userId);
        }
        await logAuditAction(
          userId,
          'COMMUNITY_JOIN_REQUEST',
          'communities',
          communityId,
          `Solicitud de ingreso enviada a comunidad privada: ${data.name}`
        );
        return {
          success: true,
          status: 'PENDING_APPROVAL',
          message: `¡Solicitud enviada! El creador de la comunidad revisará tu perfil para autorizar tu ingreso.`
        };
      }

      // Acceso Abierto Directo
      const newCount = (data.membersCount || 0) + 1;
      await updateDoc(commRef, {
        membersCount: newCount,
        members: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      const local = localCommunities.find(c => c.id === communityId);
      if (local) {
        local.membersCount = newCount;
        if (!local.members) local.members = [];
        if (!local.members.includes(userId)) local.members.push(userId);
      }
      return { success: true, status: 'JOINED', message: `¡Te has unido exitosamente a ${data.name}!` };
    }
  } catch (err) {
    console.warn('Error actualizando miembros en Firestore:', err);
  }

  const comm = localCommunities.find(c => c.id === communityId);
  if (!comm) return { success: false, status: 'ALREADY_MEMBER', message: 'Comunidad no encontrada.' };

  if (!comm.members) comm.members = comm.primaryAdminId ? [comm.primaryAdminId] : [];
  if (!comm.pendingMembers) comm.pendingMembers = [];

  if (comm.members.includes(userId) || comm.primaryAdminId === userId) {
    return { success: false, status: 'ALREADY_MEMBER', message: `¡Ya eres miembro de la comunidad ${comm.name}!` };
  }

  if (comm.accessType === 'approval_required') {
    if (comm.pendingMembers.includes(userId)) {
      return { success: false, status: 'ALREADY_PENDING', message: `Tu solicitud ya fue enviada y está en revisión por el creador.` };
    }
    comm.pendingMembers.push(userId);
    return { success: true, status: 'PENDING_APPROVAL', message: `¡Solicitud enviada! El creador revisará tu ingreso.` };
  }

  comm.members.push(userId);
  comm.membersCount = (comm.membersCount || 0) + 1;
  return { success: true, status: 'JOINED', message: '¡Te has unido exitosamente a ' + comm.name + '!' };
};

/**
 * Aprobar aspirante a la comunidad
 */
export const approveMemberRequest = async (
  communityId: string,
  applicantUserId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const commRef = doc(db, 'communities', communityId);
    const snap = await getDoc(commRef);
    if (snap.exists()) {
      const data = snap.data();
      const newCount = (data.membersCount || 0) + 1;
      const pending: string[] = (data.pendingMembers || []).filter((id: string) => id !== applicantUserId);

      await updateDoc(commRef, {
        membersCount: newCount,
        members: arrayUnion(applicantUserId),
        pendingMembers: pending,
        updatedAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.warn('Error aprobando miembro en Firestore:', e);
  }

  const comm = localCommunities.find(c => c.id === communityId);
  if (comm) {
    if (!comm.members) comm.members = [];
    if (!comm.members.includes(applicantUserId)) comm.members.push(applicantUserId);
    comm.pendingMembers = (comm.pendingMembers || []).filter(id => id !== applicantUserId);
    comm.membersCount = (comm.membersCount || 0) + 1;
  }

  // Otorgar Huellitas de bienvenida por unirse a la comunidad (+10 🐾)
  await awardPaws(applicantUserId, 'community_joined', communityId);

  await logAuditAction(
    adminUserId,
    'COMMUNITY_MEMBER_APPROVED',
    'communities',
    communityId,
    `Aspirante ${applicantUserId} aprobado para ingresar a la comunidad`
  );

  return { success: true, message: '¡Solicitud aprobada! El usuario ahora es miembro oficial.' };
};

/**
 * Rechazar solicitud de aspirante
 */
export const rejectMemberRequest = async (
  communityId: string,
  applicantUserId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const commRef = doc(db, 'communities', communityId);
    const snap = await getDoc(commRef);
    if (snap.exists()) {
      const data = snap.data();
      const pending: string[] = (data.pendingMembers || []).filter((id: string) => id !== applicantUserId);
      await updateDoc(commRef, {
        pendingMembers: pending,
        updatedAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.warn('Error rechazando miembro en Firestore:', e);
  }

  const comm = localCommunities.find(c => c.id === communityId);
  if (comm) {
    comm.pendingMembers = (comm.pendingMembers || []).filter(id => id !== applicantUserId);
  }

  await logAuditAction(
    adminUserId,
    'COMMUNITY_MEMBER_REJECTED',
    'communities',
    communityId,
    `Solicitud del usuario ${applicantUserId} rechazada por el administrador`
  );

  return { success: true, message: 'Solicitud rechazada.' };
};

/**
 * Expulsar a un miembro/tutor de la comunidad por incumplimiento de normas o convivencia
 */
export const removeMemberFromCommunity = async (
  communityId: string,
  memberUserId: string,
  adminUserId: string,
  reason: string = 'Incumplimiento de las normas de la comunidad'
): Promise<{ success: boolean; message: string }> => {
  const comm = localCommunities.find(c => c.id === communityId);
  if (comm && comm.primaryAdminId === memberUserId) {
    return { success: false, message: 'No puedes expulsar al Administrador Principal (Titular) de la comunidad.' };
  }

  try {
    const commRef = doc(db, 'communities', communityId);
    const snap = await getDoc(commRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.primaryAdminId === memberUserId) {
        return { success: false, message: 'No puedes expulsar al Administrador Principal de la comunidad.' };
      }
      const updatedMembers = (data.members || []).filter((id: string) => id !== memberUserId);
      const newCount = Math.max(1, (data.membersCount || 1) - 1);

      await updateDoc(commRef, {
        members: updatedMembers,
        membersCount: newCount,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Error eliminando miembro en Firestore:', err);
  }

  if (comm) {
    comm.members = (comm.members || []).filter(id => id !== memberUserId);
    comm.membersCount = Math.max(1, (comm.membersCount || 1) - 1);
  }

  await logAuditAction(
    adminUserId,
    'COMMUNITY_MEMBER_EXPELLED',
    'communities',
    communityId,
    `Tutor ${memberUserId} expulsado de la comunidad. Motivo: ${reason}`
  );

  return { success: true, message: 'El tutor ha sido expulsado exitosamente de la comunidad.' };
};

/**
 * Cambiar tipo de acceso de la comunidad (Abierta vs Requiere Aprobación)
 */
export const updateCommunityAccessType = async (
  communityId: string,
  accessType: CommunityAccessType,
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await updateDoc(doc(db, 'communities', communityId), {
      accessType,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Error actualizando accessType en Firestore:', e);
  }

  const comm = localCommunities.find(c => c.id === communityId);
  if (comm) {
    comm.accessType = accessType;
  }

  await logAuditAction(
    adminUserId,
    'COMMUNITY_ACCESS_TYPE_CHANGE',
    'communities',
    communityId,
    `Tipo de acceso configurado a: ${accessType === 'approval_required' ? 'Requiere Aprobación' : 'Abierta a todos'}`
  );

  return { 
    success: true, 
    message: accessType === 'approval_required' 
      ? 'La comunidad ahora requiere aprobación de nuevos miembros.' 
      : 'La comunidad ahora es abierta para que cualquiera se una con 1 clic.' 
  };
};

export const createOfficialCommunity = async (
  communityData: {
    name: string;
    description: string;
    instagramHandle: string;
    region: string;
    comuna: string;
    primaryAdminId: string;
    logoUrl?: string;
    accessType?: CommunityAccessType;
  }
): Promise<{ success: boolean; id?: string; message: string }> => {
  const commId = 'comm-' + Date.now();
  const newComm: Community = {
    id: commId,
    name: communityData.name,
    slug: communityData.name.toLowerCase().replace(/\s+/g, '-'),
    description: communityData.description || 'Comunidad canina oficial.',
    logoUrl: communityData.logoUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
    instagramHandle: communityData.instagramHandle || '@juntitas.app',
    region: communityData.region || 'Metropolitana',
    comuna: communityData.comuna || 'Santiago',
    status: 'active',
    accessType: communityData.accessType || 'open',
    pendingMembers: [],
    isVerified: true,
    membersCount: 1,
    approximateMembers: 1,
    eventsCount: 0,
    primaryAdminId: communityData.primaryAdminId,
    secondaryAdmins: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    await setDoc(doc(db, 'communities', commId), {
      ...newComm,
      members: [communityData.primaryAdminId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Error creando comunidad oficial en Firestore:', err);
  }

  localCommunities.unshift(newComm);
  await logAuditAction(
    communityData.primaryAdminId,
    'COMMUNITY_CREATE_OFFICIAL',
    'communities',
    commId,
    `Comunidad oficial creada directamente: ${newComm.name} (${newComm.accessType})`
  );

  return { success: true, id: commId, message: `¡Comunidad "${newComm.name}" creada y publicada oficialmente!` };
};

export const DEFAULT_SECONDARY_PERMISSIONS: SecondaryAdminPermissions = {
  canCreateEvents: true,
  canEditEvents: true,
  canManageMembers: false,
  canModeratePosts: true,
  canManageAlbums: true,
  canManageVendors: false
};

export const getSecondaryAdminsForCommunity = (community: Community): SecondaryAdminInfo[] => {
  if (community?.secondaryAdmins && community.secondaryAdmins.length > 0) {
    return community.secondaryAdmins;
  }
  return [
    {
      userId: 'sec-admin-1',
      name: 'Andrea Soto',
      email: 'andrea.soto@goldenretrieverschile.cl',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      permissions: {
        canCreateEvents: true,
        canEditEvents: true,
        canManageMembers: false,
        canModeratePosts: true,
        canManageAlbums: true,
        canManageVendors: false
      },
      assignedAt: new Date()
    }
  ];
};

export const updateSecondaryAdminPermissions = async (
  communityId: string,
  adminUserId: string,
  permissions: SecondaryAdminPermissions,
  operatorUserId: string
): Promise<{ success: boolean; message: string; updatedAdmins?: SecondaryAdminInfo[] }> => {
  const comm = localCommunities.find(c => c.id === communityId);
  let admins = comm?.secondaryAdmins && comm.secondaryAdmins.length > 0
    ? comm.secondaryAdmins
    : getSecondaryAdminsForCommunity(comm || ({} as any));
  
  const target = admins.find(a => a.userId === adminUserId);
  if (target) {
    target.permissions = permissions;
  }
  if (comm) {
    comm.secondaryAdmins = [...admins];
  }

  try {
    await updateDoc(doc(db, 'communities', communityId), {
      secondaryAdmins: admins,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Actualizando permisos de sub-admin localmente:', err);
  }

  await logAuditAction(
    operatorUserId,
    'SECONDARY_ADMIN_PERMISSIONS_UPDATE',
    'communities',
    communityId,
    `Permisos de administrador secundario actualizados para ${target?.name || adminUserId}`
  );

  return { success: true, message: '¡Permisos delegados actualizados exitosamente!', updatedAdmins: admins };
};

export const removeSecondaryAdmin = async (
  communityId: string,
  adminUserId: string,
  operatorUserId: string
): Promise<{ success: boolean; message: string; updatedAdmins?: SecondaryAdminInfo[] }> => {
  const comm = localCommunities.find(c => c.id === communityId);
  let admins = (comm?.secondaryAdmins && comm.secondaryAdmins.length > 0
    ? comm.secondaryAdmins
    : getSecondaryAdminsForCommunity(comm || ({} as any))
  ).filter(a => a.userId !== adminUserId);
  
  if (comm) {
    comm.secondaryAdmins = [...admins];
  }

  try {
    await updateDoc(doc(db, 'communities', communityId), {
      secondaryAdmins: admins,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Removiendo sub-admin localmente:', err);
  }

  await logAuditAction(
    operatorUserId,
    'SECONDARY_ADMIN_REVOKE',
    'communities',
    communityId,
    `Rol de administrador secundario revocado para ${adminUserId}`
  );

  return { success: true, message: 'Rol de administrador secundario revocado exitosamente.', updatedAdmins: admins };
};

export const addSecondaryAdmin = async (
  communityId: string,
  adminData: {
    name: string;
    email: string;
    permissions?: SecondaryAdminPermissions;
  },
  operatorUserId: string
): Promise<{ success: boolean; message: string; updatedAdmins?: SecondaryAdminInfo[] }> => {
  const comm = localCommunities.find(c => c.id === communityId);
  let admins = comm?.secondaryAdmins && comm.secondaryAdmins.length > 0
    ? [...comm.secondaryAdmins]
    : [...getSecondaryAdminsForCommunity(comm || ({} as any))];

  const newAdmin: SecondaryAdminInfo = {
    userId: 'sec-' + Date.now(),
    name: adminData.name,
    email: adminData.email,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    permissions: adminData.permissions || DEFAULT_SECONDARY_PERMISSIONS,
    assignedAt: new Date()
  };

  admins.push(newAdmin);
  if (comm) {
    comm.secondaryAdmins = admins;
  }

  try {
    await updateDoc(doc(db, 'communities', communityId), {
      secondaryAdmins: admins,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Agregando sub-admin localmente:', err);
  }

  await logAuditAction(
    operatorUserId,
    'SECONDARY_ADMIN_ASSIGN',
    'communities',
    communityId,
    `Nuevo administrador secundario delegado: ${adminData.name} (${adminData.email})`
  );

  return { 
    success: true, 
    message: `¡${adminData.name} ha sido designado(a) como Administrador(a) Secundario(a)!`, 
    updatedAdmins: admins 
  };
};

export const getManagedCommunitiesForUser = async (
  userId: string,
  roleType?: string,
  communityIdManaged?: string,
  userEmail?: string
): Promise<Community[]> => {
  if (!userId) return [];
  const all = await getCommunities();
  return all.filter(c => {
    // 1. Es el Administrador Principal (Titular) registrado con su ID
    if (c.primaryAdminId && c.primaryAdminId === userId) return true;

    // 2. Es Administrador Secundario con permiso explícito para crear juntas
    const sec = c.secondaryAdmins?.find(s => 
      (s.userId && s.userId === userId) || 
      (userEmail && s.email && s.email.toLowerCase() === userEmail.toLowerCase())
    );
    if (sec && sec.permissions?.canCreateEvents) return true;

    // 3. Su perfil activo o asignación gestiona específicamente ESTA comunidad
    if (roleType === 'primary_admin' && communityIdManaged && communityIdManaged === c.id) return true;
    if (roleType === 'secondary_admin' && communityIdManaged && communityIdManaged === c.id) return true;

    return false;
  });
};

export const updateCommunityPhotosAndInfo = async (
  communityId: string,
  updates: {
    logoUrl?: string;
    coverPhotoUrl?: string;
    description?: string;
    instagramHandle?: string;
  },
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const commRef = doc(db, 'communities', communityId);
    await updateDoc(commRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Actualizando foto/info de comunidad en Firestore:', err);
  }

  const local = localCommunities.find(c => c.id === communityId);
  if (local) {
    if (updates.logoUrl) local.logoUrl = updates.logoUrl;
    if (updates.coverPhotoUrl) local.coverPhotoUrl = updates.coverPhotoUrl;
    if (updates.description) local.description = updates.description;
    if (updates.instagramHandle) local.instagramHandle = updates.instagramHandle;
  }

  await logAuditAction(
    adminUserId,
    'COMMUNITY_UPDATE_PHOTO_INFO',
    'communities',
    communityId,
    `Administrador ${adminUserId} actualizó imagen/información de la comunidad ${communityId}`
  );

  return { success: true, message: '¡Foto e información de la comunidad actualizadas exitosamente!' };
};
