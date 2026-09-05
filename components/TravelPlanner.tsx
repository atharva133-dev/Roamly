// components/TravelPlanner.tsx
"use client";

import { useState } from "react";

interface TravelPlan {
  itinerary: Array<{
    day: string;
    morning: string;
    afternoon: string;
    evening: string;
    accommodation: string;
    meals: string;
    estimated_cost: string;
  }>;
  total_estimated_cost: string;
  travel_tips: string[];
  packing_list: string[];
  emergency_contacts: {
    local_emergency: string;
    embassy: string;
    hotel: string;
  };
}

interface ApiResponse {
  plan: TravelPlan;
  summary: string;
}

export default function TravelPlanner() {
  const [form, setForm] = useState({
    destination: "",
    duration: 0,
    budget: "",
    travel_style: "",
    interests: [] as string[],
    accommodation: "",
    transportation: "",
    special_requests: ""
  });

  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const res = await fetch("/api/generatePlanWithSummary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Roamly Travel Planner</h1>

      <input name="destination" placeholder="Destination" onChange={handleChange} />
      <input name="duration" placeholder="Duration in days" type="number" onChange={handleChange} />
      <input name="budget" placeholder="Budget" onChange={handleChange} />
      <input name="travel_style" placeholder="Travel Style" onChange={handleChange} />
      <input name="accommodation" placeholder="Accommodation" onChange={handleChange} />
      <input name="transportation" placeholder="Transportation" onChange={handleChange} />
      <input name="special_requests" placeholder="Special Requests" onChange={handleChange} />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Generating..." : "Generate Plan"}
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>Summary</h2>
          <p>{result.summary}</p>

          <h2>Itinerary</h2>
          <pre>{JSON.stringify(result.plan, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
