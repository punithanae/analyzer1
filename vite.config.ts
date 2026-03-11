import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Yahoo Finance API to avoid CORS
      '/api/yahoo': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        secure: true,
      },
      // Proxy for Yahoo Finance v8 quote
      '/api/yahoo-quote': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo-quote/, ''),
        secure: true,
      },
      // Proxy for Alpha Vantage API (news + quotes)
      '/api/alphavantage': {
        target: 'https://www.alphavantage.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/alphavantage/, ''),
        secure: true,
      },
      // Proxy for Twelve Data API (quotes + time series)
      '/api/twelvedata': {
        target: 'https://api.twelvedata.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/twelvedata/, ''),
        secure: true,
      },
    },
  },
})
