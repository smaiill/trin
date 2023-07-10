const TranslationArgumentMatchingRegex = new RegExp('{{\\s*(\\w+)\\s*}}', 'g')
const TranslationConditionalMatchingRegex = new RegExp(
  '{{\\s+\\?\\.(\\w+)\\s+\\?\\s+([^:}]+)\\s*:\\s*([^}]+)}}',
  'g',
)

type Separator = '.'
type PossibleTypes = string | number | boolean

type IsObjectEmptyAndHasNeighborKeys<
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

type AllKeysExtendFromPossibleKeys<O extends object> = {
  [K in keyof O as O[K] extends PossibleTypes ? K : never]: O[K]
} extends infer N
  ? ObjectLength<object & N> extends ObjectLength<O>
    ? true
    : never
  : never

type GetCorrectKeysFormat<O extends object> = O extends object
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
  language: string
}

const defaultOptions = {
  language: 'en',
} as Options

export const overrideOptions = (options: Options): Options => {
  const validatedOptions: Options = {
    language:
      options?.language && typeof options.language === 'string'
        ? options.language
        : defaultOptions.language,
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

export const replaceValueArgs = (
  value: string,
  args: RecordPossibleTypes,
): string => {
  const replaced = value.replace(
    TranslationArgumentMatchingRegex,
    (_, argumentName) => {
      return String(args[argumentName])
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

  return { success: String(_success), failure: String(_failure) }
}

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

export const createTranslation = <M extends RecursiveRecord>(
  translations: object,
  options: Options,
) => {
  const overridedOptions = overrideOptions(options)
  const translation = overridedOptions.language

  const t = <K extends InferTranslationKeys<GetCorrectKeysFormat<M>>>(
    key: K,
    ...args: keyof RemoveEmptyObjects<
      object & ExtractKeyArgs<M, K>
    > extends never
      ? []
      : [ExtractKeyArgs<M, K>]
  ) => {
    const langaugeTranslations =
      translations[translation as keyof typeof translations]

    const keyValue = getTranslationValueWithPath(langaugeTranslations, key)

    if (!keyValue || typeof keyValue !== 'string') {
      return key
    }

    const formatedWithArgs = args[0]
      ? replaceValueArgs(keyValue, args[0] as unknown as RecordPossibleTypes)
      : keyValue
    const formatedWithConditions = args[0]
      ? replaceValueConditions(
          formatedWithArgs,
          args[0] as unknown as RecordPossibleTypes,
        )
      : keyValue

    return formatedWithConditions
  }

  return { t }
}
