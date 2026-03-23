/**
 * Panel de estadísticas — Expo Formación UOCRA
 * Consume GET /api/stats y renderiza los gráficos sin librerías externas.
 */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  async function cargarStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      $('stats-loading').hidden = true;
      $('stats-content').hidden = false;

      renderResumen(data.resumen);
      renderTendencia(data.por_dia);
      renderCharlas(data.por_charla);
      renderComoSeEnteraron(data.como_se_enteraron);
      renderValidacion(data.resumen);

    } catch (err) {
      $('stats-loading').hidden = true;
      $('stats-error').hidden = false;
      $('stats-error-msg').textContent = 'Error al cargar las estadísticas: ' + err.message;
    }
  }

  function renderResumen(r) {
    $('stat-total').textContent = r.total_inscriptos ?? '—';
    $('stat-semana').textContent = r.inscriptos_ultima_semana ?? '—';
    $('stat-validados').textContent = r.validados ?? '—';
    $('stat-pendientes').textContent = r.pendientes ?? '—';
  }

  function renderTendencia(porDia) {
    const container = $('tendencia-chart');
    if (!porDia || !porDia.length) {
      container.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.85rem;">Sin datos en los últimos 14 días.</p>';
      return;
    }

    const maxVal = Math.max(...porDia.map(d => d.cantidad), 1);

    container.innerHTML = porDia.map(d => {
      const pct = Math.round((d.cantidad / maxVal) * 100);
      const fecha = new Date(d.fecha);
      const label = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      return `
        <div class="tendencia-bar-wrap" title="${label}: ${d.cantidad} inscripto${d.cantidad !== 1 ? 's' : ''}">
          <div class="tendencia-bar" style="height:${Math.max(pct, 2)}%;"></div>
          <div class="tendencia-label">${label}</div>
        </div>
      `;
    }).join('');
  }

  function renderCharlas(porCharla) {
    const container = $('charlas-chart');
    if (!porCharla || !porCharla.length) {
      container.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.85rem;">Sin datos.</p>';
      return;
    }

    const maxVal = Math.max(...porCharla.map(c => c.total_inscriptos), 1);

    container.innerHTML = porCharla.map(c => {
      const pct = Math.round((c.total_inscriptos / c.capacidad_maxima) * 100);
      const barWidth = Math.round((c.total_inscriptos / maxVal) * 100);
      let fillClass = '';
      if (pct >= 90) fillClass = 'danger';
      else if (pct >= 70) fillClass = 'warning';

      return `
        <div class="barra-item">
          <div class="barra-header">
            <span class="barra-label" title="${c.titulo} — ${c.horario} — ${c.ubicacion}">${c.titulo}</span>
            <span class="barra-valor">${c.total_inscriptos} / ${c.capacidad_maxima}</span>
          </div>
          <div class="barra-track">
            <div class="barra-fill ${fillClass}" style="width:${barWidth}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderComoSeEnteraron(comoSe) {
    const container = $('como-chart');
    if (!comoSe || !comoSe.length) {
      container.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.85rem;">Sin datos.</p>';
      return;
    }

    const total = comoSe.reduce((s, c) => s + Number(c.cantidad), 0) || 1;

    container.innerHTML = comoSe.map(c => {
      const pct = Math.round((Number(c.cantidad) / total) * 100);
      return `
        <div class="barra-item">
          <div class="barra-header">
            <span class="barra-label">${c.descripcion}</span>
            <span class="barra-valor">${c.cantidad} (${pct}%)</span>
          </div>
          <div class="barra-track">
            <div class="barra-fill" style="width:${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderValidacion(r) {
    const total = Number(r.total_inscriptos) || 0;
    const validados = Number(r.validados) || 0;
    const pendientes = Number(r.pendientes) || 0;
    const pct = total > 0 ? Math.round((validados / total) * 100) : 0;

    const circunferencia = 100;
    const dasharray = `${pct} ${circunferencia - pct}`;
    const arc = $('donut-arc');
    if (arc) arc.setAttribute('stroke-dasharray', dasharray);

    $('donut-pct').textContent = pct + '%';
    $('leyenda-validados').textContent = `${validados} validado${validados !== 1 ? 's' : ''}`;
    $('leyenda-pendientes').textContent = `${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`;
  }

  cargarStats();

  setInterval(cargarStats, 60000);

})();