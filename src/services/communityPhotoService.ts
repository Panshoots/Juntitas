import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  increment, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { cleanUndefined } from './userService';
import { logAuditAction } from './auditService';
import { awardPaws } from './gamificationService';

export interface CommunityPhoto {
  id: string;
  communityId?: string;
  communityName?: string;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar?: string;
  dogName?: string;
  photoUrl: string;
  caption: string;
  likesCount: number;
  likedBy?: string[];
  status?: 'active' | 'blocked';
  moderationReason?: string;
  createdAt: any;
}

let localPhotos: CommunityPhoto[] = [
  {
    id: 'photo-seed-1',
    communityId: 'comm-1',
    communityName: 'Golden Retrievers Chile',
    uploaderId: 'user-valen',
    uploaderName: 'Valentina Silva',
    dogName: 'Firulais',
    photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
    caption: '¡Disfrutando la tarde en el Parque Bicentenario con la manada!',
    likesCount: 14,
    likedBy: [],
    status: 'active',
    createdAt: new Date()
  },
  {
    id: 'photo-seed-2',
    communityId: 'comm-1',
    communityName: 'Golden Retrievers Chile',
    uploaderId: 'user-carlos',
    uploaderName: 'Carlos Morales',
    dogName: 'Thor',
    photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800',
    caption: 'Listos para la próxima junta oficial de este fin de semana.',
    likesCount: 9,
    likedBy: [],
    status: 'active',
    createdAt: new Date()
  }
];

export const getCommunityPhotos = async (communityId?: string, includeBlocked?: boolean): Promise<CommunityPhoto[]> => {
  try {
    const coll = collection(db, 'communityPhotos');
    const q = communityId 
      ? query(coll, where('communityId', '==', communityId), limit(50))
      : query(coll, limit(50));

    const snap = await getDocs(q);
    const list: CommunityPhoto[] = [];
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          communityId: data.communityId,
          communityName: data.communityName,
          uploaderId: data.uploaderId,
          uploaderName: data.uploaderName || 'Tutor Canino',
          uploaderAvatar: data.uploaderAvatar,
          dogName: data.dogName,
          photoUrl: data.photoUrl,
          caption: data.caption || '',
          likesCount: data.likesCount || 0,
          likedBy: data.likedBy || [],
          status: data.status || 'active',
          moderationReason: data.moderationReason || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        });
      });
      localPhotos = list;
      const filtered = includeBlocked ? list : list.filter(p => p.status !== 'blocked');
      return communityId ? filtered.filter(p => p.communityId === communityId) : filtered;
    }
  } catch (err) {
    console.warn('Leyendo fotos comunitarias locales:', err);
  }
  const filteredLocal = includeBlocked ? localPhotos : localPhotos.filter(p => p.status !== 'blocked');
  return communityId ? filteredLocal.filter(p => p.communityId === communityId) : [...filteredLocal];
};

export const uploadCommunityPhoto = async (photoData: {
  communityId?: string;
  communityName?: string;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar?: string;
  dogName?: string;
  photoUrl: string;
  caption: string;
}): Promise<{ success: boolean; photo?: CommunityPhoto; message: string }> => {
  const photoId = 'photo-' + Date.now();
  const newPhoto: CommunityPhoto = {
    id: photoId,
    communityId: photoData.communityId || 'general',
    communityName: photoData.communityName || 'Comunidad Juntitas',
    uploaderId: photoData.uploaderId,
    uploaderName: photoData.uploaderName,
    uploaderAvatar: photoData.uploaderAvatar,
    dogName: photoData.dogName || 'Mi Perrito',
    photoUrl: photoData.photoUrl,
    caption: photoData.caption.trim(),
    likesCount: 0,
    likedBy: [],
    createdAt: new Date()
  };

  try {
    await setDoc(doc(db, 'communityPhotos', photoId), cleanUndefined({
      ...newPhoto,
      createdAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Guardando foto comunitaria localmente:', err);
  }

  localPhotos.unshift(newPhoto);

  // Otorgar Huellitas por compartir fotos (+15 Huellitas)
  await awardPaws(photoData.uploaderId, 'mission_completed', photoId);

  await logAuditAction(
    photoData.uploaderId,
    'COMMUNITY_PHOTO_UPLOAD',
    'communityPhotos',
    photoId,
    `Foto subida por ${photoData.uploaderName}: "${photoData.caption}"`
  );

  return { success: true, photo: newPhoto, message: '¡Foto compartida en la galería comunitaria! (+15 🐾 Huellitas otorgadas).' };
};

export const deleteCommunityPhoto = async (
  photoId: string, 
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await deleteDoc(doc(db, 'communityPhotos', photoId));
  } catch (err) {
    console.warn('Eliminando foto de Firestore:', err);
  }

  localPhotos = localPhotos.filter(p => p.id !== photoId);

  await logAuditAction(
    adminUserId,
    'COMMUNITY_PHOTO_DELETE',
    'communityPhotos',
    photoId,
    `Foto ${photoId} eliminada por moderador/administrador ${adminUserId}`
  );

  return { success: true, message: 'Foto eliminada de la galería comunitaria.' };
};

export const moderateCommunityPhoto = async (
  photoId: string,
  action: 'block' | 'activate' | 'edit_caption',
  adminUserId: string,
  reasonOrNewCaption: string
): Promise<{ success: boolean; message: string }> => {
  const photo = localPhotos.find(p => p.id === photoId);
  if (!photo) return { success: false, message: 'Foto no encontrada.' };

  const updates: any = {};
  if (action === 'block') {
    updates.status = 'blocked';
    updates.moderationReason = reasonOrNewCaption;
    photo.status = 'blocked';
    photo.moderationReason = reasonOrNewCaption;
  } else if (action === 'activate') {
    updates.status = 'active';
    updates.moderationReason = '';
    photo.status = 'active';
    photo.moderationReason = '';
  } else if (action === 'edit_caption') {
    updates.caption = reasonOrNewCaption;
    photo.caption = reasonOrNewCaption;
  }

  try {
    const photoRef = doc(db, 'communityPhotos', photoId);
    await updateDoc(photoRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Moderando foto localmente:', err);
  }

  await logAuditAction(
    adminUserId,
    `COMMUNITY_PHOTO_${action.toUpperCase()}`,
    'communityPhotos',
    photoId,
    `Acción: ${action}. Detalle/Motivo: ${reasonOrNewCaption}`
  );

  return { 
    success: true, 
    message: action === 'block' 
      ? 'Foto bloqueada por no cumplir las normas legales/comunitarias.' 
      : action === 'activate' 
        ? 'Foto reactivada y visible.' 
        : 'Pie de foto actualizado correctamente.' 
  };
};

/**
 * Dar o quitar like a una foto comunitaria (1 like por usuario)
 */
export const toggleLikeCommunityPhoto = async (
  photoId: string, 
  userId: string
): Promise<{ success: boolean; liked: boolean; newLikesCount: number; message: string }> => {
  const photo = localPhotos.find(p => p.id === photoId);
  const likedBy = photo?.likedBy || [];
  const alreadyLiked = likedBy.includes(userId);

  let newLikedBy: string[];
  let newLikesCount: number;

  if (alreadyLiked) {
    // Quitar like
    newLikedBy = likedBy.filter(id => id !== userId);
    newLikesCount = Math.max(0, (photo?.likesCount || 1) - 1);
  } else {
    // Dar like
    newLikedBy = [...likedBy, userId];
    newLikesCount = (photo?.likesCount || 0) + 1;
  }

  if (photo) {
    photo.likedBy = newLikedBy;
    photo.likesCount = newLikesCount;
  }

  try {
    const photoRef = doc(db, 'communityPhotos', photoId);
    await updateDoc(photoRef, {
      likedBy: newLikedBy,
      likesCount: newLikesCount
    });
  } catch (err) {
    console.warn('Actualizando like en Firestore:', err);
  }

  return {
    success: true,
    liked: !alreadyLiked,
    newLikesCount,
    message: alreadyLiked ? 'Like removido' : '¡Te gusta esta foto! ❤️'
  };
};
