import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BlackoutGame from './BlackoutGame.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BlackoutGame />
  </StrictMode>,
)
