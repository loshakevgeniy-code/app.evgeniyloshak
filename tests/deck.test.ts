import { describe, expect, it } from 'vitest'
import rawDeck from '../src/data/deck.ru.json'
import { validateDeck } from '../src/data/validateDeck'
import { cardMatches, normalizeSearch } from '../src/features/catalog/search'
import type { Deck, QuestionCard } from '../src/types'

describe('колода', () => {
  it('валидирует все 70 карточек и связи', () => {
    const deck = validateDeck(rawDeck)
    expect(deck.cards).toHaveLength(70)
    expect(deck.cards.filter((card) => card.type === 'question')).toHaveLength(59)
    expect(deck.cards.filter((card) => card.type === 'follow_up')).toHaveLength(8)
  })

  it('не подставляет уточнения к будущим затеям', () => {
    const deck = validateDeck(rawDeck)
    for (const id of ['Q23', 'Q24']) {
      const card = deck.cards.find((item) => item.id === id) as QuestionCard
      expect(card.recommendedFollowUps).toEqual([])
    }
  })

  it('нормализует регистр, пробелы и ё', () => {
    const deck = rawDeck as Deck
    const card = deck.cards.find((item) => item.id === 'Q01')!
    expect(normalizeSearch('  ВСЁ   ')).toBe('все')
    expect(cardMatches(card, 'БОГАТОЙ')).toBe(true)
  })
})
