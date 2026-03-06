# Contribuir a Salud Familiar

Gracias por tu interes en contribuir. Este proyecto nacio como una herramienta personal para mi familia, pero si te es util o quieres mejorarlo, toda ayuda es bienvenida.

## Como contribuir

### Reportar un bug

1. Revisa que no exista un [issue abierto](https://github.com/DSBAENAR/salud-familiar/issues) con el mismo problema
2. Abre un nuevo issue usando la plantilla de **Bug Report**
3. Incluye pasos para reproducir, comportamiento esperado y screenshots si aplica

### Proponer una feature

1. Abre un issue usando la plantilla de **Feature Request**
2. Describe el problema que resuelve y como te imaginas la solucion
3. Espera feedback antes de empezar a implementar

### Enviar codigo

1. Haz fork del repositorio
2. Crea una rama desde `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/mi-mejora
   ```
3. Haz tus cambios
4. Asegurate de que el proyecto compila:
   ```bash
   npm run build
   ```
5. Haz commit con un mensaje descriptivo:
   ```bash
   git commit -m "feat: descripcion corta del cambio"
   ```
6. Push y abre un Pull Request hacia `develop`

## Ramas

| Rama | Proposito |
|---|---|
| `main` | Produccion. Solo se actualiza con merges desde `develop` |
| `develop` | Desarrollo. Aqui se integran las features antes de ir a produccion |
| `feature/*` | Features nuevas. Se crean desde `develop` |
| `fix/*` | Correcciones de bugs. Se crean desde `develop` |
| `hotfix/*` | Correcciones urgentes en produccion. Se crean desde `main` |

## Convenciones de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nueva funcionalidad
- `fix:` correccion de bug
- `docs:` cambios en documentacion
- `refactor:` cambios de codigo sin cambiar funcionalidad
- `test:` agregar o modificar tests
- `chore:` tareas de mantenimiento (deps, config, CI)

Ejemplos:
```
feat: agregar soporte para exportar PDF de historial
fix: corregir parsing de fecha en correos de Sura
docs: actualizar instrucciones de deploy
```

## Estructura del proyecto

```
src/
├── app/          # Paginas y API routes (Next.js App Router)
├── components/   # Componentes React (shadcn/ui + custom)
├── lib/          # Logica de negocio (auth, db, gmail)
scripts/          # Scripts de automatizacion (Puppeteer)
```

## Setup local

```bash
# Clonar tu fork
git clone https://github.com/TU-USUARIO/salud-familiar.git
cd salud-familiar

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales

# Crear tablas en la base de datos
npx drizzle-kit push

# Iniciar servidor
npm run dev
```

## Areas donde se necesita ayuda

- **Tests**: No hay tests todavia. Playwright para E2E seria ideal
- **Otras aseguradoras**: Si tu EPS tiene portal web, explorar si se puede automatizar
- **Parser de correos**: Los correos de Sura cambian de formato ocasionalmente
- **UI/UX**: Mejorar la experiencia en movil
- **Documentacion**: Mejorar guias, agregar screenshots

## Codigo de conducta

Este proyecto sigue un [Codigo de Conducta](CODE_OF_CONDUCT.md). Al participar, aceptas cumplirlo.
