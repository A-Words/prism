package ws

import (
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/prism/server/internal/model"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
	sendBufferSize = 256
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type MessageHandler func(model.WSEnvelope)

type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan model.WSEnvelope
	onMessage MessageHandler
	closeOnce sync.Once
	mu        sync.RWMutex
	closed    bool
}

func NewClient(hub *Hub, conn *websocket.Conn, onMessage MessageHandler) *Client {
	return &Client{
		hub:       hub,
		conn:      conn,
		send:      make(chan model.WSEnvelope, sendBufferSize),
		onMessage: onMessage,
	}
}

func (c *Client) Run() {
	c.hub.Register(c)
	go c.writePump()
	go c.readPump()
}

func (c *Client) readPump() {
	defer c.hub.Unregister(c)
	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		var envelope model.WSEnvelope
		if err := c.conn.ReadJSON(&envelope); err != nil {
			return
		}
		if c.onMessage != nil {
			c.onMessage(envelope)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteJSON(message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) Send(message model.WSEnvelope) {
	c.mu.RLock()
	if c.closed {
		c.mu.RUnlock()
		return
	}
	select {
	case c.send <- message:
		c.mu.RUnlock()
	default:
		c.mu.RUnlock()
		c.hub.Unregister(c)
	}
}

func (c *Client) close() {
	c.closeOnce.Do(func() {
		c.mu.Lock()
		c.closed = true
		close(c.send)
		c.mu.Unlock()
		_ = c.conn.Close()
	})
}
