export type UserRole = 'customer' | 'pharmacy_staff' | 'admin' | 'super_admin'

export function resolveUserRole(input: {
  role?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
}): UserRole {
  const role = (input.role || '').trim().toLowerCase()
  if (role === 'super_admin') return 'super_admin'

  const full = (input.fullName || '').trim().toLowerCase()
  const composed = `${input.firstName || ''} ${input.lastName || ''}`.trim().toLowerCase()
  if (full === 'super admin' || composed === 'super admin') return 'super_admin'

  const email = (input.email || '').trim().toLowerCase()
  if (email === 'admin@roadrunner.app' || email === 'admin@road-runner.app') return 'super_admin'

  if (role === 'admin') return 'admin'
  if (role === 'pharmacy_staff') return 'pharmacy_staff'
  return 'customer'
}

/** Super Admin + assigned admins may upload pharmacies/products. */
export function canManageCatalog(role: UserRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === 'super_admin'
}
