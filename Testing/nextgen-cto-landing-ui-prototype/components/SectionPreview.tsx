import { cn } from "@/lib/utils";

export default function SectionPreview() {
  const features = [
    { title: "DSA Patterns", description: "Master 15+ patterns that solve 90% of LeetCode problems.", icon: "🧩" },
    { title: "AI-Pair Programming", description: "Learn how to use AI to code 10x faster and better.", icon: "🤖" },
    { title: "System Design", description: "Learn how to build scalable systems like Netflix & Uber.", icon: "🏗️" },
    { title: "Interview Ready", description: "Mock interviews and resume reviews with industry mentors.", icon: "🎓" },
  ];

  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Everything you need to become a <span className="text-primary underline decoration-primary/20">Senior Engineer</span>.
          </h2>
          <p className="text-muted-foreground text-lg">
            Stop watching tutorials. Start building real systems and mastering the fundamentals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <div key={i} className={cn(
              "p-8 rounded-3xl bg-white border border-black/5",
              "hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            )}>
              <div className="text-4xl mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
