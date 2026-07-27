import { useEffect, useState, type FormEvent } from 'react'
import './CatalogUpload.css'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  PHARMACY_BANNER_ACCEPT,
  PHARMACY_BANNER_HEIGHT,
  PHARMACY_BANNER_MAX_BYTES,
  PHARMACY_BANNER_WIDTH,
} from '../../lib/media'
import { canManageCatalog } from '../../lib/roles'
import { createPharmacy, createProduct, uploadPharmacyBanner } from '../../services/adminApi'
import type { Pharmacy, Product } from '../../services/catalog'
import PharmacyMapPinScreen, { type PharmacyMapPin } from '../maps/PharmacyMapPinScreen'

type Mode = 'pharmacy' | 'product'

type Props = {
  open: boolean
  mode: Mode
  pharmacies: Pharmacy[]
  categoryIds: { id: string; name: string }[]
  onClose: () => void
  onCreatedPharmacy: (pharmacy: Pharmacy) => void
  onCreatedProduct: (product: Product) => void
}

export default function CatalogUploadPanel({
  open,
  mode,
  pharmacies,
  categoryIds,
  onClose,
  onCreatedPharmacy,
  onCreatedProduct,
}: Props) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [pin, setPin] = useState<PharmacyMapPin | null>(null)

  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const [phName, setPhName] = useState('')
  const [phPhone, setPhPhone] = useState('')
  const [phArea, setPhArea] = useState('Addis Ababa')
  const [phOpen, setPhOpen] = useState('Open 24 hours')
  const [phEta, setPhEta] = useState('25–40 min')

  const [prName, setPrName] = useState('')
  const [prPharmacyId, setPrPharmacyId] = useState(pharmacies[0]?.id || '')
  const [prCategory, setPrCategory] = useState(categoryIds.find((c) => c.id !== 'all')?.id || 'medicines')
  const [prDesc, setPrDesc] = useState('')
  const [prPrice, setPrPrice] = useState('')
  const [prUnit, setPrUnit] = useState('pack')

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    }
  }, [bannerPreview])

  useEffect(() => {
    if (!open) {
      setBannerFile(null)
      setBannerPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPin(null)
      setError(null)
      setMapOpen(false)
    }
  }, [open])

  if (!open) return null

  if (!canManageCatalog(user?.role)) {
    return (
      <div className="rr-upload-overlay" role="presentation" onMouseDown={onClose}>
        <div className="rr-upload-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
          <header>
            <h2>{t('admin_denied_title')}</h2>
            <button type="button" onClick={onClose} aria-label={t('account_close')}>
              ×
            </button>
          </header>
          <p className="rr-upload-hint">{t('admin_denied_body')}</p>
        </div>
      </div>
    )
  }

  function onBannerPicked(file: File | null) {
    setError(null)
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    if (!file) {
      setBannerFile(null)
      setBannerPreview(null)
      return
    }
    if (file.size > PHARMACY_BANNER_MAX_BYTES) {
      setError(t('pharm_banner_too_large'))
      setBannerFile(null)
      setBannerPreview(null)
      return
    }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function submitPharmacy(e: FormEvent) {
    e.preventDefault()
    if (!bannerFile) {
      setError(t('pharm_banner_required'))
      return
    }
    if (!pin) {
      setError(t('pharm_map_required'))
      setMapOpen(true)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const imagePath = await uploadPharmacyBanner(bannerFile, phName || 'pharmacy')
      const pharmacy = await createPharmacy({
        name: phName,
        phone: phPhone,
        area: phArea || pin.area,
        openUntil: phOpen,
        eta: phEta,
        lat: pin.lat,
        lng: pin.lng,
        imagePath,
      })
      onCreatedPharmacy(pharmacy)
      setPhName('')
      setPhPhone('')
      setPin(null)
      onBannerPicked(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function submitProduct(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const product = await createProduct({
        pharmacyId: prPharmacyId,
        categoryId: prCategory,
        name: prName,
        description: prDesc,
        priceEtb: Number(prPrice),
        unit: prUnit,
      })
      onCreatedProduct(product)
      setPrName('')
      setPrDesc('')
      setPrPrice('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="rr-upload-overlay" role="presentation" onMouseDown={onClose}>
        <div
          className="rr-upload-panel"
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'pharmacy' ? t('menu_add_pharmacy') : t('menu_add_product')}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header>
            <h2>{mode === 'pharmacy' ? t('menu_add_pharmacy') : t('menu_add_product')}</h2>
            <button type="button" onClick={onClose} aria-label={t('account_close')}>
              ×
            </button>
          </header>
          <p className="rr-upload-hint">{t('upload_admin_only')}</p>
          {error && <p className="rr-upload-error">{error}</p>}

          {mode === 'pharmacy' ? (
            <form onSubmit={(e) => void submitPharmacy(e)}>
              <div className="rr-upload-banner">
                <strong>{t('pharm_banner_label')}</strong>
                <p className="rr-upload-banner-size">
                  {t('pharm_banner_size', {
                    w: PHARMACY_BANNER_WIDTH,
                    h: PHARMACY_BANNER_HEIGHT,
                    mb: Math.round(PHARMACY_BANNER_MAX_BYTES / (1024 * 1024)),
                  })}
                </p>
                {bannerPreview ? (
                  <img src={bannerPreview} alt="" className="rr-upload-banner-preview" />
                ) : (
                  <div className="rr-upload-banner-placeholder">{t('pharm_banner_placeholder')}</div>
                )}
                <label className="rr-upload-banner-pick">
                  {bannerFile ? t('pharm_banner_change') : t('pharm_banner_choose')}
                  <input
                    type="file"
                    accept={PHARMACY_BANNER_ACCEPT}
                    onChange={(e) => onBannerPicked(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <label>
                {t('upload_name')}
                <input required value={phName} onChange={(e) => setPhName(e.target.value)} />
              </label>
              <label>
                {t('upload_phone')}
                <input required value={phPhone} onChange={(e) => setPhPhone(e.target.value)} />
              </label>
              <label>
                {t('upload_area')}
                <input value={phArea} onChange={(e) => setPhArea(e.target.value)} />
              </label>
              <label>
                {t('upload_open_until')}
                <input value={phOpen} onChange={(e) => setPhOpen(e.target.value)} />
              </label>
              <label>
                {t('upload_eta')}
                <input value={phEta} onChange={(e) => setPhEta(e.target.value)} />
              </label>

              <div className="rr-upload-location">
                <strong>{t('pharm_map_location')}</strong>
                {pin ? (
                  <p>
                    {pin.detail}
                    <small>
                      {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                    </small>
                  </p>
                ) : (
                  <p className="rr-upload-location-empty">{t('pharm_map_not_set')}</p>
                )}
                <button type="button" className="rr-upload-map-btn" onClick={() => setMapOpen(true)}>
                  {pin ? t('pharm_map_change') : t('pharm_map_open')}
                </button>
              </div>

              <button type="submit" disabled={busy || !pin || !bannerFile}>
                {busy ? t('upload_saving') : t('upload_save_pharmacy')}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void submitProduct(e)}>
              <label>
                {t('upload_pharmacy')}
                <select required value={prPharmacyId} onChange={(e) => setPrPharmacyId(e.target.value)}>
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('upload_category')}
                <select required value={prCategory} onChange={(e) => setPrCategory(e.target.value)}>
                  {categoryIds
                    .filter((c) => c.id !== 'all')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {t('upload_name')}
                <input required value={prName} onChange={(e) => setPrName(e.target.value)} />
              </label>
              <label>
                {t('upload_description')}
                <textarea value={prDesc} onChange={(e) => setPrDesc(e.target.value)} rows={3} />
              </label>
              <div className="rr-upload-row">
                <label>
                  {t('upload_price')}
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={prPrice}
                    onChange={(e) => setPrPrice(e.target.value)}
                  />
                </label>
                <label>
                  {t('upload_unit')}
                  <input value={prUnit} onChange={(e) => setPrUnit(e.target.value)} />
                </label>
              </div>
              <button type="submit" disabled={busy || !prPharmacyId}>
                {busy ? t('upload_saving') : t('upload_save_product')}
              </button>
            </form>
          )}
        </div>
      </div>

      <PharmacyMapPinScreen
        open={mapOpen}
        initial={pin ? { lat: pin.lat, lng: pin.lng } : null}
        onClose={() => setMapOpen(false)}
        onConfirm={(next) => {
          setPin(next)
          setPhArea(next.area)
          setError(null)
          setMapOpen(false)
        }}
      />
    </>
  )
}
