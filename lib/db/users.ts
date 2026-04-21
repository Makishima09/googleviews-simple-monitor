import { db } from './schema';

// ============================================
// Types
// ============================================

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
  notify_new: boolean;
  notify_modified: boolean;
  notify_deleted: boolean;
  notify_rating: number | null;
  created_at: string;
}

export interface CreateUserInput {
  name: string;
  telegram_chat_id: string;
  email?: string;
  role?: 'admin' | 'viewer';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: 'admin' | 'viewer';
}

export interface UserWithBusinesses extends User {
  businesses: UserBusiness[];
}

// ============================================
// User CRUD Operations
// ============================================

/**
 * Create a new user
 * @returns The new user ID
 */
export function createUser(input: CreateUserInput): number {
  const role = input.role || 'viewer';
  
  const stmt = db.prepare(`
    INSERT INTO users (name, telegram_chat_id, email, role)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    input.name,
    input.telegram_chat_id,
    input.email || null,
    role
  );
  
  console.log(`[USERS] Created user: id=${result.lastInsertRowid}, name=${input.name}, role=${role}`);
  return result.lastInsertRowid as number;
}

/**
 * Get user by ID
 */
export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

/**
 * Get user by Telegram chat ID
 */
export function getUserByChatId(chatId: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE telegram_chat_id = ?')
    .get(chatId) as User | undefined;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

/**
 * Get all users
 */
export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY name').all() as User[];
}

/**
 * Get all users with their associated businesses
 */
export function getAllUsersWithBusinesses(): UserWithBusinesses[] {
  const users = getAllUsers();
  return users.map(user => ({
    ...user,
    businesses: getUserBusinesses(user.id)
  }));
}

/**
 * Update a user
 * @returns true if updated, false if not found
 */
export function updateUser(id: number, input: UpdateUserInput): boolean {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  
  if (input.name !== undefined) {
    sets.push('name = ?');
    params.push(input.name);
  }
  if (input.email !== undefined) {
    sets.push('email = ?');
    params.push(input.email || null);
  }
  if (input.role !== undefined) {
    sets.push('role = ?');
    params.push(input.role);
  }
  
  if (sets.length === 0) {
    return false;
  }
  
  params.push(id);
  
  const stmt = db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`);
  const result = stmt.run(...params);
  
  console.log(`[USERS] Updated user: id=${id}, changes=${result.changes}`);
  return result.changes > 0;
}

/**
 * Delete a user and their business associations
 */
export function deleteUser(id: number): boolean {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  console.log(`[USERS] Deleted user: id=${id}, changes=${result.changes}`);
  return result.changes > 0;
}

/**
 * Get or create a user by Telegram chat ID
 * Useful for Telegram bot integration
 */
export function getOrCreateUser(name: string, chatId: string, email?: string): {
  user: User;
  isNew: boolean;
} {
  const existing = getUserByChatId(chatId);
  
  if (existing) {
    return { user: existing, isNew: false };
  }
  
  const id = createUser({ name, telegram_chat_id: chatId, email });
  return { user: getUserById(id)!, isNew: true };
}

// ============================================
// User-Business Associations
// ============================================

/**
 * Add a business (place) to a user
 * @returns The new association ID
 */
export function addUserBusiness(
  userId: number,
  placeId: string,
  role: 'admin' | 'viewer' = 'viewer',
  notifyConfig?: {
    notify_new?: boolean;
    notify_modified?: boolean;
    notify_deleted?: boolean;
    notify_rating?: number | null;
  }
): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO user_businesses 
    (user_id, place_id, role, notify_new, notify_modified, notify_deleted, notify_rating)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    userId,
    placeId,
    role,
    notifyConfig?.notify_new !== undefined ? (notifyConfig.notify_new ? 1 : 0) : 1,
    notifyConfig?.notify_modified !== undefined ? (notifyConfig.notify_modified ? 1 : 0) : 1,
    notifyConfig?.notify_deleted !== undefined ? (notifyConfig.notify_deleted ? 1 : 0) : 0,
    notifyConfig?.notify_rating ?? null
  );
  
  console.log(`[USERS] Added business to user: userId=${userId}, placeId=${placeId}, role=${role}`);
  return result.lastInsertRowid as number;
}

/**
 * Remove a business (place) from a user
 */
export function removeUserBusiness(userId: number, placeId: string): boolean {
  const result = db.prepare(`
    DELETE FROM user_businesses WHERE user_id = ? AND place_id = ?
  `).run(userId, placeId);
  
  console.log(`[USERS] Removed business from user: userId=${userId}, placeId=${placeId}`);
  return result.changes > 0;
}

/**
 * Get all businesses associated with a user
 */
export function getUserBusinesses(userId: number): UserBusiness[] {
  return db.prepare(`
    SELECT * FROM user_businesses WHERE user_id = ?
  `).all(userId) as UserBusiness[];
}

/**
 * Update user-business association settings
 */
export function updateUserBusiness(
  userId: number,
  placeId: string,
  updates: {
    role?: 'admin' | 'viewer';
    notify_new?: boolean;
    notify_modified?: boolean;
    notify_deleted?: boolean;
    notify_rating?: number | null;
  }
): boolean {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  
  if (updates.role !== undefined) {
    sets.push('role = ?');
    params.push(updates.role);
  }
  if (updates.notify_new !== undefined) {
    sets.push('notify_new = ?');
    params.push(updates.notify_new ? 1 : 0);
  }
  if (updates.notify_modified !== undefined) {
    sets.push('notify_modified = ?');
    params.push(updates.notify_modified ? 1 : 0);
  }
  if (updates.notify_deleted !== undefined) {
    sets.push('notify_deleted = ?');
    params.push(updates.notify_deleted ? 1 : 0);
  }
  if (updates.notify_rating !== undefined) {
    sets.push('notify_rating = ?');
    params.push(updates.notify_rating);
  }
  
  if (sets.length === 0) {
    return false;
  }
  
  params.push(userId, placeId);
  
  const stmt = db.prepare(`
    UPDATE user_businesses SET ${sets.join(', ')} 
    WHERE user_id = ? AND place_id = ?
  `);
  const result = stmt.run(...params);
  
  return result.changes > 0;
}

/**
 * Get all users who should receive notifications for a specific place
 * This is the key function for per-user notifications
 */
export function getUsersForPlace(placeId: string, type: 'new' | 'modified' | 'deleted' = 'new'): User[] {
  const notifyColumn = `notify_${type}`;
  
  return db.prepare(`
    SELECT u.* FROM users u
    JOIN user_businesses ub ON u.id = ub.user_id
    WHERE ub.place_id = ? AND ub.${notifyColumn} = 1
  `).all(placeId) as User[];
}

/**
 * Check if a user has access to a specific place
 */
export function userHasAccessToPlace(userId: number, placeId: string): boolean {
  const result = db.prepare(`
    SELECT 1 FROM user_businesses WHERE user_id = ? AND place_id = ?
  `).get(userId, placeId);
  
  return result !== undefined;
}

/**
 * Check if user is admin (global access to all places)
 */
export function isUserAdmin(userId: number): boolean {
  const user = getUserById(userId);
  return user?.role === 'admin';
}

/**
 * Get all admins
 */
export function getAdmins(): User[] {
  return db.prepare(`
    SELECT * FROM users WHERE role = 'admin'
  `).all() as User[];
}

/**
 * Get users count by role
 */
export function getUsersCountByRole(): { admin: number; viewer: number; total: number } {
  const result = db.prepare(`
    SELECT 
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin,
      SUM(CASE WHEN role = 'viewer' THEN 1 ELSE 0 END) as viewer,
      COUNT(*) as total
    FROM users
  `).get() as { admin: number; viewer: number; total: number };
  
  return result;
}

/**
 * Get places count for a user
 */
export function getUserPlacesCount(userId: number): number {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM user_businesses WHERE user_id = ?
  `).get(userId) as { count: number };
  
  return result.count;
}