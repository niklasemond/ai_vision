import { useState } from 'react'
import VideoStream from './components/VideoStream'
import './App.css'

function App() {
  const [mode, setMode] = useState<'sender' | 'receiver' | null>(null)
  const roomId = 'test-room' // You can make this dynamic later

  return (
    <div className="app">
      <header>
        <h1>Video Stream</h1>
      </header>

      {!mode ? (
        <div className="mode-selection">
          <h2>Select Mode</h2>
          <div className="button-container">
            <button onClick={() => setMode('sender')}>
              Camera (Sender)
            </button>
            <button onClick={() => setMode('receiver')}>
              Viewer (Receiver)
            </button>
          </div>
        </div>
      ) : (
        <div className="stream-container">
          <div className="mode-indicator">
            Mode: {mode === 'sender' ? 'Camera (Sender)' : 'Viewer (Receiver)'}
          </div>
          <VideoStream mode={mode} roomId={roomId} />
          <button className="change-mode" onClick={() => setMode(null)}>
            Change Mode
          </button>
        </div>
      )}
    </div>
  )
}

export default App
