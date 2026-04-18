import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Benefits } from "@/components/Benefits";
import { Products } from "@/components/Products";
import { Gallery } from "@/components/Gallery";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Benefits />
        <Products />
        <Gallery />
        <Pricing />
        <Footer />
      </main>
    </div>
  );
}
