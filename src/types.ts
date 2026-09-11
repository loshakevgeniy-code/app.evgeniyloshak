export type ChapterId = 'beginnings' | 'character' | 'turns' | 'present'
export type CardType = 'question' | 'follow_up' | 'special' | 'closing'

export interface Chapter {
  id: ChapterId
  number: string
  title: string
  subtitle: string
  colorToken: string
  symbol: 'window' | 'overlap' | 'fork' | 'open-circle'
  cardIds: string[]
}

interface CardBase {
  id: string
  type: CardType
  title: string
  prompt: string
  detailPrompt: string
  editorial: {
    purpose?: string
    whenToUse?: string
    moderationNote: string
  }
}

export interface QuestionCard extends CardBase {
  id: `Q${string}`
  type: 'question'
  chapterId: ChapterId
  number: number
  guess: { prompt: string } | null
  recommendedFollowUps: string[]
}

export interface FollowUpCard extends CardBase {
  id: `F${string}`
  type: 'follow_up'
}

export interface SpecialCard extends CardBase {
  id: `S${string}`
  type: 'special'
  action: 'return_question' | 'show_object'
}

export interface ClosingCard extends CardBase {
  id: `C${string}`
  type: 'closing'
}

export type Card = QuestionCard | FollowUpCard | SpecialCard | ClosingCard

export interface Deck {
  schemaVersion: string
  deckVersion: string
  locale: string
  title: string
  subtitle: string
  shortDescription: string
  audience: string
  chapters: Chapter[]
  cards: Card[]
}

export type HeroRole = 'close_person' | 'mother' | 'father' | 'sister' | 'brother' | 'partner' | 'friend'
export type RecordingMode = 'conversation' | 'external_camera'
export type GameSize = 4 | 8
export type GamePhase =
  | 'rules'
  | 'chapter_intro'
  | 'pair_closed'
  | 'pair_open'
  | 'guess'
  | 'story'
  | 'chapter_exhausted'
  | 'closing_offer'
  | 'closing_card'
  | 'finished'

export type QuestionStatus =
  | 'available'
  | 'offered'
  | 'active'
  | 'not_chosen'
  | 'replaced'
  | 'skipped'
  | 'discussed'
  | 'abandoned'

export type ChapterCloseReason = 'target_reached' | 'skipped' | 'exhausted'

export interface GameChapterState {
  order: string[]
  cursor: number
  completed: string[]
  closedReason?: ChapterCloseReason
}

export interface GameSession {
  schemaVersion: '1.0.0'
  deckVersion: string
  sessionId: string
  role: HeroRole
  recordingMode: RecordingMode
  gameSize: GameSize
  targetPerChapter: 1 | 2
  phase: GamePhase
  currentChapterIndex: number
  chapters: Record<ChapterId, GameChapterState>
  statuses: Record<string, QuestionStatus>
  candidates: string[]
  activeQuestionId: string | null
  discussedInOrder: string[]
  closingViewed: boolean
  paused: boolean
  revision: number
  updatedAt: string
}

export interface Preferences {
  largeText: boolean
  reduceMotion: boolean
  favorites: string[]
}
