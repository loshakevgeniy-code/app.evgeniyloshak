import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(scriptDirectory, '..')
const defaultSource = resolve(projectDirectory, '../../../Downloads/Игра/12/02_QUESTION_LIBRARY.md')
const sourcePath = resolve(process.argv[2] || defaultSource)
const outputPath = resolve(process.argv[3] || resolve(projectDirectory, 'src/data/deck.ru.json'))

const markdown = readFileSync(sourcePath, 'utf8')
const lines = markdown.split(/\r?\n/)

const stages = [
  {
    id: 'beginnings',
    number: '01',
    title: 'С чего всё началось',
    subtitle: 'Мир детства, радости, места и вещи, из которых складывается память.',
    colorToken: 'chapter-beginnings',
    symbol: 'window',
    topicIds: ['C01', 'C07', 'C08'],
  },
  {
    id: 'character',
    number: '02',
    title: 'Какой ты человек',
    subtitle: 'Самостоятельность, характер, дело и отношения с близкими.',
    colorToken: 'chapter-character',
    symbol: 'overlap',
    topicIds: ['C02', 'C03', 'C04', 'C06', 'C11', 'C12'],
  },
  {
    id: 'turns',
    number: '03',
    title: 'Как менялся твой путь',
    subtitle: 'Развилки, перемены и сложные главы, о которых хочется рассказать.',
    colorToken: 'chapter-turns',
    symbol: 'fork',
    topicIds: ['C05', 'C09'],
  },
  {
    id: 'present',
    number: '04',
    title: 'Что тебе важно сейчас',
    subtitle: 'Нынешняя жизнь, новые интересы и то, что ещё впереди.',
    colorToken: 'chapter-present',
    symbol: 'open-circle',
    topicIds: ['C10'],
  },
]

const topicDefinitions = [
  ['C01', 'Мир, в котором ты рос', 'Обычная жизнь прошлого через небольшие сцены. Детство не предполагается счастливым.'],
  ['C02', 'Когда ты начал решать сам', 'Самостоятельность в любом возрасте, не только совершеннолетие и переезд.'],
  ['C03', 'Твой характер в действии', 'Черты человека через поступки, исключения и противоречия.'],
  ['C04', 'Дело, деньги, мастерство', 'Работа, неоплачиваемый труд, умения и бытовые решения. Без требования назвать доход.'],
  ['C05', 'Развилки и чужие маршруты', 'Возможности, случайности, перемены и решения остаться.'],
  ['C06', 'Люди, которые на тебя повлияли', 'Дружба, встречи, дистанция и повседневная забота. Не только романтические отношения.'],
  ['C07', 'То, что радует и смешит', 'Радость, вкус, игра, юмор и маленькие удовольствия без обязательного большого вывода.'],
  ['C08', 'Вещи, места и следы времени', 'Предметы, фотографии, звуки и места как добровольные поводы вспомнить.'],
  ['C09', 'Сложные главы, о которых ты готов говорить', 'Необязательный модуль. Только после отдельного выбора, без реконструкции травмирующих подробностей.'],
  ['C10', 'Ты сегодня и дальше', 'Нынешние интересы, изменившиеся взгляды и будущее самого рассказчика.'],
  ['C11', 'Родитель и взрослый ребёнок', 'Вопросы взрослого ребёнка родителю или человеку, который участвовал в его воспитании.'],
  ['C12', 'Братья и сёстры', 'Разговор взрослых братьев и сестёр. Отдельные карточки требуют опыта совместного взросления.'],
]

const depthMap = {
  'лёгкий': 'light',
  'средний': 'medium',
  'глубокий': 'deep',
}

const actionMap = {
  A01: 'private_guess',
  A02: 'show_object',
  A03: 'return_question',
  A04: 'choose_two',
  A05: 'draw_route',
  A06: 'touch_object',
  A07: 'compare_times',
  A08: 'change_role',
  A09: 'photo_outside_frame',
  A10: 'parallel_versions',
  A11: 'own_question',
  A12: 'change_genre',
}

function stageForTopic(topicId) {
  const stage = stages.find((candidate) => candidate.topicIds.includes(topicId))
  if (!stage) throw new Error(`Для темы ${topicId} не назначен этап игры.`)
  return stage.id
}

function audienceForTopic(topicId) {
  if (topicId === 'C11') return 'parent'
  if (topicId === 'C12') return 'siblings'
  return 'general'
}

function blockAfter(index) {
  let end = index + 1
  while (end < lines.length && !/^#{2,3} /.test(lines[end])) end += 1
  return lines.slice(index + 1, end)
}

function requiredMatch(block, matcher, id, field) {
  const line = block.find((candidate) => matcher.test(candidate))
  if (!line) throw new Error(`У ${id} не найдено поле «${field}».`)
  return line.match(matcher)[1].trim()
}

function questionModerationNote({ audience, requiresSharedChildhood, requiresTopicOptIn }) {
  if (requiresTopicOptIn) return 'Личное. Только если хочется: вопрос показывается после отдельного выбора темы и всегда может быть заменён.'
  if (requiresSharedChildhood) return 'Показывать только при добровольном подтверждении общего опыта взросления; вопрос всегда можно заменить.'
  if (audience === 'parent') return 'Вопрос адресован родителю или участвовавшему в воспитании взрослому; его всегда можно заменить.'
  if (audience === 'siblings') return 'Вопрос предназначен для разговора взрослых братьев и сестёр; его всегда можно заменить.'
  return 'Вопрос можно пропустить или заменить без объяснения.'
}

const questions = []
for (let index = 0; index < lines.length; index += 1) {
  const heading = lines[index].match(/^### (C\d{2}-\d{2}) · (лёгкий|средний|глубокий)(.*)$/u)
  if (!heading) continue

  const [, id, russianDepth, labels] = heading
  const block = blockAfter(index)
  const topicId = id.slice(0, 3)
  const topic = topicDefinitions.find(([candidate]) => candidate === topicId)
  if (!topic) throw new Error(`Неизвестная тема у карточки ${id}.`)

  const prompt = requiredMatch(block, /^\*\*(.+)\*\*$/, id, 'вопрос')
  let detailPrompt = requiredMatch(block, /^Уточнение:\s*(.+)$/, id, 'уточнение')
  if (id === 'C06-03') detailPrompt = 'Расскажи, как появилось одно такое слово или одна шутка.'

  const guessLine = block.find((line) => line.startsWith('Догадка:'))
  const guessPrompt = guessLine?.replace(/^Догадка:\s*/, '').trim()
  const guessTarget = guessPrompt?.split(/\. Сначала/u)[0].replace(/\.$/, '')
  const audience = audienceForTopic(topicId)
  const requiresSharedChildhood = labels.includes('нужен опыт совместного взросления')
  const requiresTopicOptIn = labels.includes('только по отдельному выбору')

  questions.push({
    id,
    type: 'question',
    chapterId: stageForTopic(topicId),
    topicId,
    number: questions.length + 1,
    title: topic[1],
    prompt,
    detailPrompt,
    depth: depthMap[russianDepth],
    audience,
    requiresSharedChildhood,
    requiresTopicOptIn,
    guess: guessPrompt ? { eligible: true, target: guessTarget, prompt: guessPrompt } : null,
    recommendedFollowUps: [],
    coreCandidate: labels.includes('★ FAMILY 01'),
    status: 'editorial_candidate_untested',
    editorial: {
      moderationNote: questionModerationNote({ audience, requiresSharedChildhood, requiresTopicOptIn }),
    },
  })
}

function parseSupportingCards(prefix, type) {
  const cards = []
  const expression = new RegExp(`^### (${prefix}\\d{2})\\. (.+)$`, 'u')
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(expression)
    if (!heading) continue
    const [, id, titleAndLabels] = heading
    const block = blockAfter(index)
    const title = titleAndLabels.replace(/ · ★ FAMILY 01/u, '').trim()
    const prompt = requiredMatch(block, /^\*\*(.+)\*\*$/, id, type === 'special' ? 'действие' : 'текст')
    const hostNote = requiredMatch(block, /^Ведущему:\s*(.+)$/, id, 'заметка ведущему')
    const common = {
      id,
      type,
      title,
      prompt,
      detailPrompt: hostNote,
      coreCandidate: titleAndLabels.includes('★ FAMILY 01'),
      status: 'editorial_candidate_untested',
      editorial: {
        ...(type === 'follow_up' ? { whenToUse: hostNote } : {}),
        moderationNote: hostNote,
      },
    }
    if (type === 'follow_up') cards.push({ ...common, excludeForSensitiveTopics: id === 'F28' })
    else if (type === 'special') cards.push({ ...common, action: actionMap[id] })
    else cards.push(common)
  }
  return cards
}

const followUps = parseSupportingCards('F', 'follow_up')
const closings = parseSupportingCards('Z', 'closing')
const actions = parseSupportingCards('A', 'special')

const topics = topicDefinitions.map(([id, title, description], index) => ({
  id,
  number: String(index + 1).padStart(2, '0'),
  title,
  description,
  stageId: stageForTopic(id),
  audience: audienceForTopic(id),
  requiresTopicOptIn: id === 'C09',
  cardIds: questions.filter((card) => card.topicId === id).map((card) => card.id),
}))

const chapters = stages.map(({ topicIds, ...stage }) => ({
  ...stage,
  cardIds: questions.filter((card) => topicIds.includes(card.topicId)).map((card) => card.id),
}))

const deck = {
  schemaVersion: '2.0.0',
  deckVersion: '2.0.0',
  contentVersion: '2.0.0',
  locale: 'ru-RU',
  title: 'Lilya',
  subtitle: 'Разговоры, которые остаются.',
  shortDescription: '240 бережных вопросов, 40 уточнений, 24 завершения и 12 игровых действий.',
  audience: 'Два взрослых человека: близкие, родитель и взрослый ребёнок или взрослые братья и сёстры.',
  chapters,
  topics,
  cards: [...questions, ...followUps, ...closings, ...actions],
}

function assertCount(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label}: ожидалось ${expected}, получено ${actual}.`)
}

assertCount('Основных вопросов', questions.length, 240)
assertCount('Уточнений', followUps.length, 40)
assertCount('Завершений', closings.length, 24)
assertCount('Игровых действий', actions.length, 12)
assertCount('Тем', topics.length, 12)
for (const topic of topics) assertCount(`Вопросов в ${topic.id}`, topic.cardIds.length, 20)
assertCount('Кандидатов FAMILY 01', deck.cards.filter((card) => card.coreCandidate).length, 120)
assertCount('Карточек с догадкой', questions.filter((card) => card.guess).length, 28)

const ids = deck.cards.map((card) => card.id)
assertCount('Уникальных ID', new Set(ids).size, 316)
if (questions.some((card) => card.guess && card.requiresTopicOptIn)) {
  throw new Error('Догадка не должна быть включена у вопросов, требующих отдельного выбора темы.')
}

writeFileSync(outputPath, `${JSON.stringify(deck, null, 2)}\n`)
console.log(`Импортировано ${deck.cards.length} карточек из ${sourcePath}`)
console.log(`Результат: ${outputPath}`)
