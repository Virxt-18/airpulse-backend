import { FastifyPluginAsync } from 'fastify';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { env, hasFirebaseConfig } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance {
    firebaseEnabled: boolean;
    firestore: Firestore | null;
  }
}

const firebasePlugin: FastifyPluginAsync = async (app) => {
  let firestore: Firestore | null = null;

  if (hasFirebaseConfig) {
    const firebaseApp = getApps()[0] ?? initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID!,
        clientEmail: env.FIREBASE_CLIENT_EMAIL!,
        privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
      }),
      storageBucket: env.FIREBASE_STORAGE_BUCKET
    });
    firestore = getFirestore(firebaseApp);
  }

  app.decorate('firebaseEnabled', firestore !== null);
  app.decorate('firestore', firestore);
};

export default firebasePlugin;
