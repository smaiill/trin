import { test, assert, expect } from 'vitest'
import {
  createTranslation,
  getTranslationValue,
  overrideOptions,
  replaceValueArgs,
} from '.'

test('.overrideOptions', () => {
  // @ts-expect-error
  const o = overrideOptions()

  expect(o).toEqual({ language: 'en' })

  const o2 = overrideOptions({
    language: 'fr',
  })

  expect(o2).toEqual({ language: 'fr' })
})

test('.getTranslationValue', () => {
  const i = getTranslationValue(
    { a: { b: { c: '.translation', d: {} }, e: {} } },
    'a.b.c',
  )

  expect(i).toBe('.translation')

  const i2 = getTranslationValue(
    { a: { b: { c: '.translation', d: {} }, e: {} } },
    'a.b.c.d',
  )
  expect(i2).toBeUndefined()
})

test('.replaceValueArgs', () => {
  const formatedString = replaceValueArgs(
    'Hello im {{ name }} and im {{ age }}',
    {
      name: 'Smail',
      age: 19,
    },
  )

  expect(formatedString).toBe('Hello im Smail and im 19')
})

test('.createTranslation', () => {
  const { t } = createTranslation(
    {
      en: {
        db: {
          error: 'Error in DB',
        },
      },
    },
    {
      language: 'en',
    },
  )

  // @ts-expect-error
  expect(t('db.error')).toBe('Error in DB')
  expect(t).toBeTypeOf('function')
})
