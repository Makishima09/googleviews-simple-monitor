import { all, get, run, initDatabase } from '../db';

// Initialize DB
initDatabase().catch(console.error);

export interface User {
  id: number;
  name: string;
  email: string | null;
  telegram_chat_id: string;
  role: 'admin' | 'viewer';
  created_at: string;
}

export interface UserBusiness {
  id: number;
  user_id: number;
  place_id: string;
  role: 'admin' | 'viewer';
  notify_new: number;
  notify_modified: number;
  notify_deleted: number;
  notify_rating: number | null;
  created_at: string;
}

// Create user
export function createUser(name: string, chatId: string, email?: string): number {
  const result = run(
    'INSERT INTO users (name, telegram_chat_id, email) VALUES (?, ?, ?)',
    [name, chatId, email || null]
  );
  return result.lastInsertRowid;
}

// Get user by ID
export function getUserById(id: number): User | undefined {
  return get<User>('SELECT * FROM users WHERE id = ?', [id]);
}

// Get user by chat ID
export function getUserByChatId(chatId: string): User | undefined {
  return get<User>('SELECT * FROM users WHERE telegram_chat_id = ?', [chatId]);
}

// Get all users
export function getAllUsers(): User[] {
  return all<User>('SELECT * FROM users ORDER BY name');
}

// Update user
export function updateUser(id: number, data: { name?: string; email?: string; role?: string }): void {
  const sets: string[] = [];
  const params: any[] = [];

  if (data.name) {
    sets.push('name = ?');
    params.push(data.name);
  }
  if (data.email !== undefined) {
    sets.push('email = ?');
    params.push(data.email);
  }
  if (data.role) {
    sets.push('role = ?');
    params.push(data.role);
  }

  if (sets.length > 0) {
    params.push(id);
    run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  }
}

// Delete user
export function deleteUser(id: number): void {
  run('DELETE FROM users WHERE id = ?', [id]);
}

// Get businesses for user
export function getUserBusinesses(userId: number): UserBusiness[] {
  return all<UserBusiness>(
    'SELECT * FROM user_businesses WHERE user_id = ?',
    [userId]
  );
}

// Add business to user
export function addUserBusiness(
  userId: number,
  placeId: string,
  role: string = 'viewer'
): void {
  run(
    'INSERT OR IGNORE INTO user_businesses (user_id, place_id, role) VALUES (?, ?, ?)',
    [userId, placeId, role]
  );
}

// Remove business from user
export function removeUserBusiness(userId: number, placeId: string): void {
  run(
    'DELETE FROM user_businesses WHERE user_id = ? AND place_id = ?',
    [userId, placeId]
  );
}

// Get users for place (for notifications)
export function getUsersForPlace(placeId: string): User[] {
  return all<User>(`
    SELECT u.* FROM users u
    JOIN user_businesses ub ON u.id = ub.user_id
    WHERE ub.place_id = ? AND ub.notify_new = 1
  `, [placeId]);
}

// Get all admins
export function getAdmins(): User[] {
  return all<User>("SELECT * FROM users WHERE role = 'admin'");
}

// Update user business
export function updateUserBusiness(
  userId: number,
  placeId: string,
  data: { role?: string; notify_new?: number; notify_modified?: number; notify_deleted?: number }
): void {
  const sets: string[] = [];
  const params: any[] = [];

  if (data.role) {
    sets.push('role = ?');
    params.push(data.role);
  }
  if (data.notify_new !== undefined) {
    sets.push('notify_new = ?');
    params.push(data.notify_new);
  }
  if (data.notify_modified !== undefined) {
    sets.push('notify_modified = ?');
    params.push(data.notify_modified);
  }
  if (data.notify_deleted !== undefined) {
    sets.push('notify_deleted = ?');
    params.push(data.notify_deleted);
  }

  if (sets.length > 0) {
    params.push(userId, placeId);
    run(
      `UPDATE user_businesses SET ${sets.join(', ')} WHERE user_id = ? AND place_id = ?`,
      params
    );
  }
}

// Get users count by role
export function getUsersCountByRole() {
  const total = get<{ count: number }>('SELECT COUNT(*) as count FROM users');
  const admin = get<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  const viewer = get<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'viewer'");
  
  return {
    total: total?.count || 0,
    admin: admin?.count || 0,
    viewer: viewer?.count || 0
  };
}