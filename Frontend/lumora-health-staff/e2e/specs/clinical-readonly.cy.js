const SESSION_KEY = 'lumora.healthStaff.session';

function tokenSession(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.access_token !== 'string' ||
    typeof body.refresh_token !== 'string'
  ) {
    throw new Error(
      'La respuesta de autenticación no contiene un token pair válido.',
    );
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    tokenType: body.token_type || 'bearer',
  };
}

function seedSession(body, apiRoot) {
  const session = tokenSession(body);
  const meUrl = `${apiRoot}/auth/me`;

  return cy
    .request({
      method: 'GET',
      url: meUrl,
      failOnStatusCode: false,
      log: false,
      headers: {
        Accept: 'application/json',
        Authorization: `${session.tokenType} ${session.accessToken}`,
      },
    })
    .then((response) => {
      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `La sesión MFA fue creada, pero /auth/me respondió HTTP ${response.status}. ` +
            'No se imprimieron datos de usuario ni tokens.',
        );
      }

      const user = response.body;
      if (!user || typeof user !== 'object' || typeof user.id !== 'number') {
        throw new Error(
          '/auth/me respondió 2xx pero sin un usuario válido.',
        );
      }

      const enrichedSession = {
        ...session,
        userId: user.id,
        user,
      };

      return cy.window({ log: false }).then((window) => {
        window.localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(enrichedSession),
        );
      });
    });
}

function resolveTotpCode() {
  return cy.task('credential', 'mfaCode', { log: false }).then((manualCode) => {
    if (manualCode) {
      return String(manualCode);
    }

    return cy.task('totp', null, { log: false }).then((totpCode) => {
      if (!totpCode) {
        throw new Error(
          'La cuenta QA requiere TOTP. Configurá LUMORA_E2E_TOTP_SECRET ' +
            'o un LUMORA_E2E_MFA_CODE vigente en .env.e2e.local.',
        );
      }

      return String(totpCode);
    });
  });
}

function verifyTotpDirectly(loginInterception) {
  const body = loginInterception.response?.body;
  const challengeToken =
    body && typeof body === 'object' ? body.challenge_token : null;

  if (!challengeToken) {
    throw new Error(
      'El login indicó MFA requerido pero no devolvió challenge_token.',
    );
  }

  const loginUrl = loginInterception.request?.url;
  if (!loginUrl) {
    throw new Error('No se pudo resolver la URL real de /auth/login.');
  }

  const verifyUrl = loginUrl.replace(/\/auth\/login(?:\?.*)?$/, '/auth/mfa/verify');
  if (verifyUrl === loginUrl) {
    throw new Error('No se pudo derivar /auth/mfa/verify desde el login real.');
  }

  return resolveTotpCode()
    .then((code) =>
      cy.request({
        method: 'POST',
        url: verifyUrl,
        body: {
          challenge_token: challengeToken,
          code,
        },
        failOnStatusCode: false,
        log: false,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }),
    )
    .then((response) => {
      if (response.status < 200 || response.status >= 300) {
        const rawCode = response.body?.error?.code;
        const allowedCodes = new Set([
          'invalid_mfa_code',
          'invalid_token',
          'validation_error',
          'rate_limited',
        ]);
        const safeCode =
          typeof rawCode === 'string' && allowedCodes.has(rawCode)
            ? rawCode
            : 'unknown';

        throw new Error(
          `MFA TOTP QA respondió HTTP ${response.status} (${safeCode}). ` +
            'No se imprimieron código, challenge, tokens ni cuerpo de respuesta.',
        );
      }

      const apiRoot = verifyUrl.replace(/\/auth\/mfa\/verify(?:\?.*)?$/, '');
      return seedSession(response.body, apiRoot);
    });
}

function loginClinicalStaff() {
  cy.intercept('POST', '**/auth/login').as('loginRequest');
  cy.visit('/login');

  cy.task('credential', 'login', { log: false }).then((login) => {
    if (!login) {
      throw new Error('Falta LUMORA_E2E_LOGIN en .env.e2e.local.');
    }

    const expectedLength = String(login).length;
    cy.get('input[autocomplete="username"]')
      .clear()
      .type(String(login), {
        log: false,
        parseSpecialCharSequences: false,
      })
      .invoke('val')
      .then((value) => {
        if (String(value ?? '').length !== expectedLength) {
          throw new Error(
            'Cypress no pudo escribir el identificador QA completo.',
          );
        }
      });
  });

  cy.task('credential', 'password', { log: false }).then((password) => {
    if (!password) {
      throw new Error('Falta LUMORA_E2E_PASSWORD en .env.e2e.local.');
    }

    const expectedLength = String(password).length;
    cy.get('input[autocomplete="password"]')
      .clear()
      .type(String(password), {
        log: false,
        parseSpecialCharSequences: false,
      })
      .invoke('val')
      .then((value) => {
        if (String(value ?? '').length !== expectedLength) {
          throw new Error(
            'Cypress no pudo escribir la contraseña QA completa.',
          );
        }
      });
  });

  cy.get('[aria-label="Iniciar sesión clínica"]').click();

  return cy
    .wait('@loginRequest', { timeout: 30_000 })
    .then((interception) => {
      const status = interception.response?.statusCode ?? 0;
      const body = interception.response?.body;

      if (status < 200 || status >= 300) {
        throw new Error(
          `Login QA respondió HTTP ${status || 'sin respuesta'}. ` +
            'No se imprimieron credenciales ni cuerpo de respuesta.',
        );
      }

      if (body?.mfa_required === true) {
        return verifyTotpDirectly(interception);
      }

      const loginUrl = interception.request?.url;
      if (!loginUrl) {
        throw new Error('No se pudo resolver la URL real de /auth/login.');
      }

      const apiRoot = loginUrl.replace(/\/auth\/login(?:\?.*)?$/, '');
      return seedSession(body, apiRoot);
    })
    .then(() => {
      cy.visit('/');
      cy.contains('Acciones clínicas', { timeout: 30_000 }).should(
        'be.visible',
      );
    });
}


describe('Health Staff clinical read-only E2E', () => {
  beforeEach(() => {
    cy.session(
      'health-staff-clinical-qa',
      () => {
        loginClinicalStaff();
      },
      {
        validate() {
          cy.window({ log: false }).then((window) => {
            const stored = window.localStorage.getItem(SESSION_KEY);
            expect(stored, 'sesión clínica almacenada').to.be.a('string').and.not
              .be.empty;
          });
        },
      },
    );

    cy.visit('/');
    cy.contains('Acciones clínicas', { timeout: 30_000 }).should('be.visible');
  });

  it('autentica contra login y TOTP reales y restaura el panel operativo', () => {
    cy.contains('Acciones clínicas').should('be.visible');
    cy.contains('Pacientes vinculados').should('be.visible');
    cy.contains('Citas en agenda').should('be.visible');
    cy.contains('Previsualizar pantallas').should('not.exist');
  });

  it('recorre pacientes, expediente y timeline sin mutar datos', () => {
    cy.intercept('GET', '**/api/v1/pacientes*').as('patientDirectory');

    cy.get('[aria-label="Abrir Pacientes"]').click();
    cy.contains('Lista de Pacientes', { timeout: 20_000 }).should('be.visible');

    cy.wait('@patientDirectory', { timeout: 20_000 })
      .its('response.statusCode')
      .should('be.within', 200, 299);

    // La cuenta QA puede no tener pacientes vinculados por cita/consulta.
    // Para el recorrido clínico usamos el directorio que el backend autoriza.
    cy.contains('Buscar pacientes', { timeout: 20_000 }).click();
    cy.contains('Directorio autorizado', { timeout: 20_000 }).should(
      'be.visible',
    );
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
    cy.contains('Condiciones del Paciente').should('be.visible');
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
