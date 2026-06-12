import { ImageResponse } from 'next/og';

export const alt = 'Neon Image Studio — cast anyone into any scene';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'radial-gradient(900px 500px at 80% -10%, #0c4a3a, #0a0f0d 60%)',
          color: '#e8fff5',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              background: '#00e599',
              color: '#06120d',
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>Neon Image Studio</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            Cast anyone into
          </div>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, color: '#00e599' }}>
            any scene.
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#9fb8ad', maxWidth: 820 }}>
            Upload people, @-mention them in a prompt, and generate together.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, fontSize: 22, color: '#cdeede' }}>
          <div
            style={{
              display: 'flex',
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            @-mention references
          </div>
          <div
            style={{
              display: 'flex',
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            Team workspaces
          </div>
          <div
            style={{
              display: 'flex',
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            Built on Neon
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
