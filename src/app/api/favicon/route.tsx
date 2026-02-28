import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'mc' // 'mc' | 'hd'
  const label = mode === 'hd' ? 'HD' : 'MC'

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
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontStyle: 'normal',
          }}
        >
          {label}
        </span>
      </div>
    ),
    { width: 32, height: 32 }
  )
}
