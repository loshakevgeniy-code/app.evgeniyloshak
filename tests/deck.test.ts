import { describe, expect, it } from 'vitest'
import rawDeck from '../src/data/deck.ru.json'
import { validateDeck } from '../src/data/validateDeck'
import { cardMatches, normalizeSearch } from '../src/features/catalog/search'
import type { Deck, QuestionCard } from '../src/types'

describe('колода', () => {
  it('валидирует полную библиотеку из 316 карточек', () => {
    const deck = validateDeck(rawDeck)
    expect(deck.cards).toHaveLength(316)
    expect(deck.cards.filter((card) => card.type === 'question')).toHaveLength(240)
    expect(deck.cards.filter((card) => card.type === 'follow_up')).toHaveLength(40)
    expect(deck.cards.filter((card) => card.type === 'closing')).toHaveLength(24)
    expect(deck.cards.filter((card) => card.type === 'special')).toHaveLength(12)
  })

  it('сохраняет двенадцать тем по двадцать вопросов и раскладывает их по четырём этапам', () => {
    const deck = validateDeck(rawDeck)
    expect(deck.topics).toHaveLength(12)
    deck.topics.forEach((topic) => expect(topic.cardIds).toHaveLength(20))
    expect(Object.fromEntries(deck.chapters.map((chapter) => [chapter.id, chapter.cardIds.length]))).toEqual({
      beginnings: 60,
      character: 120,
      turns: 40,
      present: 20,
    })
    expect(deck.topics.filter((topic) => topic.stageId === 'beginnings').map((topic) => topic.id)).toEqual(['C01', 'C07', 'C08'])
    expect(deck.topics.filter((topic) => topic.stageId === 'character').map((topic) => topic.id)).toEqual(['C02', 'C03', 'C04', 'C06', 'C11', 'C12'])
    expect(deck.topics.filter((topic) => topic.stageId === 'turns').map((topic) => topic.id)).toEqual(['C05', 'C09'])
    expect(deck.topics.filter((topic) => topic.stageId === 'present').map((topic) => topic.id)).toEqual(['C10'])
  })

  it('сохраняет редакторские флаги, догадки и отбор FAMILY 01', () => {
    const deck = validateDeck(rawDeck)
    const questions = deck.cards.filter((card): card is QuestionCard => card.type === 'question')
    expect(questions.filter((card) => card.guess)).toHaveLength(28)
    expect(questions.filter((card) => card.coreCandidate)).toHaveLength(96)
    expect(deck.cards.filter((card) => card.coreCandidate)).toHaveLength(120)
    expect(questions.filter((card) => card.depth === 'deep')).toHaveLength(22)
    expect(questions.filter((card) => card.depth === 'deep').every((card) => card.requiresTopicOptIn)).toBe(true)
    expect(questions.filter((card) => card.topicId === 'C09').every((card) => card.requiresTopicOptIn)).toBe(true)
    expect(questions.filter((card) => card.requiresSharedChildhood)).toHaveLength(7)
    expect(questions.find((card) => card.id === 'C11-01')?.audience).toBe('parent')
    expect(questions.find((card) => card.id === 'C12-01')?.audience).toBe('siblings')
  })

  it('использует новые ID и сохраняет связи без старых индексных номеров', () => {
    const deck = validateDeck(rawDeck)
    const questions = deck.cards.filter((card): card is QuestionCard => card.type === 'question')
    expect(questions.every((card) => /^C\d{2}-\d{2}$/.test(card.id))).toBe(true)
    expect(deck.cards.some((card) => /^Q\d+/.test(card.id))).toBe(false)
    for (const card of questions) {
      expect(deck.topics.find((topic) => topic.id === card.topicId)?.cardIds).toContain(card.id)
      expect(deck.chapters.find((chapter) => chapter.id === card.chapterId)?.cardIds).toContain(card.id)
    }
  })

  it('нормализует регистр, пробелы и ё', () => {
    const deck = rawDeck as Deck
    const card = deck.cards.find((item) => item.id === 'C01-03')!
    expect(normalizeSearch('  ВСЁ   ')).toBe('все')
    expect(cardMatches(card, 'РОСКОШЬ')).toBe(true)
    expect(cardMatches(card, 'ЛЕГКИЙ')).toBe(true)
    expect(cardMatches(card, 'C01-03')).toBe(true)
  })

  it('исправляет контекстное уточнение C06-03', () => {
    const deck = validateDeck(rawDeck)
    const card = deck.cards.find((item) => item.id === 'C06-03') as QuestionCard
    expect(card.detailPrompt).toBe('Расскажи, как появилось одно такое слово или одна шутка.')
  })
})
