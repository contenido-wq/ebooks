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
    },
  }),
});
