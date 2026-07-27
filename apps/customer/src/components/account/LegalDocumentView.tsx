import React from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

export type LegalDocId = 'privacy' | 'terms'

const UPDATED = '26 July 2026'

const privacySections = [
  {
    title: 'Who we are',
    body: 'Road Runner is a pharmacy delivery service operating in Ethiopia. This Privacy Policy explains how we handle personal information when you use our website or app.',
  },
  {
    title: 'Information we collect',
    body: 'We may collect your name, phone number, delivery address or map pin, order details, device information, and messages you send to support. Payment confirmation data may be processed through licensed local payment partners.',
  },
  {
    title: 'How we use information',
    body: 'We use your information to create and manage your account, fulfill pharmacy orders, calculate delivery fees, communicate about your orders, improve the service, and meet legal or regulatory requirements.',
  },
  {
    title: 'Sharing',
    body: 'We share information with partner pharmacies fulfilling your order, delivery partners, and payment providers as needed to complete a transaction. We do not sell your personal information.',
  },
  {
    title: 'Retention & security',
    body: 'We keep account and order records as long as needed for the service and applicable law. We use reasonable technical and organizational measures to protect your data.',
  },
  {
    title: 'Your choices',
    body: 'You may update profile details in the app, request account deletion through support, or ask questions about your data by contacting Road Runner support.',
  },
  {
    title: 'Contact',
    body: 'For privacy questions, contact Road Runner support through the channels published on our website or in the app.',
  },
]

const termsSections = [
  {
    title: 'Agreement',
    body: 'By creating an account or placing an order on Road Runner, you agree to these Terms of Service. If you do not agree, do not use the service.',
  },
  {
    title: 'The service',
    body: 'Road Runner connects you with partner pharmacies for ordering everyday health and wellness products with delivery. Product availability, pricing, and fulfilment are confirmed by the pharmacy.',
  },
  {
    title: 'Accounts',
    body: 'You must provide accurate information and keep your PIN confidential. You are responsible for activity on your account. Notify support if you suspect unauthorized access.',
  },
  {
    title: 'Orders & payments',
    body: 'Orders may be subject to pharmacy confirmation. Delivery fees are calculated from distance or published rates. Local payment methods may become available over time; until then some methods may show as Coming Soon.',
  },
  {
    title: 'Acceptable use',
    body: 'You may not misuse the platform, attempt fraud, harass partners or staff, or use the service for unlawful purposes. We may suspend accounts that violate these terms.',
  },
  {
    title: 'Limitation of liability',
    body: 'Road Runner facilitates ordering and delivery logistics. Pharmacies remain responsible for product quality and labelling. To the fullest extent permitted by law, Road Runner is not liable for indirect or consequential damages arising from use of the service.',
  },
  {
    title: 'Changes',
    body: 'We may update these Terms. Continued use after changes means you accept the updated Terms. Material changes will be reflected by the “Last updated” date above.',
  },
]

type LegalDocumentViewProps = {
  doc: LegalDocId
  onBack: () => void
}

const LegalDocumentView: React.FC<LegalDocumentViewProps> = ({ doc, onBack }) => {
  const { t } = useLanguage()
  const title = doc === 'privacy' ? t('legal_privacy_title') : t('legal_terms_title')
  const sections = doc === 'privacy' ? privacySections : termsSections

  return (
    <div className="account-legal-view">
      <button type="button" className="account-back-btn" onClick={onBack}>
        ← {t('account_back')}
      </button>
      <h3 className="account-legal-title">{title}</h3>
      <p className="account-legal-meta">
        {t('legal_updated')}: {UPDATED}
      </p>
      <div className="account-legal-body">
        {sections.map((section) => (
          <section key={section.title} className="account-legal-section">
            <h4>{section.title}</h4>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

export default LegalDocumentView
