import { describe, expect, it } from 'vitest'
import rawDeck from '../src/data/deck.ru.json'
import { validateDeck } from '../src/data/validateDeck'
import { createGameSession } from '../src/features/game/engine'
import { createStorageAdapter, loadSession, saveSession, SESSION_KEY } from '../src/features/game/persistence'

const deck = validateDeck(rawDeck)

describe('локальное сохранение', () => {
  it('восстанавливает корректную партию', () => {
    const storage = createStorageAdapter(localStorage)
    const session = createGameSession(deck, { role: 'close_person', gameSize: 4, recordingMode: 'conversation' })
    expect(saveSession(storage, session)).toBe(true)
    expect(loadSession(storage, deck).session?.sessionId).toBe(session.sessionId)
    localStorage.removeItem(SESSION_KEY)
  })

  it('удаляет только повреждённый ключ партии', () => {
    localStorage.setItem(SESSION_KEY, '{bad json')
    localStorage.setItem('unrelated', 'keep')
    const storage = createStorageAdapter(localStorage)
    expect(loadSession(storage, deck)).toEqual({ session: null, corrupted: true })
    expect(localStorage.getItem('unrelated')).toBe('keep')
    localStorage.removeItem('unrelated')
  })

  it('переходит в память, если storage запрещён', () => {
    const denied = {
      getItem() { throw new Error('denied') },
      setItem() { throw new Error('denied') },
      removeItem() { throw new Error('denied') },
      clear() {},
      key() { return null },
      length: 0,
    } satisfies Storage
    const storage = createStorageAdapter(denied)
    expect(storage.available).toBe(false)
    expect(storage.set('x', '1')).toBe(true)
    expect(storage.get('x')).toBe('1')
  })
})
