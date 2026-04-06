'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * Web Speech API TTS Hook
 * 支持中文发音，自动选择 zh-CN 语音
 */
export function useTTS() {
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, rate: number = 0.8) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    // 停止上一个
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = rate
    utterance.pitch = 1.1 // 稍高音调，更适合儿童
    utterance.volume = 1

    // 尝试选择中文语音
    const voices = window.speechSynthesis.getVoices()
    const zhVoice = voices.find(v => v.lang.startsWith('zh-CN') && !v.localService)
      || voices.find(v => v.lang.startsWith('zh-CN') && v.localService)
      || voices.find(v => v.lang.startsWith('zh'))
    if (zhVoice) utterance.voice = zhVoice

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking }
}
