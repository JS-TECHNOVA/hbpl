"use client";

import { useQuery } from "@tanstack/react-query";
import TeamCard from "@/components/TeamCard";
import { useToast } from "@/hooks/use-toast";
import { fetchTeams } from "@/lib/api";

const Teams = () => {
  const { toast } = useToast();

  const { data: teams = [], isLoading, isError } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  console.log(teams)

  const handleTeamClick = (teamName: string) => {
    toast({
      title: "Team Profile",
      description: `${teamName} - Full profile coming soon!`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <p className="text-muted-foreground">Loading teams...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <p className="text-destructive">Failed to load teams. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Participating{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Teams
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Meet the {teams.length} teams competing for the HBPL championship trophy
          </p>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teams.map((team, index) => (
            <div
              key={team.id}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <TeamCard
                name={team.team_name}
                captain={team.captain_name}
                description={team.address}
                logo={team.team_image || undefined}
                onClick={() => handleTeamClick(team.team_name)}
              />
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-card border border-border rounded-lg p-8 md:p-12 text-center shadow-card">
          <h2 className="text-2xl font-bold mb-4">Team Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold text-primary mb-2">Squad Size</h3>
              <p className="text-muted-foreground text-sm">
                Each team must have 9-11 registered players
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Registration</h3>
              <p className="text-muted-foreground text-sm">
                Complete registration form with all player details
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Equipment</h3>
              <p className="text-muted-foreground text-sm">
                Teams must have matching jerseys with player names
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;
