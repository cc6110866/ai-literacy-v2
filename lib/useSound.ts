'use client'

import { useCallback, useRef } from 'react'

/**
 * Web Audio API 音效系统
 * 纯代码生成音效，不需要外部音频文件
 */

type SoundType = 'correct' | 'wrong' | 'click' | 'complete' | 'combo' | 'achievement'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// 播放单个音符
function playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15, startTime: number = 0) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + startTime)
  osc.stop(ctx.currentTime + startTime + duration)
}

const soundFns: Record<SoundType, () => void> = {
  // 答对：上行两音，明亮欢快
  correct: () => {
    const ctx = getAudioContext()
    playTone(ctx, 523.25, 0.15, 'sine', 0.15, 0)      // C5
    playTone(ctx, 659.25, 0.2, 'sine', 0.15, 0.1)      // E5
  },

  // 答错：低沉短促
  wrong: () => {
    const ctx = getAudioContext()
    playTone(ctx, 220, 0.25, 'square', 0.08, 0)        // A3
    playTone(ctx, 196, 0.3, 'square', 0.06, 0.1)       // G3
  },

  // 点击：轻柔短音
  click: () => {
    const ctx = getAudioContext()
    playTone(ctx, 800, 0.06, 'sine', 0.08)
  },

  // 完成一组：上行三音 + 和弦
  complete: () => {
    const ctx = getAudioContext()
    playTone(ctx, 523.25, 0.2, 'sine', 0.12, 0)       // C5
    playTone(ctx, 659.25, 0.2, 'sine', 0.12, 0.15)     // E5
    playTone(ctx, 783.99, 0.35, 'sine', 0.15, 0.3)     // G5
  },

  // 连击：快速上升音
  combo: () => {
    const ctx = getAudioContext()
    playTone(ctx, 440, 0.08, 'sine', 0.12, 0)          // A4
    playTone(ctx, 554.37, 0.08, 'sine', 0.12, 0.06)    // C#5
    playTone(ctx, 659.25, 0.08, 'sine', 0.12, 0.12)    // E5
    playTone(ctx, 880, 0.15, 'sine', 0.15, 0.18)       // A5
  },

  // 成就解锁：庆祝音效
  achievement: () => {
    const ctx = getAudioContext()
    playTone(ctx, 523.25, 0.15, 'sine', 0.1, 0)        // C5
    playTone(ctx, 659.25, 0.15, 'sine', 0.1, 0.12)     // E5
    playTone(ctx, 783.99, 0.15, 'sine', 0.1, 0.24)     // G5
    playTone(ctx, 1046.5, 0.4, 'sine', 0.15, 0.36)     // C6
    // 叮叮叮
    playTone(ctx, 2637, 0.05, 'sine', 0.03, 0.8)       // C7
    playTone(ctx, 2637, 0.05, 'sine', 0.03, 0.9)       // C7
    playTone(ctx, 2637, 0.05, 'sine', 0.03, 1.0)       // C7
  },
}

export function useSound() {
  const enabledRef = useRef(true)

  // 初始化 AudioContext（需要用户交互后才能创建）
  const init = useCallback(() => {
    if (typeof window === 'undefined') return
    getAudioContext()
  }, [])

  const play = useCallback((type: SoundType) => {
    if (!enabledRef.current) return
    if (typeof window === 'undefined') return
    try {
      soundFns[type]()
    } catch {
      // 静默失败
    }
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled
  }, [])

  return { play, init, setEnabled }
}
