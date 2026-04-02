"use client";

import { Target, Award, Heart, Zap, GraduationCap, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { tr } from "@/lib/i18n";

const About = () => {
  const { language } = useLanguage();

  const values = [
    {
      icon: Target,
      title: {
        en: "Our Mission",
        hi: "हमारा उद्देश्य",
      },
      description: {
        en: "To promote both cricket excellence and academic growth by offering a premier league and a structured general aptitude competition.",
        hi: "एक प्रीमियर लीग और संरचित जनरल एपटिट्यूड प्रतियोगिता के माध्यम से क्रिकेट उत्कृष्टता और शैक्षणिक विकास दोनों को बढ़ावा देना।",
      },
    },
    {
      icon: Award,
      title: {
        en: "Excellence",
        hi: "उत्कृष्टता",
      },
      description: {
        en: "We maintain high standards in tournament organization and exam conduct, from facilities and officials to question design.",
        hi: "टूर्नामेंट संगठन और परीक्षा संचालन में हम उच्च मानक बनाए रखते हैं — सुविधाओं और अधिकारियों से लेकर प्रश्न-पत्र निर्माण तक।",
      },
    },
    {
      icon: GraduationCap,
      title: {
        en: "Holistic Growth",
        hi: "समग्र विकास",
      },
      description: {
        en: "We believe champions are built on and off the field—giving students opportunities to shine in sports and studies.",
        hi: "हम मानते हैं कि चैंपियन मैदान के अंदर और बाहर दोनों जगह बनते हैं — इसलिए हम छात्रों को खेल और पढ़ाई दोनों में चमकने के अवसर देते हैं।",
      },
    },
    {
      icon: Heart,
      title: {
        en: "Community & Passion",
        hi: "समुदाय और जुनून",
      },
      description: {
        en: "HBPL is powered by local volunteers, educators, and cricket lovers who want to uplift Harpur Belahi youth.",
        hi: "HBPL स्थानीय स्वयंसेवकों, शिक्षकों और क्रिकेट प्रेमियों द्वारा संचालित है जो हरपुर बेलाही के युवाओं को आगे बढ़ाना चाहते हैं।",
      },
    },
    {
      icon: Zap,
      title: {
        en: "Innovation",
        hi: "नवाचार",
      },
      description: {
        en: "From live scoring and fixtures to a digital exam portal and downloadable syllabus, we embrace technology for a better experience.",
        hi: "लाइव स्कोरिंग और फिक्स्चर से लेकर डिजिटल एग्ज़ाम पोर्टल और डाउनलोड करने योग्य सिलेबस तक, हम बेहतर अनुभव के लिए टेक्नोलॉजी को अपनाते हैं।",
      },
    },
    {
      icon: Users,
      title: {
        en: "Opportunity for All",
        hi: "सभी के लिए अवसर",
      },
      description: {
        en: "School students (Class 5–10) and local teams get equal access to compete, learn, and celebrate together.",
        hi: "स्कूल के विद्यार्थी (कक्षा 5–10) और स्थानीय टीमें — सभी को प्रतिस्पर्धा करने, सीखने और साथ मिलकर जश्न मनाने का समान अवसर मिलता है।",
      },
    },
  ];

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="grid md:grid-cols-2 gap-10 items-center mb-16 animate-fade-in">
          <div>
            <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-muted-foreground mb-3">
              {tr(
                "About Harpur Belahi Premier League",
                "हरपुर बेलाही प्रीमियर लीग के बारे में",
                language
              )}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {tr("A Home for", "एक ऐसा मंच जहाँ", language)}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent ml-2">
                {tr("Sports & Studies", "खेल और पढ़ाई", language)}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
              {tr(
                "HBPL is more than a cricket tournament. We are a community initiative that runs both a professionally managed premier league and a district-level general aptitude competition for Classes 5 to 10.",
                "HBPL सिर्फ एक क्रिकेट टूर्नामेंट नहीं है। यह एक सामुदायिक पहल है जो एक प्रोफ़ेशनली मैनेज्ड प्रीमियर लीग और कक्षा 5 से 10 तक के लिए जिला स्तरीय जनरल एपटिट्यूड प्रतियोगिता दोनों का संचालन करती है।",
                language
              )}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-card flex gap-3 items-start">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {tr('Cricket League', 'क्रिकेट लीग', language)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tr(
                    'Structured fixtures, live scoring, and competitive yet friendly matches for local teams.',
                    'स्थानीय टीमों के लिए संरचित फिक्स्चर, लाइव स्कोरिंग और प्रतिस्पर्धी लेकिन दोस्ताना मैच।',
                    language
                  )}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-card flex gap-3 items-start">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  {tr('General Aptitude Competition', 'जनरल एपटिट्यूड प्रतियोगिता', language)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tr(
                    'A district-level exam for Classes 5–10 that tests reasoning, academics, and general awareness.',
                    'कक्षा 5–10 के विद्यार्थियों के लिए जिला स्तरीय परीक्षा जो तर्क क्षमता, शैक्षणिक ज्ञान और सामान्य जागरूकता को परखती है।',
                    language
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-card border border-border rounded-lg p-8 md:p-12 shadow-card mb-12">
          <h2 className="text-3xl font-bold mb-6">
            {tr('Our Story', 'हमारी कहानी', language)}
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              {tr(
                'Founded in 2025, the Harpur Belahi Premier League started as a small community effort to give local cricketers a professional platform. Over time, HBPL has grown into a structured league with clear rules, fixtures, and a passionate fan base.',
                'सन् 2025 में स्थापित हरपुर बेलाही प्रीमियर लीग की शुरुआत स्थानीय क्रिकेटरों को एक प्रोफ़ेशनल मंच देने की एक छोटी सी सामुदायिक पहल के रूप में हुई थी। समय के साथ HBPL स्पष्ट नियमों, फिक्स्चर और उत्साही दर्शकों के साथ एक सुव्यवस्थित लीग बन चुका है।',
                language
              )}
            </p>
            <p>
              {tr(
                'As we worked with schools and families, we realized that young people needed equal opportunities in academics. That is how the HBPL General Aptitude Competition was born—a written exam that lets students from Class 5 to 10 showcase their knowledge and logical thinking.',
                'जब हमने स्कूलों और परिवारों के साथ काम किया, तो हमें एहसास हुआ कि युवाओं को शैक्षणिक क्षेत्र में भी समान अवसरों की आवश्यकता है। इसी विचार से HBPL जनरल एपटिट्यूड प्रतियोगिता की शुरुआत हुई — एक लिखित परीक्षा जो कक्षा 5 से 10 तक के विद्यार्थियों को अपने ज्ञान और तार्किक सोच को प्रदर्शित करने का अवसर देती है।',
                language
              )}
            </p>
            <p>
              {tr(
                'Today, HBPL stands at the intersection of sports and education. We are committed to building confident players, curious learners, and a strong, connected community in and around Harpur Belahi.',
                'आज HBPL खेल और शिक्षा के संगम पर खड़ा है। हमारा लक्ष्य हरपुर बेलाही और आसपास के क्षेत्रों में आत्मविश्वासी खिलाड़ी, जिज्ञासु विद्यार्थी और सशक्त, जुड़ा हुआ समुदाय तैयार करना है।',
                language
              )}
            </p>
          </div>
        </div>

        {/* Values Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">
            {tr('What HBPL Stands For', 'HBPL किन मूल्यों पर खड़ा है', language)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <div
                key={value.title.en}
                className="bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-hover transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <value.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {language === 'hi' ? value.title.hi : value.title.en}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === 'hi' ? value.description.hi : value.description.en}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-hero text-primary-foreground rounded-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-8 text-center">
            {tr('HBPL At a Glance', 'एक नजर में HBPL', language)}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "20+", label: "Cricket Matches" },
              { number: "8", label: "League Teams" },
              { number: "200+", label: "Student Participants" },
              { number: "10+", label: "Partner Schools" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                <div className="text-sm md:text-base opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
