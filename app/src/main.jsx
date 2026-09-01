import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CatCoverGame from './CatCoverGame.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CatCoverGame />
  </StrictMode>,
)
