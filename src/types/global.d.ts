/**
 * Global type declarations for the Nekazari host runtime.
 * These globals are injected by the host before module bundles execute.
 *
 * The shape of `window.__NKZ__.register()` is owned by `@nekazari/module-kit`;
 * we keep this declaration loose because modern modules call it via the
 * generated entry (`toNKZRegistration(defineModule(...))`).
 */

declare global {
  interface Window {
    /** Host module registry — populated by the IIFE-wrapped moduleEntry.gen.ts */
    __NKZ__?: {
      register(registration: unknown): void;
      events?: {
        emit(type: string, payload: unknown): void;
        on(type: string, callback: (event: unknown) => void): () => void;
      };
    };
    /** @nekazari/sdk exposed by the host */
    __NKZ_SDK__?: typeof import('@nekazari/sdk');
    /** @nekazari/ui-kit exposed by the host */
    __NKZ_UI__?: typeof import('@nekazari/ui-kit');
    /** React 18 exposed by the host */
    React: typeof import('react');
    ReactDOM: typeof import('react-dom');
    ReactRouterDOM: typeof import('react-router-dom');
    /** CesiumJS — available in the map viewer context */
    Cesium?: unknown;
  }
}

export {};
