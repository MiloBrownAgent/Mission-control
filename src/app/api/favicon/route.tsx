import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode  = searchParams.get('mode') ?? 'mc'
  const size  = parseInt(searchParams.get('size') ?? '32', 10)
  const isFamily = mode === 'hd'

  // Cormorant Garamond Light for the family S mark
  // Inter Bold for MC work mode
  const fontUrl = isFamily
    ? 'https://fonts.gstatic.com/s/cormorantgaramond/v22/BXRlvF3Pi-DLmFGEW_lbbkZi1g.woff'
    : 'https://og-playground.vercel.app/inter-latin-ext-700-normal.woff'

  let fontData: ArrayBuffer
  try {
    const fontRes = await fetch(fontUrl)
    fontData = await fontRes.arrayBuffer()
  } catch {
    // fallback to Inter if Cormorant fails
    const fallback = await fetch('https://og-playground.vercel.app/inter-latin-ext-700-normal.woff')
    fontData = await fallback.arrayBuffer()
  }

  if (isFamily) {
    // Family mode: cream background, gold circle, serif "S"
    const circleSize   = Math.round(size * 0.82)
    const borderWidth  = Math.max(1, Math.round(size * 0.04))
    const fontSize     = Math.round(size * 0.44)

    return new ImageResponse(
      (
        <div
          style={{
            background: '#FDFCFA',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: '50%',
              border: `${borderWidth}px solid rgba(184,150,90,0.45)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                color: '#B8965A',
                fontSize,
                fontFamily: 'Cormorant',
                fontWeight: 300,
                lineHeight: 1,
                marginTop: Math.round(size * 0.02),
              }}
            >
              S
            </span>
          </div>
        </div>
      ),
      {
        width: size,
        height: size,
        fonts: [{ name: 'Cormorant', data: fontData, weight: 300, style: 'normal' }],
      }
    )
  }

  // Work mode: dark background, gold "MC"
  const fontSize = size <= 32 ? 14 : Math.round(size * 0.38)

  return new ImageResponse(
    (
      <div
        style={{
          background: '#060606',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#B8956A',
            fontSize,
            fontFamily: 'Inter',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          MC
        </span>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }],
    }
  )
}
