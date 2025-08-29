const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const port = 5006;
const publicDir = path.join(__dirname, 'public');

http.createServer((req, res) => {
  try {
    var parsed = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  } catch (e) {
    var parsed = null;
  }

  // simple proxy endpoints so client doesn't call third-party APIs directly
  if (parsed && parsed.pathname === '/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const logData = JSON.parse(body);
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [CLIENT-${logData.level}] ${logData.message}${logData.data ? ' ' + JSON.stringify(logData.data) : ''}\n`;
        
        // Ensure the client.log file exists
        if (!fs.existsSync('client.log')) {
          fs.writeFileSync('client.log', `[${timestamp}] Client log initialized\n`);
          console.log('Created client.log file');
        }
        
        fs.appendFile('client.log', logLine, (err) => {
          if (err) {
            console.error('Failed to write client log:', err);
          } else {
            console.log('Client log written:', logData.level, logData.message);
          }
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('Error processing client log:', e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  if (parsed && parsed.pathname === '/proxy/geocode') {
  var q = parsed.searchParams.get('name') || '';
  console.log('[proxy] geocode request for:', q);
    return proxyGeocode(q, res);
  }
  if (parsed && parsed.pathname === '/proxy/weather') {
  var lat = parsed.searchParams.get('latitude') || parsed.searchParams.get('lat') || '';
  var lon = parsed.searchParams.get('longitude') || parsed.searchParams.get('lon') || '';
  console.log('[proxy] weather request for:', lat, lon);
    // Change this line (around line 19)
  var target = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) +
      '&longitude=' + encodeURIComponent(lon) +
      '&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto';
  return proxyRequest(target, res);
  }
  if (parsed && parsed.pathname === '/proxy/detailed-weather') {
  var lat = parsed.searchParams.get('latitude') || parsed.searchParams.get('lat') || '';
  var lon = parsed.searchParams.get('longitude') || parsed.searchParams.get('lon') || '';
  console.log('[proxy] detailed weather request for:', lat, lon);
    // Enhanced request with more hourly data and extended forecast
  var target = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) +
      '&longitude=' + encodeURIComponent(lon) +
      '&current_weather=true' +
      '&hourly=temperature_2m,weathercode,relative_humidity_2m,wind_speed_10m,apparent_temperature,precipitation_probability' +
      '&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,wind_speed_10m_max' +
      '&timezone=auto' +
      '&forecast_days=10';
  return proxyRequest(target, res);
  }

  const filePath = path.join(publicDir, req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();

  let contentType = 'text/html';
  if (ext === '.css') contentType = 'text/css';
  else if (ext === '.js') contentType = 'application/javascript';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.svg') contentType = 'image/svg+xml';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`Cosy Calendar running on http://0.0.0.0:${port}`);
});

  function proxyRequest(targetUrl, res) {
    try {
      var t = new URL(targetUrl);
    } catch (e) {
      res.writeHead(400, {'Content-Type':'text/plain'});
      res.end('Bad proxy request');
      return;
    }
    var options = {
      hostname: t.hostname,
      path: t.pathname + (t.search || ''),
      method: 'GET',
      headers: {
        'User-Agent': 'CosyCalendarProxy/1.0'
      }
    };
    var client = https;
    var req = client.request(options, function(apiRes) {
      var chunks = [];
      apiRes.on('data', function(chunk) { chunks.push(chunk); });
      apiRes.on('end', function() {
        try {
          var body = Buffer.concat(chunks);
          // mirror content-type if present
          var ct = apiRes.headers['content-type'] || 'application/json';
          // forward upstream status code so client sees real result
          var statusCode = apiRes.statusCode || 200;
          console.log('[proxy] ' + targetUrl + ' -> ' + statusCode + ' (' + (ct || '') + ')');
          res.writeHead(statusCode, {'Content-Type': ct});
          res.end(body);
        } catch (e) {
          console.error('[proxy] error handling upstream response', e);
          res.writeHead(502, {'Content-Type':'text/plain'});
          res.end('Upstream response error');
        }
      });
    });
    req.on('error', function(err) {
      res.writeHead(502, {'Content-Type':'text/plain'});
      res.end('Upstream request failed');
    });
    req.setTimeout(15000, function() { req.abort(); });
    req.end();
  }

  // proxyGeocode: try Open-Meteo geocoding, if empty fall back to Nominatim (OSM), always return { results: [...] }
  function proxyGeocode(query, res) {
    if (!query) {
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ results: [] }));
      return;
    }
    var openMeteo = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(query) + '&count=1&language=en&format=json';
    try {
      var t = new URL(openMeteo);
    } catch (e) { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ results: [] })); return; }
    var opts = { hostname: t.hostname, path: t.pathname + (t.search||''), method: 'GET', headers: { 'User-Agent': 'CosyCalendarProxy/1.0' } };
    var req = https.request(opts, function(apiRes) {
      var chunks = [];
      apiRes.on('data', function(c){ chunks.push(c); });
      apiRes.on('end', function(){
        try {
          var body = Buffer.concat(chunks).toString('utf8');
          var json = null;
          try { json = JSON.parse(body); } catch (e) { json = null; }
          var count = (json && json.results && json.results.length) ? json.results.length : 0;
          console.log('[proxy] OpenMeteo geocode', query, 'status=', apiRes.statusCode, 'results=', count);
          if (json && json.results && json.results.length) {
            res.writeHead(apiRes.statusCode || 200, {'Content-Type': apiRes.headers['content-type'] || 'application/json'});
            res.end(JSON.stringify(json));
            return;
          }
          // fallback to Nominatim
    console.log('[proxy] OpenMeteo returned empty, falling back to Nominatim for:', query);
          var nom = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=1&addressdetails=1';
          try {
            var nt = new URL(nom);
          } catch (e) { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ results: [] })); return; }
          var nopts = { hostname: nt.hostname, path: nt.pathname + (nt.search||''), method: 'GET', headers: { 'User-Agent': 'CosyCalendarProxy/1.0' } };
          var nreq = https.request(nopts, function(nres) {
            var nchunks = [];
            nres.on('data', function(c){ nchunks.push(c); });
            nres.on('end', function(){
              try {
                var nbody = Buffer.concat(nchunks).toString('utf8');
                var narr = null;
                try { narr = JSON.parse(nbody); } catch (e) { narr = []; }
                var results = [];
                if (Array.isArray(narr) && narr.length) {
                  for (var i=0;i<narr.length;i++) {
                    var it = narr[i] || {};
                    results.push({ latitude: parseFloat(it.lat), longitude: parseFloat(it.lon), name: it.display_name || (it.address && it.address.city) || query, country: it.address && it.address.country });
                  }
                }
                console.log('[proxy] Nominatim geocode', query, 'status=', nres.statusCode, 'results=', results.length);
                res.writeHead(200, {'Content-Type':'application/json'});
                res.end(JSON.stringify({ results: results }));
                return;
              } catch (e) {
                res.writeHead(200, {'Content-Type':'application/json'});
                res.end(JSON.stringify({ results: [] }));
                return;
              }
            });
          });
          nreq.on('error', function() { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ results: [] })); });
          nreq.setTimeout(10000, function(){ nreq.abort(); });
          nreq.end();
        } catch (e) {
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify({ results: [] }));
        }
      });
    });
    req.on('error', function() { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify({ results: [] })); });
    req.setTimeout(10000, function(){ req.abort(); });
    req.end();
  }
