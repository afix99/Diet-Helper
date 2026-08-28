import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Run in the timezone the app is actually used in. A UTC-only test run
    // hid a day-off-by-one in the week and streak calculations.
    env: { TZ: 'Asia/Kuala_Lumpur' },
  },
})
