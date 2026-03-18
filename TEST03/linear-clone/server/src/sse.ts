import { Response } from 'express';

export const sseClients = new Set<Response>();

export function broadcast(type: string, payload?: any) {
  const data = JSON.stringify({ type, payload });
  sseClients.forEach(client => client.write(`data: ${data}\n\n`));
}
