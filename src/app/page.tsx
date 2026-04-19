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
    const categories = ['General', 'Tech', 'Finance', 'Interview', 'Debate']
    const randomCat = categories[Math.floor(Math.random() * categories.length)]
    const pool = (wordsData as any).medium[randomCat] || (wordsData as any).medium.General
    const randomWord = pool[Math.floor(Math.random() * pool.length)].word
    
    const url = `${window.location.origin}/?w=${encodeURIComponent(randomWord)}`
    navigator.clipboard.writeText(url)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-zinc-900 selection:text-white pb-32 overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-zinc-100/50">
        <div className="flex items-center gap-4 cursor-pointer group select-none">
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
          className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-full font-bold text-sm tracking-tight hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
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
