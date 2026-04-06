'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * TTS Hook - 优先使用 R2 预录制音频，Web Speech API 作为 fallback
 */
export function useTTS() {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 拼音声调符号转文件名格式
  const pinyinToFilename = useCallback((pinyin: string): string => {
    const map: Record<string, string> = {
      'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
      'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
      'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
      'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
      'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
      'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4',
    }
    let safe = pinyin
    for (const [tone, num] of Object.entries(map)) {
      safe = safe.replaceAll(tone, num)
    }
    return safe
  }, [])

  // 使用 R2 音频播放
  const playR2Audio = useCallback((pinyin: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const filename = pinyinToFilename(pinyin)
      const url = `/api/audio?pinyin=${encodeURIComponent(pinyin)}`

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const audio = new Audio(url)
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
  }, [pinyinToFilename])

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

  // 主 speak 函数：优先 R2，失败 fallback 到 Web Speech
  const speak = useCallback(async (character: string, pinyin?: string) => {
    if (pinyin) {
      const success = await playR2Audio(pinyin)
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
