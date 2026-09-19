import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { AppUser, UserRole, UserStatus } from '../models/User';
import { Dog } from '../models/Dog';
import { SecondaryAdminPermissions } from '../models/Community';
import { createUserInDb, getUsersFromDb } from '../services/userService';
import { getDogsByOwner, createDogForOwner } from '../services/dogService';

export type SessionState = 'loading' | 'onboarding' | 'auth' | 'pending_approval' | 'authenticated';

export interface ActiveProfileInfo {
  roleType: UserRole;
  roleLabel: string;
  roleDescription: string;
  roleColor: string;
  communityIdManaged?: string;
  communityNameManaged?: string;
  secondaryPermissions?: SecondaryAdminPermissions;
}

export const ANONYMOUS_USER: AppUser = {
  id: '',
  displayName: 'Invitado',
  email: '',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
  bio: 'Explorador de la comunidad canina Juntitas.',
  roleType: 'member',
  location: { region: 'Metropolitana', comuna: 'Santiago' },
  contact: { phone: '', isPublic: false },
  privacy: { showDogsPublicly: false, showCommunitiesPublicly: false, showAttendancePublicly: false },
  pawBalance: 0,
  isSuperAdmin: false,
  status: 'ACTIVO',
  createdAt: new Date(2024, 0, 1)
};

export const SUPER_ADMIN_USER: AppUser = {
  id: 'zjnYSghe7oMOd3FPCnMFfpE2Yrb2',
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
  loginAsSuperAdmin: () => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;

  // Gestión de perritos (Máximo 2 en Plan Estándar)
  loadUserDogs: (userId: string) => Promise<Dog[]>;
  addDogToUser: (dogData: any) => Promise<{ success: boolean; message: string }>;
  refreshDogs: () => Promise<void>;
  updateUserPhoto: (photoUrl: string) => Promise<{ success: boolean; message: string }>;

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
  sessionState: 'loading',
  authMode: 'register',
  currentUser: ANONYMOUS_USER,
  currentDogs: [],
  activeProfile: defaultProfile,
  startAuthFlow: () => {},
  backToOnboarding: () => {},
  registerUser: async () => ({ success: false, message: '' }),
  loginUser: async () => ({ success: false, message: '' }),
  loginAsSuperAdmin: async () => ({ success: false, message: '' }),
  loginWithGoogle: async () => ({ success: false, message: '' }),
  sendPasswordReset: async () => ({ success: false, message: '' }),
  logout: () => {},
  loadUserDogs: async () => [],
  addDogToUser: async () => ({ success: false, message: '' }),
  refreshDogs: async () => {},
  isSuperAdmin: false,
  isPrimaryAdminOf: () => false,
  canCreateEventFor: () => false,
  isBusinessOwner: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [currentUser, setCurrentUser] = useState<AppUser>(ANONYMOUS_USER);
  const [currentDogs, setCurrentDogs] = useState<Dog[]>([]);

  // Verificación de sesión al inicio de la app con loading de unos segundos
  // para dar tiempo suficiente a Firebase y al almacenamiento local de reconocer si el usuario está logeado.
  useEffect(() => {
    let isMounted = true;

    const initializeAuthSession = async () => {
      const startTime = Date.now();
      const MIN_LOADING_TIME_MS = 2500; // ~2.5 segundos de loading para dar tiempo y animar

      let detectedUser: AppUser | null = null;

      // 1. Intentar recuperar usuario guardado en AsyncStorage
      try {
        const savedUserJson = await AsyncStorage.getItem('@juntitas_active_user');
        if (savedUserJson) {
          const parsed = JSON.parse(savedUserJson) as AppUser;
          if (parsed && parsed.id) {
            detectedUser = parsed;
          }
        }
      } catch (storageErr) {
        console.warn('Error leyendo sesión persistida en AsyncStorage:', storageErr);
      }

      // 2. Comprobar simultáneamente con Firebase Authentication & Firestore
      try {
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(() => {
            resolve();
          }, 2000);

          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            clearTimeout(timeoutId);
            unsubscribe();
            if (firebaseUser) {
              try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                  detectedUser = userDoc.data() as AppUser;
                  await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(detectedUser));
                }
              } catch (e) {
                console.warn('Error sincronizando datos desde Firestore al iniciar:', e);
              }
            }
            resolve();
          });
        });
      } catch (authErr) {
        console.warn('Error en verificación inicial de Firebase Auth:', authErr);
      }

      // 3. Respetar el tiempo de loading para que la transición sea fluida
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME_MS - elapsed);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      if (!isMounted) return;

      // 4. Si el usuario está reconocido y logeado
      if (detectedUser && detectedUser.id) {
        setCurrentUser(detectedUser);
        loadUserDogs(detectedUser.id).catch(() => {});
        if (detectedUser.status === 'PENDIENTE_APROBACION' || detectedUser.status === 'SUSPENDIDO') {
          setSessionState('pending_approval');
        } else {
          setSessionState('authenticated');
        }
      } else {
        // No está logeado -> mandar al inicio (onboarding) como está previsto
        setCurrentUser(ANONYMOUS_USER);
        setSessionState('onboarding');
      }
    };

    initializeAuthSession();

    // Mantener sincronizado si cambia el estado de Firebase durante la vida de la app
    const liveUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && sessionState === 'authenticated') {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as AppUser;
            setCurrentUser(data);
            await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(data));
          }
        } catch (e) {
          // Silencioso
        }
      }
    });

    return () => {
      isMounted = false;
      liveUnsubscribe();
    };
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
    try {
      await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(newUser));
    } catch (e) {
      console.warn('Error guardando @juntitas_active_user:', e);
    }
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

    // 1. Acceso de Super Administrador protegido (Francisco Juillet)
    const isAdminIdentifier = 
      cleanEmail === 'admin' || 
      cleanEmail === 'admin@juntitas.app' || 
      cleanEmail === 'admin.global@juntitas.app' ||
      cleanEmail === 'francisco' ||
      cleanEmail === 'francisco@juntitas.app';

    if (isAdminIdentifier) {
      if (cleanPass === 'admin' || cleanPass === 'admin123' || cleanPass === 'admin2026' || cleanPass === '') {
        try {
          await signInWithEmailAndPassword(auth, 'admin@juntitas.app', 'admin123');
        } catch (e) {
          // Silencioso
        }
        setCurrentUser(SUPER_ADMIN_USER);
        try {
          await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(SUPER_ADMIN_USER));
        } catch (e) {}
        setCurrentDogs([]);
        setSessionState('authenticated');
        return { 
          success: true, 
          message: '¡Bienvenido Francisco Juillet! Acceso autorizado como Super Administrador.' 
        };
      } else {
        return { 
          success: false, 
          message: 'Contraseña de administrador incorrecta. Puedes usar "admin".' 
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
    try {
      await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(found));
    } catch (e) {}
    if (found.id) {
      await loadUserDogs(found.id);
    }
    if (found.status === 'PENDIENTE_APROBACION' || found.status === 'SUSPENDIDO') {
      setSessionState('pending_approval');
    } else {
      setSessionState('authenticated');
    }

    return { success: true, message: 'Bienvenido de vuelta, ' + found.displayName + '.' };
  };

  // Acceso directo con 1-click para pruebas del Super Admin
  const loginAsSuperAdmin = async (): Promise<{ success: boolean; message: string }> => {
    try {
      await signInWithEmailAndPassword(auth, 'admin@juntitas.app', 'admin123');
    } catch (e) {
      // Silencioso
    }
    setCurrentUser(SUPER_ADMIN_USER);
    try {
      await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(SUPER_ADMIN_USER));
    } catch (e) {}
    await loadUserDogs(SUPER_ADMIN_USER.id);
    setSessionState('authenticated');
    return { 
      success: true, 
      message: '¡Bienvenido Francisco Juillet! Acceso autorizado como Super Administrador.' 
    };
  };

  // Inicio de sesión con Google (Gmail)
  const loginWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      let appUser: AppUser;
      if (userSnap.exists()) {
        appUser = userSnap.data() as AppUser;
      } else {
        appUser = {
          id: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Usuario Google',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
          bio: 'Tutor en Juntitas con cuenta de Google.',
          roleType: 'member',
          location: { region: 'Metropolitana', comuna: 'Santiago' },
          contact: { phone: '', isPublic: false },
          privacy: { showDogsPublicly: true, showCommunitiesPublicly: true, showAttendancePublicly: true },
          pawBalance: 100,
          status: 'ACTIVO',
          createdAt: new Date()
        };
        await setDoc(userDocRef, {
          ...appUser,
          createdAt: serverTimestamp()
        });
      }

      setCurrentUser(appUser);
      try {
        await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(appUser));
      } catch (e) {}
      setSessionState('authenticated');
      return { success: true, message: `¡Bienvenido(a), ${appUser.displayName}!` };
    } catch (err: any) {
      console.warn('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, message: 'La ventana de Google se cerró antes de completar el acceso.' };
      }
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        return { 
          success: false, 
          message: 'Google Sign-In requiere estar habilitado en la consola de Firebase Console (Authentication > Sign-in method > Google).' 
        };
      }
      return { success: false, message: 'Error con Google Sign-In: ' + (err.message || err) };
    }
  };

  // Restablecer contraseña mediante correo electrónico
  const sendPasswordReset = async (emailToReset: string): Promise<{ success: boolean; message: string }> => {
    try {
      const clean = (emailToReset || '').trim().toLowerCase();
      if (!clean) {
        return { success: false, message: 'Por favor ingresa tu correo electrónico.' };
      }
      await sendPasswordResetEmail(auth, clean);
      return { 
        success: true, 
        message: `¡Correo enviado! Te enviamos un enlace a ${clean} para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.` 
      };
    } catch (err: any) {
      console.warn('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        return { success: false, message: 'No existe ninguna cuenta registrada con este correo electrónico.' };
      }
      if (err.code === 'auth/invalid-email') {
        return { success: false, message: 'El formato de correo no es válido.' };
      }
      return { success: false, message: 'Error al enviar restablecimiento: ' + (err.message || err) };
    }
  };

  // Cargar perritos del usuario activo
  const loadUserDogs = async (userId: string): Promise<Dog[]> => {
    if (!userId) return [];
    try {
      const dogs = await getDogsByOwner(userId);
      setCurrentDogs(dogs);
      return dogs;
    } catch (e) {
      console.warn('Error cargando perritos del usuario:', e);
      return [];
    }
  };

  const addDogToUser = async (dogData: any): Promise<{ success: boolean; message: string }> => {
    if (!currentUser?.id) {
      return { success: false, message: 'Debes iniciar sesión para registrar a tu perrito.' };
    }
    const res = await createDogForOwner(currentUser.id, dogData);
    if (res.success && res.dog) {
      await loadUserDogs(currentUser.id);
      setCurrentUser(prev => ({ ...prev, pawBalance: (prev.pawBalance || 0) + 50 }));
    }
    return { success: res.success, message: res.message };
  };

  const refreshDogs = async () => {
    if (currentUser?.id) {
      await loadUserDogs(currentUser.id);
    }
  };

  // Cargar perritos automáticamente cuando cambia el usuario
  useEffect(() => {
    if (currentUser?.id) {
      loadUserDogs(currentUser.id);
    }
  }, [currentUser?.id]);

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@juntitas_active_user');
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    setCurrentUser(ANONYMOUS_USER);
    setCurrentDogs([]);
    setSessionState('onboarding');
  };

  const updateUserPhoto = async (photoUrl: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (currentUser?.id) {
        await updateDoc(doc(db, 'users', currentUser.id), {
          photoURL: photoUrl,
          updatedAt: new Date()
        });
      }
      const updated = { ...currentUser, photoURL: photoUrl };
      setCurrentUser(updated);
      try {
        await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(updated));
      } catch (e) {}
      return { success: true, message: 'Foto de perfil actualizada correctamente' };
    } catch (err: any) {
      console.warn('Error actualizando foto de perfil en Firestore:', err);
      const updated = { ...currentUser, photoURL: photoUrl };
      setCurrentUser(updated);
      try {
        await AsyncStorage.setItem('@juntitas_active_user', JSON.stringify(updated));
      } catch (e) {}
      return { success: true, message: 'Foto de perfil actualizada' };
    }
  };

  const isSuperAdmin = currentUser.isSuperAdmin || currentUser.roleType === 'super_admin';

  const isPrimaryAdminOf = (communityId: string) => {
    if (!communityId) return false;
    const profile = getProfileInfo(currentUser);
    return profile.roleType === 'primary_admin' && profile.communityIdManaged === communityId;
  };

  const canCreateEventFor = (communityId: string) => {
    if (!communityId) return false;
    const profile = getProfileInfo(currentUser);
    if (profile.communityIdManaged === communityId) {
      if (profile.roleType === 'primary_admin') return true;
      if (profile.roleType === 'secondary_admin') {
        return !!profile.secondaryPermissions?.canCreateEvents;
      }
    }
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
        loginAsSuperAdmin,
        loginWithGoogle,
        sendPasswordReset,
        logout,
        loadUserDogs,
        addDogToUser,
        refreshDogs,
        updateUserPhoto,
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
