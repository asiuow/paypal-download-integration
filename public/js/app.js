let currentStep = 1;
let currentOrderId = null;
let pollInterval = null;
let unlockedCardUrl = null;
let isAudioPlaying = false;
let paypalButtonsRendered = false;

// Estado de la tarjeta
const cardState = {
  name: '',
  age: '',
  photo: '',
  address: '',
  city: '',
  date: '',
  time: ''
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
 * Contador de caracteres del nombre (Máx 20 letras)
 */
function updateCharCount() {
  const input = document.getElementById('inputName');
  const count = input.value.length;
  document.getElementById('charCount').innerText = `${count} / 20`;
}

/**
 * Cargar, comprimir y optimizar foto para móviles (Canvas resize max 800x800)
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
      document.getElementById('uploaderText').innerText = 'Foto lista ✅';
      document.getElementById('sumPhotoStatus').innerText = 'Cargada y Optimizada ✅';
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
    if (!name) {
      alert('Por favor, ingresa el nombre del cumpleañero/a (máx. 20 letras).');
      return;
    }
    if (!age) {
      alert('Por favor, ingresa los años que cumple.');
      return;
    }
    cardState.name = name.slice(0, 20);
    cardState.age = age;
  }

  if (step === 3 && currentStep === 2) {
    const address = document.getElementById('inputAddress').value.trim();
    const city = document.getElementById('inputCity').value.trim();
    const date = document.getElementById('inputDate').value.trim();
    const time = document.getElementById('inputTime').value.trim();

    if (!address || !city) {
      alert('Por favor, completa la dirección y localidad.');
      return;
    }
    if (!date || !time) {
      alert('Por favor, ingresa el día y la hora del festejo.');
      return;
    }

    cardState.address = address;
    cardState.city = city;
    cardState.date = date;
    cardState.time = time;

    document.getElementById('sumName').innerText = cardState.name;
    document.getElementById('sumAge').innerText = `${cardState.age} años`;
    document.getElementById('sumAddress').innerText = cardState.address;
    document.getElementById('sumCity').innerText = cardState.city;
    document.getElementById('sumDate').innerText = cardState.date;
    document.getElementById('sumTime').innerText = cardState.time;
  }

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel${step}`).classList.add('active');

  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (dot) {
      if (i <= step) dot.classList.add('active');
      else dot.classList.remove('active');
    }
  }

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (step === 4) {
    initPayPalButtons();
  }
}

/**
 * Generar vista previa de la tarjeta
 */
function generateCardPreview() {
  document.getElementById('cardNameTitle').innerText = cardState.name;
  document.getElementById('cardAgeBadge').innerText = `¡Cumple ${cardState.age} Años!`;
  document.getElementById('cardDateText').innerText = cardState.date;
  document.getElementById('cardTimeText').innerText = cardState.time;
  document.getElementById('cardAddressText').innerText = cardState.address;
  document.getElementById('cardCityText').innerText = cardState.city;

  const heroPhoto = document.getElementById('cardHeroPhoto');
  if (cardState.photo) {
    heroPhoto.src = cardState.photo;
    heroPhoto.style.display = 'block';
  } else {
    heroPhoto.style.display = 'none';
  }

  const query = encodeURIComponent(`${cardState.address}, ${cardState.city}`);
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
    btnPlayMusic.innerText = '▶️ Escuchar';
  } else {
    audioEl.play().then(() => {
      isAudioPlaying = true;
      btnPlayMusic.innerText = '⏸️ Pausar';
    }).catch(() => {
      btnPlayMusic.innerText = '▶️ Escuchar';
    });
  }
}

/**
 * Renderizado oficial de Botones de PayPal (PayPal Checkout v2)
 */
function initPayPalButtons() {
  if (paypalButtonsRendered) return;

  const container = document.getElementById('paypal-button-container');
  if (!container) return;

  if (typeof window.paypal === 'undefined' || !window.paypal.Buttons) {
    console.warn('[PayPal] SDK no cargado aún o bloqueado. Se habilitará el modo simulación.');
    container.innerHTML = '<div style="color: #9ca3af; font-size: 13px; text-align: center; padding: 10px;">Cargando botones de PayPal... (o use el botón de simulación abajo)</div>';
    return;
  }

  container.innerHTML = '';

  try {
    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      },

      // 1. Iniciar orden con el backend privado
      createOrder: async function() {
        const statusBox = document.getElementById('cardStatusBox');
        statusBox.style.display = 'block';
        statusBox.className = 'status-box';
        document.getElementById('statusSpinner').style.display = 'block';
        document.getElementById('statusMsg').innerText = 'Iniciando checkout seguro con PayPal...';

        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardData: cardState })
        });

        const data = await res.json();

        if (!data.success || !data.paypalOrderId) {
          throw new Error(data.error || 'No se pudo crear la orden en PayPal.');
        }

        currentOrderId = data.orderId;
        startCardPolling(currentOrderId);

        return data.paypalOrderId;
      },

      // 2. Captura automática tras la aprobación del cliente
      onApprove: async function(data) {
        document.getElementById('statusMsg').innerText = 'Acreditando pago en PayPal...';

        const res = await fetch(`/api/paypal/capture-order/${data.orderID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localOrderId: currentOrderId })
        });

        const captureData = await res.json();

        if (captureData.success && captureData.approved) {
          handleCardApproved(captureData);
        } else {
          document.getElementById('statusMsg').innerText = 'Esperando confirmación final de fondos...';
        }
      },

      onCancel: function() {
        document.getElementById('statusSpinner').style.display = 'none';
        document.getElementById('statusMsg').innerText = 'Pago cancelado por el usuario.';
      },

      onError: function(err) {
        console.error('[PayPal Error]', err);
        document.getElementById('statusSpinner').style.display = 'none';
        document.getElementById('statusMsg').innerText = 'Ocurrió un error al procesar el pago con PayPal.';
        showToast('Error en PayPal.');
      }
    }).render('#paypal-button-container');

    paypalButtonsRendered = true;
  } catch (err) {
    console.error('Error renderizando PayPal Buttons:', err);
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
 * Desbloqueo y entrega de la tarjeta tras aprobación
 */
function handleCardApproved(order) {
  if (pollInterval) clearInterval(pollInterval);

  document.getElementById('statusSpinner').style.display = 'none';
  const statusBox = document.getElementById('cardStatusBox');
  statusBox.classList.add('status-success');
  document.getElementById('statusMsg').innerText = '🎉 ¡Pago acreditado en PayPal! Tu tarjeta oficial está lista:';

  const accessUrl = order.accessUrl || `/tarjeta/${order.orderId || order.id}`;
  unlockedCardUrl = window.location.origin + accessUrl;
  document.getElementById('btnOpenFinalCard').href = accessUrl;
  document.getElementById('unlockedActions').style.display = 'flex';

  showToast('¡Tarjeta activada con éxito!');
}

/**
 * Compartir en WhatsApp la web de creación
 */
function handleShareWhatsApp() {
  const text = encodeURIComponent(`¡Crea tu tarjeta digital interactiva con música y mapa! 🎉\n${window.location.origin}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

/**
 * Enviar invitación final oficial por WhatsApp
 */
function handleShareFinalInvitation() {
  if (!unlockedCardUrl) return;
  const text = encodeURIComponent(`🎂 ¡Estás invitado al cumpleaños de ${cardState.name} (${cardState.age} años)!\n📅 Día: ${cardState.date} a las ${cardState.time}\n📍 Lugar: ${cardState.address}, ${cardState.city}\n\n🌟 Toca el enlace para ver la tarjeta interactiva con música y mapa:\n${unlockedCardUrl}`);
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
    alert('Error en simulación: ' + err.message);
  }
}
