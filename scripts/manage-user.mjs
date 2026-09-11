import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { openDatabase, bootstrapProduct, upsertAccessUser } from '../server/database.mjs'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string', default: 'Пользователь' },
    'valid-until': { type: 'string' },
    database: { type: 'string', default: process.env.DATABASE_PATH || './data/cabinet.sqlite' },
  },
})

if (!values.email || !values.password || values.password.length < 12) {
  console.error('Укажите --email и пароль длиной не менее 12 символов через --password.')
  process.exit(1)
}

const db = openDatabase(resolve(values.database))
bootstrapProduct(db)
const created = upsertAccessUser(db, {
  email: values.email,
  password: values.password,
  name: values.name,
  validUntil: values['valid-until'],
})
console.log(created ? `Доступ открыт для ${values.email}` : 'Пользователь не создан')
