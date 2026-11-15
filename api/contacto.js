import { neon } from '@neondatabase/serverless';

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// La integración de Neon puede nombrar la variable con prefijo (DATABASE_URL_DATABASE_URL)
const DB_URL = process.env.DATABASE_URL || process.env.DATABASE_URL_DATABASE_URL || process.env.DATABASE_URL_POSTGRES_URL;
const PAQUETES = ['No estoy seguro', 'Básico', 'Intermedio', 'Premium', 'Mantenimiento'];

let tabla; // la tabla se crea una sola vez por instancia
function db() {
  const sql = neon(DB_URL);
  tabla ??= sql`CREATE TABLE IF NOT EXISTS solicitudes (
    id serial PRIMARY KEY, nombre text NOT NULL, email text NOT NULL, telefono text, paquete text,
    negocio text, mensaje text NOT NULL, estado text NOT NULL DEFAULT 'nuevo', creado timestamptz NOT NULL DEFAULT now())`;
  return { sql, listo: tabla };
}

export default async function handler(req, res) {
  const ir = (estado) => res.redirect(303, estado === 'ok' ? '/gracias' : `/?estado=${estado}#contacto`);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }

  const b = req.body || {};
  if (b['bot-field']) return ir('ok'); // campo trampa para bots

  const d = {
    nombre: clip(b.nombre, 120), email: clip(b.email, 160), telefono: clip(b.telefono, 40),
    negocio: clip(b.negocio, 120), mensaje: clip(b.mensaje, 2000),
    paquete: PAQUETES.includes(b.paquete) ? b.paquete : 'No estoy seguro',
  };
  if (!d.nombre || !/^\S+@\S+\.\S+$/.test(d.email) || !d.mensaje) return ir('datos');

  let guardado = false, enviado = false;

  if (DB_URL) {
    try {
      const { sql, listo } = db();
      await listo;
      const rep = await sql`SELECT 1 FROM solicitudes WHERE email = ${d.email} AND creado > now() - interval '5 minutes' LIMIT 1`;
      if (rep.length) return ir('espera');
      await sql`INSERT INTO solicitudes (nombre, email, telefono, paquete, negocio, mensaje)
                VALUES (${d.nombre}, ${d.email}, ${d.telefono}, ${d.paquete}, ${d.negocio}, ${d.mensaje})`;
      guardado = true;
      console.log('Solicitud guardada en la base de datos');
    } catch (e) { console.error('Base de datos:', e); }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const filas = [['Nombre', d.nombre], ['Correo', d.email], ['WhatsApp', d.telefono || '—'], ['Paquete', d.paquete], ['Negocio', d.negocio || '—']];
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'Trazo Digital <onboarding@resend.dev>',
          to: [process.env.NOTIFY_EMAIL || 'hmundo491@gmail.com'],
          reply_to: d.email,
          subject: `Nueva solicitud: ${d.nombre.slice(0, 80)}`,
          text: filas.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${d.mensaje}`,
          html: `<h2>Nueva solicitud en Trazo Digital</h2><table cellpadding="6">${filas.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('')}</table><p style="white-space:pre-wrap">${esc(d.mensaje)}</p>`,
        }),
      });
      enviado = r.ok;
      if (!r.ok) console.error('Resend:', r.status, await r.text());
    } catch (e) { console.error('Correo:', e); }
  }

  return ir(guardado || enviado ? 'ok' : 'error');
}
