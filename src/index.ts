const TranslationMatchingRegex = new RegExp('{{\\s*(\\w+)\\s*}}', 'g')

type Separator = '.'
type AllPossibleTypes = string | number | boolean

type IsObjectEmptyAndHasNeighborKeys<
  O extends object,
  C extends boolean = false,
> = O extends object
  ? {
      [K in keyof O]: O[K] extends AllPossibleTypes
        ? IsObjectEmptyAndHasNeighborKeys<Omit<O, K>, true>
        : O[K] extends object
        ? C extends true
          ? true
          : never
        : never
    }[keyof O]
  : O

type GetCorrectKeysFormat<O extends object> = O extends object
  ? {
      [K in keyof O]: O[K] extends object
        ? IsObjectEmptyAndHasNeighborKeys<O[K]> extends never
          ? GetCorrectKeysFormat<O[K]>
          : {}
        : never
    }
  : never

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

type InferTranslationKeys<B, P extends string = ''> = B extends object
  ? {
      [K in keyof B]: keyof B[K] extends never
        ? `${P}${Separator}${string & K}`
        : B[K] extends object
        ? InferTranslationKeys<
            B[K],
            `${P}${P extends '' ? '' : Separator}${string & K}`
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

type RecursiveRecord = {
  [K in string]: RecursiveRecord | object
}

const defaultOptions = {
  language: 'en',
} as Options

type Options = {
  language: string
}

export const overrideOptions = (options: Options): Options => {
  const validatedOptions: Options = {
    language:
      options?.language && typeof options.language === 'string'
        ? options.language
        : defaultOptions.language,
  }

  return { ...defaultOptions, ...validatedOptions }
}

export const getTranslationValue = <
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

  return getTranslationValue(
    translation[currentKey as keyof TranslationObject] as object,
    keyArray.join('.'),
  )
}

export const replaceValueArgs = <A extends Record<string, any>>(
  value: string,
  args: A,
): string => {
  const replaced = value.replace(TranslationMatchingRegex, (_, argumentName) =>
    args[argumentName] ? String(args[argumentName]) : '',
  )

  return replaced
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

    const keyValue = getTranslationValue(langaugeTranslations, key)

    if (!keyValue || typeof keyValue !== 'string') {
      return key
    }

    const formatedKey = args[0] ? replaceValueArgs(keyValue, args[0]) : keyValue

    return formatedKey
  }

  return { t }
}
