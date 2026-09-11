import { useEffect, useState, type FormEvent } from 'react'
import { getDeck, getMe, login, logout, type AuthPayload } from './api'
import { BrandMark } from './components/BrandMark'
import { AppIcon } from './components/AppIcon'
import { Modal } from './components/Modal'
import { GameApp } from './GameApp'
import { validateDeck } from './data/validateDeck'
import type { Deck } from './types'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Route = 'cabinet' | 'game'

function currentRoute(): Route {
  return window.location.pathname.startsWith('/game') ? 'game' : 'cabinet'
}

function LoginScreen({ onLogin }: { onLogin: (payload: AuthPayload) => void }) {
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
        <BrandMark />
        <div className="auth-copy">
          <p className="eyebrow"><span className="dot dot--purple" /> Личный кабинет</p>
          <h1>Ваши материалы<br />в одном месте</h1>
          <p>Войдите, чтобы открыть доступные продукты и продолжить с того места, где остановились.</p>
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
            {busy ? 'Входим…' : 'Войти'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-note">Доступ выдаётся отдельно. Ответы внутри игры не отправляются на сервер.</p>
      </section>
      <aside className="auth-visual" aria-label="Карточная игра «Кажется, я тебя знаю»">
        <div className="auth-visual__label">ПЕРВЫЙ ПРОДУКТ / 01</div>
        <div className="auth-deck" aria-hidden="true">
          <div className="auth-deck__card auth-deck__card--green">04</div>
          <div className="auth-deck__card auth-deck__card--wine">02</div>
          <div className="auth-deck__card auth-deck__card--paper">
            <span>Кажется,<br />я тебя знаю</span>
            <strong>?</strong>
          </div>
        </div>
        <p>Электронная колода для разговора с близким человеком.</p>
      </aside>
    </main>
  )
}

function Cabinet({
  auth,
  onOpenGame,
  onLogout,
  onInstall,
}: {
  auth: AuthPayload
  onOpenGame: () => void
  onLogout: () => void
  onInstall: () => void
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
          <button className="button button--ghost" type="button" onClick={onInstall}>Установить приложение</button>
          <span className="cabinet-user">{auth.user.displayName}</span>
          <button className="round-button" type="button" onClick={onLogout} aria-label="Выйти из кабинета">↪</button>
        </nav>
        <p className="cabinet-mobile-status"><span className="status-pulse" /> Кабинет</p>
      </header>
      <main className="cabinet-main" id="cabinet-home">
        <div className="cabinet-intro">
          <p className="eyebrow"><span className="dot dot--purple" /> Личный кабинет</p>
          <h1>Добро пожаловать,<br />{auth.user.displayName}</h1>
          <p>Здесь будут собраны ваши игры, воркбуки и другие материалы.</p>
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
              <h3>Кажется,<br />я тебя знаю</h3>
              <p>Карточная игра для разговора двух взрослых людей. 35 карточек, четыре главы и никакой оценки ответов.</p>
              <button className="button button--lime" type="button" onClick={onOpenGame} disabled={!gameAccess}>
                Открыть игру <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="product-card__art" aria-hidden="true">
              <div className="mini-card mini-card--ochre">01</div>
              <div className="mini-card mini-card--blue">03</div>
              <div className="mini-card mini-card--paper"><span>?</span><small>35 карточек</small></div>
            </div>
          </article>
        </section>
      </main>
      <nav className="mobile-tabbar" aria-label="Основное меню">
        <button className={`mobile-tabbar__item ${activeTab === 'home' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('home'); scrollTo() }} aria-label="Главная" aria-current={activeTab === 'home' ? 'page' : undefined}>
          <AppIcon name="home" /><span>Главная</span>
        </button>
        <button className={`mobile-tabbar__item ${activeTab === 'products' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('products'); scrollTo('cabinet-products') }} aria-label="Продукты" aria-current={activeTab === 'products' ? 'page' : undefined}>
          <AppIcon name="products" /><span>Продукты</span>
        </button>
        <button className="mobile-tabbar__item" type="button" onClick={onInstall} aria-label="Установить приложение">
          <AppIcon name="install" /><span>Установить</span>
        </button>
        <button className={`mobile-tabbar__item ${activeTab === 'profile' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('profile'); setProfileOpen(true) }} aria-label="Профиль" aria-current={activeTab === 'profile' ? 'page' : undefined}>
          <AppIcon name="profile" /><span>Профиль</span>
        </button>
      </nav>
      {profileOpen && (
        <Modal title="Ваш профиль" eyebrow="Личный кабинет" onClose={() => { setProfileOpen(false); setActiveTab('home') }}>
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

  useEffect(() => {
    getMe().then(setAuth).catch(() => {
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
    window.addEventListener('popstate', onPopState)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  function navigate(next: Route) {
    const path = next === 'game' ? '/game' : '/'
    window.history.pushState({}, '', path)
    setRoute(next)
    window.scrollTo({ top: 0, left: 0 })
  }

  async function requestInstall() {
    if (!installPrompt) {
      setInstallHelp(true)
      return
    }
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  async function handleLogout() {
    await logout().catch(() => undefined)
    window.history.replaceState({}, '', '/')
    setRoute('cabinet')
    setAuth(null)
  }

  if (auth === undefined) return <main className="center-state"><div className="loading-mark" /><p>Открываем личный кабинет…</p></main>
  if (!auth) return <><LoginScreen onLogin={setAuth} />{bootError && <div className="network-banner" role="status">{bootError}</div>}</>

  return (
    <>
      {route === 'game'
        ? <GameRoute onBack={() => navigate('cabinet')} />
        : <Cabinet auth={auth} onOpenGame={() => navigate('game')} onLogout={handleLogout} onInstall={requestInstall} />}
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
