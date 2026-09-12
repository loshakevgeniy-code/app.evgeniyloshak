import type { Card, CardType, Deck, QuestionCard, TopicId } from '../types'

const EXPECTED_COUNTS: Record<CardType, number> = {
  question: 240,
  follow_up: 40,
  closing: 24,
  special: 12,
}

const EXPECTED_CORE_COUNTS: Record<CardType, number> = {
  question: 96,
  follow_up: 12,
  closing: 8,
  special: 4,
}

const TOPIC_IDS = [
  'C01', 'C02', 'C03', 'C04', 'C05', 'C06',
  'C07', 'C08', 'C09', 'C10', 'C11', 'C12',
] as const satisfies readonly TopicId[]

const QUESTION_ID = /^C(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|20)$/
const SUPPORTING_IDS: Record<Exclude<CardType, 'question'>, RegExp> = {
  follow_up: /^F(?:0[1-9]|[1-3]\d|40)$/,
  closing: /^Z(?:0[1-9]|1\d|2[0-4])$/,
  special: /^A(?:0[1-9]|1[0-2])$/,
}

function countCards(cards: Card[], predicate: (card: Card) => boolean) {
  return cards.filter(predicate).length
}

export function validateDeck(input: unknown): Deck {
  if (!input || typeof input !== 'object') throw new Error('Колода не загрузилась.')
  const deck = input as Deck
  if (!Array.isArray(deck.chapters) || !Array.isArray(deck.topics) || !Array.isArray(deck.cards)) {
    throw new Error('В колоде нет нужных разделов.')
  }
  if (deck.schemaVersion !== '2.0.0' || deck.deckVersion !== '2.0.0' || deck.contentVersion !== '2.0.0') {
    throw new Error('Версии схемы и контента колоды не совпадают с редакцией 2.0.0.')
  }

  const ids = deck.cards.map((card) => card.id)
  const cardIds = new Set<string>(ids)
  if (cardIds.size !== ids.length) throw new Error('В колоде повторяются ID карточек.')
  if (ids.length !== 316) throw new Error('В полной библиотеке должно быть ровно 316 карточек.')

  for (const [type, expected] of Object.entries(EXPECTED_COUNTS) as [CardType, number][]) {
    if (countCards(deck.cards, (card) => card.type === type) !== expected) {
      throw new Error(`Неверное количество карточек типа ${type}.`)
    }
    if (countCards(deck.cards, (card) => card.type === type && card.coreCandidate) !== EXPECTED_CORE_COUNTS[type]) {
      throw new Error(`Неверное количество кандидатов FAMILY 01 типа ${type}.`)
    }
  }

  if (deck.chapters.length !== 4 || new Set(deck.chapters.map((chapter) => chapter.id)).size !== 4) {
    throw new Error('В игровой структуре должно быть четыре разных этапа.')
  }
  const stagedQuestionIds = deck.chapters.flatMap((chapter) => chapter.cardIds)
  if (stagedQuestionIds.length !== 240 || new Set(stagedQuestionIds).size !== 240) {
    throw new Error('Каждый основной вопрос должен входить ровно в один игровой этап.')
  }

  if (deck.topics.length !== TOPIC_IDS.length || new Set(deck.topics.map((topic) => topic.id)).size !== TOPIC_IDS.length) {
    throw new Error('В библиотеке должно быть двенадцать разных тем.')
  }

  for (const expectedId of TOPIC_IDS) {
    const topic = deck.topics.find((candidate) => candidate.id === expectedId)
    if (!topic || topic.cardIds.length !== 20 || new Set(topic.cardIds).size !== 20) {
      throw new Error(`В теме ${expectedId} должно быть ровно двадцать разных вопросов.`)
    }
    const chapter = deck.chapters.find((candidate) => candidate.id === topic.stageId)
    if (!chapter) throw new Error(`У темы ${expectedId} указан неизвестный этап.`)
    for (const id of topic.cardIds) {
      const card = deck.cards.find((candidate) => candidate.id === id)
      if (!card || card.type !== 'question' || card.topicId !== topic.id || card.chapterId !== topic.stageId) {
        throw new Error(`Нарушена связь карточки ${id} с темой или этапом.`)
      }
      if (!chapter.cardIds.includes(id)) throw new Error(`Карточка ${id} отсутствует в этапе ${chapter.id}.`)
    }
  }

  const questions = deck.cards.filter((card): card is QuestionCard => card.type === 'question')
  for (const card of questions) {
    if (!QUESTION_ID.test(card.id)) throw new Error(`Неверный ID основного вопроса ${card.id}.`)
    if (!card.detailPrompt || !['light', 'medium', 'deep'].includes(card.depth)) {
      throw new Error(`У карточки ${card.id} неполные редакторские метаданные.`)
    }
    if (card.id.slice(0, 3) !== card.topicId) throw new Error(`ID карточки ${card.id} не совпадает с её темой.`)
    for (const id of card.recommendedFollowUps) {
      if (!cardIds.has(id) || !SUPPORTING_IDS.follow_up.test(id)) {
        throw new Error(`У карточки ${card.id} неверное уточнение ${id}.`)
      }
    }
  }

  for (const card of deck.cards.filter((card) => card.type !== 'question')) {
    if (!SUPPORTING_IDS[card.type].test(card.id)) throw new Error(`Неверный ID карточки ${card.id}.`)
  }

  const guesses = questions.filter((card) => card.guess)
  if (guesses.length !== 28 || guesses.some((card) => !card.guess?.eligible || !card.guess.target)) {
    throw new Error('В библиотеке должно быть 28 полностью описанных карточек с догадкой.')
  }
  if (guesses.some((card) => card.requiresTopicOptIn)) {
    throw new Error('Догадка не используется в вопросах, требующих отдельного выбора темы.')
  }
  if (questions.some((card) => card.depth === 'deep' && !card.requiresTopicOptIn)) {
    throw new Error('Глубокие вопросы должны требовать отдельного выбора темы.')
  }

  return deck
}
