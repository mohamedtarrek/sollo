import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import { ContextProvider } from './contexts/ContextProvider'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContextProvider>
      <App />
    </ContextProvider>
  </StrictMode>,
)
