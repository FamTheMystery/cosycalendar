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

    function weatherTextFromCode(code) {
        var map = {
            0: 'Clear',
            1: 'Mainly clear',
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

    function weatherIconFromCode(code) {
        // Return a simple emoji for broad compatibility on older iOS
        var icons = {};
        icons[0] = '☀️';
        icons[1] = '🌤️';
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
        return icons.hasOwnProperty(code) ? icons[code] : '🌤️';
    }

    function renderCurrentWeather(data) {
        if (!weatherEl) return;
        if (!data || !data.current_weather) { showWeatherMessage('No weather data'); return; }
        var cw = data.current_weather;
        var text = weatherTextFromCode(cw.weathercode);
        var icon = weatherIconFromCode(cw.weathercode);
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
    var url = '/proxy/weather?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon);
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
    var fullscreenBtn = document.getElementById('fullscreenBtn');
    var saved = null;
    try { saved = localStorage.getItem('cosy-tasks-endpoint'); } catch (e) { saved = null; }
    if (saved && endpointInput) endpointInput.value = saved;
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
        });
    }

    if (loadListsBtn) loadListsBtn.addEventListener('click', function() { loadTasklists(); });
    if (tasksListSelect) tasksListSelect.addEventListener('change', function() { try { localStorage.setItem('cosy-tasks-listid', tasksListSelect.value || ''); } catch (e) {} });

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
        // keep placement inline but use theme-aware class for colors
        refreshBtn.style.cssText = 'position:absolute; right:12px; top:8px; cursor:pointer; font-size:0.9em; background:transparent; border:none;';
    refreshBtn.id = 'tasksRefreshBtn';
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
    setTimeout(function() { try { if (localStorage.getItem('cosy-tasks-endpoint')) fetchTasks(); } catch (e) {} }, 400);

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
if (darkBtn) {
    darkBtn.onclick = function() {
        var body = document.body;
    // clear other theme classes
    body.classList.remove('green-mode');
    body.classList.remove('navy-mode');
    body.classList.remove('dark-green-mode');
        var isDark = body.classList.toggle('dark-mode');
        if (isDark) {
            try { localStorage.setItem('cosy-theme', 'dark'); } catch (e) {}
            darkBtn.classList.add('active');
            darkBtn.innerHTML = 'Light Mode';
            if (greenBtn) greenBtn.classList.remove('active');
            if (navyBtn) navyBtn.classList.remove('active');
            try { darkBtn.setAttribute('aria-pressed','true'); } catch(e){}
            if (greenBtn) try { greenBtn.setAttribute('aria-pressed','false'); } catch(e){}
            if (navyBtn) try { navyBtn.setAttribute('aria-pressed','false'); } catch(e){}
            console.log('Theme: dark');
        } else {
            try { localStorage.removeItem('cosy-theme'); } catch (e) {}
            darkBtn.classList.remove('active');
            darkBtn.innerHTML = 'Dark Mode';
            try { darkBtn.setAttribute('aria-pressed','false'); } catch(e){}
            console.log('Theme: light');
        }
    };
}


if (greenBtn) {
    greenBtn.onclick = function() {
        var body = document.body;
        // clear other theme classes then enable green-mode
    body.classList.remove('dark-mode');
    body.classList.remove('navy-mode');
    body.classList.remove('dark-green-mode');
        body.classList.add('green-mode');
        try { localStorage.setItem('cosy-theme', 'green'); } catch (e) {}
        greenBtn.classList.add('active');
        if (darkBtn) {
            darkBtn.classList.remove('active');
            darkBtn.innerHTML = 'Dark Mode';
        }
        if (navyBtn) navyBtn.classList.remove('active');
    try { greenBtn.setAttribute('aria-pressed','true'); } catch(e){}
    if (darkBtn) try { darkBtn.setAttribute('aria-pressed','false'); } catch(e){}
    if (navyBtn) try { navyBtn.setAttribute('aria-pressed','false'); } catch(e){}
    console.log('Theme: green');
    };
}

if (navyBtn) {
    navyBtn.onclick = function() {
        var body = document.body;
        // clear other theme classes then enable navy-mode
    body.classList.remove('dark-mode');
    body.classList.remove('green-mode');
    body.classList.remove('dark-green-mode');
        body.classList.add('navy-mode');
        try { localStorage.setItem('cosy-theme', 'navy'); } catch (e) {}
        navyBtn.classList.add('active');
        if (darkBtn) {
            darkBtn.classList.remove('active');
            darkBtn.innerHTML = 'Dark Mode';
        }
        if (greenBtn) greenBtn.classList.remove('active');
    try { navyBtn.setAttribute('aria-pressed','true'); } catch(e){}
    if (darkBtn) try { darkBtn.setAttribute('aria-pressed','false'); } catch(e){}
    if (greenBtn) try { greenBtn.setAttribute('aria-pressed','false'); } catch(e){}
    console.log('Theme: navy');
    };
}
if (darkGreenBtn) {
    darkGreenBtn.onclick = function() {
        var body = document.body;
        // clear other theme classes then enable dark-green-mode
    body.classList.remove('dark-mode');
    body.classList.remove('green-mode');
    body.classList.remove('navy-mode');
        body.classList.add('dark-green-mode');
        try { localStorage.setItem('cosy-theme', 'dark-green'); } catch (e) {}
        darkGreenBtn.classList.add('active');
        if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.innerHTML = 'Dark Mode'; }
        if (greenBtn) greenBtn.classList.remove('active');
        if (navyBtn) navyBtn.classList.remove('active');
        try { darkGreenBtn.setAttribute('aria-pressed','true'); } catch(e){}
        if (darkBtn) try { darkBtn.setAttribute('aria-pressed','false'); } catch(e){}
        if (greenBtn) try { greenBtn.setAttribute('aria-pressed','false'); } catch(e){}
        if (navyBtn) try { navyBtn.setAttribute('aria-pressed','false'); } catch(e){}
        console.log('Theme: dark-green');
    };
}
// Initialize theme from localStorage and sync button state
(function() {
    try {
        var theme = localStorage.getItem('cosy-theme');
        var body = document.body;
        // clear any theme classes first
        body.classList.remove('dark-mode');
        body.classList.remove('green-mode');
        body.classList.remove('navy-mode');
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if (darkBtn) {
                darkBtn.classList.add('active');
                darkBtn.innerHTML = 'Light Mode';
                try { darkBtn.setAttribute('aria-pressed','true'); } catch(e){}
            }
            if (greenBtn) { greenBtn.classList.remove('active'); try{ greenBtn.setAttribute('aria-pressed','false'); }catch(e){} }
            if (navyBtn) { navyBtn.classList.remove('active'); try{ navyBtn.setAttribute('aria-pressed','false'); }catch(e){} }
        } else if (theme === 'dark-green') {
            body.classList.add('dark-green-mode');
            if (darkGreenBtn) { darkGreenBtn.classList.add('active'); try{ darkGreenBtn.setAttribute('aria-pressed','true'); } catch(e){} }
            if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.innerHTML = 'Dark Mode'; try{ darkBtn.setAttribute('aria-pressed','false'); }catch(e){} }
            if (greenBtn) { greenBtn.classList.remove('active'); try{ greenBtn.setAttribute('aria-pressed','false'); }catch(e){} }
            if (navyBtn) { navyBtn.classList.remove('active'); try{ navyBtn.setAttribute('aria-pressed','false'); }catch(e){} }
        } else if (theme === 'green') {
            body.classList.add('green-mode');
            if (greenBtn) { greenBtn.classList.add('active'); try{ greenBtn.setAttribute('aria-pressed','true'); }catch(e){} }
            if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.innerHTML = 'Dark Mode'; try{ darkBtn.setAttribute('aria-pressed','false'); }catch(e){} }
            if (navyBtn) { navyBtn.classList.remove('active'); try{ navyBtn.setAttribute('aria-pressed','false'); }catch(e){} }
        } else if (theme === 'navy') {
            body.classList.add('navy-mode');
            if (navyBtn) { navyBtn.classList.add('active'); try{ navyBtn.setAttribute('aria-pressed','true'); }catch(e){} }
            if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.innerHTML = 'Dark Mode'; try{ darkBtn.setAttribute('aria-pressed','false'); }catch(e){} }
            if (greenBtn) { greenBtn.classList.remove('active'); try{ greenBtn.setAttribute('aria-pressed','false'); }catch(e){} }
        } else {
            // no theme saved — ensure buttons are reset
            if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.innerHTML = 'Dark Mode'; try{ darkBtn.setAttribute('aria-pressed','false'); }catch(e){} }
            if (greenBtn) { greenBtn.classList.remove('active'); try{ greenBtn.setAttribute('aria-pressed','false'); }catch(e){} }
            if (navyBtn) { navyBtn.classList.remove('active'); try{ navyBtn.setAttribute('aria-pressed','false'); }catch(e){} }
        }
    } catch (e) { /* ignore storage errors */ }
})();
// Reset theme button handler
(function() {
    var resetThemeBtn = document.getElementById('resetThemeBtn');
    if (!resetThemeBtn) return;
    resetThemeBtn.addEventListener('click', function() {
        try { localStorage.removeItem('cosy-theme'); } catch (e) {}
        var body = document.body;
        body.classList.remove('dark-mode');
        body.classList.remove('green-mode');
        body.classList.remove('navy-mode');
        body.classList.remove('dark-green-mode');
        // reset button states
        try { if (darkBtn) { darkBtn.classList.remove('active'); darkBtn.innerHTML = 'Dark Mode'; darkBtn.setAttribute('aria-pressed','false'); } } catch(e){}
        try { if (greenBtn) { greenBtn.classList.remove('active'); greenBtn.setAttribute('aria-pressed','false'); } } catch(e){}
        try { if (navyBtn) { navyBtn.classList.remove('active'); navyBtn.setAttribute('aria-pressed','false'); } } catch(e){}
        try { if (darkGreenBtn) { darkGreenBtn.classList.remove('active'); darkGreenBtn.setAttribute('aria-pressed','false'); } } catch(e){}
        // update refresh button theming
        try { var r = document.getElementById('tasksRefreshBtn'); if (r) { r.classList.remove('dark-mode','green-mode','navy-mode','dark-green-mode'); } } catch(e){}
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

            // Update any themed controls
            try { var r = document.getElementById('tasksRefreshBtn'); if (r) { r.classList.remove('dark-mode','green-mode','navy-mode','dark-green-mode','night-mode'); } } catch(e){}

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
            var active = document.body.classList.toggle('night-mode');
            // clear other theme classes when night mode is toggled on
            if (active) {
                document.body.classList.remove('dark-mode','green-mode','navy-mode','dark-green-mode');
            }
            try { localStorage.setItem('cosy-theme-night', active ? '1' : '0'); } catch (e) {}
            // sync button visual state
            if (active) nightBtn.classList.add('active'); else nightBtn.classList.remove('active');
        } catch (e) {}
    };
}

// Initialize night mode from localStorage and sync button state
(function() {
    try {
        var night = false;
        try { night = localStorage.getItem('cosy-theme-night') === '1'; } catch (e) { night = false; }
        if (night) {
            document.body.classList.add('night-mode');
            if (nightBtn) nightBtn.classList.add('active');
            // ensure other theme classes are not active
            document.body.classList.remove('dark-mode','green-mode','navy-mode','dark-green-mode');
        } else {
            if (nightBtn) nightBtn.classList.remove('active');
        }
    } catch (e) {}
})();
