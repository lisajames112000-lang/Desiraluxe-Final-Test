import { adminAuth, adminDb } from '../services/firebase/adminServer';
import { FieldValue } from 'firebase-admin/firestore';

async function main() {
  const uid = process.env.ADMIN_BOOTSTRAP_UID?.trim();
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  if (!uid && !email) throw new Error('Set ADMIN_BOOTSTRAP_UID or ADMIN_BOOTSTRAP_EMAIL to the intended existing Firebase Auth user.');
  const user = uid ? await adminAuth().getUser(uid) : await adminAuth().getUserByEmail(email as string);
  if (uid && email && user.email?.toLowerCase() !== email.toLowerCase()) throw new Error('ADMIN_BOOTSTRAP_UID and ADMIN_BOOTSTRAP_EMAIL do not identify the same account.');
  await adminAuth().setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
  await adminDb().collection('auditLogs').add({ actor: user.uid, action: 'admin_claim_granted', targetUid: user.uid, createdAt: FieldValue.serverTimestamp() });
  console.log(`Admin authorization granted to Firebase UID ${user.uid}. The user must sign out and sign in again.`);
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : 'Admin authorization failed.');process.exitCode = 1;});