(function () {
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', on);
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    });
  });
  document.querySelectorAll('[data-pkg]').forEach(function (a) {
    a.addEventListener('click', function () {
      var s = document.getElementById('pk');
      if (s) { s.value = a.dataset.pkg; }
    });
  });
  var msg = document.getElementById('msg'), q = new URLSearchParams(location.search).get('estado');
  if (msg && q) {
    msg.textContent = q === 'datos' ? 'Revisa tu nombre, un correo válido y el mensaje.' : q === 'espera' ? 'Ya recibimos tu solicitud. Espera unos minutos antes de enviar otra.' : 'No se pudo enviar. Inténtalo de nuevo en unos minutos.';
    msg.style.color = '#e2e8f0';
  }
  var y = document.getElementById('y');
  if (y) { y.textContent = new Date().getFullYear(); }

  // Portafolio: se llena desde projects.json
  var box = document.getElementById('works');
  if (!box) { return; }
  fetch('projects.json').then(function (r) { return r.json(); }).then(function (list) {
    if (!Array.isArray(list) || !list.length) { return; }
    list.slice(0, 6).forEach(function (p) {
      var c = document.createElement('article'); c.className = 'card';
      var imgs = Array.isArray(p.imagenes) ? p.imagenes : (p.imagen ? [p.imagen] : []);
      imgs.forEach(function (src, n) {
        var i = document.createElement('img'); i.src = src; i.loading = 'lazy';
        i.alt = (n ? 'Vista en celular de ' : 'Captura de ') + p.titulo;
        if (n) { i.className = 'thumb'; }
        c.appendChild(i);
      });
      var h = document.createElement('h3'); h.textContent = p.titulo; c.appendChild(h);
      var d = document.createElement('p'); d.textContent = p.descripcion || ''; c.appendChild(d);
      if (/^https:\/\//.test(p.url || '')) {
        var a = document.createElement('a'); a.className = 'lk'; a.href = p.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Ver sitio en línea →'; c.appendChild(a);
      }
      box.appendChild(c);
    });
    document.getElementById('portafolio').hidden = false;
    document.querySelectorAll('.nav-work').forEach(function (n) { n.hidden = false; });
  }).catch(function () {});
})();
