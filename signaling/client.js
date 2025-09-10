import WebSocket from "ws";
import { Message } from "./messages.js"

const ws = new WebSocket("ws://localhost:5555/test")

ws.on('error', console.error)

ws.on('open', function open() {
	console.log("client started")
	ws.send(JSON.stringify(new Message("join", "Room1", "CLIENT2_ID", "CLIENT1_ID", "test data")))

	ws.on('message', function message(data) {
		console.log("rec: %s", data)
	})
})

ws.on('messge', function message(data) {
	console.log("recieved: %s", data)
})
