import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "sidiosjugarafutbol",
    domains: ["sidiosjugarafutbol.com", "www.sidiosjugarafutbol.com"],
    workersDev: false,
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-17",
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      // Webhook de Wemany -> hoja de cálculo. Los valores se guardan con `cf workers secrets update` (ver README).
      WEBHOOK_TOKEN: bindings.secret(),
      WEBHOOK_SIGNING_SECRET: bindings.secret(),
      SHEETS_SCRIPT_URL: bindings.secret(),
      SHEETS_SCRIPT_TOKEN: bindings.secret(),
      // Descarga verificada (ver README). Dos almacenes KV privados, solo este Worker los lee:
      // COMPRADORES guarda la huella del correo de quien pagó, los tickets de descarga y los contadores de intentos;
      // LIBRO_PDF guarda el PDF (clave si-dios-jugara-futbol.pdf; un valor de KV admite hasta 25 MB).
      COMPRADORES: bindings.kv({ id: "150f74e9322f43509d65ba606b47a8ba" }),
      LIBRO_PDF: bindings.kv({ id: "67e26549044946aba6b31e6a256a1e44" }),
    },
  }),
});
