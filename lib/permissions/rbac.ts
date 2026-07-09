export const PERMISSIONS = {
  MANAGE_USERS: "MANAGE_USERS",
  CREATE_MOVEMENT: "CREATE_MOVEMENT",
  VIEW_MOVEMENT: "VIEW_MOVEMENT",
  MANAGE_MINISTRIES: "MANAGE_MINISTRIES",
  REVIEW_INTENTIONS: "REVIEW_INTENTIONS",
  SUBMIT_INTENTIONS: "SUBMIT_INTENTIONS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
  VIEW_WORKFLOW: "VIEW_WORKFLOW"
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export function can(permissions: Set<string> | undefined, permission: Permission): boolean {
  return permissions?.has(permission) ?? false
}
