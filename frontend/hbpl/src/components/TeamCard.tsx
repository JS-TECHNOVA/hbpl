import { Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";

interface TeamCardProps {
  name: string;
  captain: string;
  logo?: string;
  description?: string;
  onClick?: () => void;
}

const TeamCard = ({ name, captain, logo, description, onClick }: TeamCardProps) => {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-hover transition-all duration-300 hover:-translate-y-1 overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
        <div className="flex items-center justify-center">
          {logo ? (
            <Image
              width={96}
              height={96}
              src={logo} 
              alt={`${name} logo`} 
              className="h-24 w-24 object-contain transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Users className="h-12 w-12 text-primary-foreground" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
        <p className="text-sm text-muted-foreground mb-1">
          <span className="font-semibold text-foreground">Captain:</span> {captain}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground mt-3">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamCard;
