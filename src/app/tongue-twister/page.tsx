"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import twistersData from '@/data/twisters.json'

// ─── Tongue Twister Data ────────────────────────────────────────────────────
const TWISTERS: Record<string, { text: string; tag: string }[]> = twistersData

type Difficulty = 'easy' | 'medium' | 'hard'

interface Twister {
  text: string
  tag: string
}

const playSound = (type: 'tick' | 'end' | 'click' | 'success') => {
  if (typeof window === 'undefined') return
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContext) return
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  if (type === 'tick') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime)
    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1)
    osc.start(); osc.stop(ctx.currentTime + 0.1)
  } else if (type === 'click') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
    osc.start(); osc.stop(ctx.currentTime + 0.08)
  } else if (type === 'success') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(); osc.stop(ctx.currentTime + 0.4)
  } else if (type === 'end') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(); osc.stop(ctx.currentTime + 0.3)
  }

  osc.connect(gain); gain.connect(ctx.destination)
}

export default function TongueTwisterPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [twister, setTwister] = useState<Twister | null>(null)
  const [seenSet, setSeenSet] = useState<Set<string>>(new Set())

  // Game states: idle → countdown → active → done
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'active' | 'done'>('idle')
  const [countdown, setCountdown] = useState(3)
  const [reps, setReps] = useState(3) // how many times to repeat
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [currentRep, setCurrentRep] = useState(0)
  const [wordsHighlighted, setWordsHighlighted] = useState(-1)
  const [streak, setStreak] = useState(0)
  const [showCopied, setShowCopied] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const speedMs = speed === 'slow' ? 700 : speed === 'normal' ? 400 : 220

  // Pick a random twister
  const pickTwister = useCallback((diff: Difficulty, excludeSet: Set<string>) => {
    const pool = TWISTERS[diff]
    let available = pool.filter(t => !excludeSet.has(t.text))
    if (available.length === 0) { available = pool; excludeSet.clear() }
    const picked = available[Math.floor(Math.random() * available.length)]
    return picked
  }, [])

  useEffect(() => {
    const t = pickTwister(difficulty, new Set())
    setTwister(t)
  }, [difficulty, pickTwister])

  const spinTwister = () => {
    playSound('click')
    const newSeen = new Set(seenSet)
    if (twister) newSeen.add(twister.text)
    setSeenSet(newSeen)
    const next = pickTwister(difficulty, newSeen)
    setTwister(next)
    setGameState('idle')
    setWordsHighlighted(-1)
    setCurrentRep(0)
    setTimeElapsed(0)
  }

  // Countdown effect
  useEffect(() => {
    if (gameState !== 'countdown') return
    if (countdown > 0) {
      playSound('tick')
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    } else {
      setGameState('active')
      setCurrentRep(1)
      setWordsHighlighted(0)
      setTimeElapsed(0)
    }
  }, [gameState, countdown])

  // Highlight words one by one as a teleprompter, cycling through reps
  useEffect(() => {
    if (gameState !== 'active' || !twister) return

    const words = twister.text.split(' ')
    if (wordsHighlighted < words.length) {
      intervalRef.current = setTimeout(() => {
        setWordsHighlighted(w => w + 1)
        setTimeElapsed(t => t + 1)
      }, speedMs)
      return () => { if (intervalRef.current) clearTimeout(intervalRef.current) }
    } else {
      // End of one rep
      if (currentRep < reps) {
        setCurrentRep(r => r + 1)
        setWordsHighlighted(0)
      } else {
        // All reps done
        setGameState('done')
        setStreak(s => s + 1)
        playSound('success')
        confetti({ particleCount: 120, spread: 60, origin: { y: 0.6 }, colors: ['#000000', '#DEDEDE', '#808080'] })
      }
    }
  }, [gameState, wordsHighlighted, currentRep, reps, twister, speedMs])

  const startChallenge = () => {
    playSound('click')
    setCountdown(3)
    setCurrentRep(0)
    setWordsHighlighted(-1)
    setTimeElapsed(0)
    setGameState('countdown')
  }

  const resetChallenge = () => {
    playSound('click')
    setGameState('idle')
    setCountdown(3)
    setWordsHighlighted(-1)
    setCurrentRep(0)
    setTimeElapsed(0)
  }

  const speakTwister = () => {
    if (!twister) return
    playSound('click')
    const utterance = new SpeechSynthesisUtterance(twister.text)
    utterance.rate = speed === 'slow' ? 0.6 : speed === 'normal' ? 0.85 : 1.2
    window.speechSynthesis.speak(utterance)
  }

  const copyChallenge = () => {
    if (!twister) return
    navigator.clipboard.writeText(twister.text)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
    playSound('click')
  }

  const words = twister?.text.split(' ') ?? []

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
            ← Word Challenge
          </Link>
          <div className="h-5 w-px bg-zinc-200" />
          <span className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-900 bg-zinc-100 rounded-xl">
            Tongue Twister
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 md:px-12 pt-10 pb-16 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">New</span>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Tongue Twister Mode</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-[950] text-zinc-900 italic tracking-tighter leading-none uppercase">
            Say  It <span className="relative inline-block">- Fast
              <div className="absolute -bottom-1 left-0 w-full h-2 bg-zinc-900 rounded-full" />
            </span>
          </h1>
          <p className="text-zinc-400 font-medium text-base max-w-lg">
            Train your articulation and fluency. Say each tongue twister as fast and clearly as possible — your teleprompter keeps pace.
          </p>
        </div>

        {/* Streak chip */}
        {streak > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
            <span className="text-xl">🔥</span>
            <span className="text-sm font-bold text-zinc-900">{streak} twister{streak > 1 ? 's' : ''} crushed this session</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Twister Display */}
          <div className="flex flex-col gap-6">
            {/* Controls row */}
            <div className="flex flex-wrap gap-3 items-center justify-center">
              {/* Difficulty */}
              <div className="inline-flex p-1.5 bg-zinc-100 rounded-2xl gap-1">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => { if (gameState === 'idle' || gameState === 'done') { playSound('click'); setDifficulty(d) } }}
                    disabled={gameState === 'countdown' || gameState === 'active'}
                    className={`px-5 py-2 rounded-[14px] text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${difficulty === d ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'} ${gameState === 'active' || gameState === 'countdown' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Twister card */}
            <div className="bg-white border border-zinc-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[260px]">
              <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] opacity-60">Current Twister</span>
                {twister && (
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[9px] font-bold uppercase tracking-wider">{twister.tag}</span>
                )}
              </div>

              {/* Countdown overlay */}
              {gameState === 'countdown' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10">
                  <span className="text-[10rem] font-bold text-zinc-900 italic animate-pulse">{countdown}</span>
                </div>
              )}

              {/* Done overlay */}
              {gameState === 'done' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-10 gap-4 animate-in fade-in zoom-in duration-500">
                  <span className="text-6xl">🎉</span>
                  <p className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Nailed it!</p>
                  <p className="text-sm text-zinc-500">You said it {reps} time{reps > 1 ? 's' : ''}</p>
                </div>
              )}

              {/* Word teleprompter */}
              <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center items-center mt-6">
                {words.map((word, i) => (
                  <span
                    key={i}
                    className={`text-2xl md:text-3xl font-extrabold tracking-tight transition-all duration-150 ${gameState === 'active'
                      ? i < wordsHighlighted
                        ? 'text-zinc-300'
                        : i === wordsHighlighted
                          ? 'text-zinc-900 scale-110'
                          : 'text-zinc-200'
                      : gameState === 'idle'
                        ? 'text-zinc-900'
                        : 'text-zinc-400'
                      }`}
                    style={i === wordsHighlighted && gameState === 'active' ? { textShadow: '0 2px 12px rgba(0,0,0,0.12)' } : {}}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Rep progress dots */}
            {(gameState === 'active' || gameState === 'countdown') && (
              <div className="flex items-center justify-center gap-3 animate-in fade-in duration-500">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Rep</span>
                {Array.from({ length: reps }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${i + 1 < currentRep ? 'bg-zinc-900 border-zinc-900' :
                      i + 1 === currentRep ? 'bg-zinc-900 border-zinc-900 scale-125' :
                        'bg-transparent border-zinc-300'
                      }`}
                  />
                ))}
              </div>
            )}

            {/* Quote */}
            <div className="px-8 mt-2">
              <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.25em] italic text-center leading-relaxed">
                &quot;The mouth&apos;s gym — one twist at a time&quot;
              </p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col gap-8">
            {/* Speed selector */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Teleprompter Speed</span>
              <div className="inline-flex p-1.5 bg-zinc-100 rounded-2xl gap-1 mx-auto">
                {(['slow', 'normal', 'fast'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { if (gameState !== 'active' && gameState !== 'countdown') { playSound('click'); setSpeed(s) } }}
                    disabled={gameState === 'active' || gameState === 'countdown'}
                    className={`px-6 py-2 rounded-[14px] text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${speed === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'} ${gameState === 'active' || gameState === 'countdown' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Reps selector */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Repetitions</span>
              <div className="flex gap-2 justify-center">
                {[1, 3, 5, 10].map(r => (
                  <button
                    key={r}
                    onClick={() => { if (gameState !== 'active' && gameState !== 'countdown') { playSound('click'); setReps(r) } }}
                    disabled={gameState === 'active' || gameState === 'countdown'}
                    className={`w-14 h-14 rounded-2xl font-bold text-sm border transition-all ${reps === r ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-200' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'} ${gameState === 'active' || gameState === 'countdown' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ×{r}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {gameState === 'idle' && (
                <>
                  <button
                    id="start-tongue-twister"
                    onClick={startChallenge}
                    className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold text-base tracking-wide hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-2.5 active:scale-[0.98]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Start Challenge
                  </button>
                  <div className="flex gap-3">
                    <button onClick={spinTwister} className="flex-1 py-4 bg-white border-[2px] border-zinc-900 text-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                      New Twister
                    </button>
                    <button onClick={speakTwister} className="flex-1 py-4 bg-white border-[2px] border-zinc-200 text-zinc-500 rounded-2xl font-bold text-sm hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                      Hear It
                    </button>
                  </div>
                  <button onClick={copyChallenge} className="w-full py-4 bg-white border-[2px] border-zinc-200 text-zinc-500 rounded-2xl font-bold text-sm hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center justify-center gap-2 active:scale-[0.98] relative">
                    {showCopied ? <span className="text-green-600 font-black">Copied to clipboard!</span> : <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                      Share Twister
                    </>}
                  </button>
                </>
              )}

              {(gameState === 'countdown' || gameState === 'active') && (
                <button
                  onClick={resetChallenge}
                  className="w-full py-5 bg-white border-[2.5px] border-zinc-900 text-zinc-900 rounded-2xl font-bold text-base tracking-wide hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  Stop & Reset
                </button>
              )}

              {gameState === 'done' && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button onClick={startChallenge} className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold text-base tracking-wide hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Repeat Twister
                  </button>
                  <button onClick={spinTwister} className="w-full py-4 bg-white border-[2px] border-zinc-900 text-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    Try Another
                  </button>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="bg-white border-[3px] border-zinc-900 rounded-[2.5rem] p-8 flex flex-col gap-5 relative shadow-[8px_8px_0_0_rgba(24,24,27,1)] isolate overflow-hidden mt-2">
              <h2 className="text-3xl font-[950] text-zinc-900 italic tracking-tight leading-none uppercase relative z-10">
                HOW IT <span className="relative inline-block">WORKS<div className="absolute -bottom-1 left-0 w-full h-1.5 bg-zinc-900 rounded-full" /></span>
              </h2>
              <div className="flex flex-col gap-4 mt-2 z-10 relative">
                <div className="flex items-center gap-3 group"><span className="text-xl font-black text-zinc-900 w-8">1)</span><p className="font-bold text-zinc-900 text-base tracking-tight group-hover:translate-x-1 transition-transform uppercase">Pick difficulty & speed</p></div>
                <div className="flex items-center gap-3 group"><span className="text-xl font-black text-zinc-900 w-8">2)</span><p className="font-bold text-zinc-900 text-base tracking-tight group-hover:translate-x-1 transition-transform uppercase">Follow the teleprompter</p></div>
                <div className="flex items-center gap-3 group"><span className="text-xl font-black text-zinc-900 w-8">3)</span><p className="font-bold text-zinc-900 text-base tracking-tight group-hover:translate-x-1 transition-transform uppercase">Say it fast & clearly</p></div>
              </div>
              <div className="absolute bottom-0 right-0 w-40 h-40 select-none pointer-events-none z-0">
                <img src="/mascot.png" alt="" className="w-full h-full object-contain mix-blend-multiply -rotate-6 opacity-80" style={{ filter: 'grayscale(1) brightness(1.2) contrast(100)' }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
