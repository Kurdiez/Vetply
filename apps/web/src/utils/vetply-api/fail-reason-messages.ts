import type { VetplyFailReason } from '@vetply/shared';

const FAIL_REASON_MESSAGES: Record<VetplyFailReason, string> = {
  ACCOUNT_EXISTS_VETPLY: 'An account with this email already exists.',
  ACCOUNT_EXISTS_GOOGLE:
    'This email is registered with Google. Sign in with Google instead.',
  DUPLICATE_CATALOGUE_PRODUCT_MAPPING:
    'Multiple listings map to the same catalogue product. Only one listing per supplier can use each product ID.',
};

export function messageForVetplyFailReason(reason: VetplyFailReason): string {
  return FAIL_REASON_MESSAGES[reason];
}
