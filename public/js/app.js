let currentStep = 0;
let currentOrderId = null;
let pollInterval = null;
let unlockedCardUrl = null;
let isAudioPlaying = false;

// Estado de la tarjeta
const cardState = {
  eventType: 'cumpleanos',
  name: '',
  age: '',
  photo: '',
  country: 'Argentina',
  province: '',
  city: '',
  address: '',
  date: '',
  time: ''
};

// Modelos disponibles (Sin emojis al lado del texto)
const eventModelConfig = {
  'cumpleanos': {
    title: '1. Cumpleaños',
    h2: '¿Quién cumple años?',
    desc: 'Ingresa los datos del cumpleañero/a',
    labelName: 'Nombre del cumpleañero/a',
    labelAge: '¿Cuántos años cumple?',
    showAge: true,
    badgeDefault: '¡Cumple {age} Años!',
    headline: '¡Te invito a celebrar mi cumpleaños juntos!',
    shareText: 'Te invito a mi cumple',
    color: '#ef4444'
  },
  'bautismo': {
    title: '2. Bautismo',
    h2: '¿Quién se bautiza?',
    desc: 'Ingresa los datos para la bendición',
    labelName: 'Nombre del bautizado/a',
    labelAge: 'Edad o fecha especial (opcional)',
    showAge: false,
    badgeDefault: 'Mi Bautismo',
    headline: 'Te invito a compartir este momento tan especial y bendecido',
    shareText: 'Te invito a mi bautismo',
    color: '#0ea5e9'
  },
  'asado': {
    title: '3. Asado',
    h2: '¿Quién invita al asado?',
    desc: 'Detalles del anfitrión o motivo del asado',
    labelName: 'Nombre del asador / anfitrión',
    labelAge: 'Motivo del asado (opcional)',
    showAge: false,
    badgeDefault: '¡Gran Asado!',
    headline: '¡Se prende el fuego! Te invito a compartir un gran asado',
    shareText: 'Te invito a un asado',
    color: '#f97316'
  },
  'evento': {
    title: '4. Evento Especial',
    h2: '¿Nombre del evento o anfitrión?',
    desc: 'Celebraciones, fiestas privadas o aniversarios',
    labelName: 'Nombre del evento / anfitrión',
    labelAge: 'Detalle adicional (opcional)',
    showAge: false,
    badgeDefault: 'Evento Especial',
    headline: 'Estás cordialmente invitado a celebrar con nosotros',
    shareText: 'Te invito a mi evento',
    color: '#8b5cf6'
  }
};

// Elementos DOM
const audioEl = document.getElementById('previewAudio');
const btnPlayMusic = document.getElementById('btnPlayMusic');
const toastEl = document.getElementById('toast');

function showToast(msg) {
  if (!toastEl) return;
  toastEl.innerText = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

/**
 * Pop-up Modal Estilo Mercado Pago (Fondo blanco, esquinas redondeadas, gris bold)
 */
function showFunModal({ title = 'Un momento', text = '' }) {
  const titleEl = document.getElementById('funModalTitle');
  const textEl = document.getElementById('funModalText');
  const overlayEl = document.getElementById('funModalOverlay');
  if (titleEl) titleEl.innerText = title;
  if (textEl) textEl.innerText = text;
  if (overlayEl) overlayEl.classList.add('show');
}

function closeFunModal() {
  const overlayEl = document.getElementById('funModalOverlay');
  if (overlayEl) overlayEl.classList.remove('show');
}

function handleFunModalOverlayClick(event) {
  if (event.target.id === 'funModalOverlay') {
    closeFunModal();
  }
}

/**
 * Selección interactiva de carta en el Abanico de la Home
 */
function selectFanCard(type, el) {
  cardState.eventType = type;

  document.querySelectorAll('.fan-card').forEach(card => {
    card.classList.remove('active-front');
  });
  el.classList.add('active-front');

  const config = eventModelConfig[type] || eventModelConfig['cumpleanos'];
  document.getElementById('selectedModelLabel').innerText = config.title;
  document.getElementById('selectedModelLabel').style.color = config.color;

  document.getElementById('step1Title').innerText = config.h2;
  document.getElementById('step1Desc').innerText = config.desc;
  document.getElementById('labelName').innerText = config.labelName;
  document.getElementById('labelAge').innerText = config.labelAge;
  document.getElementById('groupAge').style.display = config.showAge ? 'block' : 'none';
}

/**
 * Contador de caracteres del nombre (Máx 20 letras)
 */
function updateCharCount() {
  const input = document.getElementById('inputName');
  const count = input.value.length;
  document.getElementById('charCount').innerText = `${count} / 20`;
}

/**
 * Cargar, comprimir y optimizar foto para móviles (Canvas max 800x800)
 */
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const maxDim = 800;
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      cardState.photo = compressedDataUrl;

      document.getElementById('imgPreview').src = cardState.photo;
      document.getElementById('imgPreview').style.display = 'block';
      document.getElementById('photoIcon').style.display = 'none';
      document.getElementById('uploaderText').innerText = 'Foto lista';
      document.getElementById('sumPhotoStatus').innerText = 'Cargada y Optimizada';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Navegación entre pasos del Asistente
 */
function goToStep(step) {
  if (step === 2 && currentStep === 1) {
    const name = document.getElementById('inputName').value.trim();
    const age = document.getElementById('inputAge').value.trim();
    const cfg = eventModelConfig[cardState.eventType];

    if (!name) {
      showFunModal({ title: 'Dato requerido', text: 'Por favor ingresa el nombre.' });
      return;
    }
    if (cfg.showAge && !age) {
      showFunModal({ title: 'Dato requerido', text: 'Por favor ingresa los años que cumple.' });
      return;
    }

    cardState.name = name.slice(0, 20);
    cardState.age = age;
  }

  if (step === 3 && currentStep === 2) {
    const country = document.getElementById('inputCountry').value.trim() || 'Argentina';
    const province = document.getElementById('inputProvince').value.trim();
    const city = document.getElementById('inputCity').value.trim();
    const address = document.getElementById('inputAddress').value.trim();
    const date = document.getElementById('inputDate').value.trim();
    const time = document.getElementById('inputTime').value.trim();

    if (!address || !city) {
      showFunModal({ title: 'Ubicación requerida', text: 'Por favor completa la dirección y localidad.' });
      return;
    }
    if (!date || !time) {
      showFunModal({ title: 'Horario requerido', text: 'Por favor ingresa el día y la hora del encuentro.' });
      return;
    }

    cardState.country = country;
    cardState.province = province;
    cardState.city = city;
    cardState.address = address;
    cardState.date = date;
    cardState.time = time;

    const cfg = eventModelConfig[cardState.eventType];
    document.getElementById('sumModel').innerText = cfg.title;
    document.getElementById('sumName').innerText = cardState.name;
    document.getElementById('sumAgeRow').style.display = cfg.showAge ? 'flex' : 'none';
    document.getElementById('sumAge').innerText = cardState.age ? `${cardState.age} años` : '-';
    document.getElementById('sumAddress').innerText = cardState.address;
    document.getElementById('sumCityProv').innerText = cardState.province ? `${cardState.city}, ${cardState.province}` : cardState.city;
    document.getElementById('sumCountry').innerText = cardState.country;
    document.getElementById('sumDateTime').innerText = `${cardState.date} - ${cardState.time}`;
  }

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel${step}`).classList.add('active');

  for (let i = 0; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (dot) {
      if (i <= step) dot.classList.add('active');
      else dot.classList.remove('active');
    }
  }

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Generar vista previa de la tarjeta
 */
function generateCardPreview() {
  const cfg = eventModelConfig[cardState.eventType];

  document.getElementById('cardNameTitle').innerText = cardState.name;

  if (cardState.eventType === 'cumpleanos' && cardState.age) {
    document.getElementById('cardAgeBadge').innerText = `¡Cumple ${cardState.age} Años!`;
  } else {
    document.getElementById('cardAgeBadge').innerText = cfg.badgeDefault;
  }

  document.getElementById('cardHeadlineText').innerText = cfg.headline;
  document.getElementById('cardDateText').innerText = cardState.date;
  document.getElementById('cardTimeText').innerText = cardState.time;
  document.getElementById('cardAddressText').innerText = cardState.address;

  let cityText = cardState.city;
  if (cardState.province) cityText += `, ${cardState.province}`;
  if (cardState.country) cityText += ` (${cardState.country})`;
  document.getElementById('cardCityText').innerText = cityText;

  const heroPhoto = document.getElementById('cardHeroPhoto');
  if (cardState.photo) {
    heroPhoto.src = cardState.photo;
    heroPhoto.style.display = 'block';
  } else {
    heroPhoto.style.display = 'none';
  }

  let fullLocation = cardState.address;
  if (cardState.city) fullLocation += `, ${cardState.city}`;
  if (cardState.province) fullLocation += `, ${cardState.province}`;
  if (cardState.country) fullLocation += `, ${cardState.country}`;

  const query = encodeURIComponent(fullLocation);
  document.getElementById('cardGmapsLink').href = `https://www.google.com/maps/search/?api=1&query=${query}`;

  goToStep(4);
}

/**
 * Reproductor de audio
 */
function toggleAudio() {
  if (isAudioPlaying) {
    audioEl.pause();
    isAudioPlaying = false;
    btnPlayMusic.innerText = 'Escuchar';
  } else {
    audioEl.play().then(() => {
      isAudioPlaying = true;
      btnPlayMusic.innerText = 'Pausar';
    }).catch(() => {
      btnPlayMusic.innerText = 'Escuchar';
    });
  }
}

/**
 * Iniciar Pago con PayPal ($5.00 USD)
 * Método idéntico a Mercado Pago: abre pestaña limpia con window.open,
 * sin popups dobles ni about:blank.
 */
async function handlePayPayPal() {
  const btn = document.getElementById('btnPayPayPal');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  const statusBox = document.getElementById('cardStatusBox');
  statusBox.style.display = 'block';
  document.getElementById('statusSpinner').style.display = 'block';
  document.getElementById('statusMsg').innerText = 'Iniciando checkout en PayPal...';

  try {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardData: cardState })
    });

    const data = await res.json();

    if (!data.success || !data.approveUrl) {
      showFunModal({
        title: 'Un momento',
        text: data.error || 'No se pudo generar la orden de pago. Por favor intenta de nuevo.'
      });
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
      return;
    }

    currentOrderId = data.orderId;
    startCardPolling(currentOrderId);

    // Abrir pasarela en pestaña limpia (método Mercado Pago)
    window.open(data.approveUrl, '_blank');

    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  } catch (err) {
    showFunModal({
      title: 'Conexión interrumpida',
      text: 'No pudimos comunicarnos con el servidor. Revisa tu conexión.'
    });
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

/**
 * Polling de verificación en segundo plano
 */
function startCardPolling(orderId) {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/order-status/${orderId}`);
      const data = await res.json();

      if (data.success && data.order && data.order.isApproved) {
        clearInterval(pollInterval);
        handleCardApproved(data.order);
      }
    } catch (e) {
      console.warn('Error en polling:', e);
    }
  }, 2500);
}

/**
 * Desbloqueo y entrega tras aprobación:
 * Todos los botones se compactan moviéndose al medio y desaparecen,
 * quedando ÚNICAMENTE el botón verde 3D de WhatsApp.
 */
function handleCardApproved(order) {
  if (pollInterval) clearInterval(pollInterval);

  // 1. Ocultar spinner
  const spinner = document.getElementById('statusSpinner');
  if (spinner) spinner.style.display = 'none';

  // 2. Compactar y hacer desaparecer en transición al centro todos los botones previos
  const collapseArea = document.getElementById('paywallCollapseArea');
  if (collapseArea) {
    collapseArea.classList.add('collapsed');
  }

  // 3. Preparar estado de éxito
  const statusBox = document.getElementById('cardStatusBox');
  statusBox.style.display = 'block';
  statusBox.classList.add('status-success');
  document.getElementById('statusMsg').innerText = 'Pago acreditado con éxito. Tu tarjeta está lista:';

  const accessUrl = order.accessUrl || `/tarjeta/${order.orderId || order.id}`;
  unlockedCardUrl = window.location.origin + accessUrl;

  // 4. Mostrar y animar el botón verde 3D de WhatsApp (el único que queda)
  const actions = document.getElementById('unlockedActions');
  actions.style.display = 'flex';

  const btnShare = document.getElementById('btnWhatsappShare');
  if (btnShare) {
    btnShare.classList.add('revealed');
  }

  showToast('Tarjeta activada con éxito');
}

/**
 * Exportar a WhatsApp: Saludo simple + Link, nada más (Sin repeticiones ni emojis)
 */
function handleShareFinalInvitation() {
  if (!unlockedCardUrl) return;
  const text = encodeURIComponent(`Hola, te comparto la invitacion:\n${unlockedCardUrl}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

/**
 * Simulación de Pago Aprobado
 */
async function handleSimulateCardPayment() {
  try {
    const statusBox = document.getElementById('cardStatusBox');
    statusBox.style.display = 'block';
    document.getElementById('statusSpinner').style.display = 'block';
    document.getElementById('statusMsg').innerText = 'Simulando pago de $5.00 USD...';
    document.getElementById('unlockedActions').style.display = 'none';

    const resOrder = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardData: cardState })
    });
    const orderData = await resOrder.json();

    if (!orderData.success || !orderData.orderId) {
      throw new Error(orderData.error || 'Error al inicializar la orden');
    }

    const resSim = await fetch(`/api/simulate-payment/${orderData.orderId}`, { method: 'POST' });
    const simData = await resSim.json();

    if (simData.success) {
      handleCardApproved({ accessUrl: simData.order.accessUrl });
    } else {
      throw new Error(simData.error || 'Error en la simulación');
    }
  } catch (err) {
    showFunModal({ title: 'Error', text: err.message });
  }
}
