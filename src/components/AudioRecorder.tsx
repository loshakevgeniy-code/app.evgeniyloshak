import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  audioRecordingSupported,
  deleteAllAudioRecordings,
  deleteAudioRecording,
  formatRecordingDuration,
  listAudioRecordings,
  recordingExtension,
  saveAudioRecording,
  type AudioRecording,
} from '../features/audio/recordings'

export interface RecordingContext {
  cardId?: string
  title?: string
  prompt?: string
}

function createRecordingId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `recording-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function preferredMimeType() {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function downloadRecording(recording: AudioRecording) {
  const url = URL.createObjectURL(recording.blob)
  const link = document.createElement('a')
  const date = recording.createdAt.slice(0, 10)
  link.href = url
  link.download = `lilya-${date}-${recording.id.slice(0, 8)}.${recordingExtension(recording.mimeType)}`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AudioRecorder({
  context,
  consentRequired,
  onSaved,
  onOpenLibrary,
}: {
  context?: RecordingContext
  consentRequired: boolean
  onSaved: () => void
  onOpenLibrary: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'saving' | 'saved'>('idle')
  const [consent, setConsent] = useState(!consentRequired)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<AudioRecording | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const discardRef = useRef(false)

  useEffect(() => {
    if (!saved) return
    const url = URL.createObjectURL(saved.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [saved])

  useEffect(() => {
    if (status !== 'recording') return
    const timer = window.setInterval(() => {
      const duration = Date.now() - startedAtRef.current
      setElapsed(duration)
      if (duration >= 60 * 60 * 1000 && recorderRef.current?.state === 'recording') recorderRef.current.stop()
    }, 250)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => () => {
    discardRef.current = true
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  async function startRecording() {
    setError('')
    if (!audioRecordingSupported()) {
      setError('На этом устройстве встроенная запись недоступна. Можно использовать обычный диктофон телефона.')
      return
    }
    try {
      discardRef.current = false
      setStatus('requesting')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      if (discardRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      const mimeType = preferredMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()
      setElapsed(0)
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onerror = () => setError('Запись прервалась. Попробуйте ещё раз.')
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (discardRef.current) return
        setStatus('saving')
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
          if (!blob.size) throw new Error('empty recording')
          const recording: AudioRecording = {
            id: createRecordingId(),
            createdAt: new Date().toISOString(),
            durationMs: Math.max(1000, Date.now() - startedAtRef.current),
            mimeType: blob.type,
            blob,
            title: context?.title ? `Ответ · ${context.title}` : 'Разговор Lilya',
            cardId: context?.cardId,
            prompt: context?.prompt,
          }
          await saveAudioRecording(recording)
          setSaved(recording)
          setStatus('saved')
          onSaved()
        } catch {
          setStatus('idle')
          setError('Не удалось сохранить запись на устройстве. Проверьте свободное место и попробуйте снова.')
        }
      }
      recorder.start(1000)
      setStatus('recording')
    } catch (caught) {
      setStatus('idle')
      const denied = caught instanceof DOMException && (caught.name === 'NotAllowedError' || caught.name === 'PermissionDeniedError')
      setError(denied ? 'Разрешите доступ к микрофону в настройках браузера и попробуйте снова.' : 'Не удалось включить микрофон на этом устройстве.')
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      setStatus('saving')
      recorderRef.current.stop()
    }
  }

  return (
    <div className="audio-recorder">
      {context?.prompt && <section className="audio-context"><p className="eyebrow">Текущий вопрос</p><p>{context.prompt}</p></section>}
      <div className={`audio-recorder__stage is-${status}`}>
        <p className="audio-status"><span aria-hidden="true" />{status === 'recording' ? 'Идёт запись' : status === 'saved' ? 'Сохранено на устройстве' : 'Диктофон Lilya'}</p>
        <strong>{status === 'recording' ? formatRecordingDuration(elapsed) : status === 'requesting' ? 'Включаем микрофон…' : status === 'saving' ? 'Сохраняем…' : status === 'saved' ? 'Запись готова' : '00:00'}</strong>
        <div className="audio-wave" aria-hidden="true">
          {Array.from({ length: 23 }, (_, index) => <i key={index} style={{ '--bar': index } as CSSProperties} />)}
        </div>
        <p>{status === 'recording' ? 'Можно говорить. Не закрывайте приложение до остановки.' : 'Аудио останется только на этом устройстве.'}</p>
      </div>
      {consentRequired && status === 'idle' && (
        <label className="audio-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Все участники согласны на аудиозапись.</span></label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {status === 'idle' && <button className="audio-record-button" type="button" disabled={!consent} onClick={startRecording}><span aria-hidden="true" /> Начать запись</button>}
      {status === 'requesting' && <button className="audio-record-button" type="button" disabled>Ожидаем доступ к микрофону…</button>}
      {status === 'recording' && <button className="audio-stop-button" type="button" onClick={stopRecording}><span aria-hidden="true" /> Остановить и сохранить</button>}
      {status === 'saving' && <button className="audio-stop-button" type="button" disabled>Сохраняем запись…</button>}
      {status === 'saved' && saved && (
        <div className="audio-saved">
          {previewUrl && <audio controls preload="metadata" src={previewUrl}>Ваш браузер не поддерживает воспроизведение аудио.</audio>}
          <div className="button-row">
            <button className="button button--paper" type="button" onClick={() => downloadRecording(saved)}>Скачать файл</button>
            <button className="button button--game" type="button" onClick={onOpenLibrary}>Все записи</button>
          </div>
        </div>
      )}
      <p className="audio-privacy">Lilya не загружает аудио на сервер. При очистке данных браузера запись может быть удалена — важные записи лучше скачать.</p>
    </div>
  )
}

function RecordingItem({ recording, onDelete }: { recording: AudioRecording; onDelete: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const next = URL.createObjectURL(recording.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [recording.blob])
  return (
    <article className="recording-item">
      <div className="recording-item__meta"><span>{new Date(recording.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</span><span>{formatRecordingDuration(recording.durationMs)}</span></div>
      <h3>{recording.title}</h3>
      {recording.prompt && <p>{recording.prompt}</p>}
      {url && <audio controls preload="metadata" src={url}>Ваш браузер не поддерживает воспроизведение аудио.</audio>}
      <div className="button-row">
        <button className="button button--paper" type="button" onClick={() => downloadRecording(recording)}>Скачать</button>
        <button className="recording-delete" type="button" onClick={onDelete}>Удалить</button>
      </div>
    </article>
  )
}

export function RecordingsLibrary({ onNewRecording, onChanged }: { onNewRecording: () => void; onChanged: () => void }) {
  const [recordings, setRecordings] = useState<AudioRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listAudioRecordings().then(setRecordings).catch(() => setError('Не удалось открыть записи на этом устройстве.')).finally(() => setLoading(false))
  }, [])

  async function remove(id: string) {
    if (!window.confirm('Удалить эту аудиозапись с устройства?')) return
    await deleteAudioRecording(id)
    setRecordings((current) => current.filter((item) => item.id !== id))
    onChanged()
  }

  async function removeAll() {
    if (!window.confirm('Удалить все аудиозаписи Lilya с этого устройства? Восстановить их не получится.')) return
    await deleteAllAudioRecordings()
    setRecordings([])
    onChanged()
  }

  return (
    <div className="recordings-library">
      <div className="recordings-library__intro">
        <p>Записи хранятся только на этом устройстве и не отправляются в личный кабинет.</p>
        <button className="button button--game" type="button" onClick={onNewRecording}>Новая запись</button>
      </div>
      {loading && <p className="recordings-empty">Открываем записи…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && recordings.length === 0 && <div className="recordings-empty"><strong>Записей пока нет</strong><p>Во время ответа нажмите «Записать этот разговор».</p></div>}
      <div className="recordings-list">
        {recordings.map((recording) => <RecordingItem key={recording.id} recording={recording} onDelete={() => remove(recording.id)} />)}
      </div>
      {recordings.length > 0 && <button className="danger-link" type="button" onClick={removeAll}>Удалить все записи</button>}
    </div>
  )
}
