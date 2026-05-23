import { db } from '@/services/firebase';
import { handleError, AppError } from './errorHandler';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  QueryConstraint 
} from 'firebase/firestore';

export async function safeGetDoc<T>(path: string, pathSegments: string[]): Promise<T | null> {
  try {
    const docRef = doc(db, path, ...pathSegments);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    throw handleError(error, 'safeGetDoc');
  }
}

export async function safeGetDocs<T>(path: string, ...queryConstraints: QueryConstraint[]): Promise<T[]> {
  try {
    const q = query(collection(db, path), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
  } catch (error) {
    throw handleError(error, 'safeGetDocs');
  }
}

export async function safeAddDoc<T>(path: string, data: any): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, path), data);
    return docRef.id;
  } catch (error) {
    throw handleError(error, 'safeAddDoc');
  }
}

export async function safeSetDoc(path: string, pathSegments: string[], data: any, merge = true): Promise<void> {
  try {
    const docRef = doc(db, path, ...pathSegments);
    await setDoc(docRef, data, { merge });
  } catch (error) {
    throw handleError(error, 'safeSetDoc');
  }
}

export async function safeUpdateDoc(path: string, pathSegments: string[], data: any): Promise<void> {
  try {
    const docRef = doc(db, path, ...pathSegments);
    await updateDoc(docRef, data);
  } catch (error) {
    throw handleError(error, 'safeUpdateDoc');
  }
}

export async function safeDeleteDoc(path: string, pathSegments: string[]): Promise<void> {
  try {
    const docRef = doc(db, path, ...pathSegments);
    await deleteDoc(docRef);
  } catch (error) {
    throw handleError(error, 'safeDeleteDoc');
  }
}
