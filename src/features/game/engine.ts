import type {
  ChapterId,
  Deck,
  GameChapterState,
  GameSession,
  HeroRole,
  QuestionCard,
  RecordingMode,
} from '../../types'

export type GameCommand = {
  kind:
    | 'START_AFTER_RULES'
    | 'DRAW_PAIR'
    | 'REVEAL_PAIR'
    | 'SELECT_QUESTION'
    | 'REPLACE_PAIR'
    | 'START_STORY'
    | 'COMPLETE_QUESTION'
    | 'SKIP_QUESTION'
    | 'SKIP_CHAPTER'
    | 'NEXT_CHAPTER'
    | 'GO_TO_CLOSING'
    | 'OPEN_CLOSING'
    | 'FINISH'
    | 'PAUSE'
    | 'RESUME'
  id?: string
  expectedRevision: number
  occurredAt: string
  viewKey?: string
}

export function fisherYates<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export interface GameSetupConfig {
  role: HeroRole
  recordingMode: RecordingMode
  gameSize: 4 | 8
  includePersonalTopics?: boolean
  sharedChildhood?: boolean
}

export function isQuestionEligible(
  card: QuestionCard,
  config: Pick<GameSetupConfig, 'role' | 'includePersonalTopics' | 'sharedChildhood'>,
) {
  if (card.requiresTopicOptIn && !config.includePersonalTopics) return false
  if (card.audience === 'parent' && !['mother', 'father'].includes(config.role)) return false
  if (card.audience === 'siblings' && !['sister', 'brother'].includes(config.role)) return false
  if (card.requiresSharedChildhood && !config.sharedChildhood) return false
  return true
}

export function eligibleQuestions(
  deck: Deck,
  config: Pick<GameSetupConfig, 'role' | 'includePersonalTopics' | 'sharedChildhood'>,
) {
  return deck.cards.filter((card): card is QuestionCard => card.type === 'question' && isQuestionEligible(card, config))
}

export function createGameSession(
  deck: Deck,
  config: GameSetupConfig,
  random: () => number = Math.random,
  occurredAt = new Date().toISOString(),
): GameSession {
  const statuses: GameSession['statuses'] = {}
  const chapters = {} as GameSession['chapters']
  const allowedIds = new Set(eligibleQuestions(deck, config).map((card) => card.id))
  for (const chapter of deck.chapters) {
    const order = chapter.cardIds.filter((id) => allowedIds.has(id))
    chapters[chapter.id] = {
      order: fisherYates(order, random),
      cursor: 0,
      completed: [],
    }
    for (const id of order) statuses[id] = 'available'
  }

  const closingCardId = fisherYates(
    deck.cards.filter((card) => card.type === 'closing').map((card) => card.id),
    random,
  )[0] || null

  return {
    schemaVersion: '2.0.0',
    deckVersion: deck.deckVersion,
    sessionId: crypto.randomUUID(),
    role: config.role,
    recordingMode: config.recordingMode,
    gameSize: config.gameSize,
    includePersonalTopics: config.includePersonalTopics === true,
    sharedChildhood: config.sharedChildhood === true,
    targetPerChapter: config.gameSize === 4 ? 1 : 2,
    phase: 'rules',
    currentChapterIndex: 0,
    chapters,
    statuses,
    candidates: [],
    activeQuestionId: null,
    discussedInOrder: [],
    closingCardId,
    closingViewed: false,
    paused: false,
    revision: 0,
    updatedAt: occurredAt,
  }
}

export function makeViewKey(state: GameSession): string {
  if (state.activeQuestionId) return `${state.phase}:${state.activeQuestionId}`
  if (state.candidates.length) return `${state.phase}:${state.candidates.join(',')}`
  return `${state.phase}:${state.currentChapterIndex}`
}

function commit(state: GameSession, next: GameSession, occurredAt: string): GameSession {
  if (next === state) return state
  return { ...next, revision: state.revision + 1, updatedAt: occurredAt }
}

function questionById(deck: Deck, id: string | null): QuestionCard | undefined {
  return deck.cards.find((card): card is QuestionCard => card.type === 'question' && card.id === id)
}

function chapterId(deck: Deck, state: GameSession): ChapterId {
  return deck.chapters[state.currentChapterIndex].id
}

function updateChapter(
  state: GameSession,
  id: ChapterId,
  update: (chapter: GameChapterState) => GameChapterState,
): GameSession {
  return { ...state, chapters: { ...state.chapters, [id]: update(state.chapters[id]) } }
}

function dealPair(deck: Deck, state: GameSession): GameSession {
  const id = chapterId(deck, state)
  const chapter = state.chapters[id]
  const candidates = chapter.order.slice(chapter.cursor, chapter.cursor + 2)
  if (!candidates.length) return { ...state, phase: 'chapter_exhausted', candidates: [], activeQuestionId: null }
  const statuses = { ...state.statuses }
  candidates.forEach((cardId) => { statuses[cardId] = 'offered' })
  return updateChapter(
    { ...state, phase: 'pair_closed', candidates, activeQuestionId: null, statuses },
    id,
    (current) => ({ ...current, cursor: current.cursor + candidates.length }),
  )
}

function moveToNextChapter(deck: Deck, state: GameSession): GameSession {
  const nextIndex = state.currentChapterIndex + 1
  if (nextIndex >= deck.chapters.length) {
    return { ...state, phase: 'closing_offer', candidates: [], activeQuestionId: null, paused: false }
  }
  return {
    ...state,
    phase: 'chapter_intro',
    currentChapterIndex: nextIndex,
    candidates: [],
    activeQuestionId: null,
    paused: false,
  }
}

function advance(deck: Deck, state: GameSession): GameSession {
  const id = chapterId(deck, state)
  const chapter = state.chapters[id]
  if (chapter.completed.length >= state.targetPerChapter) {
    return moveToNextChapter(deck, updateChapter(state, id, (current) => ({ ...current, closedReason: 'target_reached' })))
  }
  if (chapter.cursor < chapter.order.length) return dealPair(deck, state)
  return { ...state, phase: 'chapter_exhausted', candidates: [], activeQuestionId: null }
}

function isProgressCommand(kind: GameCommand['kind']) {
  return !['PAUSE', 'RESUME', 'GO_TO_CLOSING'].includes(kind)
}

function needsViewKey(kind: GameCommand['kind']) {
  return [
    'REVEAL_PAIR',
    'SELECT_QUESTION',
    'REPLACE_PAIR',
    'START_STORY',
    'COMPLETE_QUESTION',
    'SKIP_QUESTION',
  ].includes(kind)
}

export function gameReducer(deck: Deck, state: GameSession, command: GameCommand): GameSession {
  if (command.expectedRevision !== state.revision) return state
  if (state.paused && isProgressCommand(command.kind)) return state
  if (needsViewKey(command.kind) && command.viewKey !== makeViewKey(state)) return state

  let next = state
  switch (command.kind) {
    case 'START_AFTER_RULES':
      if (state.phase === 'rules') next = { ...state, phase: 'chapter_intro' }
      break
    case 'DRAW_PAIR':
      if (state.phase === 'chapter_intro') next = dealPair(deck, state)
      break
    case 'REVEAL_PAIR':
      if (state.phase === 'pair_closed' && state.candidates.length) next = { ...state, phase: 'pair_open' }
      break
    case 'SELECT_QUESTION': {
      if (state.phase !== 'pair_open' || !command.id || !state.candidates.includes(command.id)) break
      const card = questionById(deck, command.id)
      if (!card) break
      const statuses = { ...state.statuses }
      state.candidates.forEach((id) => { statuses[id] = id === command.id ? 'active' : 'not_chosen' })
      next = {
        ...state,
        statuses,
        candidates: [],
        activeQuestionId: command.id,
        phase: card.guess ? 'guess' : 'story',
      }
      break
    }
    case 'REPLACE_PAIR': {
      if (!['pair_closed', 'pair_open'].includes(state.phase) || !state.candidates.length) break
      const statuses = { ...state.statuses }
      state.candidates.forEach((id) => { statuses[id] = 'replaced' })
      next = dealPair(deck, { ...state, statuses, candidates: [] })
      break
    }
    case 'START_STORY':
      if (state.phase === 'guess' && state.activeQuestionId) next = { ...state, phase: 'story' }
      break
    case 'COMPLETE_QUESTION': {
      if (state.phase !== 'story' || !state.activeQuestionId) break
      const activeId = state.activeQuestionId
      if (state.statuses[activeId] !== 'active') break
      const card = questionById(deck, activeId)
      if (!card) break
      const statuses = { ...state.statuses, [activeId]: 'discussed' as const }
      const discussedInOrder = state.discussedInOrder.includes(activeId)
        ? state.discussedInOrder
        : [...state.discussedInOrder, activeId]
      const withoutActive = { ...state, statuses, discussedInOrder, activeQuestionId: null }
      const withCompleted = updateChapter(withoutActive, card.chapterId, (chapter) => ({
        ...chapter,
        completed: chapter.completed.includes(activeId) ? chapter.completed : [...chapter.completed, activeId],
      }))
      next = advance(deck, withCompleted)
      break
    }
    case 'SKIP_QUESTION': {
      if (!['guess', 'story'].includes(state.phase) || !state.activeQuestionId) break
      const activeId = state.activeQuestionId
      next = advance(deck, {
        ...state,
        statuses: { ...state.statuses, [activeId]: 'skipped' },
        activeQuestionId: null,
      })
      break
    }
    case 'SKIP_CHAPTER': {
      if (['closing_offer', 'closing_card', 'finished'].includes(state.phase)) break
      const id = chapterId(deck, state)
      const statuses = { ...state.statuses }
      if (state.activeQuestionId) statuses[state.activeQuestionId] = 'skipped'
      state.candidates.forEach((cardId) => { statuses[cardId] = 'replaced' })
      next = moveToNextChapter(deck, updateChapter(
        { ...state, statuses, candidates: [], activeQuestionId: null },
        id,
        (chapter) => ({ ...chapter, closedReason: 'skipped' }),
      ))
      break
    }
    case 'NEXT_CHAPTER': {
      if (state.phase !== 'chapter_exhausted') break
      const id = chapterId(deck, state)
      next = moveToNextChapter(deck, updateChapter(state, id, (chapter) => ({ ...chapter, closedReason: 'exhausted' })))
      break
    }
    case 'GO_TO_CLOSING': {
      if (state.phase === 'finished') break
      const statuses = { ...state.statuses }
      if (state.activeQuestionId) statuses[state.activeQuestionId] = 'abandoned'
      state.candidates.forEach((cardId) => { statuses[cardId] = 'replaced' })
      next = { ...state, statuses, candidates: [], activeQuestionId: null, phase: 'closing_offer', paused: false }
      break
    }
    case 'OPEN_CLOSING':
      if (state.phase === 'closing_offer') next = { ...state, phase: 'closing_card', closingViewed: true }
      break
    case 'FINISH':
      if (['closing_offer', 'closing_card'].includes(state.phase)) next = { ...state, phase: 'finished', paused: false }
      break
    case 'PAUSE':
      if (!state.paused && !['finished', 'closing_offer', 'closing_card'].includes(state.phase)) next = { ...state, paused: true }
      break
    case 'RESUME':
      if (state.paused) next = { ...state, paused: false }
      break
  }

  return commit(state, next, command.occurredAt)
}

export function assertGameInvariants(deck: Deck, state: GameSession): string[] {
  const errors: string[] = []
  const eligibleIds = new Set(eligibleQuestions(deck, state).map((card) => card.id))
  for (const chapter of deck.chapters) {
    const current = state.chapters[chapter.id]
    const expected = chapter.cardIds.filter((id) => eligibleIds.has(id))
    if (
      !current
      || current.order.length !== expected.length
      || new Set(current.order).size !== expected.length
      || expected.some((id) => !current.order.includes(id))
    ) errors.push(`order:${chapter.id}`)
    if (current && (current.cursor < 0 || current.cursor > current.order.length)) errors.push(`cursor:${chapter.id}`)
  }
  if (['pair_closed', 'pair_open'].includes(state.phase) && (!state.candidates.length || state.activeQuestionId)) errors.push('pair-shape')
  if (['guess', 'story'].includes(state.phase) && (!state.activeQuestionId || state.candidates.length)) errors.push('active-shape')
  if (new Set(state.discussedInOrder).size !== state.discussedInOrder.length) errors.push('discussed-duplicates')
  const completed = deck.chapters.flatMap((chapter) => state.chapters[chapter.id].completed)
  if (completed.length !== state.discussedInOrder.length || completed.some((id) => !state.discussedInOrder.includes(id))) errors.push('discussed-mismatch')
  return errors
}
