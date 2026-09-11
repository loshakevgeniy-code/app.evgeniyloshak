import { describe, expect, it } from 'vitest'
import { formatRecordingDuration, recordingExtension } from '../src/features/audio/recordings'

describe('аудиозаписи', () => {
  it('форматирует длительность для интерфейса диктофона', () => {
    expect(formatRecordingDuration(0)).toBe('00:00')
    expect(formatRecordingDuration(65_000)).toBe('01:05')
  })

  it('подбирает расширение для форматов разных браузеров', () => {
    expect(recordingExtension('audio/mp4')).toBe('m4a')
    expect(recordingExtension('audio/ogg;codecs=opus')).toBe('ogg')
    expect(recordingExtension('audio/webm;codecs=opus')).toBe('webm')
  })
})
