"use client"

import React, { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  stream: MediaStream
  isPaused?: boolean
}

export default function AudioVisualizer({ stream, isPaused }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!stream || isPaused) return

    const audioContext = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext as typeof AudioContext)()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const draw = () => {
      animationId = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height

        // Clean styling: Zinc-900 bars with varying opacity
        ctx.fillStyle = `rgba(24, 24, 27, ${0.4 + (barHeight / canvas.height) * 0.6})`
        
        // Draw centered rounded bars
        const y = (canvas.height - barHeight) / 2
        const radius = (barWidth - 1) / 2
        
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth - 1, barHeight, radius)
        } else {
          ctx.rect(x, y, barWidth - 1, barHeight)
        }
        ctx.fill()

        x += barWidth
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      analyser.disconnect()
      source.disconnect()
      audioContext.close()
    }
  }, [stream])

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={60} 
      className="w-full h-full opacity-80"
    />
  )
}
