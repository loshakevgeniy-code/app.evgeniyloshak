export function LilyMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`lily-mark ${className}`} viewBox="0 0 80 92" aria-hidden="true">
      <path d="M40 3C31 18 29 31 40 48C51 31 49 18 40 3Z" />
      <path d="M36 50C28 34 17 27 5 29C18 36 27 47 37 64C39 58 39 54 36 50Z" />
      <path d="M44 50C52 34 63 27 75 29C62 36 53 47 43 64C41 58 41 54 44 50Z" />
      <path d="M37 67C27 50 15 43 1 44C18 53 29 67 40 89C42 81 41 74 37 67Z" />
      <path d="M43 67C53 50 65 43 79 44C62 53 51 67 40 89C38 81 39 74 43 67Z" />
    </svg>
  )
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? 'brand-lockup--compact' : ''}`}>
      <LilyMark className="brand-mark" />
      <span className="brand-copy">
        <span className="brand-wordmark">LILYA</span>
        {!compact && <span className="brand-tagline">разговоры, которые остаются</span>}
      </span>
    </span>
  )
}
