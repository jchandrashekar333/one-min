"use client"

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import storiesData from '@/data/stories.json'

interface Story {
  title: string
  text: string
}

const playSound = (type: 'click') => {
  if (typeof window === 'undefined') return
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContext) return
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  if (type === 'click') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
    osc.start(); osc.stop(ctx.currentTime + 0.08)
  }
  osc.connect(gain); gain.connect(ctx.destination)
}

export default function StoryTellerPage() {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [isPlaying, setIsPlaying] = useState(false)
  const [offsetY, setOffsetY] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>()
  const lastTimeRef = useRef<number>()

  const stories: Story[] = storiesData
  const story = stories[currentStoryIndex]
  const lines = story.text.split('\n')

  const speedMap = {
    slow: 30,
    normal: 60,
    fast: 110
  }

  const animate = (time: number) => {
    if (lastTimeRef.current != null) {
      const deltaTime = time - lastTimeRef.current
      setOffsetY(prev => {
        const newOffset = prev - (speedMap[speed] * (deltaTime / 1000))
        // Stop if it scrolls way past the end
        if (contentRef.current && containerRef.current) {
          const maxScroll = -contentRef.current.clientHeight - 50
          if (newOffset < maxScroll) {
            setIsPlaying(false)
            return maxScroll
          }
        }
        return newOffset
      })
    }
    lastTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate)
    } else {
      lastTimeRef.current = undefined
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isPlaying, speed])

  const initializeOffset = () => {
    if (containerRef.current) {
      setOffsetY(containerRef.current.clientHeight / 1.5)
    } else {
      setOffsetY(300)
    }
  }

  useEffect(() => {
    initializeOffset()
  }, [])

  const togglePlay = () => {
    playSound('click')
    setIsPlaying(p => !p)
  }
  
  const resetPrompter = () => {
    playSound('click')
    setIsPlaying(false)
    initializeOffset()
    lastTimeRef.current = undefined
  }

  const selectStory = (index: number) => {
    if (index === currentStoryIndex) return
    playSound('click')
    setCurrentStoryIndex(index)
    setIsPlaying(false)
    initializeOffset()
  }

  const hearStory = () => {
    playSound('click')
    window.speechSynthesis.cancel() // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(story.text)
    utterance.rate = speed === 'slow' ? 0.75 : speed === 'normal' ? 0.9 : 1.15
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 selection:bg-zinc-900 selection:text-white pb-32 overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-zinc-100/50">
        <Link href="/" className="flex items-center gap-4 cursor-pointer group select-none">
          <div
            className="w-11 h-11 bg-white border-[2.5px] border-zinc-900 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-rotate-3"
            style={{ boxShadow: '4px 4px 0 0 rgba(24,24,27,1)' }}
          >
            <span
              className="text-zinc-900 font-[family-name:var(--font-alfa-slab)] text-xl italic uppercase tracking-tighter"
              style={{ textShadow: '1px 1px 0 #fff, 2px 2px 0 rgba(0,0,0,0.1)' }}
            >
              1M
            </span>
          </div>
          <span
            className="font-[family-name:var(--font-alfa-slab)] text-3xl tracking-tighter text-white uppercase italic"
            style={{
              WebkitTextStroke: '1.5px #18181b',
              textShadow: '1px 1px 0 #18181b, 2px 2px 0 #18181b, 3px 3px 0 #18181b, 4px 4px 0 rgba(0,0,0,0.2)'
            }}
          >
            ONE-MIN
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors rounded-xl hover:bg-zinc-50">
            Word Challenge
          </Link>
          <div className="h-5 w-px bg-zinc-200" />
          <Link href="/tongue-twister" className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors rounded-xl hover:bg-zinc-50">
            Tongue Twister
          </Link>
          <div className="h-5 w-px bg-zinc-200" />
          <span className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-900 bg-zinc-100 rounded-xl">
            Story Teller
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 md:px-12 pt-10 pb-16 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">New</span>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Story Teller Mode</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-[950] text-zinc-900 italic tracking-tighter leading-none uppercase">
            Speak Like a <span className="relative inline-block">Pro
              <div className="absolute -bottom-1 left-0 w-full h-2 bg-zinc-900 rounded-full" />
            </span>
          </h1>
          <p className="text-zinc-400 font-medium text-base max-w-lg">
            Read along with a scrolling teleprompter. Build your vocal confidence, pacing, and storytelling abilities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
          
          {/* Left: Controls & Stories (col span 4) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* Story Selector */}
            <div className="bg-white border-[2px] border-zinc-200 rounded-[2rem] p-6 flex flex-col gap-4">
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Select Story</h3>
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {stories.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectStory(idx)}
                    className={`text-left px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                      currentStoryIndex === idx 
                        ? 'bg-zinc-900 text-white shadow-md' 
                        : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompter Controls */}
            <div className="bg-white border-[2px] border-zinc-200 rounded-[2rem] p-6 flex flex-col gap-6">
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Controls</h3>
              
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Scroll Speed</span>
                <div className="flex p-1.5 bg-zinc-100 rounded-xl gap-1 w-full relative">
                  {(['slow', 'normal', 'fast'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => { playSound('click'); setSpeed(s) }}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        speed === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={togglePlay}
                  className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] ${
                    isPlaying 
                      ? 'bg-zinc-100 text-zinc-900 border-2 border-zinc-200 hover:bg-zinc-200' 
                      : 'bg-zinc-900 text-white border-2 border-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  {isPlaying ? (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause Prompter</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> Start Prompter</>
                  )}
                </button>
                
                <div className="flex gap-3">
                  <button onClick={resetPrompter} className="flex-1 py-3 bg-white border-[2px] border-zinc-200 text-zinc-600 rounded-xl font-bold text-xs hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    Reset
                  </button>
                  <button onClick={hearStory} className="flex-1 py-3 bg-white border-[2px] border-zinc-200 text-zinc-600 rounded-xl font-bold text-xs hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                    Listen
                  </button>
                </div>
              </div>
            </div>
            
          </div>

          {/* Right: Teleprompter View (col span 8) */}
          <div className="lg:col-span-8">
            <div className="bg-zinc-900 text-white rounded-[2rem] relative overflow-hidden flex flex-col" style={{ minHeight: '600px', height: '60vh', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8), 8px 8px 0 0 #e4e4e7' }}>
              
              {/* Teleprompter Focus Line Overlay */}
              <div className="absolute top-1/2 left-0 w-full h-[120px] -translate-y-1/2 pointer-events-none z-10 flex flex-col justify-between">
                 <div className="w-full border-t border-white/20" />
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-2xl font-black">▶</div>
                 <div className="w-full border-b border-white/20" />
              </div>
              
              {/* Fade masks */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-zinc-900 to-transparent z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-zinc-900 to-transparent z-10 pointer-events-none" />

              {/* Scroll Container */}
              <div 
                ref={containerRef}
                className="flex-1 w-full px-12 md:px-24 overflow-hidden relative"
              >
                <div 
                  ref={contentRef}
                  className="absolute left-0 w-full px-12 md:px-24 flex flex-col gap-6"
                  style={{ transform: `translateY(${offsetY}px)` }}
                >
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-zinc-400 mb-8 border-b-2 border-zinc-700 pb-4 inline-block">
                    {story.title}
                  </h2>
                  
                  {lines.map((line, idx) => (
                    <p 
                      key={idx} 
                      className="text-3xl md:text-5xl font-[900] tracking-tight leading-[1.3] text-zinc-100"
                    >
                      {line}
                    </p>
                  ))}
                  
                  <div className="h-32 flex items-center justify-center opacity-30 mt-12">
                     <span className="text-sm font-bold uppercase tracking-widest">--- END OF STORY ---</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
