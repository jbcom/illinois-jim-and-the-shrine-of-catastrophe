/**
 * RotatePrompt — full-screen overlay shown when a phone user holds the device in
 * portrait while gameplay is active. Instructs them to rotate to landscape.
 *
 * Only rendered for phones (where `lockLandscape` is true). Tablets, unfolded
 * foldables, and desktop never trigger this — they play in any orientation.
 */

export function RotatePrompt() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        color: "#fff",
        fontFamily: "monospace",
        textAlign: "center",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      {/* Rotation icon (CSS-only, no assets) */}
      <div
        style={{
          fontSize: "4rem",
          lineHeight: 1,
          animation: "jim-rotate-hint 1.2s ease-in-out infinite alternate",
        }}
        aria-hidden="true"
      >
        📱
      </div>
      <p
        style={{
          fontSize: "1.25rem",
          fontWeight: "bold",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        Rotate to Play
      </p>
      <p
        style={{
          fontSize: "0.875rem",
          opacity: 0.7,
          margin: 0,
          maxWidth: "18rem",
        }}
      >
        Turn your phone to landscape mode to explore the shrine.
      </p>
      <style>{`
        @keyframes jim-rotate-hint {
          from { transform: rotate(0deg); }
          to   { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}
