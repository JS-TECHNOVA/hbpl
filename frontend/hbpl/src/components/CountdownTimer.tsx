import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({ targetDate, className = "" }: CountdownTimerProps) => {
  const initialTimeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const calculateTimeLeft = (): TimeLeft => {
    const difference = +targetDate - +new Date();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    
    return initialTimeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(initialTimeLeft);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timeUnits = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className={`flex gap-4 justify-center ${className}`}>
      {timeUnits.map((unit, index) => (
        <div
          key={unit.label}
          className="flex flex-col items-center animate-scale-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="bg-card border border-border rounded-lg p-4 min-w-[80px] shadow-card hover:shadow-hover transition-shadow duration-300">
            <div className="text-3xl md:text-4xl font-bold text-primary tabular-nums">
              {String(unit.value).padStart(2, "0")}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-2 font-medium">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
