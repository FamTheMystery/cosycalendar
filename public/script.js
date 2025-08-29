// ES5 compatible JS for iOS 10
function updateClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();
    var timeStr;
    try {
        var use24 = localStorage.getItem('cosy-24h') === '1';
    } catch (e) { var use24 = false; }
    if (use24) {
        timeStr = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    } else {
        var ampm = h >= 12 ? 'PM' : 'AM';
        var hh = h % 12;
        hh = hh ? hh : 12;
        timeStr = (hh < 10 ? '0' : '') + hh + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + ' ' + ampm;
    }
    var clk = document.getElementById('clock');
    if (clk) clk.innerHTML = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

function renderCalendar() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var html = '<table><tr><th colspan="7">' + monthNames[month] + ' ' + year + '</th></tr><tr>';
    for (var d = 0; d < 7; d++) {
        html += '<th>' + dayNames[d] + '</th>';
    }
    html += '</tr><tr>';
    for (var i = 0; i < firstDay; i++) {
        html += '<td></td>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
        var cls = day === today ? 'today' : '';
        html += '<td class="' + cls + '">' + day + '</td>';
        if ((firstDay + day) % 7 === 0 && day !== daysInMonth) {
            html += '</tr><tr>';
        }
    }
    html += '</tr></table>';
    document.getElementById('calendar').innerHTML = html;
}
renderCalendar();

// Schedule an update at midnight to refresh calendar and greeting
(function scheduleMidnightUpdate() {
    function msUntilNextMidnight() {
        var now = new Date();
        var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return next.getTime() - now.getTime();
    }
    // run once at next midnight, then every 24 hours
    setTimeout(function() {
        try { renderCalendar(); } catch (e) {}
        try { updateGreeting(); } catch (e) {}
        // then set interval every 24h
        setInterval(function() {
            try { renderCalendar(); } catch (e) {}
            try { updateGreeting(); } catch (e) {}
        }, 24 * 60 * 60 * 1000);
    }, msUntilNextMidnight());
})();

// Reload calendar at midnight (00:00)
function checkMidnightReload() {
    var now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 2) {
        renderCalendar();
    }
}
setInterval(checkMidnightReload, 1000);

// Secondary clock element (below main clock)
(function() {
    var left = document.querySelector('.left-column');
    if (!left) return;
    var clockCard = left.querySelector('.clock-card');
    if (!clockCard) return;
    var sec = document.getElementById('secondaryClock');
    if (!sec) {
        sec = document.createElement('div');
        sec.className = 'secondary-clock';
        sec.id = 'secondaryClock';
        sec.innerHTML = '';
        clockCard.appendChild(sec);
    }
})();
// === CLIENT-SIDE LOGGING ===
function clientLog(level, message, data) {
    // Also log to console
    console[level] ? console[level](message, data) : console.log(message, data);
    
    // Send to server for file logging
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/log', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            level: level.toUpperCase(),
            message: message,
            data: data
        }));
    } catch (e) {
        // Ignore logging errors to avoid infinite loops
    }
}

// Test the logging system
clientLog('info', 'Script.js loaded - client logging system initialized');

// Global weather mapping functions (moved outside IIFE for accessibility)
function weatherTextFromCode(code, timeStr) {
    var isNight = isNightTime(timeStr);
    var map = {
        0: isNight ? 'Clear night' : 'Clear',
        1: isNight ? 'Mainly clear night' : 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Light rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Heavy showers',
        95: 'Thunder',
        96: 'Thunder + hail'
    };
    return map.hasOwnProperty(code) ? map[code] : 'Weather';
}

function weatherIconFromCode(code, timeStr) {
    var isNight = isNightTime(timeStr);
    // Return a simple emoji for broad compatibility on older iOS
    var icons = {};
    icons[0] = isNight ? '🌙' : '☀️';  // Moon for clear night, sun for clear day
    icons[1] = isNight ? '🌙' : '🌙☁️'; // Moon for mainly clear night, sun/cloud for day
    icons[2] = '⛅';
    icons[3] = '☁️';
    icons[45] = '🌫️';
    icons[48] = '🌫️';
    icons[51] = '🌦️';
    icons[53] = '🌦️';
    icons[55] = '🌧️';
    icons[61] = '🌧️';
    icons[63] = '🌧️';
    icons[65] = '🌧️';
    icons[71] = '🌨️';
    icons[73] = '🌨️';
    icons[75] = '❄️';
    icons[80] = '🌦️';
    icons[81] = '🌧️';
    icons[95] = '⛈️';
    icons[96] = '⛈️';
    return icons.hasOwnProperty(code) ? icons[code] : (isNight ? '🌙' : '🌤️');
}

// Helper function to determine if it's nighttime
function isNightTime(timeStr) {
    if (!timeStr) {
        // If no time provided, use current time
        var now = new Date();
        var hour = now.getHours();
        return hour < 6 || hour >= 19; // Consider 7 PM to 6 AM as night
    }
    
    // If timeStr is provided, try to parse it
    if (typeof timeStr === 'string') {
        var time = new Date(timeStr);
        if (!isNaN(time.getTime())) {
            var hour = time.getHours();
            return hour < 6 || hour >= 19; // Consider 7 PM to 6 AM as night
        }
    }
    
    // If we can't determine, default to day
    return false;
}

// Weather widget: uses Open-Meteo geocoding + forecast APIs (no API key)
(function() {
    var locInput = document.getElementById('weatherLocation');
    var saveBtn = document.getElementById('saveWeatherLocationBtn');
    var clearBtn = document.getElementById('clearWeatherLocationBtn');
    var status = document.getElementById('weatherStatus');
    var weatherEl = document.getElementById('weather');
    var saved = null;
    try { saved = localStorage.getItem('cosy-weather-location'); } catch (e) { saved = null; }
    if (saved && locInput) locInput.value = saved;

    function showWeatherMessage(msg) {
        if (!weatherEl) return;
        weatherEl.innerHTML = '<div style="padding:8px; color:#6d3b5a;">' + msg + '</div>';
    }

    function xhrGet(url, cb) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) return;
                if (xhr.status >= 200 && xhr.status < 300) {
                    try { cb(null, JSON.parse(xhr.responseText)); } catch (e) { cb(e); }
                } else {
                    cb(new Error('HTTP ' + xhr.status));
                }
            };
            xhr.send();
        } catch (e) {
            cb(e);
        }
    }

    function renderCurrentWeather(data) {
        if (!weatherEl) return;
        if (!data || !data.current_weather) { showWeatherMessage('No weather data'); return; }
        var cw = data.current_weather;
        var currentTime = cw.time || new Date().toISOString();
        var text = weatherTextFromCode(cw.weathercode, currentTime);
        var icon = weatherIconFromCode(cw.weathercode, currentTime);
        var temp = Math.round(cw.temperature);
        var html = '<div style="display:flex; align-items:center; justify-content:space-between;">' +
                   '<div style="display:flex; align-items:center; flex:1;">' +
                     '<div aria-hidden="true" style="font-size:1.4em; margin-right:10px; line-height:1;">' + icon + '</div>' +
                     '<div>' +
                       '<div style="font-weight:700;">' + text + '</div>' +
                     '</div>' +
                   '</div>' +
                   '<div style="font-weight:700; font-size:1.4em; margin-left:12px;">' + temp + '°C</div>' +
                 '</div>';
        weatherEl.innerHTML = html;
        if (status) status.textContent = '';
    }

    function encodeHTML(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function fetchWeatherByCoords(lat, lon) {
        if (status) status.textContent = 'Loading weather...';
    var url = '/proxy/detailed-weather?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon);
        xhrGet(url, function(err, data) {
            if (err) { showWeatherMessage('Weather unavailable'); if (status) status.textContent = 'Failed to load weather'; return; }
            renderCurrentWeather(data);
        });
    }

    function geocodeAndFetch(q) {
        if (!q) { showWeatherMessage('No location'); return; }
        if (status) status.textContent = 'Looking up location...';
    var gUrl = '/proxy/geocode?name=' + encodeURIComponent(q);
        xhrGet(gUrl, function(err, data) {
            if (err || !data || !data.results || !data.results.length) { showWeatherMessage('Location not found'); if (status) status.textContent = 'Location not found'; return; }
            var r = data.results[0];
            fetchWeatherByCoords(r.latitude, r.longitude);
        });
    }

    function fetchForSavedOrAuto() {
        var manual = locInput && locInput.value && locInput.value.trim();
        // If user typed a manual location, use it immediately
        if (manual) {
            geocodeAndFetch(manual.trim());
            return;
        }
        // If no manual value, but we have a saved value, try that first
        var savedLocal = saved;
        if (savedLocal) {
            geocodeAndFetch(savedLocal);
            return;
        }
        // Otherwise fall back to geolocation (if available)
        if (!navigator.geolocation) {
            showWeatherMessage('Geolocation not available');
            if (status) status.textContent = 'Geolocation unavailable';
            return;
        }
        if (status) status.textContent = 'Detecting location...';
        try {
            navigator.geolocation.getCurrentPosition(function(pos) {
                fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            }, function(err) {
                // On error (permission denied or other), try manual input first, then saved value
                var manualRetry = locInput && locInput.value && locInput.value.trim();
                if (manualRetry) {
                    geocodeAndFetch(manualRetry);
                    return;
                }
                if (saved) { geocodeAndFetch(saved); }
                else { showWeatherMessage('Allow location or enter a city'); if (status) status.textContent = 'Location denied'; }
            }, { maximumAge: 10 * 60 * 1000, timeout: 10 * 1000 });
        } catch (e) {
            // If geolocation throws, fall back to manual or saved
            var manualCatch = locInput && locInput.value && locInput.value.trim();
            if (manualCatch) { geocodeAndFetch(manualCatch); return; }
            if (saved) { geocodeAndFetch(saved); } else { showWeatherMessage('Unable to get location'); if (status) status.textContent = 'Location error'; }
        }
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            if (!locInput) return;
            var v = locInput.value && locInput.value.trim();
            if (!v) return;
            try { localStorage.setItem('cosy-weather-location', v); saved = v; } catch (e) {}
            fetchForSavedOrAuto();
            if (status) status.textContent = 'Saved';
            setTimeout(function(){ if (status) status.textContent = ''; }, 1200);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            try { localStorage.removeItem('cosy-weather-location'); saved = null; } catch (e) {}
            if (locInput) locInput.value = '';
            fetchForSavedOrAuto();
            if (status) status.textContent = 'Cleared';
            setTimeout(function(){ if (status) status.textContent = ''; }, 900);
        });
    }

    // initial load
    try { fetchForSavedOrAuto(); } catch (e) { showWeatherMessage('Weather error'); }
    // refresh every 10 minutes
    setInterval(function() { try { fetchForSavedOrAuto(); } catch (e){} }, 10 * 60 * 1000);

})();

// Greeting in the placeholder card
function updateGreeting() {
    try {
        var el = document.getElementById('placeholderGreeting');
        if (!el) return;
        var now = new Date();
        var h = now.getHours();
        var greet = 'Good Morning';
        if (h >= 5 && h < 12) greet = 'Good Morning';
        else if (h >= 12 && h < 17) greet = 'Good Afternoon';
        else if (h >= 17 && h < 21) greet = 'Good Evening';
        else greet = 'Good Night';
    // include saved name if present
    var name = '';
    try { name = localStorage.getItem('cosy-greeting-name') || ''; } catch (e) { name = ''; }
    name = name ? name.trim() : '';
    el.innerHTML = name ? (greet + ', ' + name) : greet;
    } catch (e) { }
}
updateGreeting();
setInterval(updateGreeting, 60 * 1000);

// 24-hour and timezone controls initialization + secondary clock updater
(function() {
    var hourChk = document.getElementById('hour24Chk');
    var tzSelect = document.getElementById('tzSelect');
    var showChk = document.getElementById('showSecondChk');
    try {
        var saved24 = localStorage.getItem('cosy-24h');
        if (saved24 === '1' && hourChk) hourChk.checked = true;
    } catch (e) { }
    if (hourChk) {
        hourChk.addEventListener('change', function() {
            try { localStorage.setItem('cosy-24h', hourChk.checked ? '1' : '0'); } catch (e) { }
            try { updateClock(); } catch (e) { }
            try { updateSecondaryClock(); } catch (e) { }
        });
    }
    if (showChk) {
        try {
            var savedShow = localStorage.getItem('cosy-show-second');
            if (savedShow === '1') showChk.checked = true;
        } catch (e) { }
        showChk.addEventListener('change', function() {
            try { localStorage.setItem('cosy-show-second', showChk.checked ? '1' : '0'); } catch (e) { }
            var card = document.getElementById('secondaryClockCard');
            if (card) card.style.display = showChk.checked ? '' : 'none';
            try { updateSecondaryClock(); } catch (e) { }
        });
    }
    try {
        var savedTz = localStorage.getItem('cosy-tz');
        if (savedTz && tzSelect) tzSelect.value = savedTz;
    } catch (e) { }
    if (tzSelect) {
        tzSelect.addEventListener('change', function() {
            try { localStorage.setItem('cosy-tz', tzSelect.value); } catch (e) { }
            try { updateSecondaryClock(); } catch (e) { }
        });
    }

    function updateSecondaryClock() {
        var el = document.getElementById('secondaryClock');
        if (!el) return;
        var tz = 'local';
        try { tz = localStorage.getItem('cosy-tz') || 'local'; } catch (e) { }
        var now = new Date();
        var out = '';
        function abbrevTZ(tz) {
            var map = {
                'local': 'Local',
                'UTC': 'UTC',
                'America/New_York': 'NY',
                'Europe/London': 'LDN',
                'Asia/Tokyo': 'TYO',
                'Australia/Sydney': 'SYD',
                'Asia/Kolkata': 'IND'
            };
            if (map[tz]) return map[tz];
            var parts = (tz || '').split('/');
            return parts.length ? parts[parts.length-1].replace('_',' ') : tz;
        }

        if (typeof Intl !== 'undefined' && Intl.DateTimeFormat && tz !== 'local') {
            try {
                var opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz };
                var fmt = new Intl.DateTimeFormat(undefined, opts);
                out = fmt.format(now);
                try { if (localStorage.getItem('cosy-24h') !== '1') {
                    var parts = out.split(':');
                    var H = parseInt(parts[0], 10);
                    var M = parts[1] || '00';
                    var S = parts[2] || '00';
                    var ampm = H >= 12 ? 'PM' : 'AM';
                    var hh = H % 12; hh = hh ? hh : 12;
                    out = (hh < 10 ? '0' : '') + hh + ':' + M + ':' + S + ' ' + ampm;
                } } catch (e) {}
                el.innerHTML = abbrevTZ(tz) + ': ' + out;
                return;
            } catch (e) { }
        }
        if (tz === 'UTC') {
            out = now.getUTCHours() + ':' + (now.getUTCMinutes()<10?('0'+now.getUTCMinutes()):now.getUTCMinutes()) + ':' + (now.getUTCSeconds()<10?('0'+now.getUTCSeconds()):now.getUTCSeconds());
        } else if (tz === 'local') {
            out = now.getHours() + ':' + (now.getMinutes()<10?('0'+now.getMinutes()):now.getMinutes()) + ':' + (now.getSeconds()<10?('0'+now.getSeconds()):now.getSeconds());
        } else {
            out = now.getUTCHours() + ':' + (now.getUTCMinutes()<10?('0'+now.getUTCMinutes()):now.getUTCMinutes()) + ':' + (now.getUTCSeconds()<10?('0'+now.getUTCSeconds()):now.getUTCSeconds());
        }
    var card = document.getElementById('secondaryClockCard');
    if (card) card.style.display = (function(){ try { return localStorage.getItem('cosy-show-second') === '1'; } catch(e){ return false;} })() ? '' : 'none';
    el.innerHTML = abbrevTZ(tz) + ': ' + out;
    }

    setInterval(updateSecondaryClock, 1000);
    updateSecondaryClock();
})();

// Google Tasks (Apps Script endpoint) integration (ES5 XHR; user deploys script and pastes URL)
(function() {
    var endpointInput = document.getElementById('tasksEndpoint');
    var saveBtn = document.getElementById('saveTasksEndpointBtn');
    var clearBtn = document.getElementById('clearTasksEndpointBtn');
    var tasksInner = document.getElementById('tasksInner');
    var tasksListSelect = document.getElementById('tasksListSelect');
    var loadListsBtn = document.getElementById('loadListsBtn');
    var tasksListStatus = document.getElementById('tasksListStatus');
    var defaultTasksListSelect = document.getElementById('defaultTasksListSelect');
    var saveDefaultListBtn = document.getElementById('saveDefaultListBtn');
    var defaultListStatus = document.getElementById('defaultListStatus');
    var fullscreenBtn = document.getElementById('fullscreenBtn');
    var saved = null;
    var availableLists = []; // Store available lists for default selection
    
    try { saved = localStorage.getItem('cosy-tasks-endpoint'); } catch (e) { saved = null; }
    if (saved && endpointInput) endpointInput.value = saved;
    
    // Load saved default list
    var savedDefaultList = null;
    try { savedDefaultList = localStorage.getItem('cosy-default-tasks-list'); } catch (e) { savedDefaultList = null; }
    try { var savedList = localStorage.getItem('cosy-tasks-listid'); if (savedList && tasksListSelect) tasksListSelect.value = savedList; } catch (e) {}

    function showTasksMessage(msg) {
        if (!tasksInner) return;
        tasksInner.innerHTML = '<div style="padding:8px; color:#6d3b5a;">' + msg + '</div>';
    }

    function renderTasks(list) {
        if (!tasksInner) return;
        try {
            if (!list || !list.length) { showTasksMessage('No tasks found or list is empty.'); return; }
            function esc(s) {
                if (s === undefined || s === null) return '';
                return String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }
            var html = '<ul class="tasks-list" style="list-style:none; padding:0; margin:0;">';
            for (var i = 0; i < list.length; i++) {
                var t = list[i];
                var title = esc(t.title || t.task || 'Untitled');
                var due = t.due ? esc(t.due) : '';
                html += '<li class="task-item" style="padding:8px 6px; border-bottom:1px solid rgba(160,110,140,0.07);">' +
                    '<div class="task-title">' + title + '</div>' +
                    (due ? ('<div class="task-due">Due: ' + due + '</div>') : '') +
                    '</li>';
            }
            html += '</ul>';
            tasksInner.innerHTML = html;
        } catch (e) { showTasksMessage('Error rendering tasks'); }
    }

    function xhrGet(url, cb) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { var json = JSON.parse(xhr.responseText); cb(null, json); } catch (e) { cb(e); }
                    } else {
                        cb(new Error('Status ' + xhr.status));
                    }
                }
            };
            xhr.send();
        } catch (e) { cb(e); }
    }

    function fetchTasks() {
        var url = null;
        try { url = localStorage.getItem('cosy-tasks-endpoint'); } catch (e) { url = null; }
        if (!url) { showTasksMessage('No endpoint configured. Open Settings to add your Apps Script URL.'); return; }
        // if user configured a tasklist id, append it as a query param (caller Apps Script can use it)
        try {
            var tl = tasksListSelect ? (tasksListSelect.value || '').trim() : '';
            if (tl) {
                url += (url.indexOf('?') === -1 ? '?' : '&') + 'tasklist=' + encodeURIComponent(tl);
            }
        } catch (e) {}
        showTasksMessage('Loading tasks...');
        xhrGet(url, function(err, data) {
            if (err) { showTasksMessage('Failed to fetch tasks: ' + (err.message || err)); return; }
            // Expect the Apps Script to return an array of tasks, or an object { items: [...] }
            var list = [];
            if (!data) { showTasksMessage('Empty response from endpoint'); return; }
            if (Object.prototype.toString.call(data) === '[object Array]') list = data;
            else if (data.items && Object.prototype.toString.call(data.items) === '[object Array]') list = data.items;
            else if (data.tasks && Object.prototype.toString.call(data.tasks) === '[object Array]') list = data.tasks;
            else if (data.result && Object.prototype.toString.call(data.result) === '[object Array]') list = data.result;
            else { showTasksMessage('Unexpected response shape from endpoint'); return; }
            renderTasks(list);
        });
    }

    if (saveBtn) saveBtn.addEventListener('click', function() {
        var v = endpointInput ? endpointInput.value.trim() : '';
        if (!v) { try { localStorage.removeItem('cosy-tasks-endpoint'); } catch (e) {} showTasksMessage('Endpoint cleared'); return; }
        try { localStorage.setItem('cosy-tasks-endpoint', v); } catch (e) {}
    try { if (tasksListSelect) localStorage.setItem('cosy-tasks-listid', (tasksListSelect.value||'').trim()); } catch (e) {}
        showTasksMessage('Saved endpoint. Fetching...');
        setTimeout(fetchTasks, 200);
    });

    if (clearBtn) clearBtn.addEventListener('click', function() {
        try { localStorage.removeItem('cosy-tasks-endpoint'); } catch (e) {}
        if (endpointInput) endpointInput.value = '';
        showTasksMessage('Endpoint cleared');
    });

    // Load available tasklists from the Apps Script endpoint (calls ?list=1)
    function loadTasklists() {
        var url = null;
        try { url = localStorage.getItem('cosy-tasks-endpoint'); } catch (e) { url = null; }
        if (!url) {
            if (tasksListStatus) tasksListStatus.innerText = 'No endpoint saved — save the endpoint first.';
            return;
        }
        if (tasksListStatus) tasksListStatus.innerText = 'Loading lists...';
        var listUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + 'list=1';
        xhrGet(listUrl, function(err, data) {
            if (err) {
                if (tasksListStatus) tasksListStatus.innerText = 'Failed to load lists: ' + (err.message || err);
                return;
            }
            var lists = [];
            if (!data) { if (tasksListStatus) tasksListStatus.innerText = 'No data from endpoint'; return; }
            if (data.tasklists && Object.prototype.toString.call(data.tasklists) === '[object Array]') lists = data.tasklists;
            else if (data.items && Object.prototype.toString.call(data.items) === '[object Array]') lists = data.items;
            else if (Object.prototype.toString.call(data) === '[object Array]') lists = data;
            else { if (tasksListStatus) tasksListStatus.innerText = 'Unexpected list response'; return; }

            // Store available lists for default selection
            availableLists = lists;

            // populate select
            if (tasksListSelect) {
                // keep default option
                var opts = '<option value="">Default (device)</option>';
                for (var i = 0; i < lists.length; i++) {
                    var li = lists[i];
                    var id = li.id || li.etag || (li.title && li.title.replace(/\s+/g,'_')) || ('list'+i);
                    var title = li.title || id;
                    opts += '<option value="' + encodeURIComponent(id) + '">' + (title) + '</option>';
                }
                tasksListSelect.innerHTML = opts;
                // restore saved selection
                try { var saved = localStorage.getItem('cosy-tasks-listid'); if (saved) tasksListSelect.value = saved; } catch (e) {}
                if (tasksListStatus) tasksListStatus.innerText = 'Loaded ' + lists.length + ' lists.';
            }
            
            // populate default list selector
            if (defaultTasksListSelect) {
                var defaultOpts = '<option value="">No default (use device list)</option>';
                for (var j = 0; j < lists.length; j++) {
                    var list = lists[j];
                    var listId = list.id || list.etag || (list.title && list.title.replace(/\s+/g,'_')) || ('list'+j);
                    var listTitle = list.title || listId;
                    defaultOpts += '<option value="' + encodeURIComponent(listId) + '">' + (listTitle) + '</option>';
                }
                defaultTasksListSelect.innerHTML = defaultOpts;
                // restore saved default selection
                if (savedDefaultList) {
                    defaultTasksListSelect.value = savedDefaultList;
                }
                if (defaultListStatus) defaultListStatus.innerText = 'Default list options loaded.';
            }
        });
    }

    if (loadListsBtn) loadListsBtn.addEventListener('click', function() { loadTasklists(); });
    if (tasksListSelect) tasksListSelect.addEventListener('change', function() { try { localStorage.setItem('cosy-tasks-listid', tasksListSelect.value || ''); } catch (e) {} });

    // Save default list button functionality
    if (saveDefaultListBtn) {
        saveDefaultListBtn.addEventListener('click', function() {
            var selectedDefault = defaultTasksListSelect ? defaultTasksListSelect.value : '';
            try {
                localStorage.setItem('cosy-default-tasks-list', selectedDefault);
                if (defaultListStatus) {
                    if (selectedDefault) {
                        var selectedText = defaultTasksListSelect.options[defaultTasksListSelect.selectedIndex].text;
                        defaultListStatus.innerText = 'Default list saved: ' + selectedText;
                        // Auto-switch to the default list
                        if (tasksListSelect) {
                            tasksListSelect.value = selectedDefault;
                            localStorage.setItem('cosy-tasks-listid', selectedDefault);
                            fetchTasks(); // Reload tasks with new default
                        }
                    } else {
                        defaultListStatus.innerText = 'Default list cleared.';
                    }
                }
            } catch (e) {
                if (defaultListStatus) defaultListStatus.innerText = 'Failed to save default list.';
            }
        });
    }

    // Fullscreen handling (works on browsers that support the Fullscreen API)
    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }
    function requestFullscreen(el) {
        try {
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
            else if (el.msRequestFullscreen) el.msRequestFullscreen();
        } catch (e) {}
    }
    function exitFullscreen() {
        try {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        } catch (e) {}
    }
    function syncFullscreenButton() {
        if (!fullscreenBtn) return;
        if (isFullscreen()) {
            fullscreenBtn.innerText = 'Exit Fullscreen';
            fullscreenBtn.classList.add('active');
        } else {
            fullscreenBtn.innerText = 'Enter Fullscreen';
            fullscreenBtn.classList.remove('active');
        }
    }
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', function() {
            if (isFullscreen()) exitFullscreen(); else requestFullscreen(document.documentElement);
            setTimeout(syncFullscreenButton, 300);
        });
    }
    // update button when user exits fullscreen via system controls
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
    document.addEventListener('mozfullscreenchange', syncFullscreenButton);
    document.addEventListener('MSFullscreenChange', syncFullscreenButton);

    // expose a small refresh control via double-click on the tasks area
    if (tasksInner) {
        var refreshBtn = document.createElement('button');
    // keep placement inline; colors/backgrounds are controlled by CSS variables via classes
    refreshBtn.style.cssText = 'position:absolute; right:12px; top:8px; cursor:pointer; font-size:0.9em; color: var(--card-text);';
    refreshBtn.id = 'tasks-refresh-btn';
        refreshBtn.className = 'themed-btn tasks-refresh-btn';
        // accessible SVG icon (uses currentColor so themed color applies)
        refreshBtn.setAttribute('aria-label', 'Refresh tasks');
        refreshBtn.setAttribute('title', 'Refresh tasks');
        refreshBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.9-4H6.08A7.95 7.95 0 0 0 12 20c4.42 0 8-3.58 8-8 0-1.85-.63-3.55-1.81-4.9z"/></svg>';
        refreshBtn.addEventListener('click', function() { fetchTasks(); });
        // place inside tasks card
        var tasksCard = document.getElementById('tasksCard');
        if (tasksCard) {
            tasksCard.style.position = 'relative';
            tasksCard.appendChild(refreshBtn);
        }
    }
    // initial fetch if endpoint present
    setTimeout(function() { 
        try { 
            if (localStorage.getItem('cosy-tasks-endpoint')) {
                // Auto-load default list if set
                var defaultList = localStorage.getItem('cosy-default-tasks-list');
                if (defaultList && tasksListSelect) {
                    // Load lists first, then set default
                    loadTasklists();
                    setTimeout(function() {
                        if (tasksListSelect) {
                            tasksListSelect.value = defaultList;
                            localStorage.setItem('cosy-tasks-listid', defaultList);
                        }
                        fetchTasks();
                    }, 500);
                } else {
                    fetchTasks();
                }
            }
        } catch (e) {} 
    }, 400);

})();
function isiOSOlderThan11() {
    var ua = navigator.userAgent || '';
    var match = ua.match(/OS (\d+)_?(\d+)?/i);
    if (!/iP(hone|od|ad)/.test(ua) || !match) return false;
    var major = parseInt(match[1], 10);
    return major <= 10;
}

// If old iOS detected, wrap the two left cards into a left-column wrapper
if (isiOSOlderThan11()) {
    try {
        var main = document.querySelector('.main-layout');
        var clockCard = document.querySelector('.clock-card');
        var extraCard = document.querySelector('.extra-card');
        if (main && clockCard && extraCard) {
            var left = document.createElement('div');
            left.className = 'left-column';
            // move the cards into the wrapper (preserve order)
            main.insertBefore(left, clockCard);
            left.appendChild(clockCard);
            left.appendChild(extraCard);
        }
        // also reduce font-size slightly on very old devices to avoid wrapping
        document.body.className = document.body.className + ' ios-old';
    } catch (e) {
        // fail silently; layout will remain as-is
        console.log('iOS detection/wrap failed', e);
    }
}

// Side menu (hamburger) behavior
var menuBtn = document.getElementById('menuBtn');
var sideMenu = document.getElementById('sideMenu');
var menuOverlay = document.getElementById('menuOverlay');

// Greeting name control wiring
var greetingInput = document.getElementById('greetingName');
var placeholderGreeting = document.getElementById('placeholderGreeting');
function setGreetingName(name) {
    try { localStorage.setItem('cosy-greeting-name', name || ''); } catch (e) {}
    // update the time-based greeting immediately
    try { updateGreeting(); } catch (e) {}
}
// load saved name on startup
try {
    var savedName = localStorage.getItem('cosy-greeting-name');
    if (savedName) {
        if (greetingInput) greetingInput.value = savedName;
        try { updateGreeting(); } catch (e) {}
    }
} catch (e) {}
if (greetingInput) {
    greetingInput.addEventListener('input', function(e) {
        setGreetingName(e.target.value);
    });
}

function openMenu() {
    if (sideMenu) sideMenu.classList.add('open');
    if (menuOverlay) menuOverlay.classList.add('visible');
    if (sideMenu) sideMenu.setAttribute('aria-hidden', 'false');
}

function closeMenu() {
    if (sideMenu) sideMenu.classList.remove('open');
    if (menuOverlay) menuOverlay.classList.remove('visible');
    if (sideMenu) sideMenu.setAttribute('aria-hidden', 'true');
}

if (menuBtn) {
    menuBtn.addEventListener('click', function() {
        if (sideMenu && sideMenu.classList.contains('open')) closeMenu(); else openMenu();
    });
}
if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMenu);
}

var closeMenuBtn = document.getElementById('closeMenuBtn');
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);

// Re-use existing dark mode toggle but keep the button inside the menu
var darkBtn = document.getElementById('darkModeBtn');
var greenBtn = document.getElementById('greenModeBtn');
var navyBtn = document.getElementById('navyModeBtn');
var darkGreenBtn = document.getElementById('darkGreenModeBtn');
var yellowBtn = document.getElementById('yellowModeBtn');
var lightBlueBtn = document.getElementById('lightBlueModeBtn');
var redBtn = document.getElementById('redModeBtn');
var purpleBtn = document.getElementById('purpleModeBtn');
// Theme map: central place to define variable values per theme
var themeMap = {
    'default': {
    '--bg': '#d6a9cc', '--text': '#6d3b5a', '--card-bg': '#ffe4ee', '--card-text': '#a85c7a',
    '--accent': '#a85c7a', '--today-bg': '#f8d6e5', '--today-text': '#a85c7a', '--today-shadow': '0 2px 6px rgba(168, 92, 122, 0.18)',
    '--today-border': 'none',
    '--card-shadow': '0 8px 24px rgba(168,92,122,0.18)', '--card-shadow-strong': '0 12px 36px rgba(168,92,122,0.12)', '--card-drag-shadow': '0 18px 48px rgba(168,92,122,0.18)',
    '--btn-shadow': '0 2px 8px rgba(168,92,122,0.08)', '--active-btn-shadow': '0 6px 18px rgba(168,92,122,0.08)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.06)', '--drag-badge-shadow': '0 6px 18px rgba(168,92,122,0.12)',
    '--menu-bg': '#fff7fb', '--menu-text': '#6d3b5a', '--menu-shadow': '2px 0 24px rgba(0,0,0,0.12)', '--menu-btn-bg': 'rgba(255,255,255,0.9)', '--menu-btn-span': 'var(--card-text)', '--menu-border': 'rgba(0,0,0,0.06)', '--menu-overlay': 'rgba(0,0,0,0.28)'
    },
    'dark': {
    '--bg': '#2d2233', '--text': '#ffe4ee', '--card-bg': '#3a2a44', '--card-text': '#ffe4ee',
    '--accent': '#fbeff5', '--today-bg': '#2d2233', '--today-text': '#fbeff5', '--today-shadow': '0 2px 6px rgba(0,0,0,0.45)',
    '--card-shadow': '0 10px 32px rgba(0,0,0,0.6)', '--card-shadow-strong': '0 14px 44px rgba(0,0,0,0.55)', '--card-drag-shadow': '0 20px 56px rgba(0,0,0,0.6)',
    '--btn-shadow': '0 2px 8px rgba(0,0,0,0.45)', '--active-btn-shadow': '0 6px 18px rgba(0,0,0,0.5)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.4)', '--drag-badge-shadow': '0 6px 18px rgba(0,0,0,0.5)',
    '--menu-bg': '#2b202b', '--menu-text': '#ffe4ee', '--menu-shadow': '2px 0 24px rgba(0,0,0,0.6)', '--menu-btn-bg': 'rgba(48,36,48,0.9)', '--menu-btn-span': 'var(--card-text)', '--menu-border': 'rgba(255,255,255,0.06)', '--menu-overlay': 'rgba(0,0,0,0.55)'
    },
    'green': {
    '--bg': '#e0f7e9', '--text': '#2e6d4c', '--card-bg': '#c8f2d6', '--card-text': '#2e6d4c',
    '--accent': '#2e6d4c', '--today-bg': '#b2e9c7', '--today-text': '#1e4d34', '--today-shadow': '0 2px 6px rgba(46, 109, 76, 0.18)',
    '--card-shadow': '0 8px 24px rgba(46,109,76,0.12)', '--card-shadow-strong': '0 12px 36px rgba(46,109,76,0.10)', '--card-drag-shadow': '0 18px 48px rgba(46,109,76,0.14)',
    '--btn-shadow': '0 2px 8px rgba(46,109,76,0.08)', '--active-btn-shadow': '0 6px 18px rgba(46,109,76,0.08)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.06)', '--drag-badge-shadow': '0 6px 18px rgba(46,109,76,0.12)',
    '--menu-bg': '#e0f7e9', '--menu-text': '#2e6d4c', '--menu-shadow': '2px 0 24px rgba(46,109,76,0.12)', '--menu-btn-bg': 'rgba(200,242,214,0.9)', '--menu-btn-span': '#2e6d4c', '--menu-border': 'rgba(46,109,76,0.12)', '--menu-overlay': 'rgba(46,109,76,0.18)'
    },
    'navy': {
    '--bg': '#1a2233', '--text': '#cce3ff', '--card-bg': '#223a5a', '--card-text': '#cce3ff',
    '--accent': '#cce3ff', '--today-bg': '#1a2233', '--today-text': '#cce3ff', '--today-shadow': '0 2px 6px rgba(26,34,51,0.45)',
    '--card-shadow': '0 10px 30px rgba(26,34,51,0.45)', '--card-shadow-strong': '0 14px 44px rgba(26,34,51,0.42)', '--card-drag-shadow': '0 20px 56px rgba(26,34,51,0.5)',
    '--btn-shadow': '0 2px 8px rgba(26,34,51,0.28)', '--active-btn-shadow': '0 6px 18px rgba(26,34,51,0.36)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.28)', '--drag-badge-shadow': '0 6px 18px rgba(26,34,51,0.32)',
    '--menu-bg': '#223a5a', '--menu-text': '#cce3ff', '--menu-shadow': '2px 0 24px rgba(26,34,51,0.6)', '--menu-btn-bg': 'rgba(34,58,90,0.9)', '--menu-btn-span': '#cce3ff', '--menu-border': 'rgba(255,255,255,0.04)', '--menu-overlay': 'rgba(26,34,51,0.55)'
    },
    'dark-green': {
    '--bg': '#122819', '--text': '#dff6e6', '--card-bg': '#163826', '--card-text': '#dff6e6',
    '--accent': '#dff6e6', '--today-bg': '#163826', '--today-text': '#e6f9ee', '--today-shadow': '0 2px 6px rgba(0,0,0,0.45)',
    '--card-shadow': '0 10px 32px rgba(0,0,0,0.5)', '--card-shadow-strong': '0 14px 44px rgba(0,0,0,0.48)', '--card-drag-shadow': '0 20px 56px rgba(0,0,0,0.5)',
    '--btn-shadow': '0 2px 8px rgba(0,0,0,0.45)', '--active-btn-shadow': '0 6px 18px rgba(0,0,0,0.5)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.4)', '--drag-badge-shadow': '0 6px 18px rgba(0,0,0,0.45)',
    '--menu-bg': '#122819', '--menu-text': '#dff6e6', '--menu-shadow': '2px 0 24px rgba(0,0,0,0.6)', '--menu-btn-bg': 'rgba(20,50,40,0.9)', '--menu-btn-span': '#dff6e6', '--menu-border': 'rgba(255,255,255,0.04)', '--menu-overlay': 'rgba(0,0,0,0.6)'
    },
    'yellow': {
        '--bg': '#fff7e0', '--text': '#6a4a00', '--card-bg': '#fff4cc', '--card-text': '#6a4a00',
        '--accent': '#6a4a00', '--today-bg': '#fff1b8', '--today-text': '#6a4a00', '--today-shadow': '0 2px 6px rgba(106,74,0,0.18)',
        '--card-shadow': '0 8px 24px rgba(106,74,0,0.12)', '--card-shadow-strong': '0 12px 36px rgba(106,74,0,0.10)', '--card-drag-shadow': '0 18px 48px rgba(106,74,0,0.14)',
        '--btn-shadow': '0 2px 8px rgba(106,74,0,0.08)', '--active-btn-shadow': '0 6px 18px rgba(106,74,0,0.08)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.06)', '--drag-badge-shadow': '0 6px 18px rgba(106,74,0,0.12)',
        '--menu-bg': '#fff7e0', '--menu-text': '#6a4a00', '--menu-shadow': '2px 0 24px rgba(106,74,0,0.12)', '--menu-btn-bg': 'rgba(255,247,235,0.9)', '--menu-btn-span': '#6a4a00', '--menu-border': 'rgba(106,74,0,0.06)', '--menu-overlay': 'rgba(106,74,0,0.12)'
    },
    'light-blue': {
        '--bg': '#eaf6ff', '--text': '#0b4f6c', '--card-bg': '#dff3ff', '--card-text': '#0b4f6c',
        '--accent': '#0b4f6c', '--today-bg': '#cfeeff', '--today-text': '#083b51', '--today-shadow': '0 2px 6px rgba(11,79,108,0.18)',
        '--card-shadow': '0 8px 24px rgba(11,79,108,0.12)', '--card-shadow-strong': '0 12px 36px rgba(11,79,108,0.10)', '--card-drag-shadow': '0 18px 48px rgba(11,79,108,0.14)',
        '--btn-shadow': '0 2px 8px rgba(11,79,108,0.08)', '--active-btn-shadow': '0 6px 18px rgba(11,79,108,0.08)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.06)', '--drag-badge-shadow': '0 6px 18px rgba(11,79,108,0.12)',
        '--menu-bg': '#eaf6ff', '--menu-text': '#0b4f6c', '--menu-shadow': '2px 0 24px rgba(11,79,108,0.08)', '--menu-btn-bg': 'rgba(223,243,255,0.9)', '--menu-btn-span': '#0b4f6c', '--menu-border': 'rgba(11,79,108,0.06)', '--menu-overlay': 'rgba(11,79,108,0.08)'
    },
    'red': {
        '--bg': '#ffecec', '--text': '#7a0a0a', '--card-bg': '#ffd6d6', '--card-text': '#7a0a0a',
        '--accent': '#7a0a0a', '--today-bg': '#ffcccc', '--today-text': '#7a0a0a', '--today-shadow': '0 2px 6px rgba(122,10,10,0.18)',
        '--card-shadow': '0 8px 24px rgba(122,10,10,0.12)', '--card-shadow-strong': '0 12px 36px rgba(122,10,10,0.10)', '--card-drag-shadow': '0 18px 48px rgba(122,10,10,0.14)',
        '--btn-shadow': '0 2px 8px rgba(122,10,10,0.08)', '--active-btn-shadow': '0 6px 18px rgba(122,10,10,0.08)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.06)', '--drag-badge-shadow': '0 6px 18px rgba(122,10,10,0.12)',
        '--menu-bg': '#ffecec', '--menu-text': '#7a0a0a', '--menu-shadow': '2px 0 24px rgba(122,10,10,0.08)', '--menu-btn-bg': 'rgba(255,236,236,0.9)', '--menu-btn-span': '#7a0a0a', '--menu-border': 'rgba(122,10,10,0.06)', '--menu-overlay': 'rgba(122,10,10,0.08)'
    },
    'purple': {
        '--bg': '#f3e8ff', '--text': '#4b1866', '--card-bg': '#ecd8ff', '--card-text': '#4b1866',
        '--accent': '#4b1866', '--today-bg': '#e6d0ff', '--today-text': '#3a0f4f', '--today-shadow': '0 2px 6px rgba(75,24,102,0.18)',
        '--card-shadow': '0 8px 24px rgba(75,24,102,0.12)', '--card-shadow-strong': '0 12px 36px rgba(75,24,102,0.10)', '--card-drag-shadow': '0 18px 48px rgba(75,24,102,0.14)',
        '--btn-shadow': '0 2px 8px rgba(75,24,102,0.08)', '--active-btn-shadow': '0 6px 18px rgba(75,24,102,0.08)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.06)', '--drag-badge-shadow': '0 6px 18px rgba(75,24,102,0.12)',
        '--menu-bg': '#f3e8ff', '--menu-text': '#4b1866', '--menu-shadow': '2px 0 24px rgba(75,24,102,0.08)', '--menu-btn-bg': 'rgba(243,232,255,0.9)', '--menu-btn-span': '#4b1866', '--menu-border': 'rgba(75,24,102,0.06)', '--menu-overlay': 'rgba(75,24,102,0.08)'
    },
    'night': {
        '--bg': '#000000', '--text': '#ff0000', '--card-bg': '#000000', '--card-text': '#ff0000',
        '--accent': '#ff0000', '--today-bg': '#000000', '--today-text': '#ff0000', '--today-shadow': 'none',
        '--today-border': '2px solid #ff0000', /* Added red border for today's date in night mode */
        '--card-shadow': 'none', '--card-shadow-strong': 'none', '--card-drag-shadow': 'none',
        '--btn-shadow': 'none', '--active-btn-shadow': 'none', '--hover-shadow': 'none', '--drag-badge-shadow': 'none',
        '--menu-bg': '#000000', '--menu-text': '#ff0000', '--menu-shadow': 'none', '--menu-btn-bg': '#000000', '--menu-btn-span': '#ff0000', '--menu-border': '#330000', '--menu-overlay': 'rgba(0,0,0,0.96)'
    }
    ,
    'ambient': {
        '--bg': '#000000', '--text': '#ffffff', '--card-bg': 'rgba(255,255,255,0.06)', '--card-text': '#ffffff',
        '--accent': '#ffffff', '--today-bg': 'rgba(255,255,255,0.06)', '--today-text': '#ffffff', '--today-shadow': '0 2px 6px rgba(0,0,0,0.2)',
        '--today-border': 'none',
        '--card-shadow': '0 8px 24px rgba(0,0,0,0.18)', '--card-shadow-strong': '0 12px 36px rgba(0,0,0,0.12)', '--card-drag-shadow': '0 18px 48px rgba(0,0,0,0.18)',
        '--btn-shadow': '0 2px 8px rgba(0,0,0,0.08)', '--active-btn-shadow': '0 6px 18px rgba(0,0,0,0.08)', '--hover-shadow': '0 4px 12px rgba(0,0,0,0.06)', '--drag-badge-shadow': '0 6px 18px rgba(0,0,0,0.12)',
        '--menu-bg': 'rgba(255,255,255,0.04)', '--menu-text': '#ffffff', '--menu-shadow': '2px 0 24px rgba(0,0,0,0.12)', '--menu-btn-bg': 'rgba(255,255,255,0.06)', '--menu-btn-span': '#ffffff', '--menu-border': 'rgba(255,255,255,0.06)', '--menu-overlay': 'rgba(0,0,0,0.6)'
    }
};

// Ambient images loader + chooser (ES5 XHR for compatibility)
var ambientImages = [];
var ambientLoaded = false;
function loadAmbientImages(cb) {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ambient-images/images.json', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                try { ambientImages = JSON.parse(xhr.responseText) || []; } catch (e) { ambientImages = []; }
            } else {
                ambientImages = [];
            }
            ambientLoaded = true;
            try { if (typeof cb === 'function') cb(); } catch (e) {}
        };
        xhr.send(null);
    } catch (e) {
        ambientImages = [];
        ambientLoaded = true;
        try { if (typeof cb === 'function') cb(); } catch (err) {}
    }
}

// Add after your chooseAmbientBackground() function definition, replacing the old function

function chooseAmbientBackground() {
    var root = document.documentElement;
    if (!ambientLoaded) { loadAmbientImages(function(){ chooseAmbientBackground(); }); return; }
    if (!ambientImages || ambientImages.length === 0) {
        try { root.style.removeProperty('--ambient-bg-image'); } catch (e) {}
        document.body.classList.remove('ambient-darken');
        document.body.style.backgroundImage = '';
        return;
    }
    var idx = Math.floor(Math.random() * ambientImages.length);
    var fname = ambientImages[idx];
    var url = '/ambient-images/' + fname;
    // Set CSS variable for newer browsers
    try { root.style.setProperty('--ambient-bg-image', 'url("' + url + '")'); } catch (e) {}
    // Set the body background directly for iOS 10 and older (and all browsers for reliability)
    document.body.style.backgroundImage = 'url("' + url + '")';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';

    // --- Brightness detection ---
    var img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
            var sw = 80, sh = 80;
            var sx = Math.max(0, Math.floor(canvas.width/2 - sw/2));
            var sy = Math.max(0, Math.floor(canvas.height/2 - sh/2));
            var imageData = ctx.getImageData(sx, sy, sw, sh).data;
            var len = imageData.length;
            var total = 0, count = 0;
            for (var i = 0; i < len; i += 4) {
                var r = imageData[i], g = imageData[i+1], b = imageData[i+2];
                var brightness = 0.299*r + 0.587*g + 0.114*b;
                total += brightness;
                count++;
            }
            var avg = total / count;
            if (avg > 100) {
                document.body.classList.add('ambient-darken');
            } else {
                document.body.classList.remove('ambient-darken');
            }
        } catch (e) { document.body.classList.remove('ambient-darken'); }
    };
    img.onerror = function() {
        document.body.classList.remove('ambient-darken');
    };
}

function applyTheme(name, persist) {
    try {
        var map = themeMap[name] || themeMap['default'];
        var root = document.documentElement;
        for (var k in map) {
            if (map.hasOwnProperty(k)) root.style.setProperty(k, map[k]);
        }
    // sync body class for backwards compatibility
    document.body.classList.remove('dark-mode','green-mode','navy-mode','dark-green-mode','night-mode','ambient-mode');
        if (name === 'dark') document.body.classList.add('dark-mode');
        if (name === 'green') document.body.classList.add('green-mode');
        if (name === 'navy') document.body.classList.add('navy-mode');
        if (name === 'dark-green') document.body.classList.add('dark-green-mode');
        if (name === 'night') document.body.classList.add('night-mode');
    if (name === 'ambient') document.body.classList.add('ambient-mode');
        // persist
        if (persist) {
            try { localStorage.setItem('cosy-theme', name === 'default' ? '' : name); } catch(e){}
            try { localStorage.setItem('cosy-theme-night', name === 'night' ? '1' : '0'); } catch(e){}
        }
    // sync active button visuals
        try { if (darkBtn) { darkBtn.classList.toggle('active', name === 'dark'); darkBtn.innerHTML = (name === 'dark' ? 'Light Mode' : 'Dark Mode'); darkBtn.setAttribute('aria-pressed', name === 'dark' ? 'true' : 'false'); } } catch(e){}
        try { if (greenBtn) { greenBtn.classList.toggle('active', name === 'green'); greenBtn.setAttribute('aria-pressed', name === 'green' ? 'true' : 'false'); } } catch(e){}
        try { if (navyBtn) { navyBtn.classList.toggle('active', name === 'navy'); navyBtn.setAttribute('aria-pressed', name === 'navy' ? 'true' : 'false'); } } catch(e){}
        try { if (darkGreenBtn) { darkGreenBtn.classList.toggle('active', name === 'dark-green'); darkGreenBtn.setAttribute('aria-pressed', name === 'dark-green' ? 'true' : 'false'); } } catch(e){}
        try { var nightBtn = document.getElementById('nightModeBtn'); if (nightBtn) { nightBtn.classList.toggle('active', name === 'night'); nightBtn.setAttribute('aria-pressed', name === 'night' ? 'true' : 'false'); } } catch(e){}
    try { if (yellowBtn) { yellowBtn.classList.toggle('active', name === 'yellow'); yellowBtn.setAttribute('aria-pressed', name === 'yellow' ? 'true' : 'false'); } } catch(e){}
    try { if (lightBlueBtn) { lightBlueBtn.classList.toggle('active', name === 'light-blue'); lightBlueBtn.setAttribute('aria-pressed', name === 'light-blue' ? 'true' : 'false'); } } catch(e){}
    try { if (redBtn) { redBtn.classList.toggle('active', name === 'red'); redBtn.setAttribute('aria-pressed', name === 'red' ? 'true' : 'false'); } } catch(e){}
    try { if (purpleBtn) { purpleBtn.classList.toggle('active', name === 'purple'); purpleBtn.setAttribute('aria-pressed', name === 'purple' ? 'true' : 'false'); } } catch(e){}
    try { var tasksRefresh = document.getElementById('tasks-refresh-btn'); if (tasksRefresh) { tasksRefresh.classList.toggle('active', false); tasksRefresh.setAttribute('aria-pressed', 'false'); } } catch(e){}
    } catch (e) { console.log('applyTheme failed', e); }
    // handle ambient background selection and cleanup
    try {
        if (name === 'ambient') {
            chooseAmbientBackground();
        } else {
            // remove any ambient background var when not in ambient mode
            try { document.documentElement.style.removeProperty('--ambient-bg-image'); } catch (e) {}
        }
    } catch (e) {}
}
if (darkBtn) {
    darkBtn.onclick = function() {
        var isCurrentlyDark = document.body.classList.contains('dark-mode');
        applyTheme(isCurrentlyDark ? 'default' : 'dark', true);
    };
}


if (greenBtn) {
    greenBtn.onclick = function() {
        applyTheme('green', true);
    };
}

if (navyBtn) {
    navyBtn.onclick = function() {
    // Use applyTheme to set CSS variables and persist selection
    try { applyTheme('navy', true); } catch (e) { console.log('navy theme failed', e); }
    };
}
if (darkGreenBtn) {
    darkGreenBtn.onclick = function() {
    // Use applyTheme to set CSS variables and persist selection
    try { applyTheme('dark-green', true); } catch (e) { console.log('dark-green theme failed', e); }
    };
}
if (yellowBtn) {
    yellowBtn.onclick = function() { try { applyTheme('yellow', true); } catch (e) { console.log('yellow theme failed', e); } };
}
if (lightBlueBtn) {
    lightBlueBtn.onclick = function() { try { applyTheme('light-blue', true); } catch (e) { console.log('light-blue theme failed', e); } };
}
if (redBtn) {
    redBtn.onclick = function() { try { applyTheme('red', true); } catch (e) { console.log('red theme failed', e); } };
}
if (purpleBtn) {
    purpleBtn.onclick = function() { try { applyTheme('purple', true); } catch (e) { console.log('purple theme failed', e); } };
}
// Ambient mode button wiring (optional if button exists in DOM)
try {
    var ambientBtn = document.getElementById('ambientModeBtn');
    if (ambientBtn) {
        ambientBtn.onclick = function() { try { applyTheme('ambient', true); } catch (e) { console.log('ambient theme failed', e); } };
    }
} catch (e) {}
// Initialize theme from localStorage and sync button state (use variable-driven themes)
(function() {
    try {
        var stored = null;
        try { stored = localStorage.getItem('cosy-theme'); } catch (e) { stored = null; }
        var night = false;
        try { night = localStorage.getItem('cosy-theme-night') === '1'; } catch (e) { night = false; }
        if (night) {
            applyTheme('night', false);
        } else if (stored && themeMap.hasOwnProperty(stored)) {
            applyTheme(stored, false);
        } else {
            applyTheme('default', false);
        }
    } catch (e) { /* ignore storage errors */ }
})();
// Reset theme button handler
(function() {
    var resetThemeBtn = document.getElementById('resetThemeBtn');
    if (!resetThemeBtn) return;
    resetThemeBtn.addEventListener('click', function() {
        try {
            // Use applyTheme to reset variables and persist default
            applyTheme('default', true);
        } catch (e) { /* fall back to clearing classes */
            try { localStorage.removeItem('cosy-theme'); } catch (err) {}
            try { localStorage.setItem('cosy-theme-night','0'); } catch (err) {}
            var body = document.body;
            body.classList.remove('dark-mode','green-mode','navy-mode','dark-green-mode','night-mode');
        }
    });
})();
// Rearrange mode: simple pick-and-swap for cards
(function() {
    var rearrangeBtn = document.getElementById('rearrangeBtn');
    var resetBtn = document.getElementById('resetLayoutBtn');
    var instructions = document.getElementById('rearrangeInstructions');
    var dragTimer = null;
    var longPressMs = 250; // hold time to start drag
    var dragging = null;
    var placeholder = null;

    function saveOrder() {
        try {
            var order = [];
            // left column items
            var left = document.querySelector('.left-column');
            if (left) {
                var nodes = left.querySelectorAll('.card');
                for (var i = 0; i < nodes.length; i++) {
                    var id = nodes[i].getAttribute('data-id');
                    if (id) order.push(id);
                }
            }
            // calendar
            var cal = document.querySelector('.calendar-card');
            if (cal) {
                var cid = cal.getAttribute('data-id');
                if (cid) order.push(cid);
            }
            localStorage.setItem('cosy-order', JSON.stringify(order));
        } catch (e) { }
    }

    function loadOrder() {
        try {
            var saved = localStorage.getItem('cosy-order');
            if (!saved) return;
            var order = JSON.parse(saved);
            if (!order || !order.length) return;
            // map current nodes by data-id
            var map = {};
            var all = document.querySelectorAll('.card');
            for (var i = 0; i < all.length; i++) {
                var id = all[i].getAttribute('data-id');
                if (id) map[id] = all[i];
            }
            // build new left column for non-calendar cards
            var left = document.querySelector('.left-column');
            var main = document.querySelector('.main-layout');
            var cal = document.querySelector('.calendar-card');
            if (!left) return;
            for (var j = 0; j < order.length; j++) {
                var id = order[j];
                if (!map[id]) continue;
                // keep the calendar separate — it should remain in the main area
                if (id === 'calendar-card') continue;
                left.appendChild(map[id]);
            }
            // ensure calendar is a child of the main layout (not nested into left)
            if (cal && main && cal.parentNode !== main) {
                main.appendChild(cal);
            }
        } catch (e) { }
    }

    function createPlaceholder(height) {
        var ph = document.createElement('div');
        ph.className = 'card placeholder';
        ph.style.height = (height || 80) + 'px';
        ph.style.boxSizing = 'border-box';
        return ph;
    }

    function onLongPressStart(e) {
        var target = e.target;
        while (target && target !== document.body && !target.classList.contains('card')) target = target.parentNode;
        if (!target || !target.classList.contains('card')) return;
        // don't start if already in dragging
        if (dragging) return;
        dragTimer = setTimeout(function() {
            startDrag(target, e);
        }, longPressMs);
    }

    function onLongPressCancel(/*e*/) {
        if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; }
    }

    function startDrag(card, e) {
        dragging = card;
        card.classList.add('dragging');
        var rect = card.getBoundingClientRect();
        placeholder = createPlaceholder(rect.height);
        card.parentNode.insertBefore(placeholder, card);
        // move card to body to follow pointer
        document.body.appendChild(card);
        card.style.position = 'absolute';
        card.style.left = rect.left + 'px';
        card.style.top = rect.top + 'px';
        card.style.width = rect.width + 'px';
        card.style.zIndex = 2000;
        moveAt(e);
        // attach move/end handlers
        if (e.type.indexOf('touch') === 0) {
            document.addEventListener('touchmove', onDragMove, {passive:false});
            document.addEventListener('touchend', onDragEnd);
        } else {
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
        }
        // create a drag badge to show position
        var db = document.getElementById('dragBadge');
        if (!db) {
            db = document.createElement('div');
            db.id = 'dragBadge';
            db.className = 'drag-badge';
            document.body.appendChild(db);
        }
        db.innerHTML = 'Moving...';
    }

    function getEventPoint(e) {
        if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }

    function moveAt(e) {
        if (!dragging) return;
        var p = getEventPoint(e);
        dragging.style.left = (p.x - dragging.offsetWidth/2) + 'px';
        dragging.style.top = (p.y - dragging.offsetHeight/2) + 'px';
        // position the drag badge
        var badge = document.getElementById('dragBadge');
        if (badge) {
            badge.style.left = p.x + 'px';
            badge.style.top = p.y + 'px';
        }
    }

    function onDragMove(e) {
        e.preventDefault && e.preventDefault();
        moveAt(e);
        // find drop target (card or left-column)
        var p = getEventPoint(e);
        var elem = document.elementFromPoint(p.x, p.y);
        // find card or left-column
        while (elem && elem !== document.body && !elem.classList.contains('card') && !elem.classList.contains('left-column')) elem = elem.parentNode;
        if (!elem) return;
        var left = document.querySelector('.left-column');
        if (elem.classList.contains('left-column')) {
            // append to end
            if (placeholder.parentNode !== left) left.appendChild(placeholder);
            return;
        }
        // if over a card, insert before/after depending on pointer Y
        var targetCard = elem.classList.contains('card') ? elem : null;
        if (targetCard && targetCard !== dragging) {
            var targetRect = targetCard.getBoundingClientRect();
            var midY = targetRect.top + targetRect.height/2;
            if (p.y < midY) {
                targetCard.parentNode.insertBefore(placeholder, targetCard);
            } else {
                if (targetCard.nextSibling) targetCard.parentNode.insertBefore(placeholder, targetCard.nextSibling); else targetCard.parentNode.appendChild(placeholder);
            }
        }
    }

    function onDragEnd(/*e*/) {
        // remove move/end handlers
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        if (!dragging) return;
        // put dragging back into DOM at placeholder position
        dragging.style.position = '';
        dragging.style.left = '';
        dragging.style.top = '';
        dragging.style.width = '';
        dragging.style.zIndex = '';
        dragging.classList.remove('dragging');
        if (placeholder && placeholder.parentNode) placeholder.parentNode.insertBefore(dragging, placeholder);
        if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
        dragging = null;
    var db = document.getElementById('dragBadge');
    if (db && db.parentNode) db.parentNode.removeChild(db);
        saveOrder();
    }

    function enableDragHandlers() {
        var cards = document.querySelectorAll('.card');
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            c.addEventListener('touchstart', onLongPressStart);
            c.addEventListener('mousedown', onLongPressStart);
            c.addEventListener('touchend', onLongPressCancel);
            c.addEventListener('mouseleave', onLongPressCancel);
            c.addEventListener('touchmove', onLongPressCancel);
        }
    }

    function disableDragHandlers() {
        var cards = document.querySelectorAll('.card');
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            c.removeEventListener('touchstart', onLongPressStart);
            c.removeEventListener('mousedown', onLongPressStart);
            c.removeEventListener('touchend', onLongPressCancel);
            c.removeEventListener('mouseleave', onLongPressCancel);
            c.removeEventListener('touchmove', onLongPressCancel);
        }
    }

    function enterRearrange() {
        document.body.classList.add('rearrange-active');
        if (rearrangeBtn) { rearrangeBtn.classList.add('active'); rearrangeBtn.innerText = 'Exit Rearrange Mode'; }
        if (instructions) instructions.style.display = 'block';
        enableDragHandlers();
    }

    function exitRearrange() {
        document.body.classList.remove('rearrange-active');
        if (rearrangeBtn) { rearrangeBtn.classList.remove('active'); rearrangeBtn.innerText = 'Enter Rearrange Mode'; }
        if (instructions) instructions.style.display = 'none';
        disableDragHandlers();
        // clear any active timers/placeholders
        if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; }
        if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
        placeholder = null;
        if (dragging) {
            dragging.classList.remove('dragging');
            dragging = null;
        }
        saveOrder();
    }

    if (rearrangeBtn) {
        rearrangeBtn.addEventListener('click', function() {
            if (document.body.classList.contains('rearrange-active')) exitRearrange(); else enterRearrange();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            // Clear saved theme keys
            try { localStorage.removeItem('cosy-theme'); } catch (e) {}
            try { localStorage.removeItem('cosy-theme-night'); } catch (e) {}

            // Remove theme classes from body
            var body = document.body;
            body.classList.remove('dark-mode', 'green-mode', 'navy-mode', 'dark-green-mode', 'night-mode');

            // Reset visual state of theme buttons
            try { if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.innerHTML = 'Dark Mode'; darkBtn.setAttribute('aria-pressed','false'); } } catch(e){}
            try { if (greenBtn) { greenBtn.classList.remove('active'); greenBtn.setAttribute('aria-pressed','false'); } } catch(e){}
            try { if (navyBtn) { navyBtn.classList.remove('active'); navyBtn.setAttribute('aria-pressed','false'); } } catch(e){}
            try { if (darkGreenBtn) { darkGreenBtn.classList.remove('active'); darkGreenBtn.setAttribute('aria-pressed','false'); } } catch(e){}
            try { if (nightBtn) { nightBtn.classList.remove('active'); nightBtn.setAttribute('aria-pressed','false'); } } catch(e){}

            // Update any themed controls (visual state handled by CSS variables and applyTheme)

            // Clear saved layout order
            try { localStorage.removeItem('cosy-order'); } catch (e) {}
        });
    }

    // initialize
    loadOrder();
})();
// add Night Mode wiring
var nightBtn = document.getElementById('nightModeBtn');
if (nightBtn) {
    nightBtn.onclick = function() {
        try {
            var isNight = document.body.classList.contains('night-mode');
            if (isNight) {
                // turn off night
                applyTheme('default', true);
            } else {
                applyTheme('night', true);
            }
        } catch (e) {}
    };
}

// Initialize night mode from localStorage and sync button state
(function() {
    try {
        var night = false;
        try { night = localStorage.getItem('cosy-theme-night') === '1'; } catch (e) { night = false; }
        if (night) {
            // apply night theme variables (do not persist again)
            applyTheme('night', false);
            if (nightBtn) nightBtn.classList.add('active');
        } else {
            if (nightBtn) nightBtn.classList.remove('active');
        }
    } catch (e) {}
})();

// Update ambient background every 5 minutes if in ambient mode
setInterval(function(){
  if(document.body.classList.contains('ambient-mode')) {
    chooseAmbientBackground();
  }
}, 300000);

// Weather card expand/collapse logic
(function() {
    var weatherCard = document.getElementById('weatherCard');
    var weatherDetails = document.getElementById('weatherDetails');
    var closeBtn = document.getElementById('closeWeatherDetailsBtn');
    var leftColumn = document.querySelector('.left-column');
    var rightColumn = document.querySelector('.right-column');
    var mainLayout = document.querySelector('.main-layout');

    function hideOtherCards() {
        var cards = document.querySelectorAll('.card');
        cards.forEach(function(card) {
            if (card !== weatherCard) card.classList.add('hide-on-weather-expand');
        });
    }
    function showOtherCards() {
        var cards = document.querySelectorAll('.card');
        cards.forEach(function(card) {
            card.classList.remove('hide-on-weather-expand');
        });
    }

    function renderWeatherDetails(data) {
        clientLog('info', 'renderWeatherDetails called with data:', data);
        try {
            // Use emoji for icon
            var emoji = (typeof data.emoji !== 'undefined') ? data.emoji : '☀️';
            var temp = (typeof data.temp !== 'undefined') ? data.temp : '--';
            var summary = (typeof data.summary !== 'undefined') ? data.summary : '';
            var high = (typeof data.high !== 'undefined') ? data.high : '--';
            var low = (typeof data.low !== 'undefined') ? data.low : '--';
            // Get location from settings panel, fallback to data.location
            var locInput = document.getElementById('weatherLocation');
            var location = (locInput && locInput.value) ? locInput.value : (typeof data.location !== 'undefined' ? data.location : '');
            var hourly = Array.isArray(data.hourly) ? data.hourly : [];
            var daily = Array.isArray(data.daily) ? data.daily : [];

            var leftHtml = '<div class="weather-details-left">';
            leftHtml += '<div class="weather-details-icon" style="font-size:4em;">' + emoji + '</div>';
            leftHtml += '<div class="weather-details-temp">' + (temp !== '--' ? temp + '°' : '--') + '</div>';
            leftHtml += '<div class="weather-details-summary">' + (summary || '') + '</div>';
            leftHtml += '</div>';

            var rightHtml = '<div class="weather-details-right">';
            rightHtml += '<div class="weather-details-location">' + location + '</div>';
            rightHtml += '<div class="weather-details-highlow">High: ' + (high !== '--' ? high + '°' : '--') + ' / Low: ' + (low !== '--' ? low + '°' : '--') + '</div>';
            
            // Add weather conditions with feels like and rain chance
            var humidity = (typeof data.humidity !== 'undefined') ? data.humidity : 'N/A';
            var windSpeed = (typeof data.windSpeed !== 'undefined') ? data.windSpeed : 'N/A';
            var feelsLike = (typeof data.feelsLike !== 'undefined') ? data.feelsLike : 'N/A';
            var rainChance = (typeof data.rainChance !== 'undefined') ? data.rainChance : 'N/A';
            rightHtml += '<div class="weather-details-conditions">Feels like: ' + feelsLike + ' | Rain: ' + rainChance + '</div>';
            rightHtml += '<div class="weather-details-conditions">Humidity: ' + humidity + ' | Wind: ' + windSpeed + '</div>';
            
            rightHtml += '<div class="weather-details-section"><strong>Hourly Forecast</strong><br>';
            rightHtml += '<div class="weather-details-hourly-card">';
            if (hourly.length === 0) {
                rightHtml += '<div class="weather-hour-block">No hourly data</div>';
            } else {
                hourly.forEach(function(h) {
                    rightHtml += '<div class="weather-hour-block">';
                    rightHtml += '<div class="weather-hour-time">' + (h.time || '--') + '</div>';
                    rightHtml += '<div style="font-size:1.5em; margin:4px 0;">' + (h.icon || '🌤️') + '</div>';
                    rightHtml += '<div class="weather-hour-temp">' + (typeof h.temp !== 'undefined' ? h.temp + '°' : '--') + '</div>';
                    rightHtml += '</div>';
                });
            }
            rightHtml += '</div></div>';
            rightHtml += '<div class="weather-details-section weather-details-forecast-daily"><strong>10-Day Forecast</strong><br>';
            if (daily.length === 0) {
                rightHtml += 'No daily forecast data<br>';
            } else {
                daily.forEach(function(d) {
                    rightHtml += '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.1);">';
                    rightHtml += '<div style="flex:1;">' + (d.day || '--') + '</div>';
                    rightHtml += '<div style="flex:0 0 auto; margin:0 12px; font-size:1.2em;">' + (d.icon || '🌤️') + '</div>';
                    rightHtml += '<div style="flex:0 0 auto;">' + (typeof d.high !== 'undefined' ? d.high + '°' : '--') + ' / ' + (typeof d.low !== 'undefined' ? d.low + '°' : '--') + '</div>';
                    rightHtml += '</div>';
                });
            }
            rightHtml += '</div>';
            rightHtml += '</div>';

            weatherDetails.innerHTML = leftHtml + rightHtml;
            console.log('Weather details rendered successfully');
        } catch (e) {
            console.error('Error rendering weather details:', e);
            weatherDetails.innerHTML = '<div style="padding:20px;">Error loading weather data</div>';
        }
    }

function fetchDetailedWeather(cb) {
    clientLog('info', '=== fetchDetailedWeather called ===');
    var locInput = document.getElementById('weatherLocation');
    var location = (locInput && locInput.value) ? locInput.value.trim() : '';
    var saved = null;
    try { saved = localStorage.getItem('cosy-weather-location'); } catch (e) { saved = null; }
    if (!location && saved) location = saved;
    clientLog('info', 'Using location:', location);
    var status = document.getElementById('weatherStatus');

    // Simple XHR function for server proxy calls only
    function xhrGet(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var data = null;
                    try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
                    callback(null, data);
                } else {
                    callback('error', null);
                }
            }
        };
        xhr.onerror = function() {
            callback('error', null);
        };
        xhr.send();
    }

    function loadWeatherByCoords(lat, lon, locationLabel) {
        var proxyUrl = '/proxy/detailed-weather?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon);
        console.log('Making detailed weather request via server proxy:', proxyUrl);
        xhrGet(proxyUrl, function(err, weatherData) {
            console.log('Server proxy response - err:', err, 'data:', weatherData);
            var details = buildWeatherDetails(weatherData, locationLabel);
            console.log('Built weather details from server:', details);
            if (!details || details.summary === "Weather unavailable") {
                cb({ summary: "Weather unavailable" });
            } else {
                cb(details);
            }
        });
    }

    // Handle case where no location is provided - use geolocation
    if (!location) {
        console.log('No location provided, using geolocation');
        if (!navigator.geolocation) {
            console.log('Geolocation not available');
            cb({ summary: "Geolocation not available" });
            return;
        }
        navigator.geolocation.getCurrentPosition(function(pos) {
            console.log('Geolocation success:', pos.coords);
            loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude, 'Current Location');
        }, function(err) {
            console.log('Geolocation error:', err);
            cb({ summary: "Location denied" });
        }, { maximumAge: 10 * 60 * 1000, timeout: 10 * 1000 });
        return;
    }

    // Use server proxy for geocoding - no direct API calls
    var proxyGeoUrl = '/proxy/geocode?name=' + encodeURIComponent(location);
    console.log('Making geocode request via server proxy:', proxyGeoUrl);
    xhrGet(proxyGeoUrl, function(err, geoData) {
        console.log('Geocode server response - err:', err, 'data:', geoData);
        if (err || !geoData || !geoData.results || !geoData.results.length) {
            console.log('Geocode failed, location not found');
            cb({ summary: "Location not found" });
            return;
        }
        var r = geoData.results[0];
        console.log('Using geocoded location:', r);
        loadWeatherByCoords(r.latitude, r.longitude, r.name || location);
    });
}


    if (weatherCard) {
        console.log('Weather card found, adding click listener');
        weatherCard.addEventListener('click', function(e) {
            clientLog('info', 'Weather card CLICKED!', e);
            if (weatherCard.classList.contains('expanded')) {
                clientLog('info', 'Weather card already expanded, ignoring click');
                return;
            }
            clientLog('info', 'Weather card clicked, expanding...');
            weatherCard.classList.add('expanded');
            hideOtherCards();
            weatherDetails.style.display = 'flex';
            closeBtn.style.display = 'block';
            
            // Show loading state immediately
            clientLog('info', 'Showing loading state...');
            renderWeatherDetails({
                emoji: '⏳',
                temp: '--',
                summary: 'Loading...',
                high: '--',
                low: '--',
                location: 'Loading location...',
                hourly: [],
                daily: []
            });
            
            clientLog('info', 'Calling fetchDetailedWeather...');
            // Use pre-loaded data if available, otherwise fetch
            if (window.weatherData) {
                clientLog('info', 'Using pre-loaded weather data:', window.weatherData);
                renderWeatherDetails(window.weatherData);
            } else {
                clientLog('info', 'No pre-loaded data, fetching now...');
                fetchDetailedWeather(function(data) {
                    clientLog('info', 'Weather data received in callback:', data);
                    // Always render, even if error
                    renderWeatherDetails(data);
                });
            }
        });
    } else {
        console.log('WARNING: weatherCard not found!');
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            weatherCard.classList.remove('expanded');
            weatherDetails.style.display = 'none';
            closeBtn.style.display = 'none';
            showOtherCards();
        });
    }
})();

// Fetch detailed weather data on page load
(function() {
    console.log('Starting weather data fetch on page load...');
    
    // Wait for DOM to be ready
    function initWeatherFetch() {
        console.log('DOM ready, checking fetchDetailedWeather function...');
        if (typeof fetchDetailedWeather === 'function') {
            console.log('fetchDetailedWeather function found, calling it...');
            fetchDetailedWeather(function(data) {
                console.log('Weather data loaded on startup:', data);
                // Store the data globally for the weather card
                window.weatherData = data;
            });
        } else {
            console.error('fetchDetailedWeather function not found!');
        }
    }
    
    // Try immediately, then with delays as fallback
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWeatherFetch);
    } else {
        // DOM already loaded
        setTimeout(initWeatherFetch, 100);
    }
})();

// --- WEATHER DATA SHAPER (global scope!) ---
function buildWeatherDetails(weatherData, locationName) {
    clientLog('info', 'Building weather details - SIMPLIFIED VERSION');
    clientLog('info', 'Input weatherData:', weatherData);
    clientLog('info', 'Input locationName:', locationName);
    
    if (!weatherData || !weatherData.current_weather) {
        clientLog('warn', 'No weather data or current_weather missing');
        return { summary: "Weather unavailable" };
    }
    
    var cw = weatherData.current_weather;
    var temp = Math.round(cw.temperature);
    var weatherCode = cw.weathercode || 0;
    clientLog('info', 'Extracted current temp:', temp);
    clientLog('info', 'Weather code:', weatherCode);
    
    // Use global weather mapping functions with current time
    var currentTime = weatherData.current_weather.time || new Date().toISOString();
    var weatherIcon = weatherIconFromCode(weatherCode, currentTime);
    var weatherText = weatherTextFromCode(weatherCode, currentTime);
    clientLog('info', 'Weather icon/text:', {icon: weatherIcon, text: weatherText});
    
    // Extract high/low from daily data
    var high = '--', low = '--';
    if (weatherData.daily && weatherData.daily.temperature_2m_max && weatherData.daily.temperature_2m_min) {
        high = Math.round(weatherData.daily.temperature_2m_max[0]);
        low = Math.round(weatherData.daily.temperature_2m_min[0]);
        clientLog('info', 'Extracted high/low:', {high: high, low: low});
    }
    
    // Extract humidity and wind
    var humidity = 'N/A', windSpeed = 'N/A', feelsLike = 'N/A', rainChance = 'N/A';
    if (weatherData.hourly && weatherData.hourly.relative_humidity_2m && weatherData.hourly.relative_humidity_2m.length > 0) {
        humidity = weatherData.hourly.relative_humidity_2m[0] + '%';
        clientLog('info', 'Extracted humidity:', humidity);
    }
    if (weatherData.hourly && weatherData.hourly.wind_speed_10m && weatherData.hourly.wind_speed_10m.length > 0) {
        windSpeed = Math.round(weatherData.hourly.wind_speed_10m[0]) + ' km/h';
        clientLog('info', 'Extracted wind speed:', windSpeed);
    }
    if (weatherData.hourly && weatherData.hourly.apparent_temperature && weatherData.hourly.apparent_temperature.length > 0) {
        feelsLike = Math.round(weatherData.hourly.apparent_temperature[0]) + '°';
        clientLog('info', 'Extracted feels like:', feelsLike);
    }
    if (weatherData.hourly && weatherData.hourly.precipitation_probability && weatherData.hourly.precipitation_probability.length > 0) {
        rainChance = weatherData.hourly.precipitation_probability[0] + '%';
        clientLog('info', 'Extracted rain chance:', rainChance);
    }

    // Extract hourly forecast data (next 12 hours from current time)
    var hourlyForecast = [];
    if (weatherData.hourly && weatherData.hourly.time && weatherData.hourly.temperature_2m && weatherData.hourly.weathercode) {
        var now = new Date();
        var currentTime = now.getTime();
        
        // Find the closest hour index to current time
        var currentHourIndex = 0;
        var minTimeDiff = Infinity;
        
        for (var k = 0; k < weatherData.hourly.time.length; k++) {
            var hourTime = new Date(weatherData.hourly.time[k]);
            var timeDiff = Math.abs(hourTime.getTime() - currentTime);
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                currentHourIndex = k;
            }
        }
        
        clientLog('info', 'Found current hour index:', currentHourIndex, 'for time:', weatherData.hourly.time[currentHourIndex]);
        
        // Get next 12 hours of data starting from current hour
        for (var i = currentHourIndex; i < Math.min(currentHourIndex + 12, weatherData.hourly.time.length); i++) {
            if (weatherData.hourly.temperature_2m[i] !== undefined && weatherData.hourly.weathercode[i] !== undefined) {
                var hourTime = new Date(weatherData.hourly.time[i]);
                var displayHour = hourTime.getHours();
                var timeStr;
                
                if (i === currentHourIndex) {
                    timeStr = 'Now';
                } else if (displayHour === 0) {
                    timeStr = '12 AM';
                } else if (displayHour < 12) {
                    timeStr = displayHour + ' AM';
                } else if (displayHour === 12) {
                    timeStr = '12 PM';
                } else {
                    timeStr = (displayHour - 12) + ' PM';
                }
                
                hourlyForecast.push({
                    time: timeStr,
                    temp: Math.round(weatherData.hourly.temperature_2m[i]),
                    icon: weatherIconFromCode(weatherData.hourly.weathercode[i], weatherData.hourly.time[i]),
                    summary: weatherTextFromCode(weatherData.hourly.weathercode[i], weatherData.hourly.time[i])
                });
            }
        }
        clientLog('info', 'Extracted hourly forecast:', hourlyForecast.length + ' hours starting from current time');
    }

    // Extract daily forecast data (next 7 days)
    var dailyForecast = [];
    if (weatherData.daily && weatherData.daily.time && weatherData.daily.temperature_2m_max && weatherData.daily.temperature_2m_min && weatherData.daily.weathercode) {
        for (var j = 0; j < Math.min(7, weatherData.daily.time.length); j++) {
            if (weatherData.daily.temperature_2m_max[j] !== undefined && weatherData.daily.temperature_2m_min[j] !== undefined) {
                var dayTime = new Date(weatherData.daily.time[j]);
                var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                var dayStr = j === 0 ? 'Today' : dayNames[dayTime.getDay()];
                
                dailyForecast.push({
                    day: dayStr,
                    high: Math.round(weatherData.daily.temperature_2m_max[j]),
                    low: Math.round(weatherData.daily.temperature_2m_min[j]),
                    icon: weatherIconFromCode(weatherData.daily.weathercode[j], weatherData.daily.time[j]),
                    summary: weatherTextFromCode(weatherData.daily.weathercode[j], weatherData.daily.time[j])
                });
            }
        }
        clientLog('info', 'Extracted daily forecast:', dailyForecast.length + ' days');
    }

    var details = {
        emoji: weatherIcon,
        temp: temp,
        summary: weatherText,
        high: high,
        low: low,
        location: locationName || 'Unknown',
        humidity: humidity,
        windSpeed: windSpeed,
        feelsLike: feelsLike,
        rainChance: rainChance,
        hourly: hourlyForecast,
        daily: dailyForecast
    };
    
    clientLog('info', 'Built weather details object:', details);
    clientLog('info', 'Returning details with temp:', details.temp, 'high:', details.high, 'low:', details.low);
    return details;
}

// === STARTUP WEATHER FETCH ===
console.log('Script loaded, attempting weather fetch...');
setTimeout(function() {
    console.log('Timeout reached, calling fetchDetailedWeather...');
    try {
        fetchDetailedWeather(function(data) {
            console.log('STARTUP: Weather data loaded:', data);
            window.weatherData = data;
        });
    } catch (e) {
        console.error('STARTUP: Error calling fetchDetailedWeather:', e);
    }
}, 2000);

// Traffic card functionality with API integration and location memory
(function() {
    var calendarCard = document.getElementById('calendarCard');
    var calendar = document.getElementById('calendar');
    var trafficView = document.getElementById('trafficView');
    var backToCalendarBtn = document.getElementById('backToCalendarBtn');
    var trafficLocation = document.getElementById('trafficLocation');
    var getTrafficBtn = document.getElementById('getTrafficBtn');
    var trafficResults = document.getElementById('trafficResults');

    var isTrafficView = false;
    var userLocation = null; // Store user's current location

    // Request location permissions on startup
    function requestLocationPermission() {
        if (navigator.geolocation) {
            clientLog('info', 'Requesting location permissions for traffic functionality');
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    clientLog('info', 'Location permission granted and location obtained');
                    
                    // Optionally reverse geocode to get a readable location name
                    reverseGeocode(userLocation.lat, userLocation.lng)
                        .then(function(locationName) {
                            clientLog('info', 'Current location: ' + locationName);
                        })
                        .catch(function(error) {
                            clientLog('warning', 'Could not get location name', error);
                        });
                },
                function(error) {
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            clientLog('warning', 'Location permission denied by user');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            clientLog('warning', 'Location information unavailable');
                            break;
                        case error.TIMEOUT:
                            clientLog('warning', 'Location request timed out');
                            break;
                        default:
                            clientLog('warning', 'Unknown location error occurred');
                            break;
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        } else {
            clientLog('warning', 'Geolocation is not supported by this browser');
        }
    }

    // Get TomTom API key
    function getTomTomApiKey() {
        try {
            // First check localStorage
            var apiKey = localStorage.getItem('tomtomApiKey');
            if (apiKey) {
                return apiKey;
            }
            
            // Then check window.TOMTOM_API_KEY from config.js
            if (window.TOMTOM_API_KEY && window.TOMTOM_API_KEY !== 'YOUR_API_KEY_HERE') {
                return window.TOMTOM_API_KEY;
            }
            
            // Show user how to set API key
            console.warn('TomTom API key not found. Please set it in config.js or localStorage');
            return null;
        } catch (e) {
            console.error('Error retrieving TomTom API key:', e);
            return null;
        }
    }

    // Reverse geocode coordinates to get a readable location name using TomTom
    function reverseGeocode(lat, lng) {
        return new Promise(function(resolve, reject) {
            var apiKey = getTomTomApiKey();
            if (!apiKey) {
                // Fallback to a simple coordinate display
                resolve(lat.toFixed(4) + ', ' + lng.toFixed(4));
                return;
            }
            
            var url = 'https://api.tomtom.com/search/2/reverseGeocode/' + 
                      encodeURIComponent(lat + ',' + lng) + '.json?key=' + apiKey;
            
            fetch(url)
            .then(function(response) {
                if (!response.ok) throw new Error('Reverse geocoding failed');
                return response.json();
            })
            .then(function(data) {
                if (data.addresses && data.addresses.length > 0) {
                    var address = data.addresses[0].address;
                    var locationName = address.municipality || address.localName || 
                                     address.countrySubdivision || address.freeformAddress;
                    resolve(locationName || (lat.toFixed(4) + ', ' + lng.toFixed(4)));
                } else {
                    resolve(lat.toFixed(4) + ', ' + lng.toFixed(4));
                }
            })
            .catch(function(error) {
                // Fallback to coordinate display
                resolve(lat.toFixed(4) + ', ' + lng.toFixed(4));
            });
        });
    }

    // Load saved location on startup
    function loadSavedTrafficLocation() {
        try {
            var savedLocation = localStorage.getItem('cosyCalendar_trafficLocation');
            if (savedLocation && trafficLocation) {
                trafficLocation.value = savedLocation;
                clientLog('info', 'Loaded saved traffic location: ' + savedLocation);
                // Auto-fetch traffic for saved location
                fetchTrafficData(savedLocation);
            }
        } catch (e) {
            clientLog('error', 'Failed to load saved traffic location', e);
        }
    }

    // Save location to localStorage
    function saveTrafficLocation(location) {
        try {
            localStorage.setItem('cosyCalendar_trafficLocation', location);
            clientLog('info', 'Saved traffic location: ' + location);
        } catch (e) {
            clientLog('error', 'Failed to save traffic location', e);
        }
    }

    function switchToTrafficView() {
        isTrafficView = true;
        calendar.style.display = 'none';
        trafficView.style.display = 'flex';
        
        // Load saved location when switching to traffic view
        loadSavedTrafficLocation();
        
        clientLog('info', 'Switched to traffic view');
    }

    function switchToCalendarView() {
        isTrafficView = false;
        calendar.style.display = 'block';
        trafficView.style.display = 'none';
        clientLog('info', 'Switched back to calendar view');
    }

    function showTrafficPlaceholder() {
        trafficResults.innerHTML = '<div class="traffic-placeholder">Enter a location and click "Get Traffic" to see current traffic conditions</div>';
    }

    function showTrafficLoading() {
        trafficResults.innerHTML = '<div class="traffic-placeholder">Loading traffic information...</div>';
    }

    function showTrafficError(message) {
        var html = '<div class="traffic-placeholder" style="color: var(--accent);">Error: ' + encodeHTML(message) + '</div>';
        
        // Add helpful setup instructions for API key errors
        if (message.includes('API key') || message.includes('TomTom')) {
            html += '<div style="margin-top: 16px; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.9em;">';
            html += '<strong>TomTom API Setup:</strong><br>';
            html += '1. Get a TomTom API key from <a href="https://developer.tomtom.com/" target="_blank" style="color: var(--accent);">TomTom Developer Portal</a><br>';
            html += '2. Your API key is already configured for this session<br>';
            html += '3. Make sure you have enabled the following APIs:<br>';
            html += '&nbsp;&nbsp;• Search API<br>';
            html += '&nbsp;&nbsp;• Routing API<br>';
            html += '4. Check your API key quotas and usage limits<br>';
            html += '<br>If the issue persists, try refreshing the page.';
            html += '</div>';
        }
        
        trafficResults.innerHTML = html;
    }

    // Enhanced traffic info display with real-time data
    function showTrafficInfo(location, trafficData) {
        var html = '<div class="traffic-info">';
        
        // Show from location if we have user's location
        var fromLocation = userLocation ? 'your current location' : 'your location';
        html += '<h3 style="margin-top:0; color: var(--accent); margin-bottom: 16px;">Traffic from ' + fromLocation + ' to: ' + encodeHTML(location) + '</h3>';
        
        if (trafficData.routes && trafficData.routes.length > 0) {
            for (var i = 0; i < trafficData.routes.length; i++) {
                var route = trafficData.routes[i];
                html += '<div class="traffic-route">';
                html += '<div class="traffic-route-header">';
                html += '<div class="traffic-route-name">' + encodeHTML(route.name) + '</div>';
                html += '<div class="traffic-duration">' + encodeHTML(route.duration) + '</div>';
                html += '</div>';
                html += '<div class="traffic-details">';
                html += '<span class="traffic-status ' + route.status + '">' + route.status.toUpperCase() + '</span>';
                html += encodeHTML(route.details);
                html += '</div>';
                if (route.distance) {
                    html += '<div class="traffic-distance">Distance: ' + encodeHTML(route.distance) + '</div>';
                }
                html += '</div>';
            }
        }

        // Add current traffic conditions
        if (trafficData.conditions) {
            html += '<div class="traffic-conditions">';
            html += '<h4 style="color: var(--accent); margin: 16px 0 8px 0;">Current Conditions</h4>';
            html += '<div class="condition-item">Overall Traffic: <span class="traffic-level-' + trafficData.conditions.level + '">' + trafficData.conditions.level.toUpperCase() + '</span></div>';
            if (trafficData.conditions.incidents > 0) {
                html += '<div class="condition-item">Active Incidents: ' + trafficData.conditions.incidents + '</div>';
            }
            html += '<div class="condition-item">Data Source: ' + (trafficData.conditions.source || 'Traffic API') + '</div>';
            html += '<div class="condition-item">Last Updated: ' + new Date().toLocaleTimeString() + '</div>';
            
            // Show location accuracy status
            if (userLocation) {
                html += '<div class="condition-item">Location: <span style="color: #28a745; font-weight: 600;">GPS Enabled</span></div>';
            } else {
                html += '<div class="condition-item">Location: <span style="color: #ffc107; font-weight: 600;">Estimated</span></div>';
            }
            html += '</div>';
        }
        
        html += '</div>';
        trafficResults.innerHTML = html;
    }

    // Geocode location using TomTom Search API
    function geocodeLocation(location) {
        return new Promise(function(resolve, reject) {
            var apiKey = getTomTomApiKey();
            if (!apiKey) {
                reject(new Error('TomTom API key not configured'));
                return;
            }
            
            var encodedLocation = encodeURIComponent(location);
            var url = 'https://api.tomtom.com/search/2/search/' + encodedLocation + '.json?key=' + apiKey + '&limit=1';
            
            fetch(url)
            .then(function(response) {
                if (!response.ok) throw new Error('Geocoding failed: ' + response.status);
                return response.json();
            })
            .then(function(data) {
                if (data.results && data.results.length > 0) {
                    var result = data.results[0];
                    resolve({
                        lat: result.position.lat,
                        lng: result.position.lon,
                        display_name: result.address.freeformAddress || location
                    });
                } else {
                    reject(new Error('Location not found'));
                }
            })
            .catch(reject);
        });
    }

    // Get real traffic data using TomTom Routing API
    function getTrafficRoutes(destLat, destLng, location) {
        return new Promise(function(resolve, reject) {
            var apiKey = getTomTomApiKey();
            if (!apiKey) {
                reject(new Error('TomTom API key not configured'));
                return;
            }

            // Use stored user location if available, otherwise fall back to geolocation API
            if (userLocation) {
                fetchTomTomTraffic(userLocation.lat, userLocation.lng, destLat, destLng, location, apiKey, resolve, reject);
            } else if (navigator.geolocation) {
                clientLog('info', 'Getting current location for traffic calculation');
                navigator.geolocation.getCurrentPosition(function(position) {
                    var userLat = position.coords.latitude;
                    var userLng = position.coords.longitude;
                    
                    // Store for future use
                    userLocation = { lat: userLat, lng: userLng };
                    
                    fetchTomTomTraffic(userLat, userLng, destLat, destLng, location, apiKey, resolve, reject);
                }, function(error) {
                    clientLog('warning', 'Could not get current location for traffic');
                    reject(new Error('Location access denied. Please enable location services.'));
                }, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 300000 // 5 minutes
                });
            } else {
                reject(new Error('Geolocation not supported'));
            }
        });
    }

    // Fetch real traffic data from TomTom Routing API
    function fetchTomTomTraffic(userLat, userLng, destLat, destLng, location, apiKey, resolve, reject) {
        var origin = userLat + ',' + userLng;
        var destination = destLat + ',' + destLng;
        
        // TomTom routing with traffic
        var baseUrl = 'https://api.tomtom.com/routing/1/calculateRoute/' + 
                     encodeURIComponent(origin) + ':' + encodeURIComponent(destination) + '/json';
        
        // Request multiple route options
        var requests = [
            {
                name: 'Fastest Route',
                url: baseUrl + '?key=' + apiKey + '&traffic=true&routeType=fastest&travelMode=car'
            },
            {
                name: 'Shortest Route', 
                url: baseUrl + '?key=' + apiKey + '&traffic=true&routeType=shortest&travelMode=car'
            },
            {
                name: 'Economy Route',
                url: baseUrl + '?key=' + apiKey + '&traffic=true&routeType=eco&travelMode=car'
            }
        ];

        Promise.all(requests.map(function(req) {
            return fetch(req.url)
                .then(function(response) {
                    if (!response.ok) throw new Error('TomTom API request failed: ' + response.status);
                    return response.json();
                })
                .then(function(data) {
                    return { name: req.name, data: data };
                })
                .catch(function(error) {
                    // Return null for failed requests instead of failing the entire Promise.all
                    console.warn('Failed to fetch route for ' + req.name + ':', error);
                    return { name: req.name, data: null, error: error };
                });
        }))
        .then(function(results) {
            var routes = [];
            var totalIncidents = 0;

            results.forEach(function(result) {
                if (result.data && result.data.routes && result.data.routes.length > 0) {
                    var route = result.data.routes[0];
                    var summary = route.summary;
                    
                    // Convert meters to miles
                    var distanceInMiles = (summary.lengthInMeters * 0.000621371).toFixed(1);
                    
                    // Get travel time with and without traffic
                    var travelTimeSeconds = summary.travelTimeInSeconds;
                    var trafficDelaySeconds = summary.trafficDelayInSeconds || 0;
                    var liveTrafficSeconds = summary.liveTrafficIncidentsTravelTimeInSeconds || travelTimeSeconds;
                    
                    // Format durations
                    var duration = formatDuration(Math.round(liveTrafficSeconds / 60));
                    var normalDuration = formatDuration(Math.round((travelTimeSeconds - trafficDelaySeconds) / 60));
                    
                    // Determine traffic status based on delay
                    var delayMinutes = trafficDelaySeconds / 60;
                    var status = 'light';
                    var details = 'Good traffic conditions';
                    
                    if (delayMinutes > 10) {
                        status = 'heavy';
                        details = 'Heavy traffic - ' + Math.round(delayMinutes) + ' min delay';
                    } else if (delayMinutes > 3) {
                        status = 'moderate';
                        details = 'Moderate traffic - ' + Math.round(delayMinutes) + ' min delay';
                    }
                    
                    // Add route instruction summary if available
                    if (route.legs && route.legs[0] && route.legs[0].points && route.legs[0].points.length > 0) {
                        var instructions = route.legs[0].points.filter(function(point) {
                            return point.instruction && point.instruction.routeOffsetInMeters === 0;
                        });
                        if (instructions.length > 0) {
                            details += ' via ' + instructions[0].instruction.street;
                        }
                    }

                    routes.push({
                        name: result.name,
                        duration: duration,
                        status: status,
                        details: details,
                        distance: distanceInMiles + ' mi',
                        normalDuration: normalDuration,
                        delay: Math.round(delayMinutes) + ' min'
                    });
                }
            });

            if (routes.length === 0) {
                reject(new Error('No routes found between locations'));
                return;
            }

            // Determine overall traffic level
            var heavyCount = routes.filter(function(r) { return r.status === 'heavy'; }).length;
            var moderateCount = routes.filter(function(r) { return r.status === 'moderate'; }).length;
            
            var overallLevel = 'light';
            if (heavyCount > 0) {
                overallLevel = 'heavy';
            } else if (moderateCount > 0) {
                overallLevel = 'moderate';
            }

            var trafficData = {
                routes: routes,
                conditions: {
                    level: overallLevel,
                    incidents: totalIncidents,
                    lastUpdated: new Date(),
                    source: 'TomTom Traffic'
                }
            };

            resolve(trafficData);
        })
        .catch(function(error) {
            clientLog('error', 'TomTom API error', error);
            reject(new Error('Failed to get traffic data: ' + error.message));
        });
    }

    // Helper functions
    function formatDuration(minutes) {
        if (minutes < 60) {
            return Math.round(minutes) + ' min';
        } else {
            var hours = Math.floor(minutes / 60);
            var mins = Math.round(minutes % 60);
            return hours + 'h ' + mins + 'm';
        }
    }

    function encodeHTML(str) {
        return String(str).replace(/[&<>"']/g, function(match) {
            var htmlEscapes = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return htmlEscapes[match];
        });
    }

    function fetchTrafficData(location) {
        if (!location || !location.trim()) {
            showTrafficError('Please enter a valid location');
            return;
        }

        showTrafficLoading();
        saveTrafficLocation(location.trim());
        
        // First geocode the location, then get traffic data
        geocodeLocation(location)
            .then(function(coords) {
                clientLog('info', 'Geocoded location: ' + coords.display_name);
                return getTrafficRoutes(coords.lat, coords.lng, location);
            })
            .then(function(trafficData) {
                showTrafficInfo(location, trafficData);
                clientLog('info', 'Traffic data loaded for: ' + location);
            })
            .catch(function(error) {
                clientLog('error', 'Traffic API error', error);
                showTrafficError('Failed to get traffic data: ' + error.message);
            });
    }

    // Event listeners
    if (calendarCard) {
        calendarCard.addEventListener('click', function(e) {
            if (!isTrafficView) {
                switchToTrafficView();
            }
        });
    }

    if (backToCalendarBtn) {
        backToCalendarBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            switchToCalendarView();
        });
    }

    if (getTrafficBtn) {
        getTrafficBtn.addEventListener('click', function() {
            var location = trafficLocation.value;
            fetchTrafficData(location);
        });
    }

    if (trafficLocation) {
        trafficLocation.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                getTrafficBtn.click();
            }
        });
    }

    // Initialize traffic view
    showTrafficPlaceholder();
    
    // Request location permissions on startup for better traffic functionality
    requestLocationPermission();
    
    clientLog('info', 'Traffic card functionality with API integration initialized');
})();