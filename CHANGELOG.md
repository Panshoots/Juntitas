# Changelog — Juntitas 🐾

Todos los cambios notables en este proyecto serán documentados en este archivo.  
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased] - [1.1.0]

### 📱 Próximo Hito: Empaquetado APK & Distribución Móvil
- **Generación de binario APK para Android**: Compilación autónoma mediante Expo Application Services (EAS) o build local.
- **Iconos Adaptativos Android**: Optimización de `adaptive-icon.png` con soporte para temas oscuros y claros del sistema.
- **Pantalla Splash Nativa**: Configuración de `splash.image` y tiempos de transición a nivel de sistema operativo.
- **Sincronización Offline Mejorada**: Almacenamiento en caché de juntas y pasaporte cuando no haya conexión móvil.

---

## [1.0.0] - 2026-09-19

### 🚀 Lanzamiento Oficial v1.0.0 (Producción)

#### ✨ Pantalla de Carga Inicial (Splash & Persistencia de Sesión)
- **Splash Screen animado (`SplashScreen.tsx`)**: Insignia central con latido de patita (`🐾`), barra de progreso circular y mensajes rotativos de estado (*"Verificando tu sesión..."*, *"Cargando la manada..."*).
- **Temporizador de tolerancia de sesión**: Espera garantizada de ~2.5 segundos que permite a `Firebase Auth` y a `AsyncStorage` resolver credenciales previas sin parpadeos indeseados.
- **Persistencia local automática (`@juntitas_active_user`)**: Las sesiones activas de tutores y administradores se conservan localmente y se limpian estrictamente al cerrar sesión.

#### 🔔 Sistema de Notificaciones en Tiempo Real
- **Notificaciones automáticas ante cancelación o eliminación de juntas**: Al cancelar o eliminar un evento desde la app o el CRM, todos los tutores con asistencia confirmada reciben una alerta prioritaria en su dispositivo con el motivo obligatorio de la cancelación.
- **Avisos de nuevas convocatorias**: Notificación a todos los miembros de una comunidad cuando un administrador publica una nueva junta oficial.
- **Campana con contador dinámico y modal interactivo (`NotificationsModal.tsx`)**: Acceso directo desde el encabezado de inicio con marcado de lectura individual o masivo.

#### 🗺️ Geolocalización & Selector de Mapa Gratuito
- **Integración con OpenStreetMap (`OsmMapPickerModal.tsx`)**: Selector visual interactivo para ubicar el punto exacto de encuentro sin requerir costos de APIs de mapas de terceros.
- **Coordenadas y deep linking a Google Maps**: Enlace directo para navegación asistida en carretera respetando la privacidad del usuario (sin GPS en segundo plano).

#### 🛡️ Reglas Estrictas de Publicación & Administración Delegada
- **Restricción estricta de convocatoria**: Solo el Administrador Principal y los Administradores Secundarios autorizados de una comunidad específica pueden publicar juntas en su nombre. Se bloquea la creación indebida en comunidades ajenas.
- **Gestión interactiva de Administradores Secundarios**: El Administrador Principal puede promover miembros, delegar permisos de moderación o revocar accesos según la regla R-0802.

#### 👥 Conteo Segregado de Asistentes en 3 Pestañas
- **Desglose independiente**:
  - **Tutores**: Asistentes humanos registrados.
  - **Perritos**: Mascotas específicas que acudirán al evento.
  - **Comercios**: Stands y tiendas que participarán en la junta.
- **Selección de perritos para asistencia**: Tutores con más de un perro pueden indicar con precisión cuáles de sus mascotas asistirán y modificar su elección sin duplicar la asistencia.

#### 📸 Álbumes Comunitarios & Moderación Legal
- **Selector de perrito en fotografías**: Al subir una foto comunitaria, el usuario asocia la imagen directamente a uno de sus perritos registrados.
- **Sistema de Likes Únicos**: Previene el spam permitiendo exactamente un like por usuario por foto.
- **Herramientas de moderación comunitaria**:
  - Actualización de logotipo y foto de portada comunitaria por parte de administradores.
  - Bloqueo legal de imágenes con causal obligatoria por infracción a normas o leyes de bienestar animal.
  - Edición de pies de foto y reactivación de fotos suspendidas.

#### 💼 CRM de Super Administrador (Francisco Juillet)
- **Gestión de Juntas en el CRM**: Visualización de eventos, cancelación con motivo auditado y eliminación controlada.
- **Restablecimiento de Contraseñas por Correo**: Capacidad de disparar correos de recuperación de contraseña de Firebase Auth tanto desde el CRM como desde la pantalla de login.
- **Logs de Auditoría Inmutables (`auditLogs`)**: Trazabilidad detallada de cada acción administrativa.

---

## [0.1.2-beta] - 2026-09-16

### 🐾 Gamificación & Huella Sorpresa
- **Cooldown estricto de 5 horas**: Ventana de espera de 5 horas (`COOLDOWN_HOURS = 5`) con marca de tiempo persistente para evitar acumulación indiscriminada.
- **Cuenta regresiva en tiempo real**: Contador interactivo (`XXh XXm XXs`) en la tarjeta de inicio y en el modal de ruleta.
- **Probabilidades balanceadas**: Legendaria (1%), Dorada (6%), Especial (18%), Normal (75%).
- **Lluvia de confeti**: Animación festiva al obtener recompensas Doradas y Legendarias.

### 🛡️ Panel CRM Supremo
- Perfil oficial configurado para Francisco Juillet (`admin@juntitas.app`).
- Herramientas de testing: "Vaciar Toda la App" (Factory Reset) y "Poblar 10 Usuarios & 4 Tiendas" (Seeder).

---

## [0.1.1-beta] - 2026-09-16

### 🔒 Seguridad & Autenticación
- Eliminación de accesos rápidos no autorizados en pantallas públicas.
- Acceso exclusivo al CRM mediante credenciales legítimas.
- Cierre de sesión nativo en el perfil de usuario.

---

## [0.1.0-beta] - 2026-09-16

### ✨ Lanzamiento Inicial
- Flujo de Onboarding con 4 diapositivas.
- Registro con filtro de seguridad para Tutores, Líderes y Comercios.
- Pasaporte perruno digital coleccionable.
- Integración a Cloud Firestore (`juntitas-47e8d`).
- Primeras juntas caninas oficiales con conteo separado y deep link a mapas.
