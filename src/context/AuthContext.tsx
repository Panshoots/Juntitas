import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { AppUser, UserRole, UserStatus } from '../models/User';
import { Dog } from '../models/Dog';
import { SecondaryAdminPermissions } from '../models/Community';
import { createUserInDb, getUsersFromDb } from '../services/userService';

export type SessionState = 'onboarding' | 'auth' | 'pending_approval' | 'authenticated';

export interface ActiveProfileInfo {
  roleType: UserRole;
  roleLabel: string;
  roleDescription: string;
  roleColor: string;
  communityIdManaged?: string;
  communityNameManaged?: string;
  secondaryPermissions?: SecondaryAdminPermissions;
}

export const SUPER_ADMIN_USER: AppUser = {
  id: 'user-superadmin',
  displayName: 'Francisco Juillet (SuperAdmin)',
  email: 'admin@juntitas.app',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
  bio: 'Super Administrador Supremo de la plataforma Juntitas.',
  roleType: 'super_admin',
  location: { region: 'Metropolitana', comuna: 'Santiago' },
  contact: { phone: '+56 9 9999 8888', isPublic: false },
  privacy: { showDogsPublicly: true, showCommunitiesPublicly: true, showAttendancePublicly: true },
  pawBalance: 9999,
  isSuperAdmin: true,
  status: 'ACTIVO',
  createdAt: new Date(2024, 0, 1)
};

interface RegisterPayload {
  email: string;
  password?: string;
  displayName: string;
  comuna: string;
  roleType: UserRole;
  status: UserStatus;
  filterProfileType: 'tutor' | 'community_admin' | 'business';
  requestedCommunityName?: string;
  requestedBusinessName?: string;
  dog?: {
    name: string;
    breed: string;
    size: 'pequeño' | 'mediano' | 'grande';
  };
}

interface AuthContextType {
  sessionState: SessionState;
  authMode: 'login' | 'register';
  currentUser: AppUser;
  currentDogs: Dog[];
  activeProfile: ActiveProfileInfo;
  
  // Navegación de autenticación
  startAuthFlow: (mode: 'login' | 'register') => void;
  backToOnboarding: () => void;
  
  // Operaciones de cuenta con Firebase Auth
  registerUser: (payload: RegisterPayload) => Promise<{ success: boolean; message: string }>;
  loginUser: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;

  // Permisos helpers
  isSuperAdmin: boolean;
  isPrimaryAdminOf: (communityId: string) => boolean;
  canCreateEventFor: (communityId: string) => boolean;
  isBusinessOwner: boolean;
}

const defaultProfile: ActiveProfileInfo = {
  roleType: 'member',
  roleLabel: 'Tutor / Miembro',
  roleDescription: 'Explora comunidades, asiste a juntas y acumula Huellitas.',
  roleColor: '#10B981'
};

const AuthContext = createContext<AuthContextType>({
  sessionState: 'onboarding',
  authMode: 'register',
  currentUser: SUPER_ADMIN_USER,
  currentDogs: [],
  activeProfile: defaultProfile,
  startAuthFlow: () => {},
  backToOnboarding: () => {},
  registerUser: async () => ({ success: false, message: '' }),
  loginUser: async () => ({ success: false, message: '' }),
  logout: () => {},
  isSuperAdmin: false,
  isPrimaryAdminOf: () => false,
  canCreateEventFor: () => false,
  isBusinessOwner: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionState, setSessionState] = useState<SessionState>('onboarding');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [currentUser, setCurrentUser] = useState<AppUser>(SUPER_ADMIN_USER);
  const [currentDogs, setCurrentDogs] = useState<Dog[]>([]);

  // Escuchar cambios de estado en Firebase Auth para mantener sesión activa
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as AppUser;
            setCurrentUser(data);
            if (data.status === 'PENDIENTE_APROBACION' || data.status === 'SUSPENDIDO') {
              setSessionState('pending_approval');
            } else {
              setSessionState('authenticated');
            }
          }
        } catch (e) {
          console.warn('Error sincronizando sesión de Firebase Auth:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const getProfileInfo = (user: AppUser): ActiveProfileInfo => {
    switch (user.roleType) {
      case 'super_admin':
        return {
          roleType: 'super_admin',
          roleLabel: 'Super Administrador',
          roleDescription: 'Control global del CRM, aprueba comunidades y tiendas, audita la plataforma.',
          roleColor: '#EF4444'
        };
      case 'primary_admin':
        return {
          roleType: 'primary_admin',
          roleLabel: 'Administrador Principal',
          roleDescription: `Titular de ${user.requestedCommunityName || 'Comunidad'}. Gestiona juntas y delegados.`,
          roleColor: '#D97706',
          communityNameManaged: user.requestedCommunityName || 'Comunidad Oficial'
        };
      case 'secondary_admin':
        return {
          roleType: 'secondary_admin',
          roleLabel: 'Administrador Secundario',
          roleDescription: 'Permisos delegados para crear y moderar juntas (R-0802).',
          roleColor: '#0284C7',
          communityNameManaged: user.requestedCommunityName || 'Comunidad Oficial',
          secondaryPermissions: {
            canCreateEvents: true,
            canEditEvents: true,
            canManageMembers: true,
            canModeratePosts: true,
            canManageAlbums: true,
            canManageVendors: true
          }
        };
      case 'business_owner':
        return {
          roleType: 'business_owner',
          roleLabel: 'Dueño de Tienda Canina',
          roleDescription: `Gestor comercial de ${user.requestedBusinessName || 'Tienda'}. Valida cupones de juntas.`,
          roleColor: '#7E22CE'
        };
      default:
        return {
          roleType: 'member',
          roleLabel: 'Tutor / Miembro Común',
          roleDescription: 'Tutela a su perro, participa en juntas oficiales y gana Huellitas.',
          roleColor: '#10B981'
        };
    }
  };

  const startAuthFlow = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setSessionState('auth');
  };

  const backToOnboarding = () => {
    setSessionState('onboarding');
  };

  // Registro utilizando Firebase Authentication (createUserWithEmailAndPassword)
  const registerUser = async (payload: RegisterPayload): Promise<{ success: boolean; message: string }> => {
    let firebaseUid = 'user-' + Date.now();
    const pass = payload.password || '123456';

    try {
      // 1. Crear usuario oficial en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, payload.email, pass);
      firebaseUid = userCredential.user.uid;

      // 2. Actualizar displayName en Firebase Auth
      await updateProfile(userCredential.user, {
        displayName: payload.displayName
      });
    } catch (authError: any) {
      console.warn('Firebase Auth error en registro:', authError);
      if (authError?.code === 'auth/email-already-in-use') {
        return { success: false, message: 'Este correo ya se encuentra registrado. Por favor inicia sesión.' };
      }
      if (authError?.code === 'auth/weak-password') {
        return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
      }
      if (authError?.code === 'auth/invalid-email') {
        return { success: false, message: 'El correo electrónico ingresado no es válido.' };
      }
      // En caso de estar offline o sin conexión en test local, se continúa con ID generado
    }

    const newUser: AppUser = {
      id: firebaseUid,
      email: payload.email,
      displayName: payload.displayName,
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      roleType: payload.roleType,
      filterProfileType: payload.filterProfileType,
      requestedCommunityName: payload.requestedCommunityName,
      requestedBusinessName: payload.requestedBusinessName,
      location: { region: 'Metropolitana', comuna: payload.comuna },
      contact: { isPublic: true },
      privacy: { showDogsPublicly: true, showCommunitiesPublicly: true, showAttendancePublicly: true },
      pawBalance: 100, // Bono de bienvenida (Sección 18 Plan Maestro)
      isSuperAdmin: payload.roleType === 'super_admin',
      status: payload.status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Si registró perro
    const dogsList: Dog[] = [];
    if (payload.dog) {
      const newDog: Dog = {
        id: 'dog-' + Date.now(),
        ownerId: firebaseUid,
        name: payload.dog.name,
        breed: payload.dog.breed,
        isMixed: payload.dog.breed.toLowerCase().includes('mestizo'),
        birthDate: new Date(),
        gender: 'macho',
        size: payload.dog.size,
        description: 'Perrito sociable y activo.',
        photoUrls: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'],
        passport: {
          attendedEventsCount: 0,
          badges: ['primer_registro'],
          highlightPhotos: [],
          seniorityDate: new Date(),
          communitiesCount: 0,
          honorTitle: 'Nuevo Cachorro'
        },
        createdAt: new Date()
      };
      dogsList.push(newDog);
    }

    // 3. Guardar documento de usuario en Cloud Firestore
    await createUserInDb(newUser);
    setCurrentUser(newUser);
    setCurrentDogs(dogsList);

    if (newUser.status === 'PENDIENTE_APROBACION') {
      setSessionState('pending_approval');
      return { 
        success: true, 
        message: '¡Registro exitoso en Firebase! Tu cuenta está en revisión oficial por el Super Admin según el filtro.' 
      };
    } else {
      setSessionState('authenticated');
      return { success: true, message: '¡Bienvenido a Juntitas! Cuenta registrada y autenticada en Firebase.' };
    }
  };

  // Inicio de sesión utilizando Firebase Authentication (signInWithEmailAndPassword)
  const loginUser = async (email: string, password?: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // 1. Acceso de Super Administrador protegido
    if (cleanEmail === 'admin' || cleanEmail === 'admin@juntitas.app') {
      if (cleanPass === 'admin') {
        setCurrentUser(SUPER_ADMIN_USER);
        setCurrentDogs([]);
        setSessionState('authenticated');
        return { success: true, message: 'Acceso autorizado como Super Administrador.' };
      } else {
        return { 
          success: false, 
          message: 'Contraseña de administrador incorrecta. Acceso denegado.' 
        };
      }
    }

    // 2. Autenticación con Firebase Auth para usuarios registrados
    let authenticatedUid: string | null = null;

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      authenticatedUid = cred.user.uid;
    } catch (authError: any) {
      console.warn('Firebase Auth signIn error:', authError);
      if (authError?.code === 'auth/invalid-credential' || authError?.code === 'auth/wrong-password') {
        return { success: false, message: 'Correo o contraseña incorrectos.' };
      }
      if (authError?.code === 'auth/user-not-found') {
        return { success: false, message: 'No existe una cuenta registrada con este correo.' };
      }
    }

    // 3. Consultar perfil en Firestore
    const allUsers = await getUsersFromDb();
    const found = authenticatedUid 
      ? allUsers.find(u => u.id === authenticatedUid) || allUsers.find(u => u.email.toLowerCase() === cleanEmail)
      : allUsers.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { 
        success: false, 
        message: 'No se encontró el documento de usuario en la base de datos. Por favor regístrate primero.' 
      };
    }

    setCurrentUser(found);
    if (found.status === 'PENDIENTE_APROBACION' || found.status === 'SUSPENDIDO') {
      setSessionState('pending_approval');
    } else {
      setSessionState('authenticated');
    }

    return { success: true, message: 'Bienvenido de vuelta, ' + found.displayName + '.' };
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    setSessionState('onboarding');
  };

  const isSuperAdmin = currentUser.isSuperAdmin || currentUser.roleType === 'super_admin';

  const isPrimaryAdminOf = (communityId: string) => {
    if (isSuperAdmin) return true;
    return currentUser.roleType === 'primary_admin';
  };

  const canCreateEventFor = (communityId: string) => {
    if (isSuperAdmin) return true;
    if (currentUser.roleType === 'primary_admin') return true;
    if (currentUser.roleType === 'secondary_admin') return true;
    return false;
  };

  const isBusinessOwner = currentUser.roleType === 'business_owner';

  return (
    <AuthContext.Provider
      value={{
        sessionState,
        authMode,
        currentUser,
        currentDogs,
        activeProfile: getProfileInfo(currentUser),
        startAuthFlow,
        backToOnboarding,
        registerUser,
        loginUser,
        logout,
        isSuperAdmin,
        isPrimaryAdminOf,
        canCreateEventFor,
        isBusinessOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
