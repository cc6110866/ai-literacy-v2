'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * TTS Hook - 优先使用 R2 预录制音频，Web Speech API 作为 fallback
 */
export function useTTS() {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 使用 R2 音频播放（通过 audio_url）
  const playR2Audio = useCallback((audioUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onplay = () => setSpeaking(true)
      audio.onended = () => { setSpeaking(false); resolve(true) }
      audio.onerror = () => { setSpeaking(false); resolve(false) }

      // 3 秒超时
      setTimeout(() => {
        if (!audio.ended && !audio.paused) {
          audio.pause()
          setSpeaking(false)
          resolve(false)
        }
      }, 3000)

      audio.play().catch(() => resolve(false))
    })
  }, [])

  // Web Speech API fallback
  const speakWebSpeech = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    utterance.pitch = 1.1
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const zhVoice = voices.find(v => v.lang.startsWith('zh-CN') && !v.localService)
      || voices.find(v => v.lang.startsWith('zh-CN') && v.localService)
      || voices.find(v => v.lang.startsWith('zh'))
    if (zhVoice) utterance.voice = zhVoice

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  // 主 speak 函数：优先 R2（audio_url），失败 fallback 到 Web Speech
  const speak = useCallback(async (character: string, audioUrl?: string) => {
    if (audioUrl) {
      const success = await playR2Audio(audioUrl)
      if (success) return
    }
    // Fallback: 用 Web Speech API 读字符
    speakWebSpeech(character)
  }, [playR2Audio, speakWebSpeech])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking }
}
