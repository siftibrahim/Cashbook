import { Response } from 'express';

interface ClientConnection {
  id: string;
  userId: string;
  res: Response;
  role?: string;
}

class RealtimeEventBus {
  private clients: Map<string, ClientConnection> = new Map();

  /**
   * Register a new SSE client
   */
  public addClient(id: string, userId: string, res: Response, role?: string) {
    this.clients.set(id, { id, userId, res, role });

    // Handle client disconnect
    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  /**
   * Remove a client connection
   */
  public removeClient(id: string) {
    this.clients.delete(id);
  }

  /**
   * Broadcast an event to a specific user (or all users if userId is 'all')
   */
  public broadcastToUser(userId: string, eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const client of this.clients.values()) {
      if (userId === 'all' || client.userId === userId || client.userId === 'admin_broadcast') {
        try {
          client.res.write(payload);
        } catch (err) {
          console.warn(`[Realtime SSE] Failed to write to client ${client.id}:`, err);
        }
      }
    }
  }

  /**
   * Broadcast specifically to Admins
   */
  public broadcastToAdmins(eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const client of this.clients.values()) {
      if (client.role === 'super_admin' || client.role === 'admin') {
        try {
          client.res.write(payload);
        } catch (err) {
          console.warn(`[Realtime SSE] Failed to write to admin client ${client.id}:`, err);
        }
      }
    }
  }

  /**
   * Get active connected clients count
   */
  public getConnectedCount(): number {
    return this.clients.size;
  }
}

export const realtimeEvents = new RealtimeEventBus();
