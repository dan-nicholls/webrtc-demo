import WebSocket from "ws";
import { Message } from "./messages.js"

const WS_URL = "ws://localhost:5555/test"

class SignalingClient {
	static State = {
		DISCONNECTED: 'disconnected',
		CONNECTING: "connected",
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
		})

		this.ws.addEventListener('close', () => {
			this.onLog('ws close')
		})

		this.ws.addEventListener('message', (event) => {
			this.onLog('ws message: %s', event.data)

			try {
				const msg = JSON.parse(event.data)
			} catch(e) {
				this.onError(e)
			}
		})
	}

	disconnect() {
		if (this.ws) {
			try{
				this.ws.close()
			} catch(e) {
				this.onError(e)
			}
		}
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

await waitForState(client, "IN_CALL")
