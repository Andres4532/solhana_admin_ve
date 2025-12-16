'use client'

import { useEffect } from 'react'

export default function FontLoader() {
  useEffect(() => {
    // Crear y agregar los links de preconnect
    const preconnect1 = document.createElement('link')
    preconnect1.rel = 'preconnect'
    preconnect1.href = 'https://fonts.googleapis.com'
    document.head.appendChild(preconnect1)

    const preconnect2 = document.createElement('link')
    preconnect2.rel = 'preconnect'
    preconnect2.href = 'https://fonts.gstatic.com'
    preconnect2.crossOrigin = 'anonymous'
    document.head.appendChild(preconnect2)

    // Crear y agregar el link de la fuente
    const fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap'
    document.head.appendChild(fontLink)

    // Cleanup
    return () => {
      document.head.removeChild(preconnect1)
      document.head.removeChild(preconnect2)
      document.head.removeChild(fontLink)
    }
  }, [])

  return null
}

