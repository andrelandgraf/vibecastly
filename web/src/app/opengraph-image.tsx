import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const alt = 'Vibecastly — cast anyone into any scene';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function dataUri(file: string): string {
  const buf = readFileSync(join(process.cwd(), 'public', 'showcase', file));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

export default function OpengraphImage() {
  const scene = dataUri('scene.jpg');
  const faceA = dataUri('face-a.jpg');
  const faceB = dataUri('face-b.jpg');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: 64,
          gap: 48,
          background: 'radial-gradient(900px 600px at 78% -10%, #0d5a45, #070d0b 62%)',
          color: '#e8fff5',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left: brand + copy */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
              V
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>Vibecastly</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 76, fontWeight: 800, lineHeight: 1.04 }}>
            <div style={{ display: 'flex' }}>Cast anyone</div>
            <div style={{ display: 'flex' }}>into</div>
            <div style={{ display: 'flex', color: '#00e599' }}>any scene.</div>
          </div>

          <div style={{ display: 'flex', fontSize: 26, color: '#9fb8ad', maxWidth: 460 }}>
            Upload people, @-mention them in a prompt, and generate together.
          </div>
        </div>

        {/* Right: the cast -> scene visual */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: 440,
            height: 470,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 410,
              height: 320,
              borderRadius: 28,
              overflow: 'hidden',
              border: '4px solid rgba(255,255,255,0.12)',
              transform: 'rotate(3deg)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
            }}
          >
            <img src={scene} width={410} height={320} style={{ objectFit: 'cover' }} />
          </div>

          {/* overlapping cast avatars */}
          <div style={{ position: 'absolute', top: 40, left: 8, display: 'flex' }}>
            <img
              src={faceA}
              width={96}
              height={96}
              style={{ objectFit: 'cover', borderRadius: '50%', border: '4px solid #0a1411' }}
            />
            <img
              src={faceB}
              width={96}
              height={96}
              style={{
                objectFit: 'cover',
                borderRadius: '50%',
                border: '4px solid #0a1411',
                marginLeft: -28,
              }}
            />
          </div>

          {/* prompt pill */}
          <div
            style={{
              position: 'absolute',
              bottom: 44,
              display: 'flex',
              alignItems: 'center',
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(10,20,17,0.85)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            <span style={{ color: '#00e599' }}>@Mia</span>
            <span style={{ color: '#cdeede', margin: '0 6px' }}>&amp;</span>
            <span style={{ color: '#00e599' }}>@Rex</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
