import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ??
  process.env.STORAGE_BUCKET ??
  (process.env.GCLOUD_PROJECT ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app` : undefined);

admin.initializeApp(storageBucket ? { storageBucket } : undefined);

export const db = getFirestore(admin.app(), 'easy-db');
export const auth = admin.auth();
