# 🐾 Juntitas — Plataforma de Comunidades, Juntas & Pasaporte Canino

> **Versión:** `v0.1.0-beta`  
> **Repositorio Oficial:** [https://github.com/Panshoots/Juntitas](https://github.com/Panshoots/Juntitas)  
> **Especificación:** Basada en la *Especificación Funcional Maestra v2.0* (Documento de 16 páginas sin ambigüedades).

---

## 🐶 ¿Qué es Juntitas?

**Juntitas** es la plataforma digital oficial para centralizar la vida social y organizada de las comunidades de perritos. Resuelve el desorden de mensajes en WhatsApp e Instagram, ofreciendo una estructura clara para:
- Conocer la fecha, horario, ubicación exacta y reglas de las juntas.
- Registrar perritos y tutores de manera diferenciada.
- Llevar un carnet digital coleccionable (**Pasaporte Perruno**) con medallas y antigüedad.
- Fomentar la participación con puntos promocionales (**Huellitas**), ruleta sorpresa y canje de beneficios en tiendas caninas verificadas.
- Permitir a los organizadores y a la administración central gestionar todo a través de un **CRM completo**.

---

## ✨ Características Principales

### 1. 🚀 Onboarding Interactivo & Bienvenida
- Carrusel de 4 diapositivas explicativas que introduce a los nuevos usuarios en los pilares de la plataforma: Comunidades, Juntas estructuradas, Pasaporte Canino y Huellitas.

### 2. 📋 Registro con Filtro de Entrada & Autenticación
- **🐶 Tutor Canino**: Registra a su perrito (nombre, raza, tamaño) con activación directa y bono inicial de 100 Huellitas.
- **👑 Líder Comunitario**: Solicita fundar o administrar una comunidad (nombre, Instagram oficial). Cuenta en estado `PENDIENTE_APROBACION`.
- **🏪 Tienda / Comercio**: Solicita perfil comercial con WhatsApp y rubro. Cuenta en estado `PENDIENTE_APROBACION`.
- **Filtro de Seguridad**: Las solicitudes comerciales o comunitarias son revisadas y habilitadas por el Super Admin en el CRM antes de poder operar.

### 3. 🪪 Pasaporte Perruno Digital
- Carnet coleccionable oficial para cada perro.
- Historial de juntas asistidas y confirmadas.
- Medallas obtenidas (*Primer Registro, Explorador, Amigo Fiel, Veterano*).
- Antigüedad en la plataforma y títulos honoríficos.

### 4. 📅 Juntas & Encuentros Oficiales
- Información estructurada: fecha, hora de inicio/término, reglas obligatorias y enlace directo a **Google Maps** (sin requerir GPS invasivo en el cliente - Regla R-1101/R-1104).
- **Conteos transparentes separados (Regla R-1203)**: Cuenta por separado la cantidad de **Tutores** y la cantidad de **Perritos** inscritos para planificar espacio, seguridad e hidratación.
- Convocatoria exclusiva para administradores con permiso `EVENT_CREATE`.

### 5. 🎁 Gamificación — Huellitas & Ruleta Sorpresa
- **Libro Mayor (Ledger - Regla R-1802)**: Las Huellitas no se editan como número aislado, sino mediante transacciones inmutables de historial.
- **Huella Sorpresa diaria**: Animación de ruleta con 4 niveles de rareza: *Normal, Especial, Dorada y Legendaria*.
- **Catálogo de Recompensas**: Canje de premios digitales o comerciales con generación de **código QR único de 6 caracteres**.
- **Validación Comercial (Regla R-2103)**: Solo la tienda asociada al cupón puede escanearlo y quemarlo en su portal comercial.

### 6. 🛡️ Panel CRM para Super Administrador
- **CRM de Usuarios**: Listado en vivo, buscador y filtros (`Todos`, `Pendientes ⏳`, `Activos ✅`, `Suspendidos ⛔`).
  - **Habilitar/Aprobar**: Activa cuentas de líderes y tiendas.
  - **Suspender**: Bloqueo con **motivo obligatorio** de suspensión (Regla R-2401).
  - **Cambio de Rol**: Asignación granular entre Super Admin, Admin Principal, Admin Secundario, Comercio o Miembro.
  - **Editar Datos**: Modificación de información de contacto y comunas.
- **CRM de Comunidades**: Aprobación de nuevas solicitudes comunitarias, asignando automáticamente al solicitante como Administrador Principal (Reglas R-0601, R-0602).
- **Auditoría Inmutable (Audit Logs)**: Trazabilidad total de cada acción administrativa (actor, acción, timestamp y motivo - Reglas R-2403, R-2601).

### 7. 👑 Jerarquía de Roles y Protección
- **Regla R-0802**: Ningún Administrador Secundario puede modificar, revocar permisos ni degradar la titularidad del Administrador Principal.
- **Regla R-0901**: Una comunidad activa nunca puede quedar sin exactamente un Administrador Principal.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Framework Móvil / Web** | React Native 0.76.7 / Expo SDK 52 |
| **Lenguaje** | TypeScript |
| **Navegación** | React Navigation v6 (Bottom Tabs + Native Stack) |
| **Backend & Base de Datos** | Firebase v11 (Authentication + Cloud Firestore `juntitas-47e8d`) |
| **Diseño & UI** | Componentes nativos optimizados para iOS, Android y Web |
| **Iconografía** | `@expo/vector-icons` (Ionicons) |

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- Node.js 18+ instalado.
- Gestor de paquetes `npm`.

### Pasos
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Panshoots/Juntitas.git
   cd Juntitas
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo Expo:**
   ```bash
   # Para probar en navegador web en PC
   npx expo start --web

   # Para probar en Expo Go (Android / iOS)
   npx expo start
   ```

4. **Acceso:**  
   Abre [http://localhost:8081](http://localhost:8081) en tu navegador.

---

## 📦 Roadmap de Versiones Beta

- [x] **v0.1.0-beta**:
  - Implementación inicial de Expo 52 + TypeScript.
  - Onboarding interactivo de 4 diapositivas.
  - Sistema de registro con filtro de 3 perfiles (Tutor, Comunidad, Tienda).
  - Pantalla protegida de cuenta en revisión / suspendida.
  - Base de datos conectada a Firestore (`juntitas-47e8d`) sin datos mock estáticos.
  - Pasaporte Perruno con medallas y antigüedad.
  - Juntas estructuradas con conteo de tutores vs perros y Maps.
  - CRM de Super Administrador (Usuarios, Habilitación, Suspensión con motivo, Roles, Comunidades, Auditoría).
- [ ] **v0.2.0-beta**:
  - Carga y almacenamiento de fotos reales en Firebase Storage.
  - Notificaciones push con Firebase Cloud Messaging (FCM).
  - Escáner de cámara QR para comercios en dispositivos físicos móviles.
- [ ] **v1.0.0-rc / Estable**:
  - Preparación de compilación EAS Build para Google Play Store y Apple App Store.

---

## 📄 Licencia y Créditos
Desarrollado para la comunidad de perritos y tutores de **Juntitas**.  
Todos los derechos reservados © 2026.
