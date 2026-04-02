"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVolunteers, type Volunteer } from "@/lib/api";

export default function CommunityVolunteers() {
  const { data: volunteers = [], isLoading, isError } = useQuery<Volunteer[]>({
    queryKey: ["volunteers"],
    queryFn: fetchVolunteers,
  });

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-red-500 to-purple-500 text-white py-16 text-center">
        <h1 className="text-4xl font-bold mb-2">Community Volunteers</h1>
        <p className="text-lg">
          Celebrating the spirit of teamwork and dedication behind HBPL.
        </p>
      </section>

      {/* Description */}
      <div className="max-w-4xl mx-auto text-center px-6 mt-10">
        <p className="text-gray-700 leading-relaxed">
          Volunteers are the backbone of the Harpur Belahi Premier League. Their dedication and
          passion are the driving forces behind every successful match, event, and community
          initiative. From maintaining the grounds to managing scores and ensuring a welcoming
          atmosphere for all, our volunteers do it all. We are immensely grateful for their
          invaluable contributions, which make the HBPL a vibrant and thriving community.
        </p>
      </div>

      {/* Gallery */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        )}
        {isError && (
          <p className="text-center text-red-500 py-8">Failed to load volunteers. Please try again later.</p>
        )}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {volunteers.map((v) => (
              <div
                key={v.id}
                className="bg-white shadow-md rounded-2xl overflow-hidden text-center border hover:shadow-lg transition"
              >
                <img
                  src={v.img}
                  alt={v.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{v.name}</h3>
                  <p className="text-sm text-gray-500">{v.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="text-center py-10">
        <h2 className="text-xl font-medium mb-4">Want to join our volunteer team?</h2>
        <button className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-full shadow-md transition">
          Contact Us
        </button>
      </div>

      
    </div>
  );
}
