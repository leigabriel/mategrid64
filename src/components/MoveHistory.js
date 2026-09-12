export default function MoveHistory({ moves }) {
  return (
    <section className="history-panel" aria-labelledby="history-title">
      <div className="flex items-center justify-between border-b border-[#deded7] pb-2">
        <h2
          id="history-title"
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
        >
          Moves
        </h2>
        <span className="font-mono text-[9px] text-[#77776f]">{moves.length}</span>
      </div>
      {moves.length === 0 ? (
        <p className="py-5 text-center font-mono text-[10px] text-[#8b8b83]">
          No moves yet
        </p>
      ) : (
        <ol className="move-list">
          {Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => (
            <li key={index} className="move-row">
              <span>{index + 1}.</span>
              <span>{moves[index * 2]?.notation}</span>
              <span>{moves[index * 2 + 1]?.notation || ""}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
