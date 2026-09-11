import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'

const SCRYPT_KEY_LENGTH = 64

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, expectedHash) {
  try {
    const actual = scryptSync(password, salt, SCRYPT_KEY_LENGTH)
    const expected = Buffer.from(expectedHash, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf('=')
        if (separator < 0) return [item, '']
        return [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))]
      }),
  )
}

export function sessionCookie(token, maxAgeSeconds, secure = true) {
  const secureFlag = secure ? '; Secure' : ''
  return `el_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`
}

export function expiredSessionCookie(secure = true) {
  const secureFlag = secure ? '; Secure' : ''
  return `el_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
}
