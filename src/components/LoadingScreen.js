export default function LoadingScreen({ isExiting }) {
  return (
    <div
      className={`loading-screen ${isExiting ? "loading-screen-exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="MateGrid64 is loading"
    >
      <div className="text-center">
        <p className="loading-title">MateGrid64</p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[#77776f]">
          Loading...
        </p>
      </div>
    </div>
  );
}
