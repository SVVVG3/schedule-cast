import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  try {
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            borderRadius: '40px',
          }}
        >
          {/* Cast/Schedule Icon */}
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
      ),
      {
        width: 200,
        height: 200,
        headers: {
          'Cache-Control': 'public, immutable, no-transform, max-age=3600',
          'Content-Type': 'image/png',
        },
      }
    );
    
    // Add headers to the response
    imageResponse.headers.set('Cache-Control', 'public, immutable, no-transform, max-age=3600');
    imageResponse.headers.set('Content-Type', 'image/png');
    
    return imageResponse;
  } catch (error) {
    console.error('Error generating splash logo:', error);
    return new Response('Failed to generate logo', { status: 500 });
  }
} 