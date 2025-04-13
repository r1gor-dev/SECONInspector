// app/database/db.ts
import * as SQLite from 'expo-sqlite';

// Initialize database with async API
export const initializeDatabase = async () => {
  try {
    // Open database connection
    const db = await SQLite.openDatabaseAsync('inspectors.db');
    
    // Execute initialization queries
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS inspectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

    `);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Database operations
export const createDatabaseOperations = (db: SQLite.SQLiteDatabase) => ({
  // Get all inspectors
  async getInspectors() {
    const result = await db.getAllAsync<{id: number, name: string}>(
      'SELECT id, name FROM inspectors ORDER BY createdAt DESC;'
    );
    return result;
  },

  
  // Add new inspector
  async addInspector(name: string) {
    const result = await db.runAsync(
      'INSERT INTO inspectors (name) VALUES (?);',
      [name]
    );
    return result;
  },
  
  // Delete inspector
  async deleteInspector(id: number) {
    return await db.runAsync(
      'DELETE FROM inspectors WHERE id = ?;',
      [id]
    );
  }
});

// Type for database operations
export type DatabaseOperations = ReturnType<typeof createDatabaseOperations>;