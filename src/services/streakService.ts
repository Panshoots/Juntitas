import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { logAuditAction } from './auditService';

export interface DailyStreakResult {
  success: boolean;
  alreadyClaimed: boolean;
  streak: number;
  pawsAwarded: number;
  message: string;
}

/**
 * Escala progresiva oficial de Huellitas por día de racha:
 * Día 1: +10 🐾
 * Día 2: +15 🐾
 * Día 3: +20 🐾
 * Día 4: +25 🐾
 * Día 5: +35 🐾
 * Día 6: +50 🐾
 * Día 7+: +100 🐾 (Hito semanal)
 */
export const calculateStreakReward = (streakDay: number): number => {
  switch (streakDay) {
    case 1: return 10;
    case 2: return 15;
    case 3: return 20;
    case 4: return 25;
    case 5: return 35;
    case 6: return 50;
    default: return 100;
  }
};

const formatDateLocal = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Verifica y reclama la recompensa de racha de ingreso diario para un usuario
 */
export const checkAndClaimDailyStreak = async (userId: string): Promise<DailyStreakResult> => {
  try {
    const today = new Date();
    const todayStr = formatDateLocal(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateLocal(yesterday);

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return {
        success: false,
        alreadyClaimed: false,
        streak: 1,
        pawsAwarded: 0,
        message: 'Usuario no encontrado.'
      };
    }

    const userData = userSnap.data();
    const lastDate = userData.lastDailyStreakDate;
    const currentStreak = userData.currentStreak || 0;

    // Caso 1: Ya reclamado hoy
    if (lastDate === todayStr) {
      return {
        success: true,
        alreadyClaimed: true,
        streak: currentStreak,
        pawsAwarded: 0,
        message: `🔥 Tienes una racha de ${currentStreak} día${currentStreak === 1 ? '' : 's'}. ¡Vuelve mañana para continuar sumando!`
      };
    }

    // Caso 2: Racha consecutiva (ingresó ayer) o nuevo comienzo
    let newStreak = 1;
    if (lastDate === yesterdayStr) {
      newStreak = currentStreak + 1;
    } else {
      newStreak = 1; // Racha rota o primer día
    }

    const pawsAwarded = calculateStreakReward(newStreak);

    // Actualizar usuario en Firestore
    await updateDoc(userRef, {
      currentStreak: newStreak,
      lastDailyStreakDate: todayStr,
      pawBalance: increment(pawsAwarded),
      updatedAt: serverTimestamp()
    });

    // Registrar en historial de transacciones de Huellitas
    try {
      await addDoc(collection(db, 'pawTransactions'), {
        userId,
        action: 'mission_completed',
        amount: pawsAwarded,
        balanceAfter: (userData.pawBalance || 0) + pawsAwarded,
        referenceId: `streak-day-${newStreak}-${todayStr}`,
        description: `🔥 Recompensa por Racha Diaria: Día ${newStreak} consecutivo`,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      // Silencioso
    }

    await logAuditAction(
      userId,
      'DAILY_STREAK_CLAIM',
      'users',
      userId,
      `Racha de ingreso diario reclamada: Día ${newStreak} (+${pawsAwarded} Huellitas)`
    );

    return {
      success: true,
      alreadyClaimed: false,
      streak: newStreak,
      pawsAwarded,
      message: `¡Felicitaciones! Racha de ${newStreak} día${newStreak === 1 ? '' : 's'} consecutivo${newStreak === 1 ? '' : 's'}. Has ganado +${pawsAwarded} Huellitas hoy.`
    };
  } catch (err) {
    console.warn('Error procesando racha diaria:', err);
    return {
      success: false,
      alreadyClaimed: false,
      streak: 1,
      pawsAwarded: 0,
      message: 'No se pudo registrar la racha en este momento.'
    };
  }
};
