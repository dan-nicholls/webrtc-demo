import { useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [status, setStatus] = useState("WAITING")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const [localStream, setLocalStream] = useState(null)
  const [peerConn, setPeerConn] = useState<RTCPeerConnection>(null)

  const [offerText, setOfferText] = useState("")
  const [answerText, setAnswerText] = useState("")

  const [remoteOfferText, setRemoteOfferText] = useState("")
  const [remoteAnswerText, setRemoteAnswerText] = useState("")

  const [localIceText, setLocalIceText] = useState("")
  const [remoteIceText, setRemoteIceText] = useState("")

  const copyToClipboard = async (text) => {
	try {
		await navigator.clipboard.writeText(text)
		console.log("Copied to clipboard")
	} catch (e) {
		console.error("Failed to copy text: ", e)
	}
  }

  const ensurePeerConn = () => {
	if (peerConn) return peerConn
	
	const peer = new RTCPeerConnection({
		iceServers: [{
			urls: ["stun:stun.l.google.com:19302"]
		}]
	})

	peer.ontrack = (e) => {
		if (remoteVideoRef.current) {
			remoteVideoRef.current.srcObject = e.streams[0]
		}
	}

	peer.onicecandidate = (e) => {
		if (e.candidate) {
			const line = JSON.stringify(e.candidate)
			setLocalIceText((prev) => (prev ? prev + "\n" + line : line))
		} else {
			console.log("complete ICE gathering")
		}
	}

	peer.oniceconnectionstatechange = () => {
		console.log("iceConnectionState:", peer.iceConnectionState)
	}

	peer.onconnectionstatechange = () => {
		setStatus(peer.connectionState.toUpperCase())
	}

	setPeerConn(peer)
	return peer
  }

  const startCamera = async () => {
	const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
	if (localVideoRef.current) {
		localVideoRef.current.srcObject = stream
	}
	setLocalStream(stream)
	
	const peer = ensurePeerConn();
	stream.getTracks().forEach((track) => {
		peer.addTrack(track, stream)
	})
  }

  const createOffer = async () => {
	const peer = ensurePeerConn()
	const offer = await peer.createOffer()
	await peer.setLocalDescription(offer)
	const offerString = JSON.stringify(peer.localDescription)
	setOfferText(offerString)
	await copyToClipboard(offerString)
  }

  const handleRemoteOffer = async () => {
	console.log("handling remote offer")
	const peer = ensurePeerConn()
	const desc = JSON.parse(remoteOfferText.trim())
	if (desc.type !== "offer") {
		alert("Expected SDP type of 'offer'")
		return
	}
	await peer.setRemoteDescription(desc)
 }

 const createAnswer = async () => {
	console.log("creating answer")
	const peer = ensurePeerConn()
	if (!peer.remoteDescription) {
		alert("Set a valid remote description")
		return
	}
	const answer = await peer.createAnswer()
	await peer.setLocalDescription(answer)
	const answerString = JSON.stringify(peer.localDescription)
	setAnswerText(answerString)
	await copyToClipboard(answerString)
 }

  const handleRemoteAnswer = async () => {
	console.log("handling remote answer")
	const peer = ensurePeerConn()
	const desc = JSON.parse(remoteAnswerText.trim())
	if (desc.type !== "answer") {
		alert("Expected SDP type of 'offer'")
		return
	}
	await peer.setRemoteDescription(desc)
  }

  const handleRemoteIce = async () => {
	console.log("handling remote ICE")
	const peer = ensurePeerConn()
	const lines = remoteIceText.split("\n").map(line => line.trim()).filter(Boolean);
	for (const line of lines){
		try {
			const candidate = JSON.parse(line)
			await peer.addIceCandidate(candidate)
		} catch(e) {
			console.error("Failed to add candidate: ", e, "line: ", line)
			return
		}
	}
	setRemoteIceText("")
  }

  return (
    <>
      <h1>WebRTC Demo</h1>
	  <div className="row">
		<video id="localVideo" autoPlay muted playsInline ref={localVideoRef}></video>
		<video id="remoteVideo" autoPlay playsInline ref={remoteVideoRef}></video>
	  </div>
	  <div className="card">
		<div className="status">Status: {status}</div>
	  </div>
	  <div id="controls-container">
	  	<div id="caller-container">
	  	  <h2>Caller</h2>
		  <div className="row">
			<button id="cameraStart" onClick={startCamera}>1) Setup Camera</button>
		  </div>
		  <div className="row">
			<button id="offerCreate" onClick={createOffer}>2a) Create Offer</button>
			<textarea id="offerArea" readOnly value={offerText} onChange={(e)=>setOfferText(e.target.value)}></textarea>
		  </div>
		  <div className="row">
			<button id="remoteAnswerButton" onClick={handleRemoteAnswer}>3b) Handle Answer</button>
			<textarea id="remoteAnswerTextBox" value={remoteAnswerText} onChange={(e)=>setRemoteAnswerText(e.target.value)}></textarea>
		  </div>
		</div>
		<div id="callee-container">
	  	  <h2>Callee</h2>
		  <div className="row">
			<button id="cameraStart" onClick={startCamera}>1) Setup Camera</button>
		  </div>
		  <div className="row">
			<button id="remoteOfferSet" onClick={handleRemoteOffer}>2b) Set Remote Offer</button>
			<textarea id="remoteOfferArea" value={remoteOfferText} onChange={(e)=>setRemoteOfferText(e.target.value)}></textarea>
		  </div>
		  <div className="row">
			<button id="answerButton" onClick={createAnswer}>3a) Create Answer</button>
			<textarea id="answerTextBox" readOnly value={answerText} onChange={(e)=>setAnswerText(e.target.value)}></textarea>
		  </div>
		</div>
		</div>
		<div className="ICE">
		  <h2>ICE</h2>
		  <div className="row">
			<textarea id="localIceTextBox" readOnly value={localIceText} onChange={(e)=>setLocalIceText(e.target.value)}></textarea>
		  </div>
		  <div className="row">
			<textarea id="remoteIceTextBox" value={remoteIceText} onChange={(e)=>setRemoteIceText(e.target.value)}></textarea>
			<button id="remoteIceButton" onClick={handleRemoteIce}>3b) Handle Answer</button>
		  </div>
		</div>
    </>
  )
}

export default App
