import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppUser } from '../models/User';
import { Dog } from '../models/Dog';
import { Community } from '../models/Community';
import { DogEvent } from '../models/Event';
import { Business } from '../models/Business';
import { logAuditAction } from './auditService';
import { SUPER_ADMIN_USER } from '../context/AuthContext';

// Nombres y razas realistas para la generación aleatoria
const DOG_NAMES = ['Simba', 'Luna', 'Thor', 'Bella', 'Toby', 'Coco', 'Milo', 'Max', 'Kira', 'Rocky', 'Nina', 'Zeus', 'Sasha', 'Bruno', 'Maya'];
const DOG_BREEDS = [
  'Golden Retriever',
  'Pug',
  'Mestizo / Quiltro',
  'Bulldog Francés',
  'Poodle Toy',
  'Beagle',
  'Border Collie',
  'Pastor Alemán'
];
const DOG_PHOTOS = [
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=500',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=500',
  'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=500',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500'
];

/**
 * 🗑️ VACIAR TODA LA APP
 * Limpia todas las colecciones en memoria y en Firestore, manteniendo únicamente al Super Admin Supremo (Francisco Juillet).
 */
export const resetEntireApp = async (
  adminUserId: string = 'user-superadmin'
): Promise<{ success: boolean; message: string }> => {
  try {
    const collectionsToClean = [
      'users', 
      'dogs', 
      'communities', 
      'communityRequests', 
      'events', 
      'eventAttendances', 
      'businesses',
      'redemptions'
    ];

    for (const colName of collectionsToClean) {
      try {
        const snap = await getDocs(collection(db, colName));
        for (const docSnap of snap.docs) {
          // No borrar el Super Admin supremo
          if (colName === 'users' && docSnap.id === 'user-superadmin') continue;
          await deleteDoc(doc(db, colName, docSnap.id));
        }
      } catch (err) {
        console.warn(`Error limpiando colección ${colName}:`, err);
      }
    }

    // Asegurar que Francisco Juillet persista
    await setDoc(doc(db, 'users', 'user-superadmin'), {
      ...SUPER_ADMIN_USER,
      updatedAt: serverTimestamp()
    });

    await logAuditAction(
      adminUserId,
      'APP_FACTORY_RESET',
      'GLOBAL',
      'all',
      'Reinicio total de la base de datos realizado por Francisco Juillet. Datos vaciados.'
    );

    return { 
      success: true, 
      message: '🧹 ¡Base de datos vaciada con éxito! La app ha quedado en blanco y limpia, manteniendo a Francisco Juillet como Super Admin.' 
    };
  } catch (err: any) {
    return { success: false, message: 'Error al vaciar la aplicación: ' + err.message };
  }
};

/**
 * 🌱 POBLAR CON DATOS REALISTAS
 * Genera 10 usuarios, cada uno con 1 a 3 perros aleatorios, 4 tiendas con productos, 3 comunidades con administradores principales asignados y 2 juntas.
 */
export const seedRealisticData = async (
  adminUserId: string = 'user-superadmin'
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Crear 3 Comunidades
    const communitiesToCreate: Community[] = [
      {
        id: 'comm-golden-chile',
        name: 'Golden Retrievers Chile',
        slug: 'golden-retrievers-chile',
        description: 'Comunidad oficial para tutores y amantes de los Golden Retrievers en Chile.',
        logoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
        instagramHandle: '@goldenretrieverschile',
        region: 'Metropolitana',
        comuna: 'Providencia',
        status: 'activa',
        isVerified: true,
        joinType: 'libre',
        membersCount: 42,
        eventsCount: 3,
        primaryAdminId: 'seed-user-1',
        secondaryAdmins: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'comm-pugs-santiago',
        name: 'Club Pugs Santiago',
        slug: 'club-pugs-santiago',
        description: 'Manada de chatos más alegre de la capital. Juntas dominicales y paseos tranquilos.',
        logoUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=300',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
        instagramHandle: '@clubpugssantiago',
        region: 'Metropolitana',
        comuna: 'Ñuñoa',
        status: 'activa',
        isVerified: true,
        joinType: 'libre',
        membersCount: 35,
        eventsCount: 2,
        primaryAdminId: 'seed-user-2',
        secondaryAdmins: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'comm-frenchies-chile',
        name: 'Bulldog Francés Chile',
        slug: 'bulldog-frances-chile',
        description: 'Encuentros, tips de salud y socialización para Bulldogs Franceses.',
        logoUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=300',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800',
        instagramHandle: '@frenchies.chile',
        region: 'Metropolitana',
        comuna: 'Las Condes',
        status: 'activa',
        isVerified: true,
        joinType: 'libre',
        membersCount: 28,
        eventsCount: 1,
        primaryAdminId: 'seed-user-3',
        secondaryAdmins: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const comm of communitiesToCreate) {
      await setDoc(doc(db, 'communities', comm.id), {
        ...comm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // 2. Crear 10 Usuarios (3 Admins de comunidad, 1 Dueño de tienda, 6 Tutores)
    const rawUsersData = [
      { id: 'seed-user-1', name: 'Carlos Mendoza', email: 'carlos.mendoza@goldenretrievers.cl', comuna: 'Providencia', role: 'primary_admin' as const, commName: 'Golden Retrievers Chile' },
      { id: 'seed-user-2', name: 'Daniela Rivas', email: 'daniela.rivas@pugsantiago.cl', comuna: 'Ñuñoa', role: 'primary_admin' as const, commName: 'Club Pugs Santiago' },
      { id: 'seed-user-3', name: 'Matías Albornoz', email: 'matias.albornoz@frenchies.cl', comuna: 'Las Condes', role: 'primary_admin' as const, commName: 'Bulldog Francés Chile' },
      { id: 'seed-user-4', name: 'Martín Gómez', email: 'contacto@guaugourmet.cl', comuna: 'Ñuñoa', role: 'business_owner' as const, bizName: 'Guau Gourmet Pastelería' },
      { id: 'seed-user-5', name: 'Camila Morales', email: 'camila.morales@gmail.com', comuna: 'Santiago', role: 'member' as const },
      { id: 'seed-user-6', name: 'Ignacio Valenzuela', email: 'ignacio.valenzuela@gmail.com', comuna: 'La Reina', role: 'member' as const },
      { id: 'seed-user-7', name: 'Sofía Contreras', email: 'sofia.contreras@gmail.com', comuna: 'Providencia', role: 'member' as const },
      { id: 'seed-user-8', name: 'Javier Espinoza', email: 'javier.espinoza@gmail.com', comuna: 'Vitacura', role: 'member' as const },
      { id: 'seed-user-9', name: 'Valentina Silva', email: 'valentina.silva@gmail.com', comuna: 'Ñuñoa', role: 'member' as const },
      { id: 'seed-user-10', name: 'Felipe Bravo', email: 'felipe.bravo@gmail.com', comuna: 'Peñalolén', role: 'member' as const },
    ];

    let totalDogsCreated = 0;

    for (const u of rawUsersData) {
      const userDoc: AppUser = {
        id: u.id,
        displayName: u.name,
        email: u.email,
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        roleType: u.role,
        filterProfileType: u.role === 'business_owner' ? 'business' : u.role === 'primary_admin' ? 'community_admin' : 'tutor',
        requestedCommunityName: (u as any).commName,
        requestedBusinessName: (u as any).bizName,
        location: { region: 'Metropolitana', comuna: u.comuna },
        contact: { phone: '+56 9 ' + Math.floor(10000000 + Math.random() * 90000000), isPublic: true },
        privacy: { showDogsPublicly: true, showCommunitiesPublicly: true, showAttendancePublicly: true },
        pawBalance: 150,
        isSuperAdmin: false,
        status: 'ACTIVO',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', u.id), {
        ...userDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Generar entre 1 y 3 perros aleatorios para este usuario
      const dogCount = Math.floor(Math.random() * 3) + 1; // 1, 2 o 3 perros
      for (let i = 0; i < dogCount; i++) {
        const dogId = `dog-${u.id}-${i + 1}`;
        const dName = DOG_NAMES[(totalDogsCreated + i) % DOG_NAMES.length];
        const dBreed = DOG_BREEDS[(totalDogsCreated + i) % DOG_BREEDS.length];
        const dPhoto = DOG_PHOTOS[(totalDogsCreated + i) % DOG_PHOTOS.length];

        const dogDoc: Dog = {
          id: dogId,
          ownerId: u.id,
          name: dName,
          breed: dBreed,
          isMixed: dBreed.includes('Mestizo'),
          birthDate: new Date(2022, Math.floor(Math.random() * 12), 1),
          gender: i % 2 === 0 ? 'macho' : 'hembra',
          size: dBreed.includes('Golden') || dBreed.includes('Pastor') ? 'grande' : dBreed.includes('Pug') || dBreed.includes('Poodle') ? 'pequeño' : 'mediano',
          description: 'Perrito juguetón y amigable, le gusta socializar en el parque.',
          photoUrls: [dPhoto],
          passport: {
            attendedEventsCount: Math.floor(Math.random() * 8) + 1,
            badges: ['primer_registro', 'explorador_parque'],
            highlightPhotos: [dPhoto],
            seniorityDate: new Date(2024, 0, 1),
            communitiesCount: 1,
            honorTitle: 'Paseador Entusiasta'
          },
          createdAt: new Date()
        };

        await setDoc(doc(db, 'dogs', dogId), {
          ...dogDoc,
          createdAt: serverTimestamp()
        });

        totalDogsCreated++;
      }
    }

    // 3. Crear 4 Tiendas Caninas Verificadas con productos
    const businessesToCreate: Business[] = [
      {
        id: 'biz-guau-gourmet',
        name: 'Guau Gourmet Pastelería Canina',
        logoUrl: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=300',
        category: 'pasteleria',
        description: 'Tortas de cumpleaños, galletas de avena e hígados horneados sin sal ni azúcar.',
        instagramHandle: '@guaugourmet.cl',
        phoneWhatsapp: '+56 9 8888 1111',
        coverageZone: 'Santiago Oriente y Centro',
        isVerified: true,
        plan: 'pro',
        ownerUserId: 'seed-user-4',
        staffUserIds: ['seed-user-4'],
        createdAt: new Date()
      },
      {
        id: 'biz-perrunos-chic',
        name: 'Perrunos Chic Accesorios',
        logoUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300',
        category: 'accesorios',
        description: 'Arneses ergonómicos antitirones, correas multipropósito y bandanas reflectantes.',
        instagramHandle: '@perrunoschic.cl',
        phoneWhatsapp: '+56 9 8888 2222',
        coverageZone: 'Toda la Región Metropolitana',
        isVerified: true,
        plan: 'pro',
        ownerUserId: 'seed-user-5',
        staffUserIds: ['seed-user-5'],
        createdAt: new Date()
      },
      {
        id: 'biz-natural-pet',
        name: 'Natural Pet Alimentos BARF',
        logoUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300',
        category: 'alimento',
        description: 'Comida biológicamente apropiada 100% congelada, sin preservantes ni aditivos químicos.',
        instagramHandle: '@naturalpet.chile',
        phoneWhatsapp: '+56 9 8888 3333',
        coverageZone: 'Despacho a todo Chile',
        isVerified: true,
        plan: 'pro',
        ownerUserId: 'seed-user-6',
        staffUserIds: ['seed-user-6'],
        createdAt: new Date()
      },
      {
        id: 'biz-spa-canino',
        name: 'Spa Canino Burbujas Felices',
        logoUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=300',
        category: 'spa_bano',
        description: 'Baños medicinales, corte de uñas y deslanado libre de jaulas y estrés.',
        instagramHandle: '@burbujasfelices.spa',
        phoneWhatsapp: '+56 9 8888 4444',
        coverageZone: 'Providencia y Ñuñoa',
        isVerified: true,
        plan: 'pro',
        ownerUserId: 'seed-user-7',
        staffUserIds: ['seed-user-7'],
        createdAt: new Date()
      }
    ];

    for (const biz of businessesToCreate) {
      await setDoc(doc(db, 'businesses', biz.id), {
        ...biz,
        createdAt: serverTimestamp()
      });
    }

    // 4. Crear 2 Juntas Oficiales
    const eventsToCreate: DogEvent[] = [
      {
        id: 'event-gran-junta-primavera',
        communityId: 'comm-golden-chile',
        communityName: 'Golden Retrievers Chile',
        communityLogoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200',
        title: 'Gran Junta Dorada de Primavera',
        description: 'Ven con tu Golden a disfrutar de juegos en el pasto, hidratación y concursos al aire libre.',
        startDate: new Date(Date.now() + 86400000 * 4),
        endDate: new Date(Date.now() + 86400000 * 4 + 7200000),
        location: {
          placeName: 'Parque Inés de Suárez',
          address: 'Antonio Varas 1510',
          comuna: 'Providencia',
          region: 'Metropolitana',
          googleMapsUrl: 'https://maps.google.com/?q=Parque+Ines+de+Suarez+Providencia'
        },
        coverPhotoUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
        status: 'confirmada',
        tutorsCount: 14,
        dogsCount: 18,
        acceptsBusinesses: true,
        creatorUserId: 'seed-user-1',
        changeLogs: [],
        photosAlbum: [],
        createdAt: new Date()
      },
      {
        id: 'event-junta-chatos-busta',
        communityId: 'comm-pugs-santiago',
        communityName: 'Club Pugs Santiago',
        title: 'Encuentro de Chatos & Amigos',
        description: 'Paseo tranquilo a la sombra con puntos de agua fresca para evitar golpes de calor.',
        startDate: new Date(Date.now() + 86400000 * 8),
        endDate: new Date(Date.now() + 86400000 * 8 + 7200000),
        location: {
          placeName: 'Parque Bustamante',
          address: 'Ramón Carnicer 100',
          comuna: 'Providencia',
          region: 'Metropolitana',
          googleMapsUrl: 'https://maps.google.com/?q=Parque+Bustamante+Santiago'
        },
        coverPhotoUrl: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=800',
        status: 'programada',
        tutorsCount: 9,
        dogsCount: 11,
        acceptsBusinesses: true,
        creatorUserId: 'seed-user-2',
        changeLogs: [],
        photosAlbum: [],
        createdAt: new Date()
      }
    ];

    for (const ev of eventsToCreate) {
      await setDoc(doc(db, 'events', ev.id), {
        ...ev,
        createdAt: serverTimestamp()
      });
    }

    await logAuditAction(
      adminUserId,
      'APP_SEED_DATA',
      'GLOBAL',
      'all',
      `Base poblada con éxito: 10 usuarios, ${totalDogsCreated} perros, 3 comunidades con administradores, 4 tiendas y 2 juntas oficiales.`
    );

    return { 
      success: true, 
      message: `🌱 ¡Base de datos poblada exitosamente! Se crearon 10 usuarios, ${totalDogsCreated} perros, 3 comunidades con sus administradores principales, 4 tiendas verificadas y 2 juntas oficiales.` 
    };
  } catch (err: any) {
    return { success: false, message: 'Error al poblar datos: ' + err.message };
  }
};
