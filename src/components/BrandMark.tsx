export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? 'brand-lockup--compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span>Евгений Лошак</span>
    </span>
  )
}
