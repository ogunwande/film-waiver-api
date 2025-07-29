const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration for Chrome extensions
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow Chrome extension origins
    if (origin.startsWith('chrome-extension://') || 
        origin.startsWith('moz-extension://') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow the specific domains
    const allowedDomains = [
      'https://filmfreeway.com',
      'https://film-waiver-api-production.up.railway.app'
    ];
    
    if (allowedDomains.some(domain => origin.startsWith(domain))) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Sample waiver data (replace with your database later)
const waivers = [
  {
    id: 1,
    title: "Sundance Film Festival",
    description: "Premier independent film festival showcasing innovative storytelling",
    discount: "25% OFF",
    code: "SUNDANCE25",
    festival_url: "filmfreeway.com/sundance",
    offer: "Get 25% off your submission fee",
    festival_name: "Sundance Film Festival"
  },
  {
    id: 2,
    title: "Cannes Film Market",
    description: "International film festival and market in the French Riviera",
    discount: "15% OFF",
    code: "CANNES15",
    festival_url: "filmfreeway.com/cannes",
    offer: "Save 15% on market submissions",
    festival_name: "Cannes Film Market"
  },
  {
    id: 3,
    title: "SXSW Film Festival",
    description: "South by Southwest - Film, interactive media and music festival",
    discount: "30% OFF",
    code: "SXSW30",
    festival_url: "filmfreeway.com/sxsw",
    offer: "Huge 30% discount on all submissions",
    festival_name: "SXSW Film Festival"
  },
  {
    id: 4,
    title: "Toronto International Film Festival",
    description: "One of the world's largest publicly attended film festivals",
    discount: "20% OFF",
    code: "TIFF20",
    festival_url: "filmfreeway.com/tiff",
    offer: "20% off TIFF submissions",
    festival_name: "Toronto International Film Festival"
  },
  {
    id: 5,
    title: "Berlin International Film Festival",
    description: "Berlinale - Major international film festival held annually",
    discount: "18% OFF",
    code: "BERLIN18",
    festival_url: "filmfreeway.com/berlinale",
    offer: "18% savings on Berlinale entries",
    festival_name: "Berlin International Film Festival"
  },
  {
    id: 6,
    title: "Venice International Film Festival",
    description: "World's oldest film festival held annually in Venice, Italy",
    discount: "22% OFF",
    code: "VENICE22",
    festival_url: "filmfreeway.com/venice",
    offer: "22% discount for Venice submissions",
    festival_name: "Venice International Film Festival"
  },
  {
    id: 7,
    title: "Tribeca Film Festival",
    description: "Celebrating storytellers and diverse voices in cinema",
    discount: "12% OFF",
    code: "TRIBECA12",
    festival_url: "filmfreeway.com/tribeca",
    offer: "12% off your Tribeca submission",
    festival_name: "Tribeca Film Festival"
  },
  {
    id: 8,
    title: "Austin Film Festival",
    description: "Writers' festival focusing on screenwriters and filmmakers",
    discount: "25% OFF",
    code: "AUSTIN25",
    festival_url: "filmfreeway.com/austin",
    offer: "25% discount on script submissions",
    festival_name: "Austin Film Festival"
  }
];

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Film Waiver API is running!',
    version: '1.0.0',
    endpoints: ['/waivers', '/search', '/health'],
    timestamp: new Date().toISOString()
  });
});

app.get('/waivers', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 10;
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    
    const paginatedWaivers = waivers.slice(startIndex, endIndex);
    
    res.json(paginatedWaivers);
  } catch (error) {
    console.error('Error in /waivers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/search', (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 0;
    const limit = 10;
    
    if (!query) {
      return res.json([]);
    }
    
    const filtered = waivers.filter(waiver => 
      waiver.title.toLowerCase().includes(query.toLowerCase()) ||
      waiver.description.toLowerCase().includes(query.toLowerCase()) ||
      waiver.code.toLowerCase().includes(query.toLowerCase())
    );
    
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);
    
    res.json(paginatedResults);
  } catch (error) {
    console.error('Error in /search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy API endpoints for backwards compatibility
app.post('/api/v1/lookup', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 10;
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    
    const paginatedWaivers = waivers.slice(startIndex, endIndex);
    res.json(paginatedWaivers);
  } catch (error) {
    console.error('Error in /api/v1/lookup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/search', (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 0;
    const limit = 10;
    
    if (!query) {
      return res.json([]);
    }
    
    const filtered = waivers.filter(waiver => 
      waiver.title.toLowerCase().includes(query.toLowerCase()) ||
      waiver.description.toLowerCase().includes(query.toLowerCase()) ||
      waiver.code.toLowerCase().includes(query.toLowerCase())
    );
    
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);
    
    res.json(paginatedResults);
  } catch (error) {
    console.error('Error in /api/v1/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    waivers_count: waivers.length
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    available_endpoints: ['/waivers', '/search', '/health']
  });
});

app.listen(PORT, () => {
  console.log(`Film Waiver API running on port ${PORT}`);
  console.log(`Available at: http://localhost:${PORT}`);
  console.log(`Waivers loaded: ${waivers.length}`);
});
