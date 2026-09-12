export default function LoadingScreen({ screenRef }) {
  return (
    <div
      ref={screenRef}
      className="loading-screen"
      role="status"
      aria-live="polite"
      aria-label="MateGrid64 is loading"
    >
      <div className="text-center">
        <p className="loading-title">MateGrid64</p>
        <p className="mt-3 text-[9px] uppercase tracking-[0.2em] text-[#171713]">
          A pixel chess game
        </p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[#77776f]">
          Loading...
        </p>
      </div>
    </div>
  );
}
