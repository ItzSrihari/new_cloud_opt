package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// SSEBroker coordinates Server-Sent Events broadcasting
type SSEBroker struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

func NewSSEBroker() *SSEBroker {
	return &SSEBroker{
		clients: make(map[chan []byte]struct{}),
	}
}

func (b *SSEBroker) AddClient(ch chan []byte) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.clients[ch] = struct{}{}
}

func (b *SSEBroker) RemoveClient(ch chan []byte) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if _, ok := b.clients[ch]; ok {
		delete(b.clients, ch)
		close(ch)
	}
}

func (b *SSEBroker) ClientCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.clients)
}

func (b *SSEBroker) Broadcast(eventType string, data any) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if len(b.clients) == 0 {
		return
	}

	payloadMap := make(map[string]any)
	if m, ok := data.(map[string]any); ok {
		for k, v := range m {
			payloadMap[k] = v
		}
	} else {
		// Serialize and deserialize to generic map
		bytes, err := json.Marshal(data)
		if err == nil {
			_ = json.Unmarshal(bytes, &payloadMap)
		}
	}
	payloadMap["type"] = eventType

	rawJSON, err := json.Marshal(payloadMap)
	if err != nil {
		return
	}

	msg := fmt.Sprintf("data: %s\n\n", string(rawJSON))
	bytesMsg := []byte(msg)

	for ch := range b.clients {
		select {
		case ch <- bytesMsg:
		default:
			// Non-blocking drop if channel buffer is full
		}
	}
}

// ServeHTTP handles incoming SSE client connections
func (b *SSEBroker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Send initial connected event
	initMsg := fmt.Sprintf("data: {\"type\":\"connected\",\"time\":%q}\n\n", time.Now().UTC().Format(time.RFC3339))
	_, _ = w.Write([]byte(initMsg))
	flusher.Flush()

	msgChan := make(chan []byte, 32)
	b.AddClient(msgChan)
	defer b.RemoveClient(msgChan)

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-msgChan:
			if !ok {
				return
			}
			_, err := w.Write(msg)
			if err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

