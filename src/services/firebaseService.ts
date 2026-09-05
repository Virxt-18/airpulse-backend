import { hasFirebaseConfig } from '../config/env';

export function isFirebaseConfigured(): boolean { return hasFirebaseConfig; }
