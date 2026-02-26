/**
 * ═══════════════════════════════════════════════════════
 * VIBE AGENT SDK v1.0 (MVP) - TiendaNube Edition
 * Incluye: Visibility, Price Comparison, Adaptador DOM, Conversion Tracking
 * ═══════════════════════════════════════════════════════
 */

(function () {
    // ────────────────────────────────────────────────────────
    // 1. CONFIGURACIÓN & ESTADO
    // ────────────────────────────────────────────────────────

    // API endpoint configurable de 3 formas (en orden de prioridad):
    // 1. window.VIBE_CONFIG = { api_endpoint: 'https://tu-api.com/api/track' }  (antes de cargar el script)
    // 2. <script src="vibe.js" data-api="https://tu-api.com/api/track">  (atributo en el script tag)
    // 3. Default: http://localhost:8000/api/track (desarrollo local)
    function _resolveApiEndpoint() {
        // Prioridad 1: variable global
        if (window.VIBE_CONFIG && window.VIBE_CONFIG.api_endpoint) {
            return window.VIBE_CONFIG.api_endpoint;
        }
        // Prioridad 2: data-api attribute en el script tag
        var scripts = document.querySelectorAll('script[src*="vibe.js"]');
        for (var i = 0; i < scripts.length; i++) {
            var apiAttr = scripts[i].getAttribute('data-api');
            if (apiAttr) return apiAttr;
        }
        // Default: desarrollo local
        return 'http://localhost:8000/api/track';
    }

    const CONFIG = {
        api_endpoint: _resolveApiEndpoint(),
        thresholds: {
            visibility: 0.5,      // 50% visible
            time_visible: 2000,   // 2 segundos
            rage_clicks: 3,       // 3 clicks rápidos
            rage_time: 800,       // en menos de 800ms
            doubt_pingpong: 4,    // 4 cambios de opción
            doubt_time: 10000     // en 10 segundos
        },
        colors: {
            rage: "#ff4d4d",   // Rojo
            doubt: "#ffc107",  // Amarillo
            agent: "#212529"   // Negro
        }
    };

    console.log('🔗 Vibe API endpoint:', CONFIG.api_endpoint);

    // Estado interno (Memoria a corto plazo)
    let history = {
        clicks: [],
        options: []
    };

    // ── SESSION ID (identifica al usuario durante la sesión) ──
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
    console.log('🎫 Vibe Session ID:', SESSION_ID);

    // ────────────────────────────────────────────────────────
    // 2. CAPA DE RED (NETWORK LAYER)
    // ────────────────────────────────────────────────────────

    function sendVibeEvent(eventType, data) {
        const payload = {
            event_type: eventType,
            element_id: data.elementId || 'unknown',
            meta: data.meta || {},
            timestamp: new Date().toISOString(),
            url: window.location.href,
            session_id: SESSION_ID
        };

        // Header ngrok-skip-browser-warning incluido para evitar bloqueos
        fetch(CONFIG.api_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                console.log("📥 Respuesta del Agente:", data);
                if (data.action === 'toast' && data.message) {
                    UI.speak(data.message, data.emotion || 'agent', data.button || 'none');
                }
            })
            .catch(err => console.error('❌ Error de conexión:', err));
    }

    // ────────────────────────────────────────────────────────
    // 3. CAPA DE UI PREMIUM (TOAST NOTIFICATIONS)
    // ────────────────────────────────────────────────────────

    function initUI() {
        const style = document.createElement('style');
        style.innerHTML = `
            .vibe-toast {
                position: fixed; bottom: 24px; right: 24px;
                background: #ffffff; color: #1a1a1a; padding: 16px 20px;
                border-radius: 12px; 
                box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1);
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 14px; line-height: 1.4; z-index: 2147483647; 
                transform: translateY(120px) scale(0.95); opacity: 0; 
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
                display: flex; flex-direction: column; gap: 12px; 
                border-left: 5px solid #1a1a1a;
                max-width: 340px; min-width: 280px;
                box-sizing: border-box;
            }
            .vibe-toast.visible { 
                transform: translateY(0) scale(1); opacity: 1; 
            }
            .vibe-toast-header { 
                display: flex; align-items: flex-start; gap: 12px; 
            }
            .vibe-icon-wrapper {
                background: #f3f4f6; border-radius: 50%; width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                font-size: 16px;
            }
            .vibe-message { font-weight: 500; margin-top: 6px; }
            .vibe-actions { display: flex; gap: 10px; margin-top: 4px; }
            
            .vibe-btn {
                display: flex; align-items: center; justify-content: center; gap: 6px;
                border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer;
                font-size: 13px; font-weight: 600; font-family: inherit;
                transition: all 0.2s ease; width: 100%;
            }
            .vibe-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .vibe-btn:active { transform: translateY(0); }
            
            .vibe-btn--whatsapp { background: #25D366; color: white; }
            .vibe-btn--whatsapp:hover { background: #22bf5b; }
            
            .vibe-btn--checkout { background: #000000; color: white; }
            .vibe-btn--checkout:hover { background: #333333; }
        `;
        document.head.appendChild(style);

        const toast = document.createElement('div');
        toast.className = 'vibe-toast';
        document.body.appendChild(toast);

        const ICONS = {
            whatsapp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`,
            checkout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`
        };

        const BUTTON_CONFIG = {
            whatsapp: {
                text: 'Consultar por WhatsApp',
                className: 'vibe-btn vibe-btn--whatsapp',
                icon: ICONS.whatsapp,
                action: function () {
                    // 1. Enviamos el evento de conversión al backend
                    sendVibeEvent('conversion_click', {
                        elementId: 'whatsapp_button',
                        meta: { action: 'user_accepted_help' }
                    });

                    // 2. Redirigimos a WhatsApp (ATENCIÓN: CAMBIAR NÚMERO)
                    window.open('https://wa.me/549XXXXXXXXX?text=Hola,%20tengo%20una%20duda%20con%20un%20producto', '_blank');
                }
            },
            checkout: {
                text: 'Ir a Pagar',
                className: 'vibe-btn vibe-btn--checkout',
                icon: ICONS.checkout,
                action: function () {
                    window.location.href = '/checkout';
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

                // Construir DOM de forma segura (previene XSS desde respuestas del LLM)
                toast.innerHTML = '';

                var header = document.createElement('div');
                header.className = 'vibe-toast-header';

                var iconWrapper = document.createElement('div');
                iconWrapper.className = 'vibe-icon-wrapper';
                iconWrapper.textContent = agentEmoji;
                header.appendChild(iconWrapper);

                var msgDiv = document.createElement('div');
                msgDiv.className = 'vibe-message';
                msgDiv.textContent = message;  // textContent = seguro contra XSS
                header.appendChild(msgDiv);

                toast.appendChild(header);

                if (buttonType !== 'none' && BUTTON_CONFIG[buttonType]) {
                    var actionsDiv = document.createElement('div');
                    actionsDiv.className = 'vibe-actions';

                    var btn = document.createElement('button');
                    btn.className = BUTTON_CONFIG[buttonType].className;
                    btn.id = 'vibe-action-btn';
                    btn.innerHTML = BUTTON_CONFIG[buttonType].icon + ' ' + BUTTON_CONFIG[buttonType].text;
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

    // ────────────────────────────────────────────────────────
    // 4. SENSORES (TRACKERS)
    // ────────────────────────────────────────────────────────

    function initVisibilityTracker() {
        const elementTimers = new Map();
        const observedAt = new Map();

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const element = entry.target;
                const elementId = element.id || element.getAttribute('data-vibe-id') || 'unknown';

                if (entry.isIntersecting && entry.intersectionRatio >= CONFIG.thresholds.visibility) {
                    if (!observedAt.has(element)) observedAt.set(element, Date.now());
                    if (elementTimers.has(element)) clearTimeout(elementTimers.get(element));

                    const timerId = setTimeout(() => {
                        const timeVisible = Date.now() - observedAt.get(element);
                        console.log(`👁️ Interés confirmado: ${elementId}`);
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

        document.querySelectorAll('[data-vibe="track"]').forEach(el => observer.observe(el));
    }

    function initSelectionTracker() {
        document.addEventListener('mouseup', () => {
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
                if (curr.id) { context = `#${curr.id}`; elId = curr.id; break; }
                if (curr.className) {
                    context = \`.\${curr.className.split(' ')[0]}\`; break; }
                curr = curr.parentElement;
            }

            console.log(`✂️ Selección: "${text}" en ${ context } `);
            sendVibeEvent('compare_price', {
                elementId: elId,
                meta: { text_selected: text, context_selector: context }
            });
        });
    }

    // initBehaviorTracker eliminado del flujo de inicialización por generar falsos positivos en TiendaNube.

    // ────────────────────────────────────────────────────────
    // 5. INICIALIZACIÓN MAESTRA
    // ────────────────────────────────────────────────────────

    function adaptTiendaNubeDOM() {
        // Busca el título del producto
        const productNameEl = document.querySelector('h1') || document.querySelector('[data-store="product-name"]');
        const productName = productNameEl ? productNameEl.innerText.trim() : 'Producto Desconocido';

        // Busca el contenedor principal del producto para el foco visual
        const productContainer = document.querySelector('.js-product-container') || document.querySelector('#single-product') || document.body;
        
        // Inyecta los sensores dinámicamente
        productContainer.setAttribute('data-vibe', 'track');
        productContainer.setAttribute('data-vibe-id', productName);
        
        console.log("🛠️ Adaptador TiendaNube: Sensores inyectados para ->", productName);
    }

    function init() {
        console.log("🚀 Vibe Agent v1.0: Cargado y Observando.");
        adaptTiendaNubeDOM(); 
        initVisibilityTracker();
        initSelectionTracker();
        // initBehaviorTracker() desactivado.
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();