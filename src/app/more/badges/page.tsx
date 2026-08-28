'use client'

import { useMemo } from 'react'
import { BackLink } from '@/components/BackLink'
import { Card, PageHeader } from '@/components/ui'
import { badgesFor, streakFor } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

export default function BadgesPage() {
  const { data, ready } = useData()
  const today = todayIso()
  const list = useMemo(() => badgesFor(data, today), [data, today])
  const run = useMemo(() => streakFor(data, today), [data, today])

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>

  const unlocked = list.filter((b) => b.unlocked)

  return (
    <>
      <BackLink />
      <PageHeader ms="Lencana" en={`${unlocked.length} / ${list.length} unlocked`} />

      <Card className="mb-4 text-center">
        <p className="text-5xl font-extrabold tabular-nums text-salmon">
          {run.current}
          <span className="ml-1 text-base font-semibold text-muted">hari</span>
        </p>
        <p className="mt-1 text-sm font-semibold">Streak semasa</p>
        <p className="text-xs text-faint">Best run: {run.best} hari</p>
        {run.usingGrace ? (
          <p className="mt-2 text-xs text-amber">
            Terlepas sehari — streak masih hidup. Log hari ini untuk sambung.
          </p>
        ) : (
          <p className="mt-2 text-xs text-faint">
            Boleh terlepas {run.graceRemaining} hari minggu ini tanpa putus streak.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {list.map((b) => (
          <Card
            key={b.id}
            className={`text-center ${b.unlocked ? 'border-salmon/40 bg-salmon/5' : ''}`}
          >
            <span
              aria-hidden
              className={`block text-3xl ${b.unlocked ? 'animate-pop-in' : 'opacity-25 grayscale'}`}
            >
              {b.emoji}
            </span>
            <p className="mt-1 text-xs font-bold leading-tight">{b.name.ms}</p>
            <p className="text-[10px] leading-tight text-faint">{b.requirement.ms}</p>
            {!b.unlocked && b.progress > 0 && (
              <div className="mt-2 h-1 overflow-hidden rounded-pill bg-raised">
                <div className="h-full bg-salmon/50" style={{ width: `${b.progress * 100}%` }} />
              </div>
            )}
            {b.unlocked && <p className="mt-1 text-[10px] font-bold text-salmon">UNLOCKED</p>}
          </Card>
        ))}
      </div>
    </>
  )
}
