import { useRegistrationStore } from '@/features/auth/store/registration-store';

describe('registration store', () => {
  beforeEach(() => {
    useRegistrationStore.getState().reset();
  });

  function fillIdentity() {
    const store = useRegistrationStore.getState();

    store.setAccount({
      username: 'Bradly',
      email: 'B@E.COM',
      phone: '8888-8888',
      password: 'Strong123!',
      confirmPassword: 'Strong123!',
    });

    store.setPersonal({
      firstNames: 'Bradly',
      lastNames: 'Gutierrez',
      birthDate: '2000-01-01',
      sexId: 1,
      bloodTypeId: null,
      addressLine1: 'Managua',
      city: 'Managua',
      department: 'Managua',
      country: 'Nicaragua',
      postalCode: '',
    });
  }

  it('keeps the historical patient buildRequest contract', () => {
    fillIdentity();

    useRegistrationStore.getState().setEmergency({
      name: 'Ana',
      relationship: 'Madre',
      phone: '7777-7777',
    });

    expect(
      useRegistrationStore.getState().buildRequest(true, true),
    ).toMatchObject({
      username: 'bradly',
      email: 'b@e.com',
      first_names: 'Bradly',
      sex_id: 1,
      blood_type_id: null,
      emergency_contact: {
        name: 'Ana',
        relationship: 'Madre',
        phone: '7777-7777',
      },
      accept_terms: true,
      accept_privacy: true,
    });
  });

  it('builds caregiver registration without patient-only fields', () => {
    fillIdentity();

    const request =
      useRegistrationStore
        .getState()
        .buildCaregiverRequest(true, true);

    expect(request).toMatchObject({
      username: 'bradly',
      email: 'b@e.com',
      first_names: 'Bradly',
      sex_id: 1,
      accept_terms: true,
      accept_privacy: true,
    });

    expect('blood_type_id' in request).toBe(false);
    expect('emergency_contact' in request).toBe(false);
  });
});
