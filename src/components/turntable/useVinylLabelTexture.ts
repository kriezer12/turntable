import { useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'

interface VinylLabelOptions {
  artworkUrl?: string
  trackTitle?: string
  artistName?: string
}

export function useVinylLabelTexture({
  artworkUrl,
  trackTitle = 'THE TURNTABLES',
  artistName = 'HI-FI STEREO'
}: VinylLabelOptions) {
  // Create an initial canvas element
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    return c
  }, [])

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [canvas])

  const [, setVersion] = useState(0)

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw Vintage Vinyl Record Label
    const drawBaseLabel = (imageObj?: HTMLImageElement) => {
      ctx.clearRect(0, 0, 512, 512)

      // Background label circle
      const gradient = ctx.createRadialGradient(256, 256, 40, 256, 256, 256)
      gradient.addColorStop(0, '#c2410c') // Burnt orange vintage vinyl center
      gradient.addColorStop(0.7, '#9a3412')
      gradient.addColorStop(1, '#431407')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(256, 256, 256, 0, Math.PI * 2)
      ctx.fill()

      // Outer gold pin-stripes
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(256, 256, 240, 0, Math.PI * 2)
      ctx.stroke()

      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(256, 256, 232, 0, Math.PI * 2)
      ctx.stroke()

      // If album artwork is loaded, render it in the center quadrant
      if (imageObj) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(256, 170, 90, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(imageObj, 166, 80, 180, 180)
        ctx.restore()

        // Artwork gold border
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(256, 170, 90, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        // Fallback vintage emblem
        ctx.fillStyle = '#fde047'
        ctx.font = 'bold 24px "Outfit", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('TURNTABLES', 256, 150)

        ctx.fillStyle = '#ffedd5'
        ctx.font = '500 14px "Plus Jakarta Sans", sans-serif'
        ctx.fillText('LONG PLAY 33⅓ RPM', 256, 180)
      }

      // Track Title
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const displayTitle = trackTitle.length > 22 ? trackTitle.slice(0, 22) + '…' : trackTitle
      ctx.fillText(displayTitle, 256, 310)

      // Artist Name
      ctx.fillStyle = '#fed7aa'
      ctx.font = '16px "Plus Jakarta Sans", sans-serif'
      const displayArtist = artistName.length > 26 ? artistName.slice(0, 26) + '…' : artistName
      ctx.fillText(displayArtist, 256, 340)

      // Vintage metadata footer
      ctx.fillStyle = '#fde047'
      ctx.font = 'bold 12px monospace'
      ctx.fillText('STEREO • SIDE A • AUDIOPHILE PRESSING', 256, 390)

      // Center Spindle Ring
      ctx.fillStyle = '#050505'
      ctx.beginPath()
      ctx.arc(256, 256, 35, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#d4d4d8'
      ctx.lineWidth = 3
      ctx.stroke()

      texture.needsUpdate = true
      setVersion((v) => v + 1)
    }

    // Draw initial base label immediately
    drawBaseLabel()

    // If artworkUrl exists, attempt to load it with CORS fallback
    if (artworkUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const loadTimeout = setTimeout(() => {
        // If image hasn't loaded in 5s, keep the fallback label
        console.warn('Artwork image load timed out, using vinyl label fallback')
        drawBaseLabel()
      }, 5000)
      img.onload = () => {
        clearTimeout(loadTimeout)
        drawBaseLabel(img)
      }
      img.onerror = () => {
        clearTimeout(loadTimeout)
        // Keeps the stylized vintage base label on image failure
        console.warn('Artwork image failed to load, using vinyl label fallback')
        drawBaseLabel()
      }
      img.src = artworkUrl
    }
  }, [canvas, texture, artworkUrl, trackTitle, artistName])

  return texture
}
