import './MapTypeToggle.css'
import { useLanguage } from '../../contexts/LanguageContext'

export type RoadRunnerMapType = 'roadmap' | 'satellite'

type Props = {
  value: RoadRunnerMapType
  onChange: (next: RoadRunnerMapType) => void
}

/** Default (roadmap) vs Satellite — used on all Road Runner full-screen maps. */
export default function MapTypeToggle({ value, onChange }: Props) {
  const { t } = useLanguage()
  return (
    <div className="rr-map-type-toggle" role="group" aria-label={t('map_type_label')}>
      <button
        type="button"
        className={value === 'roadmap' ? 'active' : ''}
        onClick={() => onChange('roadmap')}
      >
        {t('map_type_default')}
      </button>
      <button
        type="button"
        className={value === 'satellite' ? 'active' : ''}
        onClick={() => onChange('satellite')}
      >
        {t('map_type_satellite')}
      </button>
    </div>
  )
}
