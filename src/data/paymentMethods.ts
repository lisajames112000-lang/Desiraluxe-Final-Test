import type { PaymentMethodConfig } from '../types/settings';

// Preview-safe defaults. No accounts, wallet addresses, or QR codes are invented.
// Unconfigured methods remain disabled and can only be completed by the owner.
export const paymentMethods: PaymentMethodConfig[] = [
{ id: 'pay_jazzcash', type: 'jazzcash', label: 'JazzCash', enabled: false, accountTitle: '', accountNumber: '', instructions: '', country: 'Pakistan', currency: 'PKR' },
{ id: 'pay_easypaisa', type: 'easypaisa', label: 'Easypaisa', enabled: false, accountTitle: '', accountNumber: '', instructions: '', country: 'Pakistan', currency: 'PKR' },
{ id: 'pay_payoneer', type: 'payoneer', label: 'Payoneer', enabled: false, accountTitle: '', accountNumber: '', instructions: '', country: '', currency: '' },
{ id: 'pay_paypal', type: 'paypal', label: 'PayPal', enabled: false, accountTitle: '', accountNumber: '', instructions: '', country: '', currency: '' },
{ id: 'pay_bank_transfer', type: 'bank_transfer', label: 'Bank transfer', enabled: false, accountTitle: '', accountNumber: '', instructions: '', country: 'Pakistan', currency: 'PKR' },
{ id: 'pay_crypto', type: 'crypto', label: 'Cryptocurrency', enabled: false, accountTitle: '', accountNumber: '', instructions: '', country: '', currency: '', cryptoAsset: '', cryptoNetwork: '' }];