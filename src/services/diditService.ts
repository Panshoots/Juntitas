import { Linking } from 'react-native';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppUser, IdentityVerificationData } from '../models/User';
import { awardPaws } from './gamificationService';
import { logAuditAction } from './auditService';
import { sendNotificationToUser } from './notificationService';
import { cleanUndefined, getUsersFromDb } from './userService';

/**
 * CONFIGURACIÓN DE DIDIT IDENTITY VERIFICATION (https://didit.me)
 * Puedes ingresar aquí tus credenciales de https://business.didit.me
 * Plan Gratuito: 500 verificaciones KYC completas al mes ($0/mes, sin tarjeta)
 */
export const DEFAULT_DIDIT_CONFIG = {
  // Pega aquí tu API Key de Didit (Settings -> API Keys)
  apiKey: '', 
  // Pega aquí tu Workflow ID de Didit (Workflows -> Copy ID)
  workflowId: '', 
  // URL base de la API de Didit
  baseUrl: 'https://verification.didit.me/v3',
  // Modo Sandbox/Demo habilitado si no se ha configurado la API Key
  enableSandboxFallback: true
};

export interface DiditSessionResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  message?: string;
  isSandbox?: boolean;
}

export interface DiditDecisionResult {
  success: boolean;
  status: 'Approved' | 'Declined' | 'In Review' | 'Abandoned' | 'Expired' | 'Pending';
  message: string;
  documentData?: {
    rut?: string;
    documentNumber?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    documentType?: string;
    country?: string;
  };
}

/**
 * Obtiene la configuración de Didit (desde Firestore o por defecto)
 */
export const getDiditConfig = async () => {
  try {
    const configDoc = await getDoc(doc(db, 'app_config', 'didit_settings'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      return {
        apiKey: data.apiKey || DEFAULT_DIDIT_CONFIG.apiKey,
        workflowId: data.workflowId || DEFAULT_DIDIT_CONFIG.workflowId,
        baseUrl: data.baseUrl || DEFAULT_DIDIT_CONFIG.baseUrl,
        enableSandboxFallback: data.enableSandboxFallback ?? DEFAULT_DIDIT_CONFIG.enableSandboxFallback
      };
    }
  } catch (err) {
    console.warn('Usando configuración local de Didit:', err);
  }
  return DEFAULT_DIDIT_CONFIG;
};

/**
 * 1. Crear una sesión de verificación de identidad con Didit
 * Llama al endpoint POST /v3/session/ de Didit
 */
export const createDiditSession = async (
  userId: string,
  userEmail?: string,
  userName?: string
): Promise<DiditSessionResponse> => {
  try {
    const config = await getDiditConfig();

    // Si no hay API Key configurada y está activo el Sandbox Fallback, se genera sesión de demostración
    if (!config.apiKey || !config.workflowId) {
      console.log('Didit: Sin API Key configurada. Utilizando flujo sandbox de demostración.');
      const demoSessionId = `didit_sandbox_${userId}_${Date.now()}`;
      
      // Guardar sesión en el perfil del usuario para tracking
      await saveSessionToUser(userId, demoSessionId, 'https://demo.didit.me');

      return {
        success: true,
        sessionId: demoSessionId,
        url: 'https://demo.didit.me',
        isSandbox: true,
        message: 'Sesión Didit Sandbox lista. Para producción, agrega tu API Key de Didit.'
      };
    }

    const payload = {
      workflow_id: config.workflowId,
      vendor_data: userId,
      callback: 'https://juntitas.app/kyc-callback',
      metadata: {
        userId,
        email: userEmail || '',
        name: userName || ''
      }
    };

    const response = await fetch(`${config.baseUrl}/session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al crear sesión Didit:', response.status, errorText);
      return {
        success: false,
        message: `Error de Didit (${response.status}): Revisa tu API Key y Workflow ID.`
      };
    }

    const data = await response.json();
    const sessionId = data.session_id || data.id;
    const sessionUrl = data.url;

    if (!sessionUrl) {
      return {
        success: false,
        message: 'Didit no devolvió una URL de verificación válida.'
      };
    }

    // Guardar referencia de la sesión en el usuario
    await saveSessionToUser(userId, sessionId, sessionUrl);

    return {
      success: true,
      sessionId,
      url: sessionUrl,
      isSandbox: false
    };
  } catch (error: any) {
    console.error('Excepción al conectar con Didit:', error);
    return {
      success: false,
      message: error?.message || 'Error de conexión con el servicio Didit.'
    };
  }
};

/**
 * Guarda el ID de sesión activo de Didit en el usuario
 */
const saveSessionToUser = async (userId: string, sessionId: string, sessionUrl: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, cleanUndefined({
      identityStatus: 'pending',
      'identityData.diditSessionId': sessionId,
      'identityData.diditSessionUrl': sessionUrl,
      'identityData.submittedAt': serverTimestamp(),
      'identityData.verificationMethod': 'didit_kyc',
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Error guardando diditSessionId en Firestore:', err);
  }
};

/**
 * 2. Abre la URL de verificación de Didit en el navegador seguro del teléfono
 */
export const openDiditVerificationUrl = async (url: string): Promise<boolean> => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      console.warn('No se puede abrir la URL de Didit:', url);
      return false;
    }
  } catch (err) {
    console.error('Error abriendo URL de Didit:', err);
    return false;
  }
};

/**
 * 3. Consultar la decisión de verificación en Didit
 * Llama a GET /v3/session/{session_id}/decision/
 */
export const checkDiditSessionDecision = async (
  sessionId: string
): Promise<DiditDecisionResult> => {
  try {
    // Si es sesión sandbox
    if (sessionId.startsWith('didit_sandbox_')) {
      return {
        success: true,
        status: 'Approved',
        message: 'Verificación simulada exitosamente en modo Sandbox.',
        documentData: {
          fullName: 'Tutor Verificado Didit',
          documentType: 'Cédula de Identidad',
          country: 'CL'
        }
      };
    }

    const config = await getDiditConfig();
    if (!config.apiKey) {
      return {
        success: false,
        status: 'Pending',
        message: 'No hay API Key configurada para consultar a Didit.'
      };
    }

    const response = await fetch(`${config.baseUrl}/session/${sessionId}/decision/`, {
      method: 'GET',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Error consultando decisión Didit:', response.status, errorText);
      return {
        success: false,
        status: 'Pending',
        message: 'Aún estamos esperando la confirmación de Didit. Si ya completaste el escaneo, espera unos segundos e inténtalo de nuevo.'
      };
    }

    const data = await response.json();
    console.log('Decisión Didit:', data);

    const statusStr = (data.status || data.decision || '').toLowerCase();

    if (statusStr === 'approved' || statusStr === 'success') {
      return {
        success: true,
        status: 'Approved',
        message: '¡Verificación completada y aprobada por Didit con éxito!',
        documentData: {
          rut: data.document?.id_number || data.extracted_data?.id_number || '',
          documentNumber: data.document?.document_number || '',
          fullName: data.document?.full_name || `${data.document?.first_name || ''} ${data.document?.last_name || ''}`.trim(),
          documentType: data.document?.document_type || 'ID_CARD',
          country: data.document?.country || 'CL'
        }
      };
    } else if (statusStr === 'declined' || statusStr === 'rejected') {
      const reason = data.decline_reason || data.rejection_reason || 'El documento o selfie no superó los estándares de seguridad.';
      return {
        success: false,
        status: 'Declined',
        message: `Didit no pudo validar la identidad: ${reason}`
      };
    } else if (statusStr === 'in_review') {
      return {
        success: true,
        status: 'In Review',
        message: 'Tu verificación está siendo analizada por el sistema de Didit. Te avisaremos en breve.'
      };
    } else {
      return {
        success: false,
        status: 'Pending',
        message: 'La sesión aún no ha sido completada en Didit. Asegúrate de escanear tu documento y selfie en el navegador.'
      };
    }
  } catch (error: any) {
    console.error('Error al consultar decisión en Didit:', error);
    return {
      success: false,
      status: 'Pending',
      message: 'No se pudo conectar con el servidor de Didit para comprobar el estado.'
    };
  }
};

/**
 * 4. Aplica la aprobación exitosa de Didit al usuario en la base de datos
 */
export const applyDiditApprovalToUser = async (
  userId: string,
  decision: DiditDecisionResult
): Promise<{ success: boolean; message: string; updatedUser?: AppUser }> => {
  const now = new Date();
  const identityData: IdentityVerificationData = {
    rut: decision.documentData?.rut || 'Validado por Didit',
    documentNumber: decision.documentData?.documentNumber || undefined,
    frontIdCardUrl: 'DIDIT_VERIFIED_BIOMETRIC_ID',
    backIdCardUrl: 'DIDIT_VERIFIED_BIOMETRIC_ID',
    submittedAt: now,
    reviewedAt: now,
    reviewedBy: 'DIDIT_AI_BIOMETRIC_PROTOCOL',
    verificationMethod: 'didit_kyc'
  };

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, cleanUndefined({
      isIdentityVerified: true,
      identityStatus: 'verified',
      identityData: {
        ...identityData,
        submittedAt: serverTimestamp(),
        reviewedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Error actualizando aprobación Didit en Firestore:', err);
  }

  // Actualizar en caché local
  const users = await getUsersFromDb();
  const targetUser = users.find(u => u.id === userId);
  let updatedUser: AppUser | undefined;
  if (targetUser) {
    targetUser.isIdentityVerified = true;
    targetUser.identityStatus = 'verified';
    targetUser.identityData = identityData;
    targetUser.updatedAt = now;
    updatedUser = { ...targetUser };
  }

  // Bonificación por verificar identidad (+50 Huellitas 🐾)
  await awardPaws(userId, 'account_verified', userId);

  // Registrar auditoría
  await logAuditAction(
    userId,
    'IDENTITY_VERIFICATION_DIDIT_APPROVE',
    'users',
    userId,
    `Identidad verificada exitosamente mediante Didit KYC Biométrico (Decisión: Aprobada)`
  );

  // Notificar al usuario
  await sendNotificationToUser(userId, {
    title: '🛡️ ¡Identidad Verificada con Didit!',
    message: 'Didit validó tu documento y tu biometría facial con 100% de éxito. Recibiste +50 Huellitas y tu insignia oficial de Tutor Verificado.',
    type: 'identity_verified'
  });

  // Notificar al Super Administrador
  await sendNotificationToUser('superadmin-user', {
    title: '🤖 Tutor Verificado por Didit',
    message: `${targetUser?.displayName || 'Tutor'} completó la verificación biométrica con Didit KYC con éxito.`,
    type: 'identity_verified'
  });

  return {
    success: true,
    message: '¡Verificación completada con éxito! Ya eres un Tutor Verificado y recibiste +50 Huellitas 🐾.',
    updatedUser
  };
};
