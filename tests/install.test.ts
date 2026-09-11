import { afterEach, describe, expect, it, vi } from 'vitest'
import { isStandaloneApp } from '../src/App'

const originalMatchMedia = window.matchMedia

afterEach(() => {
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: undefined })
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
})

describe('режим установленного приложения', () => {
  it('определяет standalone-режим через display-mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    })
    expect(isStandaloneApp()).toBe(true)
  })

  it('определяет установленное приложение на iPhone', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
    expect(isStandaloneApp()).toBe(true)
  })
})
