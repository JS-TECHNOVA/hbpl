"use client";

import Link from "next/link";
import {
  Trophy,
  Calendar,
  Users,
  TrendingUp,
  GraduationCap,
  FileText,
  Medal,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import CountdownTimer from "@/components/CountdownTimer";
import heroImage from "@/assets/hero-cricket.jpg";
import hbplLogo from "@/assets/hbpl_logo-removebg-preview.png";
import { useLanguage } from "@/hooks/use-language";
import { tr } from "@/lib/i18n";

const Home = () => {
  const { language } = useLanguage();
  // Set tournament start date to 10 June 2026
  const nextMatch = new Date('2026-06-10T00:00:00');

  const features = [
    {
      icon: Trophy,
      title: {
        en: "Premier Cricket League",
        hi: "प्रीमियर क्रिकेट लीग",
      },
      description: {
        en: "Structured T20-style tournament with fixtures, standings, and live scores for every match.",
        hi: "फिक्स्चर, अंकों की तालिका और हर मैच के लाइव स्कोर के साथ एक संरचित T20 शैली की प्रतियोगिता।",
      },
    },
    {
      icon: GraduationCap,
      title: {
        en: "General Aptitude Competition (Class 5–10)",
        hi: "जनरल एपटिट्यूड प्रतियोगिता (कक्षा 5–10)",
      },
      description: {
        en: "District-level exam for students of Classes 5 to 10, focused on reasoning, academics, and general awareness.",
        hi: "कक्षा 5 से 10 तक के विद्यार्थियों के लिए जिला स्तरीय परीक्षा, जो तर्क, शैक्षणिक योग्यता और सामान्य ज्ञान पर केंद्रित है।",
      },
    },
    {
      icon: Users,
      title: {
        en: "For Players & Students",
        hi: "खिलाड़ियों और विद्यार्थियों के लिए",
      },
      description: {
        en: "One platform where young cricketers and bright students grow together through sports and education.",
        hi: "एक ऐसा मंच जहाँ युवा क्रिकेटर और होनहार विद्यार्थी खेल और शिक्षा के माध्यम से साथ-साथ आगे बढ़ते हैं।",
      },
    },
    {
      icon: FileText,
      title: {
        en: "Transparent & Professionally Managed",
        hi: "पारदर्शी और प्रोफ़ेशनल प्रबंधन",
      },
      description: {
        en: "Digital fixtures, live updates, clear exam pattern, and well-defined processes for schools and teams.",
        hi: "डिजिटल फिक्स्चर, लाइव अपडेट, स्पष्ट परीक्षा पैटर्न और स्कूलों व टीमों के लिए सुव्यवस्थित प्रक्रिया।",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 🏏 Hero Section */}
      <section className="relative h-[650px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage.src})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background/95" />
        </div>

        <motion.div
          className="relative z-10 text-center px-4 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <motion.img
            src={hbplLogo.src}
            alt="HBPL Logo"
            className="mx-auto mb-6 h-28 w-28 rounded-full bg-white/5 p-2 shadow-md"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          <span className="inline-flex items-center gap-2 mb-4 px-4 py-1 text-xs md:text-sm tracking-[0.25em] uppercase rounded-full bg-muted/60 text-muted-foreground border border-border">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            {tr(
              "Harpur Belahi Premier League • General Aptitude Competition (Class 5–10)",
              "हरपुर बेलाही प्रीमियर लीग • सामान्य अभिक्षमता प्रतियोगिता (कक्षा 5–10)",
              language
            )}
          </span>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {tr(
                "Where Cricket Meets Classroom Excellence",
                "जहाँ क्रिकेट मिलता है पढ़ाई की उत्कृष्टता से",
                language
              )}
            </span>
          </h1>

          <p className="text-base md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            {tr(
              "HBPL is for both a high-energy cricket league and a district-level general aptitude competition for Classes 5 to 10 helping young players and students grow on and off the field.",
              "HBPL एक हाई-एनर्जी क्रिकेट लीग के साथ-साथ कक्षा 5 से 10 तक के लिए जिला स्तरीय सामान्य अभिक्षमता प्रतियोगिता भी है, जो युवाओं को मैदान के भीतर और बाहर दोनों जगह आगे बढ़ने में मदद करती है।",
              language
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://forms.gle/i96EQf9S1Xbkvgi28"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="text-sm md:text-lg px-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                {tr("Register Your Cricket Team", "क्रिकेट टीम पंजीकरण", language)}
              </Button>
            </a>
            <Link href="/exam-portal">
              <Button
                size="lg"
                variant="secondary"
                className="text-sm md:text-lg px-8 hover:scale-105 transition-all duration-300"
              >
                {tr("Go To Exam Portal", "एग्ज़ाम पोर्टल देखें", language)}
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs md:text-sm text-muted-foreground max-w-xl mx-auto">
            {tr(
              "For school students (Classes 5 to 10) and local cricket teams from Harpur Belahi and nearby areas.",
              "कक्षा 5 से 10 तक के स्कूल विद्यार्थियों और हरपुर बेलाही व आसपास की स्थानीय क्रिकेट टीमों के लिए।",
              language
            )}
          </p>
        </motion.div>
      </section>

      {/* ⏱ Countdown Section */}
      <section className="py-16 bg-gradient-to-r from-background via-muted/40 to-background">
        <div className="container mx-auto px-4 text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {tr("Tournament Countdown", "टूर्नामेंट की उलटी गिनती", language)}
          </motion.h2>
          <p className="text-muted-foreground mb-8">
            {tr("125 days left in tournament! Get ready for the ultimate showdown!", "टूर्नामेंट में 125 दिन बाकी! शानदार मुकाबले के लिए तैयार हो जाइए!", language)}
          </p>
          <CountdownTimer targetDate={nextMatch} />
        </div>
      </section>

      {/* 🌟 Features Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {tr("Why HBPL is Different", "HBPL क्यों खास है", language)}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {tr(
                "HBPL is not just a cricket league. We bring together professional cricket management and an academic aptitude competition so that young people can excel in both sports and studies.",
                "HBPL सिर्फ एक क्रिकेट लीग नहीं है। हम प्रोफ़ेशनल क्रिकेट मैनेजमेंट और एक शैक्षणिक अभिक्षमता प्रतियोगिता को साथ लाकर युवाओं को खेल और पढ़ाई दोनों में उत्कृष्टता का मौका देते हैं।",
                language
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title.en}
                className="bg-card border border-border rounded-xl p-8 shadow-md hover:shadow-lg hover:-translate-y-2 transition-all duration-300"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-5 mx-auto">
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">
                  {language === "hi" ? feature.title.hi : feature.title.en}
                </h3>
                <p className="text-muted-foreground text-center">
                  {language === "hi" ? feature.description.hi : feature.description.en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ⚙ How HBPL Works */}
      <section className="py-16 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {tr("How HBPL Works", "HBPL कैसे काम करता है", language)}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              {tr(
                "Simple steps for both cricket teams and schools: register, receive fixtures or syllabus, participate, and celebrate results.",
                "क्रिकेट टीमों और स्कूलों दोनों के लिए सरल स्टेप्स: रजिस्ट्रेशन, फिक्स्चर/सिलेबस प्राप्त करना, भाग लेना और परिणामों का जश्न मनाना।",
                language
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: {
                  en: "Register",
                  hi: "रजिस्टर करें",
                },
                text: {
                  en: "Cricket teams and schools complete registration through the HBPL platform.",
                  hi: "क्रिकेट टीमें और स्कूल HBPL प्लेटफ़ॉर्म के माध्यम से रजिस्ट्रेशन पूरा करते हैं।",
                },
              },
              {
                step: "02",
                title: {
                  en: "Get Schedule & Syllabus",
                  hi: "शेड्यूल और सिलेबस प्राप्त करें",
                },
                text: {
                  en: "Teams receive match fixtures while students receive exam dates and detailed syllabus.",
                  hi: "टीमों को मैच फिक्स्चर मिलते हैं और विद्यार्थियों को परीक्षा तिथि व विस्तृत सिलेबस दिया जाता है।",
                },
              },
              {
                step: "03",
                title: {
                  en: "Play & Perform",
                  hi: "खेलें और प्रदर्शन करें",
                },
                text: {
                  en: "Matches are played on ground; students appear in the offline aptitude exam.",
                  hi: "मैच ग्राउंड पर खेले जाते हैं और विद्यार्थी ऑफ़लाइन अभिक्षमता परीक्षा देते हैं।",
                },
              },
              {
                step: "04",
                title: {
                  en: "Results & Awards",
                  hi: "परिणाम और पुरस्कार",
                },
                text: {
                  en: "Scores, rankings, and toppers are announced with medals, certificates, and recognition.",
                  hi: "स्कोर, रैंकिंग और टॉपर की घोषणा मेडल, सर्टिफिकेट और सम्मान के साथ की जाती है।",
                },
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-primary font-bold text-sm mb-1">{item.step}</div>
                <h3 className="font-semibold mb-2 text-base md:text-lg">
                  {language === "hi" ? item.title.hi : item.title.en}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {language === "hi" ? item.text.hi : item.text.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎓 Exam Portal Promo Section */}
      <section className="py-20 bg-gradient-to-r from-muted/40 via-background to-muted/40 border-y border-border">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1 text-xs tracking-[0.2em] uppercase rounded-full bg-accent/10 text-accent border border-accent/40">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              {tr(
                "New • HBPL General Aptitude Competition 2026",
                "नया • HBPL जनरल एपटिट्यूड प्रतियोगिता 2026",
                language
              )}
            </span>

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {tr("HBPL Exam Portal", "HBPL एग्ज़ाम पोर्टल", language)}
            </h2>
            <p className="text-muted-foreground mb-4 max-w-xl">
              {tr(
                "Along with world-class cricket, HBPL also nurtures young scholars through the HBPL General Aptitude Competition — a district-level exam for Classes 5 to 10 focusing on reasoning, academics, and general awareness.",
                "विश्वस्तरीय क्रिकेट के साथ-साथ HBPL युवा विद्यार्थियों को HBPL जनरल एपटिट्यूड प्रतियोगिता के माध्यम से प्रोत्साहित करता है — यह कक्षा 5 से 10 तक के लिए जिला स्तरीय परीक्षा है जो तर्क, पढ़ाई और सामान्य ज्ञान पर केंद्रित है।",
                language
              )}
            </p>
            <p className="text-muted-foreground mb-6 max-w-xl">
              {tr(
                "The exam is conducted offline, covers multiple subjects, and rewards top performers with medals, certificates, and recognition on the HBPL stage.",
                "यह परीक्षा ऑफ़लाइन आयोजित की जाती है, कई विषयों को कवर करती है और श्रेष्ठ प्रदर्शन करने वाले विद्यार्थियों को मेडल, सर्टिफिकेट और HBPL मंच पर सम्मान के साथ पुरस्कृत करती है।",
                language
              )}
            </p>

            <div className="flex flex-wrap gap-4 mb-4">
              <Link href="/exam-portal">
                <Button
                  size="lg"
                  className="text-sm md:text-base px-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  {tr("Explore Exam Portal", "एग्ज़ाम पोर्टल देखें", language)}
                </Button>
              </Link>
              <a
                href="/syllabus.pdf"
                download
                className="inline-flex items-center gap-2 text-sm md:text-base px-4 py-2 rounded-full border border-accent/60 text-accent hover:bg-accent/10 transition-colors"
              >
                ⬇ Download Syllabus
              </a>
            </div>

            <p className="text-xs md:text-sm text-muted-foreground max-w-md">
              {tr(
                "Registrations are accepted through participating schools. Check the Exam Portal page for important dates, centers, and detailed pattern.",
                "रजिस्ट्रेशन भाग लेने वाले स्कूलों के माध्यम से स्वीकार किए जाते हैं। महत्वपूर्ण तिथियों, केंद्रों और विस्तृत पैटर्न के लिए एग्ज़ाम पोर्टल पेज देखें।",
                language
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex gap-3 items-start">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">For Classes 5–10</h3>
                <p className="text-xs text-muted-foreground">
                  Open to students from Class 5 to 10 across Harpur Belahi and nearby areas.
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex gap-3 items-start">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Offline Exam</h3>
                <p className="text-xs text-muted-foreground">
                  90 minutes, 90 marks, multi-subject objective paper with no negative marking.
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex gap-3 items-start sm:col-span-2">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Medal className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Awards & Recognition</h3>
                <p className="text-xs text-muted-foreground">
                  Toppers are featured on the HBPL Exam Portal with medals, certificates, and public felicitation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🏆 Call to Action */}
      <section className="py-20 bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground">
        <motion.div
          className="container mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {tr("Ready to Join the Action?", "क्या आप जुड़ने के लिए तैयार हैं?", language)}
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            {tr(
              "Register your team today and be part of cricket history — limited slots available!",
              "आज ही अपनी टीम को रजिस्टर करें और क्रिकेट इतिहास का हिस्सा बनें — सीमित स्लॉट उपलब्ध!",
              language
            )}
          </p>
          <a
            href="https://forms.gle/i96EQf9S1Xbkvgi28"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 hover:scale-105 transition-transform duration-300"
            >
              {tr("Register Now", "अभी रजिस्टर करें", language)}
            </Button>
          </a>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
