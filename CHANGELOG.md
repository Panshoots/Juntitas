# Changelog — Juntitas 🐾

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato sigue las directrices de [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y respeta el versionado semántico.

---

## [0.1.2-beta] - 2026-09-16

### 🐾 Gamificación & Huella Sorpresa (Cooldown y Rarezas)
- **Cooldown estricto de 5 horas**: Implementada ventana de espera de 5 horas (`COOLDOWN_HOURS = 5`) con almacenamiento de marca de tiempo (`lastSurprisePawClaim`). Impide clics ilimitados y acumulación indiscriminada de huellitas.
- **Reloj de cuenta regresiva en tiempo real**: Contador visual interactivo (`XXh XXm XXs`) tanto en la tarjeta de inicio (`HomeScreen.tsx`) como en el modal (`SurprisePawModal.tsx`).
- **Probabilidades escasas y equilibradas**:
  - *Legendaria* (1%): +500 a 1000 huellitas.
  - *Dorada* (6%): +150 a 250 huellitas.
  - *Especial* (18%): +40 a 70 huellitas.
  - *Normal* (75%): +10 a 25 huellitas.
- **Animación de Serpentinas / Confeti**: Efecto festivo de serpentinas animadas al desbloquear rarezas Dorada y Legendaria.

### 🛡️ Super Administrador "Francisco Juillet" & Herramientas de Base de Datos
- **Identidad formal del Super Admin**: Perfil renombrado oficialmente a **Francisco Juillet (SuperAdmin)** con correo `admin@juntitas.app`.
- **Acceso exclusivo y seguro**: Autenticación estricta con credenciales `admin` / `admin` sin puertas traseras públicas.
- **Botón "Vaciar Toda la App" (Factory Reset)**: Permite reiniciar la base de datos completa con confirmación de seguridad, eliminando todos los datos de prueba y preservando únicamente la cuenta del Super Admin Francisco Juillet.
- **Botón "Poblar 10 Usuarios & 4 Tiendas" (Seed)**: Herramienta en el CRM que genera:
  - 10 usuarios realistas chilenos.
  - 1 a 3 perros aleatorios por usuario con razas y edades diversas.
  - 4 tiendas caninas verificadas con sus respectivos productos y descuentos.
  - 3 comunidades principales con Administradores Principales asignados.
  - 2 juntas caninas programadas con ubicación.

---

## [0.1.1-beta] - 2026-09-16


### 🔒 Seguridad & Autenticación Estricta
- **Eliminación de atajos de admin no autorizados**: Se retiraron todos los botones públicos de "Acceso Admin" y "Entrar Super Admin" de las pantallas de Onboarding, Registro y Cuenta Pendiente.
- **Autenticación formal de Administrador**: El acceso al Super Admin y su CRM ahora es estrictamente a través del formulario de Login ingresando las credenciales autorizadas (`admin` / `admin`).
- **Eliminación de la barra flotante de roles**: Se eliminó la barra `RoleSwitcherBar` de `App.tsx`. Ahora la aplicación es 100% nativa y cada usuario opera única y exclusivamente con los permisos legítimos de su cuenta.
- **Cierre de sesión nativo**: Añadido botón de "Cerrar Sesión" en el Perfil de Usuario.

---

## [0.1.0-beta] - 2026-09-16

### ✨ Añadido
- **Onboarding e Introducción**: Carrusel interactivo de bienvenida (`OnboardingScreen.tsx`) que explica los 4 pilares: Comunidades, Juntas, Pasaporte Canino y Huellitas.
- **Registro con Filtro de Acceso**:
  - Modalidad de registro con selector de 3 perfiles: Tutor Canino (+ perro), Líder Comunitario (+ grupo canino) y Tienda Canina (+ comercio).
  - Filtro de seguridad: los perfiles de líderes de comunidad y tiendas se registran con estado `PENDIENTE_APROBACION`.
- **Pantalla de Cuenta en Revisión / Suspendida**: Vista protegida (`AccountPendingScreen.tsx`) para cuentas pendientes de aprobación o suspendidas con atajo para pruebas de Super Admin.
- **Base de Datos Firebase Firestore (`juntitas-47e8d`)**:
  - Conexión directa a las colecciones `users`, `dogs`, `communities`, `communityRequests`, `events`, `eventAttendances`, `businesses` y `auditLogs`.
  - Eliminación de datos mock estáticos en memoria para permitir el llenado orgánico en tiempo real.
- **Panel CRM Completo para Super Administrador (`SuperAdminPanelScreen.tsx`)**:
  - CRM de Usuarios: Listado en vivo, buscador, filtros por estado (`PENDIENTE`, `ACTIVO`, `SUSPENDIDO`).
  - Botón *Habilitar / Aprobar*: activación instantánea de cuentas.
  - Botón *Suspender*: bloqueo con motivo obligatorio de suspensión según la regla R-2401.
  - Botón *Cambiar Rol*: asignación de roles entre Super Admin, Principal, Secundario, Comercio o Tutor.
  - Botón *Editar Datos*: actualización de información visible del usuario.
  - CRM de Comunidades: aprobación de solicitudes comunitarias y asignación automática de Administrador Principal (R-0601, R-0602).
  - CRM de Auditoría: trazabilidad de todas las acciones del CRM (`auditLogs`).
- **Pasaporte Perruno Digital**: Carnet coleccionable de perritos con medallas, antigüedad y conteos derivados.
- **Juntas & Encuentros**:
  - Deep link a Google Maps sin GPS obligatorio.
  - Conteo transparente separado de tutores vs perritos inscritos (Regla R-1203).
  - Permiso exclusivo de publicación para administradores (`EVENT_CREATE`).
- **Gamificación**: Huellitas con libro mayor inmutable, ruleta sorpresa diaria y canje de cupones QR únicos de 6 caracteres.
