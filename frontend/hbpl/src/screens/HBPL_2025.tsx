"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Previous season (2025) completed matches - 7 total (4 league, 2 semi-final, 1 final)
// Dummy data is structured as a consistent bracket where Laximpur Cricket Club are champions and
// Raj Cricket Club - Tamkuhi Raj are runners-up.
const previousSeasonMatches = [
  {
    id: 1,
    stage: "League Match 1",
    type: "league" as const,
    date: "2025-05-10",
    venue: "HBPL Stadium ",
    team1: "Laximpur Cricket Club",
    team2: "Crazy Eleven Cricket Club",
    team1Score: "58/6 (8)",
    team2Score: "49/8 (8)",
    result: "Laximpur Cricket Club won by 9 runs",
    playerOfMatch: "Ankit Yadav",
  },
  {
    id: 2,
    stage: "League Match 2",
    type: "league" as const,
    date: "2025-05-11",
    venue: "HBPL Stadium ",
    team1: "Raj Cricket Club - Tamkuhi Raj",
    team2: "Maa Maha Maya Cricket Club - Surajpur Kerta",
    team1Score: "65/7 (8)",
    team2Score: "60/9 (8)",
    result: "Raj Cricket Club - Tamkuhi Raj won by 5 runs",
    playerOfMatch: "Hasan Ansari",
  },
  {
    id: 3,
    stage: "League Match 3",
    type: "league" as const,
    date: "2025-05-12",
    venue: "HBPL Stadium ",
    team1: "Eleven Star Cricket Club - Imilia",
    team2: "Storm Riders",
    team1Score: "72/6 (8)",
    team2Score: "66/9 (8)",
    result: "Eleven Star Cricket Club - Imilia won by 6 runs",
    playerOfMatch: "O. P. Sahani",
  },
  {
    id: 4,
    stage: "League Match 4",
    type: "league" as const,
    date: "2025-05-13",
    venue: "HBPL Stadium ",
    team1: "Star Cricket Club - Kasia",
    team2: "Tufan Cricket Club",
    team1Score: "51/5 (8)",
    team2Score: "50/8 (8)",
    result: "Star Cricket Club - Kasia won by 1 runs",
    playerOfMatch: "Niraj Singh",
  },
  {
    id: 5,
    stage: "Semi Final 1",
    type: "semi" as const,
    date: "2025-05-16",
    venue: "HBPL Stadium ",
    // Semi-final between league toppers Laximpur and Eleven Star
    team1: "Laximpur Cricket Club",
    team2: "Eleven Star Cricket Club - Imilia",
    team1Score: "62/4 (8)",
    team2Score: "58/7 (8)",
    result: "Laximpur Cricket Club won by 4 runs",
    playerOfMatch: "Rahul Sharma",
  },
  {
    id: 6,
    stage: "Semi Final 2",
    type: "semi" as const,
    date: "2025-05-17",
    venue: "HBPL Stadium ",
    // Semi-final between league toppers Raj and Star CC - Kasia
    team1: "Raj Cricket Club - Tamkuhi Raj",
    team2: "Star Cricket Club - Kasia",
    team1Score: "69/6 (8)",
    team2Score: "67/9 (8)",
    result: "Raj Cricket Club - Tamkuhi Raj won by 3 runs",
    playerOfMatch: "Hasan Ansari",
  },
  {
    id: 7,
    stage: "Final",
    type: "final" as const,
    date: "2025-05-20",
    venue: "HBPL Main Stadium",
    // Grand final: Laximpur Cricket Club vs Raj Cricket Club - Tamkuhi Raj
    team1: "Laximpur Cricket Club",
    team2: "Raj Cricket Club - Tamkuhi Raj",
    team1Score: "56/6 (20)",
    team2Score: "54/8 (20)",
    result: "Laximpur Cricket Club won HBPL 2025 by 2 runs",
    playerOfMatch: "Rahul Sharma",
  },
];

const HBPL2025 = () => {
  const [filter, setFilter] = useState<"all" | "league" | "semi" | "final">("all");

  const filteredMatches =
    filter === "all" ? previousSeasonMatches : previousSeasonMatches.filter((m) => m.type === filter);

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-muted-foreground mb-3">
            HBPL Cricket Tournament
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">Previous Session Results (HBPL 2025)</h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-3xl mx-auto">
            All seven matches from the May 2025 HBPL season are listed below: four league matches, two semi-finals, and
            one grand final. Laximpur Cricket Club were crowned champions, with Raj Cricket Club - Tamkuhi Raj as
            runners-up.
          </p>
          <p className="mt-3 text-xs md:text-sm text-muted-foreground max-w-2xl mx-auto">
            Looking for upcoming fixtures?{" "}
            <Link href="/schedule" className="text-primary font-semibold hover:underline">
              View HBPL 2026 May schedule &amp; fixtures
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Match-wise Breakdown</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Use the filters to quickly view only league matches, semi-finals, or the grand final.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs md:text-sm">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("league")}
              className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition-colors ${
                filter === "league"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              League
            </button>
            <button
              type="button"
              onClick={() => setFilter("semi")}
              className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition-colors ${
                filter === "semi"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              Semi-finals
            </button>
            <button
              type="button"
              onClick={() => setFilter("final")}
              className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition-colors ${
                filter === "final"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              Final
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <Card
              key={match.id}
              className="hover:shadow-hover transition-all duration-300 hover:-translate-y-1 animate-scale-in"
              style={{ animationDelay: `${match.id * 0.05}s` }}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <Badge variant="secondary" className="w-fit text-[10px] md:text-xs">
                        {match.stage}
                      </Badge>
                      <Badge variant="outline" className="w-fit">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(match.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Badge>
                      <Badge variant="outline" className="w-fit">
                        <MapPin className="h-3 w-3 mr-1" />
                        {match.venue}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="font-semibold text-sm md:text-base mb-1">{match.team1}</p>
                        <p className="text-lg md:text-xl font-bold">{match.team1Score}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="font-semibold text-sm md:text-base mb-1">{match.team2}</p>
                        <p className="text-lg md:text-xl font-bold">{match.team2Score}</p>
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-muted-foreground mb-1">
                      <span className="font-semibold text-foreground">Result:</span> {match.result}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Player of the Match:</span> {match.playerOfMatch}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HBPL2025;
