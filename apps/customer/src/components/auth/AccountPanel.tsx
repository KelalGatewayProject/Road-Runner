import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LANGUAGE_OPTIONS, useLanguage } from '../../contexts/LanguageContext'
import { isPhoneAuthEmail } from '../../utils/phoneNumberUtils'
import LegalDocumentView, { type LegalDocId } from '../account/LegalDocumentView'
import './AccountPanel.css'

interface AccountPanelProps {
  isOpen: boolean
  onClose: () => void
  /** Open directly on a legal document (e.g. footer Privacy link). */
  startOnLegal?: LegalDocId | null
}

const AccountPanel: React.FC<AccountPanelProps> = ({ isOpen, onClose, startOnLegal = null }) => {
  const { user, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setLegalDoc(null)
      return
    }
    if (startOnLegal) setLegalDoc(startOnLegal)
  }, [isOpen, startOnLegal])

  if (!isOpen) return null

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Road Runner customer'

  const showEmail = Boolean(user?.email && !isPhoneAuthEmail(user.email))

  return (
    <div className="overlay account-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="cart-drawer account-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('account_title')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="section-kicker">{t('account_kicker')}</span>
            <h2>{t('account_title')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('account_close')}>
            ×
          </button>
        </div>

        <div className="account-body">
          {legalDoc ? (
            <LegalDocumentView doc={legalDoc} onBack={() => setLegalDoc(null)} />
          ) : (
            <>
              <section className="account-section">
                <div className="account-field">
                  <span className="account-label">{t('account_name')}</span>
                  <strong>{displayName}</strong>
                </div>
                <div className="account-field">
                  <span className="account-label">{t('account_phone')}</span>
                  <strong>{user?.phone || t('account_phone_not_set')}</strong>
                </div>
                {showEmail && (
                  <div className="account-field">
                    <span className="account-label">Email</span>
                    <strong className="account-email">{user?.email}</strong>
                  </div>
                )}
              </section>

              <section className="account-section">
                <h3 className="account-section-title">{t('account_preferences')}</h3>
                <p className="account-hint">{t('account_language_hint')}</p>
                <fieldset className="account-language-fieldset">
                  <legend className="account-label">{t('account_language')}</legend>
                  <div className="account-language-grid">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className={`account-language-option ${language === option.id ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="road-runner-language"
                          value={option.id}
                          checked={language === option.id}
                          onChange={() => setLanguage(option.id)}
                        />
                        <span className="account-language-native">{option.nativeLabel}</span>
                        <span className="account-language-en">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>

              <section className="account-section">
                <h3 className="account-section-title">{t('account_legal')}</h3>
                <button type="button" className="account-link-row" onClick={() => setLegalDoc('privacy')}>
                  <span>
                    <strong>{t('account_privacy')}</strong>
                    <small>{t('account_privacy_desc')}</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
                <button type="button" className="account-link-row" onClick={() => setLegalDoc('terms')}>
                  <span>
                    <strong>{t('account_terms')}</strong>
                    <small>{t('account_terms_desc')}</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </section>

              <section className="account-section">
                <h3 className="account-section-title">{t('account_support')}</h3>
                <p className="account-hint">{t('account_support_desc')}</p>
              </section>

              <button
                type="button"
                className="checkout-button account-signout"
                onClick={async () => {
                  await signOut()
                  onClose()
                }}
              >
                {t('account_sign_out')}
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export default AccountPanel
