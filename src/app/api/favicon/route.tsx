import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'mc' // 'mc' | 'hd'
  const size = parseInt(searchParams.get('size') ?? '32', 10)
  const label = mode === 'hd' ? 'HD' : 'MC'
  const fontSize = size <= 32 ? 13 : Math.round(size * 0.38)

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
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 800,
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      </div>
    ),
    { width: size, height: size }
  )
}
