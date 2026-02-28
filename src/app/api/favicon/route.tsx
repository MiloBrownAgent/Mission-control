import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode  = searchParams.get('mode') ?? 'mc'
  const size  = parseInt(searchParams.get('size') ?? '32', 10)
  const label = mode === 'hd' ? 'HD' : 'MC'
  const fontSize = size <= 32 ? 14 : Math.round(size * 0.38)

  // Inter Bold in woff format — supported by Satori
  const fontRes = await fetch(
    'https://og-playground.vercel.app/inter-latin-ext-700-normal.woff'
  )
  const fontData = await fontRes.arrayBuffer()

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
          {label}
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
