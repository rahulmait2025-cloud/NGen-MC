import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Navbar() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 w-full bg-transparent">
      <nav className="flex items-center justify-between w-full max-w-7xl mx-auto px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-foreground rounded-sm grid grid-cols-2 gap-[2px] p-[2px]">
            <div className="bg-white rounded-sm"></div>
            <div className="bg-white rounded-sm"></div>
            <div className="bg-white rounded-sm"></div>
            <div className="bg-white rounded-sm opacity-50"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">NextGen</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Product</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Socials</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            Login
          </Link>
          <Link href="#" className={cn(
            "px-5 py-2 text-sm font-semibold text-white bg-foreground rounded-md hover:opacity-90 transition-all"
          )}>
            Signup
          </Link>
        </div>
      </nav>
    </header>
  );
}
