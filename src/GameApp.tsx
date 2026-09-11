import { useEffect, useMemo, useRef, useState } from 'react'
import { CardBack, CardFace, ChapterSymbol, QuestionCardFace } from './components/Cards'
import { Modal } from './components/Modal'
import { cardMatches } from './features/catalog/search'
import { createGameSession, gameReducer, makeViewKey, type GameCommand } from './features/game/engine'
import {
  createStorageAdapter,
  DEFAULT_PREFERENCES,
  deleteAppData,
  loadPreferences,
  loadSession,
  PREFERENCES_KEY,
  savePreferences,
  saveSession,
  SESSION_KEY,
} from './features/game/persistence'
import type {
  Card,
  Chapter,
  Deck,
  FollowUpCard,
  GameSession,
  HeroRole,
  Preferences,
  QuestionCard,
  RecordingMode,
  SpecialCard,
} from './types'

type AppScreen = 'home' | 'setup' | 'recording' | 'game' | 'catalog'
type CatalogType = 'all' | 'question' | 'follow_up' | 'special' | 'closing' | 'favorites'

const ROLE_LABELS: Record<HeroRole, string> = {
  close_person: 'Близкий человек',
  mother: 'Мама',
  father: 'Папа',
  sister: 'Сестра',
  brother: 'Брат',
  partner: 'Партнёр',
  friend: 'Друг или подруга',
}

function questionById(deck: Deck, id: string | null): QuestionCard | undefined {
  return deck.cards.find((card): card is QuestionCard => card.type === 'question' && card.id === id)
}

function chapterForCard(deck: Deck, card: Card): Chapter | undefined {
  return card.type === 'question' ? deck.chapters.find((chapter) => chapter.id === card.chapterId) : undefined
}

function GameHeader({ onHome, onRules, onSettings }: { onHome: () => void; onRules: () => void; onSettings: () => void }) {
  return (
    <header className="game-header">
      <button className="text-logo" type="button" onClick={onHome}>Кажется,<br />я тебя знаю</button>
      <nav aria-label="Навигация игры">
        <button className="link-button" type="button" onClick={onRules}>Правила</button>
        <button className="link-button" type="button" onClick={onSettings}>Настройки</button>
      </nav>
    </header>
  )
}

function GameHome({
  deck,
  hasActiveSession,
  onStart,
  onContinue,
  onCatalog,
  onRules,
  onSettings,
  onBack,
}: {
  deck: Deck
  hasActiveSession: boolean
  onStart: () => void
  onContinue: () => void
  onCatalog: () => void
  onRules: () => void
  onSettings: () => void
  onBack: () => void
}) {
  return (
    <div className="game-shell game-table">
      <GameHeader onHome={() => undefined} onRules={onRules} onSettings={onSettings} />
      <main className="game-home">
        <section className="game-home__copy">
          <p className="eyebrow">Игра-портрет для двоих</p>
          <h1>Кажется,<br />я тебя <em>знаю.</em></h1>
          <p className="game-lead">Вы знакомы давно. Но все ли истории друг друга вы слышали?</p>
          <div className="button-row">
            {hasActiveSession && <button className="button button--game" type="button" onClick={onContinue}>Продолжить разговор</button>}
            <button className={hasActiveSession ? 'button button--paper' : 'button button--game'} type="button" onClick={onStart}>Начать игру</button>
            <button className="button button--paper" type="button" onClick={onCatalog}>Посмотреть колоду</button>
          </div>
          <p className="game-facts">{deck.cards.length} карточек · {deck.chapters.length} главы · без правильных ответов</p>
          <p className="privacy-line">Ход партии сохраняется только в этом браузере. Ответы не записываются.</p>
        </section>
        <div className="hero-deck" aria-hidden="true">
          <div className="hero-deck__card hero-deck__card--green" />
          <div className="hero-deck__card hero-deck__card--wine" />
          <div className="hero-deck__card hero-deck__card--paper">
            <p>Первые свои</p>
            <strong>На что ушли первые деньги, которые удалось заработать самостоятельно?</strong>
            <small>Q02</small>
          </div>
        </div>
      </main>
      <button className="back-cabinet" type="button" onClick={onBack}>← Вернуться в личный кабинет</button>
    </div>
  )
}

function SetupScreen({
  setup,
  setSetup,
  onContinue,
  onBack,
}: {
  setup: { role: HeroRole; gameSize: 4 | 8; recordingMode: RecordingMode }
  setSetup: (setup: { role: HeroRole; gameSize: 4 | 8; recordingMode: RecordingMode }) => void
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <main className="setup-page game-table">
      <div className="setup-wrap">
        <button className="back-link" type="button" onClick={onBack}>← В начало</button>
        <p className="eyebrow">Перед разговором</p>
        <h1>Настроим партию</h1>
        <p className="setup-intro">Имена вводить не нужно. Выберите только формат, который подходит сейчас.</p>
        <fieldset className="choice-group">
          <legend><span>01</span> Кто сегодня главный герой?</legend>
          <div className="choice-grid choice-grid--roles">
            {(Object.keys(ROLE_LABELS) as HeroRole[]).map((role) => (
              <label className="choice" key={role}>
                <input type="radio" name="role" checked={setup.role === role} onChange={() => setSetup({ ...setup, role })} />
                <span>{ROLE_LABELS[role]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="choice-group">
          <legend><span>02</span> Сколько вопросов возьмём?</legend>
          <div className="choice-grid">
            <label className="choice choice--large">
              <input type="radio" name="size" checked={setup.gameSize === 4} onChange={() => setSetup({ ...setup, gameSize: 4 })} />
              <span><strong>Один круг</strong><small>4 вопроса · по одному из каждой главы</small></span>
            </label>
            <label className="choice choice--large">
              <input type="radio" name="size" checked={setup.gameSize === 8} onChange={() => setSetup({ ...setup, gameSize: 8 })} />
              <span><strong>Полный разговор</strong><small>8 вопросов · по два из каждой главы</small></span>
            </label>
          </div>
        </fieldset>
        <fieldset className="choice-group">
          <legend><span>03</span> Будете снимать разговор?</legend>
          <div className="choice-grid">
            <label className="choice choice--large">
              <input type="radio" name="recording" checked={setup.recordingMode === 'conversation'} onChange={() => setSetup({ ...setup, recordingMode: 'conversation' })} />
              <span><strong>Просто играем</strong><small>Никакой записи не требуется</small></span>
            </label>
            <label className="choice choice--large">
              <input type="radio" name="recording" checked={setup.recordingMode === 'external_camera'} onChange={() => setSetup({ ...setup, recordingMode: 'external_camera' })} />
              <span><strong>Снимаем разговор</strong><small>Отдельным телефоном или камерой</small></span>
            </label>
          </div>
          {setup.recordingMode === 'external_camera' && <p className="choice-note">Игра не включает камеру и не записывает звук. Лучше открыть колоду на одном устройстве, а снимать на другое.</p>}
        </fieldset>
        <button className="button button--game button--wide" type="button" onClick={onContinue}>Продолжить →</button>
      </div>
    </main>
  )
}

function RecordingAgreement({
  checked,
  setChecked,
  onContinue,
  onWithoutRecording,
  onBack,
}: {
  checked: boolean[]
  setChecked: (checked: boolean[]) => void
  onContinue: () => void
  onWithoutRecording: () => void
  onBack: () => void
}) {
  const items = [
    'Оба участника согласны на съёмку.',
    'Понятно, где будет храниться запись и кто сможет её увидеть.',
    'Любой может попросить остановить запись в любой момент.',
  ]
  return (
    <main className="setup-page game-table">
      <div className="setup-wrap setup-wrap--narrow">
        <button className="back-link" type="button" onClick={onBack}>← Назад</button>
        <p className="eyebrow">Съёмка · отдельная камера</p>
        <h1>Сначала договоритесь</h1>
        <p className="setup-intro">Эти отметки — только напоминание для разговора, а не юридическое подтверждение согласия. Они нигде не сохраняются.</p>
        <div className="check-list">
          {items.map((item, index) => (
            <label className="check-choice" key={item}>
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={() => setChecked(checked.map((value, itemIndex) => itemIndex === index ? !value : value))}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <div className="button-stack">
          <button className="button button--game button--wide" type="button" onClick={onContinue} disabled={!checked.every(Boolean)}>Продолжить со съёмкой</button>
          <button className="button button--paper button--wide" type="button" onClick={onWithoutRecording}>Продолжить без съёмки</button>
        </div>
      </div>
    </main>
  )
}

function RulesContent({ onStart }: { onStart?: () => void }) {
  return (
    <div className="rules-content">
      <ol>
        <li><span>01</span><div><strong>Возьмите две карточки</strong><p>Откройте обе. Герой выбирает вопрос, на который хочется ответить.</p></div></li>
        <li><span>02</span><div><strong>Послушайте историю</strong><p>Иногда собеседник сначала делает догадку. Проверять её и ставить оценки не нужно.</p></div></li>
        <li><span>03</span><div><strong>Уточняйте по желанию</strong><p>Можно открыть подсказку, выбрать уточнение или передать тот же вопрос собеседнику.</p></div></li>
      </ol>
      <p className="calm-note">Любой вопрос и целую главу можно пропустить без объяснений. Разговор можно закончить в любой момент.</p>
      {onStart && <button className="button button--game button--wide" type="button" onClick={onStart}>Начать с первой главы</button>}
    </div>
  )
}

function GameTopBar({ session, deck, onPause, onFinish, onRules }: { session: GameSession; deck: Deck; onPause: () => void; onFinish: () => void; onRules: () => void }) {
  const discussed = session.discussedInOrder.length
  const chapter = deck.chapters[Math.min(session.currentChapterIndex, deck.chapters.length - 1)]
  return (
    <header className="play-topbar">
      <button className="text-logo text-logo--small" type="button" onClick={onRules}>Кажется, я тебя знаю</button>
      <div className="play-progress"><span>{chapter?.number} / 04</span><strong>{discussed} из {session.gameSize} вопросов</strong></div>
      <div className="play-actions">
        <button className="link-button" type="button" onClick={onPause}>Пауза</button>
        <button className="link-button" type="button" onClick={onFinish}>Закончить разговор</button>
      </div>
    </header>
  )
}

function ChapterIntro({ chapter, onDraw, onSkip }: { chapter: Chapter; onDraw: () => void; onSkip: () => void }) {
  return (
    <section className="chapter-screen">
      <div className={`chapter-card chapter-card--${chapter.id}`}>
        <p>{chapter.number} / 04</p>
        <ChapterSymbol chapter={chapter} className="chapter-symbol" />
        <div><h1>{chapter.title}</h1><p>{chapter.subtitle}</p></div>
      </div>
      <div className="chapter-actions">
        <p>Глава {Number(chapter.number)}. Начните с пары закрытых карточек.</p>
        <button className="button button--game" type="button" onClick={onDraw}>Взять две карточки</button>
        <button className="button button--paper" type="button" onClick={onSkip}>Пропустить главу</button>
      </div>
    </section>
  )
}

function Catalog({
  deck,
  preferences,
  onToggleFavorite,
  onBack,
}: {
  deck: Deck
  preferences: Preferences
  onToggleFavorite: (id: string) => void
  onBack: () => void
}) {
  const [type, setType] = useState<CatalogType>('all')
  const [chapterId, setChapterId] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const favorites = useMemo(() => new Set(preferences.favorites), [preferences.favorites])
  const filtered = useMemo(() => deck.cards.filter((card) => {
    const typeMatch = type === 'all' || (type === 'favorites' ? favorites.has(card.id) : card.type === type)
    const chapterMatch = chapterId === 'all' || (card.type === 'question' && card.chapterId === chapterId)
    return typeMatch && chapterMatch && cardMatches(card, query)
  }), [chapterId, deck.cards, favorites, query, type])
  const openCard = deck.cards.find((card) => card.id === openId)
  const openIndex = openId ? filtered.findIndex((card) => card.id === openId) : -1

  return (
    <div className="catalog-page game-table">
      <header className="catalog-header">
        <button className="back-link" type="button" onClick={onBack}>← В игру</button>
        <p className="eyebrow">Все 35 карточек</p>
        <h1>Вся колода</h1>
        <p>Каталог не меняет ход партии. Здесь можно спокойно читать карточки и отмечать нужные закладкой.</p>
      </header>
      <main className="catalog-content">
        <label className="search-field"><span className="sr-only">Поиск по карточкам</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию и вопросу" /></label>
        <div className="filter-row" aria-label="Тип карточек">
          {([
            ['all', 'Все 35'], ['question', 'Вопросы 24'], ['follow_up', 'Уточнения 8'],
            ['special', 'Специальные 2'], ['closing', 'Финал 1'], ['favorites', 'Избранное'],
          ] as [CatalogType, string][]).map(([id, label]) => <button type="button" className={`filter-pill ${type === id ? 'is-active' : ''}`} onClick={() => setType(id)} key={id}>{label}</button>)}
        </div>
        {(type === 'all' || type === 'question') && (
          <div className="filter-row filter-row--chapters" aria-label="Глава">
            <button className={`filter-pill ${chapterId === 'all' ? 'is-active' : ''}`} type="button" onClick={() => setChapterId('all')}>Все главы</button>
            {deck.chapters.map((chapter) => <button className={`filter-pill ${chapterId === chapter.id ? 'is-active' : ''}`} type="button" onClick={() => setChapterId(chapter.id)} key={chapter.id}>{chapter.number}</button>)}
          </div>
        )}
        <p className="result-count" aria-live="polite">Карточек: {filtered.length}</p>
        <div className="catalog-grid">
          {filtered.map((card) => (
            <div className="catalog-item" key={card.id}>
              <button className="catalog-open" type="button" onClick={() => setOpenId(card.id)} aria-label={`Открыть карточку ${card.id}: ${card.title}`}>
                <CardFace card={card} chapter={chapterForCard(deck, card)} compact />
              </button>
              <button className={`catalog-bookmark ${favorites.has(card.id) ? 'is-active' : ''}`} type="button" onClick={() => onToggleFavorite(card.id)} aria-label={favorites.has(card.id) ? 'Убрать из избранного' : 'Добавить в избранное'} aria-pressed={favorites.has(card.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
              </button>
            </div>
          ))}
          {!filtered.length && <p className="catalog-empty">Ничего не нашлось. Попробуйте другой запрос или фильтр.</p>}
        </div>
      </main>
      {openCard && (
        <Modal title={openCard.title} eyebrow={`Просмотр карточки · ${openCard.id}`} wide onClose={() => setOpenId(null)}>
          <div className="card-viewer">
            <CardFace card={openCard} chapter={chapterForCard(deck, openCard)} favorite={favorites.has(openCard.id)} onFavorite={() => onToggleFavorite(openCard.id)} />
            <div className="card-viewer__copy">
              <section><p className="eyebrow">{openCard.type === 'question' ? 'Помочь начать рассказ' : 'Вторая строка'}</p><p>{openCard.detailPrompt}</p></section>
              {openCard.type === 'question' && openCard.guess && <section><p className="eyebrow">Необязательная догадка</p><p>{openCard.guess.prompt}</p></section>}
              {openCard.type === 'follow_up' && <section><p className="eyebrow">Когда пригодится</p><p>{openCard.editorial.whenToUse}</p></section>}
              <div className="viewer-nav">
                <button className="button button--paper" type="button" disabled={openIndex <= 0} onClick={() => setOpenId(filtered[openIndex - 1]?.id || null)}>← Предыдущая</button>
                <span>{openIndex + 1} из {filtered.length}</span>
                <button className="button button--paper" type="button" disabled={openIndex >= filtered.length - 1} onClick={() => setOpenId(filtered[openIndex + 1]?.id || null)}>Следующая →</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function exportDiscussed(deck: Deck, session: GameSession) {
  const questions = session.discussedInOrder.map((id) => questionById(deck, id)).filter(Boolean) as QuestionCard[]
  if (!questions.length) return
  const text = [
    deck.title,
    `Редакция колоды: ${deck.deckVersion}`,
    '',
    ...questions.flatMap((card, index) => [`${index + 1}. ${card.id} · ${card.title}`, card.prompt, '']),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'obsuzhdennye-voprosy.txt'
  link.click()
  URL.revokeObjectURL(url)
}

export function GameApp({ deck, onBackToCabinet }: { deck: Deck; onBackToCabinet: () => void }) {
  const storage = useMemo(() => createStorageAdapter(), [])
  const initialSave = useMemo(() => loadSession(storage, deck), [deck, storage])
  const [session, setSession] = useState<GameSession | null>(initialSave.session)
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(storage, deck))
  const [screen, setScreen] = useState<AppScreen>('home')
  const [setup, setSetup] = useState<{ role: HeroRole; gameSize: 4 | 8; recordingMode: RecordingMode }>({ role: 'close_person', gameSize: 4, recordingMode: 'conversation' })
  const [recordingChecks, setRecordingChecks] = useState([false, false, false])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [helper, setHelper] = useState<{ type: 'followup' | 'special'; selectedId?: string; showAll?: boolean } | null>(null)
  const [storageMessage, setStorageMessage] = useState(initialSave.corrupted ? 'Сохранённая партия была повреждена, поэтому мы начали с чистого состояния.' : '')
  const [otherTab, setOtherTab] = useState(false)
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([])
  const interactionLock = useRef(0)

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', preferences.largeText)
    document.documentElement.classList.toggle('reduce-motion', preferences.reduceMotion)
    savePreferences(storage, preferences)
  }, [preferences, storage])

  useEffect(() => {
    if (session) saveSession(storage, session)
  }, [session, storage])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) setOtherTab(true)
      if (event.key === PREFERENCES_KEY && event.newValue) setPreferences(loadPreferences(storage, deck))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [deck, storage])

  useEffect(() => {
    setDetailOpen(false)
    setHelper(null)
  }, [session?.activeQuestionId, session?.phase])

  const pairKey = session?.candidates.join('|') || ''
  useEffect(() => {
    setFlippedCardIds([])
  }, [pairKey])

  function startSetup() {
    if (session && session.phase !== 'finished' && !window.confirm('Начать новую партию? Текущий незавершённый разговор будет заменён.')) return
    setSetup({ role: 'close_person', gameSize: 4, recordingMode: 'conversation' })
    setRecordingChecks([false, false, false])
    setScreen('setup')
  }

  function createSession(recordingMode: RecordingMode) {
    const next = createGameSession(deck, { ...setup, recordingMode })
    setSession(next)
    setScreen('game')
    setRecordingChecks([false, false, false])
  }

  function continueSession() {
    if (!session) return
    if (session.recordingMode === 'external_camera') {
      setRecordingChecks([false, false, false])
      setScreen('recording')
    } else setScreen('game')
  }

  function send(kind: GameCommand['kind'], id?: string) {
    const exempt = kind === 'PAUSE' || kind === 'RESUME' || kind === 'GO_TO_CLOSING' || kind === 'REVEAL_PAIR'
    const now = Date.now()
    if (!exempt && now < interactionLock.current) return
    if (!exempt) interactionLock.current = now + 320
    setSession((current) => {
      if (!current || otherTab) return current
      return gameReducer(deck, current, {
        kind,
        id,
        expectedRevision: current.revision,
        occurredAt: new Date().toISOString(),
        viewKey: makeViewKey(current),
      })
    })
  }

  function flipCard(id: string) {
    if (!session || session.phase !== 'pair_closed' || flippedCardIds.includes(id)) return
    const next = [...flippedCardIds, id]
    setFlippedCardIds(next)
    if (next.length === session.candidates.length) send('REVEAL_PAIR')
  }

  function toggleFavorite(id: string) {
    setPreferences((current) => ({
      ...current,
      favorites: current.favorites.includes(id) ? current.favorites.filter((item) => item !== id) : [...current.favorites, id],
    }))
  }

  function removeData() {
    deleteAppData(storage)
    setSession(null)
    setPreferences(DEFAULT_PREFERENCES)
    setDeleteConfirm(false)
    setSettingsOpen(false)
    setHelper(null)
    setScreen('home')
    setStorageMessage('Локальные данные игры удалены.')
  }

  const activeCard = session ? questionById(deck, session.activeQuestionId) : undefined
  const currentChapter = session ? deck.chapters[Math.min(session.currentChapterIndex, deck.chapters.length - 1)] : deck.chapters[0]
  const followUps = deck.cards.filter((card): card is FollowUpCard => card.type === 'follow_up')
  const specialCards = deck.cards.filter((card): card is SpecialCard => card.type === 'special')
  const closingCard = deck.cards.find((card) => card.type === 'closing')

  function helperModal() {
    if (!helper || !activeCard) return null
    const selected = deck.cards.find((card) => card.id === helper.selectedId)
    const recommended = activeCard.recommendedFollowUps
      .map((id) => followUps.find((card) => card.id === id))
      .filter(Boolean) as FollowUpCard[]
    const choices = helper.type === 'special' ? specialCards : helper.showAll || !recommended.length ? followUps : recommended
    return (
      <Modal
        title={helper.type === 'special' ? 'Специальный ход' : 'Уточнить историю'}
        eyebrow={helper.type === 'special' ? 'Можно использовать сколько угодно раз' : 'Выбирает собеседник'}
        onClose={() => setHelper(null)}
        wide={Boolean(selected)}
      >
        {selected ? (
          <div className="helper-selected">
            <CardFace card={selected} />
            <div>
              <p className="helper-detail">{selected.detailPrompt}</p>
              {selected.type === 'follow_up' && <details><summary>Когда пригодится</summary><p>{selected.editorial.whenToUse}</p></details>}
              <button className="button button--game" type="button" onClick={() => setHelper(null)}>Вернуться к основному вопросу</button>
            </div>
          </div>
        ) : (
          <>
            {helper.type === 'followup' && !recommended.length && <p className="calm-note">Для этого вопроса нет автоматических рекомендаций. Можно выбрать любое уточнение или вернуться к подсказке на основной карточке.</p>}
            <div className="helper-grid">
              {choices.map((card) => (
                <button type="button" className="helper-choice" onClick={() => setHelper({ ...helper, selectedId: card.id })} key={card.id}>
                  <span>{card.id} · {card.title}</span><strong>{card.prompt}</strong>
                </button>
              ))}
            </div>
            {helper.type === 'followup' && !helper.showAll && recommended.length > 0 && <button className="button button--paper button--wide" type="button" onClick={() => setHelper({ ...helper, showAll: true })}>Все 8 уточнений</button>}
          </>
        )}
        <div className="modal-safety-actions">
          <button className="link-button" type="button" onClick={() => { setHelper(null); send('PAUSE') }}>Пауза</button>
          <button className="link-button" type="button" onClick={() => { setHelper(null); send('GO_TO_CLOSING') }}>Закончить разговор</button>
        </div>
      </Modal>
    )
  }

  function renderPlay() {
    if (!session) return null
    if (session.paused) {
      return (
        <main className="pause-screen game-table">
          <div className="pause-card">
            <p className="eyebrow">Пауза</p><h1>Разговор остановлен</h1>
            <p>Текущий вопрос скрыт. Если вы снимаете разговор отдельно, при необходимости остановите запись на той камере.</p>
            <div className="button-stack">
              <button className="button button--game" type="button" onClick={() => send('RESUME')}>Вернуться к разговору</button>
              <button className="button button--paper" type="button" onClick={() => setScreen('home')}>На главный экран</button>
              <button className="link-button" type="button" onClick={() => send('GO_TO_CLOSING')}>Закончить разговор</button>
            </div>
          </div>
        </main>
      )
    }

    if (session.phase === 'rules') {
      return <main className="play-page game-table"><div className="standalone-rules"><p className="eyebrow">Как играть</p><h1>Три простых шага</h1><RulesContent onStart={() => send('START_AFTER_RULES')} /></div></main>
    }

    if (session.phase === 'closing_offer') {
      return (
        <main className="play-page game-table"><section className="closing-screen"><p className="eyebrow">Финал · по желанию</p><h1>Открыть последнюю карточку?</h1><p>Она поможет завершить разговор, но её можно пропустить.</p><div className="button-row"><button className="button button--game" type="button" onClick={() => send('OPEN_CLOSING')}>Открыть финал</button><button className="button button--paper" type="button" onClick={() => send('FINISH')}>Закончить без карточки</button></div></section></main>
      )
    }

    if (session.phase === 'closing_card' && closingCard) {
      return (
        <main className="play-page game-table"><section className="single-card-stage"><CardFace card={closingCard} /><p className="detail-panel">{closingCard.detailPrompt}</p><button className="button button--game" type="button" onClick={() => send('FINISH')}>Завершить разговор</button></section></main>
      )
    }

    if (session.phase === 'finished') {
      const discussed = session.discussedInOrder.map((id) => questionById(deck, id)).filter(Boolean) as QuestionCard[]
      return (
        <main className="result-page game-table">
          <section>
            <p className="eyebrow">Разговор завершён</p><h1>{discussed.length ? 'Истории, которые вы обсудили' : 'Иногда достаточно просто начать'}</h1>
            <p>Приложение не записывало ответы — ниже сохранены только выбранные вопросы.</p>
            {discussed.length > 0 && <ol className="discussed-list">{discussed.map((card) => <li key={card.id}><span>{card.id}</span><div><strong>{card.title}</strong><p>{card.prompt}</p></div></li>)}</ol>}
            {session.closingViewed && <p className="calm-note">Финальная карточка была открыта.</p>}
            <div className="button-row">
              {discussed.length > 0 && <button className="button button--game" type="button" onClick={() => exportDiscussed(deck, session)}>Скачать список вопросов</button>}
              <button className="button button--paper" type="button" onClick={() => setScreen('home')}>На главный экран</button>
              <button className="button button--paper" type="button" onClick={startSetup}>Новая партия</button>
            </div>
          </section>
        </main>
      )
    }

    return (
      <div className="play-page game-table">
        <GameTopBar session={session} deck={deck} onPause={() => send('PAUSE')} onFinish={() => send('GO_TO_CLOSING')} onRules={() => setRulesOpen(true)} />
        <main className="play-main">
          {session.phase === 'chapter_intro' && <ChapterIntro chapter={currentChapter} onDraw={() => send('DRAW_PAIR')} onSkip={() => send('SKIP_CHAPTER')} />}
          {(session.phase === 'pair_closed' || session.phase === 'pair_open') && (
            <section className="pair-screen">
              {session.phase === 'pair_closed'
                ? <div><p className="eyebrow">{currentChapter.number} · {currentChapter.title}</p><h1>Две карточки на столе</h1><p>Переворачивайте карточки по одной. Когда откроете обе, герой выберет вопрос.</p></div>
                : <div><p className="eyebrow">Выбирает {ROLE_LABELS[session.role].toLocaleLowerCase('ru')}</p><h1>Какую историю расскажем?</h1><p className="mobile-note">Вторая карточка ниже.</p></div>}
              <div className={`pair-cards ${session.phase === 'pair_closed' ? 'pair-cards--closed' : ''}`}>
                {session.candidates.map((id) => {
                  const card = questionById(deck, id)
                  if (!card) return null
                  const interactive = session.phase === 'pair_closed' && !flippedCardIds.includes(id)
                  const flipped = session.phase === 'pair_open' || flippedCardIds.includes(id)
                  return (
                    <div className="pair-option" key={id}>
                      <div
                        className={`flip-card ${flipped ? 'is-flipped' : ''}`}
                        role={interactive ? 'button' : undefined}
                        tabIndex={interactive ? 0 : undefined}
                        aria-label={interactive ? `Перевернуть карточку ${session.candidates.indexOf(id) + 1}` : undefined}
                        onClick={interactive ? () => flipCard(id) : undefined}
                        onKeyDown={interactive ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            flipCard(id)
                          }
                        } : undefined}
                      >
                        <div className="flip-card__inner">
                          <div className="flip-card__side flip-card__side--back" aria-hidden={flipped}><CardBack chapter={currentChapter} small /></div>
                          <div className="flip-card__side flip-card__side--face" aria-hidden={!flipped}><QuestionCardFace card={card} chapter={currentChapter} compact /></div>
                        </div>
                      </div>
                      {session.phase === 'pair_open' && <button className="button button--game button--wide" type="button" onClick={() => send('SELECT_QUESTION', id)}>Выбрать этот вопрос</button>}
                    </div>
                  )
                })}
              </div>
              {session.phase === 'pair_closed'
                ? <p className="flip-progress" aria-live="polite">Открыто {flippedCardIds.length} из {session.candidates.length}</p>
                : <div className="button-row"><button className="button button--paper" type="button" onClick={() => send('REPLACE_PAIR')}>Другие вопросы</button><button className="link-button" type="button" onClick={() => send('SKIP_CHAPTER')}>Пропустить главу</button></div>}
            </section>
          )}
          {session.phase === 'guess' && activeCard && (
            <section className="single-card-stage">
              <QuestionCardFace card={activeCard} chapter={currentChapter} />
              <div className="guess-panel"><p className="eyebrow">Сначала догадка</p><p>{activeCard.guess?.prompt}</p><div className="button-row"><button className="button button--game" type="button" onClick={() => send('START_STORY')}>Послушать историю</button><button className="button button--paper" type="button" onClick={() => send('START_STORY')}>Без догадки</button></div></div>
              <button className="link-button" type="button" onClick={() => send('SKIP_QUESTION')}>Другой вопрос</button>
            </section>
          )}
          {session.phase === 'story' && activeCard && (
            <section className="single-card-stage">
              {session.recordingMode === 'external_camera' && <p className="recording-badge">Съёмка: отдельная камера</p>}
              <QuestionCardFace card={activeCard} chapter={currentChapter} />
              {detailOpen && <p className="detail-panel">{activeCard.detailPrompt}</p>}
              <div className="story-tools">
                <button className="tool-button" type="button" onClick={() => setDetailOpen((value) => !value)}>{detailOpen ? 'Скрыть подсказку' : 'Помочь начать рассказ'}</button>
                <button className="tool-button" type="button" onClick={() => setHelper({ type: 'followup' })}>Уточнить</button>
                <button className="tool-button" type="button" onClick={() => setHelper({ type: 'special' })}>Специальный ход</button>
              </div>
              <div className="story-complete"><button className="button button--game button--wide" type="button" onClick={() => send('COMPLETE_QUESTION')}>Вопрос обсудили →</button><button className="button button--paper button--wide" type="button" onClick={() => send('SKIP_QUESTION')}>Другой вопрос</button></div>
            </section>
          )}
          {session.phase === 'chapter_exhausted' && (
            <section className="closing-screen"><p className="eyebrow">{currentChapter.number} · {currentChapter.title}</p><h1>В этой главе больше нет новых карточек</h1><p>Можно перейти дальше или закончить разговор. Никаких штрафов за пропуски нет.</p><div className="button-row"><button className="button button--game" type="button" onClick={() => send('NEXT_CHAPTER')}>Следующая глава</button><button className="button button--paper" type="button" onClick={() => send('GO_TO_CLOSING')}>Закончить разговор</button></div></section>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className={`game-root ${preferences.largeText ? 'is-large-text' : ''} ${preferences.reduceMotion ? 'is-reduced-motion' : ''}`}>
      {screen === 'home' && <GameHome deck={deck} hasActiveSession={Boolean(session && session.phase !== 'finished')} onStart={startSetup} onContinue={continueSession} onCatalog={() => setScreen('catalog')} onRules={() => setRulesOpen(true)} onSettings={() => setSettingsOpen(true)} onBack={onBackToCabinet} />}
      {screen === 'setup' && <SetupScreen setup={setup} setSetup={setSetup} onContinue={() => setup.recordingMode === 'external_camera' ? setScreen('recording') : createSession('conversation')} onBack={() => setScreen('home')} />}
      {screen === 'recording' && <RecordingAgreement checked={recordingChecks} setChecked={setRecordingChecks} onContinue={() => session ? setScreen('game') : createSession('external_camera')} onWithoutRecording={() => session ? (setSession({ ...session, recordingMode: 'conversation' }), setScreen('game')) : createSession('conversation')} onBack={() => session ? setScreen('home') : setScreen('setup')} />}
      {screen === 'catalog' && <Catalog deck={deck} preferences={preferences} onToggleFavorite={toggleFavorite} onBack={() => setScreen('home')} />}
      {screen === 'game' && renderPlay()}
      {!storage.available && <div className="network-banner" role="status">Не удалось сохранить данные в браузере. Игра работает, но после закрытия вкладки ход партии может потеряться.</div>}
      {storageMessage && <div className="toast" role="status"><span>{storageMessage}</span><button type="button" onClick={() => setStorageMessage('')} aria-label="Закрыть сообщение">×</button></div>}
      {otherTab && <div className="sync-banner" role="alert"><p>Партия изменилась в другой вкладке. Чтобы не потерять ход, загрузите актуальную версию.</p><button className="button button--paper" type="button" onClick={() => window.location.reload()}>Загрузить актуальную партию</button></div>}
      {rulesOpen && <Modal title="Как играть" eyebrow="Правила" onClose={() => setRulesOpen(false)}><RulesContent /></Modal>}
      {settingsOpen && (
        <Modal title="Настройки игры" eyebrow="Только на этом устройстве" onClose={() => { setSettingsOpen(false); setDeleteConfirm(false) }}>
          <div className="settings-list">
            <label className="toggle-row"><span><strong>Крупный текст</strong><small>Увеличить вопросы и элементы управления</small></span><input type="checkbox" checked={preferences.largeText} onChange={(event) => setPreferences({ ...preferences, largeText: event.target.checked })} /></label>
            <label className="toggle-row"><span><strong>Уменьшить анимацию</strong><small>Убрать перевороты и движения карточек</small></span><input type="checkbox" checked={preferences.reduceMotion} onChange={(event) => setPreferences({ ...preferences, reduceMotion: event.target.checked })} /></label>
            <section className="data-note"><p className="eyebrow">О данных</p><p>На устройстве сохраняются ход партии, настройки и ID избранных карточек. Ответы, имена, аудио и видео приложение не хранит. Технические журналы сервера могут содержать время входа и сетевой адрес.</p></section>
            {!deleteConfirm
              ? <button className="danger-link" type="button" onClick={() => setDeleteConfirm(true)}>Удалить данные игры</button>
              : <div className="delete-confirm"><p>Удалить текущую партию, настройки и избранное на этом устройстве?</p><div className="button-row"><button className="button button--danger" type="button" onClick={removeData}>Да, удалить</button><button className="button button--paper" type="button" onClick={() => setDeleteConfirm(false)}>Отмена</button></div></div>}
          </div>
        </Modal>
      )}
      {helperModal()}
    </div>
  )
}
