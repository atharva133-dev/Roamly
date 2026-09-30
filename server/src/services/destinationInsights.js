/**
 * Destination Insights Engine
 *
 * Provides factually verified, country- and city-specific intelligence for:
 * 1. Curated Travel & Cultural Tips (Payments, Etiquette, Transit, Connectivity, Water/Safety)
 * 2. Emergency & Safety Directory (Accurate local emergency numbers, police, ambulance, tourist helplines)
 * 3. Smart Packing Checklist (Climate-, activity-, and plug-adapter-specific items)
 *
 * Eliminates inaccurate generic fallbacks (e.g. UPI, temple shoes, and Indian 112/108 numbers
 * for international destinations like Tokyo, Paris, London, New York, etc.).
 */

export const COUNTRY_PROFILES = {
  JAPAN: {
    country: "Japan",
    aliases: ["japan", "tokyo", "kyoto", "osaka", "sapporo", "hiroshima", "nara", "fukuoka", "okinawa", "yokohama", "kobe", "hakone"],
    currency: "JPY (¥)",
    countryCode: "+81",
    emergency: {
      local_emergency: "110 / 119",
      police: "110",
      ambulance: "119",
      tourist_helpline: "0570-000-911",
      women_helpline: "#8103",
      embassy: "Tokyo Consular Services",
      hotel: "Accommodation Front Desk",
      roamly_support: "+81 3-ROAMLY-JP",
      quick_dial: "110",
      advisory: "In Japan, dial 110 for Police and 119 for Fire/Ambulance. The Japan Helpline (0570-000-911) provides 24/7 assistance in English."
    },
    travel_tips: [
      "Payments & Cash: Cash (Yen) remains essential for shrines, small noodle shops, and ticket machines. Suica/Pasmo IC cards work widely at convenience stores. NOTE: Tipping is NOT practiced in Japan and is considered rude.",
      "Cultural Etiquette: Maintain quiet on trains and avoid phone conversations. Do not walk while eating street snacks—finish near the stall. Remove shoes when entering homes, ryokans, or temple tatami halls.",
      "Transit & Commute: Get a digital or physical IC transit card (Suica/Pasmo) for frictionless metro and bus travel. JR Shinkansen bullet trains are prompt down to the second.",
      "Connectivity & Power: Plugs are Type A/B (100V, 2-pin flat). Rent an airport pocket Wi-Fi router or install an eSIM before departure.",
      "Hydration & Convenience: Tap water is 100% safe, clean, and delicious everywhere. Konbini (7-Eleven, Lawson, FamilyMart) provide ATM international cash withdrawals and high-quality fresh meals."
    ],
    packing_list: [
      "Slip-on, highly cushioned walking shoes (expect 15,000+ daily steps; easy on/off for temples)",
      "Coin purse/pouch for 100¥ and 500¥ yen coins used in transit and vending machines",
      "Type A (2-pin flat) universal power adapter (100V)",
      "Portable power bank (10,000–20,000 mAh) & pocket Wi-Fi/eSIM profile",
      "Hand towel or pocket handkerchief (many public restrooms do not provide paper towels)",
      "Physical Passport (required by Japanese law for foreign visitors to carry at all times)",
      "Compact windproof umbrella or lightweight packable rain jacket",
      "Personal medicine kit with clear English packaging & electrolyte powder"
    ]
  },

  USA: {
    country: "United States",
    aliases: ["usa", "united states", "america", "new york", "nyc", "los angeles", "san francisco", "chicago", "miami", "las vegas", "washington dc", "seattle", "boston", "orlando", "hawaii", "california", "texas"],
    currency: "USD ($)",
    countryCode: "+1",
    emergency: {
      local_emergency: "911",
      police: "911",
      ambulance: "911",
      tourist_helpline: "311",
      women_helpline: "1-800-799-7233",
      embassy: "Consular Services",
      hotel: "Hotel Front Desk",
      roamly_support: "+1 800-ROAMLY",
      quick_dial: "911",
      advisory: "Across the USA, dial 911 immediately for all emergency services (Police, Fire, Medical). Dial 311 for non-emergency city assistance."
    },
    travel_tips: [
      "Payments & Tipping: Credit cards, debit cards, and Apple/Google Pay are accepted virtually everywhere. Tipping 18%–22% at sit-down restaurants is customary and expected by servers.",
      "Sales Tax & Pricing: Listed prices do not include state or local sales tax (4%–10%), which is calculated and added automatically at checkout.",
      "Transit & Mobility: In major metros like New York, tap your contactless card/phone directly at subway turnstiles (OMNY). Rideshare apps (Uber, Lyft) operate in almost every city.",
      "Power & Standards: Sockets use Type A and B plugs (120V, 60Hz). Check your electronics for dual-voltage compatibility.",
      "Water & Healthcare: Tap water is safe in almost all municipalities. Medical costs are exceptionally high—ensure comprehensive zero-deductible travel insurance."
    ],
    packing_list: [
      "Type A / Type B US plug adapter (120V)",
      "Physical Passport + valid ESTA / US Tourist Visa documentation",
      "Comfortable sneakers with arch support for city block walking",
      "Printed & cloud copies of comprehensive travel medical insurance",
      "Contactless payment credit/debit card (Visa/Mastercard)",
      "High-capacity power bank and durable charging cables",
      "Layered clothing suited to season and indoor air-conditioning"
    ]
  },

  UK: {
    country: "United Kingdom",
    aliases: ["uk", "united kingdom", "london", "edinburgh", "manchester", "birmingham", "oxford", "cambridge", "bath", "scotland", "england", "wales", "belfast", "glasgow"],
    currency: "GBP (£)",
    countryCode: "+44",
    emergency: {
      local_emergency: "999 / 112",
      police: "999",
      ambulance: "999",
      tourist_helpline: "101",
      women_helpline: "0808-200-0247",
      embassy: "London Consular Liaison",
      hotel: "Accommodation Reception Desk",
      roamly_support: "+44 800-ROAMLY",
      quick_dial: "999",
      advisory: "Dial 999 (or 112) for immediate emergency response in the UK. Dial 111 for non-emergency NHS medical advice, and 101 for non-emergency police."
    },
    travel_tips: [
      "Payments & Contactless: The UK is almost entirely cashless. Use contactless credit cards or Apple/Google Pay for all purchases. London buses do not accept cash.",
      "Tube & Transit Etiquette: On the London Underground (Tube), strictly stand on the right of escalators and walk on the left. Tap in and tap out with the same card.",
      "Tipping Norms: A discretionary 10%–12.5% service charge is usually added to restaurant bills. Additional tipping is not required if service charge is already included.",
      "Power & Plugs: UK wall sockets use heavy Type G (3-pin rectangular, 230V) plugs. You will need a Type G adapter.",
      "Weather & Water: Tap water is 100% safe to drink. British weather is famously changeable—always carry a packable umbrella or rain jacket regardless of the forecast."
    ],
    packing_list: [
      "Type G 3-pin UK plug adapter (230V)",
      "Compact windproof umbrella and water-resistant outer jacket",
      "Sturdy, waterproof walking shoes for city streets and cobblestones",
      "Contactless payment card or phone with NFC enabled",
      "Physical Passport & UK ETA / Visa paperwork",
      "Lightweight layering apparel (cardigan, trench coat, scarf)"
    ]
  },

  FRANCE: {
    country: "France",
    aliases: ["france", "paris", "nice", "lyon", "marseille", "bordeaux", "strasbourg", "toulouse", "cannes", "normandy", "provence"],
    currency: "EUR (€)",
    countryCode: "+33",
    emergency: {
      local_emergency: "112",
      police: "17",
      ambulance: "15",
      tourist_helpline: "+33 1 45 55 80 00",
      women_helpline: "3919",
      embassy: "Paris Consular Services",
      hotel: "Hotel Front Desk",
      roamly_support: "+33 800-ROAMLY",
      quick_dial: "112",
      advisory: "Dial 112 for unified European emergency response. Dial 15 for SAMU (medical emergency), 17 for Police Nationale, and 18 for Sapeurs-Pompiers (fire & rescue)."
    },
    travel_tips: [
      "Greetings Matter: Always greet storekeepers, waiters, and hotel staff with 'Bonjour Madame/Monsieur' upon entering, and 'Merci, au revoir' upon leaving.",
      "Dining & Tipping: Restaurant bills include a 15% service charge by French law ('service compris'). Leaving €1–€2 in coins for attentive table service is polite but optional.",
      "Transit & Metro: Use Paris Métro and RER with a digital Navigo Easy pass on your smartphone. Always retain your validated ticket until you fully exit the station.",
      "Free Dining Water: You are legally entitled to free tap water in French restaurants—simply ask for 'une carafe d'eau, s'il vous plaît'.",
      "Power & Adapters: France uses Type C and E standard European round 2-pin sockets (230V)."
    ],
    packing_list: [
      "Type C/E 2-pin European plug adapter (230V)",
      "Chic, comfortable walking shoes for historic cobblestones and metro stairs",
      "Crossbody anti-theft bag with secure zips for crowded attractions (Louvre, Eiffel Tower, Metro)",
      "Physical Passport + Schengen Visa documentation",
      "Light scarf and versatile layers for breezy Parisian evenings",
      "Refillable water bottle"
    ]
  },

  ITALY: {
    country: "Italy",
    aliases: ["italy", "italia", "rome", "florence", "venice", "milan", "naples", "amalfi", "positano", "cinque terre", "pisa", "bologna", "tuscany", "sicily"],
    currency: "EUR (€)",
    countryCode: "+39",
    emergency: {
      local_emergency: "112",
      police: "113",
      ambulance: "118",
      tourist_helpline: "06-0608",
      women_helpline: "1522",
      embassy: "Rome Consular Liaison",
      hotel: "Hotel Concierge Desk",
      roamly_support: "+39 800-ROAMLY",
      quick_dial: "112",
      advisory: "Dial 112 across Italy for Carabinieri and unified emergency rescue. Dial 118 for Pronto Soccorso (Ambulance), and 113 for State Police."
    },
    travel_tips: [
      "Church Dress Codes: When visiting sacred cathedrals (Vatican, St. Peter's, Florence Duomo), shoulders and knees MUST be covered. Security strictly turns away sleeveless tops and short shorts.",
      "Coffee & Dining Customs: Italians drink cappuccino only in the morning (before 11:00 AM); after lunch or dinner, order an espresso ('un caffè'). A 'coperto' (cover charge €2–€4) is standard.",
      "Validate Train Tickets: When using regional trains (Trenitalia/Italo), always validate paper tickets in the yellow/green stamping machines before boarding to avoid heavy fines.",
      "Free Fresh Spring Water: Historic Italian cities feature free public drinking fountains ('nasoni' in Rome) dispensing cold, safe, continuous spring water.",
      "Power & Plugs: Italy uses Type C, F, and L plugs (230V, 50Hz)."
    ],
    packing_list: [
      "Type C/F/L European plug adapter (230V)",
      "Lightweight shawl or scarf to quickly cover shoulders for basilica visits",
      "Cushioned walking shoes suited for uneven cobblestones and ancient stone steps",
      "Refillable water bottle for municipal fresh fountains",
      "Physical Passport + Schengen Travel documentation",
      "Secure crossbody daypack with zip closures"
    ]
  },

  UAE: {
    country: "United Arab Emirates",
    aliases: ["uae", "united arab emirates", "dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah"],
    currency: "AED (د.إ)",
    countryCode: "+971",
    emergency: {
      local_emergency: "999",
      police: "999",
      ambulance: "998",
      tourist_helpline: "901",
      women_helpline: "800-4888",
      embassy: "Consular Services (Dubai / Abu Dhabi)",
      hotel: "Hotel Front Desk",
      roamly_support: "+971 800-ROAMLY",
      quick_dial: "999",
      advisory: "In the UAE, dial 999 for Police, 998 for Ambulance, and 997 for Fire. For tourist police assistance in Dubai, call 901."
    },
    travel_tips: [
      "Payments & Technology: Card payments and Apple/Google Pay are ubiquitous across Dubai and Abu Dhabi. Tipping 10%–15% at restaurants is customary.",
      "Public Etiquette & Dress: Dress modestly in shopping malls, souks, and government spaces (cover shoulders and knees). Respect local traditions during Ramadan. Public displays of affection are frowned upon.",
      "Transit & Metro: Dubai Metro is hyper-modern and driverless. Purchase a Silver Nol Card for seamless trips across metro, tram, and buses. Ride apps (Careem, Uber) are widespread.",
      "Hydration in Heat: Tap water is desalinated and safe for sanitation, but bottled or filtered water is preferred for drinking. Stay well hydrated year-round.",
      "Power Sockets: The UAE uses British standard Type G (3-pin rectangular, 230V) sockets."
    ],
    packing_list: [
      "Type G 3-pin plug adapter (230V)",
      "High SPF 50+ sunscreen, polarized sunglasses & wide-brim hat",
      "Light, breathable cotton/linen apparel plus a light jacket for air-conditioned indoor malls",
      "Modest attire covering shoulders and knees for cultural sites and malls",
      "Physical Passport + UAE Tourist Visa / Visa-on-Arrival documentation",
      "Hydration bottle and electrolyte replenishment sachets"
    ]
  },

  THAILAND: {
    country: "Thailand",
    aliases: ["thailand", "bangkok", "phuket", "chiang mai", "krabi", "pattaya", "koh samui", "hua hin", "ayutthaya"],
    currency: "THB (฿)",
    countryCode: "+66",
    emergency: {
      local_emergency: "191 / 1669",
      police: "191",
      ambulance: "1669",
      tourist_helpline: "1155",
      women_helpline: "1300",
      embassy: "Consular Services (Bangkok)",
      hotel: "Hotel Front Desk",
      roamly_support: "+66 1800-ROAMLY",
      quick_dial: "1155",
      advisory: "For tourists in Thailand, dial 1155 for the 24/7 English-speaking Tourist Police. For direct emergency, dial 191 for Police and 1669 for Medical Aid."
    },
    travel_tips: [
      "Temple Respect: Dress modestly covering shoulders and knees when visiting wats (temples). Never point feet towards Buddha statues or monks, and always remove footwear before entering shrine halls.",
      "Cash is King for Street Food: Thai Baht (THB) cash is necessary for night markets, food stalls, and local boat ferries. Credit cards are fine in shopping centers.",
      "Transit & Rides: In Bangkok, use the BTS Skytrain and MRT to bypass severe traffic jams. For taxis, demand the meter ('meter na khrap') or use the Grab / Bolt apps.",
      "Drinking Water Safety: Do not drink unboiled tap water. Bottled water is cheap and sold at every 7-Eleven. Ice at established restaurants and bars is commercial and safe.",
      "Power Plugs: Thailand uses Type A, B, and C combination sockets (220V)."
    ],
    packing_list: [
      "Slip-on sandals or easily removable shoes for temple visits",
      "Lightweight, breathable linen clothing with modest temple coverage",
      "Type A/B/C plug adapter (220V)",
      "DEET mosquito repellent & bite relief cream",
      "Waterproof dry pouch for boat excursions and sudden monsoon downpours",
      "Physical Passport + Thailand arrival documentation",
      "Hand sanitizer and pocket tissues"
    ]
  },

  SINGAPORE: {
    country: "Singapore",
    aliases: ["singapore", "changi", "sentosa", "marina bay"],
    currency: "SGD (S$)",
    countryCode: "+65",
    emergency: {
      local_emergency: "999 / 995",
      police: "999",
      ambulance: "995",
      tourist_helpline: "1800-736-2000",
      women_helpline: "1800-777-5555",
      embassy: "Consular Services",
      hotel: "Hotel Concierge Desk",
      roamly_support: "+65 800-ROAMLY",
      quick_dial: "999",
      advisory: "In Singapore, dial 999 for Police and 995 for Ambulance & Fire. For non-emergency medical transport, dial 1777."
    },
    travel_tips: [
      "Cashless Transit: Simply tap your contactless credit card (Visa/Mastercard) or phone directly on MRT train gantries and public buses—no separate ticket purchase needed.",
      "City Laws & Cleanliness: Chewing gum is prohibited. Eating or drinking on public transit attracts hefty fines ($500 SGD). Always dispose of litter in designated bins.",
      "Hawker Center Dining: Singapore's famous hawker centers offer Michelin-starred meals at budget rates. Look for government hygiene certification plaques (Grade A or B).",
      "Potable Tap Water: Tap water in Singapore is completely safe, purified, and meets the highest WHO drinking standards.",
      "Power Standard: Singapore uses British Type G 3-pin rectangular plugs (230V)."
    ],
    packing_list: [
      "Type G 3-pin plug adapter (230V)",
      "Ultra-breathable summer clothing for humid tropical climate",
      "Light sweater or cardigan for heavily air-conditioned indoor malls and museums",
      "Compact umbrella for sudden afternoon tropical rain showers",
      "Contactless payment card or smartphone with Apple/Google Pay",
      "Physical Passport + SG Arrival Card submission confirmation"
    ]
  },

  AUSTRALIA: {
    country: "Australia",
    aliases: ["australia", "sydney", "melbourne", "brisbane", "perth", "cairns", "gold coast", "adelaide", "darwin", "hobart"],
    currency: "AUD (A$)",
    countryCode: "+61",
    emergency: {
      local_emergency: "000",
      police: "000",
      ambulance: "000",
      tourist_helpline: "131 444",
      women_helpline: "1800 737 732",
      embassy: "Consular Services (Canberra / Sydney)",
      hotel: "Hotel Front Desk",
      roamly_support: "+61 1800-ROAMLY",
      quick_dial: "000",
      advisory: "In Australia, dial 000 ('Triple Zero') for all urgent Police, Fire, and Ambulance emergencies. For non-emergency police assistance, call 131 444."
    },
    travel_tips: [
      "Cashless & Tipping: Australia is virtually cashless with contactless tap-and-go accepted everywhere. Tipping is not expected as Australian hospitality staff receive fair standard wages.",
      "Sun & Beach Safety: Always swim strictly between the red-and-yellow flags patrolled by surf lifesavers. Australian UV index is extremely high—wear broad-spectrum SPF 50+.",
      "Public Transit: Sydney uses contactless cards/Opal across trains, ferries, and light rail. Melbourne offers a Free Tram Zone in the central business district.",
      "Water Quality: Tap water across Australia is pristine, safe, and refreshing.",
      "Power Sockets: Australia uses Type I 3-pin angled plugs (230V, 50Hz)."
    ],
    packing_list: [
      "Type I angled 3-pin Australian plug adapter (230V)",
      "Broad-spectrum SPF 50+ sunscreen, polarized sunglasses & UV sun hat",
      "Comfortable walking shoes & casual beachwear",
      "Physical Passport + Australian eVisitor / ETA Visa approval",
      "Refillable insulated water bottle",
      "Contactless payment card"
    ]
  },

  SPAIN: {
    country: "Spain",
    aliases: ["spain", "espana", "barcelona", "madrid", "seville", "valencia", "mallorca", "ibiza", "granada", "malaga", "bilbao"],
    currency: "EUR (€)",
    countryCode: "+34",
    emergency: {
      local_emergency: "112",
      police: "091 / 112",
      ambulance: "061 / 112",
      tourist_helpline: "+34 902 102 112",
      women_helpline: "016",
      embassy: "Consular Services (Madrid)",
      hotel: "Hotel Front Desk",
      roamly_support: "+34 800-ROAMLY",
      quick_dial: "112",
      advisory: "Dial 112 across Spain for all emergency services. Dial 091 for National Police, and 061 for Medical Emergencies."
    },
    travel_tips: [
      "Dining Schedule: Lunch runs from 2:00–4:30 PM, and dinner rarely starts before 8:30–9:30 PM. Many tapas bars stay lively until midnight.",
      "Security in Tourist Hotspots: Pickpocketing is common in busy tourist areas (Las Ramblas, Sagrada Familia, Sol). Keep wallets in front pockets or zipped crossbody bags.",
      "High-Speed Rail: Renfe AVE trains connect Madrid, Barcelona, Seville, and Valencia in 2–3 hours. Book early for lower fares.",
      "Tipping: Tipping is modest in Spain; rounding up to the nearest euro or leaving 5%–10% for exceptional dining is standard.",
      "Power Standard: Spain uses Type C and F European round 2-pin sockets (230V)."
    ],
    packing_list: [
      "Type C/F European 2-pin plug adapter (230V)",
      "Secure anti-theft crossbody bag with zip locks",
      "Breathable summer clothing & light evening jacket",
      "Comfortable shoes for extensive historic city walking",
      "Physical Passport + Schengen documentation",
      "Refillable water bottle"
    ]
  },

  INDIA: {
    country: "India",
    aliases: ["india", "delhi", "mumbai", "bengaluru", "bangalore", "jaipur", "agra", "goa", "kerala", "varanasi", "kolkata", "chennai", "hyderabad", "udaipur", "manali", "shimla", "rishikesh", "amritsar", "pune", "ahmedabad", "mysore"],
    currency: "INR (₹)",
    countryCode: "+91",
    emergency: {
      local_emergency: "112",
      police: "100",
      ambulance: "108",
      tourist_helpline: "1363",
      women_helpline: "1091",
      embassy: "Consular Liaison (New Delhi)",
      hotel: "Accommodation Front Desk",
      roamly_support: "+91 1800-ROAMLY",
      quick_dial: "112",
      advisory: "In India, dial 112 for unified Police, Fire, and Medical assistance. For toll-free 24/7 tourist helpline guidance in 12 languages, dial 1363."
    },
    travel_tips: [
      "Digital Payments & Cash: UPI (Google Pay, PhonePe, Paytm) is ubiquitous across India. Keep ₹1,500–₹2,500 in cash for small monument shoe lockers, temple offerings, and auto-rickshaws.",
      "Cultural Respect & Temple Attire: Dress modestly covering shoulders and knees at temples, mosques, and heritage shrines. Slip-on footwear is convenient as shoes must be removed before entering holy inner sanctums.",
      "Smart Transit: Use verified ridesharing apps (Uber, Ola) for reliable fares, or official prepaid taxi booths at airports and railway stations. Local metros (Delhi, Mumbai, Bengaluru) offer fast, air-conditioned transit.",
      "Hydration & Street Food: Stick to factory-sealed bottled or filtered water. Savor authentic culinary delicacies at busy local restaurants and street stalls with high turnover.",
      "Golden Hour Photography: Flagship monuments (Taj Mahal, Amber Fort) are best experienced at sunrise (06:00–08:00 AM) for magical soft lighting, lower temperatures, and smaller crowds."
    ],
    packing_list: [
      "Lightweight, breathable cotton or linen clothing suited for warm weather",
      "Comfortable walking shoes with cushioned soles (plus easy slip-ons for temples)",
      "High-capacity power bank (10,000–20,000 mAh) & Type C/D/M plug adapter (230V)",
      "Physical government ID proof (Aadhaar / Passport) + digital cloud copies for monuments",
      "Sun protection kit: Broad-spectrum SPF 50+ sunscreen, UV sunglasses & hat",
      "Personal travel medical kit: ORS electrolyte sachets, pain relievers & band-aids",
      "Reusable insulated water bottle and pocket hand sanitizer / wet wipes"
    ]
  },

  GLOBAL: {
    country: "International",
    aliases: [],
    currency: "Local Currency",
    countryCode: "+1",
    emergency: {
      local_emergency: "112",
      police: "112",
      ambulance: "112",
      tourist_helpline: "112",
      women_helpline: "112",
      embassy: "Nearest Embassy",
      hotel: "Accommodation Front Desk",
      roamly_support: "+1 800-ROAMLY",
      quick_dial: "112",
      advisory: "Dial 112 or 911 for emergency response. Contact your accommodation front desk or embassy for urgent consular support."
    },
    travel_tips: [
      "Payments & Cards: Carry at least two credit/debit cards from different payment networks (Visa/Mastercard) and notify your bank of international travel before departure.",
      "Local Etiquette: Research basic cultural greetings and dress codes before visiting religious or historic monuments. Polite greetings go a long way in every country.",
      "Transit & Navigation: Download offline maps (Google Maps / Maps.me) and check whether the city uses a transit card or direct contactless payment.",
      "Connectivity: Ensure you have an active international roaming pack or install a local/regional eSIM for uninterrupted GPS navigation.",
      "Health & Safety: Keep digital copies of your passport, travel insurance, and prescription medications stored securely in cloud storage."
    ],
    packing_list: [
      "Universal all-in-one travel plug adapter (covers Type A, C, G, I)",
      "High-capacity power bank (10,000–20,000 mAh) & durable multi-cables",
      "Physical Passport + valid Visas & printed hotel reservation confirmations",
      "Personal medicine kit: pain relievers, digestive aid, antihistamines, band-aids",
      "Comfortable broken-in walking shoes suited for extensive daily steps",
      "Weather-appropriate outer layer and compact windproof umbrella",
      "Refillable insulated water bottle"
    ]
  }
};

/**
 * Normalizes an array of destination strings or resolved location objects
 * and matches the most accurate country profile.
 */
export function resolveDestinationProfile(locations) {
  if (!locations || (Array.isArray(locations) && locations.length === 0)) {
    return COUNTRY_PROFILES.GLOBAL;
  }

  const queryStrings = [];

  const rawArray = Array.isArray(locations) ? locations : [locations];
  for (const item of rawArray) {
    if (typeof item === "string") {
      queryStrings.push(item.toLowerCase());
    } else if (item && typeof item === "object") {
      if (item.name) queryStrings.push(String(item.name).toLowerCase());
      if (item.city) queryStrings.push(String(item.city).toLowerCase());
      if (item.country) queryStrings.push(String(item.country).toLowerCase());
      if (item.formattedAddress) queryStrings.push(String(item.formattedAddress).toLowerCase());
      if (item.address?.city) queryStrings.push(String(item.address.city).toLowerCase());
      if (item.address?.country) queryStrings.push(String(item.address.country).toLowerCase());
    }
  }

  const fullText = queryStrings.join(" ");

  // Check profiles by alias match
  const profileKeys = [
    "JAPAN",
    "USA",
    "UK",
    "FRANCE",
    "ITALY",
    "UAE",
    "THAILAND",
    "SINGAPORE",
    "AUSTRALIA",
    "SPAIN",
    "INDIA"
  ];

  for (const key of profileKeys) {
    const profile = COUNTRY_PROFILES[key];
    for (const alias of profile.aliases) {
      // Word boundary or inclusion match
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(fullText) || fullText.includes(alias)) {
        return profile;
      }
    }
  }

  return COUNTRY_PROFILES.GLOBAL;
}

/**
 * Builds destination-tailored travel tips.
 */
export function buildDestinationTips(resolvedLocations) {
  const profile = resolveDestinationProfile(resolvedLocations);
  return [...profile.travel_tips];
}

/**
 * Builds destination-tailored emergency contacts.
 */
export function buildEmergencyContacts(resolvedLocations) {
  const profile = resolveDestinationProfile(resolvedLocations);
  const primaryName = Array.isArray(resolvedLocations) && resolvedLocations[0]
    ? (typeof resolvedLocations[0] === "string" ? resolvedLocations[0] : resolvedLocations[0].name || resolvedLocations[0].city || "Local")
    : "Local";

  return {
    ...profile.emergency,
    embassy: `${profile.country} Consular & Tourist Assistance (${primaryName} Liaison)`
  };
}

/**
 * Builds destination-tailored packing checklist.
 */
export function buildPackingList(resolvedLocations, durationDays = 3) {
  const profile = resolveDestinationProfile(resolvedLocations);
  return [...profile.packing_list];
}
