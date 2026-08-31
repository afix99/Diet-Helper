import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The same `@/` the app uses. The wardrobe test imports the accessory
  // component to check that every catalogue entry has art, so the suite has to
  // resolve paths the way Next does.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Run in the timezone the app is actually used in. A UTC-only test run
    // hid a day-off-by-one in the week and streak calculations.
    env: { TZ: 'Asia/Kuala_Lumpur' },
  },
})
