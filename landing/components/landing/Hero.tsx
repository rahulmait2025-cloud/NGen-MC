import { Rocket } from 'lucide-react';
import { HeroPrimaryCta } from '@/components/landing/HeroPrimaryCta';
import { SubscriberCount } from '@/components/landing/student/hero/SubscriberCount';

const COLLEGES = [
    "KIT", "RCOEM", "MAIT", "GCET", "GHRU", "MIT-A", "BCE", "GKV", "GNIT", "KIET",
    "LPU", "FIEM", "IIT Patna", "BIT Wardha", "VIT", "BU", "MNNIT", "CU", "JGEC",
    "TSEC", "RLSY", "PU", "GEHU", "MNIT", "SRM", "TIET", "GCECT", "JUIT", "WCOE",
    "HSC", "DIT", "IIT (BHU)", "LNCT", "RRIMT", "BVCOEP", "JHU", "SCOE", "SBCET",
    "GITAM", "IITM", "ITM", "RIT", "PCE", "IET DAVV", "BPIT", "BIT", "TOCE",
    "ACEIT", "SRMU", "BGIEM", "BVCOEW", "JIET", "VIIT", "GLA", "GU"
];

export function Hero() {
    return (
        <section id="hero" className="relative min-h-[80vh] flex items-center pt-32 pb-10 px-6 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none flex justify-center">
                <div className="w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -mt-40 opacity-40" />
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10 w-full overflow-hidden">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 uppercase tracking-widest">
                    <Rocket className="h-3 w-3" /> Coming to your campus
                </div>

                <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-extrabold mb-8 leading-[1.1] text-center">
                    We Don&apos;t Just Teach Code
                    <br />
                    <span className="text-[#D64A00]">
                        We Build Careers
                    </span>
                </h1>

                <p className="text-muted-foreground text-base md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                    From cracking DSA to a job-ready LinkedIn profile —{' '}
                    <span className="text-primary font-bold"><SubscriberCount /> students</span> transformed,{' '}
                    <span className="text-primary font-extrabold italic text-lg md:text-2xl">your campus is next.</span>
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                    <HeroPrimaryCta />
                </div>

                <div className="mt-24 pt-10">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-8">
                        Trusted by students from
                    </p>
                    <div className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
                        <div className="flex gap-16 w-max animate-[hero-marquee_60s_linear_infinite]">
                            <div className="flex gap-16 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500 shrink-0">
                                {COLLEGES.map((college) => (
                                    <span key={college} className="text-base sm:text-xl font-bold font-display text-foreground whitespace-nowrap">
                                        {college}
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-16 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500 shrink-0">
                                {COLLEGES.map((college) => (
                                    <span key={`${college}-duplicate`} className="text-xl font-bold font-display text-foreground whitespace-nowrap">
                                        {college}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
