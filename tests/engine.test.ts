import { describe, expect, it } from 'vitest'
import rawDeck from '../src/data/deck.ru.json'
import { assertGameInvariants, createGameSession, fisherYates, gameReducer, makeViewKey, type GameCommand } from '../src/features/game/engine'
import { validateDeck } from '../src/data/validateDeck'
import type { GameSession } from '../src/types'

const deck = validateDeck(rawDeck)
const timestamp = '2026-09-11T12:00:00.000Z'

function run(state: GameSession, kind: GameCommand['kind'], id?: string) {
  return gameReducer(deck, state, {
    kind,
    id,
    expectedRevision: state.revision,
    occurredAt: timestamp,
    viewKey: makeViewKey(state),
  })
}

function openFirstQuestion(state: GameSession) {
  let next = run(state, 'DRAW_PAIR')
  next = run(next, 'REVEAL_PAIR')
  next = run(next, 'SELECT_QUESTION', next.candidates[0])
  if (next.phase === 'guess') next = run(next, 'START_STORY')
  return next
}

describe('игровой движок', () => {
  it('перемешивает Fisher–Yates детерминированно', () => {
    expect(fisherYates([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1])
  })

  it('проходит партию на 4 вопроса по одному на главу', () => {
    let state = createGameSession(deck, { role: 'mother', gameSize: 4, recordingMode: 'conversation' }, () => 0, timestamp)
    state = run(state, 'START_AFTER_RULES')
    for (let chapter = 0; chapter < 4; chapter += 1) {
      state = openFirstQuestion(state)
      expect(state.phase).toBe('story')
      state = run(state, 'COMPLETE_QUESTION')
      expect(assertGameInvariants(deck, state)).toEqual([])
    }
    expect(state.phase).toBe('closing_offer')
    expect(state.discussedInOrder).toHaveLength(4)
    expect(new Set(state.discussedInOrder).size).toBe(4)
  })

  it('проходит партию на 8 вопросов и не считает специальные действия', () => {
    let state = createGameSession(deck, { role: 'friend', gameSize: 8, recordingMode: 'external_camera' }, () => 0.4, timestamp)
    state = run(state, 'START_AFTER_RULES')
    for (let question = 0; question < 8; question += 1) {
      state = openFirstQuestion(state)
      state = run(state, 'COMPLETE_QUESTION')
    }
    expect(state.phase).toBe('closing_offer')
    expect(state.discussedInOrder).toHaveLength(8)
  })

  it('не возвращает заменённые карточки', () => {
    let state = createGameSession(deck, { role: 'close_person', gameSize: 4, recordingMode: 'conversation' }, () => 0.2, timestamp)
    state = run(state, 'START_AFTER_RULES')
    state = run(state, 'DRAW_PAIR')
    const firstPair = [...state.candidates]
    state = run(state, 'REPLACE_PAIR')
    expect(state.candidates.some((id) => firstPair.includes(id))).toBe(false)
    firstPair.forEach((id) => expect(state.statuses[id]).toBe('replaced'))
  })

  it('игнорирует повторную команду со старой ревизией', () => {
    let state = createGameSession(deck, { role: 'father', gameSize: 4, recordingMode: 'conversation' }, () => 0.7, timestamp)
    state = run(state, 'START_AFTER_RULES')
    const command: GameCommand = {
      kind: 'DRAW_PAIR',
      expectedRevision: state.revision,
      occurredAt: timestamp,
      viewKey: makeViewKey(state),
    }
    const afterFirst = gameReducer(deck, state, command)
    const afterSecond = gameReducer(deck, afterFirst, command)
    expect(afterSecond).toBe(afterFirst)
    expect(afterSecond.chapters.beginnings.cursor).toBe(2)
  })

  it('сохраняет вопрос во время паузы и разрешает ранний финал', () => {
    let state = createGameSession(deck, { role: 'sister', gameSize: 4, recordingMode: 'conversation' }, () => 0.6, timestamp)
    state = run(state, 'START_AFTER_RULES')
    state = openFirstQuestion(state)
    const activeId = state.activeQuestionId
    state = run(state, 'PAUSE')
    const blocked = run(state, 'COMPLETE_QUESTION')
    expect(blocked).toBe(state)
    expect(blocked.activeQuestionId).toBe(activeId)
    state = run(state, 'GO_TO_CLOSING')
    expect(state.phase).toBe('closing_offer')
    expect(state.statuses[activeId!]).toBe('abandoned')
  })

  it('доходит до исчерпания главы после замен', () => {
    let state = createGameSession(deck, { role: 'brother', gameSize: 8, recordingMode: 'conversation' }, () => 0.1, timestamp)
    state = run(state, 'START_AFTER_RULES')
    const pairCount = Math.ceil(deck.chapters[0].cardIds.length / 2)
    for (let pair = 0; pair < pairCount; pair += 1) {
      state = run(state, 'DRAW_PAIR')
      state = run(state, 'REPLACE_PAIR')
    }
    expect(state.phase).toBe('chapter_exhausted')
    expect(state.discussedInOrder).toEqual([])
    state = run(state, 'NEXT_CHAPTER')
    expect(state.currentChapterIndex).toBe(1)
  })
})
