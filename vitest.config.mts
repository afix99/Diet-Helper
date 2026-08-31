import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The same `@/` the app uses. The wardrobe test imports the accessory
  // component to check that every catalogue entry has art, so the suite has to
  // resolve paths the way Next does.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The wardrobe test imports a component, and nothing here is a React app, so
  // there is no framework plugin to set this up: tell the transform to compile
  // JSX with the automatic runtime.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    // Run in the timezone the app is actually used in. A UTC-only test run
    // hid a day-off-by-one in the week and streak calculations.
    env: { TZ: 'Asia/Kuala_Lumpur' },
  },
})
