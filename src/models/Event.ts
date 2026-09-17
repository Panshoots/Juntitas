export type EventStatus = 
  | 'programada' 
  | 'confirmada' 
  | 'en_curso' 
  | 'finalizada' 
  | 'cancelada' 
  | 'scheduled' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface EventLocation {
  placeName: string; // Ej: 'Parque Bicentenario'
  address: string;
  googleMapsUrl: string; // V1: Abre directamente la app de Maps o el navegador
  geoCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface EventChangeRecord {
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: any;
  changedByName: string;
}

export interface DogAttendeeSummary {
  dogId: string;
  name: string;
  breed: string;
  photoUrl?: string;
}

export interface EventAttendee {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  isPublic: boolean;
  registeredDogs: DogAttendeeSummary[];
  registeredDogsCount: number;
  status: 'confirmed' | 'attended' | 'cancelled';
  checkInAt?: any;
  registeredAt: any;
}

export interface EventPhoto {
  id: string;
  photoUrl: string;
  uploadedByUserId: string;
  uploadedByUserName: string;
  createdAt: any;
  approved: boolean;
}

export interface EventMission {
  id: string;
  title: string;
  description: string;
  pawReward: number;
  requiresCheckInAtStand?: string; // businessId opcional
}

export interface DogEvent {
  id: string;
  communityId: string;
  communityName: string;
  communityLogoUrl?: string;
  title: string;
  description: string;
  coverPhotoUrl: string;
  status: EventStatus;
  startDate: any;
  endDate: any;
  location: EventLocation;
  capacityLimit?: number | null;
  rules: string[];
  requirements: string[]; // Ej: ['Vacunas al día', 'Uso obligatorio de correa']
  acceptsBusinesses: boolean;
  tutorsCount: number;
  dogsCount: number;
  attendeeUserIds?: string[];
  organizerUserIds: string[];
  changeLogs: EventChangeRecord[];
  photosAlbum: EventPhoto[];
  missions?: EventMission[];
  createdAt: any;
  updatedAt?: any;
}
