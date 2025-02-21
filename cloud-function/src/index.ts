import * as admin from 'firebase-admin/app';

if (admin.getApps().length === 0) {
  console.log('Initializing Firebase...');
  admin.initializeApp();
}

export * from './services/wallet.js';
