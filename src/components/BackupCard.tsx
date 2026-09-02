'use client'

import { useRef, useState } from 'react'
import { Card } from './ui'
import { Icon } from './icons'
import { backupFilename, readBackup, toBackup, type ReadResult } from '@/lib/backup'
import { useData } from '@/lib/store/provider'

/** "1 weigh-in", not "1 weigh-ins". Four counts on one line makes it worth it. */
function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`
}

/**
 * Download the diary, and put one back.
 *
 * Two things shape this. The first is that the data has exactly one home — a
 * browser that clears itself if the app goes unopened for a week — so the
 * download is the more important half and gets the plain, unguarded button.
 *
 * The second is that restoring *replaces* a diary. That is the only
 * irreversible action on this screen other than Reset, so it borrows Reset's
 * two-step shape and adds one thing Reset does not need: the confirmation says
 * what is actually in the file. "Replace with 1,412 meals and 34 weigh-ins?" is
 * a question someone can answer; "are you sure?" is not.
 */
export function BackupCard() {
  const { data, update } = useData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ReadResult | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const download = () => {
    const blob = new Blob([JSON.stringify(toBackup(data), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Freeing it immediately can cancel the download on some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setDone('Downloaded. Keep it somewhere that is not this phone.')
  }

  const choose = async (file: File | undefined) => {
    setDone(null)
    if (!file) return
    setPending(readBackup(await file.text()))
  }

  const apply = () => {
    const result = pending?.result
    if (!result) return
    update(() => result.data)
    const lost = Object.values(result.dropped).reduce((a, b) => a + b, 0)
    setPending(null)
    setDone(
      lost > 0
        ? `Restored. ${lost} unreadable ${lost === 1 ? 'row was' : 'rows were'} skipped.`
        : 'Restored.'
    )
  }

  return (
    <Card className="mb-5">
      <h2 className="text-title">Your data</h2>
      <p className="mt-1 text-tertiary leading-relaxed text-muted">
        Everything you have logged lives in this browser and nowhere else. If you do not open
        the app for a week or so, the phone is allowed to clear it. A downloaded copy is the
        only thing that survives that.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={download}
          className="tap flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-primary py-2.5 text-tertiary font-bold text-on-primary"
        >
          <Icon name="download" size={16} />
          Download my diary
        </button>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="tap flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-raised py-2.5 text-tertiary font-semibold text-muted"
        >
          <Icon name="upload" size={16} />
          Restore from a file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void choose(e.target.files?.[0])
            // Cleared so choosing the same file twice still fires a change.
            e.target.value = ''
          }}
        />
      </div>

      {pending && !pending.ok && (
        <p className="mt-3 text-tertiary leading-relaxed text-clay">{pending.error}</p>
      )}

      {pending?.ok && pending.summary && (
        <div className="mt-3 rounded-card bg-raised p-3">
          <p className="text-tertiary leading-relaxed text-muted">
            That file holds{' '}
            <b className="text-primary-ink">{plural(pending.summary.meals, 'meal')}</b>,{' '}
            {plural(pending.summary.weighIns, 'weigh-in')},{' '}
            {plural(pending.summary.activities, 'activity', 'activities')} and{' '}
            {plural(pending.summary.customFoods, 'food of your own', 'foods of your own')}.
            Restoring replaces everything currently in the app.
          </p>
          {pending.result?.repaired && (
            <p className="mt-1.5 text-caption leading-relaxed text-faint">
              Some rows in it could not be read and will be skipped.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={apply}
              className="tap min-h-11 flex-1 rounded-pill bg-clay py-2.5 text-tertiary font-bold text-on-primary"
            >
              Replace my diary
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="tap min-h-11 rounded-pill bg-surface px-4 py-2.5 text-tertiary font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {done && <p className="mt-3 text-tertiary leading-relaxed text-avocado">{done}</p>}
    </Card>
  )
}
