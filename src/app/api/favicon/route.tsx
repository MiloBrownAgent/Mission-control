import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Single reliable font source used for both modes
const FONT_URL = 'https://og-playground.vercel.app/inter-latin-ext-700-normal.woff'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'mc'
  const size = parseInt(searchParams.get('size') ?? '32', 10)
  const isFamily = mode === 'hd'

  const fontRes = await fetch(FONT_URL)
  const fontData = await fontRes.arrayBuffer()

  if (isFamily) {
    // Family: cream bg, gold circle, gold "S"
    const pad         = Math.round(size * 0.09)
    const circleSize  = size - pad * 2
    const borderWidth = Math.max(1, Math.round(size * 0.045))
    const fontSize    = Math.round(size * 0.46)

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
              border: `${borderWidth}px solid #B8965A`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                color: '#B8965A',
                fontSize,
                fontFamily: 'Inter',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
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
        fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }],
      }
    )
  }

  // Work mode: dark bg, gold "MC"
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
