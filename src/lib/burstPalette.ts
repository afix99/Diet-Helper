/**
 * What a food looks like when it lands.
 *
 * Every one of the catalogue's 24 categories gets three colours and a shape, so
 * the burst reads as the thing you logged rather than as generic confetti:
 * fruit throws bright round pieces, vegetables throw leaves, oils throw slow
 * translucent droplets, coffee throws dark crumbs.
 *
 * Colours are literal rather than palette tokens on purpose. These are drawn on
 * a canvas, not styled by CSS, so a token would have to be read back out of the
 * document on every burst; and they describe food rather than the interface, so
 * they should not shift when the theme does.
 */
export type BurstShape = 'dot' | 'ring' | 'crumb' | 'leaf' | 'droplet' | 'spark'

export interface BurstStyle {
  colours: [string, string, string]
  shape: BurstShape
  /** Multiplier on the particle's fall. Heavy food falls faster. */
  weight: number
}

/** Used only when a food has no category at all; a test forbids it in practice. */
export const FALLBACK: BurstStyle = {
  colours: ['#c9a3b4', '#e0c7d2', '#f0e2e8'],
  shape: 'dot',
  weight: 1,
}

export const BURST_STYLES: Record<string, BurstStyle> = {
  FRUITS: { colours: ['#ff7a9c', '#ffb84d', '#7ed957'], shape: 'dot', weight: 0.85 },
  VEGETABLES: { colours: ['#4faa5a', '#8fd06a', '#2f7d4f'], shape: 'leaf', weight: 0.7 },
  'SALMON & FISH': { colours: ['#ff9e7a', '#7fc4d6', '#f2b8a2'], shape: 'spark', weight: 1 },
  SEAFOOD: { colours: ['#63b8cc', '#f2a58c', '#a8dce6'], shape: 'spark', weight: 1 },
  POULTRY: { colours: ['#e0b072', '#f6ddb4', '#c68a4a'], shape: 'crumb', weight: 1 },
  MEAT: { colours: ['#c05a55', '#e08a7a', '#8f3f3f'], shape: 'crumb', weight: 1.25 },
  'EGGS & DAIRY': { colours: ['#ffd75e', '#fff6e0', '#f5e3b8'], shape: 'dot', weight: 0.9 },
  'PLANT PROTEIN': { colours: ['#8fae5a', '#c8d99a', '#6b8f3f'], shape: 'crumb', weight: 0.95 },
  'LEGUMES & BEANS': { colours: ['#a8763f', '#d6a86a', '#7d5528'], shape: 'crumb', weight: 1.1 },
  'NUTS & SEEDS': { colours: ['#b98a4f', '#e2c08a', '#8a6234'], shape: 'crumb', weight: 1.2 },
  CARBOHYDRATES: { colours: ['#e6c98f', '#f7e6c4', '#c9a45f'], shape: 'crumb', weight: 1 },
  'NOODLES & GRAINS': { colours: ['#f0d69a', '#e0b45f', '#fff0cf'], shape: 'spark', weight: 0.9 },
  'BREAD & BAKERY': { colours: ['#d8a45e', '#f2d9ac', '#a9743a'], shape: 'crumb', weight: 1 },
  'OILS & FATS': { colours: ['#f2c94c', '#fbe79a', '#e0a83c'], shape: 'droplet', weight: 0.55 },
  'SAUCES & CONDIMENTS': { colours: ['#d94f3d', '#f08a6c', '#a5301f'], shape: 'droplet', weight: 0.8 },
  BEVERAGES: { colours: ['#6fb7d6', '#b8e0ef', '#3f8fb0'], shape: 'droplet', weight: 0.6 },
  'CHAIN DRINKS': { colours: ['#c98fd6', '#efc9f2', '#8f5aa8'], shape: 'droplet', weight: 0.6 },
  'ZUS COFFEE': { colours: ['#6b4630', '#a8724a', '#e0c9a8'], shape: 'crumb', weight: 1.15 },
  SNACKS: { colours: ['#f2a03d', '#ffd08a', '#d67a1f'], shape: 'crumb', weight: 0.95 },
  'TREATS & FLEXIBLE FOODS': { colours: ['#ff6fa5', '#ffd166', '#8fd0f0'], shape: 'ring', weight: 0.8 },
  'LOCAL DISHES': { colours: ['#e0873f', '#f2c069', '#a84f2f'], shape: 'spark', weight: 1 },
  'MAMAK / STREET FOOD': { colours: ['#d9702f', '#f0b95e', '#8f4520'], shape: 'spark', weight: 1.05 },
  'VIRAL & STREET FOOD': { colours: ['#ff5c8a', '#ffc861', '#5ec8d9'], shape: 'ring', weight: 0.9 },
  'KOREAN & FAST FOOD': { colours: ['#e8453f', '#ffb03b', '#f5e6d0'], shape: 'ring', weight: 1 },
  /*
   * The sushi shop. Salmon coral, nori green-black and rice cream run through
   * all five, so the whole menu bursts as one restaurant rather than five
   * unrelated things — but the shapes differ by what you actually ordered: a
   * rice bowl lands heavier than a salad, and sashimi is the lightest thing
   * on the menu in every sense.
   */
  'SUSHI DELIVERY DON': { colours: ['#ff8a5c', '#f7e3c8', '#3f5a4a'], shape: 'crumb', weight: 1.1 },
  'SUSHI DELIVERY BOWLS': { colours: ['#ff8a5c', '#7ac74f', '#f7e3c8'], shape: 'leaf', weight: 0.8 },
  'SUSHI DELIVERY BENTO': { colours: ['#ff8a5c', '#e8b04b', '#3f5a4a'], shape: 'crumb', weight: 1.2 },
  'SUSHI DELIVERY SUSHI': { colours: ['#ff7a4f', '#fdf6ea', '#2f4a3d'], shape: 'spark', weight: 0.75 },
  'SUSHI DELIVERY SIDES': { colours: ['#8fbf7a', '#f7e3c8', '#c9884a'], shape: 'dot', weight: 0.7 },
}

/**
 * Movement, not dinner.
 *
 * Exercise bursts share the shape vocabulary but not the food palettes: sparks
 * and rings in the interface's own energetic colours, so a logged workout reads
 * as effort rather than as something landing on a plate. Mental work throws the
 * quietest of them, which is also the honest picture of what it costs.
 */
export const EXERCISE_STYLES: Record<string, BurstStyle> = {
  'WALKING & RUNNING': { colours: ['#4fb0d9', '#a8e0f2', '#2f7f9e'], shape: 'spark', weight: 0.7 },
  CYCLING: { colours: ['#5ac8b0', '#a8ead9', '#2f8f7a'], shape: 'ring', weight: 0.7 },
  'SWIMMING & WATER': { colours: ['#3f9fd0', '#9fd8f0', '#68c8e0'], shape: 'droplet', weight: 0.6 },
  'STUDIO & HOME': { colours: ['#f06fa5', '#ffb3d0', '#d9478a'], shape: 'spark', weight: 0.65 },
  STRENGTH: { colours: ['#8f7fd9', '#c4b8f0', '#5f4faa'], shape: 'ring', weight: 1.1 },
  SPORTS: { colours: ['#f2a03d', '#ffd08a', '#4fb0d9'], shape: 'dot', weight: 0.8 },
  EVERYDAY: { colours: ['#7ec98f', '#c2e8cc', '#4f9a63'], shape: 'leaf', weight: 0.75 },
  'MACHINES & LOW IMPACT': { colours: ['#9aa8c4', '#d0d8e8', '#6b7a9a'], shape: 'ring', weight: 0.85 },
  // Deliberately faint and slow: three hours of revision is about 150 kcal.
  'MIND & DESK': { colours: ['#b0a8d0', '#ded8ee', '#8f86b8'], shape: 'dot', weight: 0.45 },
}

/**
 * The streak cat reaching a new stage.
 *
 * Its own style rather than the fallback, which is a pale pink dot: at the size
 * a celebration wants, those read as a smudge sitting over the cat's face
 * rather than as confetti coming off it. Small bright sparks in the app's own
 * accent colours, and light enough to hang in the air for a moment.
 */
export const PET_STYLE: BurstStyle = {
  colours: ['#f2c94c', '#7ed957', '#ff6fa5'],
  shape: 'spark',
  weight: 0.6,
}

export function exerciseStyleFor(category: string | null | undefined): BurstStyle {
  return (category && EXERCISE_STYLES[category]) || FALLBACK
}

export function styleFor(category: string | null | undefined): BurstStyle {
  return (category && BURST_STYLES[category]) || FALLBACK
}
