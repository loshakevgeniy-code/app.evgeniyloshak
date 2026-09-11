import type { Deck, QuestionCard } from '../types'

export function validateDeck(input: unknown): Deck {
  if (!input || typeof input !== 'object') throw new Error('Колода не загрузилась.')
  const deck = input as Deck
  if (!Array.isArray(deck.chapters) || !Array.isArray(deck.cards)) throw new Error('В колоде нет нужных разделов.')

  const ids = deck.cards.map((card) => card.id)
  if (new Set(ids).size !== ids.length) throw new Error('В колоде повторяются ID карточек.')

  const counts = deck.cards.reduce<Record<string, number>>((result, card) => {
    result[card.type] = (result[card.type] || 0) + 1
    return result
  }, {})
  if (counts.question !== 24 || counts.follow_up !== 8 || counts.special !== 2 || counts.closing !== 1) {
    throw new Error('Состав колоды не совпадает с редакцией 1.0.0.')
  }

  const cardIds = new Set<string>(ids)
  for (const chapter of deck.chapters) {
    if (chapter.cardIds.length !== 6 || new Set(chapter.cardIds).size !== 6) {
      throw new Error(`В главе «${chapter.title}» должно быть шесть разных вопросов.`)
    }
    for (const id of chapter.cardIds) {
      const card = deck.cards.find((candidate) => candidate.id === id) as QuestionCard | undefined
      if (!card || card.type !== 'question' || card.chapterId !== chapter.id) {
        throw new Error(`Нарушена связь карточки ${id} с главой.`)
      }
    }
  }

  for (const card of deck.cards.filter((item): item is QuestionCard => item.type === 'question')) {
    for (const id of card.recommendedFollowUps) {
      if (!cardIds.has(id) || !id.startsWith('F')) throw new Error(`У карточки ${card.id} неверное уточнение ${id}.`)
    }
  }
  return deck
}
