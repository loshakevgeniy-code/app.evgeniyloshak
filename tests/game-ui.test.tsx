import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import rawDeck from '../src/data/deck.ru.json'
import { validateDeck } from '../src/data/validateDeck'
import { GameApp } from '../src/GameApp'

const deck = validateDeck(rawDeck)

function beginGame(size: 4 | 8) {
  fireEvent.click(screen.getByRole('button', { name: 'Начать игру' }))
  fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
  if (size === 8) fireEvent.click(screen.getByRole('radio', { name: /Глубокий разговор/ }))
  fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
  fireEvent.click(screen.getByRole('button', { name: /Начать разговор/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }))
}

function completeNextQuestion() {
  const draw = screen.queryByRole('button', { name: 'Взять две карточки' })
  if (draw) fireEvent.click(draw)
  fireEvent.click(screen.getByRole('button', { name: 'Перевернуть карточку 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Перевернуть карточку 2' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Выбрать этот вопрос' })[0])
  const listen = screen.queryByRole('button', { name: 'Перейти к рассказу' })
  if (listen) fireEvent.click(listen)
  fireEvent.click(screen.getByRole('button', { name: /Вопрос обсудили/ }))
}

describe('основной игровой сценарий', () => {
  beforeEach(() => {
    localStorage.clear()
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => { now += 500; return now })
  })

  it('открывает колоду и возвращается в игру через мобильное меню', () => {
    render(<GameApp deck={deck} onBackToCabinet={() => undefined} />)
    expect(screen.getByText('240 вопросов · 12 тем · 316 карточек всего')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Меню игры' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Колода' }))
    expect(screen.getByRole('heading', { name: /Библиотека.*разговоров/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Полная библиотека316' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Все 316' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Вопросы 240' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Уточнения 40' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Игра' }))
    expect(screen.getByRole('heading', { name: /Ближе.*к главному/ })).toBeInTheDocument()
  })

  it('проводит по трём шагам настройки и сохраняет выбор при возврате', () => {
    render(<GameApp deck={deck} onBackToCabinet={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать игру' }))

    expect(screen.getByRole('heading', { name: 'С кем вы сегодня?' })).toBeInTheDocument()
    expect(screen.getByText('Собеседник').parentElement).toHaveAttribute('aria-current', 'step')
    fireEvent.click(screen.getByRole('radio', { name: /Сестра/ }))
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))

    expect(screen.getByRole('heading', { name: 'Каким будет этот разговор?' })).toBeInTheDocument()
    expect(screen.getByText('Формат').parentElement).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('192')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Мы росли вместе/ }))
    expect(screen.getByText('199')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Личные темы/ }))
    expect(screen.getByText('220')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Назад/ }))
    expect(screen.getByRole('heading', { name: 'С кем вы сегодня?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Сестра/ })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))

    expect(screen.getByRole('heading', { name: 'Хотите сохранить голоса?' })).toBeInTheDocument()
    expect(screen.getByText('Запись').parentElement).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: /Начать разговор/ })).toBeInTheDocument()
  })

  it('переворачивает каждую закрытую карточку отдельно', () => {
    render(<GameApp deck={deck} onBackToCabinet={() => undefined} />)
    beginGame(4)
    fireEvent.click(screen.getByRole('button', { name: 'Взять две карточки' }))
    const first = screen.getByRole('button', { name: 'Перевернуть карточку 1' })
    fireEvent.click(first)
    expect(first).toHaveClass('is-flipped')
    expect(screen.queryAllByRole('button', { name: 'Выбрать этот вопрос' })).toHaveLength(0)
    const second = screen.getByRole('button', { name: 'Перевернуть карточку 2' })
    fireEvent.click(second)
    expect(second).toHaveClass('is-flipped')
    expect(screen.getAllByRole('button', { name: 'Выбрать этот вопрос' })).toHaveLength(2)
  })

  it('проходит короткую партию через интерфейс', () => {
    render(<GameApp deck={deck} onBackToCabinet={() => undefined} />)
    beginGame(4)
    for (let index = 0; index < 4; index += 1) completeNextQuestion()
    expect(screen.getByRole('heading', { name: 'Открыть последнюю карточку?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Закончить без карточки' }))
    expect(screen.getByRole('heading', { name: 'Истории, которые вы обсудили' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('проходит полный разговор из восьми вопросов', () => {
    render(<GameApp deck={deck} onBackToCabinet={() => undefined} />)
    beginGame(8)
    for (let index = 0; index < 8; index += 1) completeNextQuestion()
    expect(screen.getByRole('heading', { name: 'Открыть последнюю карточку?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Закончить без карточки' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })

  it('предлагает встроенный диктофон только после согласия участников', () => {
    render(<GameApp deck={deck} onBackToCabinet={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: 'Начать игру' }))
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Диктофон Lilya/ }))
    fireEvent.click(screen.getByRole('button', { name: /Начать разговор/ }))

    expect(screen.getByRole('heading', { name: 'Сначала договоритесь' })).toBeInTheDocument()
    expect(screen.getByText('Аудио · на этом устройстве')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Продолжить с диктофоном' })).toBeDisabled()
  })
})
