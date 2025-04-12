// app/context/DatabaseContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DatabaseOperations, initializeDatabase, createDatabaseOperations } from './db';
import * as SQLite from 'expo-sqlite';
type DatabaseContextType = {
  db: SQLite.SQLiteDatabase | null;
  dbOps: ReturnType<typeof createDatabaseOperations> | null;
  initialized: boolean;
};

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const DatabaseProvider = ({ children }) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      const dbInstance = await initializeDatabase();
      setDb(dbInstance);
      setInitialized(true);
    })();
  }, []);

  const dbOps = db ? createDatabaseOperations(db) : null;

  return (
    <DatabaseContext.Provider value={{ db, dbOps, initialized }}>
      {children}
    </DatabaseContext.Provider>
  );
};


export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};