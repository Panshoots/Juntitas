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
import { Community, CommunityRequest, SecondaryAdminPermissions } from '../models/Community';
import { logAuditAction } from './auditService';

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

  return { success: true, id: req.id, message: 'Solicitud de comunidad enviada para revisión oficial por el Super Admin.' };
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
          adminReviewNotes: data.adminReviewNotes,
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
  const req = localRequests.find(r => r.id === requestId);
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
    status: 'activa',
    isVerified: true,
    joinType: 'libre',
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
  } catch (err) {
    console.warn('Aprobando comunidad localmente:', err);
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

  return { success: true, communityId: commId, message: `¡Comunidad "${newComm.name}" aprobada exitosamente!` };
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
          status: data.status || 'activa',
          isVerified: !!data.isVerified,
          joinType: data.joinType || 'libre',
          membersCount: data.membersCount || 1,
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

export const joinCommunity = async (communityId: string, userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const commRef = doc(db, 'communities', communityId);
    const commSnap = await getDoc(commRef);
    if (commSnap.exists()) {
      const data = commSnap.data();
      const currentMembers: string[] = data.members || [];
      if (currentMembers.includes(userId)) {
        return { success: false, message: `¡Ya eres miembro de la comunidad ${data.name || ''}!` };
      }
      const newCount = (data.membersCount || 0) + 1;
      await updateDoc(commRef, {
        membersCount: newCount,
        members: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      const local = localCommunities.find(c => c.id === communityId);
      if (local) local.membersCount = newCount;
      return { success: true, message: `¡Te has unido exitosamente a ${data.name}!` };
    }
  } catch (err) {
    console.warn('Error actualizando miembros en Firestore:', err);
  }

  const comm = localCommunities.find(c => c.id === communityId);
  if (!comm) return { success: false, message: 'Comunidad no encontrada.' };

  comm.membersCount += 1;
  return { success: true, message: '¡Te has unido exitosamente a ' + comm.name + '!' };
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
    status: 'activa',
    isVerified: true,
    joinType: 'libre',
    membersCount: 1,
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
    `Comunidad oficial creada directamente: ${newComm.name}`
  );

  return { success: true, id: commId, message: `¡Comunidad "${newComm.name}" creada y publicada oficialmente!` };
};
