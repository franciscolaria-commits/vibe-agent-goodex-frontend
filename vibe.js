/**
 * ═══════════════════════════════════════════════════════
 * VIBE AGENT SDK v1.0 (MVP) - TiendaNube Edition
 * ═══════════════════════════════════════════════════════
 */

(function () {
    function _resolveApiEndpoint() {
        if (window.VIBE_CONFIG && window.VIBE_CONFIG.api_endpoint) {
            return window.VIBE_CONFIG.api_endpoint;
        }
        var scripts = document.querySelectorAll('script[src*="vibe.js"]');
        for (var i = 0; i < scripts.length; i++) {
            var apiAttr = scripts[i].getAttribute('data-api');
            if (apiAttr) return apiAttr;
        }
        return 'http://localhost:8000/api/track';
    }

    const CONFIG = {
        api_endpoint: _resolveApiEndpoint(),
        thresholds: {
            visibility: 0.5,
            time_visible: 2000
        },
        colors: {
            rage: "#ff4d4d",
            doubt: "#ffc107",
            agent: "#212529"
        }
    };

    console.log('🔗 Vibe API endpoint:', CONFIG.api_endpoint);

    function generateSessionId() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var id = '';
        for (var i = 0; i < 16; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    if (!sessionStorage.getItem('vibe_session_id')) {
        sessionStorage.setItem('vibe_session_id', generateSessionId());
    }
    var SESSION_ID = sessionStorage.getItem('vibe_session_id');

    function sendVibeEvent(eventType, data) {
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
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                console.log("📥 Respuesta del Agente:", data);
                if (data.action === 'toast' && data.message) {
                    UI.speak(data.message, data.emotion || 'agent', data.button || 'none');
                }
            })
            .catch(function (err) { console.error('❌ Error de conexión:', err); });
    }

    function initUI() {
        const style = document.createElement('style');
        style.innerHTML = ".vibe-toast { position: fixed; bottom: 24px; right: 24px; background: #ffffff; color: #1a1a1a; padding: 16px 20px; border-radius: 12px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1); font-family: system-ui, -apple-system, sans-serif; font-size: 14px; z-index: 2147483647; transform: translateY(120px) scale(0.95); opacity: 0; transition: all 0.4s ease; display: flex; flex-direction: column; gap: 12px; border-left: 5px solid #1a1a1a; max-width: 340px; min-width: 280px; box-sizing: border-box; } .vibe-toast.visible { transform: translateY(0) scale(1); opacity: 1; } .vibe-toast-header { display: flex; align-items: flex-start; gap: 12px; } .vibe-icon-wrapper { background: #f3f4f6; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; } .vibe-message { font-weight: 500; margin-top: 6px; } .vibe-actions { display: flex; gap: 10px; margin-top: 4px; } .vibe-btn { display: flex; align-items: center; justify-content: center; gap: 6px; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; width: 100%; transition: all 0.2s ease; } .vibe-btn--whatsapp { background: #25D366; color: white; } .vibe-btn--checkout { background: #000000; color: white; }";
        document.head.appendChild(style);

        const toast = document.createElement('div');
        toast.className = 'vibe-toast';
        document.body.appendChild(toast);

        const WHATSAPP_NUMBER = (window.VIBE_CONFIG && window.VIBE_CONFIG.whatsapp_number) || '5491155551234';
        const WHATSAPP_MESSAGE = (window.VIBE_CONFIG && window.VIBE_CONFIG.whatsapp_message) || 'Hola, tengo una consulta sobre un producto';
        const CHECKOUT_URL = (window.VIBE_CONFIG && window.VIBE_CONFIG.checkout_url) || '';

        const BUTTON_CONFIG = {
            whatsapp: {
                text: 'Consultar por WhatsApp',
                className: 'vibe-btn vibe-btn--whatsapp',
                action: function () {
                    sendVibeEvent('conversion_click', { elementId: 'whatsapp_button', meta: { action: 'user_accepted_help' } });
                    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WHATSAPP_MESSAGE), '_blank');
                }
            },
            checkout: {
                text: 'Ir a Pagar',
                className: 'vibe-btn vibe-btn--checkout',
                action: function () {
                    if (CHECKOUT_URL) {
                        window.location.href = CHECKOUT_URL;
                    } else {
                        // Si no hay checkout configurado, redirigir a WhatsApp
                        window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WHATSAPP_MESSAGE), '_blank');
                    }
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
                        console.log("👁️ Interés confirmado: " + elementId);
                        sendVibeEvent('interest', {
                            elementId: elementId,
                            meta: { time_visible: timeVisible, type: 'visual_focus' }
                        });
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
        document.addEventListener('mouseup', function () {
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

            console.log("✂️ Selección: " + text + " en " + context);
            sendVibeEvent('compare_price', {
                elementId: elId,
                meta: { text_selected: text, context_selector: context }
            });
        });
    }

    function initPriceSensors() {
        let priceHoverTimer = null;
        const priceElements = document.querySelectorAll('#price_display, .js-price-display, .item-price, .price');

        if (priceElements.length === 0) {
            console.log("⚠️ No se encontraron elementos de precio.");
            return;
        }

        priceElements.forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                priceHoverTimer = setTimeout(function () {
                    console.log("⏱️ Usuario analizando precio");
                    sendVibeEvent('compare_price', { elementId: 'price_hover', meta: { action: 'hover_2.5s' } });
                }, 2500);
            });

            el.addEventListener('mouseleave', function () {
                if (priceHoverTimer) clearTimeout(priceHoverTimer);
            });

            el.addEventListener('click', function () {
                console.log("👆 Click en precio detectado");
                sendVibeEvent('hesitation', { elementId: 'price_click', meta: { action: 'user_clicked_price' } });
            });
        });
        console.log("🎯 Sensores directos de precio inyectados.");
    }

    function adaptTiendaNubeDOM() {
        const productNameEl = document.querySelector('h1') || document.querySelector('[data-store="product-name"]');
        const productName = productNameEl ? productNameEl.innerText.trim() : 'Producto Desconocido';
        const productContainer = document.querySelector('.js-product-container') || document.querySelector('#single-product') || document.body;

        productContainer.setAttribute('data-vibe', 'track');
        productContainer.setAttribute('data-vibe-id', productName);
        console.log("🛠️ Adaptador TiendaNube: Sensores inyectados para ->", productName);
    }

    function init() {
        console.log("🚀 Vibe Agent v1.0: Cargado y Observando.");
        adaptTiendaNubeDOM();
        initPriceSensors();
        initVisibilityTracker();
        initSelectionTracker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();