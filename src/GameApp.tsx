import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CardBack, CardFace, ChapterSymbol, QuestionCardFace } from './components/Cards'
import { AppIcon } from './components/AppIcon'
import { AudioRecorder, RecordingsLibrary, type RecordingContext } from './components/AudioRecorder'
import { LilyMark } from './components/BrandMark'
import { Modal } from './components/Modal'
import { cardMatches } from './features/catalog/search'
import { createGameSession, eligibleQuestions, gameReducer, makeViewKey, type GameCommand } from './features/game/engine'
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
  ClosingCard,
  Deck,
  FollowUpCard,
  GameSession,
  HeroRole,
  Preferences,
  QuestionCard,
  RecordingMode,
  SpecialCard,
  Topic,
} from './types'

type AppScreen = 'home' | 'setup' | 'recording' | 'game' | 'catalog'
type CatalogType = 'all' | 'question' | 'follow_up' | 'special' | 'closing' | 'favorites'
type CatalogScope = 'all' | 'family'
type CatalogDepth = 'all' | QuestionCard['depth']
type Setup = {
  role: HeroRole
  gameSize: 4 | 8
  recordingMode: RecordingMode
  includePersonalTopics: boolean
  sharedChildhood: boolean
}

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

function topicForCard(deck: Deck, card: Card): Topic | undefined {
  return card.type === 'question' ? deck.topics.find((topic) => topic.id === card.topicId) : undefined
}

function GameHeader({ onHome, onRules, onRecordings, onSettings }: { onHome: () => void; onRules: () => void; onRecordings: () => void; onSettings: () => void }) {
  return (
    <header className="game-header">
      <button className="text-logo" type="button" onClick={onHome}><span>Lilya<br /><small>ближе к главному</small></span><span className="game-mobile-title">Lilya</span></button>
      <nav className="game-desktop-nav" aria-label="Навигация игры">
        <button className="link-button" type="button" onClick={onRules}>Правила</button>
        <button className="link-button" type="button" onClick={onRecordings}>Мои записи</button>
        <button className="link-button" type="button" onClick={onSettings}>Настройки</button>
      </nav>
      <div className="game-mobile-actions">
        <button className="app-icon-button" type="button" onClick={onRules} aria-label="Правила"><AppIcon name="rules" /></button>
        <button className="app-icon-button" type="button" onClick={onSettings} aria-label="Настройки"><AppIcon name="settings" /></button>
      </div>
    </header>
  )
}

function MobileGameNav({
  active,
  onCabinet,
  onHome,
  onCatalog,
  onRecordings,
}: {
  active: 'game' | 'deck'
  onCabinet: () => void
  onHome: () => void
  onCatalog: () => void
  onRecordings: () => void
}) {
  return (
    <nav className="mobile-tabbar mobile-game-nav" aria-label="Меню игры">
      <button className="mobile-tabbar__item" type="button" onClick={onCabinet}><AppIcon name="home" /><span>Кабинет</span></button>
      <button className={`mobile-tabbar__item ${active === 'game' ? 'is-active' : ''}`} type="button" onClick={onHome} aria-current={active === 'game' ? 'page' : undefined}><AppIcon name="game" /><span>Игра</span></button>
      <button className={`mobile-tabbar__item ${active === 'deck' ? 'is-active' : ''}`} type="button" onClick={onCatalog} aria-current={active === 'deck' ? 'page' : undefined}><AppIcon name="deck" /><span>Колода</span></button>
      <button className="mobile-tabbar__item" type="button" onClick={onRecordings}><AppIcon name="microphone" /><span>Записи</span></button>
    </nav>
  )
}

function GameHome({
  deck,
  hasActiveSession,
  onStart,
  onContinue,
  onCatalog,
  onRules,
  onRecordings,
  onSettings,
  onBack,
}: {
  deck: Deck
  hasActiveSession: boolean
  onStart: () => void
  onContinue: () => void
  onCatalog: () => void
  onRules: () => void
  onRecordings: () => void
  onSettings: () => void
  onBack: () => void
}) {
  const questionCount = deck.cards.filter((card) => card.type === 'question').length
  return (
    <div className="game-shell game-table">
      <GameHeader onHome={() => undefined} onRules={onRules} onRecordings={onRecordings} onSettings={onSettings} />
      <main className="game-home">
        <section className="game-home__copy">
          <p className="eyebrow">Разговор для двоих</p>
          <h1>Ближе<br />к <em>главному.</em></h1>
          <p className="game-lead">Хорошие вопросы помогают услышать истории, которые ещё не звучали между вами.</p>
          <div className="button-row">
            {hasActiveSession && <button className="button button--game" type="button" onClick={onContinue}>Продолжить разговор</button>}
            <button className={hasActiveSession ? 'button button--paper' : 'button button--game'} type="button" onClick={onStart}>Начать игру</button>
            <button className="button button--paper" type="button" onClick={onCatalog}>Посмотреть колоду</button>
          </div>
          <p className="game-facts">{questionCount} вопросов · {deck.topics.length} тем · {deck.cards.length} карточек всего</p>
          <p className="privacy-line">История партии и выбранные аудиозаписи остаются на этом устройстве и не отправляются на сервер.</p>
        </section>
        <div className="hero-deck" aria-hidden="true">
          <div className="hero-deck__brand">
            <LilyMark />
            <strong>LILYA</strong>
            <span>истории объединяют</span>
          </div>
        </div>
      </main>
      <button className="back-cabinet" type="button" onClick={onBack}>← Вернуться в Lilya</button>
      <MobileGameNav active="game" onCabinet={onBack} onHome={() => undefined} onCatalog={onCatalog} onRecordings={onRecordings} />
    </div>
  )
}

function SetupScreen({
  deck,
  setup,
  setSetup,
  onContinue,
  onBack,
}: {
  deck: Deck
  setup: Setup
  setSetup: (setup: Setup) => void
  onContinue: () => void
  onBack: () => void
}) {
  const [step, setStep] = useState(0)
  const isSibling = setup.role === 'sister' || setup.role === 'brother'
  const availableCount = eligibleQuestions(deck, setup).length
  const steps = ['Собеседник', 'Формат', 'Запись']

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [step])

  function chooseRole(role: HeroRole) {
    setSetup({ ...setup, role, sharedChildhood: isSibling && (role === 'sister' || role === 'brother') ? setup.sharedChildhood : false })
  }

  function goBack() {
    if (step === 0) onBack()
    else setStep((current) => current - 1)
  }

  function goForward() {
    if (step < steps.length - 1) setStep((current) => current + 1)
    else onContinue()
  }

  return (
    <main className="setup-page game-table">
      <div className="setup-wrap setup-wizard">
        <header className="setup-wizard__header">
          <button className="back-link" type="button" onClick={goBack}>← {step === 0 ? 'В игру' : 'Назад'}</button>
          <div className="setup-steps" aria-label="Шаги настройки">
            {steps.map((label, index) => <span className={index === step ? 'is-active' : index < step ? 'is-done' : ''} aria-current={index === step ? 'step' : undefined} key={label}>{index + 1}<small>{label}</small></span>)}
          </div>
        </header>

        <section className="setup-wizard__panel">
          {step === 0 && (
            <>
              <p className="eyebrow">01 · Главный герой</p>
              <h1>С кем вы сегодня?</h1>
              <p className="setup-intro">Это поможет Lilya добавить подходящие ролевые темы. Имена вводить не нужно.</p>
              <fieldset className="choice-group choice-group--plain">
                <legend className="sr-only">Кто сегодня главный герой?</legend>
                <div className="choice-grid choice-grid--roles">
                  {(Object.keys(ROLE_LABELS) as HeroRole[]).map((role, index) => (
                    <label className="choice choice--role" key={role}>
                      <input type="radio" name="role" checked={setup.role === role} onChange={() => chooseRole(role)} />
                      <span className="choice-number">{String(index + 1).padStart(2, '0')}</span>
                      <span>{ROLE_LABELS[role]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {step === 1 && (
            <>
              <p className="eyebrow">02 · Формат встречи</p>
              <h1>Каким будет этот разговор?</h1>
              <p className="setup-intro">Вопросы пройдут через четыре мягких этапа. Любой из них можно пропустить.</p>
              <div className="stage-ribbon" aria-label="Этапы разговора">
                {deck.chapters.map((chapter) => <span key={chapter.id}><i>{chapter.number}</i>{chapter.title}</span>)}
              </div>
              <fieldset className="choice-group">
                <legend>Сколько вопросов возьмём?</legend>
                <div className="choice-grid">
                  <label className="choice choice--large">
                    <input type="radio" name="size" checked={setup.gameSize === 4} onChange={() => setSetup({ ...setup, gameSize: 4 })} />
                    <span><strong>Тёплый круг</strong><small>4 вопроса · спокойное знакомство</small></span>
                  </label>
                  <label className="choice choice--large">
                    <input type="radio" name="size" checked={setup.gameSize === 8} onChange={() => setSetup({ ...setup, gameSize: 8 })} />
                    <span><strong>Глубокий разговор</strong><small>8 вопросов · больше времени вместе</small></span>
                  </label>
                </div>
              </fieldset>
              <div className="setup-options">
                {isSibling && <label className="check-choice"><input type="checkbox" checked={setup.sharedChildhood} onChange={(event) => setSetup({ ...setup, sharedChildhood: event.target.checked })} /><span><strong>Мы росли вместе</strong><small>Добавить вопросы об общем детстве</small></span></label>}
                <label className="check-choice check-choice--personal"><input type="checkbox" checked={setup.includePersonalTopics} onChange={(event) => setSetup({ ...setup, includePersonalTopics: event.target.checked })} /><span><strong>Личные темы · только если хочется</strong><small>Добавить сложные главы. Их всё равно можно пропустить.</small></span></label>
              </div>
              <p className="available-count"><strong>{availableCount}</strong><span>подходящих вопросов в этой настройке</span></p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="eyebrow">03 · Память о разговоре</p>
              <h1>Хотите сохранить голоса?</h1>
              <p className="setup-intro">Запись всегда включается вручную и только после согласия обоих участников.</p>
              <fieldset className="choice-group choice-group--plain">
                <legend className="sr-only">Способ записи</legend>
                <div className="choice-grid choice-grid--recording">
                  <label className="choice choice--large"><input type="radio" name="recording" checked={setup.recordingMode === 'conversation'} onChange={() => setSetup({ ...setup, recordingMode: 'conversation' })} /><span><strong>Просто играем</strong><small>Без записи — полноценный формат</small></span></label>
                  <label className="choice choice--large"><input type="radio" name="recording" checked={setup.recordingMode === 'built_in_audio'} onChange={() => setSetup({ ...setup, recordingMode: 'built_in_audio' })} /><span><strong>Диктофон Lilya</strong><small>Аудио сохранится на этом устройстве</small></span></label>
                  <label className="choice choice--large"><input type="radio" name="recording" checked={setup.recordingMode === 'external_camera'} onChange={() => setSetup({ ...setup, recordingMode: 'external_camera' })} /><span><strong>Отдельная камера</strong><small>Снимать на другой телефон</small></span></label>
                </div>
              </fieldset>
              {setup.recordingMode === 'external_camera' && <p className="choice-note">Пауза в игре не останавливает внешнюю камеру. Её нужно остановить отдельно.</p>}
            </>
          )}
        </section>

        <footer className="setup-wizard__footer">
          <p><span>{step + 1}</span> / {steps.length}</p>
          <button className="button button--game" type="button" onClick={goForward}>{step === steps.length - 1 ? 'Начать разговор' : 'Продолжить'} <span aria-hidden="true">→</span></button>
        </footer>
      </div>
    </main>
  )
}

function RecordingAgreement({
  mode,
  checked,
  setChecked,
  onContinue,
  onWithoutRecording,
  onBack,
}: {
  mode: Exclude<RecordingMode, 'conversation'>
  checked: boolean[]
  setChecked: (checked: boolean[]) => void
  onContinue: () => void
  onWithoutRecording: () => void
  onBack: () => void
}) {
  const isAudio = mode === 'built_in_audio'
  const items = [
    `Оба участника согласны на ${isAudio ? 'аудиозапись' : 'съёмку'}.`,
    `Понятно, где будет храниться ${isAudio ? 'аудиозапись' : 'запись'} и кто сможет её ${isAudio ? 'прослушать' : 'увидеть'}.`,
    'Любой может попросить остановить запись в любой момент.',
  ]
  return (
    <main className="setup-page game-table">
      <div className="setup-wrap setup-wrap--narrow">
        <button className="back-link" type="button" onClick={onBack}>← Назад</button>
        <p className="eyebrow">{isAudio ? 'Аудио · на этом устройстве' : 'Съёмка · отдельная камера'}</p>
        <h1>Сначала договоритесь</h1>
        <p className="setup-intro">Эти отметки — напоминание для разговора, а не юридическое подтверждение согласия. Они нигде не сохраняются.{isAudio ? ' Аудио останется только на этом устройстве.' : ''}</p>
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
          <button className="button button--game button--wide" type="button" onClick={onContinue} disabled={!checked.every(Boolean)}>{isAudio ? 'Продолжить с диктофоном' : 'Продолжить со съёмкой'}</button>
          <button className="button button--paper button--wide" type="button" onClick={onWithoutRecording}>Продолжить без записи</button>
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
      <button className="text-logo text-logo--small" type="button" onClick={onRules} aria-label="Правила"><span>Lilya</span><AppIcon name="rules" className="play-mobile-icon" /></button>
      <div className="play-progress"><span>{chapter?.number} / {String(deck.chapters.length).padStart(2, '0')}</span><strong>{discussed} из {session.gameSize} вопросов</strong></div>
      <div className="play-actions">
        <button className="link-button" type="button" onClick={onPause} aria-label="Пауза"><AppIcon name="pause" className="play-mobile-icon" /><span>Пауза</span></button>
        <button className="link-button" type="button" onClick={onFinish} aria-label="Закончить разговор"><AppIcon name="finish" className="play-mobile-icon" /><span>Закончить разговор</span></button>
      </div>
    </header>
  )
}

function ChapterIntro({ chapter, total, onDraw, onSkip }: { chapter: Chapter; total: number; onDraw: () => void; onSkip: () => void }) {
  return (
    <section className="chapter-screen">
      <div className={`chapter-card chapter-card--${chapter.id}`}>
        <p>{chapter.number} / {String(total).padStart(2, '0')}</p>
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

function RitualScreen({
  eyebrow,
  title,
  description,
  tone = 'wine',
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  tone?: 'wine' | 'olive' | 'espresso'
  children: ReactNode
}) {
  return (
    <main className={`ritual-screen ritual-screen--${tone} game-table`}>
      <section className="ritual-screen__panel">
        <div className="ritual-screen__content">
          <span className="ritual-screen__seal" aria-hidden="true"><LilyMark /></span>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="ritual-screen__description">{description}</p>}
          <div className="ritual-screen__actions">{children}</div>
          <p className="ritual-screen__signature">LILYA <span /> БЛИЖЕ К ГЛАВНОМУ</p>
        </div>
      </section>
      <aside className="ritual-screen__photo" aria-hidden="true">
        <div className="ritual-screen__photo-copy">
          <LilyMark />
          <strong>Истории<br />объединяют</strong>
          <span>Разговоры, которые остаются</span>
        </div>
      </aside>
    </main>
  )
}

function Catalog({
  deck,
  preferences,
  onToggleFavorite,
  onBack,
  onCabinet,
  onRecordings,
}: {
  deck: Deck
  preferences: Preferences
  onToggleFavorite: (id: string) => void
  onBack: () => void
  onCabinet: () => void
  onRecordings: () => void
}) {
  const [type, setType] = useState<CatalogType>('question')
  const [scope, setScope] = useState<CatalogScope>('all')
  const [topicId, setTopicId] = useState<string>('all')
  const [depth, setDepth] = useState<CatalogDepth>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(24)
  const favorites = useMemo(() => new Set(preferences.favorites), [preferences.favorites])
  const totals = useMemo(() => ({
    all: deck.cards.length,
    question: deck.cards.filter((card) => card.type === 'question').length,
    follow_up: deck.cards.filter((card) => card.type === 'follow_up').length,
    special: deck.cards.filter((card) => card.type === 'special').length,
    closing: deck.cards.filter((card) => card.type === 'closing').length,
    family: deck.cards.filter((card) => card.coreCandidate).length,
  }), [deck.cards])
  const scopeTotals = useMemo(() => {
    const cards = scope === 'family' ? deck.cards.filter((card) => card.coreCandidate) : deck.cards
    return {
      all: cards.length,
      question: cards.filter((card) => card.type === 'question').length,
      follow_up: cards.filter((card) => card.type === 'follow_up').length,
      special: cards.filter((card) => card.type === 'special').length,
      closing: cards.filter((card) => card.type === 'closing').length,
    }
  }, [deck.cards, scope])
  const filtered = useMemo(() => deck.cards.filter((card) => {
    const typeMatch = type === 'all' || (type === 'favorites' ? favorites.has(card.id) : card.type === type)
    const scopeMatch = scope === 'all' || card.coreCandidate
    const questionFiltersActive = type === 'all' || type === 'question' || type === 'favorites'
    const topicMatch = !questionFiltersActive || topicId === 'all' || (card.type === 'question' && card.topicId === topicId)
    const depthMatch = !questionFiltersActive || depth === 'all' || (card.type === 'question' && card.depth === depth)
    return typeMatch && scopeMatch && topicMatch && depthMatch && cardMatches(card, query)
  }), [deck.cards, depth, favorites, query, scope, topicId, type])
  const visible = filtered.slice(0, visibleCount)
  const openCard = deck.cards.find((card) => card.id === openId)
  const openIndex = openId ? filtered.findIndex((card) => card.id === openId) : -1

  useEffect(() => {
    setVisibleCount(24)
    setOpenId(null)
  }, [depth, query, scope, topicId, type])

  return (
    <div className="catalog-page game-table">
      <header className="catalog-header">
        <button className="back-link" type="button" onClick={onBack}>← В игру</button>
        <p className="eyebrow">{totals.question} вопросов · {deck.topics.length} тем</p>
        <h1>Библиотека<br /><em>разговоров.</em></h1>
        <p>Полная редакция Lilya: ищите по словам, выбирайте тему и глубину, сохраняйте важное в закладки.</p>
        <div className="catalog-stats" aria-label="Состав библиотеки">
          <span><strong>{totals.question}</strong>основных</span>
          <span><strong>{totals.follow_up}</strong>уточнений</span>
          <span><strong>{totals.special}</strong>ходов</span>
          <span><strong>{totals.closing}</strong>финалов</span>
        </div>
      </header>
      <main className="catalog-content">
        <section className="catalog-toolbar" aria-label="Фильтры библиотеки">
          <label className="search-field"><span className="sr-only">Поиск по карточкам</span><AppIcon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти вопрос или тему" /></label>
          <div className="catalog-scope" aria-label="Редакция колоды">
            <button type="button" className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}><span>Полная библиотека</span><strong>{totals.all}</strong></button>
            <button type="button" className={scope === 'family' ? 'is-active' : ''} onClick={() => setScope('family')}><span>FAMILY · первый выпуск</span><strong>{totals.family}</strong></button>
          </div>
          <div className="filter-block">
            <span className="filter-label">Карточки</span>
            <div className="filter-row" aria-label="Тип карточек">
              {([
                ['all', `Все ${scopeTotals.all}`], ['question', `Вопросы ${scopeTotals.question}`], ['follow_up', `Уточнения ${scopeTotals.follow_up}`],
                ['special', `Ходы ${scopeTotals.special}`], ['closing', `Финал ${scopeTotals.closing}`], ['favorites', 'Избранное'],
              ] as [CatalogType, string][]).map(([id, label]) => <button type="button" className={`filter-pill ${type === id ? 'is-active' : ''}`} onClick={() => setType(id)} key={id}>{label}</button>)}
            </div>
          </div>
          {(type === 'all' || type === 'question' || type === 'favorites') && (
            <>
              <div className="filter-block">
                <span className="filter-label">Тема</span>
                <div className="filter-row filter-row--topics" aria-label="Тема вопросов">
                  <button className={`filter-pill ${topicId === 'all' ? 'is-active' : ''}`} type="button" onClick={() => setTopicId('all')}>Все темы</button>
                  {deck.topics.map((topic) => <button className={`filter-pill ${topicId === topic.id ? 'is-active' : ''}`} type="button" onClick={() => setTopicId(topic.id)} key={topic.id}><span>{topic.number}</span>{topic.title}</button>)}
                </div>
              </div>
              <div className="filter-block filter-block--depth">
                <span className="filter-label">Глубина</span>
                <div className="filter-row" aria-label="Глубина вопроса">
                  {([['all', 'Любая'], ['light', 'Лёгкая'], ['medium', 'Средняя'], ['deep', 'Глубокая']] as [CatalogDepth, string][]).map(([id, label]) => <button type="button" className={`filter-pill ${depth === id ? 'is-active' : ''}`} onClick={() => setDepth(id)} key={id}>{label}</button>)}
                </div>
              </div>
            </>
          )}
        </section>
        <div className="catalog-result-line"><p className="result-count" aria-live="polite">Найдено {filtered.length}</p>{filtered.length > 0 && <span>Показано {visible.length}</span>}</div>
        <div className="catalog-grid">
          {visible.map((card) => (
            <div className="catalog-item" key={card.id}>
              <button className="catalog-open" type="button" onClick={() => setOpenId(card.id)} aria-label={`Открыть карточку ${card.id}: ${card.title}`}>
                <CardFace card={card} chapter={chapterForCard(deck, card)} topic={topicForCard(deck, card)} compact />
              </button>
              <button className={`catalog-bookmark ${favorites.has(card.id) ? 'is-active' : ''}`} type="button" onClick={() => onToggleFavorite(card.id)} aria-label={favorites.has(card.id) ? 'Убрать из избранного' : 'Добавить в избранное'} aria-pressed={favorites.has(card.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
              </button>
            </div>
          ))}
          {!filtered.length && <p className="catalog-empty">Ничего не нашлось. Попробуйте другой запрос или фильтр.</p>}
        </div>
        {visible.length < filtered.length && <button className="button button--paper catalog-more" type="button" onClick={() => setVisibleCount((count) => count + 24)}>Показать ещё <span>{Math.min(24, filtered.length - visible.length)}</span></button>}
      </main>
      {openCard && (
        <Modal title={topicForCard(deck, openCard)?.title || openCard.title} eyebrow={`Просмотр карточки · ${openCard.id}`} wide onClose={() => setOpenId(null)}>
          <div className="card-viewer">
            <CardFace card={openCard} chapter={chapterForCard(deck, openCard)} topic={topicForCard(deck, openCard)} favorite={favorites.has(openCard.id)} onFavorite={() => onToggleFavorite(openCard.id)} />
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
      <MobileGameNav active="deck" onCabinet={onCabinet} onHome={onBack} onCatalog={() => undefined} onRecordings={onRecordings} />
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
  const [setup, setSetup] = useState<Setup>({
    role: 'close_person',
    gameSize: 4,
    recordingMode: 'conversation',
    includePersonalTopics: false,
    sharedChildhood: false,
  })
  const [recordingChecks, setRecordingChecks] = useState([false, false, false])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [audioModal, setAudioModal] = useState<'record' | 'library' | null>(null)
  const [recordingContext, setRecordingContext] = useState<RecordingContext | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [storyMenuOpen, setStoryMenuOpen] = useState(false)
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
    setStoryMenuOpen(false)
    setHelper(null)
  }, [session?.activeQuestionId, session?.phase])

  useEffect(() => {
    if (!helper?.selectedId) return
    const sheet = document.querySelector<HTMLElement>('.modal__sheet')
    if (sheet) sheet.scrollTop = 0
  }, [helper?.selectedId])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [screen, session?.phase, session?.currentChapterIndex, session?.paused])

  const pairKey = session?.candidates.join('|') || ''
  useEffect(() => {
    setFlippedCardIds([])
  }, [pairKey])

  function startSetup() {
    if (session && session.phase !== 'finished' && !window.confirm('Начать новую партию? Текущий незавершённый разговор будет заменён.')) return
    setSetup({
      role: 'close_person',
      gameSize: 4,
      recordingMode: 'conversation',
      includePersonalTopics: false,
      sharedChildhood: false,
    })
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
    if (session.recordingMode !== 'conversation') {
      setRecordingChecks([false, false, false])
      setScreen('recording')
    } else setScreen('game')
  }

  function openRecorder(context?: RecordingContext) {
    setRecordingContext(context)
    setAudioModal('record')
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
  const closingCard = deck.cards.find((card): card is ClosingCard => card.type === 'closing' && card.id === session?.closingCardId)
    ?? deck.cards.find((card): card is ClosingCard => card.type === 'closing')

  function helperModal() {
    if (!helper || !activeCard) return null
    const selected = deck.cards.find((card) => card.id === helper.selectedId)
    const recommended = activeCard.recommendedFollowUps
      .map((id) => followUps.find((card) => card.id === id))
      .filter((card): card is FollowUpCard => card !== undefined)
      .filter((card) => !activeCard.requiresTopicOptIn || !card.excludeForSensitiveTopics)
    const safeFollowUps = activeCard.requiresTopicOptIn ? followUps.filter((card) => !card.excludeForSensitiveTopics) : followUps
    const featuredFollowUps = recommended.length ? recommended : safeFollowUps.filter((card) => card.coreCandidate)
    const sensitiveSpecialIds = new Set(['A05', 'A06', 'A09', 'A10'])
    const safeSpecialCards = activeCard.requiresTopicOptIn ? specialCards.filter((card) => !sensitiveSpecialIds.has(card.id)) : specialCards
    const featuredSpecials = safeSpecialCards.filter((card) => card.coreCandidate)
    const choices = helper.type === 'special'
      ? (helper.showAll ? safeSpecialCards : featuredSpecials.slice(0, 4))
      : (helper.showAll ? safeFollowUps : featuredFollowUps.slice(0, 4))
    return (
      <Modal
        title={helper.type === 'special' ? 'Специальный ход' : 'Уточнить историю'}
        eyebrow={helper.type === 'special' ? 'Можно использовать сколько угодно раз' : 'Выбирает собеседник'}
        onClose={() => setHelper(null)}
        wide={Boolean(selected)}
      >
        <div className="modal-safety-actions modal-safety-actions--mobile">
          <button className="link-button" type="button" onClick={() => { setHelper(null); send('PAUSE') }}>Пауза</button>
          <button className="link-button" type="button" onClick={() => { setHelper(null); send('GO_TO_CLOSING') }}>Закончить разговор</button>
        </div>
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
            {helper.type === 'followup' && !recommended.length && <p className="calm-note">Выберите одно из мягких универсальных уточнений — или вернитесь к подсказке на основной карточке.</p>}
            <div className="helper-grid">
              {choices.map((card) => (
                <button type="button" className="helper-choice" onClick={() => setHelper({ ...helper, selectedId: card.id })} key={card.id}>
                  <span>{card.id} · {card.title}</span><strong>{card.prompt}</strong>
                </button>
              ))}
            </div>
            {!helper.showAll && <button className="button button--paper button--wide" type="button" onClick={() => setHelper({ ...helper, showAll: true })}>{helper.type === 'followup' ? `Все ${safeFollowUps.length} уточнений` : `Все ${safeSpecialCards.length} специальных ходов`}</button>}
          </>
        )}
        <div className="modal-safety-actions modal-safety-actions--desktop">
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
        <RitualScreen
          eyebrow="Пауза · всё в порядке"
          title="Разговор остановлен"
          description="Текущий вопрос скрыт. Если вы снимаете разговор отдельно, при необходимости остановите запись и на той камере."
          tone="olive"
        >
          <div className="button-stack">
            <button className="button button--game" type="button" onClick={() => send('RESUME')}>Вернуться к разговору</button>
            <button className="button button--paper" type="button" onClick={() => setScreen('home')}>На главный экран</button>
            <button className="link-button" type="button" onClick={() => send('GO_TO_CLOSING')}>Закончить разговор</button>
          </div>
        </RitualScreen>
      )
    }

    if (session.phase === 'rules') {
      return (
        <RitualScreen eyebrow="Как играть" title="Три простых шага" tone="espresso">
          <RulesContent onStart={() => send('START_AFTER_RULES')} />
        </RitualScreen>
      )
    }

    if (session.phase === 'closing_offer') {
      return (
        <RitualScreen
          eyebrow="Финал · по желанию"
          title="Открыть последнюю карточку?"
          description="Она мягко завершит разговор. Можно открыть её сейчас или остановиться на уже сказанном."
          tone="wine"
        >
          <div className="button-row">
            <button className="button button--game" type="button" onClick={() => send('OPEN_CLOSING')}>Открыть финал</button>
            <button className="button button--paper" type="button" onClick={() => send('FINISH')}>Закончить без карточки</button>
          </div>
        </RitualScreen>
      )
    }

    if (session.phase === 'chapter_exhausted') {
      return (
        <RitualScreen
          eyebrow={`${currentChapter.number} · ${currentChapter.title}`}
          title="Эта глава рассказана"
          description="Все новые карточки этой темы закончились. Можно перейти к следующей главе или мягко завершить разговор."
          tone="olive"
        >
          <div className="button-row">
            <button className="button button--game" type="button" onClick={() => send('NEXT_CHAPTER')}>Следующая глава</button>
            <button className="button button--paper" type="button" onClick={() => send('GO_TO_CLOSING')}>Закончить разговор</button>
          </div>
        </RitualScreen>
      )
    }

    if (session.phase === 'closing_card' && closingCard) {
      return (
        <main className="closing-card-page game-table">
          <div className="closing-card-page__brand" aria-hidden="true"><LilyMark /><span>LILYA · ФИНАЛ</span></div>
          <section className="single-card-stage closing-card-stage">
            <CardFace card={closingCard} />
            <p className="detail-panel">{closingCard.detailPrompt}</p>
            <button className="button button--game" type="button" onClick={() => send('FINISH')}>Завершить разговор</button>
          </section>
        </main>
      )
    }

    if (session.phase === 'finished') {
      const discussed = session.discussedInOrder.map((id) => questionById(deck, id)).filter(Boolean) as QuestionCard[]
      return (
        <main className="result-page game-table">
          <section>
            <p className="eyebrow">Разговор завершён</p><h1>{discussed.length ? 'Истории, которые вы обсудили' : 'Иногда достаточно просто начать'}</h1>
            <p>Ниже сохранены выбранные вопросы. Если вы включали диктофон, аудио доступно отдельно в «Моих записях».</p>
            {discussed.length > 0 && <ol className="discussed-list">{discussed.map((card) => <li key={card.id}><span>{card.id}</span><div><strong>{card.title}</strong><p>{card.prompt}</p></div></li>)}</ol>}
            {session.closingViewed && <p className="calm-note">Финальная карточка была открыта.</p>}
            <div className="button-row">
              <button className="button button--game" type="button" onClick={() => setScreen('home')}>На главный экран</button>
              {discussed.length > 0 && <button className="button button--paper" type="button" onClick={() => exportDiscussed(deck, session)}>Скачать список вопросов</button>}
              <button className="button button--paper" type="button" onClick={() => setAudioModal('library')}>Мои записи</button>
              <button className="button button--paper" type="button" onClick={startSetup}>Новая партия</button>
            </div>
          </section>
        </main>
      )
    }

    return (
      <div className={`play-page play-page--active play-phase--${session.phase} game-table`}>
        <GameTopBar session={session} deck={deck} onPause={() => send('PAUSE')} onFinish={() => send('GO_TO_CLOSING')} onRules={() => setRulesOpen(true)} />
        <main className="play-main">
          {session.phase === 'chapter_intro' && <ChapterIntro chapter={currentChapter} total={deck.chapters.length} onDraw={() => send('DRAW_PAIR')} onSkip={() => send('SKIP_CHAPTER')} />}
          {(session.phase === 'pair_closed' || session.phase === 'pair_open') && (
            <section className="pair-screen">
              {session.phase === 'pair_closed'
                ? <div><p className="eyebrow">{currentChapter.number} · {currentChapter.title}</p><h1>Две карточки на столе</h1><p>Переворачивайте карточки по одной. Когда откроете обе, герой выберет вопрос.</p></div>
                : <div><p className="eyebrow">Выбирает {ROLE_LABELS[session.role].toLocaleLowerCase('ru')}</p><h1>Какую историю расскажем?</h1><p className="mobile-note">Смахните влево, чтобы увидеть вторую карточку.</p></div>}
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
                          <div className="flip-card__side flip-card__side--back" aria-hidden={flipped}><CardBack chapter={currentChapter} total={deck.chapters.length} small /></div>
                          <div className="flip-card__side flip-card__side--face" aria-hidden={!flipped}><QuestionCardFace card={card} chapter={currentChapter} topic={topicForCard(deck, card)} compact /></div>
                        </div>
                      </div>
                      {session.phase === 'pair_open' && <button className="button button--game button--wide" type="button" onClick={() => send('SELECT_QUESTION', id)}>Выбрать этот вопрос</button>}
                    </div>
                  )
                })}
              </div>
              <div className="pair-dots" aria-hidden="true">{session.candidates.map((id) => <span className={session.phase === 'pair_open' || flippedCardIds.includes(id) ? 'is-active' : ''} key={id} />)}</div>
              {session.phase === 'pair_closed'
                ? <p className="flip-progress" aria-live="polite">Открыто {flippedCardIds.length} из {session.candidates.length}</p>
                : <div className="button-row"><button className="button button--paper" type="button" onClick={() => send('REPLACE_PAIR')}>Другие вопросы</button><button className="link-button" type="button" onClick={() => send('SKIP_CHAPTER')}>Пропустить главу</button></div>}
            </section>
          )}
          {session.phase === 'guess' && activeCard && (
            <section className="story-stage story-stage--guess">
              <div className="story-stage__card"><QuestionCardFace card={activeCard} chapter={currentChapter} topic={topicForCard(deck, activeCard)} /></div>
              <aside className="story-stage__controls">
                <p className="eyebrow">Сначала догадка</p>
                <h2>Что, по-вашему, ответит герой?</h2>
                <div className="guess-panel"><p>{activeCard.guess?.prompt}</p></div>
                <div className="button-stack">
                  <button className="button button--game" type="button" onClick={() => send('START_STORY')}>Перейти к рассказу</button>
                  <button className="button button--paper" type="button" onClick={() => send('START_STORY')}>Без догадки</button>
                  <button className="link-button" type="button" onClick={() => send('SKIP_QUESTION')}>Другой вопрос</button>
                </div>
              </aside>
            </section>
          )}
          {session.phase === 'story' && activeCard && (
            <section className="story-stage">
              <div className="story-stage__card">
                {session.recordingMode === 'external_camera' && <p className="recording-badge">Съёмка: отдельная камера</p>}
                {session.recordingMode === 'built_in_audio' && <p className="recording-badge">Диктофон готов · запись включаете вы</p>}
                <QuestionCardFace card={activeCard} chapter={currentChapter} topic={topicForCard(deck, activeCard)} />
              </div>
              <aside className="story-stage__controls">
                <p className="eyebrow">История в центре</p>
                <h2>Слушайте без спешки</h2>
                <p className="story-stage__lead">Здесь нет правильных ответов. Можно вспоминать, делать паузы и уходить в детали.</p>
                {detailOpen && <p className="detail-panel">{activeCard.detailPrompt}</p>}
                <button className="voice-record-cta" type="button" onClick={() => openRecorder({ cardId: activeCard.id, title: activeCard.title, prompt: activeCard.prompt })}><span><AppIcon name="microphone" /></span><span><strong>Записать этот разговор</strong><small>Сохранится только на устройстве</small></span></button>
                <div className="story-tools">
                  <button className="tool-button" type="button" onClick={() => setDetailOpen((value) => !value)}>{detailOpen ? 'Скрыть подсказку' : 'Помочь начать рассказ'}</button>
                  <button className="tool-button" type="button" onClick={() => setHelper({ type: 'followup' })}>Уточнить</button>
                  <button className="tool-button" type="button" onClick={() => setHelper({ type: 'special' })}>Специальный ход</button>
                </div>
              </aside>
              <div className="story-complete">
                <button className="button button--game button--wide" type="button" onClick={() => send('COMPLETE_QUESTION')}>Вопрос обсудили →</button>
                <button className="story-more-trigger" type="button" aria-label="Другие действия" aria-expanded={storyMenuOpen} onClick={() => setStoryMenuOpen((open) => !open)}><span aria-hidden="true">•••</span><small>Ещё</small></button>
                <div className={`story-more-menu ${storyMenuOpen ? 'is-open' : ''}`}>
                  <button className="button button--paper button--wide" type="button" onClick={() => send('SKIP_QUESTION')}>Не помню / другой</button>
                  <button className="button button--paper button--wide" type="button" onClick={() => send('SKIP_CHAPTER')}>Изменить тему</button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className={`game-root ${preferences.largeText ? 'is-large-text' : ''} ${preferences.reduceMotion ? 'is-reduced-motion' : ''}`}>
      {screen === 'home' && <GameHome deck={deck} hasActiveSession={Boolean(session && session.phase !== 'finished')} onStart={startSetup} onContinue={continueSession} onCatalog={() => setScreen('catalog')} onRules={() => setRulesOpen(true)} onRecordings={() => setAudioModal('library')} onSettings={() => setSettingsOpen(true)} onBack={onBackToCabinet} />}
      {screen === 'setup' && <SetupScreen deck={deck} setup={setup} setSetup={setSetup} onContinue={() => setup.recordingMode === 'conversation' ? createSession('conversation') : setScreen('recording')} onBack={() => setScreen('home')} />}
      {screen === 'recording' && <RecordingAgreement mode={(session?.recordingMode === 'built_in_audio' || session?.recordingMode === 'external_camera') ? session.recordingMode : setup.recordingMode as Exclude<RecordingMode, 'conversation'>} checked={recordingChecks} setChecked={setRecordingChecks} onContinue={() => session ? setScreen('game') : createSession(setup.recordingMode)} onWithoutRecording={() => session ? (setSession({ ...session, recordingMode: 'conversation' }), setScreen('game')) : createSession('conversation')} onBack={() => session ? setScreen('home') : setScreen('setup')} />}
      {screen === 'catalog' && <Catalog deck={deck} preferences={preferences} onToggleFavorite={toggleFavorite} onBack={() => setScreen('home')} onCabinet={onBackToCabinet} onRecordings={() => setAudioModal('library')} />}
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
            <section className="data-note"><p className="eyebrow">О данных</p><p>На устройстве сохраняются ход партии, настройки, избранные карточки и аудио, которое вы записали сами. Записи не отправляются на сервер. Технические журналы могут содержать время входа и сетевой адрес.</p></section>
            <button className="button button--paper button--wide" type="button" onClick={() => { setSettingsOpen(false); setAudioModal('library') }}>Открыть мои записи</button>
            {!deleteConfirm
              ? <button className="danger-link" type="button" onClick={() => setDeleteConfirm(true)}>Удалить данные игры</button>
              : <div className="delete-confirm"><p>Удалить текущую партию, настройки и избранное на этом устройстве?</p><div className="button-row"><button className="button button--danger" type="button" onClick={removeData}>Да, удалить</button><button className="button button--paper" type="button" onClick={() => setDeleteConfirm(false)}>Отмена</button></div></div>}
          </div>
        </Modal>
      )}
      {audioModal === 'record' && (
        <Modal title="Диктофон Lilya" eyebrow="Запись на этом устройстве" onClose={() => setAudioModal(null)}>
          <AudioRecorder
            context={recordingContext}
            consentRequired={session?.recordingMode !== 'built_in_audio'}
            onSaved={() => setStorageMessage('Аудиозапись сохранена на этом устройстве.')}
            onOpenLibrary={() => setAudioModal('library')}
          />
        </Modal>
      )}
      {audioModal === 'library' && (
        <Modal title="Мои записи" eyebrow="Только на этом устройстве" wide onClose={() => setAudioModal(null)}>
          <RecordingsLibrary
            onNewRecording={() => { setRecordingContext(undefined); setAudioModal('record') }}
            onChanged={() => setStorageMessage('Список аудиозаписей обновлён.')}
          />
        </Modal>
      )}
      {helperModal()}
    </div>
  )
}
