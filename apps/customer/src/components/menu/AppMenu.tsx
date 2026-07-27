import './AppMenu.css'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { canManageCatalog, isSuperAdmin } from '../../lib/roles'

type Props = {
  open: boolean
  onClose: () => void
  onOpenPharmacies: () => void
  onOpenAccount: () => void
  onOpenSignIn: () => void
  onOpenAdmin: () => void
  onAddPharmacy: () => void
  onAddProduct: () => void
}

function MenuTile({
  label,
  onClick,
  emoji,
}: {
  label: string
  onClick: () => void
  emoji: string
}) {
  return (
    <button type="button" className="rr-menu-grid-tile" onClick={onClick}>
      <span className="rr-menu-grid-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="rr-menu-grid-label">{label}</span>
    </button>
  )
}

export default function AppMenu({
  open,
  onClose,
  onOpenPharmacies,
  onOpenAccount,
  onOpenSignIn,
  onOpenAdmin,
  onAddPharmacy,
  onAddProduct,
}: Props) {
  const { user } = useAuth()
  const { t } = useLanguage()
  if (!open) return null

  const catalogAdmin = canManageCatalog(user?.role)
  const superAdmin = isSuperAdmin(user?.role)
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    (superAdmin ? 'Super Admin' : t('menu_guest'))

  return (
    <div className="rr-menu-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="rr-menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('nav_menu')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="rr-menu-close" onClick={onClose} aria-label={t('account_close')}>
          ×
        </button>

        {user ? (
          <button
            type="button"
            className="rr-menu-profile"
            onClick={() => {
              onClose()
              onOpenAccount()
            }}
          >
            <span className="rr-menu-avatar">{(user.firstName || 'R').slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{superAdmin ? t('menu_role_super') : catalogAdmin ? t('menu_role_admin') : t('menu_role_customer')}</small>
            </span>
          </button>
        ) : (
          <div className="rr-menu-guest">
            <p>{t('menu_sign_in_prompt')}</p>
            <button
              type="button"
              className="rr-menu-signin"
              onClick={() => {
                onClose()
                onOpenSignIn()
              }}
            >
              {t('nav_sign_in')}
            </button>
          </div>
        )}

        <div className="rr-menu-body">
          {(superAdmin || catalogAdmin) && (
            <ul className="rr-menu-role-list">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenAdmin()
                  }}
                >
                  <span aria-hidden="true">⚙</span>
                  {superAdmin ? t('menu_super_admin_dashboard') : t('menu_admin_dashboard')}
                </button>
              </li>
            </ul>
          )}

          <div className="rr-menu-icon-grid">
            <MenuTile
              emoji="🏪"
              label={t('menu_pharmacies')}
              onClick={() => {
                onClose()
                onOpenPharmacies()
              }}
            />
            {catalogAdmin && (
              <>
                <MenuTile
                  emoji="➕"
                  label={t('menu_add_pharmacy')}
                  onClick={() => {
                    onClose()
                    onAddPharmacy()
                  }}
                />
                <MenuTile
                  emoji="💊"
                  label={t('menu_add_product')}
                  onClick={() => {
                    onClose()
                    onAddProduct()
                  }}
                />
              </>
            )}
            <MenuTile
              emoji="👤"
              label={user ? t('nav_account') : t('nav_sign_in')}
              onClick={() => {
                onClose()
                if (user) onOpenAccount()
                else onOpenSignIn()
              }}
            />
          </div>

          {!catalogAdmin && user && (
            <p className="rr-menu-note">{t('menu_upload_restricted')}</p>
          )}
        </div>
      </aside>
    </div>
  )
}
