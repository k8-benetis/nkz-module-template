# Nekazari Module Template

Starter template for building **external modules** for the Nekazari platform.

Modules compile to a single IIFE bundle (`dist/nkz-module.js`) plus a `dist/manifest.json`. Both are uploaded to MinIO and loaded at runtime by the host. No build-time coupling to the host.

---

## Quick start

```bash
git clone https://github.com/nkz-os/nkz-module-template.git my-module
cd my-module
pnpm install
```

Do a **find-and-replace** across the repo for these placeholders:

| Placeholder | Example value | Where |
|-------------|---------------|-------|
| `MODULE_NAME` | `soil-sensor` | package.json (`name`, `nkz.moduleId`), Module.tsx (`id`), k8s/, SQL |
| `MODULE_DISPLAY_NAME` | `Soil Sensor` | Module.tsx (`displayName`), locales/, k8s/, SQL |
| `MODULE_ROUTE` | `/soil-sensor` | Module.tsx (`route`), SQL |
| `YOUR_ORG` | `acme-corp` | k8s/backend-deployment.yaml, SQL |

Then edit `src/Module.tsx` to declare your slots, accent colour, navigation entry, permissions, and data dependencies.

---

## Structure

```
my-module/
├── src/
│   ├── Module.tsx              # SINGLE SOURCE OF TRUTH — defineModule({...})
│   ├── App.tsx                 # Main page component (rendered at route)
│   ├── main.tsx                # Dev-only entry (Vite) — wraps in MockProvider
│   ├── slots/index.ts          # Declare which host slots you occupy
│   ├── components/slots/       # Slot React components
│   ├── locales/{en,es}.json    # i18n bundles
│   └── types/                  # TypeScript types
├── backend/                    # FastAPI backend (optional, delete if unused)
├── k8s/
│   ├── backend-deployment.yaml # K8s Deployment + Service for backend
│   └── registration.sql        # Insert/update marketplace_modules
├── vite.config.ts              # One-liner: defineConfig(nkzModulePreset())
├── package.json                # nkz.moduleId points here
└── dist/
    ├── nkz-module.js           # Build output — upload to MinIO
    └── manifest.json           # Auto-generated from Module.tsx
```

---

## `defineModule()` — the single source of truth

Edit `src/Module.tsx`:

```tsx
import { defineModule } from '@nekazari/module-kit';
import { lazy } from 'react';
import { moduleSlots } from './slots';

const MainPage = lazy(() => import('./App'));

export default defineModule({
  id: 'soil-sensor',
  displayName: 'Soil Sensor',
  version: '1.0.0',
  hostApiVersion: '^2.0.0',
  accent: { base: '#A16207', soft: '#FEF3C7', strong: '#713F12' },
  icon: 'sprout',
  main: MainPage,
  route: '/soil-sensor',
  navigation: { section: 'modules', priority: 60 },
  slots: moduleSlots,
  api: { basePath: '/api/soil-sensor' },          // optional — only if backend
  requiredRoles: ['Farmer', 'TenantAdmin'],
  requiredPlan: 'basic',
  data: {
    entities: ['AgriParcel', 'AgriSoil'],         // CSP-of-data allowlist
    timeseries: ['soil_observations'],
  },
});
```

The `dist/manifest.json` is auto-emitted from this declaration. You don't write it by hand.

---

## Hooks — the only way to talk to the platform

All hooks from `@nekazari/module-kit` resolve inside the host (production) or against in-memory mocks (`pnpm run dev`).

```ts
const { user, tenantId, roles, hasRole, hasPlan } = useAuth();
const { t, lang, setLang } = useI18n();
const { emit, on } = usePlatformEvents();              // namespaced to module:<id>:

// NGSI-LD entities (CRUD + cache via TanStack Query)
const { data: parcels } = useEntities('AgriParcel', { q: 'category=="vineyard"' });
const { data: parcel } = useEntity('urn:ngsi-ld:AgriParcel:42');
const { mutateAsync: createParcel } = useCreateEntity();

// Timescale
const { data: temps } = useTimeseries({
  entityId: 'urn:ngsi-ld:WeatherObserved:station-1',
  attribute: 'temperature',
  from: new Date(Date.now() - 7 * 86400_000),
  to: new Date(),
});

// File storage scoped to tenants/<tenant>/modules/<id>/
const { upload, getUrl } = useFiles();
const { url } = await upload(file, 'reports/2026/foo.pdf');

// Your own backend (basePath from defineModule({ api }))
const { data: forecast } = useGet<Forecast>('/forecast/today');
const { mutateAsync: createOrder } = usePost<{ ok: boolean }, OrderBody>('/orders');
```

You never write `fetch`, never handle JWT cookies, never construct `Fiware-Service` headers.

---

## Build

```bash
pnpm run build:module
# → dist/nkz-module.js   (IIFE bundle, ~50–300 KB depending on dependencies)
# → dist/manifest.json   (public metadata for the host + gateway CSP)
```

The `@nekazari/module-builder` preset enforces:
- **IIFE format** — single self-executing bundle
- **Classic JSX runtime** — required for the UMD React global
- **Externalized dependencies** — React, ReactDOM, react-router-dom, `@nekazari/*` mapped to window globals. Never bundle them.

---

## Local development

```bash
pnpm run dev
# Vite dev server at http://localhost:5003
# Wraps the module in MockProvider — useAuth/useOrion/useFiles/etc. return
# in-memory fixtures, no platform required.
```

For integration with a real backend, set `VITE_PROXY_TARGET=https://your-api-domain` in `.env`.

---

## Deploy

### 1. Upload bundle + manifest to MinIO

```bash
sudo mc cp dist/nkz-module.js minio/nekazari-frontend/modules/MODULE_NAME/nkz-module.js \
   --attr "Content-Type=application/javascript"
sudo mc cp dist/manifest.json minio/nekazari-frontend/modules/MODULE_NAME/manifest.json \
   --attr "Content-Type=application/json"
```

### 2. Register in the database

```bash
kubectl exec -n nekazari deployment/postgresql -- \
  psql -U postgres -d nekazari -f /tmp/registration.sql
```

Or insert manually and update `remote_entry_url = '/modules/MODULE_NAME/nkz-module.js'`.

### 3. Deploy backend (if your module has one)

```bash
docker build -t ghcr.io/YOUR_ORG/MODULE_NAME-backend:v1.0.0 ./backend
docker push ghcr.io/YOUR_ORG/MODULE_NAME-backend:v1.0.0
kubectl apply -f k8s/backend-deployment.yaml -n nekazari
```

Add an ingress rule routing `/api/MODULE_NAME` → `MODULE_NAME-api-service:8000` before the generic `/api` catch-all.

---

## Slots

Edit `src/slots/index.ts` to register your components in host slots:

```ts
import { ExampleSlot } from '../components/slots/ExampleSlot';

export const moduleSlots = {
  'context-panel': [
    { id: 'soil-sensor-panel', component: ExampleSlot, priority: 10 },
  ],
};
```

Available slot types:

| Slot | Where it renders |
|------|-----------------|
| `context-panel` | Side panel when an entity is selected |
| `bottom-panel` | Tabbed panel at the bottom of the viewer |
| `map-layer` | Overlay or toolbar button on the 3D map |
| `layer-toggle` | Toggle entry in the layer panel |
| `entity-tree` | Context menu in the entity tree |
| `dashboard-widget` | Card in the tenant dashboard |

The module-kit translates your `{id, component, priority}` entries into the runtime `SlotWidgetDefinition` shape automatically — `component` is the actual React reference, not a string.

---

## CSP-of-data (api-gateway enforcement)

When the bundle calls a platform API, the SDK injects `X-Module-Id`. The gateway reads it, fetches your module's `manifest.json` from MinIO, and validates that the requested `type=` (NGSI-LD) or hypertable (Timescale) appears in your declared `data.entities` / `data.timeseries`.

- **No `data.entities` declared** → fail-open (legacy modules keep working).
- **`data.entities: ['*']`** → wildcard, opt out of enforcement (not recommended).
- **`data.entities: ['AgriParcel']`** → only `?type=AgriParcel` is allowed; anything else returns 403.

Declare exactly what you need. This is the platform's lightweight defence-in-depth — no replacement for sandboxing.

---

## Build rules (critical)

- **JSX runtime must be `classic`** — `tsconfig.json` has `"jsx": "react"`. The preset uses `jsxRuntime: 'classic'`. Automatic runtime emits `_jsx()` which doesn't exist on the UMD `window.React` global.
- **Never bundle externalized deps** — React, ReactDOM, react-router-dom, `@nekazari/*`. They come from the host. Bundling creates two React instances and breaks hooks.
- **Web workers must use `?worker&inline`** — `import MyWorker from './worker?worker&inline'`. Without `&inline`, Vite emits a separate file that fails when loaded from MinIO.
- **No Module Federation** — the host uses IIFE-only loading.

---

## License

Apache-2.0 — you are free to license your derived module under any terms.
