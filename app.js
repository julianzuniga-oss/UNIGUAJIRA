// NOTA: Este archivo contiene las funciones del frontend
// Para que funcione, necesitas configurar el backend en Google Apps Script
// Consulta el README.md para más información

// Variables globales
let usuarioActual = null;
let retoSeleccionadoId = null;
let evidenciaSeleccionadaId = null;
let tipoRankingActual = 'capitular';
let retoADesactivar = null;
let operacionEnProceso = false;

// Configuración de la URL del Web App de Google Apps Script
// DEBES CAMBIAR ESTO por la URL de tu Web App desplegada
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwtdAwIeD5pGjiocrSC9STNu1sRTcEfz_lto4PHhl9P75Wi4E9EVCbFy6PvicAJz1JWrQ/exec';

// Función auxiliar para llamar al backend
async function llamarBackend(funcion, ...parametros) {
  try {
    console.log('Llamando a:', GOOGLE_APPS_SCRIPT_URL);
    console.log('Función:', funcion);
    console.log('Parámetros:', parametros);
    
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        funcion: funcion,
        parametros: parametros
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error('Error en la comunicación con el servidor: ' + response.status);
    }
    
    // Verificar si la respuesta es JSON
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Respuesta NO es JSON:', responseText);
      throw new Error('El servidor no está respondiendo correctamente. Respuesta recibida: ' + responseText.substring(0, 200));
    }
    
    const data = await response.json();
    console.log('Respuesta del servidor:', data);
    return data;
    
  } catch (error) {
    console.error('Error completo:', error);
    throw error;
  }
}

// Funciones de control de botones
function deshabilitarBoton(boton, textoOriginal) {
  if (!boton) return;
  boton.disabled = true;
  boton.style.opacity = '0.6';
  boton.style.cursor = 'not-allowed';
  boton.setAttribute('data-texto-original', textoOriginal || boton.textContent);
  boton.textContent = 'Procesando...';
}

function habilitarBoton(boton) {
  if (!boton) return;
  boton.disabled = false;
  boton.style.opacity = '1';
  boton.style.cursor = 'pointer';
  const textoOriginal = boton.getAttribute('data-texto-original');
  if (textoOriginal) {
    boton.textContent = textoOriginal;
  }
}

function deshabilitarBotonesModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const botones = modal.querySelectorAll('button:not(.btn-close)');
  botones.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.6';
  });
}

function habilitarBotonesModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const botones = modal.querySelectorAll('button');
  botones.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = '1';
  });
}

// Login
async function iniciarSesion() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  
  if (!email || !password) {
    mostrarAlerta('loginError', 'Por favor ingresa tu correo y contraseña', 'error');
    return;
  }

  mostrarCargando('loginError');
  
  try {
    const resultado = await llamarBackend('loginUsuario', email, password);
    respuestaLogin(resultado);
  } catch (error) {
    errorLogin(error);
  }
}

function respuestaLogin(resultado) {
  if (resultado.success) {
    usuarioActual = resultado.usuario;
    
    if (resultado.usuario.requiereCambioPassword) {
      document.getElementById('loginSection').classList.add('hidden');
      document.getElementById('cambioPasswordSection').classList.remove('hidden');
      return;
    }
    
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    
    document.getElementById('userInfo').innerHTML = `
      <div class="user-badge">${usuarioActual.nombre}</div>
      <div class="user-badge">${usuarioActual.rol}</div>
      <button class="btn-logout" onclick="cerrarSesion()">Salir</button>
    `;
    
    configurarInterfazSegunRol();
    cargarDatos();
  } else {
    mostrarAlerta('loginError', resultado.message, 'error');
  }
}

function errorLogin(error) {
  mostrarAlerta('loginError', 'Error al conectar con el servidor. Verifica que hayas configurado correctamente la URL del backend.', 'error');
}

async function cambiarPassword() {
  const passwordActual = document.getElementById('passwordActual').value.trim();
  const passwordNueva = document.getElementById('passwordNueva').value.trim();
  const passwordConfirmar = document.getElementById('passwordConfirmar').value.trim();
  
  if (!passwordActual || !passwordNueva || !passwordConfirmar) {
    mostrarAlerta('cambioPasswordError', 'Por favor completa todos los campos', 'error');
    return;
  }
  
  if (passwordNueva !== passwordConfirmar) {
    mostrarAlerta('cambioPasswordError', 'Las contraseñas no coinciden', 'error');
    return;
  }
  
  if (passwordNueva.length < 6) {
    mostrarAlerta('cambioPasswordError', 'La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  mostrarCargando('cambioPasswordError');
  
  try {
    const resultado = await llamarBackend('cambiarPassword', usuarioActual.email, passwordActual, passwordNueva);
    
    if (resultado.success) {
      mostrarAlerta('cambioPasswordError', resultado.message, 'success');
      setTimeout(function() {
        document.getElementById('cambioPasswordSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        
        document.getElementById('userInfo').innerHTML = `
          <div class="user-badge">${usuarioActual.nombre}</div>
          <div class="user-badge">${usuarioActual.rol}</div>
          <button class="btn-logout" onclick="cerrarSesion()">Salir</button>
        `;
        
        configurarInterfazSegunRol();
        cargarDatos();
      }, 1500);
    } else {
      mostrarAlerta('cambioPasswordError', resultado.message, 'error');
    }
  } catch (error) {
    mostrarAlerta('cambioPasswordError', 'Error al cambiar contraseña', 'error');
  }
}

function cerrarSesion() {
  location.reload();
}

function configurarInterfazSegunRol() {
  const navTabs = document.getElementById('navTabs');
  navTabs.innerHTML = '';

  if (usuarioActual.rol === 'Asociado') {
    navTabs.innerHTML = `
      <button class="nav-tab active" onclick="cambiarTab('tabMisRetos')">Mis Retos</button>
      <button class="nav-tab" onclick="cambiarTab('tabRanking')">Ranking</button>
    `;
    cambiarTab('tabMisRetos');
  } 
  else if (usuarioActual.rol === 'Director') {
    navTabs.innerHTML = `
      <button class="nav-tab active" onclick="cambiarTab('tabValidarEvidencias')">Validar Evidencias</button>
      <button class="nav-tab" onclick="cambiarTab('tabGestionRetos')">Gestión de Retos</button>
      <button class="nav-tab" onclick="cambiarTab('tabRanking')">Ranking</button>
    `;
    cambiarTab('tabValidarEvidencias');
  }
  else if (usuarioActual.rol === 'Presidente') {
    navTabs.innerHTML = `
      <button class="nav-tab active" onclick="cambiarTab('tabGestionRetosPresidente')">Gestión de Retos</button>
      <button class="nav-tab" onclick="cambiarTab('tabValidarTodasEvidencias')">Validar Evidencias</button>
      <button class="nav-tab" onclick="cambiarTab('tabRanking')">Ranking</button>
    `;
    cambiarTab('tabGestionRetosPresidente');
  }
  else if (usuarioActual.rol === 'Admin' || usuarioActual.rol === 'Junta Directiva') {
    navTabs.innerHTML = `
      <button class="nav-tab active" onclick="cambiarTab('tabAdmin')">Panel Administrativo</button>
      <button class="nav-tab" onclick="cambiarTab('tabRanking')">Ranking</button>
    `;
    cambiarTab('tabAdmin');
  }
}

function cambiarTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });
  
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(tabId).classList.remove('hidden');
  
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  cargarDatosTab(tabId);
}

function cargarDatos() {
  // Esta función se llama al iniciar sesión
  // Las funciones específicas se llaman en cargarDatosTab
}

function cargarDatosTab(tabId) {
  if (tabId === 'tabMisRetos' && usuarioActual.rol === 'Asociado') {
    cargarRetosDisponibles();
    cargarMisEvidencias();
  } else if (tabId === 'tabValidarEvidencias' && usuarioActual.rol === 'Director') {
    cargarEvidenciasPendientes();
  } else if (tabId === 'tabGestionRetos' && usuarioActual.rol === 'Director') {
    cargarRetosGestion();
  } else if (tabId === 'tabGestionRetosPresidente' && usuarioActual.rol === 'Presidente') {
    cargarRetosPresidente();
  } else if (tabId === 'tabValidarTodasEvidencias' && usuarioActual.rol === 'Presidente') {
    cargarTodasEvidenciasPendientes();
  } else if (tabId === 'tabRanking') {
    cargarRanking();
  } else if (tabId === 'tabAdmin') {
    cargarEstadisticas();
    cargarTodosRetos();
    cargarTodasEvidencias();
  }
}

// Placeholder para las funciones de carga de datos
// Estas deberían conectarse con el backend real
async function cargarRetosDisponibles() {
  const contenedor = document.getElementById('retosDisponibles');
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando retos...</p></div>';
  
  try {
    const retos = await llamarBackend('getRetosDisponiblesParaAsociado', usuarioActual.id, usuarioActual.direccion);
    
    if (retos.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; color: #999;">No hay retos activos disponibles o ya completaste todos los retos</p>';
      return;
    }
    
    contenedor.innerHTML = '';
    retos.forEach(reto => {
      const div = document.createElement('div');
      div.className = 'card reto-card';
      const tipoReto = reto.esGlobal ? '<span class="badge badge-global">GLOBAL</span>' : '<span class="badge badge-direccion">DIRECCIÓN</span>';
      div.innerHTML = `
        <h3>${reto.nombre} ${tipoReto}</h3>
        <p>${reto.descripcion}</p>
        <div class="reto-info">
          <span class="badge badge-puntaje">${reto.puntaje} puntos</span>
          <span class="badge badge-fecha">${reto.fechaFin}</span>
        </div>
        <button class="btn btn-primary" style="margin-top: 1rem; width: 100%;" 
                onclick="mostrarModalSubirEvidencia('${reto.id}', '${reto.nombre}')">
          Subir Evidencia
        </button>
      `;
      contenedor.appendChild(div);
    });
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar retos. Verifica la configuración del backend.</p>';
  }
}

async function cargarMisEvidencias() {
  const contenedor = document.getElementById('misEvidencias');
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const evidencias = await llamarBackend('getMisEvidencias', usuarioActual.id);
    
    if (evidencias.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; color: #999;">Aún no has subido evidencias</p>';
      return;
    }
    
    let html = '<div class="table-container"><table><thead><tr><th>Reto</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th>Observación</th><th>Enlace</th></tr></thead><tbody>';
    
    evidencias.forEach(e => {
      const badgeClass = e.estado === 'Aprobado' ? 'badge-success' : 
                        e.estado === 'Pendiente' ? 'badge-warning' : 'badge-danger';
      const tipo = e.esGlobal ? '<span class="badge badge-global">GLOBAL</span>' : '<span class="badge badge-fecha">DIRECCIÓN</span>';
      html += `
        <tr>
          <td>${e.nombreReto}</td>
          <td>${tipo}</td>
          <td>${e.fechaCarga}</td>
          <td><span class="badge ${badgeClass}">${e.estado}</span></td>
          <td>${e.observacion || '-'}</td>
          <td><a href="${e.url}" target="_blank">Ver</a></td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    contenedor.innerHTML = html;
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar evidencias</p>';
  }
}

async function cargarEvidenciasPendientes() {
  const contenedor = document.getElementById('evidenciasPendientes');
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const evidencias = await llamarBackend('getEvidenciasPendientes', usuarioActual.direccion);
    
    if (evidencias.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; color: #999;">No hay evidencias pendientes</p>';
      return;
    }
    
    let html = '<div class="table-container"><table><thead><tr><th>Asociado</th><th>Reto</th><th>Tipo</th><th>Fecha</th><th>Enlace</th><th>Acción</th></tr></thead><tbody>';
    
    evidencias.forEach(e => {
      const tipo = e.esGlobal ? '<span class="badge badge-global">GLOBAL</span>' : '<span class="badge badge-fecha">DIRECCIÓN</span>';
      html += `
        <tr>
          <td>${e.nombreAsociado}</td>
          <td>${e.nombreReto}</td>
          <td>${tipo}</td>
          <td>${e.fechaCarga}</td>
          <td><a href="${e.url}" target="_blank">Ver evidencia</a></td>
          <td>
            <button class="btn btn-warning" style="width: auto; padding: 0.5rem 1rem;" 
                    onclick="mostrarModalValidarEvidencia('${e.id}', '${e.nombreAsociado}', '${e.nombreReto}', '${e.url}')">
              Validar
            </button>
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    contenedor.innerHTML = html;
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar evidencias</p>';
  }
}

async function cargarRetosGestion() {
  const contenedor = document.getElementById('retosGestion');
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const retos = await llamarBackend('getRetosDireccion', usuarioActual.direccion);
    
    if (retos.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; color: #999;">No hay retos creados</p>';
      return;
    }
    
    contenedor.innerHTML = '';
    retos.forEach(reto => {
      if (!reto.esGlobal) {
        const div = document.createElement('div');
        div.className = 'card reto-card';
        div.innerHTML = `
          <h3>${reto.nombre}</h3>
          <p>${reto.descripcion}</p>
          <div class="reto-info">
            <span class="badge badge-puntaje">${reto.puntaje} pts</span>
            <span class="badge badge-fecha">${reto.fechaInicio} - ${reto.fechaFin}</span>
          </div>
          <div class="reto-actions">
            <button class="btn btn-edit" onclick="if(!operacionEnProceso) editarReto('${reto.id}')">
              Editar
            </button>
            <button class="btn btn-danger" onclick="if(!operacionEnProceso) desactivarReto('${reto.id}')">
              Desactivar
            </button>
          </div>
        `;
        contenedor.appendChild(div);
      }
    });
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar retos</p>';
  }
}

async function cargarRetosPresidente() {
  const contenedor = document.getElementById('retosPresidenteGestion');
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const retos = await llamarBackend('getTodosLosRetos');
    
    if (retos.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; color: #999;">No hay retos creados</p>';
      return;
    }

    contenedor.innerHTML = '';
    retos.forEach(reto => {
      const div = document.createElement('div');
      div.className = 'card reto-card';
      const tipoLabel = reto.esGlobal
        ? '<span class="badge badge-global">GLOBAL</span>'
        : `<span class="badge badge-direccion">${reto.direccion}</span>`;

      div.innerHTML = `
        <h3>${reto.nombre} ${tipoLabel}</h3>
        <p>${reto.descripcion}</p>
        <div class="reto-info">
          <span class="badge badge-puntaje">${reto.puntaje} pts</span>
          <span class="badge badge-fecha">${reto.fechaInicio} - ${reto.fechaFin}</span>
        </div>
        <div class="reto-actions">
          <button class="btn btn-edit" onclick="if(!operacionEnProceso) editarRetoPresidente('${reto.id}', ${reto.esGlobal})">
            Editar
          </button>
          <button class="btn btn-danger" onclick="if(!operacionEnProceso) desactivarReto('${reto.id}')">
            Desactivar
          </button>
        </div>
      `;
      contenedor.appendChild(div);
    });
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar retos</p>';
  }
}

async function cargarTodasEvidenciasPendientes() {
  const contenedor = document.getElementById('todasEvidenciasPendientes');
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const evidencias = await llamarBackend('getTodasLasEvidenciasPendientes');
    
    if (evidencias.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; color: #999;">No hay evidencias pendientes</p>';
      return;
    }
    
    let html = '<div class="table-container"><table><thead><tr><th>Asociado</th><th>Dirección</th><th>Reto</th><th>Tipo</th><th>Fecha</th><th>Enlace</th><th>Acción</th></tr></thead><tbody>';
    
    evidencias.forEach(e => {
      const tipo = e.esGlobal ? '<span class="badge badge-global">GLOBAL</span>' : '<span class="badge badge-fecha">DIRECCIÓN</span>';
      html += `
        <tr>
          <td>${e.nombreAsociado}</td>
          <td>${e.direccion}</td>
          <td>${e.nombreReto}</td>
          <td>${tipo}</td>
          <td>${e.fechaCarga}</td>
          <td><a href="${e.url}" target="_blank">Ver evidencia</a></td>
          <td>
            <button class="btn btn-warning" style="width: auto; padding: 0.5rem 1rem;" 
                    onclick="mostrarModalValidarEvidencia('${e.id}', '${e.nombreAsociado}', '${e.nombreReto}', '${e.url}')">
              Validar
            </button>
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    contenedor.innerHTML = html;
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar evidencias</p>';
  }
}

function cambiarTipoRanking(tipo, boton) {
  tipoRankingActual = tipo;
  
  document.querySelectorAll('.ranking-selector button').forEach(btn => {
    btn.classList.remove('active');
  });
  boton.classList.add('active');
  
  cargarRanking();
}

async function cargarRanking() {
  const contenedor = document.getElementById('rankingContenido');
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  if (tipoRankingActual === 'capitular') {
    await cargarRankingCapitular(contenedor);
  } else if (tipoRankingActual === 'direccion') {
    await cargarRankingDireccion(contenedor);
  }
}

async function cargarRankingCapitular(contenedor) {
  try {
    const ranking = await llamarBackend('getRankingGeneral');
    const rankingDirecciones = await llamarBackend('getRankingDirecciones', 'total');
    
    let html = '<h3>Ranking por Direcciones</h3>';
    
    if (rankingDirecciones.length === 0) {
      html += '<p style="text-align: center; color: #999;">No hay datos de ranking</p>';
    } else {
      const maxPuntaje = rankingDirecciones[0].puntajeTotal;
      
      rankingDirecciones.forEach((item, index) => {
        const porcentaje = (item.puntajeTotal / maxPuntaje) * 100;
        let medalClass = '';
        if (index === 0) medalClass = 'gold';
        else if (index === 1) medalClass = 'silver';
        else if (index === 2) medalClass = 'bronze';
        
        html += `
          <div class="ranking-item">
            <div class="ranking-position ${medalClass}">${index + 1}</div>
            <div class="ranking-info">
              <div class="ranking-name">${item.direccion}</div>
              <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${porcentaje}%">
                  ${item.puntajeTotal} pts
                </div>
              </div>
            </div>
          </div>
        `;
      });
    }
    
    html += '<h3 style="margin-top: 2rem;">Ranking Individual</h3>';
    
    if (ranking.length === 0) {
      html += '<p style="text-align: center; color: #999;">No hay datos de ranking</p>';
    } else {
      html += '<div class="table-container"><table><thead><tr><th>#</th><th>Nombre</th><th>Dirección</th><th>Puntaje Total</th></tr></thead><tbody>';
      
      ranking.slice(0, 20).forEach((item, index) => {
        html += `
          <tr>
            <td><strong>${index + 1}</strong></td>
            <td>${item.nombre}</td>
            <td>${item.direccion}</td>
            <td><span class="badge badge-puntaje">${item.puntaje} pts</span></td>
          </tr>
        `;
      });
      
      html += '</tbody></table></div>';
    }
    
    contenedor.innerHTML = html;
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar ranking</p>';
  }
}

async function cargarRankingDireccion(contenedor) {
  const direccion = usuarioActual.direccion;

  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const ranking = await llamarBackend('getRankingPorDireccion', direccion, 'direccion');
    
    if (ranking.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; color: #999;">No hay datos de ranking aún en ' + direccion + '</p>';
      return;
    }

    const maxPuntaje = ranking[0].puntaje || 1;

    let html = '<h3 style="margin-bottom: 1rem;">' + direccion + '</h3>';

    ranking.forEach((item, index) => {
      const porcentaje = (item.puntaje / maxPuntaje) * 100;
      let medalClass = '';
      if (index === 0) medalClass = 'gold';
      else if (index === 1) medalClass = 'silver';
      else if (index === 2) medalClass = 'bronze';

      const esActual = item.nombre === usuarioActual.nombre;

      html += `
        <div class="ranking-item" style="${esActual ? 'border: 2px solid var(--secondary); background: #e3f2fd;' : ''}">
          <div class="ranking-position ${medalClass}">${index + 1}</div>
          <div class="ranking-info">
            <div class="ranking-name">
              ${item.nombre}
              ${esActual ? '<span class="badge badge-direccion" style="font-size: 0.7rem; margin-left: 0.5rem;">Tú</span>' : ''}
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" style="width: ${porcentaje}%">
                ${item.puntaje} pts
              </div>
            </div>
          </div>
        </div>
      `;
    });

    contenedor.innerHTML = html;
  } catch (error) {
    contenedor.innerHTML = '<p style="color: var(--danger);">Error al cargar ranking</p>';
  }
}

async function cargarEstadisticas() {
  try {
    const stats = await llamarBackend('getEstadisticasGenerales');
    const contenedor = document.getElementById('estadisticas');
    contenedor.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${stats.retosActivos}</div>
        <div class="stat-label">Retos Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.totalAsociados}</div>
        <div class="stat-label">Asociados Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.evidenciasPendientes}</div>
        <div class="stat-label">Evidencias Pendientes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats.evidenciasAprobadas}</div>
        <div class="stat-label">Evidencias Aprobadas</div>
      </div>
    `;
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

async function cargarTodosRetos() {
  try {
    const retos = await llamarBackend('getTodosLosRetos');
    const contenedor = document.getElementById('todosRetos');
    
    if (retos.length === 0) {
      contenedor.innerHTML = '<p>No hay retos</p>';
      return;
    }
    
    let html = '<div class="table-container"><table><thead><tr><th>Dirección</th><th>Reto</th><th>Tipo</th><th>Puntaje</th><th>Fecha Fin</th></tr></thead><tbody>';
    
    retos.forEach(r => {
      const tipo = r.esGlobal ? '<span class="badge badge-global">GLOBAL</span>' : '<span class="badge badge-fecha">DIRECCIÓN</span>';
      html += `
        <tr>
          <td>${r.direccion}</td>
          <td>${r.nombre}</td>
          <td>${tipo}</td>
          <td>${r.puntaje} pts</td>
          <td>${r.fechaFin}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    contenedor.innerHTML = html;
  } catch (error) {
    document.getElementById('todosRetos').innerHTML = '<p style="color: var(--danger);">Error al cargar retos</p>';
  }
}

async function cargarTodasEvidencias() {
  try {
    const evidencias = await llamarBackend('getTodasLasEvidencias');
    const contenedor = document.getElementById('todasEvidencias');
    
    if (evidencias.length === 0) {
      contenedor.innerHTML = '<p>No hay evidencias</p>';
      return;
    }
    
    let html = '<div class="table-container"><table><thead><tr><th>Asociado</th><th>Dirección</th><th>Reto</th><th>Tipo</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>';
    
    evidencias.forEach(e => {
      const badgeClass = e.estado === 'Aprobado' ? 'badge-success' : 
                        e.estado === 'Pendiente' ? 'badge-warning' : 'badge-danger';
      const tipo = e.esGlobal ? '<span class="badge badge-global">GLOBAL</span>' : '<span class="badge badge-fecha">DIRECCIÓN</span>';
      html += `
        <tr>
          <td>${e.nombreAsociado}</td>
          <td>${e.direccion}</td>
          <td>${e.nombreReto}</td>
          <td>${tipo}</td>
          <td>${e.fechaCarga}</td>
          <td><span class="badge ${badgeClass}">${e.estado}</span></td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    contenedor.innerHTML = html;
  } catch (error) {
    document.getElementById('todasEvidencias').innerHTML = '<p style="color: var(--danger);">Error al cargar evidencias</p>';
  }
}

function mostrarModalSubirEvidencia(idReto, nombreReto) {
  retoSeleccionadoId = idReto;
  document.getElementById('retoSeleccionado').textContent = nombreReto;
  document.getElementById('urlEvidencia').value = '';
  document.getElementById('modalSubirEvidencia').classList.add('show');
}

function mostrarModalCrearReto() {
  document.getElementById('tituloModalReto').textContent = 'Crear Nuevo Reto';
  document.getElementById('btnGuardarReto').textContent = 'Crear Reto';
  document.getElementById('nombreReto').value = '';
  document.getElementById('descripcionReto').value = '';
  document.getElementById('puntajeReto').value = '10';
  document.getElementById('fechaInicioReto').value = '';
  document.getElementById('fechaFinReto').value = '';
  document.getElementById('esRetoGlobal').value = 'false';
  document.getElementById('idRetoEditar').value = '';
  document.getElementById('grupoDestinoReto').style.display = 'none';
  document.getElementById('modalCrearReto').classList.add('show');
}

async function cargarDireccionesEnSelect() {
  try {
    const direcciones = await llamarBackend('getDirecciones');
    const select = document.getElementById('destinoReto');
    select.innerHTML = '<option value="global">Reto Global (todas las direcciones)</option>';
    direcciones.forEach(d => {
      select.innerHTML += `<option value="${d.nombre}">${d.nombre}</option>`;
    });
  } catch (error) {
    console.error('Error al cargar direcciones:', error);
  }
}

function mostrarModalCrearRetoPresidente() {
  document.getElementById('tituloModalReto').textContent = 'Crear Nuevo Reto';
  document.getElementById('btnGuardarReto').textContent = 'Crear Reto';
  document.getElementById('nombreReto').value = '';
  document.getElementById('descripcionReto').value = '';
  document.getElementById('puntajeReto').value = '10';
  document.getElementById('fechaInicioReto').value = '';
  document.getElementById('fechaFinReto').value = '';
  document.getElementById('idRetoEditar').value = '';

  document.getElementById('grupoDestinoReto').style.display = 'block';
  document.getElementById('destinoReto').value = 'global';
  cargarDireccionesEnSelect();

  document.getElementById('modalCrearReto').classList.add('show');
}

async function editarReto(idReto) {
  try {
    const retos = await llamarBackend('getRetosDireccion', usuarioActual.direccion);
    const reto = retos.find(r => r.id === idReto);
    
    if (reto) {
      document.getElementById('tituloModalReto').textContent = 'Editar Reto';
      document.getElementById('btnGuardarReto').textContent = 'Guardar Cambios';
      document.getElementById('nombreReto').value = reto.nombre;
      document.getElementById('descripcionReto').value = reto.descripcion;
      document.getElementById('puntajeReto').value = reto.puntaje;
      
      const fechaInicio = convertirFechaParaInput(reto.fechaInicio);
      const fechaFin = convertirFechaParaInput(reto.fechaFin);
      
      document.getElementById('fechaInicioReto').value = fechaInicio;
      document.getElementById('fechaFinReto').value = fechaFin;
      document.getElementById('esRetoGlobal').value = 'false';
      document.getElementById('idRetoEditar').value = idReto;
      document.getElementById('modalCrearReto').classList.add('show');
    }
  } catch (error) {
    console.error('Error al editar reto:', error);
  }
}

async function editarRetoPresidente(idReto, esGlobal) {
  try {
    const retos = await llamarBackend('getTodosLosRetos');
    const reto = retos.find(r => r.id === idReto);
    
    if (reto) {
      document.getElementById('tituloModalReto').textContent = 'Editar Reto';
      document.getElementById('btnGuardarReto').textContent = 'Guardar Cambios';
      document.getElementById('nombreReto').value = reto.nombre;
      document.getElementById('descripcionReto').value = reto.descripcion;
      document.getElementById('puntajeReto').value = reto.puntaje;
      document.getElementById('fechaInicioReto').value = convertirFechaParaInput(reto.fechaInicio);
      document.getElementById('fechaFinReto').value = convertirFechaParaInput(reto.fechaFin);
      document.getElementById('idRetoEditar').value = idReto;

      document.getElementById('grupoDestinoReto').style.display = 'block';
      await cargarDireccionesEnSelect();
      
      setTimeout(() => {
        document.getElementById('destinoReto').value = reto.esGlobal ? 'global' : reto.direccion;
      }, 500);

      document.getElementById('modalCrearReto').classList.add('show');
    }
  } catch (error) {
    console.error('Error al editar reto:', error);
  }
}

function convertirFechaParaInput(fechaTexto) {
  if (!fechaTexto) return '';
  const partes = fechaTexto.split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }
  return '';
}

function mostrarModalValidarEvidencia(id, nombreAsociado, nombreReto, url) {
  evidenciaSeleccionadaId = id;
  document.getElementById('detalleEvidencia').innerHTML = `
    <p><strong>Asociado:</strong> ${nombreAsociado}</p>
    <p><strong>Reto:</strong> ${nombreReto}</p>
    <p><strong>Evidencia:</strong> <a href="${url}" target="_blank">Ver enlace</a></p>
  `;
  document.getElementById('observacionValidacion').value = '';
  document.getElementById('modalValidarEvidencia').classList.add('show');
}

function cerrarModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
  
  operacionEnProceso = false;
  habilitarBotonesModal(modalId);
  
  const modal = document.getElementById(modalId);
  if (modal) {
    const alertas = modal.querySelectorAll('.alert');
    alertas.forEach(alerta => alerta.remove());
  }
}

async function subirEvidencia() {
  const url = document.getElementById('urlEvidencia').value.trim();
  
  if (!url) {
    mostrarAlertaEnModal('Por favor ingresa la URL de la evidencia', 'error');
    return;
  }
  
  if (operacionEnProceso) return;
  operacionEnProceso = true;
  
  deshabilitarBotonesModal('modalSubirEvidencia');
  
  try {
    const resultado = await llamarBackend('subirEvidencia', {
      idAsociado: usuarioActual.id,
      nombreAsociado: usuarioActual.nombre,
      idReto: retoSeleccionadoId,
      url: url
    });
    
    operacionEnProceso = false;
    habilitarBotonesModal('modalSubirEvidencia');
    
    if (resultado.success) {
      mostrarAlertaEnModal('Evidencia subida exitosamente', 'success');
      setTimeout(() => {
        cerrarModal('modalSubirEvidencia');
        cargarMisEvidencias();
        cargarRetosDisponibles();
      }, 1500);
    } else {
      mostrarAlertaEnModal('Error: ' + resultado.message, 'error');
    }
  } catch (error) {
    operacionEnProceso = false;
    habilitarBotonesModal('modalSubirEvidencia');
    mostrarAlertaEnModal('Error al conectar con el servidor', 'error');
  }
}

function mostrarAlertaEnModal(mensaje, tipo) {
  const modal = document.querySelector('#modalSubirEvidencia .modal-content');
  const alertaExistente = modal.querySelector('.alert');
  if (alertaExistente) alertaExistente.remove();
  
  const clase = tipo === 'error' ? 'alert-error' : 'alert-success';
  const div = document.createElement('div');
  div.className = `alert ${clase}`;
  div.textContent = mensaje;
  modal.insertBefore(div, modal.firstChild);
}

async function crearReto() {
  const nombre = document.getElementById('nombreReto').value.trim();
  const descripcion = document.getElementById('descripcionReto').value.trim();
  const puntaje = parseInt(document.getElementById('puntajeReto').value);
  const fechaInicio = document.getElementById('fechaInicioReto').value;
  const fechaFin = document.getElementById('fechaFinReto').value;

  let esGlobal, direccion;
  const grupoDestino = document.getElementById('grupoDestinoReto');
  if (grupoDestino && grupoDestino.style.display !== 'none') {
    const destino = document.getElementById('destinoReto').value;
    esGlobal = destino === 'global';
    direccion = esGlobal ? 'Todas' : destino;
  } else {
    esGlobal = document.getElementById('esRetoGlobal').value === 'true';
    direccion = usuarioActual.direccion;
  }

  if (!nombre || !descripcion || !fechaFin) {
    mostrarAlertaEnModalReto('Por favor completa todos los campos obligatorios', 'error');
    return;
  }

  if (operacionEnProceso) return;
  operacionEnProceso = true;
  deshabilitarBotonesModal('modalCrearReto');

  try {
    const resultado = await llamarBackend('crearReto', {
      direccion: direccion,
      nombre: nombre,
      descripcion: descripcion,
      puntaje: puntaje,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      esGlobal: esGlobal
    });
    
    operacionEnProceso = false;
    habilitarBotonesModal('modalCrearReto');

    if (resultado.success) {
      mostrarAlertaEnModalReto('Reto creado exitosamente', 'success');
      setTimeout(() => {
        cerrarModal('modalCrearReto');
        if (usuarioActual.rol === 'Presidente') {
          cargarRetosPresidente();
        } else if (esGlobal) {
          cargarRetosGlobalesGestion();
        } else {
          cargarRetosGestion();
        }
      }, 1500);
    } else {
      mostrarAlertaEnModalReto('Error: ' + resultado.message, 'error');
    }
  } catch (error) {
    operacionEnProceso = false;
    habilitarBotonesModal('modalCrearReto');
    mostrarAlertaEnModalReto('Error al conectar con el servidor', 'error');
  }
}

function mostrarAlertaEnModalReto(mensaje, tipo) {
  const modal = document.querySelector('#modalCrearReto .modal-content');
  const alertaExistente = modal.querySelector('.alert');
  if (alertaExistente) alertaExistente.remove();
  
  const clase = tipo === 'error' ? 'alert-error' : 'alert-success';
  const div = document.createElement('div');
  div.className = `alert ${clase}`;
  div.textContent = mensaje;
  modal.insertBefore(div, modal.firstChild);
}

function guardarReto() {
  const idEditar = document.getElementById('idRetoEditar').value;
  
  if (idEditar) {
    actualizarReto();
  } else {
    crearReto();
  }
}

async function actualizarReto() {
  const id = document.getElementById('idRetoEditar').value;
  const nombre = document.getElementById('nombreReto').value.trim();
  const descripcion = document.getElementById('descripcionReto').value.trim();
  const puntaje = parseInt(document.getElementById('puntajeReto').value);
  const fechaInicio = document.getElementById('fechaInicioReto').value;
  const fechaFin = document.getElementById('fechaFinReto').value;

  let esGlobal, direccion;
  const grupoDestino = document.getElementById('grupoDestinoReto');
  if (grupoDestino && grupoDestino.style.display !== 'none') {
    const destino = document.getElementById('destinoReto').value;
    esGlobal = destino === 'global';
    direccion = esGlobal ? 'Todas' : destino;
  } else {
    esGlobal = document.getElementById('esRetoGlobal').value === 'true';
    direccion = usuarioActual.direccion;
  }

  if (!nombre || !descripcion || !fechaFin) {
    mostrarAlertaEnModalReto('Por favor completa todos los campos obligatorios', 'error');
    return;
  }

  if (operacionEnProceso) return;
  operacionEnProceso = true;
  deshabilitarBotonesModal('modalCrearReto');

  try {
    const resultado = await llamarBackend('actualizarReto', {
      id: id,
      direccion: direccion,
      nombre: nombre,
      descripcion: descripcion,
      puntaje: puntaje,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      esGlobal: esGlobal
    });
    
    operacionEnProceso = false;
    habilitarBotonesModal('modalCrearReto');

    if (resultado.success) {
      mostrarAlertaEnModalReto('Reto actualizado exitosamente', 'success');
      setTimeout(() => {
        cerrarModal('modalCrearReto');
        if (usuarioActual.rol === 'Presidente') {
          cargarRetosPresidente();
        } else if (esGlobal) {
          cargarRetosGlobalesGestion();
        } else {
          cargarRetosGestion();
        }
      }, 1500);
    } else {
      mostrarAlertaEnModalReto('Error: ' + resultado.message, 'error');
    }
  } catch (error) {
    operacionEnProceso = false;
    habilitarBotonesModal('modalCrearReto');
    mostrarAlertaEnModalReto('Error al conectar con el servidor', 'error');
  }
}

async function validarEvidencia(aprobado) {
  const observacion = document.getElementById('observacionValidacion').value.trim();
  
  if (!aprobado && !observacion) {
    mostrarAlertaEnModalValidacion('Por favor ingresa una observación al rechazar la evidencia', 'error');
    return;
  }
  
  if (operacionEnProceso) return;
  operacionEnProceso = true;
  
  deshabilitarBotonesModal('modalValidarEvidencia');
  
  try {
    const resultado = await llamarBackend('validarEvidencia', evidenciaSeleccionadaId, aprobado, observacion);
    
    operacionEnProceso = false;
    habilitarBotonesModal('modalValidarEvidencia');
    
    if (resultado.success) {
      mostrarAlertaEnModalValidacion(
        aprobado ? 'Evidencia aprobada exitosamente' : 'Evidencia rechazada', 
        aprobado ? 'success' : 'info'
      );
      setTimeout(() => {
        cerrarModal('modalValidarEvidencia');
        if (usuarioActual.rol === 'Presidente') {
          cargarTodasEvidenciasPendientes();
        } else {
          cargarEvidenciasPendientes();
        }
      }, 1500);
    } else {
      mostrarAlertaEnModalValidacion('Error: ' + resultado.message, 'error');
    }
  } catch (error) {
    operacionEnProceso = false;
    habilitarBotonesModal('modalValidarEvidencia');
    mostrarAlertaEnModalValidacion('Error al validar evidencia', 'error');
  }
}

function mostrarAlertaEnModalValidacion(mensaje, tipo) {
  const modal = document.querySelector('#modalValidarEvidencia .modal-content');
  const alertaExistente = modal.querySelector('.alert');
  if (alertaExistente) alertaExistente.remove();
  
  const clase = tipo === 'error' ? 'alert-error' : tipo === 'info' ? 'alert-info' : 'alert-success';
  const div = document.createElement('div');
  div.className = `alert ${clase}`;
  div.textContent = mensaje;
  modal.insertBefore(div, modal.firstChild);
}

function desactivarReto(idReto) {
  retoADesactivar = idReto;
  document.getElementById('modalConfirmarDesactivar').classList.add('show');
}

async function confirmarDesactivarReto() {
  if (!retoADesactivar) return;
  
  if (operacionEnProceso) return;
  operacionEnProceso = true;
  
  deshabilitarBotonesModal('modalConfirmarDesactivar');
  
  cerrarModal('modalConfirmarDesactivar');
  
  try {
    const resultado = await llamarBackend('desactivarReto', retoADesactivar);
    
    operacionEnProceso = false;
    
    if (resultado.success) {
      mostrarNotificacion('Reto desactivado exitosamente', 'success');
      if (usuarioActual.rol === 'Presidente') {
        cargarRetosGlobalesGestion();
      } else {
        cargarRetosGestion();
      }
      retoADesactivar = null;
    } else {
      mostrarNotificacion('Error: ' + resultado.message, 'error');
      habilitarBotonesModal('modalConfirmarDesactivar');
    }
  } catch (error) {
    operacionEnProceso = false;
    mostrarNotificacion('Error al desactivar reto', 'error');
    habilitarBotonesModal('modalConfirmarDesactivar');
  }
}

function mostrarNotificacion(mensaje, tipo) {
  const notif = document.createElement('div');
  notif.className = `alert alert-${tipo}`;
  notif.style.position = 'fixed';
  notif.style.top = '20px';
  notif.style.right = '20px';
  notif.style.zIndex = '9999';
  notif.style.minWidth = '300px';
  notif.textContent = mensaje;
  
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.transition = 'opacity 0.5s';
    notif.style.opacity = '0';
    setTimeout(() => notif.remove(), 500);
  }, 3000);
}

function mostrarAlerta(contenedorId, mensaje, tipo) {
  const contenedor = document.getElementById(contenedorId);
  const clase = tipo === 'error' ? 'alert-error' : tipo === 'info' ? 'alert-info' : 'alert-success';
  contenedor.innerHTML = `<div class="alert ${clase}">${mensaje}</div>`;
}

function mostrarCargando(contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    const modalId = event.target.id;
    cerrarModal(modalId);
  }
}
