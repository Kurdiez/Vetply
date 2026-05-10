/**
 * Native form controls render a default focus outline (often blue/white) unless
 * removed. Pair with ring-based focus (`focus:ring-2 focus:ring-primary-500`)
 * so focus matches the admin dark UI.
 */
export const adminNativeControlOutlineReset = 'outline-none focus:outline-none';

/** Shared ring shell for inputs/selects on gray admin surfaces. */
const adminControlRingShell =
  'ring-1 ring-inset ring-white/10 disabled:cursor-not-allowed disabled:opacity-60';

const adminControlFocusRing = `${adminNativeControlOutlineReset} focus:ring-2 focus:ring-primary-500`;

/** Single-line text inputs (filters, tag lists, inline forms). */
export const adminFilterTextInputClassName = [
  'block w-full rounded-md border-0 bg-white/5 px-3 py-2 text-sm text-white',
  adminControlRingShell,
  'placeholder:text-gray-500',
  adminControlFocusRing,
].join(' ');

/** Native `<select>` styling (matches filter row density). */
export const adminSelectFieldClassName = [
  'block w-full cursor-pointer appearance-none rounded-md border-0 bg-white/5 py-2 pr-11 pl-3 text-sm text-white',
  adminControlRingShell,
  adminControlFocusRing,
].join(' ');
