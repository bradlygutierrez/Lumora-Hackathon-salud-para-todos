import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('la landing presenta las dos aplicaciones con navegación y contenido verificable', async () => {
  const componentNames = ['Header', 'Hero', 'Experiences', 'Features', 'AppShowcase', 'MedicalStaff', 'Ecosystem', 'Contact', 'Footer']
  const [index, main, header, brand, contact, favicon, styles, ...components] = await Promise.all([
    read('../index.html'),
    read('../src/main.ts'),
    read('../src/components/Header.ts'),
    read('../src/components/Brand.ts'),
    read('../src/components/Contact.ts'),
    read('../public/favicon.svg'),
    read('../src/styles/landing.css'),
    ...componentNames.map((name) => read(`../src/components/${name}.ts`)),
  ])

  assert.match(index, /<html lang="es">/)
  assert.match(index, /href="\/favicon\.svg"/)
  assert.match(brand, /src="\/favicon\.svg"/)
  assert.match(favicon, /viewBox="0 0 64 64"/)
  assert.match(favicon, /#D5A53B/)
  for (const component of componentNames) {
    assert.match(main, new RegExp(`import \\{ [^}]*\\b${component}\\b`))
    assert.match(main, new RegExp(`\\$\\{${component}\\(\\)\\}`))
  }
  assert.match(header, /aria-label="Navegación principal"/)
  assert.match(contact, /<label for="name">/)
  assert.match(contact, /type="email"/)
  assert.match(contact, /required/)
  assert.match(contact, /mailto:lumorahealthnic@gmail\.com/)
  assert.match(contact, /action="https:\/\/formspree\.io\/f\/mwlkvodz"/)
  assert.match(contact, /data-contact-form/)
  assert.match(contact, /name="email"/)
  assert.match(contact, /name="message"/)
  assert.match(main, /setupContactForm\(\)/)
  assert.match(main, /toastify-js\/src\/toastify\.css/)
  assert.match(contact, /Descargar pr.ximamente/)
  const landing = [brand, ...components].join('\n')
  assert.equal((landing.match(/<h1/g) ?? []).length, 1)
  assert.match(landing, /id="lumora"/)
  assert.match(landing, /id="lumora-medicos"/)
  assert.match(landing, /Lumora, iluminando el camino hacia una mejor salud\./)
  assert.match(styles, /background-image: url\('\/two-cellphones-mockup\.png'\)/)
  assert.match(styles, /background-image: url\('\/lumora-medicos-mockup\.png'\)/)
  assert.match(styles, /animation-timeline: view\(\)/)
  assert.match(styles, /position: fixed/)
  assert.match(styles, /safe-area-inset-top/)
  assert.doesNotMatch(landing, /telemedicina|sincronizaci.n en tiempo real|resultados de laboratorio/i)
  const ids = new Set([...landing.matchAll(/id="([^"]+)"/g)].map((match) => match[1]))
  const anchorTargets = [...landing.matchAll(/href="#([^"]+)"/g)].map((match) => match[1])
  assert.deepEqual(anchorTargets.filter((target) => !ids.has(target)), [])
  assert.doesNotMatch(main + landing, /style="/)
})
