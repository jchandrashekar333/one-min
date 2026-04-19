"use client"

import React, { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import wordsData from '@/data/words.json'

type Difficulty = 'easy' | 'medium' | 'hard'
type Category = 'General' | 'Tech' | 'Finance' | 'Interview' | 'Debate'

interface WordData {
  word: string
  category: string
  subtitle: string
  prompts: string[]
}

const playSound = (type: 'tick' | 'end' | 'click') => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();

  if (type === 'end') {
    const audio = new Audio('https://www.myinstants.com/media/sounds/fahhh_KcgAXfs.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      console.warn("External sound failed to load");
    });
    return;
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  if (type === 'tick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
};

export default function MysteryWord({
  dayNumber,
  onComplete,
}: {
  dayNumber: number
  onComplete: () => void
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [category, setCategory] = useState<Category>('General')
  const [wordData, setWordData] = useState<WordData | null>(null)
  const [isLoading, setIsLoading] = useState(true)


  const [gameState, setGameState] = useState<'hidden' | 'countdown' | 'reveal' | 'speaking' | 'done'>('hidden')
  const [showHints, setShowHints] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [sessionTime, setSessionTime] = useState(60)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [spinCount, setSpinCount] = useState(0)
  const seenWordsRef = useRef<string[]>([])

  // Load word from local pool
  useEffect(() => {
    let cancelled = false
    async function loadWord() {
      setIsLoading(true); setWordData(null); setGameState('hidden'); setShowHints(false);

      // Keep a small delay so the branded mascot/loader can be seen
      await new Promise(resolve => setTimeout(resolve, 1200));

      const difficultyPool = (wordsData as any)[difficulty] || (wordsData as any)["medium"];
      const categoryPool: WordData[] = difficultyPool[category] || difficultyPool["General"];

      const historyArray = JSON.parse(localStorage.getItem('omc_word_history') || '[]');
      const historyList = historyArray.map((item: any) => item.word);

      let available = categoryPool.filter(w =>
        !historyList.includes(w.word) &&
        !seenWordsRef.current.includes(w.word)
      );

      if (available.length === 0) available = categoryPool;
      const selection = available[Math.floor(Math.random() * available.length)];

      if (!cancelled) {
        if (selection) seenWordsRef.current.push(selection.word);
        setWordData(selection);
        setIsLoading(false);
      }
    }
    loadWord()
    return () => { cancelled = true }
  }, [difficulty, category, dayNumber, spinCount])

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        playSound('tick');
        const t = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
      } else {
        playSound('end');
        setGameState('reveal')
      }
    }
  }, [gameState, countdown])

  useEffect(() => {
    if (gameState === 'speaking' && !isPaused) {
      if (timeRemaining > 0) {
        if (timeRemaining <= 5) playSound('tick');
        const t = setTimeout(() => setTimeRemaining(r => r - 1), 1000)
        return () => clearTimeout(t)
      } else {
        playSound('end');
        handleDone()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, timeRemaining, isPaused])

  const startReveal = () => { setCountdown(3); setGameState('countdown') }
  const startSpeaking = () => { setIsPaused(false); setTimeRemaining(sessionTime); setGameState('speaking') }

  const togglePause = () => { playSound('click'); setIsPaused(!isPaused); };
  const resetTimer = () => { playSound('click'); setIsPaused(false); setGameState('reveal'); setTimeRemaining(0); };

  const speakWord = () => {
    if (!wordData?.word) return;
    playSound('click');
    const utterance = new SpeechSynthesisUtterance(wordData.word);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleDone = () => {
    setGameState('done')
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#000000', '#DEDEDE', '#808080'] })
    onComplete()
  }

  const handleAgain = () => { setGameState('hidden'); setShowHints(false); onComplete(); }

  if (isLoading || !wordData) return (
    <div className="fixed inset-0 bg-[#fafafa] z-[100] flex flex-col items-center justify-center gap-12 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6">
        <img
          src="/mascot.png"
          alt="Mascot"
          className="w-48 h-48 object-contain animate-float mb-4"
          style={{
            mixBlendMode: 'multiply',
            filter: 'grayscale(1) brightness(1.2) contrast(100)'
          }}
        />
        <div className="flex items-center gap-6">
          <div
            className="w-16 h-16 bg-white border-[3px] border-zinc-900 rounded-2xl flex items-center justify-center"
            style={{ boxShadow: '6px 6px 0 0 rgba(24,24,27,1)' }}
          >
            <span className="text-zinc-900 font-[family-name:var(--font-alfa-slab)] text-3xl italic uppercase tracking-tighter">1M</span>
          </div>
          <span className="font-[family-name:var(--font-alfa-slab)] text-5xl tracking-tighter text-white uppercase italic" style={{ WebkitTextStroke: '2px #18181b', textShadow: '1px 1px 0 #18181b, 2px 2px 0 #18181b, 3px 3px 0 #18181b, 5px 5px 0 rgba(0,0,0,0.15)' }}>ONE-MIN</span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-900 animate-progress origin-left" />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row flex-wrap gap-4 justify-center items-center">
        <div className="inline-flex p-1.5 bg-zinc-100 rounded-2xl gap-1">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => { playSound('click'); setDifficulty(d); }}
              className={`px-6 py-2 rounded-[14px] text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${difficulty === d ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="relative inline-flex p-1.5 bg-zinc-100 rounded-2xl items-center">
          <select
            value={category}
            onChange={(e) => { playSound('click'); setCategory(e.target.value as Category); }}
            disabled={gameState !== 'hidden'}
            className={`appearance-none bg-white text-zinc-900 text-[11px] font-bold uppercase tracking-wider px-5 py-2 rounded-[14px] outline-none shadow-sm cursor-pointer pr-10 hover:text-zinc-700 transition-all \${gameState !== 'hidden' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {(['General', 'Tech', 'Finance', 'Interview', 'Debate'] as const).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="absolute right-4 pointer-events-none text-zinc-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-zinc-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] opacity-60">Current Objective</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full gap-8">
              <div className={`transition-all duration-700 ${gameState === 'hidden' || gameState === 'countdown' ? 'blur-2xl opacity-10 scale-90' : 'blur-0 opacity-100 scale-100'}`}>
                  <div className="flex flex-col items-center justify-center gap-6 mb-2">
                  <h1 className="text-6xl font-extrabold tracking-tighter text-zinc-900 leading-none">{wordData.word}</h1>
                  {(gameState === 'reveal' || gameState === 'speaking' || gameState === 'done') && (
                    <button onClick={speakWord} className="w-12 h-12 flex items-center justify-center bg-zinc-50 border border-zinc-200 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-white transition-all shadow-sm active:scale-90 flex-shrink-0 animate-in fade-in zoom-in duration-700">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                    </button>
                  )}
                </div>
                {(gameState === 'reveal' || gameState === 'speaking' || gameState === 'done') && (
                  <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <span className="px-4 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold uppercase tracking-widest">{wordData.category}</span>
                    <p className="text-zinc-500 font-medium text-base italic opacity-80 max-w-sm">&quot;{wordData.subtitle}&quot;</p>
                  </div>
                )}
              </div>

              {gameState === 'countdown' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
                  <span className="text-[10rem] font-bold text-zinc-900 italic animate-pulse">{countdown}</span>
                </div>
              )}

              {gameState === 'hidden' && (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-24 h-24 bg-zinc-50 rounded-full border border-dashed border-zinc-200 flex items-center justify-center"><span className="text-3xl">?</span></div>
                  <button onClick={() => { playSound('click'); startReveal(); }} className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-md shadow-zinc-200">Reveal Content</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 flex flex-col gap-6 relative">
            <div className="pb-4 border-b border-zinc-100">
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Speaking Guidelines</h3>
              <p className="text-xs text-zinc-500 font-medium">Use these points to structure your one-minute talk.</p>
            </div>
            <div className="relative">
              <ul className={`flex flex-col gap-4 transition-all duration-700 ${!showHints ? 'blur-md opacity-20 select-none' : 'blur-0 opacity-100 select-auto'}`}>
                {wordData.prompts.map((p, i) => (
                  <li key={i} className="flex gap-4 items-start group">
                    <div className="w-6 h-6 rounded-lg bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-900 transition-colors shadow-sm">
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-900">{i + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-600 leading-tight group-hover:text-zinc-900 transition-colors pt-0.5">{p}</span>
                  </li>
                ))}
              </ul>
              {!showHints && gameState !== 'hidden' && gameState !== 'countdown' && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <button onClick={() => { playSound('click'); setShowHints(true); }} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-md shadow-zinc-200 animate-in fade-in zoom-in duration-500">Reveal Hints</button>
                </div>
              )}
              {gameState === 'hidden' && (
                <div className="absolute inset-0 flex items-end justify-center pb-2 z-10">
                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Reveal the word first</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 mt-2 animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
            <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.25em] italic text-center leading-relaxed">&quot;One minute of focus today is a lifetime of fluency tomorrow&quot;</p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center justify-center gap-6 pt-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Session Timer</span>
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90">
                <circle cx="96" cy="96" r="84" className="stroke-zinc-100 fill-none stroke-[10]" />
                <circle cx="96" cy="96" r="84" className={`fill-none stroke-[10] transition-all duration-1000 ${gameState === 'speaking' ? (timeRemaining <= 5 ? 'stroke-red-500' : 'stroke-zinc-900') : 'stroke-zinc-300'}`} strokeDasharray="528" strokeDashoffset={gameState === 'speaking' ? 528 * (1 - timeRemaining / sessionTime) : 0} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-1">
                  <span className={`text-[4.5rem] font-extrabold tabular-nums tracking-tighter leading-none transition-colors duration-500 ${gameState === 'speaking' ? (timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-zinc-900') : 'text-zinc-200'}`}>{gameState === 'speaking' ? (Math.floor(timeRemaining / 60) > 0 ? `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}` : (timeRemaining % 60).toString().padStart(2, '0')) : sessionTime >= 60 ? sessionTime / 60 : sessionTime}</span>
                  <span className={`text-xl font-bold ${gameState === 'speaking' ? 'opacity-0' : 'text-zinc-300'}`}>m</span>
                </div>
              </div>
              {gameState === 'speaking' && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 pointer-events-none z-10 opacity-70"><div className="w-4 h-4 bg-zinc-900 rounded-full animate-ping mx-auto mt-4" /></div>
              )}
            </div>

            {gameState === 'speaking' && (
              <div className="flex gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-500">
                <button onClick={togglePause} className="w-12 h-12 rounded-full border-2 border-zinc-900 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all shadow-sm active:scale-95">{isPaused ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h4z" /></svg>}</button>
                <button onClick={resetTimer} className="w-12 h-12 rounded-full border-2 border-zinc-200 text-zinc-400 flex items-center justify-center hover:border-zinc-900 hover:text-zinc-900 transition-all shadow-sm active:scale-95"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg></button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {(gameState === 'hidden' || gameState === 'countdown' || gameState === 'reveal') && (
              <div className="flex flex-wrap gap-2">
                {[60, 90, 120, 180].map(val => (
                  <button key={val} onClick={() => { playSound('click'); setSessionTime(val); }} disabled={gameState === 'countdown'} className={`flex-1 min-w-[70px] py-4 rounded-2xl font-bold text-[11px] uppercase tracking-wider border transition-all \${sessionTime === val ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-200' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'} \${gameState === 'countdown' ? 'opacity-50 pointer-events-none' : ''}`}>{val === 60 ? '1m' : val === 90 ? '1.5m' : val === 120 ? '2m' : '3m'}</button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {gameState === 'reveal' && (
                <div className="flex w-full gap-4 items-center mt-2">
                  <button onClick={() => { playSound('click'); setSpinCount(s => s + 1); }} className="flex-shrink-0 px-8 py-[1.125rem] bg-zinc-900 text-white rounded-full font-bold text-lg tracking-wide hover:bg-zinc-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2.5"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Refresh</button>
                  <button onClick={() => { playSound('click'); startSpeaking(); }} className="flex-1 py-[1.125rem] bg-transparent border-[2.5px] border-zinc-900 text-zinc-900 rounded-full font-bold text-lg tracking-wide hover:bg-zinc-900 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">Start Timer &rarr;</button>
                </div>
              )}

              {gameState === 'done' && (
                <button onClick={() => { playSound('click'); handleAgain(); }} className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold text-sm tracking-wider hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-3"><span>✦</span> Practice Another Word</button>
              )}
              {(gameState === 'hidden' || gameState === 'countdown' || gameState === 'reveal') && (
                <p className="text-center text-[11px] font-medium text-zinc-400 uppercase tracking-widest pt-2">Adjust your time before starting</p>
              )}
            </div>

            <div className="bg-white border-[3px] border-zinc-900 rounded-[2.5rem] p-8 flex flex-col gap-6 relative shadow-[8px_8px_0_0_rgba(24,24,27,1)] animate-in fade-in slide-in-from-right-8 duration-700 mt-4 isolate overflow-hidden">
              <h2 className="text-4xl font-[950] text-zinc-900 italic tracking-tight leading-none uppercase relative z-10">
                ONE-<span className="relative inline-block">MIN<div className="absolute -bottom-1 left-0 w-full h-1.5 bg-zinc-900 rounded-full opacity-100" /></span> : EVERY DAY
              </h2>
              <div className="flex flex-col gap-4 mt-2 z-10 relative">
                <div className="flex items-center gap-3 group"><span className="text-2xl font-black text-zinc-900 w-8">1)</span><p className="font-bold text-zinc-900 text-lg tracking-tight group-hover:translate-x-1 transition-transform uppercase">Get random word</p></div>
                <div className="flex items-center gap-3 group"><span className="text-2xl font-black text-zinc-900 w-8">2)</span><p className="font-bold text-zinc-900 text-lg tracking-tight group-hover:translate-x-1 transition-transform uppercase">Set 1 min timer</p></div>
                <div className="flex items-center gap-3 group"><span className="text-2xl font-black text-zinc-900 w-8">3)</span><p className="font-bold text-zinc-900 text-lg tracking-tight group-hover:translate-x-1 transition-transform uppercase">Speak</p></div>
              </div>
              <div className="absolute bottom-0 right-0 w-48 h-48 select-none pointer-events-none z-0">
                <img src="/mascot.png" alt="" className="w-full h-full object-contain mix-blend-multiply -rotate-6 opacity-90" style={{ filter: 'grayscale(1) brightness(1.2) contrast(100)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
