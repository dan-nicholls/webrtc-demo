import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [sdp, setSDP] = useState("initial value")
  const [status, setStatus] = useState("WAITING")

  function createSDP() {
	return "example SDP"
  }

  return (
    <>
      <h1>WebRTC Demo</h1>
      <div className="card">
	  	<div className="status">Status: {status}</div>
        <button onClick={() => setSDP(() => createSDP())}>
          createSDP
        </button>
		<p>{sdp}</p>
      </div>
    </>
  )
}

export default App
