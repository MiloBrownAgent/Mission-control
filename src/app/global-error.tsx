'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: '#060606', color: '#E8E4DF', padding: '2rem', fontFamily: 'system-ui' }}>
        <h1 style={{ color: '#C4533A' }}>Something went wrong</h1>
        <pre style={{ 
          background: '#1A1816', 
          padding: '1rem', 
          borderRadius: '8px', 
          overflow: 'auto',
          fontSize: '13px',
          maxHeight: '300px',
        }}>
          {error.message}
          {'\n\n'}
          {error.stack}
          {error.digest ? `\n\nDigest: ${error.digest}` : ''}
        </pre>
        <button 
          onClick={reset}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#B8956A',
            color: '#060606',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
