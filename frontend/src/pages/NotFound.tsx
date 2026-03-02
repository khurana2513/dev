import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 flex items-center justify-center transition-colors duration-300">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-8xl font-black text-muted-foreground/30 mb-4">404</h1>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8 font-medium">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <button className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-200">
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Go Home
          </button>
        </Link>
      </div>
    </div>
  );
}
