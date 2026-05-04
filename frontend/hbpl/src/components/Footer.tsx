"use client";

import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { tr } from "@/lib/i18n";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { language } = useLanguage();

  return (
		<footer className="bg-card border-t border-border mt-auto">
			<div className="container mx-auto px-4 py-12">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					{/* About Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
							HBPL
						</h3>
						<p className="text-sm text-muted-foreground">
							{tr(
								"Harpur Belahi Premier League — where cricket passion meets excellence. Join us for the most exciting tournament of the year.",
								"हरपुर बेलाही प्रीमियर लीग — जहाँ क्रिकेट का जुनून उत्कृष्टता से मिलता है। वर्ष के सबसे रोमांचक टूर्नामेंट से जुड़ें।",
								language,
							)}
						</p>
					</div>

					{/* Quick Links */}
					<div className="space-y-4">
						<h4 className="font-semibold text-foreground">
							{tr("Quick Links", "त्वरित लिंक", language)}
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link
									href="/about"
									className="hover:text-primary transition-colors"
								>
									{tr(
										"About HBPL",
										"HBPL के बारे में",
										language,
									)}
								</Link>
							</li>
							<li>
								<Link
									href="/teams"
									className="hover:text-primary transition-colors"
								>
									{tr("Teams", "टीमें", language)}
								</Link>
							</li>
							<li>
								<Link
									href="/schedule"
									className="hover:text-primary transition-colors"
								>
									{tr("Schedule", "कार्यक्रम", language)}
								</Link>
							</li>
							<li>
								<a
									href="/team-registration"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-primary transition-colors"
								>
									{tr(
										"Register Team",
										"टीम पंजीकरण",
										language,
									)}
								</a>
							</li>
							<li>
								<Link
									href="/exam-portal"
									className="hover:text-primary transition-colors"
								>
									{tr(
										"HBPL Exam Portal",
										"HBPL परीक्षा पोर्टल",
										language,
									)}
								</Link>
							</li>
						</ul>
					</div>

					{/* Contact Info */}
					<div className="space-y-4">
						<h4 className="font-semibold text-foreground">
							{tr("Contact Us", "संपर्क करें", language)}
						</h4>
						<ul className="space-y-3 text-sm text-muted-foreground">
							<li className="flex items-start gap-2">
								<MapPin className="h-4 w-4 text-primary mt-1" />
								<span>
									{tr(
										"Harpur Belahi, near Panchayat Bhawan, Kushinagar U.P.",
										"हरपुर बेलाही, पंचायती भवन के पास, कुशीनगर (उ. प्र.)",
										language,
									)}
								</span>
							</li>
							<li className="flex items-start gap-2">
								<Phone className="h-4 w-4 text-primary mt-1" />
								<div className="flex flex-col">
									<span>6388 735 208, 83057 80087</span>
									<span>85430 42960, 97921 57285</span>
									<span>63928 43291, 88741 02613</span>
								</div>
							</li>
							<li className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-primary" />
								<span>info@hbpl.com</span>
							</li>
						</ul>
					</div>

					{/* Social Media */}
					<div className="space-y-4">
						<h4 className="font-semibold text-foreground">
							{tr("Follow Us", "हमें फॉलो करें", language)}
						</h4>
						<div className="flex gap-3">
							<a
								href="https://facebook.com"
								target="_blank"
								rel="noopener noreferrer"
								className="h-10 w-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all duration-300 hover:scale-110"
							>
								<Facebook className="h-5 w-5" />
							</a>
							<a
								href="https://youtu.be/jMcLEBvqt2s?si=r8ko0DwAxMet2RdL"
								target="_blank"
								rel="noopener noreferrer"
								className="h-10 w-10 rounded-full bg-muted hover:bg-secondary hover:text-secondary-foreground flex items-center justify-center transition-all duration-300 hover:scale-110"
							>
								<Youtube className="h-5 w-5" />
							</a>
							<a
								href="https://www.instagram.com/hbpl_3?igsh=Z3Y3NmY1MnI4ejVo"
								target="_blank"
								rel="noopener noreferrer"
								className="h-10 w-10 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-all duration-300 hover:scale-110"
							>
								<Instagram className="h-5 w-5" />
							</a>
						</div>
					</div>
				</div>

				{/* Bottom Line */}
				<div className="border-t border-gray-300 mt-6 pt-4 text-center text-sm text-gray-600">
					© {currentYear} HBPL | Crafted with ❤️ by{" "}
					<a
						href="https://www.jstechnova.in"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[#6c3cff] font-semibold hover:underline"
					>
						JS Technova
					</a>
				</div>
			</div>
		</footer>
  );
};

export default Footer;
