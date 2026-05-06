import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './toast.tsx'
import { initNative } from './lib/native-init.ts'

// 네이티브 환경에서 StatusBar overlay 활성화 (CSS env() 정상 동작 위해)
initNative();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
