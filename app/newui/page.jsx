'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  UserRound,
  Utensils,
} from 'lucide-react';

const destinations = [
  {
    name: 'Bali, Indonesia',
    price: '₹32,999',
    meta: 'Temples, beaches & tropical vibes.',
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=85',
  },
  {
    name: 'Paris, France',
    price: '₹78,499',
    meta: 'Art, cuisine & timeless beauty.',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=85',
  },
  {
    name: 'Tokyo, Japan',
    price: '₹85,999',
    meta: 'Modern cities & rich culture.',
    image:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=85',
  },
  {
    name: 'New York, USA',
    price: '₹92,499',
    meta: 'The city that never sleeps.',
    image:
      'https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=900&q=85',
  },
  {
    name: 'Santorini, Greece',
    price: '₹66,999',
    meta: 'Iconic views & sunsets.',
    image:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=900&q=85',
  },
  {
    name: 'Dubai, UAE',
    price: '₹54,499',
    meta: 'Luxury, adventure & more.',
    image:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=85',
  },
];

const categories = ['All', 'Cities', 'Beaches', 'Mountains', 'Cultural'];

const testimonials = [
  {
    quote: '“The Bali itinerary was perfectly planned. Everything from stays to tours was seamless!”',
    name: 'Riya Mehta',
    role: 'Travelled to Bali',
    image:
      'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    quote: '“Found the best deals for my Europe trip. Super easy to plan and the community tips were really helpful.”',
    name: 'Arjun Singh',
    role: 'Travelled to Europe',
    image:
      'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    quote: '“Roamly made our honeymoon unforgettable. Amazing stays and great local recommendations.”',
    name: 'Sneha Iyer',
    role: 'Travelled to Santorini',
    image:
      'https://randomuser.me/api/portraits/women/68.jpg',
  },
];

export default function HomePage() {
  const [category, setCategory] = useState('All');

  const filtered =
    category === 'All'
      ? destinations
      : destinations.filter((item) =>
          category === 'Cities'
            ? ['Paris, France', 'Tokyo, Japan', 'New York, USA', 'Dubai, UAE'].includes(item.name)
            : category === 'Beaches'
              ? ['Bali, Indonesia', 'Santorini, Greece'].includes(item.name)
              : category === 'Mountains'
                ? ['Bali, Indonesia', 'Santorini, Greece'].includes(item.name)
                : ['Tokyo, Japan', 'Paris, France'].includes(item.name),
        );

  return (
    <main>
      <header className="topbar">
        <div className="nav-shell">
          <a className="brand" href="#top" aria-label="Roamly home">
            <span className="brand-mark">✈</span>
            <span>Roamly</span>
          </a>

          <nav className="desktop-nav">
            <a href="#destinations">Destinations</a>
            <a href="#itinerary">Trips</a>
            <a href="#why">Stays</a>
            <a href="#tools">Travel Tools</a>
            <a href="#stories">Community</a>
          </nav>

          <div className="nav-actions">
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="login-button">Sign In</button>
          </div>
        </div>
      </header>

      <section id="top" className="hero section-pad">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <div className="hero-shell">
          <div className="hero-copy">
            <div className="eyebrow-pill"><Sparkles size={14} /> AI POWERED TRAVEL PLANNING</div>
            <h1>
              Explore the World,
              <span>Travel Carefree</span>
            </h1>
            <p>
              Plan, book and explore with confidence. Discover top stays, curated
              itineraries and real traveler advice — all in one place for a smoother,
              smarter journey.
            </p>

            <div className="hero-ctas">
              <button className="primary-button">Plan My Trip <ArrowRight size={18} /></button>
              <button className="secondary-button"><span className="play-dot"><Play size={12} fill="currentColor" /></span> Watch How It Works</button>
            </div>

            <div className="traveler-proof">
              <div className="avatar-stack">
                <img src="https://randomuser.me/api/portraits/women/65.jpg" alt="" />
                <img src="https://randomuser.me/api/portraits/men/41.jpg" alt="" />
                <img src="https://randomuser.me/api/portraits/women/79.jpg" alt="" />
                <img src="https://randomuser.me/api/portraits/men/64.jpg" alt="" />
              </div>
              <div><strong>100K+</strong><span>Happy Travelers</span></div>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="flight-path" />
            <div className="paper-note">Good Places<br />Brighter<br />Stories</div>
            <div className="plane">✈</div>
            <div className="suitcase-scene">
              <div className="suitcase-lid">
                <div className="lid-sky" />
              </div>
              <div className="suitcase-base">
                <div className="island">
                  <span className="mountain m1" />
                  <span className="mountain m2" />
                  <span className="tree t1" />
                  <span className="tree t2" />
                  <span className="temple">⌂</span>
                  <span className="water" />
                </div>
              </div>
            </div>
            <div className="floating-traveler-card">
              <div className="mini-avatars"><span /> <span /> <span /></div>
              <div><strong>100K+</strong><small>Happy Travelers</small></div>
            </div>
          </div>
        </div>

        <div className="search-card-wrap">
          <div className="search-card">
            <div className="search-field">
              <span className="field-icon"><MapPin size={18} /></span>
              <div><strong>Where to?</strong><span>Search destinations</span></div>
            </div>
            <div className="field-divider" />
            <div className="search-field">
              <span className="field-icon"><CalendarDays size={18} /></span>
              <div><strong>Travel dates</strong><span>Any time</span></div>
              <ChevronDown size={15} className="field-chevron" />
            </div>
            <div className="field-divider" />
            <div className="search-field">
              <span className="field-icon"><UserRound size={18} /></span>
              <div><strong>Travelers</strong><span>2 travelers</span></div>
            </div>
            <button className="search-submit"><Search size={18} /> Search <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      <section id="destinations" className="content-section destinations-section">
        <div className="section-heading row-heading">
          <div>
            <span className="mini-label">TRAVEL • EXPLORE • RELAX</span>
            <h2>Popular Destinations</h2>
            <p>Handpicked places loved by our community. From vibrant cities to serene escapes, find your next adventure.</p>
          </div>
          <div className="filter-pills">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? 'filter-pill active' : 'filter-pill'}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="destination-layout">
          <div className="destination-grid">
            {filtered.map((item) => (
              <article className="destination-card" key={item.name}>
                <img src={item.image} alt={item.name} />
                <div className="card-overlay" />
                <button className="heart-button" aria-label={`Save ${item.name}`}><Heart size={16} /></button>
                <div className="destination-card-content">
                  <div><h3>{item.name}</h3><p>{item.meta}</p></div>
                  <span className="price-chip">From {item.price}</span>
                </div>
              </article>
            ))}
          </div>

          <aside className="featured-card">
            <div className="featured-topline"><span>FEATURED TRIP</span><b>9 Days</b></div>
            <div className="featured-title-row"><div><h3>Bali & Nusa Penida</h3><div className="rating"><Star size={13} fill="currentColor" /> 4.8 <span>(1.2k reviews)</span></div></div></div>
            <p>Beaches, temples, island vibes and more — a perfect tropical getaway.</p>
            <ul>
              <li><span><ShieldCheck size={15} /></span>Flights + Stay</li>
              <li><span><ShieldCheck size={15} /></span>Guided Tours</li>
              <li><span><ShieldCheck size={15} /></span>Island Hopping</li>
              <li><span><ShieldCheck size={15} /></span>Breakfast Included</li>
              <li><span><ShieldCheck size={15} /></span>Free Cancellation</li>
            </ul>
            <div className="featured-thumbs">
              {destinations.slice(0, 3).map((item) => <img key={item.name} src={item.image} alt="" />)}
            </div>
            <button className="primary-button full">View Full Itinerary <ArrowRight size={16} /></button>
          </aside>
        </div>
      </section>

      <section id="itinerary" className="content-section itinerary-section">
        <div className="section-heading centered">
          <span className="mini-label">TRAVEL SMARTER</span>
          <h2>Structured Daily Itineraries</h2>
          <p>Detailed plans, top attractions and estimated costs — everything you need.</p>
        </div>

        <div className="itinerary-card">
          <div className="day-list">
            {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'].map((day, i) => <div key={day} className={i === 0 ? 'day-item active' : 'day-item'}>{day}</div>)}
          </div>
          <div className="itinerary-main">
            <div className="itinerary-head"><div><h3>Arrival in Bali</h3><span>Mon, 12 Feb 2026</span></div><span className="small-badge">Day 1</span></div>
            <div className="itinerary-images">
              {destinations.slice(0, 3).map((item) => <img key={item.name} src={item.image} alt="" />)}
            </div>
            <div className="timeline-list">
              {['Arrive at Ngurah Rai International Airport', 'Transfer to hotel in Ubud', 'Visit Ubud Palace', 'Explore Ubud Art Market', 'Dinner at local restaurant'].map((t) => (
                <div key={t}><span className="timeline-dot" />{t}</div>
              ))}
            </div>
          </div>
          <div className="cost-panel">
            <span className="panel-label">Estimated Cost (Per Person)</span>
            {[
              ['Flights (Return)', '₹24,000'],
              ['Stay (4 Nights)', '₹18,000'],
              ['Activities', '₹8,500'],
              ['Food', '₹6,000'],
              ['Local Transport', '₹3,500'],
            ].map(([label, value]) => <div className="cost-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
            <div className="total-row"><span>Total Estimate</span><strong>₹60,000</strong></div>
            <button className="primary-button full">Customize This Trip <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      <section id="why" className="content-section why-section">
        <div className="section-heading centered">
          <span className="mini-label">WHY ROAMLY</span>
          <h2>Why travelers choose Roamly?</h2>
        </div>
        <div className="benefits-grid">
          <Benefit icon={<Sparkles size={25} />} title="Curated Itineraries" text="Well-planned, tested and traveler-approved itineraries." />
          <Benefit icon={<Tag size={25} />} title="Best Deals" text="Compare flights, stays and activities for the best prices." />
          <Benefit icon={<ShieldCheck size={25} />} title="Trusted Community" text="Real reviews from real travelers around the world." />
        </div>
      </section>

      <section id="stories" className="content-section stories-section">
        <div className="section-heading centered">
          <span className="mini-label">REAL TRAVELER STORIES</span>
          <h2>Verified travel experiences</h2>
          <p>Join thousands of happy travelers who’ve explored the world with Roamly.</p>
        </div>
        <div className="stories-shell">
          <button className="carousel-arrow"><ChevronLeft size={18} /></button>
          <div className="stories-grid">
            {testimonials.map((item) => (
              <article className="story-card" key={item.name}>
                <p>{item.quote}</p>
                <div className="story-author">
                  <img src={item.image} alt="" />
                  <div><strong>{item.name}</strong><span>{item.role}</span></div>
                  <div className="story-stars"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></div>
                </div>
              </article>
            ))}
          </div>
          <button className="carousel-arrow"><ChevronRight size={18} /></button>
        </div>
      </section>

      <section id="tools" className="cta-section">
        <div className="cta-content">
          <span className="mini-label">START YOUR JOURNEY</span>
          <h2>Plan your next journey in minutes</h2>
          <p>Get personalized recommendations, compare prices and create unforgettable memories — all with Roamly.</p>
          <div className="hero-ctas centered-actions">
            <button className="primary-button">Get Started Now <ArrowRight size={16} /></button>
            <button className="secondary-button"><span className="play-dot"><Play size={12} fill="currentColor" /></span> Watch Demo</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div><div className="brand footer-brand"><span className="brand-mark">✈</span><span>Roamly</span></div><p>© 2026 Roamly. All rights reserved.</p></div>
        <div className="footer-links"><a>About</a><a>Blog</a><a>Support</a><a>Contact</a></div>
        <div className="socials"><span>◎</span><span>𝕏</span><span>▶</span><span>in</span></div>
      </footer>
    </main>
  );
}

function Benefit({ icon, title, text }) {
  return <article className="benefit"><div className="benefit-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></article>;
}
