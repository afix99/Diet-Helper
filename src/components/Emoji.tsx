/**
 * Renders one of the downloaded Twemoji PNGs from public/emoji.
 *
 * Real artwork rather than a system emoji: the OS draws those differently on
 * every device, and they arrive in fixed colours that fight the palette.
 *
 * Width and height are always set so the image reserves its space before it
 * loads and nothing shifts underneath the user's thumb.
 */
export type EmojiName =
  | 'flame'
  | 'search'
  | 'star'
  | 'salad'
  | 'clock'
  | 'bowl'
  | 'mail'
  | 'phone'
  | 'scales'
  | 'footprints'
  | 'calendar'
  | 'fish'
  | 'muscle'
  | 'target'
  | 'medal'
  | 'trophy'
  | 'sparkles'
  | 'droplet'
  | 'pill'

export function Emoji({
  name,
  size = 20,
  alt = '',
  className = '',
}: {
  name: EmojiName
  size?: number
  /** Leave empty for decoration; set it when the image carries meaning. */
  alt?: string
  className?: string
}) {
  return (
    <img
      src={`/emoji/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      draggable={false}
      decoding="async"
      loading="lazy"
      className={`inline-block select-none align-[-0.15em] ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

/** A badge medallion, in its locked or unlocked state. */
export function BadgeArt({
  id,
  unlocked,
  size = 72,
  className = '',
}: {
  id: string
  unlocked: boolean
  size?: number
  className?: string
}) {
  return (
    <img
      src={`/badges/${id}${unlocked ? '' : '-locked'}.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
