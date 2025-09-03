import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  CollectionReference,
  DocumentData 
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { collectionData, docData } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);

  // Generic methods for CRUD operations
  
  // Create document with auto-generated ID
  async addDocument(collectionName: string, data: any) {
    const collectionRef = collection(this.firestore, collectionName);
    return await addDoc(collectionRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Create/Update document with specific ID
  async setDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(this.firestore, collectionName, docId);
    return await setDoc(docRef, {
      ...data,
      updatedAt: new Date()
    }, { merge: true });
  }

  // Get single document
  async getDocument(collectionName: string, docId: string) {
    const docRef = doc(this.firestore, collectionName, docId);
    return await getDoc(docRef);
  }

  // Get document as Observable
  getDocumentObservable(collectionName: string, docId: string): Observable<any> {
    const docRef = doc(this.firestore, collectionName, docId);
    return docData(docRef, { idField: 'id' });
  }

  // Get collection as Observable
  getCollectionObservable(collectionName: string): Observable<any[]> {
    const collectionRef = collection(this.firestore, collectionName);
    return collectionData(collectionRef, { idField: 'id' });
  }

  // Get collection once (returns Promise, not Observable)
  async getCollection(collectionName: string): Promise<any[]> {
    const collectionRef = collection(this.firestore, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Query collection with conditions
  getCollectionQuery(
    collectionName: string, 
    conditions: { field: string, operator: any, value: any }[] = [],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Observable<any[]> {
    const collectionRef = collection(this.firestore, collectionName);
    
    let queryConstraints: any[] = [];
    
    // Add where conditions
    conditions.forEach(condition => {
      queryConstraints.push(where(condition.field, condition.operator, condition.value));
    });
    
    // Add orderBy
    if (orderByField) {
      queryConstraints.push(orderBy(orderByField, orderDirection));
    }
    
    // Add limit
    if (limitCount) {
      queryConstraints.push(limit(limitCount));
    }
    
    const q = query(collectionRef, ...queryConstraints);
    return collectionData(q, { idField: 'id' });
  }

  // Update document
  async updateDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(this.firestore, collectionName, docId);
    return await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  }

  // Delete document
  async deleteDocument(collectionName: string, docId: string) {
    const docRef = doc(this.firestore, collectionName, docId);
    return await deleteDoc(docRef);
  }
}