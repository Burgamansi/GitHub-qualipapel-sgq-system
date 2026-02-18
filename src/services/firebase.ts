import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Defensive check for missing API Key (Common Vercel issue)
const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
] as const;

const missingVars = requiredEnvVars.filter(key => !import.meta.env[key]);

if (missingVars.length > 0) {
    const errorMsg = `
        <div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ff4444;">Configuração Incompleta</h1>
            <p style="font-size: 1.1rem; line-height: 1.5;">O sistema não pode iniciar porque as seguintes variáveis de ambiente estão faltando no Vercel:</p>
            <pre style="background: #f4f4f4; color: #333; padding: 1rem; border-radius: 4px; overflow-x: auto;">${missingVars.join('\n')}</pre>
            <p><strong>Como corrigir:</strong></p>
            <ol>
                <li>Acesse o painel do seu projeto na Vercel</li>
                <li>Vá em <strong>Settings</strong> > <strong>Environment Variables</strong></li>
                <li>Adicione as variáveis acima copiando os valores do seu arquivo <code>.env.local</code> local.</li>
            </ol>
        </div>
    `;
    document.body.innerHTML = errorMsg;
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Additional specific check for API Key as it's the most critical for initialization
if (!firebaseConfig.apiKey) {
    document.body.innerHTML = "<h1>Erro Crítico</h1><p>Firebase API Key está faltando.</p>";
    throw new Error("Firebase API Key is missing specifically.");
}

// Singleton pattern: Ensure Firebase is initialized only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log("[FIREBASE] projectId:", firebaseConfig.projectId);

export { app, auth, db, storage };
