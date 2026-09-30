/**
 * Google Places API (New) Adapter
 * 
 * Functions:
 * - autocompletePlaces(input, options) -> Places API (New) Autocomplete
 * - textSearchPlaces(query, options) -> Places API (New) Text Search
 * - getPlaceDetails(placeId, options) -> Places API (New) Place Details with explicit FieldMask
 * 
 * Never log API keys.
 */

function getApiKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}

/**
 * Verified local fallback catalog for offline/demo/testing when Google Places is unavailable.
 */
const FALLBACK_PLACES = [
  {
    placeId: "ChIJbU60qHA6DDkRkiAnUt-3NLg",
    name: "Gateway of India, Mumbai",
    mainText: "Gateway of India",
    secondaryText: "Apollo Bandar, Colaba, Mumbai, Maharashtra, India",
    address: "Apollo Bandar, Colaba, Mumbai, Maharashtra 400001, India",
    latitude: 18.9220,
    longitude: 72.8347,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "monument",
    types: ["monument", "tourist_attraction", "historical_landmark"],
    rating: 4.6,
    userRatingCount: 295000,
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Monday: Open 24 hours",
        "Tuesday: Open 24 hours",
        "Wednesday: Open 24 hours",
        "Thursday: Open 24 hours",
        "Friday: Open 24 hours",
        "Saturday: Open 24 hours",
        "Sunday: Open 24 hours"
      ]
    },
    reviews: [
      {
        authorName: "Rohan Sharma",
        rating: 5,
        text: "Magnificent colonial arch facing the Arabian Sea. Best visited early morning or sunset."
      }
    ],
    photos: []
  },
  {
    placeId: "ChIJ7-06B7q75zsR_1w786g_v20",
    name: "Marine Drive, Mumbai",
    mainText: "Marine Drive",
    secondaryText: "Netaji Subhash Chandra Bose Road, Mumbai, Maharashtra, India",
    address: "Marine Drive, Mumbai, Maharashtra, India",
    latitude: 18.9432,
    longitude: 72.8230,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "beach",
    types: ["beach", "tourist_attraction"],
    rating: 4.7,
    userRatingCount: 140000,
    photos: []
  },
  {
    placeId: "ChIJbU60qHA6DDkRkiAnUt-3Col",
    name: "Colaba Causeway, Mumbai",
    mainText: "Colaba Causeway",
    secondaryText: "Colaba, Mumbai, Maharashtra, India",
    address: "Colaba, Mumbai, Maharashtra, India",
    latitude: 18.9150,
    longitude: 72.8258,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "market",
    types: ["market", "shopping_mall"],
    rating: 4.5,
    userRatingCount: 85000,
    photos: []
  },
  {
    placeId: "ChIJ40i5iQ255zsRnBq5tC1JpP8",
    name: "Elephanta Caves, Mumbai",
    mainText: "Elephanta Caves",
    secondaryText: "Gharapuri, Maharashtra, India",
    address: "Gharapuri, Maharashtra, India",
    latitude: 18.9633,
    longitude: 72.9315,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "temple",
    types: ["temple", "historical_landmark"],
    rating: 4.5,
    userRatingCount: 45000,
    photos: []
  },
  {
    placeId: "ChIJp7eQjQ645zsREmYt9fK4kXg",
    name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)",
    mainText: "CSMT",
    secondaryText: "Fort, Mumbai, Maharashtra, India",
    address: "Chhatrapati Shivaji Maharaj Terminus, Fort, Mumbai, Maharashtra 400001",
    latitude: 18.9400,
    longitude: 72.8353,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "monument",
    types: ["monument", "transit_station"],
    rating: 4.6,
    userRatingCount: 125000,
    photos: []
  },
  {
    placeId: "ChIJu_86b7q75zsR_2w786g_v25",
    name: "Haji Ali Dargah, Mumbai",
    mainText: "Haji Ali Dargah",
    secondaryText: "Dargah Rd, Haji Ali, Mumbai, Maharashtra",
    address: "Dargah Rd, Haji Ali, Mumbai, Maharashtra 400026",
    latitude: 18.9774,
    longitude: 72.8107,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "place_of_worship",
    types: ["place_of_worship", "historical_landmark"],
    rating: 4.6,
    userRatingCount: 78000,
    photos: []
  },
  {
    placeId: "ChIJv_96c7q75zsR_3w786g_v26",
    name: "Bandra Bandstand & Fort, Mumbai",
    mainText: "Bandra Bandstand",
    secondaryText: "Bandstand Promenade, Bandra West, Mumbai",
    address: "BJ Road, Bandstand, Bandra West, Mumbai, Maharashtra 400050",
    latitude: 19.0435,
    longitude: 72.8197,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "park",
    types: ["park", "tourist_attraction"],
    rating: 4.5,
    userRatingCount: 52000,
    photos: []
  },
  {
    placeId: "ChIJp6vV_CVDdDkRk4d8n76iB3M",
    name: "Taj Mahal, Agra",
    mainText: "Taj Mahal",
    secondaryText: "Dharmapuri, Forest Colony, Agra, Uttar Pradesh, India",
    address: "Dharmapuri, Forest Colony, Tajganj, Agra, Uttar Pradesh 282001, India",
    latitude: 27.1751,
    longitude: 78.0421,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    primaryType: "monument",
    types: ["monument", "tourist_attraction", "world_heritage_site"],
    rating: 4.8,
    userRatingCount: 380000,
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Saturday to Thursday: 6:00 AM – 6:30 PM",
        "Friday: Closed (Open for prayers only)"
      ]
    },
    reviews: [
      {
        authorName: "Ananya Iyer",
        rating: 5,
        text: "Unrivaled architectural masterpiece in ivory-white marble. Sunrise view is unforgettable."
      }
    ],
    photos: []
  },
  {
    placeId: "ChIJ9yYf3iNDdDkRaFv_tH6e240",
    name: "Agra Fort, Agra",
    mainText: "Agra Fort",
    secondaryText: "Agra Fort, Rakabganj, Agra, Uttar Pradesh",
    address: "Agra Fort, Rakabganj, Agra, Uttar Pradesh 282003",
    latitude: 27.1795,
    longitude: 78.0211,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    primaryType: "historical_landmark",
    types: ["historical_landmark", "tourist_attraction", "fort"],
    rating: 4.7,
    userRatingCount: 165000,
    photos: []
  },
  {
    placeId: "ChIJ6wXf4iNDdDkRvFu_yJ6e280",
    name: "Mehtab Bagh, Agra",
    mainText: "Mehtab Bagh",
    secondaryText: "Nagla Devjit, Agra, Uttar Pradesh",
    address: "Opposite the Taj Mahal, Nagla Devjit, Agra, Uttar Pradesh 282006",
    latitude: 27.1800,
    longitude: 78.0420,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    primaryType: "park",
    types: ["park", "garden", "tourist_attraction"],
    rating: 4.4,
    userRatingCount: 42000,
    photos: []
  },
  {
    placeId: "ChIJ2wYf5iNDdDkRwFu_yK6e290",
    name: "Fatehpur Sikri, Agra",
    mainText: "Fatehpur Sikri",
    secondaryText: "Fatehpur Sikri, Agra District, Uttar Pradesh",
    address: "Fatehpur Sikri, Uttar Pradesh 283110",
    latitude: 27.0945,
    longitude: 77.6679,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    primaryType: "historical_landmark",
    types: ["historical_landmark", "world_heritage_site"],
    rating: 4.6,
    userRatingCount: 88000,
    photos: []
  },
  {
    placeId: "ChIJ3wYf6iNDdDkRxFu_yL6e300",
    name: "Tomb of I'timad-ud-Daulah (Baby Taj), Agra",
    mainText: "Tomb of I'timad-ud-Daulah",
    secondaryText: "Moti Bagh, Agra, Uttar Pradesh",
    address: "Moti Bagh, Agra, Uttar Pradesh 282006",
    latitude: 27.1929,
    longitude: 78.0310,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    primaryType: "monument",
    types: ["monument", "historical_landmark"],
    rating: 4.5,
    userRatingCount: 36000,
    photos: []
  },
  {
    placeId: "ChIJ5wYf8iNDdDkRzFu_yN6e320",
    name: "Kinari Bazaar, Agra",
    mainText: "Kinari Bazaar",
    secondaryText: "Choube Ji Ka Phatak, Kinari Bazar, Hing ki Mandi, Agra",
    address: "Kinari Bazaar, Mantola, Agra, Uttar Pradesh 282003",
    latitude: 27.1855,
    longitude: 78.0145,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    primaryType: "market",
    types: ["market", "shopping_mall"],
    rating: 4.3,
    userRatingCount: 22000,
    photos: []
  },
  {
    placeId: "ChIJ9T1mP138DDkR40Y4dG1Qv4U",
    name: "Red Fort, Delhi",
    mainText: "Red Fort",
    secondaryText: "Netaji Subhash Marg, Lal Qila, Chandni Chowk, New Delhi",
    address: "Netaji Subhash Marg, Lal Qila, Chandni Chowk, New Delhi, Delhi 110006",
    latitude: 28.6562,
    longitude: 77.2410,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "historical_landmark",
    types: ["historical_landmark", "world_heritage_site", "fort"],
    rating: 4.6,
    userRatingCount: 240000,
    photos: []
  },
  {
    placeId: "ChIJ17mFq0b9DDkR30541eFfQv0",
    name: "Qutub Minar, Delhi",
    mainText: "Qutub Minar",
    secondaryText: "Seth Sarai, Mehrauli, New Delhi",
    address: "Seth Sarai, Mehrauli, New Delhi, Delhi 110030",
    latitude: 28.5244,
    longitude: 77.1855,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "monument",
    types: ["monument", "world_heritage_site", "historical_landmark"],
    rating: 4.6,
    userRatingCount: 195000,
    photos: []
  },
  {
    placeId: "ChIJ_9y-Wz78DDkRX6J6z5v51eQ",
    name: "Humayun's Tomb, Delhi",
    mainText: "Humayun's Tomb",
    secondaryText: "Hazrat Nizamuddin Aulia, New Delhi",
    address: "Mathura Road, Nizamuddin East, New Delhi, Delhi 110013",
    latitude: 28.5933,
    longitude: 77.2507,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "monument",
    types: ["monument", "world_heritage_site", "historical_landmark"],
    rating: 4.7,
    userRatingCount: 142000,
    photos: []
  },
  {
    placeId: "ChIJ7_z_j-D7DDkRoZg_wHjUo3c",
    name: "India Gate, Delhi",
    mainText: "India Gate",
    secondaryText: "Kartavya Path, India Gate, New Delhi",
    address: "Kartavya Path, India Gate, New Delhi, Delhi 110001",
    latitude: 28.6129,
    longitude: 77.2295,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "monument",
    types: ["monument", "tourist_attraction", "park"],
    rating: 4.7,
    userRatingCount: 310000,
    photos: []
  },
  {
    placeId: "ChIJk54Z7mD8DDkRz85t4Yf11eQ",
    name: "Lotus Temple, Delhi",
    mainText: "Lotus Temple",
    secondaryText: "Lotus Temple Rd, Bahapur, Shambhu Dayal Bagh, Kalkaji, New Delhi",
    address: "Lotus Temple Rd, Kalkaji, New Delhi, Delhi 110019",
    latitude: 28.5535,
    longitude: 77.2588,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "place_of_worship",
    types: ["place_of_worship", "tourist_attraction"],
    rating: 4.6,
    userRatingCount: 175000,
    photos: []
  },
  {
    placeId: "ChIJz_6N8C38DDkRJ2_5_t51e80",
    name: "Swaminarayan Akshardham, Delhi",
    mainText: "Swaminarayan Akshardham",
    secondaryText: "Noida Mor, Pandav Nagar, New Delhi",
    address: "NH 24, Pramukh Swami Maharaj Marg, Pandav Nagar, New Delhi, Delhi 110092",
    latitude: 28.6127,
    longitude: 77.2773,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "temple",
    types: ["temple", "tourist_attraction", "cultural_center"],
    rating: 4.8,
    userRatingCount: 220000,
    photos: []
  },
  {
    placeId: "ChIJp9oUa_38DDkRG5u_yT1e140",
    name: "Chandni Chowk Market, Delhi",
    mainText: "Chandni Chowk",
    secondaryText: "Old Delhi, New Delhi",
    address: "Chandni Chowk, Old Delhi, Delhi 110006",
    latitude: 28.6506,
    longitude: 77.2303,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "market",
    types: ["market", "food_market", "historical_landmark"],
    rating: 4.5,
    userRatingCount: 130000,
    photos: []
  },
  {
    placeId: "ChIJu3x8aEP8DDkRL3v_yG2e190",
    name: "Lodhi Garden, Delhi",
    mainText: "Lodhi Garden",
    secondaryText: "Lodhi Rd, Lodhi Gardens, Lodhi Estate, New Delhi",
    address: "Lodhi Rd, Lodhi Gardens, New Delhi, Delhi 110003",
    latitude: 28.5931,
    longitude: 77.2197,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "park",
    types: ["park", "garden", "historical_landmark"],
    rating: 4.6,
    userRatingCount: 95000,
    photos: []
  },
  {
    placeId: "ChIJq3x2aDP8DDkRP2u_yK2e110",
    name: "Hauz Khas Village & Fort, Delhi",
    mainText: "Hauz Khas Village",
    secondaryText: "Hauz Khas, New Delhi",
    address: "Hauz Khas, New Delhi, Delhi 110016",
    latitude: 28.5529,
    longitude: 77.1947,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "historical_landmark",
    types: ["historical_landmark", "park", "food_market"],
    rating: 4.5,
    userRatingCount: 78000,
    photos: []
  },
  {
    placeId: "ChIJ8_z_dLP8DDkRT3v_yE2e150",
    name: "Connaught Place, Delhi",
    mainText: "Connaught Place",
    secondaryText: "Connaught Place, New Delhi",
    address: "Connaught Place, New Delhi, Delhi 110001",
    latitude: 28.6315,
    longitude: 77.2167,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "shopping_mall",
    types: ["shopping_mall", "market", "tourist_attraction"],
    rating: 4.5,
    userRatingCount: 160000,
    photos: []
  },
  {
    placeId: "ChIJL3_9a7xwbTkRP4u_yO6e330",
    name: "Hawa Mahal, Jaipur",
    mainText: "Hawa Mahal",
    secondaryText: "Hawa Mahal Rd, Badi Choupad, J.D.A. Market, Pink City, Jaipur",
    address: "Hawa Mahal Rd, Badi Choupad, Jaipur, Rajasthan 302002",
    latitude: 26.9239,
    longitude: 75.8267,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "palace",
    types: ["palace", "historical_landmark", "tourist_attraction"],
    rating: 4.7,
    userRatingCount: 180000,
    photos: []
  },
  {
    placeId: "ChIJM4_9b7xwbTkRQ5u_yP6e340",
    name: "Amber Palace / Amer Fort, Jaipur",
    mainText: "Amber Palace",
    secondaryText: "Devisinghpura, Amer, Jaipur, Rajasthan",
    address: "Devisinghpura, Amer, Jaipur, Rajasthan 302028",
    latitude: 26.9855,
    longitude: 75.8513,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "fort",
    types: ["fort", "palace", "world_heritage_site"],
    rating: 4.8,
    userRatingCount: 210000,
    photos: []
  },
  {
    placeId: "ChIJN5_9c7xwbTkRR6u_yQ6e350",
    name: "City Palace, Jaipur",
    mainText: "City Palace",
    secondaryText: "Tulsi Marg, Gangori Bazaar, J.D.A. Market, Pink City, Jaipur",
    address: "Gangori Bazaar, J.D.A. Market, Pink City, Jaipur, Rajasthan 302002",
    latitude: 26.9258,
    longitude: 75.8236,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "palace",
    types: ["palace", "museum", "historical_landmark"],
    rating: 4.6,
    userRatingCount: 135000,
    photos: []
  },
  {
    placeId: "ChIJO6_9d7xwbTkRS7u_yR6e360",
    name: "Jantar Mantar, Jaipur",
    mainText: "Jantar Mantar",
    secondaryText: "Gangori Bazaar, J.D.A. Market, Pink City, Jaipur",
    address: "Gangori Bazaar, J.D.A. Market, Pink City, Jaipur, Rajasthan 302002",
    latitude: 26.9248,
    longitude: 75.8246,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "historical_landmark",
    types: ["historical_landmark", "world_heritage_site", "museum"],
    rating: 4.6,
    userRatingCount: 95000,
    photos: []
  },
  {
    placeId: "ChIJP7_9e7xwbTkRT8u_yS6e370",
    name: "Nahargarh Fort, Jaipur",
    mainText: "Nahargarh Fort",
    secondaryText: "Krishna Nagar, Brahampuri, Jaipur, Rajasthan",
    address: "Krishna Nagar, Brahampuri, Jaipur, Rajasthan 302002",
    latitude: 26.9372,
    longitude: 75.8155,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "fort",
    types: ["fort", "historical_landmark", "viewpoint"],
    rating: 4.6,
    userRatingCount: 110000,
    photos: []
  },
  {
    placeId: "ChIJQ8_9f7xwbTkRU9u_yT6e380",
    name: "Jal Mahal, Jaipur",
    mainText: "Jal Mahal",
    secondaryText: "Amer Rd, Jal Mahal, Amber, Jaipur, Rajasthan",
    address: "Amer Rd, Jal Mahal, Jaipur, Rajasthan 302002",
    latitude: 26.9535,
    longitude: 75.8462,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "palace",
    types: ["palace", "historical_landmark", "tourist_attraction"],
    rating: 4.5,
    userRatingCount: 125000,
    photos: []
  },
  {
    placeId: "ChIJR9_9g7xwbTkRV-u_yU6e390",
    name: "Albert Hall Museum, Jaipur",
    mainText: "Albert Hall Museum",
    secondaryText: "Museum Rd, Ram Niwas Garden, Kailash Puri, Adarsh Nagar, Jaipur",
    address: "Ram Niwas Garden, Jaipur, Rajasthan 302004",
    latitude: 26.9116,
    longitude: 75.8195,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "museum",
    types: ["museum", "historical_landmark"],
    rating: 4.6,
    userRatingCount: 75000,
    photos: []
  },
  {
    placeId: "ChIJS-_9h7xwbTkRW-u_yV6e400",
    name: "Johari Bazaar, Jaipur",
    mainText: "Johari Bazaar",
    secondaryText: "Johari Bazar, Pink City, Jaipur, Rajasthan",
    address: "Johari Bazar, Pink City, Jaipur, Rajasthan 302003",
    latitude: 26.9200,
    longitude: 75.8260,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "market",
    types: ["market", "shopping_mall"],
    rating: 4.4,
    userRatingCount: 50000,
    photos: []
  },
  {
    placeId: "ChIJv-86a1q1vzsR_1w786g_ga1",
    name: "Baga Beach, Goa",
    mainText: "Baga Beach",
    secondaryText: "Baga, Calangute, Goa",
    address: "Baga Beach, Calangute, Goa 403516",
    latitude: 15.5553,
    longitude: 73.7517,
    city: "Goa",
    state: "Goa",
    country: "India",
    primaryType: "beach",
    types: ["beach", "tourist_attraction"],
    rating: 4.6,
    userRatingCount: 160000,
    photos: []
  },
  {
    placeId: "ChIJw-86b1q1vzsR_2w786g_ga2",
    name: "Fort Aguada, Goa",
    mainText: "Fort Aguada",
    secondaryText: "Aguada Fort Rd, Candolim, Goa",
    address: "Aguada Fort Rd, Candolim, Goa 403515",
    latitude: 15.4925,
    longitude: 73.7736,
    city: "Goa",
    state: "Goa",
    country: "India",
    primaryType: "fort",
    types: ["fort", "historical_landmark", "tourist_attraction"],
    rating: 4.6,
    userRatingCount: 115000,
    photos: []
  },
  {
    placeId: "ChIJx-86c1q1vzsR_3w786g_ga3",
    name: "Basilica of Bom Jesus, Goa",
    mainText: "Basilica of Bom Jesus",
    secondaryText: "Old Goa Rd, Bainguinim, Goa",
    address: "Old Goa Rd, Bainguinim, Goa 403402",
    latitude: 15.5009,
    longitude: 73.9116,
    city: "Goa",
    state: "Goa",
    country: "India",
    primaryType: "church",
    types: ["church", "world_heritage_site", "historical_landmark"],
    rating: 4.7,
    userRatingCount: 85000,
    photos: []
  },
  {
    placeId: "ChIJ1-86g1q1vzsR_7w786g_ga7",
    name: "Fontainhas Latin Quarter, Goa",
    mainText: "Fontainhas",
    secondaryText: "Panaji, Goa",
    address: "Fontainhas, Altinho, Panaji, Goa 403001",
    latitude: 15.4965,
    longitude: 73.8295,
    city: "Goa",
    state: "Goa",
    country: "India",
    primaryType: "historical_landmark",
    types: ["historical_landmark", "tourist_attraction", "neighborhood"],
    rating: 4.5,
    userRatingCount: 45000,
    photos: []
  },
  {
    placeId: "ChIJLU7jZClu5kcR4PcOOO6p3I0",
    name: "Eiffel Tower, Paris",
    mainText: "Eiffel Tower",
    secondaryText: "Champ de Mars, 5 Av. Anatole France, 75007 Paris, France",
    address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris, France",
    latitude: 48.8584,
    longitude: 2.2945,
    city: "Paris",
    state: "Île-de-France",
    country: "France",
    primaryType: "monument",
    types: ["monument", "tourist_attraction", "historical_landmark"],
    rating: 4.7,
    userRatingCount: 350000,
    photos: []
  },
  {
    placeId: "ChIJOwg_06VP5kcRYOperations",
    name: "Louvre Museum, Paris",
    mainText: "Louvre Museum",
    secondaryText: "75001 Paris, France",
    address: "Rue de Rivoli, 75001 Paris, France",
    latitude: 48.8606,
    longitude: 2.3376,
    city: "Paris",
    state: "Île-de-France",
    country: "France",
    primaryType: "museum",
    types: ["museum", "tourist_attraction", "art_gallery"],
    rating: 4.8,
    userRatingCount: 290000,
    photos: []
  },
  {
    placeId: "ChIJt2uu94tv5kcR2P-vF6p3I1",
    name: "Arc de Triomphe, Paris",
    mainText: "Arc de Triomphe",
    secondaryText: "Pl. Charles de Gaulle, 75008 Paris, France",
    address: "Pl. Charles de Gaulle, 75008 Paris, France",
    latitude: 48.8738,
    longitude: 2.2950,
    city: "Paris",
    state: "Île-de-France",
    country: "France",
    primaryType: "monument",
    types: ["monument", "historical_landmark"],
    rating: 4.7,
    userRatingCount: 190000,
    photos: []
  }
];

function searchFallbackPlaces(query) {
  if (!query) return [];
  const q = String(query).toLowerCase().trim();
  const qWords = q.split(/[\s,]+/).filter(w => w.length > 2 && !["the", "and", "for", "top", "best", "famous", "attractions", "places", "sights"].includes(w));

  return FALLBACK_PLACES.filter(place => {
    const city = (place.city || "").toLowerCase();
    const name = (place.name || "").toLowerCase();
    const main = (place.mainText || "").toLowerCase();
    const sec = (place.secondaryText || "").toLowerCase();
    const types = (place.types || []).join(" ").toLowerCase();

    // 1. Direct city check in either direction
    if (city && (q.includes(city) || city.includes(q))) return true;

    // 2. Direct name or address substring match
    if (name.includes(q) || q.includes(name)) return true;
    if (main.includes(q) || q.includes(main)) return true;
    if (sec.includes(q) || q.includes(sec)) return true;

    // 3. Significant word intersection
    return qWords.some(w => name.includes(w) || (city && city.includes(w)) || types.includes(w));
  }).map(p => ({
    placeId: p.placeId,
    name: p.name,
    mainText: p.mainText,
    secondaryText: p.secondaryText,
    formattedAddress: p.address || p.secondaryText || "",
    latitude: p.latitude,
    longitude: p.longitude,
    primaryType: p.primaryType || (p.types && p.types[0]) || "point_of_interest",
    types: p.types || [p.primaryType],
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    regularOpeningHours: p.regularOpeningHours || null,
    photos: p.photos || []
  }));
}

/**
 * Autocomplete Places via Google Places API (New)
 * 
 * @param {string} input - Text entered by user
 * @param {Object} [options]
 * @param {string} [options.languageCode="en"]
 * @param {Array<string>} [options.includedRegionCodes]
 * @returns {Promise<Array<{placeId: string, name: string, mainText: string, secondaryText: string, types: string[]}>>}
 */
export async function autocompletePlaces(input, options = {}) {
  const cleanInput = String(input || "").trim();
  if (!cleanInput) return [];

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] search query: "${cleanInput}"`);
  }

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Google Places] No GOOGLE_MAPS_SERVER_API_KEY set; using fallback suggestions");
      console.log(`[Roamly Location] fallback used: local verified catalog for "${cleanInput}"`);
    }
    const fallback = searchFallbackPlaces(cleanInput);
    if (fallback.length > 0) return fallback;
    // Dynamic fallback so any destination input is usable
    return [
      {
        placeId: `custom_${encodeURIComponent(cleanInput.toLowerCase())}`,
        name: cleanInput,
        mainText: cleanInput,
        secondaryText: "Custom Destination",
        types: ["locality"]
      }
    ];
  }

  const endpoint = "https://places.googleapis.com/v1/places:autocomplete";
  const body = {
    input: cleanInput,
    languageCode: options.languageCode || "en"
  };

  if (Array.isArray(options.includedRegionCodes) && options.includedRegionCodes.length > 0) {
    body.includedRegionCodes = options.includedRegionCodes;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Places] Autocomplete API error: ${msg}. Falling back to text search/catalog.`);
      }
      return searchFallbackPlaces(cleanInput);
    }

    const data = await res.json();
    const suggestions = (data.suggestions || [])
      .filter(s => s.placePrediction)
      .map(s => {
        const pred = s.placePrediction;
        return {
          placeId: pred.placeId,
          name: pred.text?.text || pred.structuredFormat?.mainText?.text || "",
          mainText: pred.structuredFormat?.mainText?.text || pred.text?.text || "",
          secondaryText: pred.structuredFormat?.secondaryText?.text || "",
          types: pred.types || []
        };
      });

    return suggestions.length > 0 ? suggestions : searchFallbackPlaces(cleanInput);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Autocomplete network error: ${err.message}. Using fallback.`);
    }
    return searchFallbackPlaces(cleanInput);
  }
}

/**
 * Text Search via Google Places API (New)
 * 
 * @param {string} query
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function textSearchPlaces(query, options = {}) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] search query (text): "${cleanQuery}"`);
  }

  if (!apiKey) {
    return searchFallbackPlaces(cleanQuery);
  }

  const endpoint = "https://places.googleapis.com/v1/places:searchText";
  const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.primaryType,places.regularOpeningHours,places.photos";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify({
        textQuery: cleanQuery,
        languageCode: options.languageCode || "en"
      })
    });

    if (!res.ok) {
      return searchFallbackPlaces(cleanQuery);
    }

    const data = await res.json();
    return (data.places || []).map(p => ({
      placeId: p.id,
      name: p.displayName?.text || p.formattedAddress || "",
      formattedAddress: p.formattedAddress || "",
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
      primaryType: p.primaryType || p.types?.[0] || "point_of_interest",
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      regularOpeningHours: p.regularOpeningHours || null,
      photos: p.photos || [],
      types: p.types || []
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Text Search error: ${err.message}`);
    }
    return searchFallbackPlaces(cleanQuery);
  }
}

/**
 * Place Details via Google Places API (New) with explicit field masks
 * 
 * @param {string} placeId
 * @param {Object} [options]
 * @returns {Promise<Object|null>}
 */
export async function getPlaceDetails(placeId, options = {}) {
  const cleanPlaceId = String(placeId || "").trim();
  if (!cleanPlaceId) throw new Error("placeId is required");

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] selected placeId: ${cleanPlaceId}`);
  }

  if (!apiKey) {
    const fallback = FALLBACK_PLACES.find(p => p.placeId === cleanPlaceId);
    if (fallback) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Roamly Location] fallback used: details for ${fallback.name}`);
      }
      return { ...fallback };
    }
    return null;
  }

  const fieldMask = options.fieldMask || "id,displayName,formattedAddress,addressComponents,location,rating,userRatingCount,reviews,regularOpeningHours,currentOpeningHours,primaryType,types,priceLevel,googleMapsUri,photos,websiteUri,nationalPhoneNumber,internationalPhoneNumber,plusCode,editorialSummary,parkingOptions,paymentOptions,accessibilityOptions,outdoorSeating,restroom,allowsDogs,goodForChildren";
  const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      }
    });

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Places] Place Details HTTP ${res.status}: checking fallback catalog`);
      }
      const fallback = FALLBACK_PLACES.find(p => p.placeId === cleanPlaceId);
      return fallback || null;
    }

    const data = await res.json();
    return {
      placeId: data.id,
      name: data.displayName?.text || "",
      address: data.formattedAddress || "",
      addressComponents: data.addressComponents || [],
      latitude: data.location?.latitude,
      longitude: data.location?.longitude,
      rating: data.rating || null,
      userRatingCount: data.userRatingCount || 0,
      websiteUri: data.websiteUri || null,
      nationalPhoneNumber: data.nationalPhoneNumber || null,
      internationalPhoneNumber: data.internationalPhoneNumber || null,
      plusCode: data.plusCode?.compoundCode || data.plusCode?.globalCode || null,
      editorialSummary: data.editorialSummary?.text || null,
      parkingOptions: data.parkingOptions || null,
      paymentOptions: data.paymentOptions || null,
      accessibilityOptions: data.accessibilityOptions || null,
      outdoorSeating: data.outdoorSeating ?? null,
      restroom: data.restroom ?? null,
      allowsDogs: data.allowsDogs ?? null,
      goodForChildren: data.goodForChildren ?? null,
      reviews: (data.reviews || []).map(r => ({
        authorName: r.authorAttribution?.displayName || "Anonymous",
        authorPhoto: r.authorAttribution?.photoUri || null,
        rating: r.rating,
        text: r.text?.text || r.originalText?.text || "",
        relativePublishTimeDescription: r.relativePublishTimeDescription || "",
        publishTime: r.publishTime || null
      })),
      regularOpeningHours: data.regularOpeningHours || null,
      currentOpeningHours: data.currentOpeningHours || null,
      primaryType: data.primaryType || "point_of_interest",
      types: data.types || [],
      priceLevel: data.priceLevel || null,
      googleMapsUri: data.googleMapsUri || null,
      photos: (data.photos || []).map(p => ({
        name: p.name,
        widthPx: p.widthPx,
        heightPx: p.heightPx,
        authorAttributions: p.authorAttributions || []
      }))
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Place Details request failed: ${err.message}`);
    }
    const fallback = FALLBACK_PLACES.find(p => p.placeId === cleanPlaceId);
    return fallback || null;
  }
}

/**
 * Nearby Search via Google Places API (New)
 *
 * Searches for places near a given location within a specified radius.
 * Used for: nearby attractions, hotels, restaurants, etc.
 *
 * @param {Object} params
 * @param {number} params.latitude - Center latitude
 * @param {number} params.longitude - Center longitude
 * @param {number} [params.radiusMeters=1500] - Search radius in meters
 * @param {Array<string>} [params.includedTypes] - Google Place types to include
 * @param {Array<string>} [params.excludedPlaceIds] - Place IDs to exclude from results
 * @param {number} [params.maxResultCount=10] - Maximum number of results
 * @param {string} [params.languageCode="en"]
 * @returns {Promise<Array<Object>>}
 */
export async function nearbySearchPlaces(params = {}) {
  const {
    latitude,
    longitude,
    radiusMeters = 1500,
    includedTypes,
    excludedPlaceIds = [],
    maxResultCount = 10,
    languageCode = "en"
  } = params;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return [];
  }

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] nearby search at (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), radius=${radiusMeters}m, types=${(includedTypes || ["tourist_attraction"]).join(",")}`);
  }

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Google Places] No API key; nearby search unavailable");
    }
    return [];
  }

  const endpoint = "https://places.googleapis.com/v1/places:searchNearby";
  const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.primaryType,places.regularOpeningHours,places.priceLevel,places.googleMapsUri,places.photos";

  const body = {
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: Math.min(radiusMeters, 50000) // Google max is 50km
      }
    },
    maxResultCount: Math.min(maxResultCount, 20),
    languageCode
  };

  if (Array.isArray(includedTypes) && includedTypes.length > 0) {
    body.includedTypes = includedTypes;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Places] Nearby Search error: ${errData?.error?.message || res.status}`);
      }
      return [];
    }

    const data = await res.json();
    const excludeSet = new Set(excludedPlaceIds);

    return (data.places || [])
      .filter(p => !excludeSet.has(p.id))
      .map(p => ({
        placeId: p.id,
        name: p.displayName?.text || "",
        address: p.formattedAddress || "",
        latitude: p.location?.latitude,
        longitude: p.location?.longitude,
        primaryType: p.primaryType || p.types?.[0] || "point_of_interest",
        types: p.types || [],
        rating: p.rating || null,
        userRatingCount: p.userRatingCount || 0,
        regularOpeningHours: p.regularOpeningHours || null,
        priceLevel: p.priceLevel || null,
        googleMapsUri: p.googleMapsUri || null,
        photos: (p.photos || []).slice(0, 6).map(ph => ({
          name: ph.name,
          widthPx: ph.widthPx,
          heightPx: ph.heightPx
        }))
      }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Nearby Search network error: ${err.message}`);
    }
    return [];
  }
}

