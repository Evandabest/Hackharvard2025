/**
 * Durable Object for managing run state and WebSocket connections
 */

export interface RunState {
  phase: string;
  percent: number;
  lastMessage: string;
  lastUpdated: number;
}

export interface UpdatePayload {
  phase?: string;
  percent?: number;
  message?: string;
}

export interface WebSocketMessage {
  type: 'progress' | 'message' | 'done' | 'error';
  data: any;
  timestamp: number;
}

export class RunRoom {
  private state: DurableObjectState;
  private sessions: Set<WebSocket>;
  private runState: RunState;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.sessions = new Set();
    this.runState = {
      phase: 'pending',
      percent: 0,
      lastMessage: 'Initializing...',
      lastUpdated: Date.now(),
    };

    // Restore state from storage
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<RunState>('runState');
      if (stored) {
        this.runState = stored;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // WebSocket upgrade endpoint
    if (path === '/ws') {
      return this.handleWebSocket(request);
    }

    // REST API endpoints
    if (path === '/status' && request.method === 'GET') {
      return Response.json(this.runState);
    }

    if (path === '/update' && request.method === 'POST') {
      const payload = await request.json<UpdatePayload>();
      await this.update(payload);
      return Response.json({ success: true });
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Handle WebSocket upgrade and connection
   */
  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();
    this.sessions.add(server);

    // Send current state immediately
    this.sendToClient(server, {
      type: 'progress',
      data: this.runState,
      timestamp: Date.now(),
    });

    // Handle WebSocket events
    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    server.addEventListener('error', () => {
      this.sessions.delete(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Update run state and broadcast to all connected clients
   */
  async update(payload: UpdatePayload): Promise<void> {
    const updated: RunState = {
      ...this.runState,
      ...payload,
      lastUpdated: Date.now(),
    };

    if (payload.phase) updated.phase = payload.phase;
    if (payload.percent !== undefined) updated.percent = payload.percent;
    if (payload.message) updated.lastMessage = payload.message;

    this.runState = updated;

    // Persist to storage
    await this.state.storage.put('runState', this.runState);

    // Broadcast to all connected clients
    this.broadcast({
      type: 'progress',
      data: this.runState,
      timestamp: Date.now(),
    });
  }

  /**
   * Send a message to all connected WebSocket clients
   */
  broadcast(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);

    for (const session of this.sessions) {
      try {
        session.send(payload);
      } catch (error) {
        // Remove failed sessions
        this.sessions.delete(session);
      }
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(client: WebSocket, message: WebSocketMessage): void {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message to client:', error);
    }
  }

  /**
   * Get current state
   */
  getState(): RunState {
    return { ...this.runState };
  }
}

