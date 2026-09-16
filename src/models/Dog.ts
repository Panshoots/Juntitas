export type DogSize = 'toy' | 'pequeño' | 'mediano' | 'grande' | 'gigante';
export type DogGender = 'macho' | 'hembra';

export interface DogPassport {
  attendedEventsCount: number;
  badges: string[]; // IDs de medallas obtenidas
  highlightPhotos: string[]; // URLs de fotos destacadas en el pasaporte
  seniorityDate: any; // Fecha de antigüedad en la plataforma
  communitiesCount: number;
  digitalFrameId?: string; // Marco digital equipado
  honorTitle?: string; // Título honorífico desbloqueado (e.g. 'Veterano del Parque')
}

export interface Dog {
  id: string;
  ownerId: string; // Referencia al usuario tutor
  name: string;
  breed: string;
  isMixed: boolean; // Si es mestizo
  birthDate: any; // Timestamp o Date
  gender: DogGender;
  size: DogSize;
  description?: string;
  personalityTraits: string[]; // Ej: ['sociable', 'juguetón', 'tranquilo', 'enérgico']
  photoUrls: string[];
  passport: DogPassport;
  createdAt: any;
  updatedAt?: any;
}
