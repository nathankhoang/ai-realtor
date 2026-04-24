'use client'

import { useState } from 'react'

export default function PhotoLightbox({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  function openAt(i: number) {
    setIndex(i)
    setOpen(true)
  }

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex(i => (i - 1 + photos.length) % photos.length)
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex(i => (i + 1) % photos.length)
  }

  return (
    <>
      <div className="flex gap-0.5">
        {photos.slice(0, 4).map((url, i) => (
          <button
            key={i}
            onClick={() => openAt(i)}
            className="relative flex-1 min-w-0 group"
          >
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-sm group-hover:brightness-90 transition-all" />
            <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded-sm leading-4">{i + 1}</span>
          </button>
        ))}
        {photos.length > 4 && (
          <button
            onClick={() => openAt(4)}
            className="relative flex-1 min-w-0 group"
          >
            <img src={photos[4]} alt="Photo 5" className="w-full h-24 object-cover rounded-sm brightness-50 group-hover:brightness-40 transition-all" />
            <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-semibold">+{photos.length - 4}</span>
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-lg"
          >
            ‹
          </button>

          <div className="relative max-w-4xl max-h-[90vh] mx-16" onClick={e => e.stopPropagation()}>
            <img
              src={photos[index]}
              alt={`Photo ${index + 1}`}
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {index + 1} / {photos.length}
            </div>
          </div>

          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-lg"
          >
            ›
          </button>

          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
