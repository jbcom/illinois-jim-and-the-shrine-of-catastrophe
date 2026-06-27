/**
 * Root UI shell. Placeholder until the engine + renderer land (directive task 3).
 * Kept intentionally minimal so the config layer produces a buildable, runnable app.
 */
export function App() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        textAlign: "center",
        gap: "0.5rem",
      }}
    >
      <h1 style={{ fontSize: "clamp(1.5rem, 6vw, 3rem)" }}>Illinois Jim</h1>
      <p style={{ opacity: 0.7, fontSize: "clamp(0.8rem, 3vw, 1.1rem)" }}>
        and the Shrine of Catastrophe
      </p>
    </main>
  );
}
