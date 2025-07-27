const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['chrome-extension://*', 'https://*.chromium.org', 'https://*.chrome.com'],
  credentials: true
}));
app.use(express.json());

// Sample waiver data (replace with your database later)
const waivers = [
  {
    id: 1,
    title: "Sundance Film Festival",
    description: "Premier independent film festival showcasing innovative storytelling",
    discount: "25% OFF",
    code: "SUNDANCE25",
    festival_url: "filmfreeway.com/sundance"
  },
  {
    id: 2,
    title: "Cannes Film Market",
    description: "International film festival and market in the French Riviera",
    discount: "15% OFF",
    code: "CANNES15",
    festival_url: "filmfreeway.com/cannes"
  },
  {
    id: 3,
    title: "SXSW Film Festival",
    description: "South by Southwest - Film, interactive media and music festival",
    discount: "30% OFF",
    code: "SXSW30",
    festival_url: "filmfreeway.com/sxsw"
  },
  {
    id: 4,
    title: "Toronto International Film Festival",
    description: "One of the world's largest publicly attended film festivals",
    discount: "20% OFF",
    code: "TIFF20",
    festival_url: "filmfreeway.com/tiff"
  },
  {
    id: 5,
    title: "Berlin International Film Festival",
    description: "Berlinale - Major international film festival held annually",
    discount: "18% OFF",
    code: "BERLIN18",
    festival_url: "filmfreeway.com/berlinale"
  }
];

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Film Waiver API is running!',
    version: '1.0.0',
    endpoints: ['/waivers', '/search']
  });
});

app.get('/waivers', (req, res) => {
  res.json(waivers);
});

app.get('/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json(waivers);
  }
  
  const filtered = waivers.filter(waiver => 
    waiver.title.toLowerCase().includes(query.toLowerCase()) ||
    waiver.description.toLowerCase().includes(query.toLowerCase())
  );
  
  res.json(filtered);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Film Waiver API running on port ${PORT}`);
});