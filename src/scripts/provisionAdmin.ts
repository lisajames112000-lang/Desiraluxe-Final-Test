import type { UserRecord } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../services/firebase/adminServer';

async function main() {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
  const resetExistingPassword = process.env.ADMIN_RESET_PASSWORD === 'yes';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set ADMIN_BOOTSTRAP_EMAIL to the owner account email in the protected server environment.');
  if (password.length < 12) throw new Error('Set ADMIN_BOOTSTRAP_PASSWORD to a server-only password with at least 12 characters.');

  let user: UserRecord;
  try {
    user = await adminAuth().getUserByEmail(email);
    if (resetExistingPassword) user = await adminAuth().updateUser(user.uid, { password, emailVerified: true, disabled: false });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code !== 'auth/user-not-found') throw error;
    user = await adminAuth().createUser({ email, password, emailVerified: true, disabled: false, displayName: 'Desiraluxe Admin' });
  }

  await adminAuth().setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
  await adminDb().collection('auditLogs').add({
    actor: user.uid,
    action: resetExistingPassword ? 'admin_account_password_reset_and_authorized' : 'admin_account_provisioned_or_authorized',
    targetUid: user.uid,
    createdAt: FieldValue.serverTimestamp()
  });
  console.log(`Admin account ready for ${email} (UID ${user.uid}). Sign out and sign in again to refresh claims.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Admin provisioning failed.');
  process.exitCode = 1;
});