import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getStorage, provideStorage } from '@angular/fire/storage';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideClientHydration(withEventReplay()), provideFirebaseApp(() => initializeApp({ projectId: "leeboys-wildlife-removal", appId: "1:157681868280:web:267db4b160bdb89e000a0d", storageBucket: "leeboys-wildlife-removal.firebasestorage.app", apiKey: "AIzaSyAgqml6eSnS4FYBgNUpMRcxpvFRAvdU67s", authDomain: "leeboys-wildlife-removal.firebaseapp.com", messagingSenderId: "157681868280", measurementId: "G-93DW6PKKPH" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideFunctions(() => getFunctions()), provideStorage(() => getStorage())]
};
