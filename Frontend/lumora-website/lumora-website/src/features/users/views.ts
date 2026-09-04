import type { CurrentUser } from '../auth/types'
import { escapeHtml } from '../../shared/ui/html'
import type { StaffUser } from './types'

function shell(user: CurrentUser, content: string): string {
  const name = `${user.persona.nombres} ${user.persona.apellidos}`.trim() || user.username
  return `<div class="portal-shell"><aside class="sidebar"><a class="portal-brand portal-brand--sidebar" href="#/afiliaciones"><img src="/favicon.svg" alt="" /><span>Lumora</span></a><nav class="sidebar__nav" aria-label="Navegación del portal"><a class="sidebar__link" href="#/afiliaciones"><span aria-hidden="true">▪</span>Afiliaciones</a><a class="sidebar__link is-active" href="#/cuentas"><span aria-hidden="true">◇</span>Cuentas Lumora</a></nav><div class="sidebar__foot"><span>Portal interno</span><small>Gestión de cuentas</small></div></aside><div class="portal-main"><header class="topbar"><div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(user.email)}</span></div><button class="button button--outline button--small" type="button" data-action="logout">Cerrar sesión</button></header>${content}</div></div>`
}

function hasRole(user: StaffUser, role: string): boolean {
  return user.roles.some((item) => item.nombre === role)
}

function supportRows(users: StaffUser[], role: string): string {
  return users.filter((user) => hasRole(user, role)).map((item) => `<tr data-support-row data-search="${escapeHtml(`${item.persona.nombres} ${item.persona.apellidos} ${item.username} ${item.email}`.toLowerCase())}"><td><strong>${escapeHtml(`${item.persona.nombres} ${item.persona.apellidos}`)}</strong><span class="table-secondary">${escapeHtml(item.username)}</span></td><td>${escapeHtml(item.email)}</td><td><span class="badge ${item.activo ? 'badge--active' : 'badge--suspended'}">${item.activo ? 'Activa' : 'Inactiva'}</span><span class="table-secondary">${item.email_verificado ? 'Correo verificado' : 'Correo pendiente'}</span></td><td class="table-action"><button class="table-link" type="button" data-resend-password="${item.id}">Reenviar contraseña</button></td></tr>`).join('')
}

function supportPanel(title: string, role: string, users: StaffUser[]): string {
  const count = users.filter((user) => hasRole(user, role)).length
  const rows = supportRows(users, role)
  return `<section class="panel"><div class="panel__header"><div><h2>${title}</h2><p>${count} cuentas encontradas</p></div><span class="panel-count">${count}</span></div>${count ? `<div class="table-wrap"><table><thead><tr><th>Persona</th><th>Correo</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>No hay cuentas en este panel.</strong><span>Las cuentas aparecen cuando tienen el rol correspondiente.</span></div>'}</section>`
}

export function UsersView(user: CurrentUser, users: StaffUser[]): string {
  return shell(user, `<main class="portal-content"><div class="page-heading"><div><span class="eyebrow">Administración y soporte</span><h1>Cuentas Lumora</h1><p>Busca pacientes, médicos y manejadores. Desde cada cuenta puedes reenviar el correo de cambio de contraseña.</p></div><button class="button" type="button" data-action="open-create-user">Nueva cuenta</button></div><div class="panel"><label class="field"><span>Buscar en todos los paneles</span><input type="search" placeholder="Nombre, usuario o correo" data-support-search /></label></div>${supportPanel('Manejadores y administradores', 'Administrador', users)}${supportPanel('Pacientes', 'Paciente', users)}${supportPanel('Médicos', 'Profesional de Salud', users)}<dialog class="portal-dialog" data-create-user-dialog><form class="dialog-card" data-create-user-form><div class="dialog-card__header"><div><span class="eyebrow">Nueva cuenta</span><h2>Crear cuenta de manejador</h2><p>Define una contraseña inicial; luego puedes reenviar el correo de cambio de contraseña.</p></div><button class="icon-button" type="button" aria-label="Cerrar" data-action="close-dialog">×</button></div><div class="form-grid form-grid--2"><label class="field"><span>Nombres</span><input name="first_names" maxlength="100" required /></label><label class="field"><span>Apellidos</span><input name="last_names" maxlength="100" required /></label><label class="field"><span>Usuario</span><input name="username" autocomplete="username" maxlength="50" required /></label><label class="field"><span>Correo</span><input name="email" type="email" autocomplete="email" maxlength="255" required /></label><label class="field form-grid__wide"><span>Contraseña inicial</span><input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /></label></div><div class="dialog-card__actions"><button class="button button--outline" type="button" data-action="close-dialog">Cancelar</button><button class="button" type="submit">Crear cuenta</button></div></form></dialog></main>`)
}
