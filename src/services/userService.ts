import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppUser, UserStatus, UserRole } from '../models/User';
import { logAuditAction } from './auditService';

// Helper para eliminar cualquier propiedad con valor undefined antes de enviar a Firestore
export const cleanUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

// Almacén en memoria sincronizado con Firestore
let localUsers: AppUser[] = [];

export const getUsersFromDb = async (): Promise<AppUser[]> => {
  try {
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const users: AppUser[] = [];
      snap.forEach(d => {
        const data = d.data();
        users.push({
          id: d.id,
          email: data.email || '',
          displayName: data.displayName || 'Usuario',
          photoURL: data.photoURL || null,
          bio: data.bio || '',
          roleType: data.roleType || 'member',
          filterProfileType: data.filterProfileType || 'tutor',
          requestedCommunityName: data.requestedCommunityName,
          requestedBusinessName: data.requestedBusinessName,
          location: data.location || { region: 'Metropolitana', comuna: 'Santiago' },
          contact: data.contact || { isPublic: false },
          privacy: data.privacy || { showDogsPublicly: true, showCommunitiesPublicly: true, showAttendancePublicly: true },
          pawBalance: data.pawBalance || 0,
          isSuperAdmin: !!data.isSuperAdmin,
          status: data.status || 'ACTIVO',
          suspendedReason: data.suspendedReason,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        });
      });
      localUsers = users;
      return users;
    }
  } catch (err) {
    console.warn('Firestore offline o reglas pendientes, usando datos locales:', err);
  }
  return [...localUsers];
};

export const createUserInDb = async (user: AppUser): Promise<{ success: boolean; message: string }> => {
  try {
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, cleanUndefined({
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('No se pudo guardar directo en Firestore, guardando en caché local:', err);
  }

  // Guardar en caché local
  const existingIdx = localUsers.findIndex(u => u.id === user.id);
  if (existingIdx >= 0) {
    localUsers[existingIdx] = user;
  } else {
    localUsers.unshift(user);
  }

  await logAuditAction(
    user.id,
    'USER_REGISTER',
    'users',
    user.id,
    `Nuevo registro en la app con perfil: ${user.filterProfileType || user.roleType}`,
    { email: user.email, status: user.status }
  );

  return { success: true, message: 'Usuario registrado exitosamente.' };
};

export const updateUserStatusInDb = async (
  userId: string, 
  newStatus: UserStatus, 
  reason: string, 
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status: newStatus,
      suspendedReason: reason || null,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Actualizando status localmente:', err);
  }

  const u = localUsers.find(user => user.id === userId);
  if (u) {
    u.status = newStatus;
    u.suspendedReason = reason;
  }

  await logAuditAction(
    adminUserId,
    'USER_STATUS_CHANGE',
    'users',
    userId,
    reason || `Cambio de estado a ${newStatus}`,
    { newStatus, oldStatus: u?.status }
  );

  return { success: true, message: `Estado del usuario actualizado a ${newStatus}.` };
};

export const updateUserRoleInDb = async (
  userId: string, 
  newRole: UserRole, 
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  const isSuper = newRole === 'super_admin';

  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      roleType: newRole,
      isSuperAdmin: isSuper,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Actualizando rol localmente:', err);
  }

  const u = localUsers.find(user => user.id === userId);
  if (u) {
    u.roleType = newRole;
    u.isSuperAdmin = isSuper;
  }

  await logAuditAction(
    adminUserId,
    'USER_ROLE_CHANGE',
    'users',
    userId,
    `Cambio de rol asignado a ${newRole}`,
    { newRole }
  );

  return { success: true, message: `Rol actualizado a ${newRole}.` };
};

export const updateUserDetailsInDb = async (
  userId: string, 
  updates: Partial<AppUser>, 
  adminUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Actualizando detalles localmente:', err);
  }

  const u = localUsers.find(user => user.id === userId);
  if (u) {
    Object.assign(u, updates);
  }

  await logAuditAction(
    adminUserId,
    'USER_UPDATE_DATA',
    'users',
    userId,
    'Actualización de datos de usuario desde CRM',
    updates
  );

  return { success: true, message: 'Datos de usuario actualizados.' };
};

export const getUserByIdFromDb = async (userId: string): Promise<AppUser | null> => {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data();
      return { id: snap.id, ...data } as AppUser;
    }
  } catch (e) {
    console.warn('Error fetching user by id:', e);
  }
  return localUsers.find(u => u.id === userId) || null;
};
