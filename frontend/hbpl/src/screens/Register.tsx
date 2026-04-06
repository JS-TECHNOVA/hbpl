"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { tr } from "@/lib/i18n";
import { submitRegistration } from "@/lib/api";

const formSchema = z.object({
  teamName: z.string()
    .trim()
    .min(3, { message: "Team name must be at least 3 characters" })
    .max(50, { message: "Team name must be less than 50 characters" }),
  captainName: z.string()
    .trim()
    .min(2, { message: "Captain name must be at least 2 characters" })
    .max(100, { message: "Captain name must be less than 100 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z.string()
    .trim()
    .min(10, { message: "Please enter a valid phone number" })
    .max(15, { message: "Phone number is too long" }),
  playerCount: z.string()
    .refine((val) => {
      const num = parseInt(val);
      return num >= 11 && num <= 15;
    }, { message: "Squad must have 11-15 players" }),
  message: z.string()
    .trim()
    .max(500, { message: "Message must be less than 500 characters" })
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

const Register = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: "",
      captainName: "",
      email: "",
      phone: "",
      playerCount: "",
      message: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await submitRegistration({
        team_name: data.teamName,
        captain_name: data.captainName,
        email: data.email,
        phone: data.phone,
        player_count: parseInt(data.playerCount),
        message: data.message ?? "",
      });
      setIsSubmitted(true);
      toast({
        title: "Registration Successful!",
        description: "Your team has been registered for HBPL. We'll contact you soon.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl text-center animate-scale-in">
          <div className="bg-card border border-border rounded-lg p-12 shadow-hover">
            <div className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-accent" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              {tr('Registration Successful!', 'पंजीकरण सफल!', language)}
            </h2>
            <p className="text-muted-foreground mb-8">
              {tr(
                'Thank you for registering your team for HBPL. Our team will review your application and contact you within 2-3 business days with further details.',
                'HBPL के लिए अपनी टीम को पंजीकृत करने के लिए धन्यवाद। हमारी टीम आपके आवेदन की समीक्षा करेगी और 2-3 कार्य दिवसों में आगे की जानकारी के लिए आपसे संपर्क करेगी।',
                language
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => setIsSubmitted(false)}>
                {tr('Register Another Team', 'एक और टीम रजिस्टर करें', language)}
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                {tr('Back to Home', 'होम पर वापस जाएं', language)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {tr('Team', 'टीम', language)} <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{tr('Registration', 'पंजीकरण', language)}</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            {tr('Register your team for the upcoming HBPL tournament', 'आगामी HBPL टूर्नामेंट के लिए अपनी टीम को पंजीकृत करें', language)}
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-card border border-border rounded-lg p-8 md:p-12 shadow-card animate-scale-in">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tr('Team Name *', 'टीम का नाम *', language)}</FormLabel>
                    <FormControl>
                      <Input placeholder={tr('Enter your team name', 'अपनी टीम का नाम दर्ज करें', language)} {...field} />
                    </FormControl>
                    <FormDescription>
                      {tr('Choose a unique name for your team', 'अपनी टीम के लिए एक अद्वितीय नाम चुनें', language)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="captainName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tr("Captain's Name *", 'कप्तान का नाम *', language)}</FormLabel>
                    <FormControl>
                      <Input placeholder={tr("Enter captain's full name", 'कप्तान का पूरा नाम दर्ज करें', language)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Email Address *', 'ईमेल पता *', language)}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="captain@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Phone Number *', 'फ़ोन नंबर *', language)}</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="playerCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tr('Number of Players *', 'खिलाड़ियों की संख्या *', language)}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={tr('11-15 players', '11-15 खिलाड़ी', language)}
                        min="11" 
                        max="15" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {tr('Each team must have 11-15 registered players', 'प्रत्येक टीम में 11-15 पंजीकृत खिलाड़ी होने चाहिए', language)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tr('Additional Information (Optional)', 'अतिरिक्त जानकारी (वैकल्पिक)', language)}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={tr("Any additional details you'd like to share...", 'कोई अतिरिक्त जानकारी जो आप साझा करना चाहें...', language)}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">
                  {tr('Registration Requirements:', 'पंजीकरण आवश्यकताएं:', language)}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{tr('Team must have 11-15 registered players', 'टीम में 11-15 पंजीकृत खिलाड़ी होने चाहिए', language)}</li>
                  <li>{tr('Registration fee: Rs.500 per team', 'पंजीकरण शुल्क: प्रति टीम ₹500', language)}</li>
                  <li>{tr('All players must be 18+ years old', 'सभी खिलाड़ी 18+ वर्ष के होने चाहिए', language)}</li>
                  <li>{tr('Submit player details within 7 days of registration', 'पंजीकरण के 7 दिनों के भीतर खिलाड़ियों का विवरण जमा करें', language)}</li>
                </ul>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? tr('Submitting...', 'सबमिट हो रहा है...', language)
                  : tr('Register Team', 'टीम पंजीकृत करें', language)}
              </Button>
            </form>
          </Form>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            {tr('Need help with registration? Contact us at', 'पंजीकरण में सहायता चाहिए? हमसे संपर्क करें:', language)}{" "}
            <a href="mailto:register@hbpl.club" className="text-primary hover:underline">
              register@hbpl.club
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
