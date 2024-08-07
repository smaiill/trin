const TranslationArgumentMatchingRegex = new RegExp(
  '{{\\s*(\\w+)((?:\\s*\\|\\s*\\w+)*)\\s*}}',
  'g',
)

const TranslationConditionalMatchingRegex = new RegExp(
  '{{\\s+\\?\\.(\\w+)\\s+\\?\\s+([^:}]+)\\s*:\\s*([^}]+)}}',
  'g',
)

const regexSubKeys = /\|\w(?:\.\w)+\|/gm

const FIRST_REGEX = /{{\s+!.(\w+)\s+([^}]+)}}/gm
const SECOND_REGEX =
  /k\s*:\s*(\w+)\s+v\s*:\s*(['"])(.*?)\2(?:\s*k:(\w+)\s+v:\2(.*?)\2)*/gm

const PluralizMatchingRegex = /\[plural.(\w+)]/gm
type Separator = '.'
type PossibleTypes = string | number | boolean | Date

type Rec = Record<string, object | string>

export enum Modifiers {
  Uppercase = 'uppercase',
  Lowercase = 'lowercase',
  Capitalize = 'capitalize',
}

export type IsObjectEmptyAndHasNeighborKeys<
  O extends object,
  C extends boolean = false,
> = O extends object
  ? {
      [K in keyof O]: O[K] extends PossibleTypes
        ? IsObjectEmptyAndHasNeighborKeys<Omit<O, K>, true>
        : O[K] extends object
        ? C extends true
          ? true
          : never
        : never
    }[keyof O]
  : O

export type AllKeysExtendFromPossibleKeys<O extends object> = {
  [K in keyof O as O[K] extends PossibleTypes ? K : never]: O[K]
} extends infer N
  ? ObjectLength<object & N> extends ObjectLength<O>
    ? true
    : never
  : never

export type GetCorrectKeysFormat<O extends object> = O extends object
  ? {
      [K in keyof O]: O[K] extends object
        ? IsObjectEmptyAndHasNeighborKeys<O[K]> extends never
          ? AllKeysExtendFromPossibleKeys<O[K]> extends never
            ? GetCorrectKeysFormat<O[K]>
            : {}
          : {}
        : O[K]
    }
  : never

type Pack<T> = T extends any ? (arg: T) => void : never

type Unpack<T> = [T] extends [(arg: infer I) => void] ? I : never

type Into<T> = Unpack<Unpack<Pack<Pack<T>>>>

type UnionToTuple<T> = Into<T> extends infer U
  ? Exclude<T, U> extends never
    ? [T]
    : [...UnionToTuple<Exclude<T, U>>, U]
  : never

type ObjectKeysToTuple<O extends object> = { [K in keyof O]: K } extends {
  [_ in keyof O]: infer T
}
  ? T
  : never

export type ObjectLength<O extends object> = keyof O extends never
  ? 0
  : UnionToTuple<ObjectKeysToTuple<O>>['length']

export type Translation<O extends object> =
  GetCorrectKeysFormat<O> extends infer U
    ? {
        [K in keyof U]: U[K] extends object
          ? keyof U[K] extends never
            ? string
            : Translation<U[K]>
          : U[K]
      }
    : never

type InferTranslationKeys<
  B,
  P extends string = '',
  IsFirst extends boolean = true,
> = B extends object
  ? {
      [K in keyof B]: keyof B[K] extends never
        ? IsFirst extends true
          ? `${string & K}`
          : `${P}${Separator}${string & K}`
        : B[K] extends object
        ? InferTranslationKeys<
            B[K],
            `${P}${P extends '' ? '' : Separator}${string & K}`,
            false
          >
        : P
    }[keyof B]
  : P

type ExtractKeyArgs<
  O extends Record<any, any>,
  K extends string,
> = K extends `${infer FirstKey}${Separator}${infer RestKeys}`
  ? FirstKey extends keyof O
    ? ExtractKeyArgs<
        O[FirstKey] extends Record<string, unknown> ? O[FirstKey] : never,
        RestKeys
      >
    : never
  : K extends keyof O
  ? O[K]
  : never

type RemoveEmptyObjects<O extends object> = O extends object
  ? {
      [K in keyof O as O[K] extends object
        ? keyof O[K] extends never
          ? never
          : K
        : K]: O[K]
    }
  : O

type Condition<O extends object> = 'true' | 'false' | keyof O

type RecordPossibleTypes = Record<string, PossibleTypes>

type GetConditionValue = {
  successValue: string
  failureValue: string
  args: RecordPossibleTypes
}

type RecursiveRecord = {
  [K in string]: RecursiveRecord | object
}

type Options = {
  locale: string
}

const defaultOptions = {
  locale: '',
} as Options

const currentTranslation: { locale: string; translations: string[] } = {
  locale: '',
  translations: [],
}

export const overrideOptions = (options: Options): Options => {
  const validatedOptions: Options = {
    locale:
      options?.locale && typeof options.locale === 'string'
        ? options.locale
        : defaultOptions.locale,
  }

  return { ...defaultOptions, ...validatedOptions }
}

export const getTranslationValueWithPath = <
  O extends object,
  TranslationObject extends object = Translation<O>,
>(
  translation: TranslationObject,
  key: string,
): string => {
  const keyArray = key.split('.')
  const currentKey = keyArray.shift()

  if (keyArray.length === 0) {
    return translation[currentKey as keyof TranslationObject] as string
  }

  return getTranslationValueWithPath(
    translation[currentKey as keyof TranslationObject] as object,
    keyArray.join('.'),
  )
}

const recursiveGetTranslationValueWithPath = (
  langaugeTranslations: Rec,
  key: string,
) => {
  const keyValue = getTranslationValueWithPath(langaugeTranslations, key)

  if (!keyValue) {
    return key
  }

  return replaceSubKeys(keyValue, langaugeTranslations)
}

const removeStartAndEnd = (value: string) => {
  return value
    .trim()
    .slice(1, value.length)
    .slice(0, value.length - 2)
}

export const replaceSubKeys = (
  value: string,
  langaugeTranslations: Rec,
): string => {
  if (!regexSubKeys.test(value)) {
    return value
  }

  return value.replace(regexSubKeys, (a) => {
    const key = removeStartAndEnd(a)
    const keyValue = recursiveGetTranslationValueWithPath(
      langaugeTranslations,
      key,
    )

    return keyValue
  })
}

export const replaceValueArgs = (value: string, args: RecordPossibleTypes) => {
  const replaced = value.replace(
    TranslationArgumentMatchingRegex,
    (_, argumentName, modifiersString) => {
      const modifiers = modifiersString.split('|') as string[]

      let str = args[argumentName].toString()

      str = modifiers.includes(Modifiers.Uppercase) ? str.toUpperCase() : str
      str = modifiers.includes(Modifiers.Lowercase) ? str.toLowerCase() : str
      str = modifiers.includes(Modifiers.Capitalize) ? capitalize(str) : str

      return str
    },
  )

  return replaced
}

export const getConditionStatus = <O extends object>(
  condition: Condition<O>,
  args: O,
) => {
  return condition === 'true'
    ? true
    : condition === 'false'
    ? false
    : !!args[condition] ?? !!condition
}

export const getConditionValues = ({
  successValue,
  failureValue,
  args,
}: GetConditionValue) => {
  successValue = successValue.trim()
  failureValue = failureValue.trim()
  const _success = args[successValue] ?? successValue
  const _failure = args[failureValue] ?? failureValue

  return { success: _success.toString(), failure: _failure.toString() }
}

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1)

export const replaceValueConditions = (
  str: string,
  args: RecordPossibleTypes,
) => {
  return str.replace(
    TranslationConditionalMatchingRegex,
    (
      _: string,
      condition: string,
      successValue: string,
      failureValue: string,
    ) => {
      const status = getConditionStatus(condition, args)
      const { success, failure } = getConditionValues({
        successValue,
        failureValue,
        args,
      })

      return status ? success : failure
    },
  )
}

const extractCorrectInformations = (
  str: string,
): { target?: string; key?: string } => {
  const all = [...str.matchAll(FIRST_REGEX)].at(0) as string[]

  return { target: all.at(0), key: all.at(1) }
}

const extractCorrectReplacer = (key: string, str: string) => {
  const value = [...str.matchAll(SECOND_REGEX)].find(
    (_array) => _array.at(1) === key,
  )

  return value?.at(3) ?? ''
}

const replaceSwitchCases = (str: string, args: RecordPossibleTypes) => {
  const info = extractCorrectInformations(str)

  if (!info.key || !info.target) {
    throw new Error('Invalid Informations')
  }

  const validArg = args[info.key] as string

  const replacer = extractCorrectReplacer(validArg, info.target)

  const finalString = str.replace(FIRST_REGEX, replacer)

  return finalString
}

export const pluralizeAll = (str: string, args: RecordPossibleTypes) => {
  return str.replace(PluralizMatchingRegex, (_, arg) => {
    const validArg = args[arg]

    if (!validArg) {
      return ''
    }

    if (typeof validArg === 'number') {
      return validArg > 1 ? 's' : ''
    }

    if (typeof validArg === 'boolean') {
      return validArg === true ? 's' : ''
    }

    if (typeof validArg === 'string') {
      return validArg.length > 1 ? 's' : ''
    }

    return ''
  })
}

export const createTranslation = <M extends RecursiveRecord>(
  translations: object,
  options: Options,
) => {
  const overridedOptions = overrideOptions(options)

  if (!Object.keys(translations).includes(overridedOptions.locale)) {
    throw new Error('Invalid translation locale')
  }

  currentTranslation.locale = overridedOptions.locale
  for (const locale of Object.keys(translations)) {
    currentTranslation.translations.push(locale)
  }

  const t = <K extends InferTranslationKeys<GetCorrectKeysFormat<M>>>(
    key: K,
    ...args: keyof RemoveEmptyObjects<
      object & ExtractKeyArgs<M, K>
    > extends never
      ? []
      : [RemoveEmptyObjects<object & ExtractKeyArgs<M, K>>]
  ) => {
    const langaugeTranslations =
      translations[currentTranslation.locale as keyof typeof translations]

    const keyValue = getTranslationValueWithPath(langaugeTranslations, key)

    if (!keyValue || typeof keyValue !== 'string') {
      console.warn(
        `Invalid translation for key: [${key}], in locale: [${currentTranslation.locale}]`,
      )
      return key
    }

    const realArgs = args[0] as unknown as RecordPossibleTypes | undefined

    const formatedWithSubKeys = replaceSubKeys(keyValue, langaugeTranslations)

    const formatedWithArgs = realArgs
      ? replaceValueArgs(formatedWithSubKeys, realArgs)
      : formatedWithSubKeys

    const formatedWithConditions = realArgs
      ? replaceValueConditions(formatedWithArgs, realArgs)
      : formatedWithSubKeys

    const formatedWithPluralization = realArgs
      ? pluralizeAll(formatedWithConditions, realArgs)
      : formatedWithSubKeys

    const formatedWithSwitchCase = realArgs
      ? replaceSwitchCases(formatedWithPluralization, realArgs)
      : formatedWithSubKeys

    return formatedWithSwitchCase
  }

  return { t }
}

export const setLocale = (locale: string) => {
  if (!currentTranslation.translations.includes(locale)) {
    throw new Error('Invalid translation locale')
  }

  currentTranslation.locale = locale
}
