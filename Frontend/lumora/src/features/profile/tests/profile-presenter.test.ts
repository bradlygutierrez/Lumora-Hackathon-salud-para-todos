import type { AccountProfile } from '@/features/profile/types/account.types';
import { profilePresenter } from '@/features/profile/utils/profile-presenter';

const profile = {
  person: { first_names: 'Ana María', last_names: 'López' },
} as AccountProfile;

describe('profilePresenter', () => {
  it('formats the real account name and initials', () => {
    expect(profilePresenter.fullName(profile)).toBe('Ana María López');
    expect(profilePresenter.initials(profile)).toBe('AL');
  });
});
