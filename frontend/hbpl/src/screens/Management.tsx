"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { tr } from "@/lib/i18n";
import { fetchManagement } from "@/lib/api";
import alokhnath from "@/assets/alokhnath.png";
import sonu from "@/assets/sonu.png";
import sunil from "@/assets/sunil.png";
import pawan from "@/assets/pawan.png";
import nuraalam from "@/assets/nuraalam.png";
import amar from "@/assets/amar.png";
import ramekbal from "@/assets/ramekbal-removebg-preview.png";
import santosh from "@/assets/Santosh_Gupta-removebg-preview.png";
import Harendra from "@/assets/Harendra_Kushwaha-removebg-preview.png";

// Fallback static images keyed by image_key or partial name match
const STATIC_IMAGES: Record<string, string> = {
  alokhnath: alokhnath.src,
  sonu: sonu.src,
  sunil: sunil.src,
  pawan: pawan.src,
  nuraalam: nuraalam.src,
  amar: amar.src,
  ramekbal: ramekbal.src,
  santosh: santosh.src,
  harendra: Harendra.src,
};

function getStaticImage(member: { image_key: string; name: string }): string | undefined {
  if (member.image_key && STATIC_IMAGES[member.image_key]) return STATIC_IMAGES[member.image_key];
  const key = member.name.toLowerCase().split(" ")[0];
  return STATIC_IMAGES[key];
}

const Management = () => {
  const { language } = useLanguage();

  const { data: team = [], isLoading, isError } = useQuery({
    queryKey: ["management"],
    queryFn: fetchManagement,
  });

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {tr("Meet Our", "हमारी", language)}{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {tr("Management Team", "प्रबंधन टीम", language)}
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {tr(
              "The dedicated professionals who make HBPL a world-class cricket tournament",
              "समर्पित पेशेवर जो HBPL को एक विश्व स्तरीय क्रिकेट टूर्नामेंट बनाते हैं",
              language
            )}
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isError && (
          <p className="text-center text-destructive py-20">Failed to load management team.</p>
        )}

        {/* Team Grid */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => {
              const imgSrc = member.image_url ?? getStaticImage(member) ?? "";
              return (
                <div
                  key={member.id}
                  className="bg-card border border-border rounded-lg overflow-hidden shadow-card hover:shadow-hover transition-all duration-300 hover:-translate-y-1 animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Avatar */}
                  <div className="h-56 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={member.name}
                        className="h-40 w-40 rounded-full object-cover border-4 border-white shadow-md"
                      />
                    ) : (
                      <div className="h-40 w-40 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-400">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-1">{member.name}</h3>
                    <p className="text-primary font-semibold mb-3">{member.role}</p>
                    <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{member.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-hero text-primary-foreground rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {tr("Want to Join Our Team?", "हमारी टीम से जुड़ना चाहते हैं?", language)}
          </h2>
          <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
            {tr(
              "We're always looking for passionate cricket enthusiasts to help us grow HBPL.",
              "हम हमेशा उत्साही क्रिकेट प्रेमियों की तलाश में रहते हैं।",
              language
            )}
          </p>
          <Button size="lg" variant="secondary" onClick={() => (window.location.href = "mailto:info@hbpl.com")}>
            {tr("Contact Us", "हमसे संपर्क करें", language)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Management;
