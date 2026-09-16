import { AppUser } from '../models/User';
import { Dog } from '../models/Dog';
import { Community } from '../models/Community';
import { DogEvent } from '../models/Event';
import { RewardItem, RewardRedemption, PawTransaction } from '../models/Gamification';
import { Business } from '../models/Business';

export const mockCurrentUser: AppUser = {
  id: 'user-valentina',
  displayName: 'Valentina Silva',
  email: 'valentina.silva@juntitas.app',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  bio: 'Mamá perruna de Firulais y Luna. Amante de los paseos al aire libre y las juntas de fin de semana.',
  location: { region: 'Metropolitana', comuna: 'Providencia' },
  contact: { phone: '+56 9 8765 4321', instagram: '@valesilva.dogs', isPublic: true },
  privacy: { showDogsPublicly: true, showCommunitiesPublicly: true, showAttendancePublicly: true },
  pawBalance: 380,
  isSuperAdmin: false,
  status: 'active',
  createdAt: new Date(2024, 0, 15)
};

export const mockDogs: Dog[] = [
  {
    id: 'dog-firulais',
    ownerId: 'user-valentina',
    name: 'Firulais',
    breed: 'Golden Retriever',
    isMixed: false,
    birthDate: new Date(2022, 5, 12),
    gender: 'macho',
    size: 'grande',
    description: 'Enérgico, fanático de las pelotas de tenis y los chapuzones en la laguna.',
    personalityTraits: ['Sociable', 'Juguetón', 'Enérgico', 'Cariñoso'],
    photoUrls: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=600'],
    passport: {
      attendedEventsCount: 5,
      badges: ['explorador_parque', 'primer_aniversario', 'amigo_fiel'],
      highlightPhotos: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=600'],
      seniorityDate: new Date(2024, 0, 15),
      communitiesCount: 2,
      honorTitle: 'Veterano de Juntas',
      digitalFrameId: 'frame_gold'
    },
    createdAt: new Date(2024, 0, 15)
  },
  {
    id: 'dog-luna',
    ownerId: 'user-valentina',
    name: 'Luna',
    breed: 'Pug',
    isMixed: false,
    birthDate: new Date(2023, 8, 20),
    gender: 'hembra',
    size: 'pequeño',
    description: 'La reina de las siestas y los paseos a paso lento en la sombra.',
    personalityTraits: ['Tranquila', 'Dormilona', 'Comelona'],
    photoUrls: ['https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=600'],
    passport: {
      attendedEventsCount: 2,
      badges: ['amigo_fiel'],
      highlightPhotos: ['https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=600'],
      seniorityDate: new Date(2024, 3, 10),
      communitiesCount: 1,
      honorTitle: 'Dormilona Oficial'
    },
    createdAt: new Date(2024, 3, 10)
  }
];

export const mockCommunities: Community[] = [
  {
    id: 'comm-1',
    name: 'Golden Retrievers Chile',
    slug: 'golden-chile',
    logoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200',
    description: 'Comunidad oficial de amantes y tutores de Golden Retrievers en Chile. Organizamos juntas mensuales y talleres de agility.',
    instagramHandle: '@goldenretrieverschile',
    region: 'Metropolitana',
    comuna: 'Providencia',
    approximateMembers: 350,
    isVerified: true,
    creatorId: 'admin-1',
    primaryAdminId: 'admin-1',
    status: 'active',
    membersCount: 350,
    eventsCount: 14,
    createdAt: new Date(2024, 1, 1)
  },
  {
    id: 'comm-2',
    name: 'Pugs de Santiago Oriente',
    slug: 'pugs-oriente',
    logoUrl: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=200',
    description: 'Juntas, paseos y tips de salud para los chatitos más simpáticos. Cuidamos la hidratación y los horarios frescos.',
    instagramHandle: '@pugs.santiago',
    region: 'Metropolitana',
    comuna: 'Las Condes',
    approximateMembers: 180,
    isVerified: true,
    creatorId: 'admin-2',
    primaryAdminId: 'admin-2',
    status: 'active',
    membersCount: 180,
    eventsCount: 8,
    createdAt: new Date(2024, 2, 10)
  },
  {
    id: 'comm-3',
    name: 'Comunidad Mestizos con Orgullo',
    slug: 'mestizos-chile',
    logoUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=200',
    description: 'El espacio para los perritos quiltros y rescatados. ¡Cada uno con su personalidad irrepetible!',
    instagramHandle: '@mestizos.chile',
    region: 'Metropolitana',
    comuna: 'Ñuñoa',
    approximateMembers: 420,
    isVerified: true,
    creatorId: 'admin-3',
    primaryAdminId: 'admin-3',
    status: 'active',
    membersCount: 420,
    eventsCount: 19,
    createdAt: new Date(2024, 0, 5)
  }
];

export const mockEvents: DogEvent[] = [
  {
    id: 'event-1',
    communityId: 'comm-1',
    communityName: 'Golden Retrievers Chile',
    communityLogoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200',
    title: 'Gran Junta Dorada de Primavera',
    description: '¡Ven a compartir con más de 40 goldens! Tendremos circuito de agilidad, concursos de disfraces y regalos de stands patrocinadores.',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
    status: 'confirmada',
    startDate: new Date(2026, 9, 20, 15, 30),
    endDate: new Date(2026, 9, 20, 18, 30),
    location: {
      placeName: 'Parque Inés de Suárez',
      address: 'Antonio Varas 1510, Providencia',
      googleMapsUrl: 'https://maps.google.com/?q=Parque+Ines+de+Suarez+Providencia'
    },
    rules: ['Uso obligatorio de correa', 'Bolsitas para desechos indispensables', 'Perritas en celo no admitidas'],
    requirements: ['Vacunación al día'],
    acceptsBusinesses: true,
    tutorsCount: 28,
    dogsCount: 34,
    organizerUserIds: ['admin-1'],
    changeLogs: [],
    photosAlbum: [],
    createdAt: new Date()
  },
  {
    id: 'event-2',
    communityId: 'comm-2',
    communityName: 'Pugs de Santiago Oriente',
    communityLogoUrl: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=200',
    title: 'Paseo Matutino de Chatitos',
    description: 'Caminata suave de 30 minutos y descanso con hidratación para evitar golpes de calor en braquicéfalos.',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=800',
    status: 'programada',
    startDate: new Date(2026, 9, 25, 10, 0),
    endDate: new Date(2026, 9, 25, 12, 0),
    location: {
      placeName: 'Parque Araucano',
      address: 'Av. Presidente Riesco 5877, Las Condes',
      googleMapsUrl: 'https://maps.google.com/?q=Parque+Araucano+Las+Condes'
    },
    rules: ['Llevar abundante agua fresca'],
    requirements: ['Pechera cómoda recomendada'],
    acceptsBusinesses: false,
    tutorsCount: 12,
    dogsCount: 15,
    organizerUserIds: ['admin-2'],
    changeLogs: [],
    photosAlbum: [],
    createdAt: new Date()
  }
];

export const mockRewards: RewardItem[] = [
  {
    id: 'rew-1',
    title: '15% Descuento en Snack Natural',
    description: 'Válido en pastelería canina Guau Gourmet durante cualquier junta oficial.',
    type: 'comercial',
    pawsCost: 150,
    imageUrl: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=400',
    businessName: 'Guau Gourmet',
    stockAvailable: 25
  },
  {
    id: 'rew-2',
    title: 'Bebedero Portátil Plegable',
    description: 'Retíralo gratis en el stand de Mascotas VIP en la próxima junta.',
    type: 'comercial',
    pawsCost: 300,
    imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
    businessName: 'Mascotas VIP',
    stockAvailable: 10
  },
  {
    id: 'rew-3',
    title: 'Marco Digital: Explorador Dorado',
    description: 'Equipa este marco brillante en la foto del Pasaporte de tu perrito.',
    type: 'digital',
    pawsCost: 200,
    imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    digitalType: 'marco'
  },
  {
    id: 'rew-4',
    title: 'Título Honorífico: Rey del Parque',
    description: 'Desbloquea e imprime este título oficial en el Pasaporte de tu perrito.',
    type: 'digital',
    pawsCost: 120,
    imageUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=400',
    digitalType: 'titulo'
  }
];

export const mockBusinesses: Business[] = [
  {
    id: 'biz-1',
    name: 'Guau Gourmet Pastelería',
    logoUrl: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=200',
    category: 'pasteleria',
    description: 'Tortas, galletas y snacks 100% naturales para perros sin azúcar ni conservantes.',
    instagramHandle: '@guau.gourmet',
    phoneWhatsapp: '+56 9 1234 5678',
    coverageZone: 'Región Metropolitana',
    isVerified: true,
    plan: 'pro',
    ownerUserId: 'user-biz-1',
    staffUserIds: ['user-biz-1'],
    createdAt: new Date(2024, 2, 1)
  }
];
