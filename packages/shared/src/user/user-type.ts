export const UserType = {
  Member: 'Member',
  Admin: 'Admin',
  Super: 'Super',
} as const;

export type UserType = (typeof UserType)[keyof typeof UserType];
