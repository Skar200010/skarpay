(function () {
  'use strict';
  const SDK_VERSION = '1.0.0';
  const CHECKOUT_BASE = (document.currentScript && document.currentScript.src)
    ? new URL(document.currentScript.src).origin
    : window.location.origin;

  function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {}
  }

  function openModal(checkoutUrl) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    const frame = document.createElement('iframe');
    frame.src = checkoutUrl;
    frame.style.cssText = 'width:90%;max-width:420px;height:600px;border:none;border-radius:12px;background:#fff;';
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    function close() { overlay.remove(); window.removeEventListener('message', onMsg); }
    function onMsg(e) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'skarpay:close') close();
      if (e.data.type === 'skarpay:success') { emit('skarpay:payment:success', e.data.payload); emit('skarpay:payment:result', e.data.payload); close(); }
      if (e.data.type === 'skarpay:failed') { emit('skarpay:payment:failed', e.data.payload); emit('skarpay:payment:result', e.data.payload); close(); }
    }
    window.addEventListener('message', onMsg);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    return { close };
  }

  async function createPayment(opts) {
    const res = await fetch(`${CHECKOUT_BASE}/api/v1/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': opts.apiKey },
      body: JSON.stringify({
        order_id: opts.order_id,
        amount: opts.amount,
        currency: opts.currency || 'INR',
        customer: opts.customer,
        metadata: opts.metadata,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'payment creation failed');
    return json;
  }

  const Skarpay = {
    pay: async function (opts) {
      try {
        const created = await createPayment(opts);
        const modal = openModal(created.checkoutUrl);
        if (typeof opts.handler === 'function') {
          const onSuccess = (e) => { opts.handler(e.detail); window.removeEventListener('skarpay:payment:success', onSuccess); };
          window.addEventListener('skarpay:payment:success', onSuccess);
        }
        if (typeof opts.onClose === 'function') {
          // best-effort
        }
        return created;
      } catch (e) {
        emit('skarpay:payment:failed', { reason: e.message });
        throw e;
      }
    },
  };

  // Auto-bind data-skarpay-pay buttons
  document.addEventListener('click', async (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-skarpay-pay]');
    if (!btn) return;
    e.preventDefault();
    const opts = {
      apiKey: btn.getAttribute('data-api-key') || window.SkarpayApiKey,
      order_id: btn.getAttribute('data-order-id'),
      amount: btn.getAttribute('data-amount'),
      currency: btn.getAttribute('data-currency') || 'INR',
    };
    try { await Skarpay.pay(opts); } catch (err) { console.error('[skarpay]', err); }
  });

  window.Skarpay = Skarpay;
  window.Youpi = window.Youpi || Skarpay; // alias
})();
