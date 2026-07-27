import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { GoogleMapsProvider } from './contexts/GoogleMapsContext.tsx'
import { LanguageProvider } from './contexts/LanguageContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <GoogleMapsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleMapsProvider>
    </LanguageProvider>
  </StrictMode>,
)
