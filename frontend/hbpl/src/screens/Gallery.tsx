"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGallery } from "@/lib/api";
import g1 from "@/assets/g1.jpg";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";

const imageMap: Record<string, string> = {
  g1: g1.src,
  g2: g2.src,
  g3: g3.src,
};

const Gallery = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: galleryImages = [], isLoading, isError } = useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGallery,
  });

  const categories = ["All", "Action", "Ceremony", "Team"];

  const filteredImages =
    activeCategory === "All"
      ? galleryImages
      : galleryImages.filter((img) => img.category === activeCategory);

  const selectedImage = selectedId !== null
    ? galleryImages.find((img) => img.id === selectedId)
    : null;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Photo{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gallery
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Relive the most memorable moments from HBPL tournaments
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <p className="text-center text-muted-foreground py-20">Loading gallery...</p>
        )}
        {isError && (
          <p className="text-center text-destructive py-20">Failed to load gallery.</p>
        )}

        {/* Gallery Grid */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image, index) => (
              <div
                key={image.id}
                onClick={() => setSelectedId(image.id)}
                className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer shadow-card hover:shadow-hover transition-all duration-300 hover:-translate-y-1 animate-scale-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <img
                  src={image.image_url ?? imageMap[image.image_key] ?? ''}
                  alt={image.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter brightness-90 group-hover:brightness-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                  <div className="p-4 w-full">
                    <h3 className="font-semibold text-white">{image.title}</h3>
                    <p className="text-sm text-gray-300">{image.category}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedId(null)}
          >
            <button
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              onClick={() => setSelectedId(null)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
            <div className="max-w-5xl w-full aspect-video rounded-lg overflow-hidden shadow-lg animate-scale-in">
              <img
                src={selectedImage.image_url ?? imageMap[selectedImage.image_key] ?? ''}
                alt={selectedImage.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Upload CTA */}
        <div className="mt-16 bg-gradient-hero text-primary-foreground rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Share Your HBPL Moments</h2>
          <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
            Have great photos from HBPL matches? Share them with us and get featured in our gallery!
          </p>
          <button
            onClick={() => (window.location.href = "mailto:gallery@hbpl.com")}
            className="px-8 py-3 bg-card text-card-foreground rounded-lg font-semibold hover:bg-card/90 transition-colors"
          >
            Submit Photos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Gallery;
