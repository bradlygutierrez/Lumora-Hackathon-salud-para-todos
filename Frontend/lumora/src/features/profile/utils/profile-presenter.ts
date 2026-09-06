import type { AccountProfile } from '@/features/profile/types/account.types';

export const profilePresenter = {
  fullName: (profile: AccountProfile) =>
    `${profile.person.first_names} ${profile.person.last_names}`.trim(),
  initials: (profile: AccountProfile) =>
    [profile.person.first_names, profile.person.last_names]
      .map((value) => value.trim().charAt(0).toUpperCase())
      .join(''),
};
