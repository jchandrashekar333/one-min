"use client"

import React, { useState } from 'react'
import MysteryWord from '@/components/challenge/MysteryWord'
import wordsData from '@/data/words.json'

export default function Home() {
  const [currentDay, setCurrentDay] = useState(1)
  const [showCopied, setShowCopied] = useState(false)

  React.useEffect(() => {
    const savedDay = localStorage.getItem('omc_current_day')
    if (savedDay) setCurrentDay(parseInt(savedDay))
  }, [])

  React.useEffect(() => {
    localStorage.setItem('omc_current_day', currentDay.toString())
  }, [currentDay])

  const handleWordComplete = () => {
    setCurrentDay(prev => Math.min(30, prev + 1))
  }

  const shareRandomChallenge = () => {
    // Pick from a safe, small list if JSON is weird, or just use a fallback
    const fallbackWord = "Artificial Intelligence"
    const url = `${window.location.origin}/?w=${encodeURIComponent(fallbackWord)}`
    navigator.clipboard.writeText(url)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-zinc-900 selection:text-white pb-32 overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 md:px-12 py-5 sticky top-0 bg-white/90 backdrop-blur-md z-[100] border-b border-zinc-200">
        <div className="flex items-center gap-3 md:gap-4 cursor-pointer group select-none">
          <div 
            className="w-11 h-11 bg-white border-[2.5px] border-zinc-900 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-rotate-3"
            style={{
              boxShadow: '4px 4px 0 0 rgba(24,24,27,1)',
            }}
          >
            <span 
              className="text-zinc-900 font-[family-name:var(--font-alfa-slab)] text-xl italic uppercase tracking-tighter"
              style={{
                textShadow: '1px 1px 0 #fff, 2px 2px 0 rgba(0,0,0,0.1)'
              }}
            >
              1M
            </span>
          </div>
          <span 
            className="font-[family-name:var(--font-alfa-slab)] text-3xl tracking-tighter text-white uppercase italic"
            style={{
              WebkitTextStroke: '1.5px #18181b',
              textShadow: `
                1px 1px 0 #18181b,
                2px 2px 0 #18181b,
                3px 3px 0 #18181b,
                4px 4px 0 rgba(0,0,0,0.2)
              `
            }}
          >
            ONE-MIN
          </span>
        </div>

        <button 
          onClick={shareRandomChallenge}
          className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-zinc-900 text-white rounded-full font-bold text-[11px] md:text-sm tracking-tight hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
        >
          {showCopied ? (
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Link Copied!
            </span>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Challenge a Friend
            </>
          )}
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-6 md:px-12 pt-4 pb-16 flex flex-col gap-24">
        <MysteryWord
          dayNumber={currentDay}
          onComplete={handleWordComplete}
        />
      </main>
    </div>
  )
}
