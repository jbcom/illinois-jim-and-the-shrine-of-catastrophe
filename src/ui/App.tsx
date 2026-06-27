/**
 * Root UI shell. Placeholder until the engine + renderer land (directive task 3).
 * Kept intentionally minimal so the config layer produces a buildable, runnable app.
 *
 * SolidJS owns the HUD/menu/overlay layer only; the game canvas is rendered
 * imperatively by the engine and bridged into Solid via signals.
 */
export function App() {
  return (
    <main
      style={{
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "justify-content": "center",
        width: "100%",
        height: "100%",
        "text-align": "center",
        gap: "0.5rem",
      }}
    >
      <h1 style={{ "font-size": "clamp(1.5rem, 6vw, 3rem)" }}>Illinois Jim</h1>
      <p style={{ opacity: 0.7, "font-size": "clamp(0.8rem, 3vw, 1.1rem)" }}>
        and the Shrine of Catastrophe
      </p>
    </main>
  );
}
