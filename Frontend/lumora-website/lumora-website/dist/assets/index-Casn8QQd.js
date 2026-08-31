var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),s=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},c=(n,r,o)=>(o=n==null?{}:e(i(n)),s(r||!n||!n.__esModule||!a.call(n,`default`)?t(o,`default`,{value:n,enumerable:!0}):o,n));(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function l(){return`<a class="brand" href="#inicio" aria-label="Lumora, ir al inicio"><img class="brand__logo" src="/favicon.svg" width="40" height="40" alt="" /><span>Lumora</span></a>`}var u={calendar:`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>`,check:`<path d="m5 12 4 4L19 6"/>`,clipboard:`<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>`,heart:`<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>`,location:`<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>`,mail:`<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>`,medical:`<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>`,menu:`<path d="M4 6h16M4 12h16M4 18h16"/>`,pill:`<path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z"/><path d="m8.5 11.5 7-7"/>`,phone:`<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>`,user:`<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`};function d(e,t=``){return`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${t?`role="img" aria-label="${t}"`:`aria-hidden="true"`}>${u[e]}</svg>`}var f=`
  <a href="#lumora">Lumora</a>
  <a href="#lumora-medicos">Para Médicos</a>
  <a href="#nosotros">Ecosistema</a>
  <a class="button button--small" href="#contacto">Contacto</a>
`;function p(){return`
    <header class="site-header">
      <div class="container header__content">
        ${l()}
        <nav class="desktop-nav" aria-label="Navegación principal">${f}</nav>
        <details class="mobile-nav">
          <summary aria-label="Abrir menú">${d(`menu`)}</summary>
          <nav aria-label="Navegación móvil">${f}</nav>
        </details>
      </div>
    </header>
  `}function m(){return`
    <section class="hero section" id="inicio">
      <div class="container split-layout">
        <div class="hero__content">
          <span class="eyebrow">El ecosistema Lumora</span>
          <h1>Cuidado de salud conectado, <span>para pacientes y profesionales</span></h1>
          <p class="lead">Lumora reúne dos experiencias diseñadas para hacer más simple el seguimiento de la salud, la atención y la gestión de información clínica.</p>
          <div class="button-row">
            <a class="button" href="#lumora">Conocer Lumora</a>
            <a class="button button--outline" href="#lumora-medicos">Para profesionales</a>
          </div>
        </div>
        <div class="ecosystem-preview" aria-label="Lumora para pacientes y profesionales de salud">
          <article class="ecosystem-preview__app ecosystem-preview__app--patient"><span>Para pacientes</span><strong>Lumora</strong><p>Tu salud, más cerca de ti.</p></article>
          <span class="ecosystem-preview__brand">Lumora</span>
          <article class="ecosystem-preview__app ecosystem-preview__app--staff"><span>Para profesionales</span><strong>Lumora para Médicos</strong><p>Más contexto para cuidar mejor.</p></article>
        </div>
      </div>
    </section>
  `}function h(){return`
    <section class="section experiences" id="experiencias">
      <div class="container">
        <div class="section-heading">
          <span class="eyebrow">Una plataforma, dos perspectivas</span>
          <h2>Dos experiencias. Un mismo objetivo.</h2>
          <p>Lumora adapta sus herramientas a las necesidades de cada persona dentro del proceso de atención.</p>
        </div>
        <div class="experience-grid">
          <article class="experience-card experience-card--patient">
            <span class="experience-card__icon">${d(`heart`)}</span><small>Para pacientes</small>
            <h3>Lumora</h3>
            <p>Consulta y organiza citas, tratamientos e indicadores de salud desde una experiencia sencilla y personal.</p>
            <a href="#lumora">Descubrir Lumora <span aria-hidden="true">→</span></a>
          </article>
          <article class="experience-card experience-card--staff">
            <span class="experience-card__icon">${d(`medical`)}</span><small>Para profesionales de salud</small>
            <h3>Lumora para Médicos</h3>
            <p>Consulta información clínica, documenta la atención y da seguimiento a pacientes desde un espacio dedicado.</p>
            <a href="#lumora-medicos">Descubrir Lumora para Médicos <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </div>
    </section>
  `}var g=[{icon:`calendar`,title:`Citas médicas`,description:`Agenda, consulta, reprograma o cancela tus citas desde un solo lugar.`},{icon:`pill`,title:`Tratamientos a mano`,description:`Consulta tus recetas, horarios de medicamentos y registra las dosis tomadas.`},{icon:`heart`,title:`Indicadores de salud`,description:`Registra mediciones personales y revisa su historial de forma clara.`},{icon:`check`,title:`Recordatorios`,description:`Organiza recordatorios de cuidado y consulta tus notificaciones pendientes.`}];function _(){return`
    <section class="section features product-section" id="lumora">
      <div class="container">
        <div class="section-heading">
          <span class="eyebrow">Lumora · Para pacientes</span>
          <h2>Tu salud, más cerca de ti</h2>
          <p>Consulta y organiza aspectos importantes de tu cuidado desde una experiencia clara y accesible.</p>
        </div>
        <div class="feature-grid">
          ${g.map(({icon:e,title:t,description:n})=>`
            <article class="feature-card">
              <span class="feature-card__icon">${d(e)}</span>
              <h3>${t}</h3>
              <p>${n}</p>
            </article>
          `).join(``)}
        </div>
      </div>
    </section>
  `}var v=[`Un resumen con citas, tratamientos e indicadores relevantes.`,`Información presentada con lenguaje claro y jerarquía visual.`,`Acceso pensado para pacientes y cuidadores autorizados.`];function y(){return`
    <section class="section app-showcase" aria-labelledby="patient-design-title">
      <div class="container split-layout split-layout--reverse">
        <div class="app-showcase__content">
          <span class="eyebrow">Diseñada para acompañarte</span>
          <h2 id="patient-design-title">Diseño humano en tu bolsillo</h2>
          <p class="lead">Lumora presenta la información importante de tu salud con una interfaz comprensible, accesible y enfocada en lo que necesitas.</p>
          <ul class="check-list">
            ${v.map(e=>`<li><span class="check-mark" aria-hidden="true">✓</span><span>${e}</span></li>`).join(``)}
          </ul>
        </div>
        <div class="app-showcase__image" role="img" aria-label="Aplicaciones Lumora para pacientes y profesionales mostradas en dos teléfonos"></div>
      </div>
    </section>
  `}var b=[{icon:`user`,title:`Pacientes organizados`,description:`Consulta pacientes autorizados y accede a un resumen de su información clínica.`},{icon:`clipboard`,title:`Expediente clínico`,description:`Revisa antecedentes, condiciones, alergias y la línea de tiempo del paciente.`},{icon:`medical`,title:`Registro de atención`,description:`Documenta consultas, signos vitales y notas clínicas según tus permisos.`},{icon:`pill`,title:`Diagnósticos y tratamientos`,description:`Registra diagnósticos y recetas vinculados con la atención del paciente.`}];function x(){return`
    <section class="section staff-section product-section" id="lumora-medicos">
      <div class="container staff-layout">
        <div class="staff-section__intro">
          <span class="eyebrow">Lumora para Médicos · Para profesionales de salud</span>
          <h2>Más contexto para cuidar mejor</h2>
          <p class="lead">Un espacio dedicado para consultar información clínica, documentar la atención y mantener la continuidad del expediente, según el rol y los permisos del profesional.</p>
          <div class="staff-visual" role="img" aria-label="Vista de Lumora para Médicos en un teléfono"></div>
        </div>
        <div class="staff-feature-grid">
          ${b.map(({icon:e,title:t,description:n})=>`<article class="feature-card staff-feature"><span class="feature-card__icon">${d(e)}</span><h3>${t}</h3><p>${n}</p></article>`).join(``)}
        </div>
      </div>
    </section>
  `}function S(){return`
    <section class="section ecosystem" id="nosotros">
      <div class="container ecosystem__content">
        <span class="eyebrow">El ecosistema Lumora</span>
        <h2>Dos experiencias conectadas por el cuidado</h2>
        <p>Lumora acompaña distintos momentos de la atención: ofrece al paciente herramientas para organizar su salud y al profesional recursos para documentar y dar seguimiento clínico.</p>
        <div class="ecosystem-flow" aria-label="Relación entre las dos aplicaciones de Lumora">
          <div>${d(`user`)}<strong>Paciente</strong><span>Lumora</span></div>
          <span class="ecosystem-flow__line" aria-hidden="true">↔</span>
          <div class="ecosystem-flow__center">Lumora<span>Un mismo ecosistema</span></div>
          <span class="ecosystem-flow__line" aria-hidden="true">↔</span>
          <div>${d(`medical`)}<strong>Profesional</strong><span>Lumora para Médicos</span></div>
        </div>
        <p class="brand-slogan">Lumora, iluminando el camino hacia una mejor salud.</p>
      </div>
    </section>
  `}var C=c(o(((e,t)=>{(function(e,n){typeof t==`object`&&t.exports?t.exports=n():e.Toastify=n()})(e,function(e){var t=function(e){return new t.lib.init(e)};t.defaults={oldestFirst:!0,text:`Toastify is awesome!`,node:void 0,duration:3e3,selector:void 0,callback:function(){},destination:void 0,newWindow:!1,close:!1,gravity:`toastify-top`,positionLeft:!1,position:``,backgroundColor:``,avatar:``,className:``,stopOnFocus:!0,onClick:function(){},offset:{x:0,y:0},escapeMarkup:!0,ariaLive:`polite`,style:{background:``}},t.lib=t.prototype={toastify:`1.12.0`,constructor:t,init:function(e){return e||={},this.options={},this.toastElement=null,this.options.text=e.text||t.defaults.text,this.options.node=e.node||t.defaults.node,this.options.duration=e.duration===0?0:e.duration||t.defaults.duration,this.options.selector=e.selector||t.defaults.selector,this.options.callback=e.callback||t.defaults.callback,this.options.destination=e.destination||t.defaults.destination,this.options.newWindow=e.newWindow||t.defaults.newWindow,this.options.close=e.close||t.defaults.close,this.options.gravity=e.gravity===`bottom`?`toastify-bottom`:t.defaults.gravity,this.options.positionLeft=e.positionLeft||t.defaults.positionLeft,this.options.position=e.position||t.defaults.position,this.options.backgroundColor=e.backgroundColor||t.defaults.backgroundColor,this.options.avatar=e.avatar||t.defaults.avatar,this.options.className=e.className||t.defaults.className,this.options.stopOnFocus=e.stopOnFocus===void 0?t.defaults.stopOnFocus:e.stopOnFocus,this.options.onClick=e.onClick||t.defaults.onClick,this.options.offset=e.offset||t.defaults.offset,this.options.escapeMarkup=e.escapeMarkup===void 0?t.defaults.escapeMarkup:e.escapeMarkup,this.options.ariaLive=e.ariaLive||t.defaults.ariaLive,this.options.style=e.style||t.defaults.style,e.backgroundColor&&(this.options.style.background=e.backgroundColor),this},buildToast:function(){if(!this.options)throw`Toastify is not initialized`;var e=document.createElement(`div`);for(var t in e.className=`toastify on `+this.options.className,this.options.position?e.className+=` toastify-`+this.options.position:this.options.positionLeft===!0?(e.className+=` toastify-left`,console.warn("Property `positionLeft` will be depreciated in further versions. Please use `position` instead.")):e.className+=` toastify-right`,e.className+=` `+this.options.gravity,this.options.backgroundColor&&console.warn(`DEPRECATION NOTICE: "backgroundColor" is being deprecated. Please use the "style.background" property.`),this.options.style)e.style[t]=this.options.style[t];if(this.options.ariaLive&&e.setAttribute(`aria-live`,this.options.ariaLive),this.options.node&&this.options.node.nodeType===Node.ELEMENT_NODE)e.appendChild(this.options.node);else if(this.options.escapeMarkup?e.innerText=this.options.text:e.innerHTML=this.options.text,this.options.avatar!==``){var r=document.createElement(`img`);r.src=this.options.avatar,r.className=`toastify-avatar`,this.options.position==`left`||this.options.positionLeft===!0?e.appendChild(r):e.insertAdjacentElement(`afterbegin`,r)}if(this.options.close===!0){var i=document.createElement(`button`);i.type=`button`,i.setAttribute(`aria-label`,`Close`),i.className=`toast-close`,i.innerHTML=`&#10006;`,i.addEventListener(`click`,function(e){e.stopPropagation(),this.removeElement(this.toastElement),window.clearTimeout(this.toastElement.timeOutValue)}.bind(this));var a=window.innerWidth>0?window.innerWidth:screen.width;(this.options.position==`left`||this.options.positionLeft===!0)&&a>360?e.insertAdjacentElement(`afterbegin`,i):e.appendChild(i)}if(this.options.stopOnFocus&&this.options.duration>0){var o=this;e.addEventListener(`mouseover`,function(t){window.clearTimeout(e.timeOutValue)}),e.addEventListener(`mouseleave`,function(){e.timeOutValue=window.setTimeout(function(){o.removeElement(e)},o.options.duration)})}if(this.options.destination!==void 0&&e.addEventListener(`click`,function(e){e.stopPropagation(),this.options.newWindow===!0?window.open(this.options.destination,`_blank`):window.location=this.options.destination}.bind(this)),typeof this.options.onClick==`function`&&this.options.destination===void 0&&e.addEventListener(`click`,function(e){e.stopPropagation(),this.options.onClick()}.bind(this)),typeof this.options.offset==`object`){var s=n(`x`,this.options),c=n(`y`,this.options),l=this.options.position==`left`?s:`-`+s,u=this.options.gravity==`toastify-top`?c:`-`+c;e.style.transform=`translate(`+l+`,`+u+`)`}return e},showToast:function(){this.toastElement=this.buildToast();var e=typeof this.options.selector==`string`?document.getElementById(this.options.selector):this.options.selector instanceof HTMLElement||typeof ShadowRoot<`u`&&this.options.selector instanceof ShadowRoot?this.options.selector:document.body;if(!e)throw`Root element is not defined`;var n=t.defaults.oldestFirst?e.firstChild:e.lastChild;return e.insertBefore(this.toastElement,n),t.reposition(),this.options.duration>0&&(this.toastElement.timeOutValue=window.setTimeout(function(){this.removeElement(this.toastElement)}.bind(this),this.options.duration)),this},hideToast:function(){this.toastElement.timeOutValue&&clearTimeout(this.toastElement.timeOutValue),this.removeElement(this.toastElement)},removeElement:function(e){e.className=e.className.replace(` on`,``),window.setTimeout(function(){this.options.node&&this.options.node.parentNode&&this.options.node.parentNode.removeChild(this.options.node),e.parentNode&&e.parentNode.removeChild(e),this.options.callback.call(e),t.reposition()}.bind(this),400)}},t.reposition=function(){for(var e={top:15,bottom:15},t={top:15,bottom:15},n={top:15,bottom:15},i=document.getElementsByClassName(`toastify`),a,o=0;o<i.length;o++){a=r(i[o],`toastify-top`)===!0?`toastify-top`:`toastify-bottom`;var s=i[o].offsetHeight;a=a.substr(9,a.length-1);var c=15;(window.innerWidth>0?window.innerWidth:screen.width)<=360?(i[o].style[a]=n[a]+`px`,n[a]+=s+c):r(i[o],`toastify-left`)===!0?(i[o].style[a]=e[a]+`px`,e[a]+=s+c):(i[o].style[a]=t[a]+`px`,t[a]+=s+c)}return this};function n(e,t){return t.offset[e]?isNaN(t.offset[e])?t.offset[e]:t.offset[e]+`px`:`0px`}function r(e,t){return!e||typeof t!=`string`?!1:!!(e.className&&e.className.trim().split(/\s+/gi).indexOf(t)>-1)}return t.lib.init.prototype=t.lib,t})}))(),1);function w(){return`
    <section class="section contact" id="contacto">
      <div class="container contact__grid">
        <div class="download-card">
          <span class="eyebrow">Estamos para escucharte</span>
          <h2>Conversemos sobre Lumora</h2>
          <p>¿Quieres conocer más sobre Lumora o Lumora para Médicos? Escríbenos y conoce las dos experiencias de nuestro ecosistema de salud.</p>
          <p class="brand-slogan brand-slogan--left">Lumora, iluminando el camino hacia una mejor salud.</p>
          <button class="button button--download" type="button" disabled title="El enlace de descarga estará disponible próximamente">Descargar próximamente</button>
        </div>
        <div class="contact-card">
          <h2>Escríbenos</h2>
          <p>Cuéntanos cuál de las dos aplicaciones quieres conocer.</p>
          <form action="https://formspree.io/f/mwlkvodz" method="POST" data-contact-form>
            <label for="name">Nombre completo</label>
            <input id="name" name="nombre" autocomplete="name" placeholder="Ej. Ana Pérez" required />
            <label for="email">Correo electrónico</label>
            <input id="email" name="email" type="email" autocomplete="email" placeholder="ana@ejemplo.com" required />
            <label for="message">Mensaje</label>
            <textarea id="message" name="message" rows="4" placeholder="¿En qué podemos ayudarte?" required></textarea>
            <button class="button button--block" type="submit">Enviar mensaje</button>
          </form>
          <address class="contact-details">
            <a href="mailto:lumorahealthnic@gmail.com">${d(`mail`)}lumorahealthnic@gmail.com</a>
          </address>
        </div>
      </div>
    </section>
  `}function T(){let e=document.querySelector(`[data-contact-form]`);e&&e.addEventListener(`submit`,async t=>{t.preventDefault();let n=e.querySelector(`button[type="submit"]`);if(n){n.disabled=!0,n.textContent=`Enviando…`;try{if(!(await fetch(e.action,{method:`POST`,body:new FormData(e),headers:{Accept:`application/json`}})).ok)throw Error(`No se pudo enviar el formulario`);e.reset(),(0,C.default)({text:`Mensaje enviado. Gracias por escribirnos.`,duration:4e3,gravity:`top`,position:`right`,className:`toastify-success`,close:!0}).showToast()}catch{(0,C.default)({text:`No pudimos enviar tu mensaje. Inténtalo de nuevo.`,duration:4e3,gravity:`top`,position:`right`,className:`toastify-error`,close:!0}).showToast()}finally{n.disabled=!1,n.textContent=`Enviar mensaje`}}})}function E(){return`
    <footer class="site-footer">
      <div class="container footer__grid">
        <div>${l()}<p>Lumora, iluminando el camino hacia una mejor salud.</p></div>
        <nav aria-label="Productos"><strong>Productos</strong><a href="#lumora">Lumora</a><a href="#lumora-medicos">Lumora para Médicos</a></nav>
        <nav aria-label="Compañía"><strong>Compañía</strong><a href="#nosotros">Ecosistema</a><a href="#contacto">Contacto</a></nav>
        <nav aria-label="Legal"><strong>Legal</strong><a href="mailto:lumorahealthnic@gmail.com?subject=Política%20de%20privacidad">Privacidad</a><a href="mailto:lumorahealthnic@gmail.com?subject=Términos%20de%20servicio">Términos de servicio</a></nav>
      </div>
      <div class="container footer__bottom">© ${new Date().getFullYear()} Lumora Health. Todos los derechos reservados.</div>
    </footer>
  `}var D=document.querySelector(`#app`);if(!D)throw Error(`No se encontró el contenedor principal de la aplicación`);D.innerHTML=`
  ${p()}
  <main>
    ${m()}
    ${h()}
    ${_()}
    ${y()}
    ${x()}
    ${S()}
    ${w()}
  </main>
${E()}
`,T();