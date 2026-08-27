let currentStep = 0;
let currentOrderId = null;
let pollInterval = null;
let unlockedCardUrl = null;
let isAudioPlaying = false;

// Card State
const cardState = {
  eventType: 'cumpleanos',
  name: '',
  age: '',
  photo: '',
  address: '',
  city: '',
  province: '', // State
  zipCode: '',
  country: 'United States',
  date: '',
  time: ''
};

// Available Templates (No text emojis)
const eventModelConfig = {
  'cumpleanos': {
    title: '1. Birthday',
    h2: 'Who is celebrating?',
    desc: "Enter the birthday person's details",
    labelName: 'Full name or nickname',
    labelAge: 'Age celebrating',
    showAge: true,
    badgeDefault: 'Turning {age}!',
    headline: 'You are invited to celebrate together!',
    shareText: 'You are invited to my birthday',
    color: '#f43f5e'
  },
  'bautismo': {
    title: '2. Baptism',
    h2: 'Who is being baptized?',
    desc: 'Enter baptism and ceremony details',
    labelName: 'Name of person baptized',
    labelAge: 'Special note (optional)',
    showAge: false,
    badgeDefault: 'Holy Baptism',
    headline: 'Join us in celebrating this sacred and blessed milestone',
    shareText: 'You are invited to my baptism',
    color: '#0284c7'
  },
  'asado': {
    title: '3. Barbecue',
    h2: 'Who is hosting the grill?',
    desc: 'Host details and gathering info',
    labelName: 'Host or grill master name',
    labelAge: 'Gathering note (optional)',
    showAge: false,
    badgeDefault: 'Great Barbecue!',
    headline: 'The grill is fired up! Come enjoy good food and friends',
    shareText: 'You are invited to a barbecue',
    color: '#ea580c'
  },
  'evento': {
    title: '4. Special Event',
    h2: 'Event title or host name?',
    desc: 'Party, anniversary, or special occasion',
    labelName: 'Host or event name',
    labelAge: 'Event details (optional)',
    showAge: false,
    badgeDefault: 'Special Celebration',
    headline: 'You are cordially invited to celebrate with us',
    shareText: 'You are invited to my event',
    color: '#7c3aed'
  }
};

// DOM Elements
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
 * Clean Modal Pop-Up (White background, rounded corners, bold gray text)
 */
function showFunModal({ title = 'Please Note', text = '' }) {
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
 * Interactive Fan Card Selection on Home
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
 * Character counter for name input (Max 20 chars)
 */
function updateCharCount() {
  const input = document.getElementById('inputName');
  const count = input.value.length;
  document.getElementById('charCount').innerText = `${count} / 20`;
}

/**
 * Upload and compress mobile photo (Canvas max 800x800)
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
      document.getElementById('uploaderText').innerText = 'Photo ready';
      document.getElementById('sumPhotoStatus').innerText = 'Uploaded and optimized';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Wizard Step Navigation
 */
function goToStep(step) {
  if (step === 2 && currentStep === 1) {
    const name = document.getElementById('inputName').value.trim();
    const age = document.getElementById('inputAge').value.trim();
    const cfg = eventModelConfig[cardState.eventType];

    if (!name) {
      showFunModal({ title: 'Field Required', text: 'Please enter a name or nickname.' });
      return;
    }
    if (cfg.showAge && !age) {
      showFunModal({ title: 'Field Required', text: 'Please enter the age celebrating.' });
      return;
    }

    cardState.name = name.slice(0, 20);
    cardState.age = age;
  }

  if (step === 3 && currentStep === 2) {
    const address = document.getElementById('inputAddress').value.trim();
    const city = document.getElementById('inputCity').value.trim();
    const province = document.getElementById('inputProvince').value.trim();
    const zipCode = document.getElementById('inputZip').value.trim();
    const country = document.getElementById('inputCountry').value.trim() || 'United States';
    const date = document.getElementById('inputDate').value.trim();
    const time = document.getElementById('inputTime').value.trim();

    if (!address || !city) {
      showFunModal({ title: 'Location Required', text: 'Please enter street address and city.' });
      return;
    }
    if (!province) {
      showFunModal({ title: 'State Required', text: 'Please enter the state.' });
      return;
    }
    if (!date || !time) {
      showFunModal({ title: 'Schedule Required', text: 'Please enter the event date and start time.' });
      return;
    }

    cardState.address = address;
    cardState.city = city;
    cardState.province = province;
    cardState.zipCode = zipCode;
    cardState.country = country;
    cardState.date = date;
    cardState.time = time;

    const cfg = eventModelConfig[cardState.eventType];
    document.getElementById('sumModel').innerText = cfg.title;
    document.getElementById('sumName').innerText = cardState.name;
    document.getElementById('sumAgeRow').style.display = cfg.showAge ? 'flex' : 'none';
    document.getElementById('sumAge').innerText = cardState.age ? `${cardState.age} years` : '-';
    document.getElementById('sumAddress').innerText = cardState.address;
    document.getElementById('sumCityProv').innerText = `${cardState.city}, ${cardState.province}`;
    document.getElementById('sumZip').innerText = cardState.zipCode || '-';
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
 * Generate Card Preview
 */
function generateCardPreview() {
  const cfg = eventModelConfig[cardState.eventType];

  document.getElementById('cardNameTitle').innerText = cardState.name;

  if (cardState.eventType === 'cumpleanos' && cardState.age) {
    document.getElementById('cardAgeBadge').innerText = `Turning ${cardState.age}!`;
  } else {
    document.getElementById('cardAgeBadge').innerText = cfg.badgeDefault;
  }

  document.getElementById('cardHeadlineText').innerText = cfg.headline;
  document.getElementById('cardDateText').innerText = cardState.date;
  document.getElementById('cardTimeText').innerText = cardState.time;
  document.getElementById('cardAddressText').innerText = cardState.address;

  let cityText = cardState.city;
  if (cardState.province) cityText += `, ${cardState.province}`;
  if (cardState.zipCode) cityText += ` ${cardState.zipCode}`;
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
  if (cardState.zipCode) fullLocation += ` ${cardState.zipCode}`;
  if (cardState.country) fullLocation += `, ${cardState.country}`;

  const query = encodeURIComponent(fullLocation);
  document.getElementById('cardGmapsLink').href = `https://www.google.com/maps/search/?api=1&query=${query}`;

  goToStep(4);
}

/**
 * Audio Player Control
 */
function toggleAudio() {
  if (isAudioPlaying) {
    audioEl.pause();
    isAudioPlaying = false;
    btnPlayMusic.innerText = 'Play';
  } else {
    audioEl.play().then(() => {
      isAudioPlaying = true;
      btnPlayMusic.innerText = 'Pause';
    }).catch(() => {
      btnPlayMusic.innerText = 'Play';
    });
  }
}

/**
 * Start PayPal Payment ($5.00 USD)
 * Clean tab method: opens official PayPal checkout in a clean tab with window.open
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
  document.getElementById('statusMsg').innerText = 'Starting secure checkout with PayPal...';

  try {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardData: cardState })
    });

    const data = await res.json();

    if (!data.success || !data.approveUrl) {
      showFunModal({
        title: 'Please Note',
        text: data.error || 'Could not initiate PayPal checkout. Please try again.'
      });
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
      return;
    }

    currentOrderId = data.orderId;
    startCardPolling(currentOrderId);

    // Open PayPal checkout in a clean tab
    window.open(data.approveUrl, '_blank');

    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  } catch (err) {
    showFunModal({
      title: 'Connection Issue',
      text: 'Unable to reach the server. Please check your connection and try again.'
    });
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

/**
 * Background Status Polling
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
      console.warn('Polling error:', e);
    }
  }, 2500);
}

/**
 * Delivery upon payment approval:
 * All previous buttons compact smoothly into the center and disappear,
 * leaving ONLY the green 3D WhatsApp button.
 */
function handleCardApproved(order) {
  if (pollInterval) clearInterval(pollInterval);

  // 1. Hide spinner
  const spinner = document.getElementById('statusSpinner');
  if (spinner) spinner.style.display = 'none';

  // 2. Compact and collapse previous buttons into the center
  const collapseArea = document.getElementById('paywallCollapseArea');
  if (collapseArea) {
    collapseArea.classList.add('collapsed');
  }

  // 3. Prepare success state
  const statusBox = document.getElementById('cardStatusBox');
  statusBox.style.display = 'block';
  statusBox.classList.add('status-success');
  document.getElementById('statusMsg').innerText = 'Payment approved successfully. Your invitation card is ready:';

  const accessUrl = order.accessUrl || `/tarjeta/${order.orderId || order.id}`;
  unlockedCardUrl = window.location.origin + accessUrl;

  // 4. Reveal and animate 3D green button (only button remaining)
  const actions = document.getElementById('unlockedActions');
  actions.style.display = 'flex';

  const btnShare = document.getElementById('btnWhatsappShare');
  if (btnShare) {
    btnShare.classList.add('revealed');
  }

  showToast('Invitation activated successfully');
}

/**
 * Export to WhatsApp: Single greeting + link, no repeated greeting
 */
function handleShareFinalInvitation() {
  if (!unlockedCardUrl) return;
  const text = encodeURIComponent(`Hi, here is the invitation:\n${unlockedCardUrl}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

/**
 * Simulate Approved Payment (Test Mode)
 */
async function handleSimulateCardPayment() {
  try {
    const statusBox = document.getElementById('cardStatusBox');
    statusBox.style.display = 'block';
    document.getElementById('statusSpinner').style.display = 'block';
    document.getElementById('statusMsg').innerText = 'Simulating $5.00 USD payment...';
    document.getElementById('unlockedActions').style.display = 'none';

    const resOrder = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardData: cardState })
    });
    const orderData = await resOrder.json();

    if (!orderData.success || !orderData.orderId) {
      throw new Error(orderData.error || 'Failed to initialize order');
    }

    const resSim = await fetch(`/api/simulate-payment/${orderData.orderId}`, { method: 'POST' });
    const simData = await resSim.json();

    if (simData.success) {
      handleCardApproved({ accessUrl: simData.order.accessUrl });
    } else {
      throw new Error(simData.error || 'Simulation failed');
    }
  } catch (err) {
    showFunModal({ title: 'Error', text: err.message });
  }
}
