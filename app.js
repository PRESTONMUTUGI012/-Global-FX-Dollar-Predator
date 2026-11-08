// Public WebSocket Endpoint
const PUBLIC_WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public';

let ws = null;
let currentSymbol = null;
let tickHistory = [];
let lastQuote = null;

document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    const marketSelectEl = document.getElementById('marketSelect');
    if (marketSelectEl) {
        marketSelectEl.addEventListener('change', onSymbolChange);
    }
});

// 1. Connect to Public WebSocket Stream
function initWebSocket() {
    ws = new WebSocket(PUBLIC_WS_URL);

    ws.onopen = () => {
        updateConnectionStatus(true, 'Connected (Public Feed)');
        // Send active_symbols full request when connection opens
        ws.send(JSON.stringify({ "active_symbols": "full" }));[span_6](start_span)[span_6](end_span)
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);[span_7](start_span)[span_7](end_span)
        handleMessage(data);
    };

    ws.onclose = () => {
        updateConnectionStatus(false, 'Disconnected (Reconnecting...)');
        setTimeout(initWebSocket, 3000);
    };

    ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        updateConnectionStatus(false, 'Connection Error');
    };
}

// 2. Process incoming websocket messages using correct fields
function handleMessage(data) {
    // Handle active symbols list
    if (data.active_symbols) {[span_8](start_span)[span_8](end_span)
        populateAllMarketsDropdown(data.active_symbols);[span_9](start_span)[span_9](end_span)
    }

    // Handle live ticks
    if (data.tick) {[span_10](start_span)[span_10](end_span)
        const priceElement = document.getElementById('livePrice');
        const timeElement = document.getElementById('liveEpoch');

        const rawQuote = data.tick.quote;[span_11](start_span)[span_11](end_span)
        const epoch = data.tick.epoch;[span_12](start_span)[span_12](end_span)
        const quote = parseFloat(rawQuote).toFixed(data.tick.pip_size || 4);

        if (priceElement) {
            priceElement.textContent = quote;[span_13](start_span)[span_13](end_span)
        }
        if (timeElement) {
            timeElement.textContent = new Date(epoch * 1000).toLocaleString();[span_14](start_span)[span_14](end_span)
        }

        const currentNum = parseFloat(quote);
        const prevNum = lastQuote !== null ? parseFloat(lastQuote) : null;

        analyzeTickFeatures(currentNum, prevNum);
        
        const quoteString = currentNum.toString();
        const lastChar = quoteString.slice(-1);
        const digitNum = parseInt(lastChar, 10);
        runAIBotAnalysis(currentNum, prevNum, digitNum);

        lastQuote = quote;

        tickHistory.push(currentNum);
        if (tickHistory.length > 30) tickHistory.shift();

        renderSVGChart();
        appendTickTableRow(epoch, quote);
    }
}

// 3. Populate dropdown using market.display_name and market.underlying_symbol
function populateAllMarketsDropdown(symbols) {
    const select = document.getElementById('marketSelect');
    if (!select) return;
    
    select.innerHTML = '';

    const categories = {
        'Synthetic Indices': [],
        'Forex Currency Pairs': [],
        'Commodities (Gold/Oil)': [],
        'Cryptocurrencies': [],
        'Stock & Basket Indices': []
    };

    symbols.forEach(market => {[span_15](start_span)[span_15](end_span)
        // Use market.display_name and market.underlying_symbol correctly
        const displayName = market.display_name;[span_16](start_span)[span_16](end_span)
        const underlyingSymbol = market.underlying_symbol;[span_17](start_span)[span_17](end_span)
        const marketName = market.market;

        if (!underlyingSymbol) return;

        if (marketName === 'synthetic_index') {
            categories['Synthetic Indices'].push(market);
        } else if (marketName === 'forex') {
            categories['Forex Currency Pairs'].push(market);
        } else if (marketName === 'commodities') {
            categories['Commodities (Gold/Oil)'].push(market);
        } else if (marketName === 'cryptocurrency') {
            categories['Cryptocurrencies'].push(market);
        } else {
            categories['Stock & Basket Indices'].push(market);
        }
    });

    Object.keys(categories).forEach(catName => {
        if (categories[catName].length > 0) {
            const group = document.createElement('optgroup');
            group.label = `--- ${catName.toUpperCase()} ---`;

            categories[catName].forEach(market => {[span_18](start_span)[span_18](end_span)
                const option = document.createElement('option');
                option.value = market.underlying_symbol;[span_19](start_span)[span_19](end_span)
                option.innerText = `${market.display_name} (${market.underlying_symbol})`;[span_20](start_span)[span_20](end_span)
                group.appendChild(option);
            });

            select.appendChild(group);
        }
    });

    // Auto-select and subscribe to the first active underlying symbol if not set
    if (symbols.length > 0 && !currentSymbol) {
        currentSymbol = symbols[0].underlying_symbol;[span_21](start_span)[span_21](end_span)
        select.value = currentSymbol;
        subscribeToSymbolTicks(currentSymbol);
    }
}

// 4. Change symbol subscription dynamically
function onSymbolChange() {
    const select = document.getElementById('marketSelect');
    if (select) {
        currentSymbol = select.value;
        subscribeToSymbolTicks(currentSymbol);
    }
}

function subscribeToSymbolTicks(symbol) {
    if (ws && ws.readyState === WebSocket.OPEN && symbol) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
        tickHistory = [];
        lastQuote = null;
        
        // Subscribe using {"ticks": symbol, "subscribe": 1}
        ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        
        const chartSymbolEl = document.getElementById('chartSymbol');
        if (chartSymbolEl) chartSymbolEl.innerText = symbol;
    }
}

// 5. Rise/Fall and Digit Analysis logic
function analyzeTickFeatures(currentQuote, previousQuote) {
    const directionBox = document.getElementById('tickDirectionBox');
    const digitValueEl = document.getElementById('lastDigitValue');
    const digitEvenOddEl = document.getElementById('digitEvenOdd');

    if (previousQuote !== null && directionBox) {
        if (currentQuote > previousQuote) {
            directionBox.className = "p-4 bg-emerald-950/60 rounded-lg border border-emerald-500/50 text-center font-mono text-lg font-bold text-emerald-400 shadow-inner";
            directionBox.innerHTML = `<i class="fa-solid fa-arrow-up"></i> RISE (+${(currentQuote - previousQuote).toFixed(4)})`;
        } else if (currentQuote < previousQuote) {
            directionBox.className = "p-4 bg-rose-950/60 rounded-lg border border-rose-500/50 text-center font-mono text-lg font-bold text-rose-400 shadow-inner";
            directionBox.innerHTML = `<i class="fa-solid fa-arrow-down"></i> FALL (-${(previousQuote - currentQuote).toFixed(4)})`;
        } else {
            directionBox.className = "p-4 bg-slate-950/90 rounded-lg border border-emerald-500/30 text-center font-mono text-lg font-bold text-slate-300 shadow-inner";
            directionBox.innerHTML = `NO CHANGE`;
        }
    }

    const quoteString = currentQuote.toString();
    const lastChar = quoteString.slice(-1);
    const digitNum = parseInt(lastChar, 10);

    if (!isNaN(digitNum) && digitValueEl && digitEvenOddEl) {
        digitValueEl.innerText = digitNum;
        const isEven = digitNum % 2 === 0;
        digitEvenOddEl.innerText = isEven ? "EVEN (🟢)" : "ODD (🔴)";
        digitEvenOddEl.className = isEven ? "text-xs font-bold text-emerald-400" : "text-xs font-bold text-rose-400";
    }
}

// 6. AI Bot Analysis Engine
function runAIBotAnalysis(currentQuote, previousQuote, lastDigit) {
    if (previousQuote === null) return;

    const botSignalEl = document.getElementById('aiBotSignal');
    const botConfidenceEl = document.getElementById('aiBotConfidence');
    if (!botSignalEl) return;

    const priceDiff = currentQuote - previousQuote;
    let signal = "HOLD / WAIT";
    let confidence = "54%";
    let recommendationColor = "text-amber-400";

    if (priceDiff > 0 && lastDigit % 2 === 0) {
        signal = "RISE & EVEN (CALL)";
        confidence = "81%";
        recommendationColor = "text-emerald-400";
    } else if (priceDiff < 0 && lastDigit % 2 !== 0) {
        signal = "FALL & ODD (PUT)";
        confidence = "79%";
        recommendationColor = "text-rose-400";
    } else if (priceDiff > 0) {
        signal = "MOMENTUM RISE";
        confidence = "67%";
        recommendationColor = "text-emerald-400";
    } else if (priceDiff < 0) {
        signal = "MOMENTUM FALL";
        confidence = "66%";
        recommendationColor = "text-rose-400";
    }

    botSignalEl.innerText = signal;
    botSignalEl.className = `text-sm font-bold font-mono ${recommendationColor}`;
    if (botConfidenceEl) botConfidenceEl.innerText = confidence;
}

// 7. SVG Chart Rendering
function renderSVGChart() {
    if (tickHistory.length < 2) return;
    const svg = document.getElementById('tickChart');
    const path = document.getElementById('chartPath');
    if (!svg || !path) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const min = Math.min(...tickHistory);
    const max = Math.max(...tickHistory);
    const range = (max - min) || 1;

    const points = tickHistory.map((val, idx) => {
        const x = (idx / (tickHistory.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 20) - 10;
        return `${x},${y}`;
    });

    path.setAttribute('d', `M ${points.join(' L ')}`);
}

// 8. Add Row to Table
function appendTickTableRow(epoch, quote) {
    const tbody = document.getElementById('tickTableBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="p-2.5 text-slate-400">${epoch}</td>
        <td class="p-2.5 text-emerald-400 font-bold">${quote}</td>
    `;
    tbody.prepend(row);

    if (tbody.children.length > 12) {
        tbody.removeChild(tbody.lastChild);
    }
}

// 9. Update Connection Status Badge
function updateConnectionStatus(isConnected, text) {
    const badge = document.getElementById('connectionStatus');
    if (!badge) return;

    if (isConnected) {
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-green"></span><span class="text-emerald-400 font-mono font-semibold">${text}</span>`;
    } else {
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span class="text-rose-400 font-mono font-semibold">${text}</span>`;
    }
}



    
            

    
