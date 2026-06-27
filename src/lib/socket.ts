import { io } from "socket.io-client";

// Mismo origen; en dev Vite reenvía /socket.io al servidor Node.
// Same origin; in dev Vite proxies /socket.io to the Node server.
export const socket = io({ autoConnect: true });

// emit con ack en forma de promesa / promise-based emit with ack.
export function emitAck<T = any>(event: string, payload?: any): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload ?? {}, (res: T) => resolve(res));
  });
}
