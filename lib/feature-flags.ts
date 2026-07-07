export const FEATURES = {
  budget: false,
  requests: false
} as const

export type FeatureKey = keyof typeof FEATURES
