# 🐾 Juntitas — Plataforma de Comunidades Caninas, Juntas & Pasaporte Digital

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.0-0284C7.svg?style=for-the-badge&logo=semver&logoColor=white)](https://github.com/Panshoots/Juntitas/releases)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2052-000020.svg?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.79.2-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v11.6-FFCA28.svg?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-10B981.svg?style=for-the-badge)](LICENSE)

**La red social y plataforma de gestión definitiva para comunidades perrunas organizadas, encuentros caninos verificados, gamificación comunitaria y pasaportes coleccionables.**

[Características](#-características-principales) • [Arquitectura](#-arquitectura--stack-tecnológico) • [Estructura del Proyecto](#-estructura-del-proyecto) • [Estrategia Git & Ramas](#-estrategia-de-ramas-en-git) • [Versionado & Roadmap](#-política-de-versionado--roadmap) • [Instalación](#-instalación-y-ejecución-local) • [Changelog](CHANGELOG.md)

</div>

---

## 🐶 ¿Qué es Juntitas?

**Juntitas** es una solución tecnológica integral diseñada para resolver la fragmentación y el desorden de los grupos de WhatsApp e Instagram en las comunidades de amantes de los perros.

A través de una arquitectura limpia y una experiencia de usuario orientada al bienestar animal, Juntitas centraliza:
1. **Juntas Caninas Oficiales**: Convocatorias estructuradas con punto de encuentro geolocalizado en mapa, conteo transparente y diferenciado de tutores vs. perritos, y notificaciones de cambios en tiempo real.
2. **Pasaporte Perruno Digital**: Identidad digital única para cada perro, con acumulación de trayectoria, sellos de asistencia y títulos honoríficos.
3. **Comunidades Verificadas & Moderación**: Administración delegada, gestión de roles, actualización de perfiles comunitarios y herramientas de moderación fotográfica legal.
4. **Economía de Recompensas ("Huellitas")**: Gamificación con libro mayor inmutable, ruleta sorpresa diaria, catálogo de premios y validación comercial de cupones vía QR.
5. **Panel CRM Super Administrador**: Herramienta de supervisión centralizada para auditar eventos, habilitar comercios/comunidades y enviar restablecimientos de contraseña.

---

## ✨ Características Principales

### 1. 🔄 Pantalla de Carga Inteligente (Splash & Auto-Detección de Sesión)
- **Splash Screen de Bienvenida**: Animación elegante con latido de patita (`🐾`), indicador de progreso y mensajes dinámicos (*"Verificando tu sesión..."*, *"Cargando la manada..."*).
- **Resolución Asíncrona de Sesión**: Temporizador inteligente de ~2.5 segundos que permite verificar simultáneamente el almacenamiento local (`AsyncStorage`) y el estado de autenticación en la nube (`Firebase Auth`).
- **Transición Cero-Flicker**: Si el usuario ya está autenticado, navega directamente a la aplicación principal sin parpadeos ni destellos hacia la pantalla de login.

### 2. 🔐 Autenticación Granular & Filtros de Acceso
- **Flujo de Onboarding**: Carrusel interactivo de 4 diapositivas explicativas de la propuesta de valor.
- **Perfiles Especializados**:
  - **🐶 Tutor Canino**: Registro ágil con ficha de perrito (nombre, raza, tamaño) y bono de bienvenida de 100 Huellitas.
  - **👑 Líder Comunitario**: Solicitud de comunidad con Instagram oficial y datos de liderazgo. Cuenta en revisión (`PENDIENTE_APROBACION`).
  - **🏪 Tienda / Comercio**: Registro para locales y stands caninos. Cuenta en revisión (`PENDIENTE_APROBACION`).
- **Restablecimiento de Contraseña**: Envío automático de enlaces de recuperación de clave por correo electrónico desde el login y desde el panel CRM.

### 3. 🪪 Pasaporte Perruno Coleccionable
- Carnet digital coleccionable de cada perro con foto, raza, tamaño y fecha de nacimiento.
- Historial acumulativo de juntas caninas oficiales asistidas.
- Sistema de medallas desbloqueables (*Primer Registro*, *Explorador*, *Amigo Fiel*, *Veterano*).
- Título honorífico de antigüedad y contador de comunidades suscritas.

### 4. 📅 Juntas & Encuentros Oficiales
- **Selector de Mapa Gratuito**: Integración interactiva con OpenStreetMap / Leaflet sin costo de APIs propietarias para seleccionar con precisión el punto de encuentro.
- **Control Estricto de Convocatoria**: Solo los administradores legítimos (Principal o Secundario habilitado) de una comunidad pueden publicar juntas a nombre de su respectiva manada.
- **Conteo Segregado en 3 Pestañas**:
  - 👤 **Tutores Inscritos**: Lista detallada de asistentes humanos.
  - 🐶 **Perritos Participantes**: Visualización exacta de los perros asistentes para planificar seguridad y espacio.
  - 🏪 **Comercios Asociados**: Puestos de hidratación, pastelerías o stands confirmados.
- **Asistencia con Selección de Mascotas**: Soporte para familias multicaninas, permitiendo al tutor elegir exactamente a cuáles de sus perritos llevará al encuentro.

### 5. 🔔 Sistema de Notificaciones en Tiempo Real
- **Avisos de Cancelación / Eliminación**: Cuando una junta es cancelada o suspendida por el administrador, se envía una notificación inmediata al celular de todos los tutores confirmados con el motivo detallado de la cancelación.
- **Nuevas Juntas en la Manada**: Los miembros de una comunidad reciben notificación instantánea cuando se publica una nueva junta oficial.
- **Campana de Notificaciones & Modal Interactivo**: Contador dinámico de alertas no leídas y destacados en banner rojo para eventos cancelados.

### 6. 📸 Álbumes Comunitarios & Moderación Legal
- **Subida Asociada a Perritos**: Al publicar fotos en la comunidad, el tutor selecciona directamente cuál de sus perritos registrados protagoniza la imagen.
- **Likes Únicos por Usuario**: Sistema anti-abuso donde cada miembro solo puede reaccionar una vez por fotografía.
- **Panel de Moderación para Administradores**:
  - Cambio de foto de portada y logo comunitario.
  - Modificación de descripciones/pies de foto inapropiados.
  - Bloqueo legal de imágenes con motivo formal (infracción a normas de convivencia o leyes de tenencia responsable) y opción de reactivación.

### 7. 🎁 Gamificación — Huellitas, Ruleta & Comercios
- **Libro Mayor Inmutable (Ledger)**: Las Huellitas se gestionan mediante registros transaccionales auditables.
- **Ruleta Sorpresa Diaria**: Temporizador de cooldown de 5 horas con 4 niveles de rareza equilibrados (*Normal 75%*, *Especial 18%*, *Dorada 6%*, *Legendaria 1%*) con lluvia de confeti animada.
- **Catálogo & Cupones QR**: Canje de premios con generación de código QR único de 6 dígitos que solo el comercio autorizado puede validar y quemar.

### 8. 🛡️ Panel CRM de Super Administrador
- Acceso reservado para el Super Administrador supremo (**Francisco Juillet**).
- **Gestión de Usuarios**: Búsqueda, filtros por estado (`ACTIVO`, `PENDIENTE`, `SUSPENDIDO`), suspensión justificada y cambio granular de roles.
- **Gestión de Comunidades**: Aprobación de solicitudes y designación de administradores.
- **Gestión Centralizada de Juntas**: Supervisión de encuentros, cancelación asistida y trazabilidad total mediante registros de auditoría (*Audit Logs*).

---

## 🛠️ Arquitectura & Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                    JUNTITAS CLIENT (UI/UX)                  │
│       React Native 0.79.2  •  Expo SDK 52  •  TypeScript    │
│  React Navigation v7  •  Vector Icons  •  Animatable        │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│     CLIENT STORAGE      │           │   FIREBASE CLOUD SUITE  │
│  @react-native-async-   │           │  • Firebase Auth        │
│  storage (Local Session)│           │  • Cloud Firestore      │
└─────────────────────────┘           │  • Security Rules       │
                                      └─────────────────────────┘
```

| Componente | Tecnología | Versión | Propósito |
| :--- | :--- | :--- | :--- |
| **Framework Base** | Expo SDK | `^52.0.0` | Runtime unificado para Web, Android e iOS |
| **Librería UI** | React Native | `0.79.2` | Componentes nativos multiplataforma |
| **Lenguaje** | TypeScript | `^5.3.3` | Tipado estático y robustez arquitectónica |
| **Navegación** | React Navigation | `^7.1.6` | Pilas nativas (Stack) y pestañas inferiores (Tabs) |
| **Autenticación** | Firebase Auth | `^11.6.0` | Manejo seguro de credenciales, Google Sign-In y tokens |
| **Base de Datos** | Cloud Firestore | `^11.6.0` | Persistencia reactiva NoSQL en tiempo real |
| **Almacenamiento Local** | AsyncStorage | `^2.1.2` | Persistencia de sesiones y caché de inicio |
| **Iconos & Estilos** | Expo Vector Icons | `^14.1.0` | Iconografía Ionicons optimizada |

---

## 📁 Estructura del Proyecto

```text
Juntitas/
├── App.tsx                      # Punto de entrada principal con Context Providers
├── app.json                     # Metadatos del proyecto Expo (Versión 1.0.0, iconos, splash)
├── package.json                 # Dependencias y scripts de ejecución
├── tsconfig.json                # Configuración de TypeScript
├── assets/                      # Recursos visuales (iconos, splash, logotipos)
└── src/
    ├── components/              # Componentes reutilizables de interfaz
    │   ├── EventCard.tsx        # Tarjeta de junta canina con estado
    │   ├── NotificationsModal.tsx # Modal desplegable de notificaciones
    │   ├── RoleSwitcherBar.tsx  # Barra de contexto y sesión
    │   ├── SurprisePawModal.tsx # Ruleta animada de Huellitas con confeti
    │   └── OsmMapPickerModal.tsx# Selector de mapa gratuito OpenStreetMap
    ├── context/                 # Estado global de la aplicación
    │   ├── AuthContext.tsx      # Sesiones, autenticación y persistencia
    │   └── ToastContext.tsx     # Notificaciones toast emergentes
    ├── firebase/
    │   └── config.ts            # Conexión oficial al proyecto Firestore juntitas-47e8d
    ├── models/                  # Interfaces de datos y modelos TypeScript
    │   ├── Community.ts         # Estructura de comunidades y permisos delegados
    │   ├── Dog.ts               # Ficha canina y pasaporte
    │   ├── Event.ts             # Juntas caninas, asistencias y coordenadas
    │   ├── Notification.ts      # Modelo de notificaciones push
    │   └── User.ts              # Modelos de usuario, roles y estados
    ├── navigation/              # Configuración de rutas y pantallas
    │   ├── AppNavigator.tsx     # Enrutador condicional (Splash, Auth, Main)
    │   ├── BottomTabNavigator.tsx # Pestañas principales (Home, Juntas, Comunidades, etc.)
    │   └── types.ts             # Tipos de navegación para React Navigation
    ├── screens/                 # Pantallas completas de la aplicación
    │   ├── SplashScreen.tsx     # Pantalla de carga con auto-detección
    │   ├── OnboardingScreen.tsx # Carrusel de bienvenida
    │   ├── AuthScreen.tsx       # Inicio de sesión y registro
    │   ├── HomeScreen.tsx       # Muro principal, eventos destacados y notificaciones
    │   ├── EventsScreen.tsx     # Explorador de juntas y creación con mapa
    │   ├── CommunitiesScreen.tsx# Directorio de manadas, fotos y moderación
    │   ├── DogPassportScreen.tsx# Carnet canino digital y medallas
    │   ├── StoreScreen.tsx      # Ruleta diaria, catálogo y Huellitas
    │   ├── BusinessPortalScreen.tsx # Escaneo y validación comercial de cupones
    │   ├── SuperAdminPanelScreen.tsx # Panel de control CRM supremo
    │   └── AccountPendingScreen.tsx  # Pantalla de cuentas en revisión
    └── services/                # Capa de servicios y operaciones Firestore
        ├── authService.ts       # Operaciones de login, registro y reset
        ├── communityService.ts  # CRUD de comunidades y membresías
        ├── communityPhotoService.ts # Fotos comunitarias, likes y moderación
        ├── dogService.ts        # CRUD de perros y pasaportes
        ├── eventService.ts      # Gestión de juntas, mapa y asistencias
        ├── notificationService.ts # Despacho y lectura de alertas en tiempo real
        ├── pawService.ts        # Transacciones del libro mayor de Huellitas
        └── userService.ts       # Gestión de usuarios y perfiles en Firestore
```

---

## 🌿 Estrategia de Ramas en Git

El proyecto sigue una adaptación estricta del modelo **Git Flow** para garantizar la estabilidad entre el código de desarrollo y las versiones de producción:

```text
  main (Producción)     ──●──────────────────────● [v1.0.0 Tag] ───● [v1.1.0 Tag]
                          ▲                      ▲                 ▲
                          │                      │                 │
  develop (Desarrollo)  ──●────────●──────●──────●─────────────────●
                                   │      ▲
                                   ▼      │
  feature/*                        ●──────● (feature/apk-packaging)
```

| Rama | Propósito | Reglas |
| :--- | :--- | :--- |
| **`main`** | **Producción oficial**. Contiene únicamente versiones terminadas, estables y auditadas. | Cada commit corresponde a un release etiquetado (`v1.0.0`, `v1.1.0`). No se comitea directamente. |
| **`develop`** | **Integración y pruebas**. Rama principal de trabajo donde convergen las nuevas funciones. | Debe pasar las pruebas de empaquetado antes de fusionarse a `main`. |
| **`feature/*`** | **Nuevas funcionalidades**. Ramas de corta vida creadas desde `develop`. | Se fusionan mediante Pull Request hacia `develop`. |
| **`hotfix/*`** | **Parches urgentes**. Correcciones críticas generadas directamente desde `main`. | Se integran simultáneamente a `main` y `develop`. |

---

## 🏷️ Política de Versionado & Roadmap

Juntitas implementa **Versionado Semántico (SemVer)** con el formato `MAJOR.MINOR.PATCH`:

- **MAJOR**: Cambios arquitectónicos mayores o incompatibilidades estructurales.
- **MINOR**: Nuevas funcionalidades significativas, módulos nuevos o hitos de entrega (ej. empaquetado de APK).
- **PATCH**: Correcciones de errores menores, ajustes de estilos o parches de seguridad.

### 🗺️ Hoja de Ruta de Versiones:

- **`v1.0.0` (Versión Actual - 19/09/2026)**:
  - Plataforma funcional completa para Web y Móvil.
  - Pantalla de carga inteligente con persistencia de sesión.
  - Notificaciones en tiempo real para eventos y cancelaciones.
  - Moderación legal de fotografías en comunidades.
  - Selector de mapas 100% gratuito con OpenStreetMap.
  - Conteo independiente de Tutores, Perritos y Comercios.
  - Panel CRM supremo con auditoría inmutable.
- **`v1.1.0` (Próximo Hito - Generación de APK Móvil)**:
  - Configuración y compilación del binario APK para Android con Expo Application Services (EAS Build).
  - Optimización de íconos adaptativos y splash nativo en dispositivos Android físicos.
  - Pruebas de rendimiento en conectividad móvil 4G/5G.
- **`v1.2.0` (Futura)**:
  - Geofencing automático para validación de asistencia en el perímetro de la junta.
  - Chat en vivo entre asistentes a una misma junta.

> Para revisar el historial exhaustivo de cambios de cada versión, consulta el archivo [CHANGELOG.md](CHANGELOG.md).

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- **Node.js** 18.0 o superior ([Descargar](https://nodejs.org/))
- **npm** o **yarn**
- **Git** instalado en el sistema

### Pasos de Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Panshoots/Juntitas.git
   cd Juntitas
   ```

2. **Instalar dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Ejecutar en entorno de desarrollo Web:**
   ```bash
   npx expo start --web
   ```
   Abre tu navegador en `http://localhost:8081` para interactuar con la aplicación.

4. **Ejecutar en dispositivos móviles (Android / iOS con Expo Go):**
   ```bash
   npx expo start
   ```
   Escanea el código QR mostrado en la terminal desde la app **Expo Go** en tu celular.

---

## 🔒 Credenciales de Prueba

Para pruebas en entornos locales de desarrollo:

- **Super Administrador (CRM Global)**:
  - **Correo:** `admin@juntitas.app`
  - **Contraseña:** `admin` (o `admin123`)
- **Tutor Estándar**:
  - Puedes crear una cuenta nueva con un solo clic desde el formulario de registro.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---

<div align="center">
Hecho con ❤️ y dedicación para toda la manada canina 🐾  
<b>© 2026 Juntitas Platform • Desarrollado por Panshoots</b>
</div>
