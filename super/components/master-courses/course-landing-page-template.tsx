'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import Image from 'next/image';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  CheckCircle2,
  PlayCircle,
  Star, 
  ArrowRight, 
  Zap,
  Globe,
  Award,
  Clock,
  ArrowUpRight,
  Sparkles,
  Layout,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface LandingPageData {
  hero?: {
    title?: string;
    subtitle?: string;
    video_url?: string;
    image_url?: string;
  };
  pricing?: {
    sale_price?: number;
    original_price?: number;
    currency?: string;
    tiers?: Array<{
      name: string;
      price: number;
      features: string[];
      is_popular: boolean;
    }>;
  };
  learning_outcomes?: string[];
  instructors?: Array<{
    name: string;
    designation: string;
    image_url: string;
    bio: string;
  }>;
  curriculum?: Array<{
    title: string;
    description: string;
    lessons: string[];
  }>;
  testimonials?: Array<{
    name: string;
    role: string;
    content: string;
    avatar_url: string;
    rating: number;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
}

interface CourseLandingPageTemplateProps {
  data: LandingPageData;
  isDark?: boolean;
}

interface LandingPageContentSectionsProps {
  curriculum: LandingPageData['curriculum'];
  learning_outcomes: string[];
  instructors: LandingPageData['instructors'];
  testimonials: LandingPageData['testimonials'];
  faq: LandingPageData['faq'];
  isDark: boolean;
}

function LandingPageContentSections({ curriculum, learning_outcomes, instructors, testimonials, faq, isDark }: LandingPageContentSectionsProps) {
  return (
    <>
      <section id="curriculum" className="py-32 px-6 lg:px-20 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tighter">Engineered for Mastery</h2>
          <p className="text-xl opacity-60 max-w-2xl mx-auto">A curriculum designed by active CTOs to bridge the gap between senior engineer and technology leader.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {((curriculum ?? []).length > 0 ? curriculum! : [
                { title: "The Architectural Shift", lessons: ["Microservices at Scale", "Event-Driven Systems", "Data Strategy"] },
                { title: "Team Leadership", lessons: ["Scaling Engineering Culture", "Performance Management", "Hiring Elite Talent"] },
                { title: "Cloud Native Elite", lessons: ["Kubernetes for Leaders", "FinOps & Cost Optimization", "Security Posture"] }
              ]).map((module, i) => (
                <AccordionItem key={`module-${module.title}`} value={`item-${i}`} className={cn(
                  "border rounded-3xl px-6 py-2 overflow-hidden transition-[border-color,background-color]",
                  isDark ? "border-white/10 bg-white/2" : "border-orange-100 bg-white shadow-sm"
                )}>
                  <AccordionTrigger className="hover:no-underline py-6">
                    <div className="text-left">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-1">Module 0{i+1}</p>
                      <h3 className="text-xl font-black">{module.title}</h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-8 pt-2">
                    <ul className="space-y-4">
                      {module.lessons?.map((lesson, j) => (
                        <li key={`lesson-${j}`} className="flex items-center gap-3 opacity-70">
                          <PlayCircle className="size-4 text-orange-600" />
                          <span className="font-medium">{lesson}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="hidden md:block">
            <div className={cn(
              "rounded-[40px] p-10 h-full flex flex-col justify-between",
              isDark ? "bg-orange-600" : "bg-orange-600 text-white"
            )}>
              <div>
                <Award className="size-16 mb-8 opacity-40" />
                <h3 className="text-3xl font-black mb-6 tracking-tight">Become an Industry-Standard CTO</h3>
                <p className="text-lg opacity-80 leading-relaxed">Our curriculum doesn&apos;t just teach technology-it teaches the business of technology. Learn how to align your engineering roadmap with company goals and become an indispensable executive.</p>
              </div>
              <div className="space-y-6">
                {learning_outcomes.slice(0, 4).map((outcome) => (
                  <div key={outcome} className="flex items-center gap-4">
                    <div className="size-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-5 text-white" />
                    </div>
                    <span className="font-semibold">{outcome || "Master System Architecture"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="instructors" className={cn(
        "py-32 px-6 lg:px-20",
        isDark ? "bg-white/2" : "bg-orange-50/50"
      )}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="max-w-2xl">
              <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tighter">Learn from the Architects</h2>
              <p className="text-xl opacity-60">We don&apos;t have teachers. We have operators. Learn from CTOs and Tech Leads who have scaled systems to millions of users.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
              {((instructors ?? []).length > 0 ? instructors! : [
              { name: "Priya Sharma", designation: "CTO @ FinScale", image_url: "https://i.pravatar.cc/400?img=1", bio: "Built zero-downtime payment systems processing $2B daily." },
              { name: "Arjun Mehta", designation: "VP Engineering @ DevMesh", image_url: "https://i.pravatar.cc/400?img=3", bio: "Scaled engineering teams from 5 to 200 across 4 continents." },
              { name: "Rohan Das", designation: "Director of Engineering", image_url: "https://i.pravatar.cc/400?img=12", bio: "Scaled teams from 10 to 500+ engineers." }
            ]).map((inst) => (
              <div key={inst.name} className={cn(
                "rounded-[48px] p-8 group transition-[border-color,box-shadow] duration-200",
                isDark ? "bg-[#0A0A0A] border border-white/5 hover:border-orange-600/30" : "bg-white border border-orange-100 hover:border-orange-600/30 shadow-xl"
              )}>
                <div className="aspect-square rounded-[40px] overflow-hidden mb-8 relative">
                  <Image src={inst.image_url} alt={inst.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-8">
                    <p className="text-white text-sm font-medium leading-relaxed">{inst.bio}</p>
                  </div>
                </div>
                <h3 className="text-2xl font-black mb-2">{inst.name}</h3>
                <p className="text-orange-600 font-semibold uppercase tracking-widest text-xs">{inst.designation}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 overflow-hidden">
        <div className="text-center mb-20 px-6">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">Engineers Love Us</h2>
        </div>
        <div className="flex flex-col gap-8">
          {[1, 2].map(row => (
            <div key={row} className="flex gap-8 animate-marquee whitespace-nowrap">
              {((testimonials ?? []).length > 0 ? [...(testimonials ?? []), ...(testimonials ?? [])] : [1,2,3,4,5,6].map(i => ({
                name: "Student Name", role: "SDE-3 @ Google", content: "This program transformed how I think about scale.", avatar_url: `https://i.pravatar.cc/100?img=${i+row*10}`
              }))).map((t, i) => (
                <div key={`testimonial-${t.name}-${i}`} className={cn(
                  "inline-block w-[400px] shrink-0 rounded-[32px] p-8",
                  isDark ? "bg-white/5 border border-white/10" : "bg-orange-50 border border-orange-100"
                )}>
                  <div className="flex items-center gap-4 mb-6">
                    <Image src={t.avatar_url} alt={t.name} width={48} height={48} className="size-12 rounded-full" />
                    <div>
                      <p className="font-black text-lg">{t.name}</p>
                      <p className="text-xs font-semibold opacity-40 uppercase tracking-widest">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-lg font-medium opacity-80 leading-relaxed italic">&ldquo;{t.content}&rdquo;</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="py-32 px-6 max-w-4xl mx-auto">
        <h2 className="text-4xl lg:text-5xl font-black mb-16 text-center tracking-tighter">Common Questions</h2>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {((faq ?? []).length > 0 ? faq! : [
            { question: "Is this for beginners?", answer: "No, this is an advanced program for senior engineers and aspiring leaders." },
            { question: "How much time should I dedicate?", answer: "At least 10-12 hours per week for optimal results." },
            { question: "Do I get a certificate?", answer: "Yes, a verified NextGen CTO professional certificate." }
          ]).map((item) => (
            <AccordionItem key={item.question} value={item.question} className="border-b border-white/10 px-0">
              <AccordionTrigger className="text-xl font-black py-8 hover:no-underline">
                <span className="text-left">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-8 text-lg opacity-60 leading-relaxed font-medium">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}

export default function CourseLandingPageTemplate({ data, isDark = true }: CourseLandingPageTemplateProps) {
  const mounted = useSyncExternalStore(
    (cb) => { cb(); return () => {}; },
    () => true,
    () => false,
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!mounted) return null;

  const {
    hero = {},
    pricing = {},
    learning_outcomes = [],
    instructors = [],
    curriculum = [],
    testimonials = [],
    faq = []
  } = data;

  return (
    <LazyMotion features={domAnimation}>
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isDark ? "bg-[#0A0A0A] text-white" : "bg-[#fef8f3] text-[#1d1b19]"
    )}>
      {/* Navigation Header */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-200 px-6 lg:px-20 h-20 flex items-center justify-between",
        isScrolled 
          ? (isDark ? "bg-black/80 backdrop-blur-md border-b border-white/10" : "bg-white/80 backdrop-blur-md border-b border-orange-100")
          : "bg-transparent"
      )}>
        <div className="flex items-center gap-2">
          <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <Cpu className="text-white size-6" />
          </div>
          <span className="text-xl font-black tracking-tight uppercase">NextGen<span className="text-orange-600">CTO</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest opacity-70">
          <a href="#curriculum" className="hover:opacity-100 transition-opacity">Curriculum</a>
          <a href="#instructors" className="hover:opacity-100 transition-opacity">Mentors</a>
          <a href="#pricing" className="hover:opacity-100 transition-opacity">Pricing</a>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 rounded-full shadow-lg shadow-orange-600/20">
          START THE COURSE
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 lg:px-20 max-w-[1400px] mx-auto overflow-hidden">
        <div className={cn(
          "absolute top-20 left-1/4 w-[500px] h-[500px] blur-[120px] rounded-full opacity-20 pointer-events-none",
          isDark ? "bg-orange-600" : "bg-orange-400"
        )} />
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <m.div
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600/10 border border-orange-600/20 text-orange-600 text-xs font-semibold uppercase tracking-widest mb-6">
              <Sparkles className="size-3" /> NextGen CTO Elite Program
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] mb-8 tracking-tighter">
              {hero.title || "Master the Architecture of the Future"}
            </h1>
            <p className="text-xl lg:text-2xl opacity-60 font-medium mb-10 leading-relaxed max-w-xl">
              {hero.subtitle || "A comprehensive roadmap for engineering leaders to scale systems, teams, and technology in the AI era."}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white font-black px-10 h-16 rounded-2xl text-lg shadow-xl shadow-orange-600/20">
                Join the Cohort <ArrowUpRight className="ml-2 size-5" />
              </Button>
              <Button size="lg" variant="outline" className={cn(
                "font-bold px-10 h-16 rounded-2xl text-lg border-2",
                isDark ? "border-white/10 hover:bg-white/5" : "border-orange-600/10 hover:bg-orange-600/5 text-orange-600"
              )}>
                View Curriculum
              </Button>
            </div>
            
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={`avatar-${i}`} className="size-12 rounded-full border-4 border-[#0A0A0A] bg-gray-800 overflow-hidden">
                    <Image src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Student" width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-orange-500">
                  {[1, 2, 3, 4, 5].map(i => <Star key={`star-${i}`} className="size-4 fill-current" />)}
                </div>
                <p className="text-sm font-semibold opacity-60 mt-1 uppercase tracking-widest">Joined by 1,200+ Leaders</p>
              </div>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.1 }}
            className="relative"
            style={{ transformOrigin: 'center' }}
          >
            <div className="aspect-video rounded-[40px] bg-gray-900 overflow-hidden shadow-2xl border border-white/10 relative group">
              <Image 
                src={hero.image_url || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80"} 
                alt="Course Preview" 
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover opacity-60 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button type="button" className="size-24 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-600/40 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-105 active:scale-95 transition-transform duration-160">
                  <PlayCircle className="size-12" />
                </button>
              </div>
              <div className="absolute bottom-8 left-8 right-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Current Price</p>
                    <p className="text-2xl font-black">{pricing.currency || 'INR'} {pricing.sale_price || '29,999'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-50 line-through">{pricing.currency || 'INR'} {pricing.original_price || '49,999'}</p>
                    <p className="text-sm font-semibold text-green-500 uppercase tracking-widest">40% OFF EARLY BIRD</p>
                  </div>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={cn(
        "py-12 border-y",
        isDark ? "border-white/5 bg-white/2" : "border-orange-100 bg-orange-50/30"
      )}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Hours Content", value: "40+", icon: Clock },
            { label: "Live Projects", value: "12", icon: Layout },
            { label: "Global Students", value: "1.2k", icon: Globe },
            { label: "Avg Salary Hike", value: "65%", icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="size-6 text-orange-600 mx-auto mb-4 opacity-50" />
              <p className="text-3xl font-black mb-1">{stat.value}</p>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-40">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <LandingPageContentSections
        curriculum={curriculum}
        learning_outcomes={learning_outcomes}
        instructors={instructors}
        testimonials={testimonials}
        faq={faq}
        isDark={isDark}
      />

      {/* Final CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/10 blur-[150px] rounded-full" />
        <div className="relative z-10">
          <h2 className="text-5xl lg:text-8xl font-black mb-12 tracking-tighter leading-tight">Ready to lead the<br /><span className="text-orange-600">Next Generation?</span></h2>
          <div className="flex flex-col items-center gap-8">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white font-black h-20 px-16 rounded-[32px] text-2xl shadow-2xl shadow-orange-600/40 group">
              ENROLL NOW <ArrowRight className="ml-4 size-8 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-2 transition-transform" />
            </Button>
            <p className="text-sm font-semibold opacity-40 uppercase tracking-[0.3em]">Batch starts soon * Only 50 slots left</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={cn(
        "py-20 px-6 lg:px-20 border-t",
        isDark ? "bg-[#050505] border-white/5" : "bg-white border-orange-100"
      )}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-2">
            <Cpu className="text-orange-600 size-8" />
            <span className="text-2xl font-black uppercase tracking-tight">NextGen<span className="text-orange-600">CTO</span></span>
          </div>
          <div className="flex gap-10 text-xs font-semibold uppercase tracking-[0.2em] opacity-50">
            <button type="button" className="hover:opacity-100 cursor-pointer bg-transparent border-none p-0 font-inherit uppercase tracking-[0.2em] text-xs font-semibold">Terms</button>
            <button type="button" className="hover:opacity-100 cursor-pointer bg-transparent border-none p-0 font-inherit uppercase tracking-[0.2em] text-xs font-semibold">Privacy</button>
            <button type="button" className="hover:opacity-100 cursor-pointer bg-transparent border-none p-0 font-inherit uppercase tracking-[0.2em] text-xs font-semibold">Contact</button>
          </div>
          <p className="text-xs font-semibold opacity-30 uppercase tracking-widest">(c) 2026 NextGen Education Inc.</p>
        </div>
      </footer>
    </div>
    </LazyMotion>
  );
}
