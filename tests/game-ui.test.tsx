import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import rawDeck from '../src/data/deck.ru.json'
import { validateDeck } from '../src/data/validateDeck'
import { GameApp } from '../src/GameApp'

const deck = validateDeck(rawDeck)

function beginGame(size: 4 | 8) {
  fireEvent.click(screen.getByRole('button', { name: 'Начать игру' }))
  if (size === 8) fireEvent.click(screen.getByRole('radio', { name: /Полный разговор/ }))
  fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }))
}

function completeNextQuestion() {
  const draw = screen.queryByRole('button', { name: 'Взять две карточки' })
  if (draw) fireEvent.click(draw)
  fireEvent.click(screen.getByRole('button', { name: 'Перевернуть карточку 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Перевернуть карточку 2' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Выбрать этот вопрос' })[0])
  const listen = screen.queryByRole('button', { name: 'Послушать историю' })
  if (listen) fireEvent.click(listen)
  fireEvent.click(screen.getByRole('button', { name: /Вопрос обсудили/ }))
}

describe('основной игровой сценарий', () => {
  beforeEach(() => {
    localStorage.clear()
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => { now += 500; return now })
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
})
