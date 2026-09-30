import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 1. Import bộ định tuyến tại đây
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* 2. Bọc BrowserRouter ra ngoài App */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)