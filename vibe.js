/**
 * VIBE AGENT SDK v1.0 (MVP) - TiendaNube Edition
 * Optimistic UI + Mobile Touch Sensors + Fallback + Event Isolation
 */
(function () {
    function _resolveApiEndpoint() {
        if (window.VIBE_CONFIG && window.VIBE_CONFIG.api_endpoint) return window.VIBE_CONFIG.api_endpoint;
        return 'http://localhost:8000/api/track';
    }

    const CONFIG = {
        api_endpoint: _resolveApiEndpoint(),
        thresholds: { visibility: 0.5, time_visible: 2000 },
        colors: { rage: "#ff4d4d", doubt: "#ffc107", agent: "#212529", loading: "#6c757d" }
    };

    function generateSessionId() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var id = '';
        for (var i = 0; i < 16; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
        return id;
    }

    if (!sessionStorage.getItem('vibe_session_id')) sessionStorage.setItem('vibe_session_id', generateSessionId());
    var SESSION_ID = sessionStorage.getItem('vibe_session_id');

    function sendVibeEvent(eventType, data) {
        if (eventType === 'hesitation' || eventType === 'compare_price') {
            UI.speak("Consultando stock y promociones en tiempo real...", "loading", "none");
        }

        const payload = {
            event_type: eventType,
            element_id: data.elementId || 'unknown',
            meta: data.meta || {},
            timestamp: new Date().toISOString(),
            url: window.location.href,
            session_id: SESSION_ID
        };

        fetch(CONFIG.api_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify(payload)
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.action === 'toast' && data.message) {
                    UI.speak(data.message, data.emotion || 'agent', data.button || 'none');
                }
            })
            .catch(function (err) {
                console.error('❌ Error de conexión:', err);
                UI.speak("Error de conexión con el Agente.", "rage", "none");
            });
    }

    function initUI() {
        const style = document.createElement('style');
        const cssRules = [
            ".vibe-toast { user-select: none; -webkit-user-select: none; position: fixed; bottom: 24px; right: 24px; background: #ffffff; color: #1a1a1a; padding: 16px 20px; border-radius: 12px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2); font-family: system-ui, sans-serif; font-size: 14px; z-index: 2147483647; transform: translateY(120px) scale(0.95); opacity: 0; transition: all 0.4s ease; display: flex; flex-direction: column; gap: 12px; border-left: 5px solid #1a1a1a; max-width: 340px; min-width: 280px; box-sizing: border-box; }",
            ".vibe-toast.visible { transform: translateY(0) scale(1); opacity: 1; }",
            ".vibe-toast-header { display: flex; align-items: flex-start; gap: 12px; }",
            ".vibe-icon-wrapper { background: #f3f4f6; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }",
            ".vibe-message { font-weight: 500; margin-top: 6px; }",
            ".vibe-actions { display: flex; gap: 10px; margin-top: 4px; }",
            ".vibe-btn { display: flex; align-items: center; justify-content: center; gap: 6px; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; width: 100%; transition: all 0.2s ease; }",
            ".vibe-btn--whatsapp { background: #25D366; color: white; }",
            ".vibe-btn--checkout { background: #000000; color: white; }"
        ];
        style.innerHTML = cssRules.join(" ");
        document.head.appendChild(style);

        const toast = document.createElement('div');
        toast.className = 'vibe-toast';
        document.body.appendChild(toast);

        const BUTTON_CONFIG = {
            whatsapp: {
                text: 'Consultar por WhatsApp',
                className: 'vibe-btn vibe-btn--whatsapp',
                action: function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    sendVibeEvent('conversion_click', { elementId: 'whatsapp_button', meta: { action: 'user_accepted_help' } });
                    // REEMPLAZAR EL NUMERO DE ABAJO EN PRODUCCIÓN
                    window.open('https://wa.me/5492645610946?text=Hola,%20tengo%20una%20duda%20con%20un%20producto%20de%20la%20tienda.', '_blank');
                }
            },
            checkout: {
                text: 'Ir al Carrito',
                className: 'vibe-btn vibe-btn--checkout',
                action: function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = '/cart';
                }
            }
        };

        return {
            speak: function (message, emotion, buttonType) {
                emotion = emotion || 'agent';
                buttonType = buttonType || 'none';
                let agentEmoji = '🤖';
                if (emotion === 'rage') agentEmoji = '🆘';
                if (emotion === 'doubt') agentEmoji = '💡';
                if (emotion === 'loading') agentEmoji = '⏳';

                toast.innerHTML = '';
                var header = document.createElement('div');
                header.className = 'vibe-toast-header';

                var iconWrapper = document.createElement('div');
                iconWrapper.className = 'vibe-icon-wrapper';
                iconWrapper.textContent = agentEmoji;
                header.appendChild(iconWrapper);

                var msgDiv = document.createElement('div');
                msgDiv.className = 'vibe-message';
                msgDiv.textContent = message;
                header.appendChild(msgDiv);

                toast.appendChild(header);

                if (buttonType !== 'none' && BUTTON_CONFIG[buttonType]) {
                    var actionsDiv = document.createElement('div');
                    actionsDiv.className = 'vibe-actions';
                    var btn = document.createElement('button');
                    btn.className = BUTTON_CONFIG[buttonType].className;
                    btn.id = 'vibe-action-btn';
                    btn.textContent = BUTTON_CONFIG[buttonType].text;
                    btn.addEventListener('click', BUTTON_CONFIG[buttonType].action);
                    actionsDiv.appendChild(btn);
                    toast.appendChild(actionsDiv);
                }

                toast.style.borderLeftColor = CONFIG.colors[emotion] || CONFIG.colors.agent;
                toast.classList.add('visible');
                setTimeout(function () { toast.classList.remove('visible'); }, 8000);
            }
        };
    }

    const UI = initUI();

    function initVisibilityTracker() {
        const elementTimers = new Map();
        const observedAt = new Map();
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                const element = entry.target;
                const elementId = element.id || element.getAttribute('data-vibe-id') || 'unknown';
                if (entry.isIntersecting && entry.intersectionRatio >= CONFIG.thresholds.visibility) {
                    if (!observedAt.has(element)) observedAt.set(element, Date.now());
                    if (elementTimers.has(element)) clearTimeout(elementTimers.get(element));
                    const timerId = setTimeout(function () {
                        const timeVisible = Date.now() - observedAt.get(element);
                        sendVibeEvent('interest', { elementId: elementId, meta: { time_visible: timeVisible, type: 'visual_focus' } });
                        observer.unobserve(element);
                        elementTimers.delete(element);
                    }, CONFIG.thresholds.time_visible);
                    elementTimers.set(element, timerId);
                } else {
                    if (elementTimers.has(element)) {
                        clearTimeout(elementTimers.get(element));
                        elementTimers.delete(element);
                    }
                }
            });
        }, { threshold: CONFIG.thresholds.visibility });
        document.querySelectorAll('[data-vibe="track"]').forEach(function (el) { observer.observe(el); });
    }

    function initSelectionTracker() {
        document.addEventListener('mouseup', function (e) {
            if (e.target && e.target.closest('.vibe-toast')) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const text = selection.toString().trim();
            if (text.length <= 3) return;
            let node = selection.anchorNode;
            let context = 'unknown';
            let elId = 'unknown';
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            let curr = node;
            while (curr && curr !== document.body) {
                if (curr.id) { context = '#' + curr.id; elId = curr.id; break; }
                if (curr.className) { context = '.' + curr.className.split(' ')[0]; break; }
                curr = curr.parentElement;
            }
            sendVibeEvent('compare_price', { elementId: elId, meta: { text_selected: text, context_selector: context } });
        });
    }

    function initPriceSensors() {
        let priceTimer = null;
        const priceElements = document.querySelectorAll('#price_display, .js-price-display, .item-price, .price');
        if (priceElements.length === 0) return;

        priceElements.forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                priceTimer = setTimeout(function () {
                    sendVibeEvent('compare_price', { elementId: 'price_hover', meta: { action: 'hover_2.5s' } });
                }, 2500);
            });
            el.addEventListener('mouseleave', function () {
                if (priceTimer) clearTimeout(priceTimer);
            });
            el.addEventListener('touchstart', function () {
                priceTimer = setTimeout(function () {
                    sendVibeEvent('compare_price', { elementId: 'price_touch', meta: { action: 'long_press_1.5s' } });
                }, 1500);
            }, { passive: true });
            el.addEventListener('touchend', function () {
                if (priceTimer) clearTimeout(priceTimer);
            });
            el.addEventListener('touchmove', function () {
                if (priceTimer) clearTimeout(priceTimer);
            }, { passive: true });
            el.addEventListener('click', function () {
                sendVibeEvent('hesitation', { elementId: 'price_click', meta: { action: 'user_clicked_price' } });
            });
        });
    }

    function adaptTiendaNubeDOM() {
        const productNameEl = document.querySelector('h1') || document.querySelector('[data-store="product-name"]');
        const productName = productNameEl ? productNameEl.innerText.trim() : 'Producto Desconocido';
        const productContainer = document.querySelector('.js-product-container') || document.querySelector('#single-product') || document.body;
        productContainer.setAttribute('data-vibe', 'track');
        productContainer.setAttribute('data-vibe-id', productName);
    }

    function init() {
        console.log("🚀 Vibe Agent v1.0: Cargado y Observando.");
        adaptTiendaNubeDOM();
        initPriceSensors();
        initVisibilityTracker();
        initSelectionTracker();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();