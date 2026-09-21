import { collection, getDocs, doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../database/firebase';

const COLLECTIONS_TO_BACKUP = [
  'residents',
  'admin_profiles',
  'requests',
  'notifications',
  'activity_logs',
  'lockouts',
  'settings',
  'inbox_messages',
  'monthly_reports'
];

/**
 * Recursively converts parsed JSON objects that look like Firestore Timestamps
 * back into actual Firestore Timestamp objects.
 */
const convertToTimestamps = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  // If it's an array, map over it
  if (Array.isArray(obj)) {
    return obj.map(item => convertToTimestamps(item));
  }

  // If it's a Timestamp-like object
  if ('seconds' in obj && 'nanoseconds' in obj) {
    return new Timestamp(obj.seconds, obj.nanoseconds);
  }

  // Iterate over object keys
  const newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    newObj[key] = convertToTimestamps(value);
  }
  return newObj;
};

/**
 * Fetches all important collections and returns a JSON blob.
 */
export const exportDatabaseToJson = async () => {
  const exportData = {};
  
  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    exportData[collectionName] = {};
    
    querySnapshot.forEach((document) => {
      exportData[collectionName][document.id] = document.data();
    });
  }

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  return blob;
};

/**
 * Parses JSON and restores all collections using batches.
 */
export const restoreDatabaseFromJson = async (jsonString) => {
  const importData = JSON.parse(jsonString);
  
  let batch = writeBatch(db);
  let operationCount = 0;

  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    if (importData[collectionName]) {
      const documents = importData[collectionName];
      
      for (const [docId, docData] of Object.entries(documents)) {
        
        const restoredData = convertToTimestamps(docData);
        
        const docRef = doc(db, collectionName, docId);
        batch.set(docRef, restoredData);
        operationCount++;

        // Commit batch when it reaches 450 ops to be safe
        if (operationCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }
  }

  // Commit remaining operations
  if (operationCount > 0) {
    await batch.commit();
  }
};
