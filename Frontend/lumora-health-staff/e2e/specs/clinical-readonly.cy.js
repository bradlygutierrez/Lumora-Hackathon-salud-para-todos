function fillMfaIfRequired() {
  cy.location('pathname', { timeout: 20_000 }).then((pathname) => {
    if (!pathname.includes('mfa-challenge')) {
      return;
    }

    cy.contains('Verificación de Seguridad').should('be.visible');

    cy.task('credential', 'mfaCode', { log: false }).then((manualCode) => {
      if (manualCode) {
        cy.get('input[autocomplete="one-time-code"]')
          .clear()
          .type(String(manualCode), { log: false });
        cy.contains('[role="button"]', 'Verificar').click();
        return;
      }

      cy.task('totp', null, { log: false }).then((totpCode) => {
        if (!totpCode) {
          throw new Error(
            'La cuenta requiere MFA. Configurá LUMORA_E2E_TOTP_SECRET o LUMORA_E2E_MFA_CODE en .env.e2e.local.',
          );
        }
        cy.get('input[autocomplete="one-time-code"]')
          .clear()
          .type(String(totpCode), { log: false });
        cy.contains('[role="button"]', 'Verificar').click();
      });
    });

    cy.location('pathname', { timeout: 20_000 }).should(
      'not.include',
      'mfa-challenge',
    );
  });
}

function loginClinicalStaff() {
  cy.visit('/login');

  cy.task('credential', 'login', { log: false }).then((login) => {
    if (!login) {
      throw new Error(
        'Falta LUMORA_E2E_LOGIN en .env.e2e.local.',
      );
    }
    cy.get('input[autocomplete="username"]')
      .clear()
      .type(String(login), { log: false });
  });

  cy.task('credential', 'password', { log: false }).then((password) => {
    if (!password) {
      throw new Error(
        'Falta LUMORA_E2E_PASSWORD en .env.e2e.local.',
      );
    }
    cy.get('input[autocomplete="password"]')
      .clear()
      .type(String(password), { log: false });
  });

  cy.get('[aria-label="Iniciar sesión clínica"]').click();
  fillMfaIfRequired();
  cy.contains('Acciones clínicas', { timeout: 20_000 }).should('be.visible');
}

describe('Health Staff clinical read-only E2E', () => {
  beforeEach(() => {
    loginClinicalStaff();
  });

  it('entra con auth real y carga el panel operativo', () => {
    cy.contains('Acciones clínicas').should('be.visible');
    cy.contains('Pacientes vinculados').should('be.visible');
    cy.contains('Citas en agenda').should('be.visible');
    cy.contains('Previsualizar pantallas').should('not.exist');
  });

  it('recorre pacientes, expediente y timeline sin mutar datos', () => {
    cy.get('[aria-label="Abrir Pacientes"]').click();
    cy.contains('Lista de Pacientes', { timeout: 20_000 }).should('be.visible');

    cy.contains('Ver ficha', { timeout: 20_000 }).first().click();
    cy.contains('Detalles del Paciente', { timeout: 20_000 }).should(
      'be.visible',
    );

    cy.contains('[role="button"]', 'Expediente Médico').click();
    cy.contains('Resumen clínico', { timeout: 20_000 }).should('be.visible');

    cy.get('[aria-label="Abrir línea de tiempo médica"]').click();
    cy.contains('Línea de Tiempo Médica', { timeout: 20_000 }).should(
      'be.visible',
    );
    cy.contains('Eventos clínicos ordenados cronológicamente').should(
      'be.visible',
    );

    cy.go('back');
    cy.get('[aria-label="Abrir sección Condiciones"]', {
      timeout: 20_000,
    }).click();
    cy.contains('Volver al expediente').should('be.visible');
    cy.contains('Condiciones').should('be.visible');
  });

  it('abre agenda, personal y centro de seguridad desde navegación real', () => {
    cy.get('[aria-label="Abrir Mi agenda"]').click();
    cy.contains('Mi agenda', { timeout: 20_000 }).should('be.visible');
    cy.contains('Mi disponibilidad').should('be.visible');

    cy.visit('/');
    cy.contains('Acciones clínicas', { timeout: 20_000 }).should('be.visible');
    cy.get('[aria-label="Abrir Personal"]').click();
    cy.contains('Directorio', { timeout: 20_000 }).should('be.visible');

    cy.visit('/');
    cy.contains('Acciones clínicas', { timeout: 20_000 }).should('be.visible');
    cy.get('[aria-label="Abrir Ajustes"]').click();
    cy.contains('Centro de Seguridad', { timeout: 20_000 }).click();
    cy.contains('Centro de Seguridad', { timeout: 20_000 }).should('be.visible');
  });
});
