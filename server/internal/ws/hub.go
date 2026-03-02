package ws

import (
	"context"

	"github.com/prism/server/internal/model"
)

const (
	registerBufferSize   = 100
	unregisterBufferSize = 100
	broadcastBufferSize  = 2048
)

type Hub struct {
	register   chan *Client
	unregister chan *Client
	broadcast  chan model.WSEnvelope
	clients    map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client, registerBufferSize),
		unregister: make(chan *Client, unregisterBufferSize),
		broadcast:  make(chan model.WSEnvelope, broadcastBufferSize),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			for client := range h.clients {
				client.close()
				delete(h.clients, client)
			}
			return
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; !ok {
				continue
			}
			delete(h.clients, client)
			client.close()
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					delete(h.clients, client)
					client.close()
				}
			}
		}
	}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) Broadcast(message model.WSEnvelope) {
	h.broadcast <- message
}
