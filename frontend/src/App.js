import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import CustomPoster from "@/pages/CustomPoster";
import CoverArt from "@/pages/CoverArt";
import Cart from "@/pages/Cart";
import Auth from "@/pages/Auth";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import TrackOrder from "@/pages/TrackOrder";
import OurStory from "@/pages/OurStory";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Terms from "@/pages/Terms";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main className="pt-16 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/custom" element={<CustomPoster />} />
          <Route path="/cover-art" element={<CoverArt />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/our-story" element={<OurStory />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="App">
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#FFFFFF",
                border: "1px solid #000000",
                borderRadius: 0,
                color: "#000000",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.05em",
              },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
