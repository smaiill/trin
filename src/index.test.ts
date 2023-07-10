import { test, assert, expect } from 'vitest'
import {
  createTranslation,
  getConditionStatus,
  getConditionValues,
  getTranslationValueWithPath,
  overrideOptions,
  replaceValueArgs,
  replaceValueConditions,
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
  const i = getTranslationValueWithPath(
    { a: { b: { c: 'translation', d: {} }, e: {} } },
    'a.b.c',
  )

  expect(i).toBe('translation')

  const i2 = getTranslationValueWithPath(
    { a: { b: { c: 'translation', d: {} }, e: {} } },
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

test('.getConditionStatus', () => {
  const status = getConditionStatus('true', {})

  expect(status).toBe(true)

  const status2 = getConditionStatus('false', {})

  expect(status2).toBe(false)

  const status3 = getConditionStatus('ab', { ab: true })

  expect(status3).toBe(true)

  const status4 = getConditionStatus('ab', { ab: false })

  expect(status4).toBe(false)

  // @ts-expect-error
  const status5 = getConditionStatus('ab', {})

  expect(status5).toBe(false)
})

test('.getConditionValues', () => {
  const values = getConditionValues({
    successValue: 'a',
    failureValue: 'b',
    args: {},
  })

  expect(values).toEqual({ success: 'a', failure: 'b' })

  const values2 = getConditionValues({
    successValue: 'a',
    failureValue: 'b',
    args: { a: 'Hello world', b: 'Hello world 2' },
  })

  expect(values2).toEqual({ success: 'Hello world', failure: 'Hello world 2' })
})

test('.replaceValueConditions', () => {
  const str = 'Hello {{ ?.true ? World : Smail }}'
  const newStr = replaceValueConditions(str, {})

  expect(newStr).toBe('Hello World')

  const str2 = 'Hello {{ ?.a ? World : Smail }}'
  const newStr2 = replaceValueConditions(str2, {})
  expect(newStr2).toBe('Hello Smail')

  const str3 = 'Hello {{ ?.a ? World : Smail }}'
  const newStr3 = replaceValueConditions(str3, { a: true })
  expect(newStr3).toBe('Hello World')
})
