import { createContext, useContext, type ReactNode } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import { getGoogleMapsApiKey, GOOGLE_MAPS_LIBRARIES } from '../config/maps'
import { mapsLanguageCode, useLanguage } from './LanguageContext'

type GoogleMapsContextValue = {
  isLoaded: boolean
  loadError: Error | undefined
  apiKey: string
  hasApiKey: boolean
}

const GoogleMapsContext = createContext<GoogleMapsContextValue | null>(null)

function MapsLoader({
  apiKey,
  language,
  children,
}: {
  apiKey: string
  language: string
  children: ReactNode
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: `road-runner-google-maps-${language}`,
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language,
    region: 'ET',
    preventGoogleFontsLoading: true,
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError, apiKey, hasApiKey: true }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

/** Loads the Maps JS API once for the Road Runner customer app (language from app preference). */
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = getGoogleMapsApiKey()
  const { language } = useLanguage()
  const mapsLang = mapsLanguageCode(language)

  if (!apiKey) {
    return (
      <GoogleMapsContext.Provider
        value={{
          isLoaded: false,
          loadError: new Error('Missing VITE_GOOGLE_MAPS_API_KEY'),
          apiKey: '',
          hasApiKey: false,
        }}
      >
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return (
    <MapsLoader key={mapsLang} apiKey={apiKey} language={mapsLang}>
      {children}
    </MapsLoader>
  )
}

export function useGoogleMaps() {
  const value = useContext(GoogleMapsContext)
  if (!value) {
    throw new Error('useGoogleMaps must be used within GoogleMapsProvider')
  }
  return value
}
