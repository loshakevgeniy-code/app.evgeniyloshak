import type { Card } from '../../types'

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim().replace(/\s+/g, ' ')
}

export function cardMatches(card: Card, query: string) {
  const normalized = normalizeSearch(query)
  if (!normalized) return true
  return normalizeSearch(`${card.title} ${card.prompt} ${card.detailPrompt}`).includes(normalized)
}
