import { useEffect, useState, type FormEvent } from 'react'
import { getDeck, getMe, login, logout, type AuthPayload } from './api'
import { BrandMark, LilyMark } from './components/BrandMark'
import { AppIcon } from './components/AppIcon'
import { Modal } from './components/Modal'
import { GameApp } from './GameApp'
import { LandingPage } from './LandingPage'
import { validateDeck } from './data/validateDeck'
import type { Deck } from './types'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Route = 'landing' | 'login' | 'cabinet' | 'game'

function currentRoute(): Route {
  if (window.location.pathname.startsWith('/game')) return 'game'
  if (window.location.pathname.startsWith('/login')) return 'login'
  return 'landing'
}

export function isStandaloneApp() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  const displayModeStandalone = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches
  return iosStandalone || displayModeStandalone
}

function LoginScreen({ onLogin, onBack }: { onLogin: (payload: AuthPayload) => void; onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLogin(await login(email, password))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось войти.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-topbar">
          <BrandMark />
          <button className="auth-back" type="button" onClick={onBack}>← О Lilya</button>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Ближе к главному</p>
          <h1>Разговоры,<br />которые остаются</h1>
          <p>Войдите в Lilya, чтобы открывать свои колоды и возвращаться к важным разговорам.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Электронная почта</span>
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            <span>Пароль</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--wide" disabled={busy} type="submit">
            {busy ? 'Входим…' : 'Продолжить'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-note">Доступ выдаётся отдельно. Ваши ответы не отправляются на сервер.</p>
      </section>
      <aside className="auth-visual" aria-label="Lilya — карточная игра для близких разговоров">
        <div className="auth-visual__label">НАСТОЯЩИЕ ЛЮДИ · НАСТОЯЩИЕ ВОПРОСЫ</div>
        <div className="auth-visual__brand" aria-hidden="true">
          <LilyMark />
          <strong>LILYA</strong>
          <span>ближе к главному</span>
        </div>
        <p>Хорошие вопросы<br />сближают.</p>
      </aside>
    </main>
  )
}

function Cabinet({
  auth,
  onOpenGame,
  onLogout,
  onInstall,
  isInstalled,
}: {
  auth: AuthPayload
  onOpenGame: () => void
  onLogout: () => void
  onInstall: () => void
  isInstalled: boolean
}) {
  const gameAccess = auth.products.some((product) => product.slug === 'know-you' && product.status === 'active')
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'profile'>('home')

  function scrollTo(id?: string) {
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="cabinet-page">
      <header className="cabinet-header">
        <BrandMark compact />
        <nav className="cabinet-desktop-nav" aria-label="Навигация кабинета">
          {!isInstalled && <button className="button button--ghost" type="button" onClick={onInstall}>Установить приложение</button>}
          <span className="cabinet-user">{auth.user.displayName}</span>
          <button className="round-button" type="button" onClick={onLogout} aria-label="Выйти из кабинета">↪</button>
        </nav>
        <p className="cabinet-mobile-status"><span className="status-pulse" /> Кабинет</p>
      </header>
      <main className="cabinet-main" id="cabinet-home">
        <div className="cabinet-intro">
          <p className="eyebrow">Lilya · личное пространство</p>
          <h1>Добро пожаловать,<br />{auth.user.displayName}</h1>
          <p>Здесь собраны ваши колоды и разговоры, к которым хочется возвращаться.</p>
        </div>
        <section className="products-section" id="cabinet-products" aria-labelledby="products-title">
          <div className="section-title-row">
            <p className="eyebrow">01 / Мои продукты</p>
            <span>{auth.products.length} доступен</span>
          </div>
          <h2 id="products-title">Продолжить работу</h2>
          <article className="product-card">
            <div className="product-card__copy">
              <p className="product-card__status"><span className="dot dot--lime" /> {gameAccess ? 'Доступ открыт' : 'Доступ не открыт'}</p>
              <h3>Lilya</h3>
              <p>70 тёплых карточек для глубокого разговора с теми, кто вам дорог.</p>
              <button className="button button--lime" type="button" onClick={onOpenGame} disabled={!gameAccess}>
                Открыть игру <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="product-card__art" aria-hidden="true">
              <div className="product-art-card">
                <LilyMark />
                <strong>LILYA</strong>
                <span>хорошие вопросы сближают</span>
              </div>
            </div>
          </article>
        </section>
      </main>
      <nav className={`mobile-tabbar ${isInstalled ? 'mobile-tabbar--three' : ''}`} aria-label="Основное меню">
        <button className={`mobile-tabbar__item ${activeTab === 'home' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('home'); scrollTo() }} aria-label="Главная" aria-current={activeTab === 'home' ? 'page' : undefined}>
          <AppIcon name="home" /><span>Главная</span>
        </button>
        <button className={`mobile-tabbar__item ${activeTab === 'products' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('products'); scrollTo('cabinet-products') }} aria-label="Продукты" aria-current={activeTab === 'products' ? 'page' : undefined}>
          <AppIcon name="products" /><span>Продукты</span>
        </button>
        {!isInstalled && (
          <button className="mobile-tabbar__item" type="button" onClick={onInstall} aria-label="Установить приложение">
            <AppIcon name="install" /><span>Установить</span>
          </button>
        )}
        <button className={`mobile-tabbar__item ${activeTab === 'profile' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('profile'); setProfileOpen(true) }} aria-label="Профиль" aria-current={activeTab === 'profile' ? 'page' : undefined}>
          <AppIcon name="profile" /><span>Профиль</span>
        </button>
      </nav>
      {profileOpen && (
        <Modal title="Ваш профиль" eyebrow="Lilya" onClose={() => { setProfileOpen(false); setActiveTab('home') }}>
          <section className="profile-sheet">
            <div className="profile-avatar" aria-hidden="true">{auth.user.displayName.slice(0, 1).toLocaleUpperCase('ru')}</div>
            <div><strong>{auth.user.displayName}</strong><p>{auth.user.email}</p></div>
          </section>
          <button className="button button--danger button--wide" type="button" onClick={onLogout}>Выйти из кабинета</button>
        </Modal>
      )}
    </div>
  )
}

function GameRoute({ onBack }: { onBack: () => void }) {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getDeck()
      .then((result) => { if (active) setDeck(validateDeck(result)) })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Игра не загрузилась.') })
    return () => { active = false }
  }, [])

  if (error) {
    return <main className="center-state"><p className="eyebrow">Игра недоступна</p><h1>Не удалось открыть колоду</h1><p>{error}</p><button className="button button--primary" onClick={onBack}>Вернуться в кабинет</button></main>
  }
  if (!deck) return <main className="center-state"><div className="loading-mark" /><p>Открываем колоду…</p></main>
  return <GameApp deck={deck} onBackToCabinet={onBack} />
}

export default function App() {
  const [auth, setAuth] = useState<AuthPayload | null | undefined>(undefined)
  const [route, setRoute] = useState<Route>(currentRoute)
  const [bootError, setBootError] = useState('')
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installHelp, setInstallHelp] = useState(false)
  const [isInstalled, setIsInstalled] = useState(isStandaloneApp)

  useEffect(() => {
    getMe().then((payload) => {
      setAuth(payload)
      if (payload && currentRoute() !== 'game') setRoute('cabinet')
    }).catch(() => {
      setBootError('Не удалось связаться с кабинетом. Проверьте интернет и попробуйте ещё раз.')
      setAuth(null)
    })
  }, [])

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute())
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = () => setIsInstalled(isStandaloneApp())
    const onAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setInstallHelp(false)
    }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    displayMode.addEventListener('change', onDisplayModeChange)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      displayMode.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  function navigate(next: Route, replace = false) {
    const path = next === 'game' ? '/game' : next === 'login' ? '/login' : '/'
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
    setRoute(next)
    window.scrollTo({ top: 0, left: 0 })
  }

  function handleLogin(payload: AuthPayload) {
    setAuth(payload)
    if (route !== 'game') navigate('cabinet', true)
  }

  async function requestInstall() {
    if (!installPrompt) {
      setInstallHelp(true)
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  async function handleLogout() {
    await logout().catch(() => undefined)
    window.history.replaceState({}, '', '/')
    setRoute('landing')
    setAuth(null)
  }

  if (auth === undefined) return <main className="center-state"><div className="loading-mark" /><p>Открываем Lilya…</p></main>
  if (!auth) {
    const needsLogin = route === 'login' || route === 'game'
    return <>{needsLogin
      ? <LoginScreen onLogin={handleLogin} onBack={() => navigate('landing')} />
      : <LandingPage onLogin={() => navigate('login')} />}
      {bootError && <div className="network-banner" role="status">{bootError}</div>}
    </>
  }

  return (
    <>
      {route === 'game'
        ? <GameRoute onBack={() => navigate('cabinet')} />
        : <Cabinet auth={auth} onOpenGame={() => navigate('game')} onLogout={handleLogout} onInstall={requestInstall} isInstalled={isInstalled} />}
      {installHelp && (
        <Modal title="Установить приложение" eyebrow="Быстрый доступ" onClose={() => setInstallHelp(false)}>
          <div className="prose">
            <p><strong>На iPhone:</strong> откройте меню «Поделиться» в Safari и выберите «На экран Домой».</p>
            <p><strong>На Android:</strong> откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».</p>
            <p>После установки кабинет откроется отдельным приложением. Вход сохранится на этом устройстве.</p>
          </div>
        </Modal>
      )}
    </>
  )
}
