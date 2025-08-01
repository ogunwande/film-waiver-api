// server.js - Real FilmFreeway scraping server
const http = require('http');
const https = require('https');
const url = require('url');

console.log('Starting Film Waiver API server with real scraping...');

// Cache for scraped data
let discountCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

// Function to scrape FilmFreeway discounts page
function scrapeFilmFreewayDiscounts() {
    return new Promise((resolve, reject) => {
        console.log('Scraping FilmFreeway discounts page...');
        
        const options = {
            hostname: 'filmfreeway.com',
            port: 443,
            path: '/festivals/discounts',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('FilmFreeway page downloaded, parsing...');
                try {
                    const discounts = parseDiscountsFromHTML(data);
                    console.log(`Parsed ${discounts.length} discounts from FilmFreeway`);
                    resolve(discounts);
                } catch (error) {
                    console.error('Error parsing discounts:', error);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('Error fetching FilmFreeway page:', error);
            reject(error);
        });
        
        req.setTimeout(15000, () => {
            console.error('Request timeout');
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// Parse HTML to extract discount information
function parseDiscountsFromHTML(html) {
    const discounts = [];
    
    try {
        // Look for common patterns in FilmFreeway's discount listings
        // We'll use simple string matching since we don't have a full HTML parser
        
        // Pattern 1: Look for festival names and codes in the HTML
        const festivalPattern = /<[^>]*class[^>]*(?:festival|card|item)[^>]*>[\s\S]*?<\/[^>]*>/gi;
        let matches = html.match(festivalPattern) || [];
        
        // Pattern 2: Look for discount code patterns (alphanumeric codes 4-12 chars)
        const codePattern = /\b([A-Z0-9]{4,12})\b/g;
        
        // Pattern 3: Look for festival name patterns
        const namePattern = /(?:festival|film|cinema|movie|competition)[^<\n]*?(?=<|$)/gi;
        
        // Find all potential discount codes in the HTML
        const allCodes = [];
        let codeMatch;
        while ((codeMatch = codePattern.exec(html)) !== null) {
            const code = codeMatch[1];
            // Filter out common non-discount codes
            if (!['THE', 'AND', 'FOR', 'WITH', 'FROM', 'FILM', 'FEST', 'PAGE', 'HTML', 'HTTP', 'HTTPS'].includes(code)) {
                allCodes.push({
                    code: code,
                    position: codeMatch.index
                });
            }
        }
        
        // Find all potential festival names
        const allNames = [];
        let nameMatch;
        while ((nameMatch = namePattern.exec(html)) !== null) {
            const name = nameMatch[0].trim();
            if (name.length > 5 && name.length < 100) {
                allNames.push({
                    name: name,
                    position: nameMatch.index
                });
            }
        }
        
        // Try to match codes with nearby festival names
        allCodes.forEach(codeItem => {
            // Find the closest festival name (within 1000 characters)
            let closestName = null;
            let closestDistance = Infinity;
            
            allNames.forEach(nameItem => {
                const distance = Math.abs(codeItem.position - nameItem.position);
                if (distance < 1000 && distance < closestDistance) {
                    closestDistance = distance;
                    closestName = nameItem.name;
                }
            });
            
            if (closestName) {
                // Look for offer text near the code
                const surroundingText = html.substring(
                    Math.max(0, codeItem.position - 500),
                    Math.min(html.length, codeItem.position + 500)
                );
                
                let offer = 'Discount available';
                const offerMatch = surroundingText.match(/(\d+%\s*off|\$\d+\s*off|free\s*submission|waived\s*fees?|no\s*fee)/i);
                if (offerMatch) {
                    offer = offerMatch[0];
                }
                
                discounts.push({
                    festival_name: closestName,
                    code: codeItem.code,
                    offer: offer,
                    url: `https://filmfreeway.com/festivals/${closestName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    scraped_at: new Date().toISOString(),
                    source: 'filmfreeway_realtime'
                });
            }
        });
        
        // Remove duplicates based on code
        const uniqueDiscounts = discounts.filter((discount, index, self) => 
            index === self.findIndex(d => d.code === discount.code)
        );
        
        // If we didn't find many discounts, add some fallback ones from common patterns
        if (uniqueDiscounts.length < 3) {
            // Look for any mention of specific well-known festivals with codes
            const knownFestivals = [
                { name: 'Sundance Film Festival', pattern: /sundance.*?([A-Z0-9]{4,10})/i },
                { name: 'Cannes Film Festival', pattern: /cannes.*?([A-Z0-9]{4,10})/i },
                { name: 'Toronto International Film Festival', pattern: /tiff.*?([A-Z0-9]{4,10})/i },
                { name: 'Venice Film Festival', pattern: /venice.*?([A-Z0-9]{4,10})/i },
                { name: 'Berlin International Film Festival', pattern: /berlin.*?([A-Z0-9]{4,10})/i }
            ];
            
            knownFestivals.forEach(festival => {
                const match = html.match(festival.pattern);
                if (match && !uniqueDiscounts.find(d => d.code === match[1])) {
                    uniqueDiscounts.push({
                        festival_name: festival.name,
                        code: match[1],
                        offer: 'Discount available',
                        url: `https://filmfreeway.com/festivals/${festival.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                        scraped_at: new Date().toISOString(),
                        source: 'filmfreeway_realtime'
                    });
                }
            });
        }
        
        return uniqueDiscounts;
        
    } catch (error) {
        console.error('Error parsing HTML:', error);
        return [];
    }
}

// Get discounts with caching
async function getDiscounts() {
    const now = Date.now();
    
    // Use cache if it's fresh
    if (discountCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('Using cached discount data');
        return discountCache;
    }
    
    try {
        // Scrape fresh data
        const discounts = await scrapeFilmFreewayDiscounts();
        
        // Cache the results
        discountCache = discounts;
        cacheTimestamp = now;
        
        return discounts;
    } catch (error) {
        console.error('Error getting discounts:', error);
        // Return cached data if available, otherwise empty array
        return discountCache || [];
    }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
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
            message: 'Film Waiver API Server (Real Scraping)',
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
            version: '1.0.0-scraping',
            cache_age: cacheTimestamp ? (Date.now() - cacheTimestamp) / 1000 : null
        });
    }
    else if (path === '/api/discounts/realtime') {
        try {
            console.log('Getting real-time discounts...');
            const discounts = await getDiscounts();
            
            sendJSON(res, 200, {
                success: true,
                discounts: discounts,
                source: 'filmfreeway_realtime_scraping',
                timestamp: new Date().toISOString(),
                total: discounts.length,
                cache_age: cacheTimestamp ? (Date.now() - cacheTimestamp) / 1000 : null
            });
        } catch (error) {
            console.error('Error in realtime endpoint:', error);
            sendJSON(res, 500, {
                success: false,
                error: error.message,
                discounts: [],
                timestamp: new Date().toISOString()
            });
        }
    }
    else if (path === '/api/discounts/search') {
        try {
            const searchQuery = (query.q || '').toLowerCase();
            console.log('Search query:', searchQuery);
            
            const allDiscounts = await getDiscounts();
            const filteredDiscounts = allDiscounts.filter(discount => {
                const searchText = `${discount.festival_name} ${discount.offer} ${discount.code}`.toLowerCase();
                return searchText.includes(searchQuery);
            });
            
            sendJSON(res, 200, {
                success: true,
                discounts: filteredDiscounts,
                query: query.q,
                total_available: allDiscounts.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in search endpoint:', error);
            sendJSON(res, 500, {
                success: false,
                error: error.message,
                discounts: [],
                query: query.q
            });
        }
    }
    else {
        // 404 for unknown routes
        sendJSON(res, 404, {
            error: 'Route not found',
            path: path,
            available_routes: ['/', '/api/health', '/api/discounts/realtime', '/api/discounts/search']
        });
    }
});

// Get port from environment or use 3000
const PORT = process.env.PORT || 3000;

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Film Waiver API server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🎬 Discounts: http://localhost:${PORT}/api/discounts/realtime`);
    console.log('✅ Server started with real FilmFreeway scraping!');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => process.exit(0));
});

module.exports = server;
