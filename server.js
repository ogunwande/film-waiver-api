const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['chrome-extension://*', 'https://*.chromium.org', 'https://*.chrome.com', 'https://filmfreeway.com'],
  credentials: true
}));
app.use(express.json());

// Sample waiver data with correct structure for popup.js
const waivers = [
  {
    id: 1,
    festival_name: "Sundance Film Festival",
    offer: "Get 25% off your submission fee to this premier independent film festival",
    code: "SUNDANCE25",
    discount: "25% OFF",
    description: "Premier independent film festival showcasing innovative storytelling",
    festival_url: "https://filmfreeway.com/sundance"
  },
  {
    id: 2,
    festival_name: "Cannes Film Market",
    offer: "Save 15% on your Cannes Film Market submission",
    code: "CANNES15",
    discount: "15% OFF",
    description: "International film festival and market in the French Riviera",
    festival_url: "https://filmfreeway.com/cannes"
  },
  {
    id: 3,
    festival_name: "SXSW Film Festival",
    offer: "Exclusive 30% discount for SXSW submissions",
    code: "SXSW30",
    discount: "30% OFF",
    description: "South by Southwest - Film, interactive media and music festival",
    festival_url: "https://filmfreeway.com/sxsw"
  },
  {
    id: 4,
    festival_name: "Toronto International Film Festival",
    offer: "20% off TIFF submission fees",
    code: "TIFF20",
    discount: "20% OFF",
    description: "One of the world's largest publicly attended film festivals",
    festival_url: "https://filmfreeway.com/tiff"
  },
  {
    id: 5,
    festival_name: "Berlin International Film Festival",
    offer: "Special 18% discount for Berlinale submissions",
    code: "BERLIN18",
    discount: "18% OFF",
    description: "Berlinale - Major international film festival held annually",
    festival_url: "https://filmfreeway.com/berlinale"
  },
  {
    id: 6,
    festival_name: "Venice International Film Festival",
    offer: "Save 22% on Venice Film Festival submissions",
    code: "VENICE22",
    discount: "22% OFF",
    description: "World's oldest film festival held annually in Venice, Italy",
    festival_url: "https://filmfreeway.com/venice"
  },
  {
    id: 7,
    festival_name: "Tribeca Film Festival",
    offer: "Get 20% off Tribeca submissions",
    code: "TRIBECA20",
    discount: "20% OFF",
    description: "Prestigious New York City film festival",
    festival_url: "https://filmfreeway.com/tribeca"
  },
  {
    id: 8,
    festival_name: "Edinburgh International Film Festival",
    offer: "15% discount on Edinburgh submissions",
    code: "EDINBURGH15",
    discount: "15% OFF",
    description: "World's longest continually running film festival",
    festival_url: "https://filmfreeway.com/edinburgh"
  }
];

// Helper function to paginate results
function paginateResults(data, page = 0, limit = 10) {
  const start = page * limit;
  const end = start + limit;
  return data.slice(start, end);
}

// Helper function to filter waivers by URLs (for lookup functionality)
function filterWaiversByUrls(urls) {
  if (!urls || urls.length === 0) {
    return waivers;
  }
  
  // For now, return all waivers since we don't have URL matching logic
  // In a real implementation, you'd match URLs to specific festivals
  return waivers;
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Film Waiver API is running!',
    version: '1.0.0',
    endpoints: ['/waivers', '/search', '/api/v1/lookup', '/api/v1/search']
  });
});

// Main waivers endpoint
app.get('/waivers', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const paginatedWaivers = paginateResults(waivers, page, limit);
    res.json(paginatedWaivers);
  } catch (error) {
    console.error('Error fetching waivers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint for lookup (used by background.js)
app.post('/waivers', (req, res) => {
  const { urls, page = 0 } = req.body;
  const limit = 10;
  
  try {
    const filteredWaivers = filterWaiversByUrls(urls);
    const paginatedWaivers = paginateResults(filteredWaivers, page, limit);
    res.json(paginatedWaivers);
  } catch (error) {
    console.error('Error in lookup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search endpoint
app.get('/search', (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  
  if (!query) {
    return res.json(paginateResults(waivers, page, limit));
  }
  
  try {
    const filtered = waivers.filter(waiver => 
      waiver.festival_name.toLowerCase().includes(query.toLowerCase()) ||
      waiver.description.toLowerCase().includes(query.toLowerCase()) ||
      waiver.offer.toLowerCase().includes(query.toLowerCase())
    );
    
    const paginatedResults = paginateResults(filtered, page, limit);
    res.json(paginatedResults);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy API endpoints for backward compatibility
app.post('/api/v1/lookup', (req, res) => {
  const { urls, page = 0 } = req.body;
  const limit = 10;
  
  try {
    const filteredWaivers = filterWaiversByUrls(urls);
    const paginatedWaivers = paginateResults(filteredWaivers, page, limit);
    res.json(paginatedWaivers);
  } catch (error) {
    console.error('Error in legacy lookup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/search', (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  
  if (!query) {
    return res.json(paginateResults(waivers, page, limit));
  }
  
  try {
    const filtered = waivers.filter(waiver => 
      waiver.festival_name.toLowerCase().includes(query.toLowerCase()) ||
      waiver.description.toLowerCase().includes(query.toLowerCase()) ||
      waiver.offer.toLowerCase().includes(query.toLowerCase())
    );
    
    const paginatedResults = paginateResults(filtered, page, limit);
    res.json(paginatedResults);
  } catch (error) {
    console.error('Error in legacy search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Film Waiver API running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`- GET  /waivers`);
  console.log(`- POST /waivers`);
  console.log(`- GET  /search`);
  console.log(`- POST /api/v1/lookup`);
  console.log(`- GET  /api/v1/search`);
  console.log(`- GET  /health`);
});
