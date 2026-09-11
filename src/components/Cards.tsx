import type { Card, Chapter, QuestionCard } from '../types'

export function ChapterSymbol({ chapter, className = '' }: { chapter: Chapter; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" {...common}>
      {chapter.symbol === 'window' && <><rect x="16" y="10" width="68" height="80" rx="34" /><path d="M50 10V90M16 50H84" /></>}
      {chapter.symbol === 'overlap' && <><rect x="11" y="12" width="51" height="70" rx="25" /><rect x="38" y="20" width="51" height="70" rx="25" /></>}
      {chapter.symbol === 'fork' && <><path d="M50 94V52C50 26 15 34 15 7M50 52C50 26 85 34 85 7" /><path d="M29 91V55M71 91V55" /></>}
      {chapter.symbol === 'open-circle' && <><path d="M80 26a38 38 0 1 0 7 40" /><path d="M50 3V21M79 50H98" /></>}
    </svg>
  )
}

export function CardBack({ chapter, small = false }: { chapter: Chapter; small?: boolean }) {
  return (
    <div
      className={`game-card game-card--back card-tone--${chapter.id} ${small ? 'game-card--small' : ''}`}
      aria-label={`Закрытая карточка главы «${chapter.title}»`}
    >
      <p className="card-kicker">Кажется,<br />я тебя знаю</p>
      <ChapterSymbol chapter={chapter} className="card-symbol" />
      <p className="card-footer"><span>{chapter.number} / 04</span><span>{chapter.title}</span></p>
    </div>
  )
}

function cardLabel(card: Card, chapter?: Chapter) {
  if (chapter) return `${chapter.number} · ${chapter.title}`
  if (card.type === 'follow_up') return 'Уточнение'
  if (card.type === 'special') return 'Специальный ход'
  return 'Финальная карточка'
}

export function CardFace({
  card,
  chapter,
  compact = false,
  favorite = false,
  onFavorite,
}: {
  card: Card
  chapter?: Chapter
  compact?: boolean
  favorite?: boolean
  onFavorite?: () => void
}) {
  const tone = chapter?.id || (card.type === 'special' ? 'special' : card.type === 'follow_up' ? 'followup' : 'closing')
  return (
    <article className={`game-card game-card--face card-tone--${tone} ${compact ? 'game-card--compact' : ''}`}>
      <header className="card-meta">
        <span>{cardLabel(card, chapter)}</span>
        <span>{card.id}</span>
      </header>
      <div className="card-main">
        <p className="card-title">{card.title}</p>
        <p className="card-prompt">{card.prompt}</p>
      </div>
      <footer className="card-meta card-meta--bottom">
        <span>Кажется, я тебя знаю</span>
        {card.type === 'question' && card.guess && <span className="card-tag">Можно угадать</span>}
        {onFavorite && (
          <button
            type="button"
            className={`bookmark ${favorite ? 'bookmark--active' : ''}`}
            onClick={(event) => { event.stopPropagation(); onFavorite() }}
            aria-pressed={favorite}
            aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
          </button>
        )}
      </footer>
    </article>
  )
}

export function QuestionCardFace(props: {
  card: QuestionCard
  chapter: Chapter
  compact?: boolean
}) {
  return <CardFace {...props} />
}
