const navItems = [
  { id: 'index.html', href: '/', label: 'Home' },
  { id: 'temp-mail.html', href: '/temp-mail/', label: 'Temp Mail' },
  { id: 'cc-gen.html', href: '/cc-gen/', label: 'CC Gen' },
  { id: 'bin-lookup.html', href: '/bin-lookup/', label: 'BIN Lookup' },
  { id: 'address-gen.html', href: '/address-gen/', label: 'Address' },
  { id: 'cc-checker.html', href: '/cc-checker/', label: 'CC Checker' },
  { id: 'totp-gen.html', href: '/totp-gen/', label: 'TOTP' },
  { id: 'chat.html', href: '/chat/', label: 'Chat' }
];

function attachLayout(activeHref) {
  const navTarget = document.querySelector('[data-nav]');
  if (navTarget) {
    navTarget.innerHTML = navItems
      .map((item) => `<a class="${item.id === activeHref ? 'active' : ''}" href="${item.href}">${item.label}</a>`)
      .join('');
  }

  const yearTarget = document.querySelector('[data-year]');
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }

  initMotionSystem();
}

function initMotionSystem() {
  const revealTargets = document.querySelectorAll('.card, .panel, .page-head, .hero');
  revealTargets.forEach((node, index) => {
    node.classList.add('reveal');
    node.style.transitionDelay = `${Math.min(index * 60, 320)}ms`;
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach((node) => observer.observe(node));
  } else {
    revealTargets.forEach((node) => node.classList.add('in'));
  }

  const cards = document.querySelectorAll('.card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 8;
      const rotateX = (0.5 - y) * 8;
      card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function copyText(value, label = 'Copied') {
  navigator.clipboard.writeText(value).then(() => {
    showToast(`${label} to clipboard`);
  });
}

function showToast(message) {
  const node = document.querySelector('[data-toast]');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => node.classList.remove('show'), 1700);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message = payload.message || payload.detail || payload['hydra:description'] || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function setupTempMail() {
  const emailNode = document.querySelector('[data-email]');
  const inboxNode = document.querySelector('[data-inbox]');
  const regenBtn = document.querySelector('[data-regen-mail]');
  const seedBtn = document.querySelector('[data-seed-mail]');
  const copyBtn = document.querySelector('[data-copy-mail]');
  if (!emailNode || !inboxNode) return;

  const state = {
    email: '',
    password: '',
    token: ''
  };

  const setLoading = (isLoading) => {
    regenBtn && (regenBtn.disabled = isLoading);
    seedBtn && (seedBtn.disabled = isLoading);
  };

  const renderInfo = (message) => {
    inboxNode.innerHTML = `<div class="item"><small>${escapeHtml(message)}</small></div>`;
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${state.token}`
  });

  const createMailbox = async () => {
    const domainData = await fetchJson('https://api.mail.tm/domains?page=1');
    const domains = domainData['hydra:member'] || [];
    if (!domains.length) throw new Error('No temp-mail domains available right now.');

    const domain = domains[0].domain;
    const local = `ghost${Date.now()}${randomNumber(100, 999)}`;
    state.email = `${local}@${domain}`;
    state.password = `GhoSt!${randomNumber(100000, 999999)}`;

    await fetchJson('https://api.mail.tm/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: state.email,
        password: state.password
      })
    });

    const tokenData = await fetchJson('https://api.mail.tm/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: state.email,
        password: state.password
      })
    });

    state.token = tokenData.token;
  };

  const refreshInbox = async () => {
    if (!state.token) return;
    renderInfo('Fetching latest emails...');
    const messageData = await fetchJson('https://api.mail.tm/messages?page=1', {
      headers: getAuthHeaders()
    });

    const messages = messageData['hydra:member'] || [];
    if (!messages.length) {
      renderInfo('Inbox is empty. Use this address on any signup form and press Refresh Inbox.');
      return;
    }

    const rows = messages.map((item) => {
      const fromAddress = item.from?.address || 'unknown@sender';
      const fromName = item.from?.name || fromAddress;
      const subject = item.subject || '(No subject)';
      const intro = item.intro || 'Open source app notifications and OTP emails will appear here.';
      const stamp = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time';
      return `<div class="item"><strong>${escapeHtml(subject)}</strong><br><small>${escapeHtml(fromName)} | ${escapeHtml(fromAddress)} | ${escapeHtml(stamp)}</small><p>${escapeHtml(intro)}</p></div>`;
    });

    inboxNode.innerHTML = rows.join('');
  };

  const bootstrapMailbox = async () => {
    setLoading(true);
    emailNode.textContent = 'Creating live mailbox...';
    renderInfo('Please wait, provisioning temporary inbox...');

    try {
      await createMailbox();
      emailNode.textContent = state.email;
      await refreshInbox();
      showToast('Live temp mailbox created');
    } catch (error) {
      emailNode.textContent = 'Mailbox unavailable';
      renderInfo(`Temp Mail API error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  regenBtn?.addEventListener('click', bootstrapMailbox);
  seedBtn?.addEventListener('click', async () => {
    if (!state.token) {
      await bootstrapMailbox();
      return;
    }

    setLoading(true);
    try {
      await refreshInbox();
      showToast('Inbox refreshed');
    } catch (error) {
      renderInfo(`Could not refresh inbox: ${error.message}`);
    } finally {
      setLoading(false);
    }
  });

  copyBtn?.addEventListener('click', () => {
    if (!state.email) {
      showToast('No mailbox yet');
      return;
    }
    copyText(state.email, 'Email copied');
  });

  bootstrapMailbox();
  setInterval(() => {
    if (!state.token) return;
    refreshInbox().catch(() => {});
  }, 15000);
}

function setupCcGen() {
  const out = document.querySelector('[data-cc-output]');
  const btn = document.querySelector('[data-generate-cc]');
  const amount = document.querySelector('[data-cc-count]');
  const brand = document.querySelector('[data-cc-brand]');
  if (!out || !btn || !amount || !brand) return;

  const prefixes = {
    visa: '4',
    mastercard: '5',
    amex: '3',
    discover: '6'
  };

  const lengths = {
    visa: 16,
    mastercard: 16,
    amex: 15,
    discover: 16
  };

  const luhn = (digits) => {
    let sum = 0;
    let doubleUp = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let digit = Number(digits[i]);
      if (doubleUp) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      doubleUp = !doubleUp;
    }
    return (10 - (sum % 10)) % 10;
  };

  const makeCard = (selectedBrand) => {
    const prefix = prefixes[selectedBrand];
    const len = lengths[selectedBrand];
    let body = prefix;
    while (body.length < len - 1) {
      body += String(randomNumber(0, 9));
    }
    const check = luhn(body);
    const month = String(randomNumber(1, 12)).padStart(2, '0');
    const year = randomNumber(2027, 2033);
    const cvv = String(randomNumber(100, selectedBrand === 'amex' ? 9999 : 999));
    return `${body}${check} | ${month}/${String(year).slice(2)} | CVV ${cvv}`;
  };

  btn.addEventListener('click', () => {
    const count = Math.min(20, Math.max(1, Number(amount.value || '5')));
    const lines = Array.from({ length: count }, () => makeCard(brand.value));
    out.innerHTML = `<div class="list">${lines.map((line) => `<div class="item"><code>${line}</code></div>`).join('')}</div>`;
  });

  btn.click();
}

function setupBinLookup() {
  const input = document.querySelector('[data-bin-input]');
  const btn = document.querySelector('[data-bin-search]');
  const out = document.querySelector('[data-bin-output]');
  if (!input || !btn || !out) return;

  btn.addEventListener('click', async () => {
    const value = String(input.value || '').replace(/\D/g, '').slice(0, 8);
    if (value.length < 6) {
      out.innerHTML = '<span class="badge danger">Enter at least 6 digits</span>';
      return;
    }

    btn.disabled = true;
    out.innerHTML = '<div class="item"><small>Fetching live BIN data...</small></div>';

    try {
      const data = await fetchJson(`https://lookup.binlist.net/${value}`, {
        headers: {
          'Accept-Version': '3'
        }
      });

      const bankName = data.bank?.name || 'N/A';
      const scheme = data.scheme || 'N/A';
      const type = data.type || 'N/A';
      const brand = data.brand || 'N/A';
      const countryName = data.country?.name || 'N/A';
      const countryCode = data.country?.alpha2 || 'N/A';
      const prepaid = data.prepaid === true ? 'Yes' : data.prepaid === false ? 'No' : 'Unknown';

      out.innerHTML = `
        <div class="item"><strong>BIN:</strong> ${escapeHtml(value)}</div>
        <div class="item"><strong>Bank:</strong> ${escapeHtml(bankName)}</div>
        <div class="item"><strong>Scheme:</strong> ${escapeHtml(scheme)}</div>
        <div class="item"><strong>Type:</strong> ${escapeHtml(type)}</div>
        <div class="item"><strong>Brand:</strong> ${escapeHtml(brand)}</div>
        <div class="item"><strong>Country:</strong> ${escapeHtml(countryName)} (${escapeHtml(countryCode)})</div>
        <div class="item"><strong>Prepaid:</strong> ${escapeHtml(prepaid)}</div>
      `;
    } catch (error) {
      out.innerHTML = `<div class="item"><span class="badge danger">Lookup failed</span><p>${escapeHtml(error.message)}</p><small>If this is a CORS/rate-limit issue, use a tiny backend proxy with your own API key/provider.</small></div>`;
    } finally {
      btn.disabled = false;
    }
  });
}

function setupAddressGen() {
  const out = document.querySelector('[data-address-output]');
  const btn = document.querySelector('[data-address-generate]');
  const region = document.querySelector('[data-address-region]');
  if (!out || !btn || !region) return;

  const sample = {
    us: {
      states: ['CA', 'NY', 'TX', 'FL', 'WA'],
      streets: ['Maple Ave', 'Sunset Blvd', 'North Ridge Dr', 'Cedar Lane']
    },
    uk: {
      states: ['London', 'Manchester', 'Leeds', 'Bristol'],
      streets: ['Queen Street', 'Baker Road', 'Elm Crescent', 'Greenway']
    },
    in: {
      states: ['MH', 'DL', 'KA', 'GJ', 'RJ'],
      streets: ['MG Road', 'Park Street', 'Lal Bagh', 'Linking Road']
    }
  };

  btn.addEventListener('click', () => {
    const data = sample[region.value] || sample.us;
    const city = randomFrom(['Springfield', 'Riverton', 'Lakeside', 'Westfield', 'Harborview']);
    const zip = randomNumber(10000, 99999);
    const line1 = `${randomNumber(12, 998)} ${randomFrom(data.streets)}`;
    out.innerHTML = `
      <div class="item"><strong>Address Line 1:</strong> ${line1}</div>
      <div class="item"><strong>City:</strong> ${city}</div>
      <div class="item"><strong>State/Region:</strong> ${randomFrom(data.states)}</div>
      <div class="item"><strong>Postal Code:</strong> ${zip}</div>
      <div class="item"><strong>Country:</strong> ${region.value.toUpperCase()}</div>
    `;
  });

  btn.click();
}

function setupCcChecker() {
  const input = document.querySelector('[data-checker-input]');
  const btn = document.querySelector('[data-checker-run]');
  const out = document.querySelector('[data-checker-output]');
  if (!input || !btn || !out) return;

  const luhnValid = (num) => {
    const digits = String(num).replace(/\D/g, '');
    let sum = 0;
    let even = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let d = Number(digits[i]);
      if (even) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      even = !even;
    }
    return digits.length >= 13 && sum % 10 === 0;
  };

  btn.addEventListener('click', () => {
    const cards = input.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 100);

    if (!cards.length) {
      out.innerHTML = '<span class="badge warn">Paste at least one card per line.</span>';
      return;
    }

    const result = cards
      .map((line) => {
        const base = line.split('|')[0].trim();
        const status = luhnValid(base);
        const cls = status ? 'ok' : 'danger';
        const label = status ? 'VALID' : 'INVALID';
        return `<div class="item"><span class="badge ${cls}">${label}</span> <code>${line}</code></div>`;
      })
      .join('');

    out.innerHTML = `<div class="list">${result}</div>`;
  });
}

function base32ToHex(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let hex = '';
  const clean = base32.replace(/=+$/, '').toUpperCase();

  for (let i = 0; i < clean.length; i += 1) {
    const val = alphabet.indexOf(clean[i]);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substring(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }

  return hex;
}

function hotp(secretHex, counter) {
  const keyBytes = [];
  for (let i = 0; i < secretHex.length; i += 2) {
    keyBytes.push(parseInt(secretHex.slice(i, i + 2), 16));
  }

  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i -= 1) {
    counterBytes[i] = c & 0xff;
    c >>= 8;
  }

  // Lightweight hash placeholder suitable for client-side demo only.
  let hash = 0;
  for (const b of keyBytes) hash = (hash + b * 31) % 1000000007;
  for (const b of counterBytes) hash = (hash * 33 + b) % 1000000007;

  const code = String(Math.abs(hash % 1000000)).padStart(6, '0');
  return code;
}

function setupTotp() {
  const secretInput = document.querySelector('[data-totp-secret]');
  const out = document.querySelector('[data-totp-code]');
  const left = document.querySelector('[data-totp-left]');
  const btn = document.querySelector('[data-totp-random]');
  if (!secretInput || !out || !left || !btn) return;

  const randomSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    return Array.from({ length: 16 }, () => chars[randomNumber(0, chars.length - 1)]).join('');
  };

  const refresh = () => {
    const epoch = Math.floor(Date.now() / 1000);
    const windowCount = Math.floor(epoch / 30);
    const remain = 30 - (epoch % 30);
    const hex = base32ToHex(secretInput.value.trim() || randomSecret());
    out.textContent = hotp(hex, windowCount);
    left.textContent = `${remain}s`; 
  };

  btn.addEventListener('click', () => {
    secretInput.value = randomSecret();
    refresh();
  });

  secretInput.addEventListener('input', refresh);
  refresh();
  setInterval(refresh, 1000);
}

function setupChat() {
  const list = document.querySelector('[data-chat-list]');
  const form = document.querySelector('[data-chat-form]');
  const input = document.querySelector('[data-chat-input]');
  const nick = document.querySelector('[data-chat-nick]');
  if (!list || !form || !input || !nick) return;

  const peers = ['NebulaFox', 'ByteMonk', 'RogueDelta', 'PixelNinja', 'NimbleDust'];

  function addMsg(user, text, mine = false) {
    const node = document.createElement('div');
    node.className = 'item';
    node.innerHTML = `<strong>${mine ? 'You' : user}</strong><br><small>${new Date().toLocaleTimeString()}</small><p>${text}</p>`;
    list.prepend(node);
  }

  addMsg('System', 'Welcome to anonymous room. Be respectful.');

  setInterval(() => {
    addMsg(randomFrom(peers), randomFrom(['Anyone testing signups?', 'New build deployed.', 'Need dummy OTP logs.', 'Cards parser fixed.']));
  }, 9000);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMsg(nick.value.trim() || 'GhostUser', text, true);
    input.value = '';
  });
}

window.GhostInbox = {
  attachLayout,
  initMotionSystem,
  setupTempMail,
  setupCcGen,
  setupBinLookup,
  setupAddressGen,
  setupCcChecker,
  setupTotp,
  setupChat,
  copyText,
  showToast
};
