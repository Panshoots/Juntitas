import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Dog, DogPassport } from '../models/Dog';
import { cleanUndefined } from './userService';
import { awardPaws } from './gamificationService';
import { logAuditAction } from './auditService';

export const MAX_DOGS_STANDARD_PLAN = 2;

export const DEFAULT_DOG_PHOTOS = [
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300', // Golden Retriever
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300', // Beagle
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=300', // Pug
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300', // Bulldog Francés
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=300', // Mestizo
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=300'  // Poodle
];

let localDogs: Dog[] = [];

/**
 * Obtener todos los perritos de un tutor desde Firestore
 */
export const getDogsByOwner = async (ownerId: string): Promise<Dog[]> => {
  try {
    const q = query(collection(db, 'dogs'), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    const list: Dog[] = [];
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          ownerId: data.ownerId,
          name: data.name || 'Mi Perrito',
          breed: data.breed || 'Mestizo',
          isMixed: !!data.isMixed,
          birthDate: data.birthDate?.toDate ? data.birthDate.toDate() : new Date(),
          gender: data.gender || 'macho',
          size: data.size || 'mediano',
          description: data.description || 'Perrito sociable y juguetón.',
          personalityTraits: data.personalityTraits || ['sociable', 'juguetón'],
          photoUrls: data.photoUrls || [DEFAULT_DOG_PHOTOS[0]],
          passport: data.passport || {
            attendedEventsCount: 0,
            badges: ['primer_registro'],
            highlightPhotos: [],
            seniorityDate: new Date(),
            communitiesCount: 0,
            honorTitle: 'Nuevo Cachorro'
          },
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        });
      });
      localDogs = list;
      return list;
    }
  } catch (err) {
    console.warn('Error leyendo perritos de Firestore:', err);
  }
  return localDogs.filter(d => d.ownerId === ownerId);
};

/**
 * Registrar un nuevo perrito con control estricto de máximo 2 perritos
 */
export const createDogForOwner = async (
  ownerId: string,
  dogData: {
    name: string;
    breed: string;
    gender: 'macho' | 'hembra';
    size: 'toy' | 'pequeño' | 'mediano' | 'grande' | 'gigante';
    photoUrl?: string;
    description?: string;
    birthDate?: Date;
  }
): Promise<{ success: boolean; dog?: Dog; message: string }> => {
  // 1. Validar límite del Plan Estándar (máximo 2 perros)
  const existingDogs = await getDogsByOwner(ownerId);
  if (existingDogs.length >= MAX_DOGS_STANDARD_PLAN) {
    return {
      success: false,
      message: `Has alcanzado el límite de ${MAX_DOGS_STANDARD_PLAN} perritos permitidos en el Plan Estándar. En futuras versiones podrás contratar la Membresía VIP para registrar más perritos.`
    };
  }

  const dogId = `dog-${ownerId}-${Date.now()}`;
  const initialPassport: DogPassport = {
    attendedEventsCount: 0,
    badges: ['primer_registro'],
    highlightPhotos: dogData.photoUrl ? [dogData.photoUrl] : [],
    seniorityDate: new Date(),
    communitiesCount: 0,
    honorTitle: 'Nuevo Cachorro'
  };

  const newDog: Dog = {
    id: dogId,
    ownerId,
    name: dogData.name.trim(),
    breed: dogData.breed.trim(),
    isMixed: dogData.breed.toLowerCase().includes('mestizo'),
    birthDate: dogData.birthDate || new Date(),
    gender: dogData.gender,
    size: dogData.size,
    description: dogData.description || 'Perrito sociable y alegre.',
    personalityTraits: ['sociable', 'juguetón'],
    photoUrls: [dogData.photoUrl || DEFAULT_DOG_PHOTOS[existingDogs.length % DEFAULT_DOG_PHOTOS.length]],
    passport: initialPassport,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 2. Guardar en Firestore
  try {
    await setDoc(doc(db, 'dogs', dogId), cleanUndefined({
      ...newDog,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Guardando perrito localmente:', err);
  }

  localDogs.push(newDog);

  // 3. Otorgar Huellitas de bienvenida por registrar un perrito (+50 Huellitas)
  await awardPaws(ownerId, 'passport_completed', dogId);

  await logAuditAction(
    ownerId,
    'DOG_REGISTER',
    'dogs',
    dogId,
    `Nuevo perrito registrado: ${newDog.name} (${newDog.breed})`
  );

  return {
    success: true,
    dog: newDog,
    message: `¡${newDog.name} ha sido registrado exitosamente con su Pasaporte Canino Oficial! (+50 🐾 Huellitas de bienvenida otorgadas).`
  };
};

/**
 * Eliminar un perrito
 */
export const deleteDogFromDb = async (dogId: string, ownerId: string): Promise<{ success: boolean; message: string }> => {
  try {
    await deleteDoc(doc(db, 'dogs', dogId));
  } catch (err) {
    console.warn('Error eliminando perrito de Firestore:', err);
  }

  localDogs = localDogs.filter(d => d.id !== dogId);
  return { success: true, message: 'El perrito ha sido desvinculado de tu cuenta.' };
};

/**
 * Obtener todos los perritos de todas las comunidades
 */
export const getAllDogsFromDb = async (): Promise<Dog[]> => {
  try {
    const snap = await getDocs(collection(db, 'dogs'));
    if (!snap.empty) {
      const list: Dog[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          ownerId: data.ownerId,
          name: data.name || 'Mi Perrito',
          breed: data.breed || 'Mestizo',
          isMixed: !!data.isMixed,
          birthDate: data.birthDate?.toDate ? data.birthDate.toDate() : new Date(),
          gender: data.gender || 'macho',
          size: data.size || 'mediano',
          description: data.description || '',
          personalityTraits: data.personalityTraits || [],
          photoUrls: data.photoUrls || [DEFAULT_DOG_PHOTOS[0]],
          passport: data.passport || {
            attendedEventsCount: 0,
            badges: ['primer_registro'],
            seniorityDate: new Date(),
            communitiesCount: 1,
            honorTitle: 'Perrito Explorador'
          },
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        });
      });
      localDogs = list;
      return list;
    }
  } catch (err) {
    console.warn('Error leyendo perritos globales:', err);
  }
  return [...localDogs];
};
