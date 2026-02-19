import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Proof from './components/Proof';
import ArchSection from './components/ArchSection';
import BentoSection from './components/BentoSection';
import AgentsSection from './components/AgentsSection';
import HowSection from './components/HowSection';
import PlatformsSection from './components/PlatformsSection';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Modal from './components/Modal';
import AdminPage from './pages/AdminPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import HomePageDS from './pages/HomePageDS';

const REVEAL_OPTIONS: IntersectionObserverInit = {
  threshold: 0.06,
  rootMargin: '0px 0px -30px 0px',
};

function useSmoothAnchorScroll(): void {
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      const a = target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href')?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
}

function useRevealAfterPaint(): void {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const id = requestAnimationFrame(() => {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('vis');
            observer?.unobserve(e.target);
          }
        });
      }, REVEAL_OPTIONS);
      document.querySelectorAll('.rv').forEach((el) => observer?.observe(el));
    });
    return () => {
      cancelAnimationFrame(id);
      observer?.disconnect();
    };
  }, []);
}

function HomePage(): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  useRevealAfterPaint();
  useSmoothAnchorScroll();

  return (
    <>
      <div className="page-frame">
        <Nav onOpenModal={() => setModalOpen(true)} />
        <Hero />
        <Proof />
        <ArchSection />
        <BentoSection />
        <AgentsSection />
        <HowSection />
        <PlatformsSection />
        <CTA />
        <Footer />
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePageDS />} />
          <Route path="/home-copy" element={<HomePageDS />} />
          <Route path="/home-classic" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
