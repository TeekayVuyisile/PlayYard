type Props = { theme: "number" | "timer" | "answer" };

// Decorative CSS geometry, kept outside interactive controls and timer updates.
export function SceneProp({ theme }: Props) {
  return (
    <div className={`scene-prop prop-${theme}`} aria-hidden="true">
      {theme === "number" ? (
        <div className="artifact-orbit">
          <div className="artifact-cube">
            {["front", "back", "left", "right", "top", "bottom"].map((face) => (
              <span key={face} className={`cube-face face-${face}`} />
            ))}
          </div>
        </div>
      ) : theme === "timer" ? (
        <div className="precision-watch">
          <span className="watch-crown" />
          <span className="watch-hand" />
          <span className="watch-pin" />
        </div>
      ) : (
        <div className="floating-notes">
          <span className="note note-one" />
          <span className="note note-two" />
        </div>
      )}
    </div>
  );
}
