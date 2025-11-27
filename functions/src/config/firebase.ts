import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

admin.initializeApp();

// Use default Firestore database (not 'easy-db')
// If you have a custom database, switch back to: getFirestore(admin.app(), 'easy-db')
export const db = getFirestore(admin.app());
export const auth = admin.auth();
