import type { Deck } from './types'

export interface AuthUser {
  id: number
  email: string
  displayName: string
  role: string
}

export interface ProductAccess {
  slug: string
  title: string
  status: string
  valid_until: string | null
}

export interface AuthPayload {
  user: AuthUser
  products: ProductAccess[]
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>
  const data = await response.json().catch(() => ({ error: 'Сервис временно недоступен.' }))
  throw new Error(data.error || 'Сервис временно недоступен.')
}

export async function getMe(): Promise<AuthPayload | null> {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
  if (response.status === 401) return null
  return parseResponse<AuthPayload>(response)
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseResponse<AuthPayload>(response)
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  if (!response.ok && response.status !== 204) throw new Error('Не удалось выйти из кабинета.')
}

export async function getDeck(): Promise<Deck> {
  const response = await fetch('/api/game/deck', { credentials: 'same-origin', cache: 'no-store' })
  return parseResponse<Deck>(response)
}
