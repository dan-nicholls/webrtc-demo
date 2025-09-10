import WebSocket, { WebSocketServer } from 'ws'
import { Message } from "./messages.js"
import { v4 as uuidv4 } from 'uuid'

const SERVER_ID = "SERV_123"
const SERVER_PORT = 5555

console.log("Starting server on port %s", SERVER_PORT)

const ws = new WebSocketServer({ port: SERVER_PORT })

const clients = new Map();

function sendMessage(conn, obj) {
	try {
		conn.send(JSON.stringify(obj))
	} catch(e) {
		console.error(e)
	}
}

// TODO - write this
function broadcastToRoom(roomId, message, excludeId = null) {
	console.log("Broadcasting to room %s", roomId)
}

ws.on('connection', function connection(conn, req) {
	const clientId = uuidv4()
	clients.set(clientId, { socket: conn, room: null })
	console.info("client connected: %s", req.socket.remoteAddress)

	// Send welcome message
	sendMessage(conn, {type: 'welcome', clientId })

	// Handle signaling messages
	// TODO - Handle join, leave, offer, answer, ice, ping
	conn.on('message', function message(raw) {
		console.log('recieved %s', raw)
	})
	
	// Handle error
	conn.on('error', (err) => {
		console.error({ clientId, err })
	})

	// Handle close
	conn.on('close', ()=> {
		const client = clients.get(clientId)
		if (!client) return
		const roomId = client.roomId
		if (roomId) {
			broadcastToRoom(roomId, { type: 'leave', clientId }, clientId)
		}
		clients.delete(clientId)
		console.log("client disconnected: %s", clientId)
	})
})
