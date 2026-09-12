import type { Card } from '../../types'

const depthLabels = {
  light: 'лёгкий легкий',
  medium: 'средний',
  deep: 'глубокий личное',
}

const audienceLabels = {
  general: 'общие близкие',
  parent: 'родитель взрослый ребёнок ребенок',
  siblings: 'братья сёстры сестры',
}

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim().replace(/\s+/g, ' ')
}

export function cardMatches(card: Card, query: string) {
  const normalized = normalizeSearch(query)
  if (!normalized) return true
  const metadata = card.type === 'question'
    ? [
        card.topicId,
        depthLabels[card.depth],
        audienceLabels[card.audience],
        card.guess?.target,
        card.coreCandidate ? 'family 01 стартовый набор' : '',
        card.requiresSharedChildhood ? 'совместное взросление общее детство' : '',
        card.requiresTopicOptIn ? 'отдельный выбор личная тема' : '',
      ]
    : [card.coreCandidate ? 'family 01 стартовый набор' : '']
  const haystack = [
    card.id,
    card.title,
    card.prompt,
    card.detailPrompt,
    card.editorial.purpose,
    card.editorial.whenToUse,
    card.editorial.moderationNote,
    ...metadata,
  ].filter(Boolean).join(' ')
  return normalizeSearch(haystack).includes(normalized)
}
