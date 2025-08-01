// server.js - Minimal server with NO external dependencies
const http = require('http');
const url = require('url');

console.log('Starting Film Waiver API server (minimal version)...');

// Test discount data
const testDiscounts = [
    {
        festival_name: "Sundance Film Festival",
        code: "SUNDANCE50",
        offer: "50% off early bird submissions",
        url: "https://filmfreeway.com/sundance-film-festival",
        source: "server_test_data"
    },
    {
        festival_name: "Cannes Film Festival", 
        code: "CANNES2024",
        offer: "Student discount - Free submission",
        url: "https://filmfreeway.com/cannes-film-festival",
        source: "server_test_data"
    },
    {
        festival_name: "Toronto International Film Festival",
        code: "TIFF30",
        offer: "30% off standard submissions", 
        url: "https://filmfreeway.com/toronto-international-film-festival",
        source: "server_test_data"
    }
];

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end(JSON.stringify(data, null, 2));
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    console.log(`${req.method} ${path}`);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        });
        res.end();
        return;
    }
    
    // Route handling
    if (path === '/') {
        sendJSON(res, 200, {
            message: 'Film Waiver API Server (Minimal)',
            status: 'running',
            endpoints: ['/api/health', '/api/discounts/realtime', '/api/discounts/search'],
            timestamp: new Date().toISOString()
        });
    }
    else if (path === '/api/health') {
        sendJSON(res, 200, {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0-minimal'
        });
    }
    else if (path === '/api/discounts/realtime') {
        console.log('Serving test discounts');
        sendJSON(res, 200, {
            success: true,
            discounts: testDiscounts,
            source: 'minimal_server_test_data',
            timestamp: new Date().toISOString(),
            total: testDiscounts.length
        });
    }
    else if (path === '/api/discounts/search') {
        const searchQuery = (query.q || '').toLowerCase();
        const filteredDiscounts = testDiscounts.filter(discount => {
            const searchText = `${discount.festival_name} ${discount.offer} ${discount.code}`.toLowerCase();
            return searchText.includes(searchQuery);
        });
        
        sendJSON(res, 200, {
            success: true,
            discounts: filteredDiscounts,
            query: query.q,
            total_available: testDiscounts.length,
            timestamp: new Date().toISOString()
        });
    }
    else {
        sendJSON(res, 404, {
            error: 'Route not found',
            path: path,
            available_routes: ['/', '/api/health', '/api/discounts/realtime', '/api/discounts/search']
        });
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Film Waiver API server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🎬 Discounts: http://localhost:${PORT}/api/discounts/realtime`);
    console.log('✅ Server started successfully - no external dependencies needed!');
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
});

module.exports = server;
