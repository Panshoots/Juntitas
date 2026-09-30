import { 
  doc, 
  updateDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppUser, IdentityVerificationData, IdentityVerificationStatus } from '../models/User';
import { logAuditAction } from './auditService';
import { awardPaws } from './gamificationService';
import { cleanUndefined, getUsersFromDb } from './userService';
import { 
  notifySuperAdminOfNewIdentityVerification, 
  notifyUserOfIdentityApproval, 
  notifyUserOfIdentityRejection,
  sendNotificationToUser
} from './notificationService';

/**
 * Limpia y normaliza un RUT (elimina puntos y guiones, en mayúsculas)
 */
export const cleanRut = (rut: string): string => {
  return typeof rut === 'string'
    ? rut.replace(/[^0-9kK]/g, '').toUpperCase()
    : '';
};

/**
 * Valida un RUT chileno usando el algoritmo oficial de Módulo 11
 */
export const validateRutChile = (rawRut: string): boolean => {
  const rut = cleanRut(rawRut);
  if (rut.length < 7 || rut.length > 9) return false;

  const body = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();

  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDv = '';
  if (remainder === 11) expectedDv = '0';
  else if (remainder === 10) expectedDv = 'K';
  else expectedDv = remainder.toString();

  return dv === expectedDv;
};

/**
 * Formatea un RUT con puntos y guion: XX.XXX.XXX-X
 */
export const formatRutChile = (rawRut: string): string => {
  const cleaned = cleanRut(rawRut);
  if (!cleaned) return '';
  if (cleaned.length === 1) return cleaned;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  let formattedBody = '';
  let count = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    formattedBody = body[i] + formattedBody;
    count++;
    if (count % 3 === 0 && i > 0) {
      formattedBody = '.' + formattedBody;
    }
  }

  return `${formattedBody}-${dv}`;
};

/**
 * Enviar solicitud de verificación de identidad oficial con cédula
 */
/**
 * Envío de solicitud para revisión manual con fotos de carnet
 */
export const submitIdentityVerification = async (
  userId: string,
  payload: {
    rut: string;
    documentNumber?: string;
    frontIdCardUrl: string;
    backIdCardUrl: string;
    selfieUrl?: string;
  }
): Promise<{ success: boolean; message: string; updatedUser?: AppUser }> => {
  if (!payload.frontIdCardUrl || !payload.backIdCardUrl) {
    return { success: false, message: 'Debes adjuntar ambas fotografías de tu carnet (frente y dorso).' };
  }

  const formattedRut = formatRutChile(payload.rut) || payload.rut;

  const now = new Date();
  const identityData: IdentityVerificationData = {
    rut: formattedRut,
    documentNumber: payload.documentNumber?.trim() || undefined,
    frontIdCardUrl: payload.frontIdCardUrl,
    backIdCardUrl: payload.backIdCardUrl,
    selfieUrl: payload.selfieUrl,
    submittedAt: now,
    verificationMethod: 'manual'
  };

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, cleanUndefined({
      identityStatus: 'pending',
      identityData: {
        ...identityData,
        submittedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Error guardando verificación manual en Firestore:', err);
  }

  // Actualizar en caché local
  const users = await getUsersFromDb();
  const targetUser = users.find(u => u.id === userId);
  let updatedUser: AppUser | undefined;
  if (targetUser) {
    targetUser.identityStatus = 'pending';
    targetUser.identityData = identityData;
    targetUser.updatedAt = now;
    updatedUser = { ...targetUser };
  }

  await logAuditAction(
    userId,
    'IDENTITY_VERIFICATION_SUBMITTED',
    'users',
    userId,
    `Solicitud de verificación manual enviada (RUT: ${formattedRut})`
  );

  // Notificar al Super Administrador en el CRM
  await notifySuperAdminOfNewIdentityVerification(
    targetUser?.displayName || 'Tutor',
    userId,
    formattedRut
  );

  return { 
    success: true, 
    message: 'Tus fotos fueron enviadas con éxito. El equipo revisará tus documentos en breve.',
    updatedUser
  };
};

/**
 * Aprobar verificación de identidad por el Super Administrador
 */
export const approveIdentityVerification = async (
  targetUserId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string; updatedUser?: AppUser }> => {
  try {
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, cleanUndefined({
      isIdentityVerified: true,
      identityStatus: 'verified',
      'identityData.reviewedAt': serverTimestamp(),
      'identityData.reviewedBy': adminUserId,
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Error aprobando identidad en Firestore, aplicando en memoria:', err);
  }

  const users = await getUsersFromDb();
  const targetUser = users.find(u => u.id === targetUserId);
  let updatedUser: AppUser | undefined;
  if (targetUser) {
    targetUser.isIdentityVerified = true;
    targetUser.identityStatus = 'verified';
    if (targetUser.identityData) {
      targetUser.identityData.reviewedAt = new Date();
      targetUser.identityData.reviewedBy = adminUserId;
      delete targetUser.identityData.rejectionReason;
    }
    targetUser.updatedAt = new Date();
    updatedUser = { ...targetUser };
  }

  // Bonificación por verificar identidad (+50 Huellitas 🐾)
  await awardPaws(targetUserId, 'account_verified', targetUserId);

  await logAuditAction(
    adminUserId,
    'IDENTITY_VERIFICATION_APPROVE',
    'users',
    targetUserId,
    `Identidad oficial verificada y aprobada para el usuario ${targetUser?.displayName || targetUserId}`
  );

  // Notificar al usuario con felicitaciones
  await notifyUserOfIdentityApproval(targetUserId);

  return {
    success: true,
    message: `¡Identidad de ${targetUser?.displayName || 'Usuario'} verificada exitosamente! Se le otorgó la insignia oficial.`,
    updatedUser
  };
};

/**
 * Rechazar verificación de identidad por el Super Administrador
 */
export const rejectIdentityVerification = async (
  targetUserId: string,
  adminUserId: string,
  reason: string = 'Fotografía borrosa o no legible'
): Promise<{ success: boolean; message: string; updatedUser?: AppUser }> => {
  try {
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, cleanUndefined({
      isIdentityVerified: false,
      identityStatus: 'rejected',
      'identityData.rejectionReason': reason,
      'identityData.reviewedAt': serverTimestamp(),
      'identityData.reviewedBy': adminUserId,
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Error rechazando identidad en Firestore, aplicando en memoria:', err);
  }

  const users = await getUsersFromDb();
  const targetUser = users.find(u => u.id === targetUserId);
  let updatedUser: AppUser | undefined;
  if (targetUser) {
    targetUser.isIdentityVerified = false;
    targetUser.identityStatus = 'rejected';
    if (targetUser.identityData) {
      targetUser.identityData.rejectionReason = reason;
      targetUser.identityData.reviewedAt = new Date();
      targetUser.identityData.reviewedBy = adminUserId;
    }
    targetUser.updatedAt = new Date();
    updatedUser = { ...targetUser };
  }

  await logAuditAction(
    adminUserId,
    'IDENTITY_VERIFICATION_REJECT',
    'users',
    targetUserId,
    `Verificación de identidad rechazada: ${reason}`
  );

  // Notificar al usuario con el motivo
  await notifyUserOfIdentityRejection(targetUserId, reason);

  return {
    success: true,
    message: 'Solicitud de verificación rechazada.',
    updatedUser
  };
};
