// server.js - Debug version to see what we're getting from FilmFreeway
const http = require('http');
const https = require('https');
const url = require('url');

console.log('Starting Film Waiver API server with debug scraping...');

// Cache for scraped data
let discountCache = null;
let cacheTimestamp = null;
let rawHtmlCache = null; // Cache raw HTML for debugging
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
                'Accept-Encoding': 'identity', // Don't use gzip to make debugging easier
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`FilmFreeway page downloaded, size: ${data.length} bytes`);
                console.log('Response status:', res.statusCode);
                console.log('Response headers:', res.headers);
                
                // Cache raw HTML for debugging
                rawHtmlCache = data;
                
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
        console.log('Starting HTML parsing...');
        console.log('HTML preview (first 500 chars):', html.substring(0, 500));
        
        // Check if we got a valid HTML page
        if (!html.includes('<html') && !html.includes('<HTML')) {
            console.log('WARNING: Response does not appear to be HTML');
            return [];
        }
        
        // Look for common discount/code patterns in the HTML
        const patterns = [
            // Pattern 1: Direct code matches (4-12 alphanumeric characters)
            /\b([A-Z0-9]{4,12})\b/g,
            // Pattern 2: Code in quotes or specific contexts
            /"code":\s*"([^"]+)"/gi,
            /code[:\s=]+["']?([A-Z0-9]+)["']?/gi,
            // Pattern 3: Discount/promo patterns
            /promo[_\s]code[:\s=]+["']?([A-Z0-9]+)["']?/gi,
            /discount[_\s]code[:\s=]+["']?([A-Z0-9]+)["']?/gi
        ];
        
        const foundCodes = new Set();
        
        patterns.forEach((pattern, index) => {
            console.log(`Testing pattern ${index + 1}: ${pattern}`);
            let match;
            let matchCount = 0;
            while ((match = pattern.exec(html)) !== null && matchCount < 50) {
                const code = match[1];
                if (code && code.length >= 4 && code.length <= 12) {
                    // Filter out common non-code words
                    const excludeWords = [
                        'HTML', 'HTTP', 'HTTPS', 'HEAD', 'BODY', 'FORM', 'LINK', 'META',
                        'TYPE', 'TEXT', 'TRUE', 'FALSE', 'NULL', 'VOID', 'MAIN', 'HOME',
                        'PAGE', 'SITE', 'USER', 'DATA', 'FILE', 'NAME', 'CODE', 'TIME',
                        'DATE', 'YEAR', 'FILM', 'FEST', 'FESTIVAL', 'THE', 'AND', 'FOR',
                        'WITH', 'FROM', 'THIS', 'THAT', 'WHAT', 'WHEN', 'WHERE'
                    ];
                    
                    if (!excludeWords.includes(code.toUpperCase())) {
                        foundCodes.add(code);
                        console.log(`Found potential code with pattern ${index + 1}: ${code}`);
                    }
                }
                matchCount++;
            }
        });
        
        console.log('All potential codes found:', Array.from(foundCodes));
        
        // Look for festival names near codes
        const festivalPatterns = [
            /festival/gi,
            /film\s+festival/gi,
            /international/gi,
            /cinema/gi,
            /movie/gi
        ];
        
        // Simple approach: for each code, try to find nearby text that looks like a festival name
        foundCodes.forEach(code => {
            // Find position of code in HTML
            const codeIndex = html.indexOf(code);
            if (codeIndex !== -1) {
                // Get surrounding text (500 chars before and after)
                const start = Math.max(0, codeIndex - 500);
                const end = Math.min(html.length, codeIndex + 500);
                const surroundingText = html.substring(start, end);
                
                // Look for festival name in surrounding text
                let festivalName = 'Unknown Festival';
                
                // Try to extract text that looks like a festival name
                const nameMatches = surroundingText.match(/([A-Za-z\s]{10,80}(?:festival|film|cinema|competition)[A-Za-z\s]{0,20})/gi);
                if (nameMatches && nameMatches.length > 0) {
                    festivalName = nameMatches[0].trim();
                }
                
                // Look for discount offer text
                let offer = 'Discount available';
                const offerMatches = surroundingText.match(/(\d+%\s*off|\$\d+\s*off|free\s*submission|waived\s*fees?|no\s*fee)/gi);
                if (offerMatches && offerMatches.length > 0) {
                    offer = offerMatches[0];
                }
                
                discounts.push({
                    festival_name: festivalName,
                    code: code,
                    offer: offer,
                    url: `https://filmfreeway.com/festivals/${festivalName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    scraped_at: new Date().toISOString(),
                    source: 'filmfreeway_debug_scraping',
                    debug_context: surroundingText.substring(0, 200) + '...'
                });
            }
        });
        
        console.log(`Final parsed discounts: ${discounts.length}`);
        return discounts.slice(0, 20); // Limit to 20 to avoid too much data
        
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
            message: 'Film Waiver API Server (Debug Scraping)',
            status: 'running',
            endpoints: [
                '/api/health', 
                '/api/discounts/realtime', 
                '/api/discounts/search',
                '/api/debug/html',
                '/api/debug/raw'
            ],
            timestamp: new Date().toISOString()
        });
    }
    else if (path === '/api/health') {
        sendJSON(res, 200, {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0-debug-scraping',
            cache_age: cacheTimestamp ? (Date.now() - cacheTimestamp) / 1000 : null,
            html_cached: rawHtmlCache ? rawHtmlCache.length : 0
        });
    }
    else if (path === '/api/debug/html') {
        // Show first 2000 characters of raw HTML for debugging
        try {
            if (!rawHtmlCache) {
                await scrapeFilmFreewayDiscounts(); // This will populate rawHtmlCache
            }
            
            sendJSON(res, 200, {
                success: true,
                html_preview: rawHtmlCache ? rawHtmlCache.substring(0, 2000) : 'No HTML cached',
                html_length: rawHtmlCache ? rawHtmlCache.length : 0,
                contains_discount: rawHtmlCache ? rawHtmlCache.includes('discount') : false,
                contains_code: rawHtmlCache ? rawHtmlCache.includes('code') : false,
                contains_festival: rawHtmlCache ? rawHtmlCache.includes('festival') : false,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            sendJSON(res, 500, {
                success: false,
                error: error.message
            });
        }
    }
    else if (path === '/api/debug/raw') {
        // Show raw HTML (be careful, this could be large)
        try {
            if (!rawHtmlCache) {
                await scrapeFilmFreewayDiscounts();
            }
            
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(rawHtmlCache || 'No HTML cached');
        } catch (error) {
            sendJSON(res, 500, {
                success: false,
                error: error.message
            });
        }
    }
    else if (path === '/api/discounts/realtime') {
        try {
            console.log('Getting real-time discounts...');
            const discounts = await getDiscounts();
            
            sendJSON(res, 200, {
                success: true,
                discounts: discounts,
                source: 'filmfreeway_debug_scraping',
                timestamp: new Date().toISOString(),
                total: discounts.length,
                cache_age: cacheTimestamp ? (Date.now() - cacheTimestamp) / 1000 : null,
                debug_info: {
                    html_length: rawHtmlCache ? rawHtmlCache.length : 0,
                    has_html: !!rawHtmlCache,
                    parsing_method: 'regex_patterns'
                }
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
            available_routes: ['/', '/api/health', '/api/discounts/realtime', '/api/discounts/search', '/api/debug/html', '/api/debug/raw']
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
    console.log(`🔍 Debug HTML: http://localhost:${PORT}/api/debug/html`);
    console.log('✅ Server started with debug scraping!');
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
