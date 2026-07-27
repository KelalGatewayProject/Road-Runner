import { useEffect, useState } from 'react'
import './AdminDashboard.css'
import TheBankPanel from './TheBankPanel'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { canManageCatalog, isSuperAdmin } from '../../lib/roles'
import {
  fetchAdminStats,
  fetchMembers,
  setMemberRole,
  type AdminStats,
  type MemberRow,
} from '../../services/adminApi'

type Props = {
  open: boolean
  onClose: () => void
  onAddPharmacy: () => void
  onAddProduct: () => void
}

const emptyStats: AdminStats = {
  usersCount: 0,
  pharmaciesCount: 0,
  productsCount: 0,
  adminsCount: 0,
}

export default function AdminDashboard({ open, onClose, onAddPharmacy, onAddProduct }: Props) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [stats, setStats] = useState<AdminStats>(emptyStats)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const allowed = canManageCatalog(user?.role)
  const superAdmin = isSuperAdmin(user?.role)

  async function reload() {
    if (!allowed) return
    setError(null)
    try {
      const [s, m] = await Promise.all([
        fetchAdminStats(),
        superAdmin ? fetchMembers() : Promise.resolve([]),
      ])
      setStats(s)
      setMembers(m)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
    }
  }

  useEffect(() => {
    if (open && allowed) void reload()
  }, [open, allowed, superAdmin])

  if (!open) return null

  if (!allowed) {
    return (
      <div className="rr-admin-overlay" role="presentation" onMouseDown={onClose}>
        <div className="rr-admin-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
          <header>
            <h2>{t('admin_denied_title')}</h2>
            <button type="button" onClick={onClose} aria-label={t('account_close')}>
              ×
            </button>
          </header>
          <p>{t('admin_denied_body')}</p>
        </div>
      </div>
    )
  }

  async function assignRole(memberId: string, role: 'customer' | 'admin') {
    if (!superAdmin) return
    setBusy(true)
    setError(null)
    try {
      await setMemberRole(memberId, role)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rr-admin-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="rr-admin-panel"
        role="dialog"
        aria-modal="true"
        aria-label={superAdmin ? t('menu_super_admin_dashboard') : t('menu_admin_dashboard')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <span className="rr-admin-kicker">{t('admin_kicker')}</span>
            <h2>{superAdmin ? t('menu_super_admin_dashboard') : t('menu_admin_dashboard')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('account_close')}>
            ×
          </button>
        </header>

        {error && <p className="rr-admin-error">{error}</p>}

        <section className="rr-admin-stats">
          <article>
            <b>{stats.usersCount}</b>
            <span>{t('admin_stat_users')}</span>
          </article>
          <article>
            <b>{stats.pharmaciesCount}</b>
            <span>{t('admin_stat_pharmacies')}</span>
          </article>
          <article>
            <b>{stats.productsCount}</b>
            <span>{t('admin_stat_products')}</span>
          </article>
          <article>
            <b>{stats.adminsCount}</b>
            <span>{t('admin_stat_admins')}</span>
          </article>
        </section>

        <section className="rr-admin-actions">
          <button type="button" onClick={onAddPharmacy}>
            {t('menu_add_pharmacy')}
          </button>
          <button type="button" onClick={onAddProduct}>
            {t('menu_add_product')}
          </button>
        </section>

        <TheBankPanel active={open && allowed} />

        {superAdmin && (
          <section className="rr-admin-section">
            <h3>{t('admin_members_title')}</h3>
            <p className="rr-admin-hint">{t('admin_members_hint')}</p>
            <ul className="rr-admin-members">
              {members.map((m) => {
                const name =
                  m.fullName || [m.firstName, m.lastName].filter(Boolean).join(' ') || m.phone || m.email || m.id
                const isSelf = m.id === user?.id
                return (
                  <li key={m.id}>
                    <div>
                      <strong>{name}</strong>
                      <small>
                        {m.role} {m.phone ? `· ${m.phone}` : ''}
                      </small>
                    </div>
                    {!isSelf && m.role !== 'super_admin' && (
                      <div className="rr-admin-member-actions">
                        {m.role !== 'admin' ? (
                          <button type="button" disabled={busy} onClick={() => void assignRole(m.id, 'admin')}>
                            {t('admin_assign_admin')}
                          </button>
                        ) : (
                          <button type="button" disabled={busy} onClick={() => void assignRole(m.id, 'customer')}>
                            {t('admin_unassign')}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
