'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'

interface HanziWriterProps {
  character: string
  width?: number
  height?: number
  padding?: number
  strokeColor?: string
  outlineColor?: string
  radicalColor?: string
  showOutline?: boolean
  showCharacter?: boolean
  autoAnimate?: boolean
  animateSpeed?: number
  delayBetweenStrokes?: number
  onAnimateComplete?: () => void
}

export interface HanziWriterRef {
  animate: () => Promise<void>
  quiz: (options?: { onComplete?: () => void; onCorrectStroke?: () => void; onMistake?: (data: { strokeNum: number }) => void }) => void
  cancelQuiz: () => void
  hideCharacter: () => void
  showCharacter: () => void
}

const HanziWriterComponent = forwardRef<HanziWriterRef, HanziWriterProps>(({
  character,
  width = 160,
  height = 160,
  padding = 10,
  strokeColor = '#333',
  outlineColor = '#DDD',
  radicalColor = '#168F16',
  showOutline = true,
  showCharacter = true,
  autoAnimate = false,
  animateSpeed = 1,
  delayBetweenStrokes = 200,
  onAnimateComplete,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<any>(null)
  const mountedRef = useRef(false)

  // 动态导入 hanzi-writer（需要 DOM）
  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!containerRef.current || cancelled) return

      const HanziWriter = (await import('hanzi-writer')).default

      if (!containerRef.current || cancelled) return

      // 清空容器
      containerRef.current.innerHTML = ''

      const writer = HanziWriter.create(containerRef.current, character, {
        width,
        height,
        padding,
        strokeColor,
        outlineColor,
        radicalColor,
        showOutline,
        showCharacter,
        strokeAnimationSpeed: animateSpeed,
        delayBetweenStrokes,
        charDataLoader: (char: string, onComplete: (data: any) => void) => {
          // 使用 hanzi-writer-data CDN
          fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
            .then(res => {
              if (!res.ok) throw new Error('Char data not found')
              return res.json()
            })
            .then(data => onComplete(data))
            .catch(() => {
              // 字形数据不存在时，静默失败，显示空白
              onComplete(null)
            })
        },
      })

      writerRef.current = writer
      mountedRef.current = true

      if (autoAnimate) {
        setTimeout(() => {
          writer.animateCharacter({
            onComplete: () => {
              onAnimateComplete?.()
            },
          })
        }, 300)
      }
    }

    init()

    return () => {
      cancelled = true
      mountedRef.current = false
      writerRef.current = null
    }
  }, [character]) // 只在 character 变化时重新创建

  useImperativeHandle(ref, () => ({
    animate: async () => {
      if (!writerRef.current) return
      return writerRef.current.animateCharacter({
        onComplete: () => {
          onAnimateComplete?.()
        },
      })
    },
    quiz: (options?: { onComplete?: () => void; onCorrectStroke?: () => void; onMistake?: (data: { strokeNum: number }) => void }) => {
      if (!writerRef.current) return
      writerRef.current.quiz({
        showHintAfterMisses: 3,
        highlightOnComplete: true,
        ...options,
      })
    },
    cancelQuiz: () => {
      if (!writerRef.current) return
      writerRef.current.cancelQuiz()
    },
    hideCharacter: () => {
      if (!writerRef.current) return
      writerRef.current.hideCharacter()
    },
    showCharacter: () => {
      if (!writerRef.current) return
      writerRef.current.showCharacter()
    },
  }))

  return (
    <div
      ref={containerRef}
      className="inline-flex items-center justify-center"
      style={{ width, height }}
    />
  )
})

HanziWriterComponent.displayName = 'HanziWriter'

export default HanziWriterComponent
