'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Clock, FileText, GraduationCap, HelpCircle, MapPin, Medal, Search } from 'lucide-react';
import { fetchExamPortalContent } from '@/lib/api';
import { useLanguage } from '@/hooks/use-language';
import { tr } from '@/lib/i18n';

const HBPL_Examportal: React.FC = () => {
  const [active, setActive] = useState<string>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const { language } = useLanguage();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-portal-content'],
    queryFn: fetchExamPortalContent,
  });

  const importantDates = data?.important_dates ?? [];
  const supportSchools = data?.support_schools ?? [];
  const syllabusItems = data?.syllabus_items ?? [];
  const samplePapers = data?.sample_papers ?? [];
  const centerDetails = data?.center_details ?? [];
  const toppers = data?.toppers ?? [];
  const faqs = data?.faqs ?? [];

  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { threshold: 0.6 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const navClass = (id: string) =>
    active === id
      ? 'text-green-400 font-semibold'
      : 'text-gray-300 hover:text-green-400 transition';

  const topTwenty = useMemo(() => toppers.slice(0, 20), [toppers]);

  return (
    <div className="min-h-screen bg-[#0e1c14] text-white font-sans scroll-smooth overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[#0b160f]/90 backdrop-blur border-b border-[#1f3b2b]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="font-bold text-base sm:text-lg text-green-400">
            {tr('HBPL Exam Portal', 'HBPL परीक्षा पोर्टल', language)}
          </div>

          <nav className="hidden md:flex gap-6 lg:gap-8 text-sm">
            <a href="#home" className={navClass('home')}>{tr('Home', 'होम', language)}</a>
            <a href="#overview" className={navClass('overview')}>{tr('Overview', 'अवलोकन', language)}</a>
            <a href="#dates" className={navClass('dates')}>{tr('Important Dates', 'महत्वपूर्ण तिथियाँ', language)}</a>
            <a href="#about-exam" className={navClass('about-exam')}>{tr('About Exam', 'परीक्षा के बारे में', language)}</a>
            <a href="#exam-authority" className={navClass('exam-authority')}>{tr('Exam Support Schools', 'परीक्षा समर्थन स्कूल', language)}</a>
            <a href="#syllabus" className={navClass('syllabus')}>{tr('Syllabus', 'पाठ्यक्रम', language)}</a>
            <a href="#sample-papers" className={navClass('sample-papers')}>{tr('Sample Papers', 'नमूना प्रश्नपत्र', language)}</a>
            <a href="#pattern" className={navClass('pattern')}>{tr('Exam Pattern', 'परीक्षा पैटर्न', language)}</a>
            <a href="#exam-center" className={navClass('exam-center')}>{tr('Exam Center', 'परीक्षा केंद्र', language)}</a>
            <a href="#result" className={navClass('result')}>{tr('Result', 'परिणाम', language)}</a>
            <a href="#faq" className={navClass('faq')}>FAQ</a>
          </nav>

          <button className="md:hidden text-2xl" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#0b160f] border-t border-[#1f3b2b] px-4 pb-4">
            <nav className="flex flex-col gap-4 text-sm pt-4">
              <a onClick={() => setMenuOpen(false)} href="#home" className={navClass('home')}>{tr('Home', 'होम', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#overview" className={navClass('overview')}>{tr('Overview', 'अवलोकन', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#dates" className={navClass('dates')}>{tr('Important Dates', 'महत्वपूर्ण तिथियाँ', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#about-exam" className={navClass('about-exam')}>{tr('About Exam', 'परीक्षा के बारे में', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#exam-authority" className={navClass('exam-authority')}>{tr('Exam Support Schools', 'परीक्षा समर्थन स्कूल', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#syllabus" className={navClass('syllabus')}>{tr('Syllabus', 'पाठ्यक्रम', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#sample-papers" className={navClass('sample-papers')}>{tr('Sample Papers', 'नमूना प्रश्नपत्र', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#pattern" className={navClass('pattern')}>{tr('Exam Pattern', 'परीक्षा पैटर्न', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#exam-center" className={navClass('exam-center')}>{tr('Exam Center', 'परीक्षा केंद्र', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#result" className={navClass('result')}>{tr('Result', 'परिणाम', language)}</a>
              <a onClick={() => setMenuOpen(false)} href="#faq" className={navClass('faq')}>FAQ</a>
            </nav>
          </div>
        )}
      </header>

      <section
        id="home"
        className="relative"
        style={{
          background:
            'radial-gradient(circle at top, rgba(34,197,94,0.2), transparent 55%), linear-gradient(180deg, rgba(14,28,20,0.35), rgba(14,28,20,0.96))',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1 text-[11px] tracking-[0.18em] uppercase rounded-full bg-green-800/40 text-green-200 border border-green-500/40">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              {tr(
                'District Level General Aptitude Competition • 2026',
                'जिला स्तरीय जनरल एपटिट्यूड प्रतियोगिता • 2026',
                language
              )}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight max-w-3xl">
              <span className="block">
                {tr('HBPL General Aptitude Competition 2026', 'HBPL जनरल एपटिट्यूड प्रतियोगिता 2026', language)}
              </span>
            </h1>

            <p className="mt-4 text-gray-300 max-w-xl text-sm sm:text-base">
              {tr(
                'A professionally conducted district-level aptitude examination designed to identify and encourage bright young minds from Classes 5 to 10. Students are tested on logical reasoning, numerical ability, general awareness, and language skills.',
                'कक्षा 5 से 10 तक के मेधावी विद्यार्थियों की पहचान और प्रोत्साहन के लिए आयोजित यह जिला स्तरीय अभिक्षमता परीक्षा है, जिसमें तार्किक क्षमता, संख्यात्मक योग्यता, सामान्य ज्ञान और भाषा कौशल का आकलन किया जाता है।',
                language
              )}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#dates" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-3 rounded-full text-sm shadow-lg shadow-green-900/40 transition-transform duration-200 hover:-translate-y-0.5">
                {tr('View Important Dates', 'महत्वपूर्ण तिथियाँ देखें', language)}
              </a>
              <Link href="/exam-portal/register" className="inline-flex items-center gap-2 border border-green-500/60 text-green-100 hover:bg-green-800/40 font-semibold px-6 py-3 rounded-full text-sm transition-colors">
                <FileText className="h-4 w-4" /> {tr('Register Now', 'अभी पंजीकरण करें', language)}
              </Link>
              <Link href="/exam-portal/result" className="inline-flex items-center gap-2 border border-green-500/60 text-green-100 hover:bg-green-800/40 font-semibold px-6 py-3 rounded-full text-sm transition-colors">
                <Search className="h-4 w-4" /> {tr('Check Result', 'परिणाम देखें', language)}
              </Link>
            </div>

            <p className="mt-3 text-[11px] sm:text-xs text-gray-400 max-w-md">
              {tr(
                'Open for students of Classes 5–10 across Harpur Belahi and nearby areas. Registrations are accepted through schools only.',
                'हरपुर बेलाही और आसपास के क्षेत्रों के कक्षा 5–10 के विद्यार्थियों के लिए खुला। पंजीकरण केवल स्कूलों के माध्यम से स्वीकार किए जाते हैं।',
                language
              )}
            </p>
          </div>

          <div className="relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl" />

            <div className="relative bg-[#10261c] border border-[#1f3b2b] rounded-2xl p-6 sm:p-7 shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-green-300 mb-4">Exam Snapshot</p>
              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-gray-400 text-[11px]">Exam Date</p>
                  <p className="mt-1 font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-green-400" /> 26 April 2026</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Exam Mode</p>
                  <p className="mt-1 font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-green-400" /> Offline</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Eligible Classes</p>
                  <p className="mt-1 font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-green-400" /> 5th to 10th</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[11px]">Total Marks</p>
                  <p className="mt-1 font-semibold">90 Marks • 90 Minutes</p>
                </div>
              </div>

              <div className="mt-5 border-t border-[#1f3b2b] pt-4 flex items-center justify-between gap-4 text-[11px] sm:text-xs">
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4 text-yellow-300" />
                  <span>Certificates, medals & recognition for top performers.</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-green-300">
                  <MapPin className="w-4 h-4" />
                  <span>Centers across Harpur Belahi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">{tr('Exam Overview', 'परीक्षा का अवलोकन', language)}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            [tr('Exam Mode', 'परीक्षा मोड', language), tr('Offline (OMR based)', 'ऑफलाइन (OMR आधारित)', language)],
            [tr('Exam Duration', 'परीक्षा अवधि', language), tr('90 Minutes', '90 मिनट', language)],
            [tr('Maximum Marks', 'कुल अंक', language), tr('90 Marks', '90 अंक', language)],
            [tr('Medium', 'भाषा माध्यम', language), tr('Hindi & English', 'हिंदी व अंग्रेज़ी', language)],
          ].map(([title, value]) => (
            <div key={title} className="bg-[#173828] rounded-xl p-4 border border-[#1f3b2b]">
              <p className="text-gray-400 text-xs">{title}</p>
              <p className="text-lg font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about-exam" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">
              {tr('About HBPL General Aptitude Competition', 'HBPL जनरल एपटिट्यूड प्रतियोगिता के बारे में', language)}
            </h2>
            <p className="text-sm sm:text-base text-gray-300 mb-3">
              {tr(
                'HBPL General Aptitude Competition is an initiative of Harpur Belahi Premier League to promote academic excellence along with sports. The exam is carefully designed to assess real-life problem solving, conceptual clarity and logical thinking in school students.',
                'HBPL जनरल एपटिट्यूड प्रतियोगिता, हरपुर बेलाही प्रीमियर लीग की एक पहल है, जिसका उद्देश्य खेल के साथ-साथ शैक्षणिक उत्कृष्टता को बढ़ावा देना है। यह परीक्षा विद्यार्थियों की वास्तविक जीवन समस्या समाधान क्षमता, अवधारणात्मक स्पष्टता और तार्किक सोच का आकलन करने के लिए तैयार की गई है।',
                language
              )}
            </p>
            <p className="text-sm sm:text-base text-gray-300 mb-3">
              {tr(
                'The question paper is balanced across multiple areas such as Mathematics, Science, Social Science, Languages, Computer and General Knowledge so that every student gets a fair chance to showcase their strengths.',
                'प्रश्न पत्र गणित, विज्ञान, सामाजिक विज्ञान, भाषाएँ, कंप्यूटर और सामान्य ज्ञान जैसे कई क्षेत्रों में संतुलित रूप से तैयार किया गया है ताकि हर विद्यार्थी को अपनी क्षमता दिखाने का समान अवसर मिले।',
                language
              )}
            </p>
            <p className="text-sm sm:text-base text-gray-300">
              {tr(
                'All participating students receive a participation certificate, while top scoring students are awarded special recognition, medals and prizes in a formal felicitation ceremony.',
                'सभी प्रतिभागी विद्यार्थियों को भागीदारी प्रमाणपत्र दिया जाएगा, जबकि सर्वोच्च अंक प्राप्त करने वाले विद्यार्थियों को औपचारिक सम्मान समारोह में विशेष सम्मान, मेडल और पुरस्कार दिए जाएंगे।',
                language
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[tr('Eligibility', 'पात्रता', language), tr('Objective of the Exam', 'परीक्षा का उद्देश्य', language), tr('Awards & Recognition', 'पुरस्कार और सम्मान', language), tr('How to Participate', 'कैसे भाग लें', language)].map((title) => (
              <div key={title} className="bg-[#173828] rounded-xl p-4 border border-[#1f3b2b]">
                <h3 className="font-semibold text-sm mb-2">{title}</h3>
                <p className="text-xs text-gray-300">
                  {tr(
                    'This exam emphasizes learning outcomes, reasoning skills, and fair opportunity for all students from Class 5 to 10 through school-based participation.',
                    'यह परीक्षा कक्षा 5 से 10 तक के विद्यार्थियों के लिए सीखने के परिणाम, तर्क कौशल और स्कूल-आधारित भागीदारी के माध्यम से निष्पक्ष अवसर पर जोर देती है।',
                    language
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dates" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">{tr('Important Dates', 'महत्वपूर्ण तिथियाँ', language)}</h2>
        {isLoading ? <p className="text-sm text-gray-300">Loading important dates...</p> : null}
        {isError ? <p className="text-sm text-red-300">Failed to load important dates.</p> : null}
        {!isLoading && !isError && importantDates.length === 0 ? (
          <p className="text-sm text-gray-300">No important dates available yet.</p>
        ) : null}
        {importantDates.map((item) => (
          <div key={item.id} className="bg-[#173828] rounded-lg p-4 mb-4 flex justify-between items-center border border-[#1f3b2b]">
            <span className="text-sm sm:text-base">{item.title}</span>
            <span className="text-green-400 font-semibold text-sm sm:text-base">{item.date}</span>
          </div>
        ))}
      </section>

      <section id="exam-authority" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">{tr('Exam Support Schools', 'परीक्षा समर्थन स्कूल', language)}</h2>
        <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-8">
          {supportSchools.map((school) => (
            <div key={school.id} className="bg-[#173828] rounded-xl p-6 border border-[#1f3b2b]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🏫</span>
                <h3 className="font-bold text-green-300 text-lg">{school.name}</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-300">
                <p><span className="text-green-400 font-semibold">{tr('Address', 'पता', language)}:</span> {school.address || 'N/A'}</p>
                <p><span className="text-blue-400 font-semibold">{tr('Principal', 'प्रिंसिपल', language)}:</span> {school.principal_name || 'N/A'}</p>
                {school.contact_info ? <p><span className="text-purple-400 font-semibold">Contact:</span> {school.contact_info}</p> : null}
              </div>
              <div className="mt-5">
                {school.principal_image_url ? (
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-purple-400/50">
                    <Image src={school.principal_image_url} alt={school.principal_name || school.name} fill sizes="80px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-700 border border-gray-500 flex items-center justify-center text-lg font-semibold">
                    {(school.principal_name || school.name).slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {!isLoading && supportSchools.length === 0 ? <p className="mt-4 text-sm text-gray-300">No support schools added yet.</p> : null}
      </section>

      <section id="syllabus" className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">{tr('Detailed Syllabus', 'विस्तृत पाठ्यक्रम', language)}</h2>
        <p className="text-xs sm:text-sm text-gray-300 mb-5">
          {tr(
            'The syllabus is structured class-wise. You can read section details and download official PDFs where available.',
            'सिलेबस कक्षा-वार संरचित है। आप सेक्शन विवरण पढ़ सकते हैं और उपलब्ध होने पर आधिकारिक PDF डाउनलोड कर सकते हैं।',
            language
          )}
        </p>
        {syllabusItems.map((item) => (
          <details key={item.id} className="bg-[#173828] rounded-xl mb-3 border border-[#1f3b2b]">
            <summary className="cursor-pointer p-4 sm:p-5 font-semibold flex items-center justify-between">
              <span>{item.class_name} • {item.title}</span>
              <span className="text-xs text-gray-400">View key topics</span>
            </summary>
            <div className="p-4 sm:p-5 text-xs sm:text-sm text-gray-300 space-y-3">
              <p>{item.description || 'Detailed topic-wise syllabus is available in the downloadable file.'}</p>
              {item.pdf_url ? (
                <a href={item.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 rounded-full bg-green-500 hover:bg-green-400 text-black text-xs sm:text-sm font-semibold">
                  ⬇ {tr('Download PDF', 'PDF डाउनलोड करें', language)}
                </a>
              ) : null}
            </div>
          </details>
        ))}
        {!isLoading && syllabusItems.length === 0 ? <p className="text-sm text-gray-300">No syllabus items available yet.</p> : null}
      </section>

      <section id="sample-papers" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">{tr('Sample Papers', 'नमूना प्रश्नपत्र', language)}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {samplePapers.map((paper) => (
            <div key={paper.id} className="bg-[#173828] rounded-xl p-5 border border-[#1f3b2b] flex flex-col justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{paper.class_name || 'Class'}</p>
                <h3 className="mt-2 text-lg font-bold text-green-300">{paper.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-200">{paper.description || 'Practice paper for exam pattern understanding.'}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {paper.file_url ? (
                  <a href={paper.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-green-500 hover:bg-green-400 text-black text-xs sm:text-sm font-semibold transition-colors">
                    ⬇ {tr('Download PDF', 'PDF डाउनलोड करें', language)}
                  </a>
                ) : null}
                {paper.external_url ? (
                  <a href={paper.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-green-500/70 text-green-100 hover:bg-green-800/40 text-xs sm:text-sm font-semibold transition-colors">
                    {tr('View Online', 'ऑनलाइन देखें', language)}
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {!isLoading && samplePapers.length === 0 ? <p className="mt-4 text-sm text-gray-300">No sample papers uploaded yet.</p> : null}
      </section>

      <section id="pattern" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">{tr('Exam Pattern', 'परीक्षा पैटर्न', language)}</h2>
        <div className="bg-[#173828] rounded-xl overflow-x-auto border border-[#1f3b2b]">
          <table className="w-full text-sm min-w-130">
            <thead className="bg-[#10261c]">
              <tr>
                <th className="p-4 text-left">{tr('Subject', 'विषय', language)}</th>
                <th>{tr('Questions', 'प्रश्न', language)}</th>
                <th>{tr('Marks', 'अंक', language)}</th>
              </tr>
            </thead>
            <tbody>
              {[
                [tr('Maths', 'गणित', language), 5, 10],
                [tr('Science', 'विज्ञान', language), 5, 10],
                [tr('Social Science', 'सामाजिक विज्ञान', language), 5, 10],
                [tr('English', 'अंग्रेज़ी', language), 5, 10],
                [tr('Hindi', 'हिंदी', language), 5, 10],
                [tr('Computer', 'कंप्यूटर', language), 10, 20],
                [tr('Current Affairs', 'समसामयिक घटनाएँ', language), 5, 10],
                [tr('GK', 'सामान्य ज्ञान', language), 5, 10],
              ].map(([s, q, m]) => (
                <tr key={String(s)} className="border-t border-[#1f3b2b]">
                  <td className="p-4">{s}</td>
                  <td className="text-center">{q}</td>
                  <td className="text-center">{m}</td>
                </tr>
              ))}
              <tr className="font-bold text-green-400 border-t border-[#1f3b2b]">
                <td className="p-4">{tr('Total', 'कुल', language)}</td>
                <td className="text-center">45</td>
                <td className="text-center">90</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="exam-center" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">{tr('Exam Center Details', 'परीक्षा केंद्र विवरण', language)}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {centerDetails.map((center) => (
            <div key={center.id} className="bg-[#173828] p-6 rounded-xl border border-[#1f3b2b]">
              <h3 className="text-green-400 font-bold">{center.center_name}</h3>
              <p className="text-sm mt-1">Form No: {center.form_range || 'N/A'}</p>
              <p className="text-sm">Roll No: {center.roll_range || 'N/A'}</p>
              {center.extra_details ? <p className="text-xs text-gray-300 mt-3">{center.extra_details}</p> : null}
            </div>
          ))}
        </div>
        {!isLoading && centerDetails.length === 0 ? <p className="mt-3 text-sm text-gray-300">No exam centers added yet.</p> : null}
      </section>

      <section id="result" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">{tr('Top 20 Toppers', 'टॉप 20 टॉपर्स', language)}</h2>
        <p className="text-xs sm:text-sm text-gray-300 mb-6">
          {tr(
            'Top performers published by staff will appear here with rank and score.',
            'स्टाफ द्वारा प्रकाशित शीर्ष प्रदर्शन करने वाले विद्यार्थी यहाँ रैंक और स्कोर के साथ दिखाई देंगे।',
            language
          )}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {topTwenty.map((student) => (
            <div key={student.id} className="bg-[#173828] p-5 rounded-xl text-center border border-[#1f3b2b] hover:border-green-400/70 transition-colors">
              <div className="relative w-20 h-20 mx-auto rounded-full border-4 border-green-400 overflow-hidden bg-gray-700">
                {student.student_image_url ? (
                  <Image src={student.student_image_url} alt={student.student_name} fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-semibold">
                    {student.student_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="mt-3 font-bold text-sm sm:text-base">{student.student_name}</h3>
              <p className="text-xs sm:text-sm text-gray-300">{student.class_name || 'Class N/A'}</p>
              <p className="text-green-400 font-bold text-xs sm:text-sm">{student.marks_obtained ?? 'N/A'}/90</p>
              <p className="text-[11px] text-gray-400">Rank #{student.rank}</p>
            </div>
          ))}
        </div>
        {!isLoading && topTwenty.length === 0 ? <p className="mt-3 text-sm text-gray-300">Topper list has not been published yet.</p> : null}
      </section>

      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">{tr('Frequently Asked Questions', 'अक्सर पूछे जाने वाले प्रश्न', language)}</h2>
        {faqs.map((item) => (
          <details key={item.id} className="bg-[#173828] rounded-xl mb-3 border border-[#1f3b2b]">
            <summary className="cursor-pointer p-4 sm:p-5 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm sm:text-base">
                <HelpCircle className="w-4 h-4 text-green-400" />
                {item.question}
              </span>
              <span className="text-xs text-gray-400">{tr('View answer', 'उत्तर देखें', language)}</span>
            </summary>
            <div className="p-4 sm:p-5 text-xs sm:text-sm text-gray-300">{item.answer}</div>
          </details>
        ))}
        {!isLoading && faqs.length === 0 ? <p className="text-sm text-gray-300">No FAQs available yet.</p> : null}
      </section>
    </div>
  );
};

export default HBPL_Examportal;
