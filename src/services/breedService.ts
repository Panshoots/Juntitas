import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface DogBreed {
  id: string;
  name: string;
  size: 'toy' | 'pequeño' | 'mediano' | 'grande' | 'gigante';
  category: string;
  popular?: boolean;
}

export const MASTER_DOG_BREEDS: DogBreed[] = [
  { id: 'mestizo', name: 'Mestizo / Quiltro', size: 'mediano', category: 'Compañía', popular: true },
  { id: 'kiltro_chileno', name: 'Kiltro Chileno', size: 'mediano', category: 'Compañía', popular: true },
  { id: 'golden_retriever', name: 'Golden Retriever', size: 'grande', category: 'Cobrador / Familia', popular: true },
  { id: 'labrador_retriever', name: 'Labrador Retriever', size: 'grande', category: 'Cobrador / Familia', popular: true },
  { id: 'pastor_aleman', name: 'Pastor Alemán', size: 'grande', category: 'Pastoreo y Guardia', popular: true },
  { id: 'bulldog_frances', name: 'Bulldog Francés', size: 'pequeño', category: 'Compañía', popular: true },
  { id: 'poodle_caniche', name: 'Poodle / Caniche', size: 'pequeño', category: 'Compañía', popular: true },
  { id: 'poodle_toy', name: 'Poodle Toy', size: 'toy', category: 'Compañía', popular: true },
  { id: 'poodle_gigante', name: 'Poodle Gigante', size: 'grande', category: 'Compañía' },
  { id: 'pug_carlino', name: 'Pug / Carlino', size: 'pequeño', category: 'Compañía', popular: true },
  { id: 'chihuahua', name: 'Chihuahua', size: 'toy', category: 'Compañía', popular: true },
  { id: 'husky_siberiano', name: 'Husky Siberiano', size: 'grande', category: 'Nórdico / Trabajo', popular: true },
  { id: 'beagle', name: 'Beagle', size: 'mediano', category: 'Sabueso', popular: true },
  { id: 'dachshund_salchicha', name: 'Dachshund / Teckel (Salchicha)', size: 'pequeño', category: 'Teckel', popular: true },
  { id: 'border_collie', name: 'Border Collie', size: 'mediano', category: 'Pastoreo', popular: true },
  { id: 'boxer', name: 'Boxer', size: 'grande', category: 'Guardia y Compañía', popular: true },
  { id: 'shih_tzu', name: 'Shih Tzu', size: 'toy', category: 'Compañía', popular: true },
  { id: 'yorkshire_terrier', name: 'Yorkshire Terrier', size: 'toy', category: 'Terrier / Compañía', popular: true },
  { id: 'rottweiler', name: 'Rottweiler', size: 'grande', category: 'Guardia y Defensa', popular: true },
  { id: 'doberman', name: 'Doberman Pinscher', size: 'grande', category: 'Guardia' },
  { id: 'pitbull', name: 'Pitbull / American Pit Bull Terrier', size: 'grande', category: 'Terrier / Atlético', popular: true },
  { id: 'amstaff', name: 'American Staffordshire Terrier', size: 'grande', category: 'Terrier' },
  { id: 'bull_terrier', name: 'Bull Terrier', size: 'mediano', category: 'Terrier' },
  { id: 'bulldog_ingles', name: 'Bulldog Inglés', size: 'mediano', category: 'Compañía' },
  { id: 'schnauzer_miniatura', name: 'Schnauzer Miniatura', size: 'pequeño', category: 'Compañía / Guardia', popular: true },
  { id: 'schnauzer_estandar', name: 'Schnauzer Estándar', size: 'mediano', category: 'Guardia' },
  { id: 'schnauzer_gigante', name: 'Schnauzer Gigante', size: 'grande', category: 'Trabajo' },
  { id: 'cocker_spaniel', name: 'Cocker Spaniel', size: 'mediano', category: 'Cobrador / Caza', popular: true },
  { id: 'bichon_maltes', name: 'Bichón Maltés', size: 'toy', category: 'Compañía', popular: true },
  { id: 'bichon_frise', name: 'Bichón Frisé', size: 'pequeño', category: 'Compañía' },
  { id: 'pomerania', name: 'Pomerania / Lulú', size: 'toy', category: 'Compañía', popular: true },
  { id: 'jack_russell', name: 'Jack Russell Terrier', size: 'pequeño', category: 'Terrier / Caza' },
  { id: 'boston_terrier', name: 'Boston Terrier', size: 'pequeño', category: 'Compañía' },
  { id: 'pastor_belga_malinois', name: 'Pastor Belga Malinois', size: 'grande', category: 'Trabajo / Pastoreo', popular: true },
  { id: 'pastor_australiano', name: 'Pastor Australiano (Aussie)', size: 'mediano', category: 'Pastoreo' },
  { id: 'australian_cattle', name: 'Australian Cattle Dog / Boyero Australiano', size: 'mediano', category: 'Pastoreo' },
  { id: 'corgi', name: 'Corgi Galés de Pembroke', size: 'pequeño', category: 'Pastoreo', popular: true },
  { id: 'samoyedo', name: 'Samoyedo', size: 'grande', category: 'Nórdico' },
  { id: 'akita_inu', name: 'Akita Inu', size: 'grande', category: 'Spitz' },
  { id: 'shiba_inu', name: 'Shiba Inu', size: 'pequeño', category: 'Spitz' },
  { id: 'alaskan_malamute', name: 'Alaskan Malamute', size: 'grande', category: 'Nórdico' },
  { id: 'dalmata', name: 'Dálmata', size: 'grande', category: 'Compañía / Caza' },
  { id: 'weimaraner', name: 'Weimaraner (Braco de Weimar)', size: 'grande', category: 'Caza / Atlético' },
  { id: 'braco_aleman', name: 'Braco Alemán', size: 'grande', category: 'Caza' },
  { id: 'vizsla', name: 'Vizsla (Braco Húngaro)', size: 'grande', category: 'Caza' },
  { id: 'shar_pei', name: 'Shar Pei', size: 'mediano', category: 'Guardia' },
  { id: 'chow_chow', name: 'Chow Chow', size: 'mediano', category: 'Spitz' },
  { id: 'basset_hound', name: 'Basset Hound', size: 'mediano', category: 'Sabueso' },
  { id: 'cane_corso', name: 'Cane Corso (Mastín Italiano)', size: 'gigante', category: 'Guardia' },
  { id: 'gran_danes', name: 'Gran Danés', size: 'gigante', category: 'Gigante / Guardia' },
  { id: 'san_bernardo', name: 'San Bernardo', size: 'gigante', category: 'Salvamento / Gigante' },
  { id: 'boyero_de_berna', name: 'Boyero de Berna', size: 'gigante', category: 'Trabajo / Gigante' },
  { id: 'terranova', name: 'Terranova', size: 'gigante', category: 'Salvamento / Gigante' },
  { id: 'mastin_espanol', name: 'Mastín Español', size: 'gigante', category: 'Guardia / Gigante' },
  { id: 'mastin_napolitano', name: 'Mastín Napolitano', size: 'gigante', category: 'Guardia / Gigante' },
  { id: 'bullmastiff', name: 'Bullmastiff', size: 'gigante', category: 'Guardia' },
  { id: 'dogo_argentino', name: 'Dogo Argentino', size: 'grande', category: 'Caza Mayor / Guardia' },
  { id: 'dogo_de_burdeos', name: 'Dogo de Burdeos', size: 'gigante', category: 'Guardia' },
  { id: 'galgo', name: 'Galgo / Greyhound', size: 'grande', category: 'Lebrel / Veloz' },
  { id: 'whippet', name: 'Whippet', size: 'mediano', category: 'Lebrel' },
  { id: 'cavalier_king_charles', name: 'Cavalier King Charles', size: 'pequeño', category: 'Compañía' },
  { id: 'pinscher_miniatura', name: 'Pinscher Miniatura', size: 'toy', category: 'Compañía' },
  { id: 'papillon', name: 'Papillón', size: 'toy', category: 'Compañía' },
  { id: 'pequines', name: 'Pekinés', size: 'toy', category: 'Compañía' },
  { id: 'westie', name: 'West Highland White Terrier (Westie)', size: 'pequeño', category: 'Terrier' },
  { id: 'airedale_terrier', name: 'Airedale Terrier', size: 'grande', category: 'Terrier' },
  { id: 'pastor_blanco_suizo', name: 'Pastor Blanco Suizo', size: 'grande', category: 'Pastoreo' },
  { id: 'perro_agua_espanol', name: 'Perro de Agua Español', size: 'mediano', category: 'Cobrador / Agua' },
  { id: 'rhodesian_ridgeback', name: 'Rhodesian Ridgeback', size: 'grande', category: 'Caza / Guardia' },
  { id: 'basenji', name: 'Basenji', size: 'mediano', category: 'Primitivo' },
  { id: 'otra_raza', name: 'Otra Raza / No especificada', size: 'mediano', category: 'General' }
];

let cachedBreeds: DogBreed[] | null = null;

export async function getDogBreeds(): Promise<DogBreed[]> {
  if (cachedBreeds && cachedBreeds.length > 0) {
    return cachedBreeds;
  }

  try {
    const colRef = collection(db, 'dogBreeds');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: DogBreed[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as DogBreed);
      });
      list.sort((a, b) => {
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return a.name.localeCompare(b.name);
      });
      cachedBreeds = list;
      return list;
    } else {
      // Colección vacía: se siembra automáticamente en Firestore
      syncBreedsToFirestore().catch(e => console.warn('Auto-seed breeds error:', e));
    }
  } catch (error) {
    console.warn('Uso de catálogo local de razas:', error);
  }

  // Fallback con orden: populares primero
  const sorted = [...MASTER_DOG_BREEDS].sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return a.name.localeCompare(b.name);
  });
  cachedBreeds = sorted;
  return sorted;
}

export async function syncBreedsToFirestore(): Promise<{ count: number }> {
  try {
    let count = 0;
    for (const breed of MASTER_DOG_BREEDS) {
      await setDoc(doc(db, 'dogBreeds', breed.id), breed, { merge: true });
      count++;
    }
    return { count };
  } catch (err) {
    console.error('Error sincronizando razas a Firestore:', err);
    return { count: 0 };
  }
}
