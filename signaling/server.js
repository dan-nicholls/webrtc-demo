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

function createWelcome(clientId) { 
	return { type: "welcome", id: clientId }
}

function createJoined(clientId, roomId, peers) { 
	return {
		type: "joined",
		room: roomId,
		id: clientId,
		peers: peers,
		iceConfig: []
	}
}

function createPeerJoined(roomId, peerId) { 
	return {
		type: "peer-joined",
		room: roomId,
		id: peerId,
	}
}

function createPeerLeft(peerId, reason) { 
	return {
		type: "peer-left",
		id: peerId,
		reason: reason
	}
}

function createLeft(conn, roomId) { 
	return { type: "left", room: roomId }
}

function sendSignal() { pass }


// TODO - write this
function broadcastToRoom(roomId, message, excludeId = null) {
	console.log(`Broadcasting ${message.type} to room ${roomId}`)
	let room = rooms.get(roomId)
	if (!room) {
		console.error("error broadcasting. unknown room: ", roomId)
	}

	for(let peerId of room) {
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
	sendMessage(conn, createWelcome(clientId))

	// Handle signaling messages
	// TODO - Handle join, leave, offer, answer, ice, ping
	conn.on('message', function message(raw) {
		let msg = JSON.parse(raw)
		switch (msg.type) {
			case 'join':
				console.log('recieved join: %s', raw)
				// Check if client is in client list
				let client = clients.get(clientId)
				if (!client) {
					console.error("client not in client list: ${clientId}")
				}
				
				let roomId = msg.room
				if (!roomId || roomId.length === 0) {
					console.error("invalid room")
				}
				
				if (!rooms.get(roomId)) {
					rooms.set(roomId, new Set())
				}

				client.roomId = roomId
				let peers = [...rooms.get(roomId)]
				sendMessage(conn, createJoined(clientId, roomId, peers ))
				
				// Return Join message.
				broadcastToRoom(roomId, createPeerJoined(roomId, clientId), clientId)

				rooms.get(roomId).add(clientId)
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
		clients.delete(clientId)
		
		if (roomId) {
			rooms.get(roomId)?.delete(clientId)
			broadcastToRoom(roomId, createPeerLeft(clientId, "disconnected"))
			if (rooms.get(roomId)?.size === 0) rooms.delete(roomId) 
		}
		console.log("client disconnected: %s", clientId)
	})
})
