/**
 * Single declarative source of truth for this module.
 *
 * `defineModule` is consumed by:
 *   - @nekazari/module-builder — generates moduleEntry + dist/manifest.json
 *   - the host runtime — registers route, slots, navigation, permissions
 *   - `nkz dev` — wires the dev shell against MockProvider
 *
 * Replace the MODULE_ placeholders below and delete this comment.
 */
import { defineModule } from '@nekazari/module-kit';
import { lazy } from 'react';
import { moduleSlots } from './slots';
import pkg from '../package.json';

const MainPage = lazy(() => import('./App'));

export default defineModule({
  // === Identity ===
  id: 'MODULE_NAME',
  displayName: 'MODULE_DISPLAY_NAME',
  version: pkg.version,
  hostApiVersion: '^2.0.0',
  description: 'MODULE_DISPLAY_NAME — short description of what this module does.',

  // === UI ===
  accent: { base: '#3B82F6', soft: '#DBEAFE', strong: '#1D4ED8' },
  icon: 'puzzle',
  main: MainPage,

  // === Host integration ===
  route: '/MODULE_ROUTE',
  navigation: {
    section: 'modules',
    priority: 50,
  },
  slots: moduleSlots,

  // === Backend (optional) ===
  // Uncomment if this module ships a backend in `backend/`:
  // api: { basePath: '/api/MODULE_NAME' },

  // === Permissions ===
  requiredRoles: ['Farmer', 'TenantAdmin', 'PlatformAdmin'],
  requiredPlan: 'basic',

  // === Data dependencies (CSP-of-data enforced by the api-gateway) ===
  // Declare the NGSI-LD entity types and Timescale hypertables this module
  // reads/writes. The gateway will block requests for anything else.
  // Use ['*'] as wildcard to opt out (not recommended for production).
  data: {
    entities: [],
    timeseries: [],
  },
});
