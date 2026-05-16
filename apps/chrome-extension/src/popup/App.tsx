import "./App.css";

export default function App() {
  return (
    <div style={{ padding: "16px", minWidth: "300px" }}>
      <h2 style={{ marginTop: 0 }}>Capture Screen Recorder</h2>
      <p>Click the extension icon on any webpage to start recording.</p>
      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <strong>Quick Start:</strong>
        <ol style={{ margin: "8px 0", paddingLeft: "20px" }}>
          <li>Navigate to any webpage</li>
          <li>Click the Capture extension icon</li>
          <li>Start recording your screen</li>
        </ol>
      </div>
    </div>
  );
}
