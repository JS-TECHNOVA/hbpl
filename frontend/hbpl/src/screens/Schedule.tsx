"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CountdownTimer from "@/components/CountdownTimer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { tr } from "@/lib/i18n";
import Image from "next/image";
import { Calendar, MapPin, Clock, ChevronRight, Download, Trophy } from "lucide-react";
import { fetchMatches } from "@/lib/api";
import type { Match } from "@/lib/api";

const Schedule = () => {
  const { language } = useLanguage();
  const nextMatch = new Date("2026-06-10T00:00:00");

  const [previousFilter, setPreviousFilter] = useState<"all" | "league" | "semi" | "final">("all");
  const [liveScore, setLiveScore] = useState({
    team1: "TBD",
    team2: "TBD",
    status: "Tournament Starts Soon",
  });

  const { data: matches2026 = [], isLoading: loading2026 } = useQuery({
    queryKey: ["matches", 2026],
    queryFn: () => fetchMatches(2026),
  });

  const { data: matches2025 = [], isLoading: loading2025 } = useQuery({
    queryKey: ["matches", 2025],
    queryFn: () => fetchMatches(2025),
  });

  useEffect(() => {
    if (matches2026.length > 0) {
      setLiveScore({
        team1: matches2026[0].team1,
        team2: matches2026[0].team2,
        status: "Tournament Starts Soon",
      });
    }
  }, [matches2026]);

  const filteredPreviousMatches: Match[] =
    previousFilter === "all"
      ? matches2025
      : matches2025.filter((m) => m.match_type === previousFilter);

  const isLoading = loading2026 || loading2025;

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-muted-foreground mb-3">
            {tr("HBPL Cricket Tournament", "HBPL क्रिकेट टूर्नामेंट", language)}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {tr("Match", "मैच", language)}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent ml-2">
              {tr("Schedule & Results", "कार्यक्रम और परिणाम", language)}
            </span>
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-3xl mx-auto">
            {tr(
              "View upcoming HBPL 2026 fixtures for May and relive the highlights from the 2025 season including all league matches, semi-finals, and the grand final.",
              "मई 2026 के लिए आगामी HBPL फिक्स्चर देखें और 2025 सीजन की सभी लीग मैचों, सेमीफाइनल और ग्रैंड फाइनल की मुख्य बातें फिर से जीएं।",
              language
            )}
          </p>
        </div>

        {/* Live / Countdown Strip */}
        <div className="mb-10 grid md:grid-cols-2 gap-6">
          {/* Tournament preview card */}
          <Card className="shadow-card border border-border">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse-glow" />
                  <span className="text-sm font-semibold">
                    {tr("HBPL 2026 May Tournament", "HBPL 2026 मई टूर्नामेंट", language)}
                  </span>
                </div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Calendar className="h-3 w-3" /> May 2026
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-sm md:text-base">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">
                    {tr("Opening Match", "उद्घाटन मैच", language)}
                  </p>
                  <p className="font-semibold">{liveScore.team1} vs {liveScore.team2}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3" /> HBPL Main Stadium
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] md:text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  {tr("Tournament Starts Soon", "टूर्नामेंट जल्द शुरू होगा", language)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>05 May 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>4:00 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Countdown to next tournament */}
          <div className="bg-gradient-card rounded-lg p-6 shadow-card flex flex-col justify-center">
            <h2 className="text-lg md:text-2xl font-bold text-center mb-4">
              {tr(
                "Countdown to HBPL 2026",
                "HBPL 2026 की उलटी गिनती",
                language
              )}
            </h2>
            <CountdownTimer targetDate={nextMatch} />
          </div>
        </div>

        {/* Tabs for Upcoming vs Previous Season */}
        <Tabs defaultValue="upcoming" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="upcoming">
                {tr("Upcoming May 2026 Fixtures", "आगामी मई 2026 फिक्स्चर", language)}
              </TabsTrigger>
              <TabsTrigger value="previous">
                {tr("HBPL 2025 Results", "HBPL 2025 परिणाम", language)}
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              {tr(
                "Scroll or tap a match card to view key details.",
                "मुख्य जानकारी देखने के लिए मैच कार्ड को स्क्रॉल या टैप करें।",
                language
              )}
            </div>
          </div>

          {/* Upcoming 2026 */}
          <TabsContent value="upcoming" className="mt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">
                  {tr("HBPL 2026 – May Tournament Schedule", "HBPL 2026 – मई टूर्नामेंट कार्यक्रम", language)}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-3xl">
                  {tr(
                    "All league matches, semi-finals, and the grand final will be played in May 2026. Fixtures below are subject to minor changes based on ground conditions.",
                    "सभी लीग मैच, सेमीफाइनल और ग्रैंड फाइनल मई 2026 में खेले जाएंगे। नीचे दिए गए फिक्स्चर में मैदान की स्थिति के आधार पर मामूली बदलाव हो सकते हैं।",
                    language
                  )}
                </p>
              </div>
              <a
                href="/hbpl-2026-may-fixtures.pdf"
                download
                className="inline-flex items-center gap-2 self-start md:self-auto text-xs md:text-sm px-3 py-2 rounded-full border border-primary/60 text-primary hover:bg-primary/10 transition-colors"
              >
                <Download className="h-4 w-4" />
                {tr("Download fixtures PDF", "फिक्स्चर PDF डाउनलोड करें", language)}
              </a>
            </div>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading fixtures...</p>
            ) : (
              <div className="space-y-4">
                {matches2026.map((match) => (
                  <Card
                    key={match.id}
                    className="hover:shadow-hover transition-all duration-300 hover:-translate-y-1 animate-scale-in"
                    style={{ animationDelay: `${match.id * 0.05}s` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <Badge variant="outline" className="w-fit">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(match.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </Badge>
                            {match.time && (
                              <Badge variant="outline" className="w-fit">
                                <Clock className="h-3 w-3 mr-1" />
                                {match.time}
                              </Badge>
                            )}
                            <Badge variant="outline" className="w-fit">
                              <MapPin className="h-3 w-3 mr-1" />
                              {match.venue}
                            </Badge>
                            <Badge variant="secondary" className="w-fit text-[10px] md:text-xs">
                              {match.stage}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 flex flex-col items-end gap-1">
                              {match.team1_logo_url && (
                                <Image src={match.team1_logo_url} alt={match.team1} width={36} height={36} className="rounded-full object-cover border border-border" />
                              )}
                              <p className="font-semibold text-sm md:text-lg text-right">{match.team1}</p>
                            </div>
                            <div className="px-4 py-2 bg-muted rounded-lg font-bold text-muted-foreground text-xs md:text-sm">
                              VS
                            </div>
                            <div className="flex-1 flex flex-col items-start gap-1">
                              {match.team2_logo_url && (
                                <Image src={match.team2_logo_url} alt={match.team2} width={36} height={36} className="rounded-full object-cover border border-border" />
                              )}
                              <p className="font-semibold text-sm md:text-lg">{match.team2}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Previous 2025 season */}
          <TabsContent value="previous" className="mt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">
                  {tr("HBPL 2025 – Completed Matches", "HBPL 2025 – पूर्ण मैच", language)}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-3xl">
                  {tr(
                    "All seven matches from the May 2025 HBPL season are listed below: four league matches, two semi-finals, and one grand final. Laximpur Cricket Club were crowned champions, with Raj Cricket Club - Tamkuhi Raj as runners-up.",
                    "मई 2025 HBPL सीजन के सभी सात मैच नीचे सूचीबद्ध हैं: चार लीग मैच, दो सेमीफाइनल और एक ग्रैंड फाइनल। लक्ष्मीपुर क्रिकेट क्लब को चैंपियन और राज क्रिकेट क्लब - तमकुही राज को उपविजेता घोषित किया गया।",
                    language
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                {(["all", "league", "semi", "final"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPreviousFilter(f)}
                    className={`px-3 py-1.5 rounded-full border text-xs md:text-sm transition-colors ${
                      previousFilter === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f === "all"
                      ? tr("All", "सभी", language)
                      : f === "league"
                      ? tr("League", "लीग", language)
                      : f === "semi"
                      ? tr("Semi-finals", "सेमीफाइनल", language)
                      : tr("Final", "फाइनल", language)}
                  </button>
                ))}
              </div>
            </div>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading results...</p>
            ) : (
              <div className="space-y-4">
                {filteredPreviousMatches.map((match) => (
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
                              <p className="text-lg md:text-xl font-bold">{match.team1_score}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="font-semibold text-sm md:text-base mb-1">{match.team2}</p>
                              <p className="text-lg md:text-xl font-bold">{match.team2_score}</p>
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mb-1">
                            <span className="font-semibold text-foreground">
                              {tr("Result:", "परिणाम:", language)}
                            </span>{" "}
                            {match.result}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {tr("Player of the Match:", "मैच के खिलाड़ी:", language)}
                            </span>{" "}
                            {match.player_of_match}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Schedule;
