describe('Health Staff auth smoke', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('muestra el login real sin preview ni bypass manual de MFA', () => {
    cy.contains('Lumora').should('be.visible');
    cy.contains('Acceso Seguro al Sistema').should('be.visible');
    cy.get('input[autocomplete="username"]').should('be.visible');
    cy.get('input[autocomplete="password"]').should('be.visible');
    cy.get('[aria-label="Iniciar sesión clínica"]').should('be.visible');

    cy.contains('Previsualizar pantallas').should('not.exist');
    cy.contains('Acceder con MFA').should('not.exist');
    cy.contains('¿Olvidaste tu contraseña?').should('be.visible');
  });

  it('protege la ruta MFA si no existe un challenge real', () => {
    cy.visit('/mfa-challenge');
    cy.location('pathname', { timeout: 15_000 }).should('match', /\/login$/);
    cy.contains('Acceso Seguro al Sistema').should('be.visible');
  });
});
