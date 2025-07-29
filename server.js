const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['chrome-extension://*', 'https://*.chromium.org', 'https://*.chrome.com', 'moz-extension://*'],
  credentials: true
}));
app.use(express.json());

// Enhanced waiver data with real-looking festival URLs and codes
const waivers = [
  {
    id: 1,
    festival_name: "Sundance Film Festival",
    description: "Premier independent film festival showcasing innovative storytelling",
    offer: "25% OFF submission fees",
    discount: "25% OFF",
    code: "SUNDANCE25",
    festival_url: "filmfreeway.com/sundancefilmfestival",
    category: "Major Festival",
    deadline: "2024-09-15",
    active: true
  },
  {
    id: 2,
    festival_name: "Cannes Film Market",
    description: "International film festival and market in the French Riviera",
    offer: "15% OFF all submissions",
    discount: "15% OFF",
    code: "CANNES15",
    festival_url: "filmfreeway.com/cannesfilmmarket",
    category: "International",
    deadline: "2024-08-30",
    active: true
  },
  {
    id: 3,
    festival_name: "SXSW Film Festival",
    description: "South by Southwest - Film, interactive media and music festival",
    offer: "30% OFF early bird submissions",
    discount: "30% OFF",
    code: "SXSW30",
    festival_url: "filmfreeway.com/sxsw",
    category: "Major Festival",
    deadline: "2024-10-01",
    active: true
  },
  {
    id: 4,
    festival_name: "Toronto International Film Festival",
    description: "One of the world's largest publicly attended film festivals",
    offer: "20% OFF submission fees",
    discount: "20% OFF",
    code: "TIFF20",
    festival_url: "filmfreeway.com/tiff",
    category: "International",
    deadline: "2024-09-20",
    active: true
  },
  {
    id: 5,
    festival_name: "Berlin International Film Festival",
    description: "Berlinale - Major international film festival held annually",
    offer: "18% OFF all categories",
    discount: "18% OFF",
    code: "BERLIN18",
    festival_url: "filmfreeway.com/berlinale",
    category: "International",
    deadline: "2024-11-15",
    active: true
  },
  {
    id: 6,
    festival_name: "Venice International Film Festival",
    description: "World's oldest film festival held annually in Venice, Italy",
    offer: "22% OFF submission fees",
    discount: "22% OFF",
    code: "VENICE22",
    festival_url: "filmfreeway.com/venicefilmfestival",
    category: "International",
    deadline: "2024-08-15",
    active: true
  },
  {
    id: 7,
    festival_name: "Tribeca Film Festival",
    description: "Celebrating storytelling in all its forms",
    offer: "15% OFF all submissions",
    discount: "15% OFF",
    code: "TRIBECA15",
    festival_url: "filmfreeway.com/tribecafilmfestival",
    category: "Major Festival",
    deadline: "2024-12-01",
    active: true
  },
  {
    id: 8,
    festival_name: "Austin Film Festival",
    description: "Celebrating writers and the craft of storytelling",
    offer: "25% OFF screenplay submissions",
    discount: "25% OFF",
    code: "AUSTIN25",
    festival_url: "filmfreeway.com/austinfilmfestival",
    category: "Regional",
    deadline: "2024-09-30",
    active: true
  },
  {
    id: 9,
    festival_name: "Fantastic Fest",
    description: "The largest genre film festival in the U.S.",
    offer: "20% OFF horror and sci-fi submissions",
    discount: "20% OFF",
    code: "FANTASTIC20",
    festival_url: "filmfreeway.com/fantasticfest",
    category: "Genre",
    deadline: "2024-07-31",
    active: true
  },
  {
    id: 10,
    festival_name: "New York Film Festival",
    description: "Showcasing the best in world cinema",
    offer: "12% OFF submission fees",
    discount: "12% OFF",
    code: "NYFF12",
    festival_url: "filmfreeway.com/newyorkfilmfestival",
    category: "Major Festival",
    deadline: "2024-08-01",
    active: true
  }
];

// Function to extract festival name from URL
function extractFestivalFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Extract festival identifier from FilmFreeway URLs
    if (urlObj.hostname.includes('filmfreeway.com')) {
      // Remove leading slash and get the festival identifier
      const festivalId = pathname.replace('/', '').split('/')[0];
      return festivalId.toLowerCase();
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
  }
  return null;
}

// Function to find waivers by URL
function findWaiversByUrl(urls) {
  const foundWaivers = [];
  
  urls.forEach(url => {
    const festivalId = extractFestivalFromUrl(url);
    
    if (festivalId) {
      // Find waivers that match this festival
      const matchingWaivers = waivers.filter(waiver => {
        const waiverFestivalId = waiver.festival_url.split('/').pop().toLowerCase();
        return waiverFestivalId.includes(festivalId) || 
               festivalId.includes(waiverFestivalId) ||
               waiver.festival_name.toLowerCase().replace(/\s+/g, '').includes(festivalId.replace(/[-_]/g, ''));
      });
      
      foundWaivers.push(...matchingWaivers);
    }
  });
  
  // Remove duplicates
  const uniqueWaivers = foundWaivers.filter((waiver, index, self) => 
    index === self.findIndex(w => w.id === waiver.id)
  );
  
  return uniqueWaivers;
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Film Waiver API is running!',
    version: '1.0.0',
    endpoints: [
      'GET /api/v1/lookup - Get waivers for specific URLs',
      'GET /api/v1/search - Search waivers',
      'GET /waivers - Get all waivers',
      'GET /health - Health check'
    ]
  });
});

// API v1 endpoints
app.post('/api/v1/lookup', (req, res) => {
  const { urls, page = 0 } = req.body;
  
  console.log('Lookup request:', { urls, page });
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ 
      error: 'URLs array is required',
      waivers: []
    });
  }
  
  // Find waivers matching the provided URLs
  const matchingWaivers = findWaiversByUrl(urls);
  
  // Implement pagination
  const pageSize = 10;
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedWaivers = matchingWaivers.slice(startIndex, endIndex);
  
  console.log(`Found ${matchingWaivers.length} waivers, returning page ${page} (${paginatedWaivers.length} items)`);
  
  res.json({
    waivers: paginatedWaivers,
    total: matchingWaivers.length,
    page: page,
    hasMore: endIndex < matchingWaivers.length
  });
});

app.get('/api/v1/search', (req, res) => {
  const { q: query, page = 0 } = req.query;
  
  console.log('Search request:', { query, page });
  
  let filteredWaivers = waivers;
  
  if (query && query.trim().length > 0) {
    const searchTerm = query.toLowerCase().trim();
    filteredWaivers = waivers.filter(waiver => 
      waiver.festival_name.toLowerCase().includes(searchTerm) ||
      waiver.description.toLowerCase().includes(searchTerm) ||
      waiver.offer.toLowerCase().includes(searchTerm) ||
      waiver.category.toLowerCase().includes(searchTerm)
    );
  }
  
  // Implement pagination
  const pageSize = 10;
  const startIndex = parseInt(page) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedWaivers = filteredWaivers.slice(startIndex, endIndex);
  
  console.log(`Search found ${filteredWaivers.length} waivers, returning page ${page} (${paginatedWaivers.length} items)`);
  
  res.json({
    waivers: paginatedWaivers,
    total: filteredWaivers.length,
    page: parseInt(page),
    hasMore: endIndex < filteredWaivers.length
  });
});

// Legacy endpoints for backward compatibility
app.get('/waivers', (req, res) => {
  res.json({
    waivers: waivers,
    total: waivers.length
  });
});

app.get('/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json({
      waivers: waivers,
      total: waivers.length
    });
  }
  
  const filtered = waivers.filter(waiver => 
    waiver.festival_name.toLowerCase().includes(query.toLowerCase()) ||
    waiver.description.toLowerCase().includes(query.toLowerCase()) ||
    waiver.offer.toLowerCase().includes(query.toLowerCase())
  );
  
  res.json({
    waivers: filtered,
    total: filtered.length
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    waiversCount: waivers.length
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    waivers: []
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    waivers: []
  });
});

app.listen(PORT, () => {
  console.log(`Film Waiver API running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  ${PORT}/ - API info`);
  console.log(`  POST ${PORT}/api/v1/lookup - Lookup waivers by URLs`);
  console.log(`  GET  ${PORT}/api/v1/search - Search waivers`);
  console.log(`  GET  ${PORT}/health - Health check`);
});
