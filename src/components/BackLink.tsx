'use client'

import Link from 'next/link'

export function BackLink() {
  return (
    <Link href="/more" className="tap mb-2 inline-flex items-center gap-1 text-secondary text-primary">
      <span aria-hidden>‹</span> More
    </Link>
  )
}
