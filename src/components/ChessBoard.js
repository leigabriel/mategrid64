import { forwardRef } from "react";
import ChessSquare from "@/components/ChessSquare";
import ChessPiece from "@/components/ChessPiece";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

const ChessBoard = forwardRef(function ChessBoard({
  game,
  selectedSquare,
  legalMoves,
  isInputLocked,
  onSelect,
  animatingFrom = null,
  animatingTo = null,
  animationPiece = null,
  captureSquare = null,
}, ref) {
  const checkedKing = ["check", "checkmate"].includes(game.status)
    ? game.board.findIndex(
        (piece) => piece?.type === "king" && piece.color === game.turn,
      )
    : -1;

  return (
    <div className="board-coordinate-grid" ref={ref} data-board-scene>
      <div className="rank-coordinates" aria-hidden="true">
        {ranks.map((rank) => (
          <span key={rank}>{rank}</span>
        ))}
      </div>
      <div className={`board-frame ${isInputLocked ? "board-input-locked" : ""}`}>
        <div
          id="board"
          className="chess-board"
          role="group"
          aria-label={`Chess board. ${game.turn} to move.`}
        >
          {game.board.map((piece, index) => {
            const row = Math.floor(index / 8);
            const column = index % 8;
            const isLegal = legalMoves.includes(index);
            const movingPiece =
              selectedSquare === null ? null : game.board[selectedSquare];
            const isEnPassantCapture =
              isLegal &&
              !piece &&
              movingPiece?.type === "pawn" &&
              selectedSquare % 8 !== column;

            return (
              <ChessSquare
                key={`${files[column]}${8 - row}`}
                index={index}
                file={files[column]}
                rank={8 - row}
                tone={(row + column) % 2 === 0 ? "light" : "dark"}
                piece={piece}
                isSelected={selectedSquare === index}
                isLegal={isLegal}
                isCapture={isLegal && (Boolean(piece) || isEnPassantCapture)}
                isLastMove={
                  game.lastMove?.from === index || game.lastMove?.to === index
                }
                isCheck={checkedKing === index}
                isCaptureFlash={captureSquare === index}
                isAnimatingFrom={animatingFrom === index}
                onSelect={onSelect}
              />
            );
          })}
          {animationPiece && (
            <div
              className="move-animation-overlay"
              style={{
                position: "absolute",
                width: "12.5%",
                height: "12.5%",
                zIndex: 10,
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
              }}
            >
              <ChessPiece type={animationPiece.type} color={animationPiece.color} />
            </div>
          )}
        </div>
      </div>
      <div className="file-coordinates" aria-hidden="true">
        {files.map((file) => (
          <span key={file}>{file}</span>
        ))}
      </div>
    </div>
  );
});

export default ChessBoard;
