import { useEffect, useMemo, useState, type ReactNode } from 'react'
import './App.css'
import { deliveryFeeEtb, formatDistanceKm, haversineKm } from './lib/geo'
import { serviceFeeEtb } from './lib/fees'
import { resolveMediaUrl } from './lib/media'
import { DeliveryLocationScreen, type DeliveryLocation } from './components/maps/DeliveryLocationScreen'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import AuthSlide from './components/auth/AuthSlide'
import AccountPanel from './components/auth/AccountPanel'
import PaymentMethodsSheet from './components/checkout/PaymentMethodsSheet'
import AppMenu from './components/menu/AppMenu'
import AdminDashboard from './components/admin/AdminDashboard'
import CatalogUploadPanel from './components/admin/CatalogUploadPanel'
import {
  getDemoCatalog,
  loadCatalog,
  type Product,
} from './services/catalog'

type CartItem = Product & {
  quantity: number
}

type IconName =
  | 'search'
  | 'pin'
  | 'cart'
  | 'user'
  | 'arrow'
  | 'star'
  | 'plus'
  | 'minus'
  | 'shop'
  | 'home'
  | 'clock'
  | 'shield'
  | 'close'
  | 'phone'
  | 'menu'

const healthConditions = [
  { id: 'headache', name: 'Headache', icon: 'conditions/headache.jpg', category: 'medicines' },
  { id: 'acidity', name: 'Acidity', icon: 'conditions/acidity.jpg', category: 'medicines' },
  { id: 'period-pain', name: 'Period Pain', icon: 'conditions/period-pain.jpg', category: 'medicines' },
  { id: 'sleep-trouble', name: 'Sleep Trouble', icon: 'conditions/sleep-trouble.jpg', category: 'wellness' },
  { id: 'cold-flu', name: 'Cold & Flu', icon: 'conditions/cold-flu.jpg', category: 'medicines' },
  { id: 'allergies', name: 'Allergies', icon: 'conditions/allergies.jpg', category: 'personal-care' },
  { id: 'fatigue', name: 'Fatigue', icon: 'conditions/fatigue.jpg', category: 'vitamins' },
  { id: 'diabetes', name: 'Diabetes', icon: 'conditions/diabetes.jpg', category: 'wellness' },
] as const

function categoryUniqueCount(products: Product[], categoryId: string) {
  const names = products
    .filter((p) => categoryId === 'all' || p.category === categoryId)
    .map((p) => p.name)
  return new Set(names).size
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    cart: <><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    star: <path d="m12 2.5 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.1l6.2-.9Z" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    shop: <><path d="M4 10v10h16V10" /><path d="M3 10h18l-2-6H5Z" /><path d="M9 20v-6h6v6" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10" /><path d="M9 21v-7h6v7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 1.9Z" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={name === 'star' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function money(value: number) {
  return `${value.toLocaleString()} ETB`
}

function App() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const brandImageUrl = `${import.meta.env.BASE_URL}road-runner-brand.jpg`
  const bannerImageUrl = `${import.meta.env.BASE_URL}road-runner-banner.jpg`
  const mapImageUrl = `${import.meta.env.BASE_URL}addis-map.jpg`
  const mascotImageUrl = `${import.meta.env.BASE_URL}road-runner-mascot.png`
  const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`
  const pharmacyImageUrl = (path: string) => resolveMediaUrl(path, assetUrl)
  const demo = getDemoCatalog()
  const [categories, setCategories] = useState(demo.categories)
  const [pharmacies, setPharmacies] = useState(demo.pharmacies)
  const [products, setProducts] = useState(demo.products)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [pharmaciesOpen, setPharmaciesOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<'pharmacy' | 'product' | null>(null)
  const [locationOpen, setLocationOpen] = useState(false)
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountLegal, setAccountLegal] = useState<'privacy' | 'terms' | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadCatalog().then((catalog) => {
      if (cancelled) return
      setCategories(catalog.categories)
      setPharmacies(catalog.pharmacies)
      setProducts(catalog.products)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedPharmacy = pharmacies.find((pharmacy) => pharmacy.id === selectedPharmacyId)
  const cartPharmacy = pharmacies.find((pharmacy) => pharmacy.id === cart[0]?.pharmacyId)

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const pharmacy = pharmacies.find((item) => item.id === product.pharmacyId)
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory
      const matchesPharmacy = !selectedPharmacyId || product.pharmacyId === selectedPharmacyId
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        pharmacy?.name.toLowerCase().includes(term)
      return matchesCategory && matchesPharmacy && matchesSearch
    })

    if (selectedPharmacyId) return filtered

    const seenNames = new Set<string>()
    return filtered.filter((product) => {
      if (seenNames.has(product.name)) return false
      seenNames.add(product.name)
      return true
    })
  }, [activeCategory, search, selectedPharmacyId])

  const bestOffers = useMemo(() => {
    const seenNames = new Set<string>()
    return products
      .filter((product) => product.oldPrice || product.badge)
      .filter((product) => {
        if (seenNames.has(product.name)) return false
        seenNames.add(product.name)
        return true
      })
      .slice(0, 4)
  }, [])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const distanceKm =
    cartPharmacy && deliveryLocation
      ? haversineKm(
          { lat: cartPharmacy.lat, lng: cartPharmacy.lng },
          { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
        )
      : null
  const deliveryFee = cart.length && distanceKm != null ? deliveryFeeEtb(distanceKm) : 0
  const serviceFee = cart.length ? serviceFeeEtb(subtotal) : 0
  const total = subtotal + deliveryFee + serviceFee
  const canCheckout = cart.length > 0 && !!deliveryLocation

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  function addToCart(product: Product) {
    if (cart.length && cart[0].pharmacyId !== product.pharmacyId) {
      showToast(`Your cart contains items from ${cartPharmacy?.name}. Complete or clear it before ordering from another pharmacy.`)
      return
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
    showToast(`${product.name} added to your cart`)
  }

  function updateQuantity(productId: string, amount: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + amount } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  function changeCartQuantity(product: Product, amount: number) {
    const existing = cart.find((item) => item.id === product.id)
    if (!existing && amount > 0) {
      addToCart(product)
      return
    }
    if (!existing) return
    updateQuantity(product.id, amount)
  }

  function openPharmacy(pharmacyId: string) {
    setSelectedPharmacyId(pharmacyId)
    setActiveCategory('all')
    setSearch('')
    setPharmaciesOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function returnHome() {
    setSelectedPharmacyId(null)
    setActiveCategory('all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand-button" type="button" onClick={returnHome} aria-label="Road Runner home">
          <img src={bannerImageUrl} className="brand-image" alt="Road Runner Pharmacy Delivery" />
        </button>

        <button className="location-button" type="button" onClick={() => setCartOpen(true)}>
          <span className="location-icon"><Icon name="pin" size={18} /></span>
          <span>
            <small>{t('deliver_to')}</small>
            <strong>{deliveryLocation?.label || t('set_in_cart')}</strong>
          </span>
          <span className="location-chevron">⌄</span>
        </button>

        <label className="search-box">
          <Icon name="search" size={20} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('search_placeholder')}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label={t('clear_search')}>
              <Icon name="close" size={17} />
            </button>
          )}
        </label>

        <nav className="header-actions" aria-label={`${t('nav_account')} / ${t('nav_cart')}`}>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              if (user) setAccountOpen(true)
              else setAuthOpen(true)
            }}
          >
            <Icon name="user" size={21} />
            <span>{user ? t('nav_account') : t('nav_sign_in')}</span>
          </button>
          <button type="button" className="cart-button" onClick={() => setCartOpen(true)}>
            <Icon name="cart" size={21} />
            <span>{t('nav_cart')}</span>
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
        </nav>
      </header>

      <main>
        {!selectedPharmacy ? (
          <>
            <section className="hero-section">
              <div className="hero-copy">
                <span className="eyebrow"><Icon name="shield" size={16} /> {t('hero_eyebrow')}</span>
                <h1>{t('hero_title')}</h1>
                <p>{t('hero_body')}</p>
                <div className="hero-actions">
                  <button type="button" className="primary-button" onClick={() => setPharmaciesOpen(true)}>
                    {t('browse_pharmacies')} <Icon name="arrow" size={18} />
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setCartOpen(true)}>
                    <Icon name="cart" size={18} /> {t('view_cart')}
                  </button>
                </div>
                <div className="hero-trust">
                  <span><strong>{t('hero_fast')}</strong> {t('hero_fast_from')}</span>
                  <i />
                  <span><strong>{t('hero_eta')}</strong> {t('hero_eta_avg')}</span>
                  <i />
                  <span><strong>{t('hero_secure')}</strong> {t('hero_secure_pay')}</span>
                </div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <img src={mapImageUrl} className="hero-map" alt="" />
                <img src={mascotImageUrl} className="hero-mascot" alt="" />
                <div className="delivery-status">
                  <span className="status-dot" />
                  <div>
                    <small>{t('status_fast')}</small>
                    <strong>{t('status_on_way')}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="content-section category-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">{t('shop_by_need')}</span>
                  <h2>{t('product_categories')}</h2>
                </div>
                <p>{t('categories_blurb')}</p>
              </div>
              <div className="category-row">
                {categories.map((category) => (
                  <button
                    className={`category-card ${activeCategory === category.id ? 'active' : ''}`}
                    type="button"
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <span className="category-icon">
                      <img src={assetUrl(category.icon)} alt="" />
                    </span>
                    <strong>{category.name}</strong>
                    <small>{categoryUniqueCount(products, category.id)} {t('products_count')}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="content-section" id="best-offers">
              <div className="section-heading inline">
                <div>
                  <span className="section-kicker">{t('limited_deals')}</span>
                  <h2>{t('best_offers')}</h2>
                </div>
                <button type="button" className="text-button" onClick={() => setPharmaciesOpen(true)}>
                  {t('shop_pharmacies')} <Icon name="arrow" size={17} />
                </button>
              </div>
              <div className="offers-grid">
                {bestOffers.map((product) => {
                  const pharmacy = pharmacies.find((item) => item.id === product.pharmacyId)
                  const savings = product.oldPrice ? product.oldPrice - product.price : 0
                  return (
                    <article className="offer-card" key={product.id}>
                      <div className="offer-image">
                        <img src={product.image} alt="" />
                        <span className="offer-tag">{product.badge || (savings ? t('save_etb', { n: savings }) : t('deal'))}</span>
                      </div>
                      <div className="offer-content">
                        <small>{pharmacy?.name}</small>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                        <div className="offer-price-row">
                          <strong>{money(product.price)}</strong>
                          {product.oldPrice && <s>{money(product.oldPrice)}</s>}
                        </div>
                        <button type="button" className="offer-button" onClick={() => addToCart(product)}>
                          {t('add_to_cart')} <Icon name="plus" size={15} />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </>
        ) : (
          <section className="storefront">
            <div className="storefront-cover">
              <img src={pharmacyImageUrl(selectedPharmacy.image)} alt="" />
              <div className="storefront-overlay" />
              <button type="button" className="back-button" onClick={returnHome}>
                ← {t('all_pharmacies')}
              </button>
              <div className="storefront-info">
                <span className="verified-badge"><Icon name="shield" size={14} /> {t('verified_pharmacy')}</span>
                <h1>{selectedPharmacy.name}</h1>
                <div>
                  <span><Icon name="phone" size={17} /> {selectedPharmacy.phone}</span>
                  <span><Icon name="star" size={16} /> {selectedPharmacy.rating} ({selectedPharmacy.reviews} {t('reviews')})</span>
                  <span><Icon name="clock" size={17} /> {selectedPharmacy.eta}</span>
                </div>
              </div>
            </div>
            <div className="storefront-toolbar content-section">
              <div className="category-pills">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    className={activeCategory === category.id ? 'active' : ''}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <div className="store-summary">
                <span>{selectedPharmacy.openUntil}</span>
                <span>{selectedPharmacy.distance.toFixed(1)} {t('km_away')}</span>
              </div>
            </div>
          </section>
        )}

        <section className="content-section products-section">
          {selectedPharmacy ? (
            <>
              <div className="section-heading inline">
                <div>
                  <span className="section-kicker">{selectedPharmacy.name}</span>
                  <h2>{t('available_products')}</h2>
                </div>
                <span className="result-count">{visibleProducts.length} {t('items_count')}</span>
              </div>

              {visibleProducts.length ? (
                <div className="store-product-list">
                  {visibleProducts.map((product) => {
                    const inCart = cart.find((item) => item.id === product.id)
                    const quantity = inCart?.quantity ?? 0
                    return (
                      <article className="store-product-item" key={product.id}>
                        <span className="pharmacy-thumb">
                          <img src={product.image} alt="" />
                        </span>
                        <div className="store-product-copy">
                          <strong>{product.name}</strong>
                          <p>{product.description}</p>
                          <small>{money(product.price)} · {product.unit}</small>
                        </div>
                        <div className="quantity-control store-quantity">
                          <button type="button" onClick={() => changeCartQuantity(product, -1)} aria-label={`Remove one ${product.name}`} disabled={quantity === 0}>
                            <Icon name="minus" size={15} />
                          </button>
                          <b>{quantity}</b>
                          <button type="button" onClick={() => changeCartQuantity(product, 1)} aria-label={`Add one ${product.name}`}>
                            <Icon name="plus" size={15} />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <span><Icon name="search" size={28} /></span>
                  <h3>{t('no_matching')}</h3>
                  <p>{t('no_matching_hint')}</p>
                  <button type="button" onClick={() => { setSearch(''); setActiveCategory('all') }}>{t('clear_filters')}</button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <span className="section-kicker">{t('care_by_need')}</span>
                  <h2>{t('health_conditions')}</h2>
                </div>
                <p>{t('conditions_blurb')}</p>
              </div>
              <div className="conditions-grid">
                {healthConditions.map((condition) => (
                  <button
                    type="button"
                    className="condition-card"
                    key={condition.id}
                    onClick={() => {
                      setActiveCategory(condition.category)
                      setPharmaciesOpen(true)
                      showToast(t('showing_pharmacies_for', { name: condition.name }))
                    }}
                  >
                    <span className="condition-icon">
                      <img src={assetUrl(condition.icon)} alt="" />
                    </span>
                    <strong>{condition.name}</strong>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="service-promise">
          <div><span><Icon name="shield" size={22} /></span><div><strong>{t('promise_verified')}</strong><small>{t('promise_verified_sub')}</small></div></div>
          <div><span><Icon name="clock" size={22} /></span><div><strong>{t('promise_fast')}</strong><small>{t('promise_fast_sub')}</small></div></div>
          <div><span><Icon name="pin" size={22} /></span><div><strong>{t('promise_fees')}</strong><small>{t('promise_fees_sub')}</small></div></div>
          <div><span><Icon name="cart" size={22} /></span><div><strong>{t('promise_checkout')}</strong><small>{t('promise_checkout_sub')}</small></div></div>
        </section>
      </main>

      <footer>
        <img src={brandImageUrl} alt="Road Runner Pharmacy Delivery" />
        <p>{t('footer_blurb')}</p>
        <div>
          <a href="#">{t('help_center')}</a>
          <a href="#">{t('partner_pharmacies')}</a>
          <a href="#">{t('delivery_areas')}</a>
          <button
            type="button"
            className="footer-text-link"
            onClick={() => {
              setAccountLegal('privacy')
              setAccountOpen(true)
            }}
          >
            {t('privacy')}
          </button>
          <button
            type="button"
            className="footer-text-link"
            onClick={() => {
              setAccountLegal('terms')
              setAccountOpen(true)
            }}
          >
            {t('terms')}
          </button>
        </div>
        <small>{t('footer_small')}</small>
      </footer>

      <nav className="mobile-nav">
        <button type="button" className={!selectedPharmacy ? 'active' : ''} onClick={returnHome}><Icon name="home" /><span>{t('nav_home')}</span></button>
        <button type="button" className={menuOpen ? 'active' : ''} onClick={() => setMenuOpen(true)}><Icon name="menu" /><span>{t('nav_menu')}</span></button>
        <button type="button" className="mobile-cart" onClick={() => setCartOpen(true)}><Icon name="cart" />{cartCount > 0 && <b>{cartCount}</b>}<span>{t('nav_cart')}</span></button>
        <button
          type="button"
          onClick={() => {
            if (user) setAccountOpen(true)
            else setAuthOpen(true)
          }}
        >
          <Icon name="user" />
          <span>{user ? t('nav_account') : t('nav_sign_in')}</span>
        </button>
      </nav>

      <AppMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenPharmacies={() => setPharmaciesOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenSignIn={() => setAuthOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        onAddPharmacy={() => setUploadMode('pharmacy')}
        onAddProduct={() => setUploadMode('product')}
      />

      <AdminDashboard
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onAddPharmacy={() => {
          setAdminOpen(false)
          setUploadMode('pharmacy')
        }}
        onAddProduct={() => {
          setAdminOpen(false)
          setUploadMode('product')
        }}
      />

      <CatalogUploadPanel
        open={uploadMode != null}
        mode={uploadMode || 'pharmacy'}
        pharmacies={pharmacies}
        categoryIds={categories}
        onClose={() => setUploadMode(null)}
        onCreatedPharmacy={(pharmacy) => {
          setPharmacies((prev) => [pharmacy, ...prev])
          showToast(t('upload_pharmacy_ok'))
        }}
        onCreatedProduct={(product) => {
          setProducts((prev) => [product, ...prev])
          showToast(t('upload_product_ok'))
        }}
      />

      {pharmaciesOpen && (
        <div className="overlay" role="presentation" onMouseDown={() => setPharmaciesOpen(false)}>
          <aside className="cart-drawer pharmacies-drawer" role="dialog" aria-modal="true" aria-label={t('pharmacies_title')} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="section-kicker">{t('pharmacies_kicker')}</span>
                <h2>{t('pharmacies_title')}</h2>
              </div>
              <button type="button" onClick={() => setPharmaciesOpen(false)} aria-label={t('close_pharmacies')}><Icon name="close" /></button>
            </div>
            <p className="drawer-intro">
              {t('pharmacies_intro')}
            </p>
            <div className="pharmacy-drawer-list">
              {pharmacies.map((pharmacy) => (
                <button
                  type="button"
                  className="pharmacy-drawer-item"
                  key={pharmacy.id}
                  onClick={() => openPharmacy(pharmacy.id)}
                >
                  <span className="pharmacy-thumb">
                    <img src={pharmacyImageUrl(pharmacy.image)} alt="" />
                  </span>
                  <span className="pharmacy-drawer-copy">
                    <strong>{pharmacy.name}</strong>
                    <small><Icon name="phone" size={13} /> {pharmacy.phone}</small>
                    <em>{pharmacy.openUntil} · {pharmacy.eta}</em>
                  </span>
                  <span className="pharmacy-drawer-meta">
                    <b><Icon name="star" size={13} /> {pharmacy.rating}</b>
                    <Icon name="arrow" size={16} />
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {cartOpen && (
        <div className="overlay" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label={t('cart_title')} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="section-kicker">{t('cart_kicker')}</span>
                <h2>{t('cart_title')}</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label={t('close_cart')}><Icon name="close" /></button>
            </div>

            {cart.length ? (
              <>
                <div className="cart-pharmacy">
                  <span><Icon name="shop" size={18} /></span>
                  <div><small>{t('ordering_from')}</small><strong>{cartPharmacy?.name}</strong></div>
                </div>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <img src={item.image} alt="" />
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <small>{item.unit}</small>
                        <span>{money(item.price)}</span>
                      </div>
                      <div className="quantity-control">
                        <button type="button" onClick={() => updateQuantity(item.id, -1)}><Icon name="minus" size={15} /></button>
                        <b>{item.quantity}</b>
                        <button type="button" onClick={() => updateQuantity(item.id, 1)}><Icon name="plus" size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="cart-location" onClick={() => setLocationOpen(true)}>
                  <span><Icon name="pin" size={19} /></span>
                  <div>
                    <small>{t('deliver_to')}</small>
                    <strong>{deliveryLocation?.label || t('loc_title')}</strong>
                    <p>
                      {deliveryLocation
                        ? deliveryLocation.detail
                        : t('loc_gps_hint')}
                    </p>
                  </div>
                  <span>{deliveryLocation ? t('change_location') : t('set_location')}</span>
                </button>
                <div className="cart-summary">
                  <div><span>{t('items_subtotal')}</span><strong>{money(subtotal)}</strong></div>
                  <div>
                    <span>
                      {t('delivery')}
                      {distanceKm != null ? ` (${formatDistanceKm(distanceKm)} km × 25 ETB)` : ''}
                    </span>
                    <strong>{deliveryLocation ? money(deliveryFee) : '—'}</strong>
                  </div>
                  <div>
                    <span>{t('service_fee')}</span>
                    <strong>{money(serviceFee)}</strong>
                  </div>
                  <p className="cart-fee-note">{t('service_fee_note')}</p>
                  <div className="total-row"><span>{t('total')}</span><strong>{money(total)}</strong></div>
                </div>
                <button
                  type="button"
                  className="checkout-button"
                  disabled={!canCheckout}
                  onClick={() => {
                    if (!deliveryLocation) {
                      setLocationOpen(true)
                      showToast(t('set_delivery_to_continue'))
                      return
                    }
                    if (!user) {
                      setAuthOpen(true)
                      showToast(t('sign_in_to_pay'))
                      return
                    }
                    setPaymentOpen(true)
                  }}
                >
                  {t('continue_checkout')} <span>{money(total)}</span>
                </button>
                <p className="cart-note"><Icon name="shield" size={14} /> {t('cart_note')}</p>
              </>
            ) : (
              <div className="empty-cart">
                <span><Icon name="cart" size={30} /></span>
                <h3>{t('cart_empty_title')}</h3>
                <p>{t('cart_empty_body')}</p>
                <button type="button" onClick={() => setCartOpen(false)}>{t('start_shopping')}</button>
              </div>
            )}
          </aside>
        </div>
      )}

      <DeliveryLocationScreen
        open={locationOpen}
        initial={deliveryLocation}
        onClose={() => setLocationOpen(false)}
        onConfirm={(location) => {
          setDeliveryLocation(location)
          setLocationOpen(false)
          showToast(t('delivery_set_to', { label: location.label }))
        }}
      />

      <PaymentMethodsSheet
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        totalEtb={total}
      />

      <AuthSlide
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          setAuthOpen(false)
          showToast(t('signed_in_ok'))
          if (canCheckout) setPaymentOpen(true)
        }}
      />

      <AccountPanel
        isOpen={accountOpen}
        startOnLegal={accountLegal}
        onClose={() => {
          setAccountOpen(false)
          setAccountLegal(null)
        }}
      />

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

export default App
