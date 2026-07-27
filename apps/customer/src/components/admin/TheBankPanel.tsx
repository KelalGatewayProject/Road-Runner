import { useEffect, useMemo, useState } from 'react'
import './TheBankPanel.css'
import { BANK_GATEWAYS, PLATFORM_CASHBOX_KEY, type GatewayKey } from '../../constants/bankGateways'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { SERVICE_FEE_RATE, WHT_RATE } from '../../lib/fees'
import { isSuperAdmin } from '../../lib/roles'
import {
  addAccountingEntry,
  fetchAccounting,
  fetchCashbox,
  updateCashboxBalance,
  type AccountingRow,
  type CashboxRow,
} from '../../services/adminApi'

type Props = {
  /** When true, load bank data (parent admin panel is open). */
  active: boolean
}

function money(n: number) {
  return `${n.toLocaleString()} ETB`
}

function balanceFor(rows: CashboxRow[], key: string) {
  return rows.find((r) => r.gatewayKey === key)?.balanceEtb ?? 0
}

export default function TheBankPanel({ active }: Props) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const superAdmin = isSuperAdmin(user?.role)
  const [cashbox, setCashbox] = useState<CashboxRow[]>([])
  const [records, setRecords] = useState<AccountingRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [activeKey, setActiveKey] = useState<GatewayKey | 'platform_cashbox' | 'wht' | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawNote, setWithdrawNote] = useState('')

  async function reload() {
    setError(null)
    try {
      const [c, a] = await Promise.all([fetchCashbox(), fetchAccounting(200)])
      setCashbox(c)
      setRecords(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load The Bank')
    }
  }

  useEffect(() => {
    if (active) void reload()
  }, [active])

  const trackedByGateway = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {}
    for (const g of BANK_GATEWAYS) map[g.key] = { amount: 0, count: 0 }
    for (const row of records) {
      if (!row.gatewayKey || !map[row.gatewayKey]) continue
      if (row.entryType === 'gateway_payment' || row.entryType === 'income') {
        map[row.gatewayKey].amount += row.amountEtb
        map[row.gatewayKey].count += 1
      }
    }
    return map
  }, [records])

  const serviceFeesCollected = useMemo(
    () =>
      records
        .filter((r) => r.entryType === 'service_fee')
        .reduce((sum, r) => sum + r.amountEtb, 0),
    [records],
  )

  const platformCashboxManual = balanceFor(cashbox, PLATFORM_CASHBOX_KEY)
  const platformCashboxDisplay = platformCashboxManual > 0 ? platformCashboxManual : serviceFeesCollected

  const withdrawals = useMemo(
    () => records.filter((r) => r.entryType === 'withdrawal'),
    [records],
  )

  const whtCollected = useMemo(
    () => withdrawals.reduce((sum, r) => sum + r.amountEtb * WHT_RATE, 0),
    [withdrawals],
  )

  function cardBalance(key: GatewayKey) {
    const manual = balanceFor(cashbox, key)
    const tracked = trackedByGateway[key]?.amount ?? 0
    const account = manual > 0 ? manual : tracked
    const showCollected = manual > 0 && tracked > 0 && Math.abs(tracked - account) > 0.009
    return { account, tracked, showCollected, count: trackedByGateway[key]?.count ?? 0 }
  }

  async function saveManual(key: string) {
    if (!user || !superAdmin) return
    const amount = Number(manualInput)
    if (Number.isNaN(amount)) return
    setBusy(true)
    setError(null)
    try {
      await updateCashboxBalance(key, amount, user.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save balance')
    } finally {
      setBusy(false)
    }
  }

  async function recordWithdrawal() {
    if (!user || !superAdmin || !activeKey || activeKey === 'wht') return
    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('bank_withdraw_invalid'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const gatewayKey = activeKey === 'platform_cashbox' ? PLATFORM_CASHBOX_KEY : activeKey
      await addAccountingEntry({
        entryType: 'withdrawal',
        gatewayKey,
        amountEtb: amount,
        description: withdrawNote.trim() || `Withdrawal from ${gatewayKey}`,
        userId: user.id,
      })
      const current = balanceFor(cashbox, gatewayKey)
      if (current > 0) {
        await updateCashboxBalance(gatewayKey, Math.max(0, current - amount), user.id)
      }
      const wht = Math.round(amount * WHT_RATE * 100) / 100
      await addAccountingEntry({
        entryType: 'wht',
        gatewayKey,
        amountEtb: wht,
        description: `WHT Remittance: ${wht} ETB (${WHT_RATE * 100}% of ${amount})`,
        userId: user.id,
      })
      setWithdrawAmount('')
      setWithdrawNote('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record withdrawal')
    } finally {
      setBusy(false)
    }
  }

  const gatewayPaymentsForActive = useMemo(() => {
    if (!activeKey || activeKey === 'wht' || activeKey === 'platform_cashbox') return []
    return records.filter(
      (r) =>
        r.gatewayKey === activeKey &&
        (r.entryType === 'gateway_payment' || r.entryType === 'income'),
    )
  }, [activeKey, records])

  const openGateway = (key: GatewayKey) => {
    setActiveKey(key)
    setManualInput(String(balanceFor(cashbox, key) || ''))
    setWithdrawAmount('')
    setWithdrawNote('')
  }

  return (
    <section className="rr-bank">
      <div className="rr-bank-head">
        <div>
          <span className="rr-bank-emoji" aria-hidden="true">
            🏦
          </span>
          <div>
            <h3>{t('bank_title')}</h3>
            <p>{t('bank_subtitle')}</p>
          </div>
        </div>
      </div>

      <p className="rr-bank-fee-note">
        {t('bank_service_fee_note', { pct: String(SERVICE_FEE_RATE * 100) })}
      </p>

      {error && <p className="rr-admin-error">{error}</p>}

      <div className="rr-bank-grid">
        {BANK_GATEWAYS.map((g) => {
          const bal = cardBalance(g.key)
          return (
            <button key={g.key} type="button" className="rr-bank-card" onClick={() => openGateway(g.key)}>
              <img src={g.icon} alt="" />
              <strong>{g.label}</strong>
              <b>{money(bal.account)}</b>
              {bal.showCollected && (
                <small>
                  {t('bank_collected')}: {money(bal.tracked)}
                </small>
              )}
            </button>
          )
        })}

        <button
          type="button"
          className="rr-bank-card rr-bank-card--cashbox"
          onClick={() => {
            setActiveKey('platform_cashbox')
            setManualInput(String(platformCashboxManual || ''))
          }}
        >
          <span className="rr-bank-card-icon" aria-hidden="true">
            💼
          </span>
          <strong>{t('bank_platform_cashbox')}</strong>
          <b>{money(platformCashboxDisplay)}</b>
          <small>
            {t('bank_service_fees_tracked')}: {money(serviceFeesCollected)}
          </small>
        </button>

        <button type="button" className="rr-bank-card rr-bank-card--wht" onClick={() => setActiveKey('wht')}>
          <span className="rr-bank-card-icon" aria-hidden="true">
            🧾
          </span>
          <strong>{t('bank_wht_title')}</strong>
          <b>{money(whtCollected)}</b>
          <small>{t('bank_wht_hint', { pct: String(WHT_RATE * 100) })}</small>
        </button>
      </div>

      <div className="rr-bank-ledger">
        <h4>{t('bank_recent_tx')}</h4>
        <ul>
          {records.slice(0, 30).map((row) => (
            <li key={row.id}>
              <strong>
                {row.entryType} · {money(row.amountEtb)}
              </strong>
              <span>{row.description}</span>
              <small>
                {row.gatewayKey || '—'} · {new Date(row.createdAt).toLocaleString()}
              </small>
            </li>
          ))}
          {records.length === 0 && <li className="rr-admin-hint">{t('admin_accounting_empty')}</li>}
        </ul>
      </div>

      {activeKey && (
        <div className="rr-bank-modal-overlay" role="presentation" onMouseDown={() => setActiveKey(null)}>
          <div
            className="rr-bank-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header>
              <h4>
                {activeKey === 'wht'
                  ? t('bank_wht_title')
                  : activeKey === 'platform_cashbox'
                    ? t('bank_platform_cashbox')
                    : BANK_GATEWAYS.find((g) => g.key === activeKey)?.label}
              </h4>
              <button type="button" onClick={() => setActiveKey(null)} aria-label={t('account_close')}>
                ×
              </button>
            </header>

            {activeKey === 'wht' ? (
              <div className="rr-bank-modal-body">
                <p>
                  <b>{money(whtCollected)}</b>
                </p>
                <p className="rr-admin-hint">{t('bank_wht_detail', { pct: String(WHT_RATE * 100) })}</p>
                <ul className="rr-bank-modal-list">
                  {withdrawals.map((w) => (
                    <li key={w.id}>
                      {money(w.amountEtb)} · WHT {money(Math.round(w.amountEtb * WHT_RATE * 100) / 100)}
                      <small>{w.description}</small>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rr-bank-modal-body">
                {activeKey !== 'platform_cashbox' && (
                  <>
                    <p>
                      {t('bank_account_balance')}:{' '}
                      <b>{money(cardBalance(activeKey).account)}</b>
                    </p>
                    <p className="rr-admin-hint">
                      {t('bank_tracked')}: {money(cardBalance(activeKey).tracked)} ·{' '}
                      {t('bank_payments')}: {cardBalance(activeKey).count}
                    </p>
                  </>
                )}
                {activeKey === 'platform_cashbox' && (
                  <p>
                    {t('bank_account_balance')}: <b>{money(platformCashboxDisplay)}</b>
                  </p>
                )}

                {superAdmin && (
                  <div className="rr-bank-edit">
                    <label>
                      {t('bank_manual_balance')}
                      <input
                        type="number"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                      />
                    </label>
                    <button type="button" disabled={busy} onClick={() => void saveManual(activeKey)}>
                      {t('bank_save_balance')}
                    </button>
                  </div>
                )}

                {superAdmin && (
                  <div className="rr-bank-edit">
                    <label>
                      {t('bank_record_withdrawal')}
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="ETB"
                      />
                    </label>
                    <input
                      type="text"
                      value={withdrawNote}
                      onChange={(e) => setWithdrawNote(e.target.value)}
                      placeholder={t('admin_entry_desc')}
                    />
                    <button type="button" disabled={busy} onClick={() => void recordWithdrawal()}>
                      {t('bank_save_withdrawal')}
                    </button>
                    <p className="rr-admin-hint">{t('bank_wht_on_withdraw', { pct: String(WHT_RATE * 100) })}</p>
                  </div>
                )}

                {activeKey !== 'platform_cashbox' && (
                  <ul className="rr-bank-modal-list">
                    {gatewayPaymentsForActive.map((p) => (
                      <li key={p.id}>
                        <strong>{money(p.amountEtb)}</strong>
                        <span>{p.description}</span>
                        <small>{new Date(p.createdAt).toLocaleString()}</small>
                      </li>
                    ))}
                    {gatewayPaymentsForActive.length === 0 && (
                      <li className="rr-admin-hint">{t('bank_no_payments_yet')}</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
