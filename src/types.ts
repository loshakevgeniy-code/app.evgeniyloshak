export type ChapterId = 'beginnings' | 'character' | 'turns' | 'present'
export type CardType = 'question' | 'follow_up' | 'special' | 'closing'
export type TopicId =
  | 'C01'
  | 'C02'
  | 'C03'
  | 'C04'
  | 'C05'
  | 'C06'
  | 'C07'
  | 'C08'
  | 'C09'
  | 'C10'
  | 'C11'
  | 'C12'
export type QuestionId = `C${string}-${string}`
export type QuestionDepth = 'light' | 'medium' | 'deep'
export type CardAudience = 'general' | 'parent' | 'siblings'
export type EditorialStatus = 'editorial_candidate_untested'

export interface Chapter {
  id: ChapterId
  number: string
  title: string
  subtitle: string
  colorToken: string
  symbol: 'window' | 'overlap' | 'fork' | 'open-circle'
  cardIds: QuestionId[]
}

export interface Topic {
  id: TopicId
  number: string
  title: string
  description: string
  stageId: ChapterId
  audience: CardAudience
  requiresTopicOptIn: boolean
  cardIds: QuestionId[]
}

interface CardBase {
  id: string
  type: CardType
  title: string
  prompt: string
  detailPrompt: string
  coreCandidate: boolean
  status: EditorialStatus
  editorial: {
    purpose?: string
    whenToUse?: string
    moderationNote: string
  }
}

export interface QuestionCard extends CardBase {
  id: QuestionId
  type: 'question'
  chapterId: ChapterId
  topicId: TopicId
  number: number
  depth: QuestionDepth
  audience: CardAudience
  requiresSharedChildhood: boolean
  requiresTopicOptIn: boolean
  guess: { eligible: true; target: string; prompt: string } | null
  recommendedFollowUps: string[]
}

export interface FollowUpCard extends CardBase {
  id: `F${string}`
  type: 'follow_up'
  excludeForSensitiveTopics: boolean
}

export type SpecialAction =
  | 'private_guess'
  | 'show_object'
  | 'return_question'
  | 'choose_two'
  | 'draw_route'
  | 'touch_object'
  | 'compare_times'
  | 'change_role'
  | 'photo_outside_frame'
  | 'parallel_versions'
  | 'own_question'
  | 'change_genre'

export interface SpecialCard extends CardBase {
  id: `A${string}`
  type: 'special'
  action: SpecialAction
}

export interface ClosingCard extends CardBase {
  id: `Z${string}`
  type: 'closing'
}

export type Card = QuestionCard | FollowUpCard | SpecialCard | ClosingCard

export interface Deck {
  schemaVersion: string
  deckVersion: string
  contentVersion: string
  locale: string
  title: string
  subtitle: string
  shortDescription: string
  audience: string
  chapters: Chapter[]
  topics: Topic[]
  cards: Card[]
}

export type HeroRole = 'close_person' | 'mother' | 'father' | 'sister' | 'brother' | 'partner' | 'friend'
export type RecordingMode = 'conversation' | 'built_in_audio' | 'external_camera'
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
  schemaVersion: '2.0.0'
  deckVersion: string
  sessionId: string
  role: HeroRole
  recordingMode: RecordingMode
  gameSize: GameSize
  includePersonalTopics: boolean
  sharedChildhood: boolean
  targetPerChapter: 1 | 2
  phase: GamePhase
  currentChapterIndex: number
  chapters: Record<ChapterId, GameChapterState>
  statuses: Record<string, QuestionStatus>
  candidates: string[]
  activeQuestionId: string | null
  discussedInOrder: string[]
  closingCardId: string | null
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
