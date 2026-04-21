// DB initialization middleware for API routes
import { initDatabase } from '../db';

export async function withDb() {
  await initDatabase();
}