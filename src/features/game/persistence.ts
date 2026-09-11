import type { Deck, GameSession, Preferences } from '../../types'
import { assertGameInvariants } from './engine'

export const SESSION_KEY = 'familyPortrait.session.v1'
export const PREFERENCES_KEY = 'familyPortrait.preferences.v1'
const TEST_KEY = 'familyPortrait.storage.test'

export const DEFAULT_PREFERENCES: Preferences = {
  largeText: false,
  reduceMotion: false,
  favorites: [],
}

export interface StorageAdapter {
  available: boolean
  get(key: string): string | null
  set(key: string, value: string): boolean
  remove(key: string): boolean
}

export function createStorageAdapter(storage?: Storage): StorageAdapter {
  try {
    const target = storage ?? window.localStorage
    target.setItem(TEST_KEY, '1')
    target.removeItem(TEST_KEY)
    return {
      available: true,
      get(key) {
        try { return target.getItem(key) } catch { return null }
      },
      set(key, value) {
        try { target.setItem(key, value); return true } catch { return false }
      },
      remove(key) {
        try { target.removeItem(key); return true } catch { return false }
      },
    }
  } catch {
    const memory = new Map<string, string>()
    return {
      available: false,
      get: (key) => memory.get(key) || null,
      set(key, value) { memory.set(key, value); return true },
      remove(key) { memory.delete(key); return true },
    }
  }
}

export function loadSession(storage: StorageAdapter, deck: Deck): { session: GameSession | null; corrupted: boolean } {
  const saved = storage.get(SESSION_KEY)
  if (!saved) return { session: null, corrupted: false }
  try {
    const session = JSON.parse(saved) as GameSession
    const valid = session?.schemaVersion === '1.0.0'
      && session.deckVersion === deck.deckVersion
      && typeof session.sessionId === 'string'
      && typeof session.revision === 'number'
      && Array.isArray(session.discussedInOrder)
      && assertGameInvariants(deck, session).length === 0
    if (!valid) throw new Error('invalid session')
    return { session, corrupted: false }
  } catch {
    storage.remove(SESSION_KEY)
    return { session: null, corrupted: true }
  }
}

export function saveSession(storage: StorageAdapter, session: GameSession): boolean {
  return storage.set(SESSION_KEY, JSON.stringify(session))
}

export function loadPreferences(storage: StorageAdapter, deck: Deck): Preferences {
  const saved = storage.get(PREFERENCES_KEY)
  if (!saved) return DEFAULT_PREFERENCES
  try {
    const input = JSON.parse(saved) as Partial<Preferences>
    const validIds = new Set<string>(deck.cards.map((card) => card.id))
    return {
      largeText: input.largeText === true,
      reduceMotion: input.reduceMotion === true,
      favorites: Array.isArray(input.favorites)
        ? [...new Set(input.favorites.filter((id): id is string => typeof id === 'string' && validIds.has(id)))]
        : [],
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(storage: StorageAdapter, preferences: Preferences): boolean {
  return storage.set(PREFERENCES_KEY, JSON.stringify(preferences))
}

export function deleteAppData(storage: StorageAdapter) {
  storage.remove(SESSION_KEY)
  storage.remove(PREFERENCES_KEY)
}
