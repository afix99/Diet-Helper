'use client'

import { flourishesOn } from '@/lib/motion'

/**
 * The cat's one hello.
 *
 * A speech bubble that appears above the cat the first time you open the app
 * and then never again — the flag lives on `PetState.greeted`, the same shape
 * as `seenStage` guarding the stage-up celebration.
 *
 * Two things about how it is placed:
 *
 * - **It sits in the layout, not over it.** The obvious build is an absolutely
 *   positioned bubble floating above the cat, and that is precisely the shape
 *   of decoration that escaped its container twice in this project and shoved
 *   the whole page sideways. A bubble that occupies a real row cannot do that
 *   at any width, and the tail below it does all the work of pointing at the
 *   cat that the floating version would have done with coordinates.
 * - **Calm mode still gets the message.** `flourishesOn()` gates the entrance
 *   animation only. The words are content; the bounce is decoration. Someone
 *   who has turned motion off has not asked to be told less.
 */
export function PetBubble({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="mb-2 flex">
      <button
        type="button"
        onClick={onDismiss}
        data-pet-bubble
        aria-label={`${text}. Tap to dismiss`}
        /*
         * `primary-container` rather than a low-opacity primary. The first cut
         * used bg-primary/12, which is a pale enough wash on a white card that
         * the bubble did not read as a bubble at all — just floating text. The
         * container token exists precisely to be a filled surface that carries
         * primary-ink at proper contrast in both themes.
         */
        className={`tap relative max-w-full rounded-card rounded-bl-sm bg-primary-container px-3 py-2 text-left shadow-card ${
          flourishesOn() ? 'animate-pop-in' : ''
        }`}
      >
        {/*
          role="status" rather than an alert: a screen reader should mention it
          in passing, not interrupt whatever it was reading.
        */}
        <p role="status" className="text-tertiary font-semibold leading-snug text-primary-ink">
          {text}
        </p>
        {/* The tail, pointing down-left at the cat below it. A rotated square
            rather than a triangle path, so it inherits the same background and
            can never drift out of tint with the bubble. */}
        <span
          aria-hidden
          className="absolute -bottom-1 left-4 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-primary-container"
        />
      </button>
    </div>
  )
}
