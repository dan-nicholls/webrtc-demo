import WebSocket from "ws";
import { Message } from "./messages.js"

const WS_URL = "ws://localhost:5555/test"

class SignalingClient {
	static State = {
		DISCONNECTED: 'disconnected',
		CONNECTING: "connecting",
		CONNECTED: 'connected',
		WELCOMED: 'welcomed',
		JOINED: 'joined',
		IN_CALL: 'in_call'
	}

	constructor(wsUrl, opts = {}) {
		this.wsUrl = wsUrl

		this.state = SignalingClient.State.DISCONNECTED
		this.ws = null;
		this.clientId = null;
		this.roomId = null;
		this.peers = new Set();

		this.onError = (err) => console.error("[SignalingClient] ", err)
		this.onLog = (...args) => console.log("[SignalingClient] ", ...args)
	}

	setState(state) {
		this.onLog(`changing state ${this.state} -> ${state}`)
		this.state = state;
	}

	_setClientId(clientId){
		this.clientId = clientId
		this.onLog(`client ID assigned ${clientId}`)
	}

	connect() {
		if (this.state !== SignalingClient.State.DISCONNECTED) { return }
		this.setState(SignalingClient.State.CONNECTING)

		try {
			this.ws = new WebSocket(this.wsUrl)
		} catch (e) {
			this.onError(e)
			this.setState(SignalingClient.State.DISCONNECTED)
			return
		}

		this.ws.addEventListener('error', (err) => {
			this.onLog('ws error', err)
		})

		this.ws.addEventListener('open', () => {
			this.onLog('ws open')
			this.setState(SignalingClient.State.CONNECTED)
		})

		this.ws.addEventListener('close', (event) => {
			this.onLog('ws close: ', event.code, event.reason)
			this.disconnect()
		})

		this.ws.addEventListener('message', (event) => {
			this.onLog('ws message: ', event.data)

			let msg
			try {
				msg = JSON.parse(event.data)
			} catch(e) {
				this.onError(e)
				return
			}
			this._onMessage(msg)
		})
	}

	_onMessage(msg) {
		switch (msg.type) {
			case 'welcome':
				this.onLog(`handling ${msg.type}`)
				if (this.state === SignalingClient.State.CONNECTED) {
					this._setClientId(msg.id)
					this.setState(SignalingClient.State.WELCOMED)
					this.onLog("received welcome")
				}
				break;
			case 'joined':
				this.onLog(`handling ${msg.type}`)
				this.onLog(typeof msg.peers)
				this.onLog(msg)
				// Welcome to the user
				if (this.state === SignalingClient.State.WELCOMED) {
					this.roomId = msg.room
					for(let peer of msg.peers) {
						console.log(peer)
						this.peers.add(peer)
					}
					this.setState(SignalingClient.State.JOINED)
					this.onLog("joined room")
				}
				break;
			case 'peer-joined':
				this.onLog(`handling ${msg.type}`)
				if (this.state === SignalingClient.State.JOINED) {
					if (this.roomId !== msg.room) {
						console.log("not right room")
						break
					}
					
					if (this.peers.has(msg.id)) {
						this.onLog(`peer already in peer list: ${msg.id}`)
						break
					}
					this.peers.add(msg.id)
				}
				break;
			case 'leave':
				this.onLog(`handling ${msg.type}`)
				break;
			case 'peer-left':
				this.onLog(`handling ${msg.type}`)
				if (this.state === SignalingClient.State.JOINED) {
					if (this.roomId !== msg.room) {
						console.log("not right room")
						break
					}

					if (!this.peers.has(msg.id)) {
						this.onLog(`peer with id ${msg.id} not found in peer-list`)
						break
					}

					this.peers.delete(msg.id)
				}
				break
			case 'offer':
			case 'answer':
			case 'ice':
			case 'ping':
			case 'error':
				this.onLog(`handling ${msg.type}`)
				this.onLog(`server error: `, e)
			default:
				this.onLog(`${msg.type} recieved`)
				break
		}
	}

	joinRoom(room) {
		if (this.state === SignalingClient.State.WELCOMED) {
			// Send Message JOIN message
			if (room === this.roomId) {
				this.onError('already in room: ', this.roomId)
			}

			this._sendWSMessage({
				type: 'join',
				room: room,
			})
		}
	}

	_sendWSMessage(obj) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			this.onLog('ws not open ', obj.type);
			return
		}

		if (this.clientId) obj.from = this.clientId
		try {
			let data = JSON.stringify(obj)
			this.ws.send(data)
		} catch(e) {
			this.onError(e)
		}
	}

	disconnect() {
		if (this.ws) try { this.ws.close() } catch(e) {}
		this.setState(SignalingClient.State.DISCONNECTED)
	}
}



async function waitForState(client, goalState, timeoutMs = 3000) {
	while (client.state !== goalState) {
		await new Promise(r => setTimeout(r, timeoutMs))
	}
}

let client = new SignalingClient(WS_URL)
client.connect()

await waitForState(client, SignalingClient.State.WELCOMED)
client.joinRoom('testRoom')
await waitForState(client, SignalingClient.State.DISCONNECTED)
