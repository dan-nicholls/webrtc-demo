import WebSocket, { WebSocketServer } from 'ws'
import { Message } from "./messages.js"
import { v4 as uuidv4 } from 'uuid'

const SERVER_ID = "SERV_123"
const SERVER_PORT = 5555

console.log("Starting server on port %s", SERVER_PORT)

const ws = new WebSocketServer({ port: SERVER_PORT })

const clients = new Map();
const rooms = new Map();

function sendMessage(conn, obj) {
	console.log(`Sending ${obj.type} to ${obj.to}`)
	try {
		conn.send(JSON.stringify(obj))
	} catch(e) {
		console.error(e)
	}
}

// TODO - write this
function broadcastToRoom(roomId, message, excludeId = null) {
	console.log("Broadcasting to room %s", roomId)
	let room = rooms.get(roomId)
	if (!room) {
		console.error("error broadcasting. unknown room: ", roomId)
	}

	for(let peerId of room.peers) {
		if (excludeId && peerId === excludeId) {
			continue
		}
		let client = clients.get(peerId)
		if (!client) {
			console.error(`no client with peerId ${peerId}`)
			continue
		}
		message.to = peerId
		message.room = roomId
		sendMessage(client.socket, message)
	}
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
		let msg = JSON.parse(raw)
		switch (msg.type) {
			case 'join':
				console.log('recieved join: %s', raw)
				// Check if client is in client list
				if (!clients.get(clientId)) {
					console.error("client doesnt exist: ", msg.clientId)
				}
				clients.get(clientId).roomId = msg.roomId
				// check if room != null
				// Change rooms:
				if (!rooms.get(msg.roomId)) {
					rooms.set(msg.roomId, {
						peers: []
					})
				}
				// 	2. Update rooms list
				rooms.get(msg.roomId).peers = [...rooms.get(msg.roomId).peers, msg.from]
				// Return Join message.
				broadcastToRoom(msg.roomId, {type: 'join', room: msg.roomId, from: msg.from })
				break;
			case 'leave':
				console.log('recieved leave: %s', raw)
				break;
			case 'offer':
				console.log('recieved offer: %s', raw)
				break;
			case 'answer':
				console.log('recieved answer: %s', raw)
				break;
			case 'ice':
				console.log('recieved ice: %s', raw)
				break;
			case 'ping':
				console.log('recieved ping: %s', raw)
				break;
			default:
				console.error("invalid message type: %s", msg.type)
		}
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
