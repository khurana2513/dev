import '../styles/loading.css';

interface LoadingScreenProps {
  /** Optional context label shown below the sweep line. e.g. "Mental Math" */
  context?: string;
  /** true = position:fixed fullscreen overlay. Default: true */
  fullScreen?: boolean;
  /** true = semi-transparent bg with blur, for overlays on content. Default: false */
  transparent?: boolean;
}

export function LoadingScreen({
  context,
  fullScreen = true,
  transparent = false,
}: LoadingScreenProps) {
  return (
    <div
      className={[
        'th-loading',
        fullScreen  ? 'th-loading--fullscreen'  : 'th-loading--inline',
        transparent ? 'th-loading--transparent' : '',
      ].filter(Boolean).join(' ')}
      role="status"
      aria-label={context ? `Loading ${context}` : 'Loading BlackMonkey'}
      aria-live="polite"
    >
      {/* Atmospheric glow */}
      <div className="th-loading__glow" aria-hidden="true" />

      <div className="th-loading__content">

        {/* Logo */}
        <div className="th-loading__brand" aria-hidden="true">
          <img
            src="/imagesproject/logo.ico.jpg"
            alt="BlackMonkey"
            style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', animation: 'th-logo-float 3s ease-in-out infinite' }}
          />
        </div>

        {/* Sweeping gradient line */}
        <div className="th-loading__line-track" aria-hidden="true">
          <div className="th-loading__line-fill" />
        </div>

        {/* Context label — only renders when prop is provided */}
        {context && (
          <p className="th-loading__context">{context}</p>
        )}

      </div>
    </div>
  );
}

export default LoadingScreen;
