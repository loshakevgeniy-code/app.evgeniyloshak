import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true }
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() { this.open = false }
}
