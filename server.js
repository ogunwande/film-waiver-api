// Railway Server - Add this to your existing server code
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

// Add CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Real-time discounts endpoint
app.get('/api/discounts/realtime', async (req, res) => {
    try {
        console.log('Fetching real-time discounts from FilmFreeway...');
        
        // Check cache first
        const cachedDiscounts = cache.get('realtime_discounts');
        if (cachedDiscounts) {
            console.log('Returning cached discounts:', cachedDiscounts.length);
            return res.json({
                success: true,
                discounts: cachedDiscounts,
                source: 'cache',
                timestamp: new Date().toISOString()
            });
        }
        
        // Scrape fresh data
        const discounts = await scrapeFilmFreewayDiscounts();
        
        // Cache the results
        cache.set('realtime_discounts', discounts);
        
        console.log('Successfully scraped', discounts.length, 'discounts');
        res.json({
            success: true,
            discounts: discounts,
            source: 'live_scrape',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error fetching real-time discounts:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            discounts: []
        });
    }
});

// Search real-time discounts
app.get('/api/discounts/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        console.log('Searching real-time discounts for:', query);
        
        // Get all discounts (from cache or fresh scrape)
        let allDiscounts = cache.get('realtime_discounts');
        if (!allDiscounts) {
            allDiscounts = await scrapeFilmFreewayDiscounts();
            cache.set('realtime_discounts', allDiscounts);
        }
        
        // Filter by search query
        const filteredDiscounts = allDiscounts.filter(discount => {
            const searchText = `${discount.festival_name} ${discount.offer} ${discount.code}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
        
        res.json({
            success: true,
            discounts: filteredDiscounts,
            query: query,
            total_available: allDiscounts.length
        });
        
    } catch (error) {
        console.error('Error searching discounts:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            discounts: []
        });
    }
});

// Main scraping function
async function scrapeFilmFreewayDiscounts() {
    const discounts = [];
    
    try {
        // Request the discounts page with proper headers
        const response = await axios.get('https://filmfreeway.com/festivals/discounts', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        console.log('Successfully loaded FilmFreeway discounts page');
        
        // Try multiple selectors to find discount items
        const possibleSelectors = [
            '.festival-card',
            '.discount-card', 
            '.card',
            '.festival-item',
            '.discount-item',
            '[data-festival-id]',
            '.list-group-item',
            '.row .col-md-4',
            '.row .col-lg-4',
            '.row .col-sm-6',
            '.grid-item'
        ];
        
        let $discountElements = $();
        
        // Find the best selector
        for (const selector of possibleSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                $discountElements = elements;
                console.log(`Found ${elements.length} elements with selector: ${selector}`);
                break;
            }
        }
        
        // Fallback: look for elements containing discount code patterns
        if ($discountElements.length === 0) {
            console.log('No specific selectors worked, trying pattern matching...');
            $('div, section, article, li').each((i, element) => {
                const text = $(element).text();
                if (text && /\b[A-Z0-9]{4,12}\b/.test(text) && text.length < 1000) {
                    $discountElements = $discountElements.add(element);
                }
            });
        }
        
        console.log(`Processing ${$discountElements.length} potential discount elements`);
        
        // Extract data from each element
        $discountElements.each((index, element) => {
            try {
                const discount = extractDiscountData($, $(element));
                if (discount) {
                    discounts.push(discount);
                }
            } catch (e) {
                console.error(`Error processing element ${index}:`, e.message);
            }
        });
        
        // Remove duplicates based on code
        const uniqueDiscounts = discounts.filter((discount, index, self) => 
            index === self.findIndex(d => d.code === discount.code)
        );
        
        console.log(`Extracted ${uniqueDiscounts.length} unique discounts`);
        return uniqueDiscounts;
        
    } catch (error) {
        console.error('Error scraping FilmFreeway:', error.message);
        throw error;
    }
}

// Extract discount data from a single element
function extractDiscountData($, $element) {
    // Extract festival name
    let festivalName = '';
    const nameSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '.title', '.name', '.festival-name', '.festival-title'];
    
    for (const selector of nameSelectors) {
        const $nameEl = $element.find(selector).first();
        if ($nameEl.length && $nameEl.text().trim()) {
            festivalName = $nameEl.text().trim();
            // Clean up
            festivalName = festivalName.replace(/\s*-\s*FilmFreeway.*$/i, '');
            festivalName = festivalName.replace(/\s*\|\s*FilmFreeway.*$/i, '');
            break;
        }
    }
    
    // Fallback: look for festival-like text
    if (!festivalName) {
        const text = $element.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 5);
        for (const line of lines) {
            if (/festival|film|cinema|movie|competition/i.test(line) && line.length < 150 && line.length > 10) {
                festivalName = line;
                break;
            }
        }
    }
    
    // Extract discount code
    let discountCode = '';
    const codeSelectors = ['.code', '.discount-code', '.coupon-code', '.promo-code', '.badge', '.tag'];
    
    for (const selector of codeSelectors) {
        const $codeEl = $element.find(selector).first();
        if ($codeEl.length && $codeEl.text().trim()) {
            discountCode = $codeEl.text().trim();
            break;
        }
    }
    
    // Fallback: pattern matching for codes
    if (!discountCode) {
        const text = $element.text();
        const codeMatches = text.match(/\b([A-Z0-9]{4,12})\b/g);
        if (codeMatches) {
            // Filter for reasonable looking codes
            const goodCodes = codeMatches.filter(code => 
                code.length >= 4 && code.length <= 12 &&
                !/^\d+$/.test(code) && // Not just numbers
                !/^[A-Z]+$/.test(code) && // Not just letters
                !/^(THE|AND|FOR|WITH|FROM|FILM|FEST)$/.test(code) // Not common words
            );
            if (goodCodes.length > 0) {
                discountCode = goodCodes[0];
            }
        }
    }
    
    // Extract offer description
    let offer = '';
    const offerSelectors = ['.offer', '.discount', '.deal', '.description', '.savings', '.percent', 'p'];
    
    for (const selector of offerSelectors) {
        const $offerEl = $element.find(selector).first();
        if ($offerEl.length && $offerEl.text().trim() && 
            $offerEl.text().trim() !== festivalName && 
            $offerEl.text().trim() !== discountCode) {
            offer = $offerEl.text().trim();
            if (offer.length > 5) break;
        }
    }
    
    // Look for percentage/dollar offers in text
    if (!offer) {
        const text = $element.text();
        const offerMatch = text.match(/(\d+%\s*off|\$\d+\s*off|free\s*submission|waived\s*fees?|no\s*fee)/i);
        if (offerMatch) {
            offer = offerMatch[0];
        }
    }
    
    // Extract URL
    let url = '';
    const $linkEl = $element.find('a[href]').first();
    if ($linkEl.length) {
        url = $linkEl.attr('href');
        if (url && url.startsWith('/')) {
            url = 'https://filmfreeway.com' + url;
        }
    }
    
    // Only return if we have essential data
    if (festivalName && discountCode && 
        festivalName.length > 2 && discountCode.length >= 3) {
        return {
            festival_name: festivalName,
            code: discountCode,
            offer: offer || 'Discount available',
            url: url || '',
            scraped_at: new Date().toISOString(),
            source: 'filmfreeway_realtime'
        };
    }
    
    return null;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        cache_size: cache.keys().length
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Film Waiver API server running on port ${PORT}`);
});

module.exports = app;
