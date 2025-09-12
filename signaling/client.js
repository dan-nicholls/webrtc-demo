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

		this.onError = (err) => console.error("[SignalingClient] ", err)
		this.onLog = (...args) => console.log("[SignalingClient] ", ...args)
	}

	setState(state) {
		this.onLog(`changing state ${this.state} -> ${state}`)
		this.state = state;
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
				if (this.state === SignalingClient.State.CONNECTED) {
					this.clientId = msg.clientId
					this.setState(SignalingClient.State.WELCOMED)
					this.onLog("received welcome")
				}
				break;
			case 'join':
				if (this.state === SignalingClient.State.WELCOMED) {
					this.roomId = msg.roomId
					this.setState(SignalingClient.State.JOINED)
					this.onLog("joined room")
				}
				break;
			case 'leave':
			case 'offer':
			case 'answer':
			case 'ice':
			case 'ping':
			case 'error':
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
				roomId: room,
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
		if (this.ws) {
			try{
				this.ws.close()
			} catch(e) {
				this.onError(e)
			}
		}
		this.ws = null
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
