"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Search, Filter, SortAsc, SortDesc } from "lucide-react";

type Review = {
  review_id: number;
  user_id: number;
  trip_id: number;
  stars: number;
  description: string;
  created_at: string;
  user: {
    email: string;
    profile_photo_url?: string;
  };
  trip: {
    description?: string;
    city?: {
      city: string;
      country?: string;
    };
  };
};

// No pre-seeded reviews
const syntheticReviews: Review[] = [];

export default function CommunityPage() {
  const [reviews, setReviews] = useState<Review[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isLoading, setIsLoading] = useState(false);
  const [newReview, setNewReview] = useState({
    destination: "",
    stars: 0,
    description: ""
  });

  // Filter options
  const filterOptions = [
    { value: "all", label: "All Reviews" },
    { value: "5", label: "5 Stars" },
    { value: "4", label: "4+ Stars" },
    { value: "3", label: "3+ Stars" },
    { value: "2", label: "2+ Stars" },
    { value: "1", label: "1+ Stars" }
  ];

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "highest", label: "Highest Rated" },
    { value: "lowest", label: "Lowest Rated" }
  ];

  // Filter and sort reviews
  const filteredAndSortedReviews = reviews
    .filter(review => {
      const matchesSearch = review.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           review.trip.city?.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           review.user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = selectedFilter === "all" || review.stars >= parseInt(selectedFilter);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "highest":
          return b.stars - a.stars;
        case "lowest":
          return a.stars - b.stars;
        default:
          return 0;
      }
    });

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < stars ? 'text-[#485C11] fill-current' : 'text-[#929292]'}`}
      />
    ));
  };

  const getUserInitials = (email: string) => {
    return email.split('@')[0].split('.').map(n => n[0]).join('').toUpperCase();
  };

  const handleAddReview = () => {
    if (!newReview.destination || !newReview.description || newReview.stars === 0) {
      return;
    }

    const review: Review = {
      review_id: reviews.length + 1,
      user_id: Math.floor(Math.random() * 1000) + 1,
      trip_id: Math.floor(Math.random() * 1000) + 1,
      stars: newReview.stars,
      description: newReview.description,
      created_at: new Date().toISOString().split('T')[0],
      user: {
        email: "user@example.com",
        profile_photo_url: "/profile-avatar.jpg"
      },
      trip: {
        description: newReview.destination,
        city: {
          city: newReview.destination.split(',')[0]?.trim() || newReview.destination,
          country: newReview.destination.split(',')[1]?.trim() || ""
        }
      }
    };

    setReviews([review, ...reviews]);
    setNewReview({ destination: "", stars: 0, description: "" });
  };

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Community Reviews
          </h1>
          <p className="text-[#929292]">
            Share and discover travel experiences from our community
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#929292] w-4 h-4" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#000000] focus:border-[#485C11] rounded-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-[#000000] text-[#000000] hover:bg-[#DFECC6] rounded-full"
                onClick={() => setSelectedFilter("all")}
              >
                <Filter className="w-4 h-4 mr-2" />
                {filterOptions.find(f => f.value === selectedFilter)?.label || "Filter"}
              </Button>
              <Button
                variant="outline"
                className="border-[#000000] text-[#000000] hover:bg-[#DFECC6] rounded-full"
                onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
              >
                {sortBy === "newest" ? <SortDesc className="w-4 h-4 mr-2" /> : <SortAsc className="w-4 h-4 mr-2" />}
                {sortOptions.find(s => s.value === sortBy)?.label || "Sort"}
              </Button>
            </div>
          </div>
          
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <Button
                key={filter.value}
                variant={selectedFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter.value)}
                className={`rounded-full ${
                  selectedFilter === filter.value 
                    ? 'bg-[#485C11] hover:bg-[#8E9C78] text-[#FFFFFF]' 
                    : 'border-[#000000] text-[#000000] hover:bg-[#DFECC6]'
                }`}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Add Review Form */}
        <Card className="border-[#000000] bg-[#FFFFFF] mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-[#000000] mb-4">Add Your Review</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#000000] mb-2">Destination</label>
                <Input 
                  placeholder="Enter destination (e.g., Bali, Indonesia)" 
                  className="border-[#000000]"
                  value={newReview.destination}
                  onChange={(e) => setNewReview({...newReview, destination: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#000000] mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({...newReview, stars: star})}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      {star <= newReview.stars ? (
                        <Star className="w-8 h-8 fill-[#485C11] text-[#485C11]" />
                      ) : (
                        <Star className="w-8 h-8 text-[#929292] hover:text-[#485C11]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#000000] mb-2">Review</label>
                <Textarea 
                  placeholder="Share your experience..."
                  className="w-full border-[#000000] resize-none h-24"
                  value={newReview.description}
                  onChange={(e) => setNewReview({...newReview, description: e.target.value})}
                />
              </div>
              <Button 
                onClick={handleAddReview}
                className="bg-[#485C11] hover:bg-[#8E9C78] text-[#FFFFFF] rounded-full"
                disabled={!newReview.destination || !newReview.description || newReview.stars === 0}
              >
                Submit Review
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Grid */}
        <div className="space-y-6">
          {filteredAndSortedReviews.length === 0 ? (
            <Card className="border-[#000000] bg-[#FFFFFF]">
              <CardContent className="py-12 text-center">
                <p className="text-[#929292]">No reviews found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedReviews.map((review) => (
              <Card key={review.review_id} className="border-[#000000] bg-[#FFFFFF] hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="w-16 h-16 border-2 border-[#000000]">
                        <AvatarImage src={review.user.profile_photo_url} alt={review.user.email} />
                        <AvatarFallback className="bg-[#DFECC6] text-[#485C11] text-lg font-semibold">
                          {getUserInitials(review.user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg text-[#000000]">
                            {review.user.email.split('@')[0].replace('.', ' ')}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.stars)}
                            <span className="text-sm text-[#929292] ml-2">
                              {review.trip.city?.city}, {review.trip.city?.country}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-[#DFECC6] text-[#485C11]">
                          {new Date(review.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                      
                      <p className="text-[#000000] leading-relaxed mb-4">
                        {review.description}
                      </p>
                      

                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
