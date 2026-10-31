/** @typedef {import('leaflet')} */

// ---------- Estado global de la app ----------
let map = null;
let marcador = null;
let linea = null; // Polyline roja que traza el recorrido
let watchId = null; // id que devuelve watchPosition, para poder detenerlo
let historial = []; // [{ lat, lng, timestamp }, ...]

// ---------- Referencias al DOM ----------
const btnIniciar = document.getElementById('btnIniciar');
const btnDetener = document.getElementById('btnDetener');
const btnLimpiar = document.getElementById('btnLimpiar');
const listaHistorial = document.getElementById('listaHistorial');
const estadoEl = document.getElementById('estado');

// Opciones para las llamadas a la API de Geolocalización
const OPCIONES_GEO = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

// ---------- Inicialización del mapa ----------
function crearMapa(lat, lng) {
  map = L.map('map').setView([lat, lng], 17);

  // Carga de mapas gratis con OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  marcador = L.marker([lat, lng]).addTo(map).bindPopup('Estás aquí').openPopup();

  // Línea roja que va a ir uniendo cada posición registrada
  linea = L.polyline([], { color: 'red', weight: 4 }).addTo(map);
}

// ---------- Manejo del historial ----------
function agregarPosicion(lat, lng) {
  historial.push({ lat, lng, timestamp: new Date() });

  marcador.setLatLng([lat, lng]);
  linea.addLatLng([lat, lng]);
  map.panTo([lat, lng]);

  renderizarLista();
}

function renderizarLista() {
  listaHistorial.innerHTML = '';

  if (historial.length === 0) {
    const li = document.createElement('li');
    li.className = 'vacio';
    li.textContent = 'Todavía no hay posiciones registradas.';
    listaHistorial.appendChild(li);
    return;
  }

  historial.forEach((pos, i) => {
    const li = document.createElement('li');
    li.textContent = `#${i + 1} → Lat: ${pos.lat.toFixed(5)}, Lng: ${pos.lng.toFixed(5)}`;
    listaHistorial.appendChild(li);
  });
}

// ---------- Manejo de errores de geolocalización ----------
function manejarErrorGeo(error) {
  let mensaje;
  switch (error.code) {
    case error.PERMISSION_DENIED:
      mensaje = 'Permiso de ubicación denegado. Habilitalo en el navegador para poder usar la app.';
      break;
    case error.POSITION_UNAVAILABLE:
      mensaje = 'No se pudo determinar tu ubicación en este momento.';
      break;
    case error.TIMEOUT:
      mensaje = 'Se agotó el tiempo esperando la ubicación. Intentá de nuevo.';
      break;
    default:
      mensaje = 'Ocurrió un error desconocido al obtener la ubicación.';
  }
  estadoEl.textContent = mensaje;
}

// ---------- Control de seguimiento ----------
function iniciarSeguimiento() {
  if (!('geolocation' in navigator)) {
    estadoEl.textContent = 'Tu navegador no soporta geolocalización.';
    return;
  }

  btnIniciar.disabled = true;

  if (!map) {
    // Primera vez: pedimos la ubicación para centrar el mapa y arrancamos el watch
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        crearMapa(latitude, longitude);
        agregarPosicion(latitude, longitude);
        comenzarWatch();
      },
      (error) => {
        manejarErrorGeo(error);
        btnIniciar.disabled = false;
      },
      OPCIONES_GEO
    );
  } else {
    comenzarWatch();
  }
}

function comenzarWatch() {
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      agregarPosicion(latitude, longitude);
      estadoEl.textContent = 'Seguimiento activo...';
    },
    manejarErrorGeo,
    OPCIONES_GEO
  );

  btnIniciar.disabled = true;
  btnDetener.disabled = false;
  estadoEl.textContent = 'Seguimiento activo...';
}

function detenerSeguimiento() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  btnIniciar.disabled = false;
  btnDetener.disabled = true;
  estadoEl.textContent = 'Seguimiento detenido.';
}

function limpiarHistorial() {
  historial = [];
  if (linea) {
    linea.setLatLngs([]);
  }
  renderizarLista();
  estadoEl.textContent = 'Historial limpiado.';
}

// ---------- Eventos ----------
btnIniciar.addEventListener('click', iniciarSeguimiento);
btnDetener.addEventListener('click', detenerSeguimiento);
btnLimpiar.addEventListener('click', limpiarHistorial);

// Estado inicial de la lista
renderizarLista();
