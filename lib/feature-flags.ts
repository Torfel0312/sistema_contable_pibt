export const FEATURES = {
  requests: false
} as const

export type FeatureKey = keyof typeof FEATURES
