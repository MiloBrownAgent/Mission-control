import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || ''
  const isFamily = host.includes('home.lookandseen') || host.includes('family')

  const manifest = isFamily
    ? {
        name: 'Home Dashboard',
        short_name: 'HD',
        description: 'Sweeney family home dashboard',
        start_url: '/',
        display: 'standalone',
        background_color: '#060606',
        theme_color: '#060606',
        orientation: 'portrait',
        icons: [
          { src: '/api/favicon?mode=hd&size=192', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/api/favicon?mode=hd&size=512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      }
    : {
        name: 'Mission Control',
        short_name: 'MC',
        description: 'Look & Seen work dashboard',
        start_url: '/',
        display: 'standalone',
        background_color: '#060606',
        theme_color: '#060606',
        orientation: 'portrait',
        icons: [
          { src: '/api/favicon?mode=mc&size=192', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/api/favicon?mode=mc&size=512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      }

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}
