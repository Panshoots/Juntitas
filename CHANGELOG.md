# Changelog — Juntitas 🐾

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato sigue las directrices de [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y respeta el versionado semántico.

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
