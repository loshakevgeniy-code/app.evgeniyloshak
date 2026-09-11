import express from 'express'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import {
  bootstrapAdmin,
  bootstrapProduct,
  createSession,
  deleteSession,
  findSessionUser,
  findUserByEmail,
  hasProductAccess,
  listProductsForUser,
  openDatabase,
} from './database.mjs'
import {
  createSessionToken,
  expiredSessionCookie,
  parseCookies,
  sessionCookie,
  verifyPassword,
} from './security.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const production = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 3000)
const sessionDays = Math.max(1, Number(process.env.SESSION_DAYS || 180))
const sessionSeconds = sessionDays * 24 * 60 * 60
const appOrigin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`
const databasePath = process.env.DATABASE_PATH || resolve(here, '../data/cabinet.sqlite')
const deckPath = process.env.DECK_PATH || resolve(here, '../src/data/deck.ru.json')
const distPath = resolve(here, '../dist')
const deck = JSON.parse(readFileSync(deckPath, 'utf8'))
const db = openDatabase(databasePath)
bootstrapProduct(db)
bootstrapAdmin(db, {
  email: process.env.BOOTSTRAP_ADMIN_EMAIL,
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  name: process.env.BOOTSTRAP_ADMIN_NAME,
})

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; manifest-src 'self'")
  next()
})

const loginAttempts = new Map()
function loginRateLimit(request, response, next) {
  const key = request.ip || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const recent = (loginAttempts.get(key) || []).filter((time) => now - time < windowMs)
  if (recent.length >= 8) {
    response.status(429).json({ error: 'Слишком много попыток. Попробуйте через несколько минут.' })
    return
  }
  recent.push(now)
  loginAttempts.set(key, recent)
  next()
}

function sameOrigin(request, response, next) {
  const origin = request.get('origin')
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '')
  if (origin && origin !== appOrigin && !(localOrigin && !production)) {
    response.status(403).json({ error: 'Запрос отклонён.' })
    return
  }
  next()
}

function currentUser(request) {
  const token = parseCookies(request.get('cookie')).el_session
  return { token, user: findSessionUser(db, token) }
}

function requireUser(request, response, next) {
  const auth = currentUser(request)
  if (!auth.user) {
    response.status(401).json({ error: 'Нужно войти в личный кабинет.' })
    return
  }
  request.auth = auth
  next()
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'app.evgeniyloshak' })
})

app.post('/api/auth/login', sameOrigin, loginRateLimit, (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email : ''
  const password = typeof request.body?.password === 'string' ? request.body.password : ''
  const user = findUserByEmail(db, email)
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    response.status(401).json({ error: 'Не удалось войти. Проверьте почту и пароль.' })
    return
  }

  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + sessionSeconds * 1000).toISOString()
  createSession(db, user.id, token, expiresAt)
  response.setHeader('Set-Cookie', sessionCookie(token, sessionSeconds, production))
  response.json({ user: publicUser(user), products: listProductsForUser(db, user.id) })
})

app.post('/api/auth/logout', sameOrigin, (request, response) => {
  const { token } = currentUser(request)
  deleteSession(db, token)
  response.setHeader('Set-Cookie', expiredSessionCookie(production))
  response.status(204).end()
})

app.get('/api/auth/me', requireUser, (request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  response.json({
    user: publicUser(request.auth.user),
    products: listProductsForUser(db, request.auth.user.id),
  })
})

app.get('/api/game/deck', requireUser, (request, response) => {
  if (!hasProductAccess(db, request.auth.user.id, 'know-you')) {
    response.status(403).json({ error: 'Доступ к игре пока не открыт.' })
    return
  }
  response.setHeader('Cache-Control', 'private, no-store')
  response.json(deck)
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Такого запроса нет.' })
})

if (existsSync(distPath)) {
  app.use(express.static(distPath, {
    index: false,
    setHeaders(response, path) {
      if (path.includes('/assets/')) response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      else response.setHeader('Cache-Control', 'public, max-age=3600')
    },
  }))

  app.use((request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method) || !request.accepts('html')) return next()
    response.setHeader('Cache-Control', 'no-cache')
    response.sendFile(join(distPath, 'index.html'))
  })
}

app.use((_request, response) => {
  response.status(404).send('Not found')
})

app.listen(port, '0.0.0.0', () => {
  console.log(`app.evgeniyloshak listening on ${port}`)
})
