import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';

function NavBar() {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">SachCheck</h1>
            <p className="text-xs text-gray-400 leading-tight">Fact-check family forwards</p>
          </div>
        </div>
        <a
          href="https://t.me/sachCheck_demo_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
        >
          <span>✈️</span> Telegram Bot
        </a>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="pb-12">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

