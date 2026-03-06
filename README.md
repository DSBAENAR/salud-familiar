<p align="center">
  <img src="https://img.icons8.com/fluency/96/heart-with-pulse.png" width="80" alt="Salud Familiar Logo"/>
</p>

<h1 align="center">Salud Familiar</h1>

<p align="center">
  <strong>Plataforma personal para gestionar la salud de mi papa a traves del sistema de EPS colombiano</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Puppeteer-24-40B5A4?logo=puppeteer" alt="Puppeteer"/>
  <img src="https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway" alt="Railway"/>
</p>

---

## Por que existe esto

Mi papa tiene multiples especialidades medicas activas. En Colombia, cada consulta, examen o procedimiento requiere una **autorizacion previa** de la EPS, y el proceso para conseguirla es absurdamente tedioso: entrar al portal, llenar formularios, subir archivos, resolver captchas, y repetir. Por cada especialidad.

Ademas, los correos de confirmacion de citas, aprobaciones y documentos llegan dispersos a Gmail, los PDFs vienen encriptados, y no hay un solo lugar donde ver el panorama completo de su salud.

Construi **Salud Familiar** para que mi familia pueda gestionar todo esto desde un solo lugar, y para automatizar lo que mas tiempo consume: **las solicitudes de autorizacion**.

---

## Que hace

### Automatizacion de autorizaciones

Solo hay que subir la formula medica. Un bot con Puppeteer se encarga del resto: entra al portal de Sura, llena todo, resuelve el captcha y envia la solicitud. El progreso se ve en tiempo real en la pantalla.

### Dashboard centralizado

Citas proximas, autorizaciones pendientes, ordenes por tramitar — todo en una vista. Con alertas de lo que necesita atencion inmediata.

### Sincronizacion de correos

Conecta Gmail, busca correos de Sura y clasifica automaticamente: citas confirmadas, autorizaciones aprobadas, documentos adjuntos. Descifra los PDFs encriptados y los almacena organizados.

### Gestion completa

- **Citas**: fecha, hora, profesional, lugar, estado
- **Autorizaciones**: ciclo completo pendiente → solicitada → aprobada/rechazada
- **Documentos**: organizados por especialidad y tipo (historias, ordenes, examenes)
- **Ordenes**: prescripciones con checklist de tareas pendientes
- **Notificaciones**: badge con conteo de items que necesitan accion
- **Actividad**: log de auditoria de quien entra y que hace (solo admin)

### Acceso familiar

Login con Google OAuth. Solo los emails de la familia pueden entrar (lista blanca configurable).

---

## Stack

| Capa | Tecnologia |
|---|---|
| **Framework** | Next.js 16.1 (App Router + Turbopack) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Lucide Icons |
| **Auth** | NextAuth.js v5 (Google OAuth, JWT) |
| **Base de datos** | PostgreSQL (Neon Serverless) |
| **ORM** | Drizzle ORM |
| **Automatizacion** | Puppeteer + puppeteer-extra (Stealth + Recaptcha) |
| **Captcha** | 2captcha API |
| **Email** | Gmail API (googleapis) |
| **Deploy** | Docker + Railway (con Chromium headless) |

---

## Inicio rapido

### Prerrequisitos

- Node.js 20+
- PostgreSQL (o cuenta gratuita en [Neon](https://neon.tech))
- Google Cloud Console (OAuth credentials)
- [2captcha](https://2captcha.com) API key (para la automatizacion)

### Instalacion

```bash
git clone https://github.com/tu-usuario/salud-familiar.git
cd salud-familiar
npm install
```

### Variables de entorno

Crea `.env.local` en la raiz:

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Auth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-secret
AUTH_SECRET=genera-con-openssl-rand-base64-32
ALLOWED_EMAILS=tu@email.com,familiar@email.com

# Portal Sura
SURA_NUM_DOC=numero-cedula
SURA_PASSWORD=clave-portal
SURA_CORREO=correo@email.com
SURA_CELULAR=3001234567
SURA_TELEFONO=6041234567

# Captcha
TWOCAPTCHA_KEY=tu-api-key

# PDFs encriptados
PDF_PASSWORD=clave-pdf

# Gmail (opcional)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

### Desarrollo

```bash
npx drizzle-kit push   # Crear tablas
npm run dev             # http://localhost:3000
```

### Deploy

```bash
# Docker local
docker build -t salud-familiar .
docker run -p 3000:3000 --env-file .env.local salud-familiar

# Railway: conecta el repo, configura env vars + AUTH_TRUST_HOST=true
```

---

## Arquitectura

```
src/
├── app/
│   ├── (app)/                    # Rutas protegidas
│   │   ├── page.tsx              # Dashboard
│   │   ├── citas/                # Gestion de citas
│   │   ├── autorizaciones/       # Tracking + automatizacion
│   │   ├── documentos/           # Documentos por especialidad
│   │   ├── ordenes/              # Ordenes medicas
│   │   ├── correos/              # Sync Gmail
│   │   └── actividad/            # Log de actividad (admin)
│   ├── api/                      # API routes (REST + SSE)
│   └── login/
├── components/                   # shadcn/ui + custom
├── lib/
│   ├── auth.ts                   # NextAuth + activity logging
│   ├── activity.ts               # Registro de actividad
│   ├── db/                       # Drizzle ORM (9 tablas)
│   └── gmail/                    # Sync + parser de correos Sura
└── middleware.ts                  # Proteccion de rutas

scripts/
└── solicitar-autorizacion.mjs    # Bot Puppeteer
```

### Modelo de datos

```
pacientes ──┬── especialidades
             ├── autorizaciones ──── tareas
             ├── citas
             ├── documentos
             └── ordenes ──────────── tareas

actividad          (log de auditoria)
emailsProcesados   (deduplicacion de correos)
```

---

## Roadmap

### Implementado

- [x] Dashboard con metricas y alertas
- [x] Automatizacion de autorizaciones EPS Sura
- [x] Progreso en tiempo real (SSE)
- [x] Sincronizacion y clasificacion de correos (Gmail API)
- [x] Descifrado automatico de PDFs encriptados
- [x] Gestion de citas, autorizaciones, ordenes y documentos
- [x] Auth Google OAuth con lista blanca familiar
- [x] Notificaciones de items pendientes
- [x] Log de actividad (admin)
- [x] Deploy Docker + Railway

### En progreso

- [ ] Sincronizacion con Google Calendar
- [ ] Backup automatico a Google Drive

### Planeado

- [ ] **Multi-EPS** — soporte para Sanitas, Nueva EPS, Compensar
- [ ] **Multi-paciente** — gestionar varios familiares
- [ ] **Notificaciones push** — recordatorios de citas (Web Push)
- [ ] **Alertas WhatsApp/Telegram** — cambios de estado de autorizaciones
- [ ] **OCR de formulas** — escanear y autocompletar formularios
- [ ] **Timeline medico** — historial visual de consultas y procedimientos
- [ ] **Exportacion PDF** — consolidado medico descargable
- [ ] **PWA offline** — consultar info sin conexion
- [ ] **Alertas inteligentes** — vencimiento de autorizaciones, recordatorio de medicamentos

### Mejoras tecnicas

- [ ] Tests E2E (Playwright)
- [ ] CI/CD (GitHub Actions)
- [ ] Rate limiting
- [ ] WebSocket en vez de SSE
- [ ] Cache (Redis)
- [ ] Logging estructurado
- [ ] OpenTelemetry
- [ ] Migracion Puppeteer → Playwright

---

## Contexto

En Colombia, las EPS requieren autorizaciones previas para casi todo: consultas con especialistas, examenes, procedimientos, medicamentos. El flujo es (Al menos en Sura):

1. Medico general → orden/formula
2. Entrar al portal de la EPS → formulario + captcha + adjuntos
3. Esperar aprobacion por correo
4. Agendar cita
5. Repetir por cada especialidad

Cuando tu familiar tiene cardiologo, urologo, oftalmologo y necesita examenes periodicos, esto consume horas cada semana. Este proyecto nacio para resolver ese problema en mi familia.

---

## Contribuciones

Si te identificas con este problema (y en Colombia somos muchos), las contribuciones son bienvenidas:

- Agregar soporte para otra EPS
- Mejorar el parser de correos
- Agregar tests
- Reportar bugs

```bash
git checkout -b feature/mi-mejora
git commit -m "feat: descripcion"
git push origin feature/mi-mejora
```

---

## Licencia

MIT

---

<p align="center">
  <sub>Hecho con cafe colombiano para la familia Baena</sub>
</p>
