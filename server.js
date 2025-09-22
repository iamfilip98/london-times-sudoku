const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

// MIME types mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let url = req.url;

    // Handle API routes
    if (url.startsWith('/api/')) {
        try {
            const apiPath = url.replace('/api/', '');
            const apiFile = path.join(__dirname, 'api', `${apiPath.split('?')[0]}.js`);

            if (fs.existsSync(apiFile)) {
                // Clear require cache for hot reloading in development
                delete require.cache[require.resolve(apiFile)];

                const handler = require(apiFile);

                // Parse request body for POST/PUT requests
                if (req.method === 'POST' || req.method === 'PUT') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });
                    req.on('end', async () => {
                        try {
                            req.body = JSON.parse(body);
                        } catch (e) {
                            req.body = {};
                        }

                        // Parse query parameters
                        const urlParts = url.split('?');
                        if (urlParts[1]) {
                            req.query = Object.fromEntries(new URLSearchParams(urlParts[1]));
                        } else {
                            req.query = {};
                        }

                        await handler(req, res);
                    });
                } else {
                    // Parse query parameters
                    const urlParts = url.split('?');
                    if (urlParts[1]) {
                        req.query = Object.fromEntries(new URLSearchParams(urlParts[1]));
                    } else {
                        req.query = {};
                    }
                    req.body = {};

                    await handler(req, res);
                }
                return;
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API endpoint not found' }));
                return;
            }
        } catch (error) {
            console.error('API Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
            return;
        }
    }

    // Handle static files
    if (url === '/') {
        url = '/index.html';
    }

    const filePath = path.join(__dirname, url);
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔧 API endpoints available at: http://localhost:${PORT}/api/`);
});