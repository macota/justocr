import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const title = searchParams.get('title') ?? 'JustOCR'
  const tagline = searchParams.get('tagline') ?? 'Choose Your Model'
  const description = searchParams.get('description') ?? 'Straightforward OCR with cloud models from Google, Mistral, and more; or stay private In-Browser On-Device with local models.'

  // Fetch the icon image
  const iconUrl = new URL('/icon.png', request.url).toString()
  const iconData = await fetch(iconUrl).then((res) => res.arrayBuffer())
  const iconBase64 = `data:image/png;base64,${Buffer.from(iconData).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#f5f5f4',
          padding: '60px 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            marginBottom: '30px',
          }}
        >
          {/* Icon */}
          <img
            src={iconBase64}
            width={180}
            height={180}
            style={{
              borderRadius: '20px',
            }}
          />

          {/* Title and Tagline */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '72px',
                fontWeight: 700,
                color: '#1c1917',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 400,
                color: '#57534e',
              }}
            >
              {tagline}
            </div>
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 400,
            color: '#78716c',
            marginTop: '20px',
            maxWidth: '900px',
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
