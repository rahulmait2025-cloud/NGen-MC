import Hero from "@/components/Hero";
import SectionPreview from "@/components/SectionPreview";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <SectionPreview />
      
      {/* Footer Preview */}
      <footer className="py-12 border-t border-black/5">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-bold tracking-tight">
            NextGen <span className="text-primary">CTO</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NextGen CTO. For educational purposes only.
          </p>
          <div className="flex gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
