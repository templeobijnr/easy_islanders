import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

admin.initializeApp();

export const db = getFirestore(admin.app(), 'easy-db');
export const auth = admin.auth();
