import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
;(window as any).Buffer = Buffer // Set buffer globally for crypto libraries

import App from './App.tsx'
import './index.css'

import { Provider } from "@ckb-ccc/connector-react"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>
)
