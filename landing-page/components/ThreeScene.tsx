'use client'

import { useEffect, useRef } from 'react'

export function ThreeScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const animate = () => {
      time += 0.01
      
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
        )
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)')
        gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)')
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)')
        
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        for (let i = 0; i < 5; i++) {
          const x = (canvas.width / 6) * (i + 1) + Math.sin(time + i) * 50
          const y = canvas.height / 2 + Math.cos(time * 0.5 + i) * 100
          const radius = 20 + Math.sin(time * 2 + i) * 10
          
          const circleGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
          circleGradient.addColorStop(0, `rgba(${59 + i * 20}, ${130 + i * 15}, ${246 - i * 30}, 0.3)`)
          circleGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          
          ctx.fillStyle = circleGradient
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      animationId = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)' }}
    />
  )
}