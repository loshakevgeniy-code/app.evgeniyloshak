import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from '../src/LandingPage'

describe('публичный лендинг Lilya', () => {
  it('объясняет продукт и ведёт ко входу', () => {
    const onLogin = vi.fn()
    render(<LandingPage onLogin={onLogin} />)

    expect(screen.getByRole('heading', { name: 'Узнавайте тех, кого любите' })).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Начните там, где вы сейчас' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Открыть Lilya/ }))
    expect(onLogin).toHaveBeenCalledOnce()
  })
})
