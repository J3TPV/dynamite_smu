import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigation } from './components/Navigation';
import { Home } from './components/Home';
import { HistoryEvolution } from './components/HistoryEvolution';
import { Impacts } from './components/Impacts';
import { Applications } from './components/Applications';
import { Future } from './components/Future';
import { About } from './components/About';

export type Page = 'home' | 'history' | 'impacts' | 'social' | 'economic' | 'environmental' | 'technological' | 'applications' | 'mining' | 'construction' | 'specialized' | 'medicine' | 'security' | 'military' | 'future' | 'about';

interface AppState {
  currentPage: Page;
  subPage?: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<AppState>({ currentPage: 'home' });
  const [showTimeOverlay, setShowTimeOverlay] = useState(false);

  const renderPage = () => {
    switch (currentPage.currentPage) {
      case 'home':
        return <Home />;
      case 'history':
        return <HistoryEvolution />;
      case 'impacts':
        return <Impacts subPage={currentPage.subPage} />;
      case 'social':
        return <Impacts subPage="social" />;
      case 'economic':
        return <Impacts subPage="economic" />;
      case 'environmental':
        return <Impacts subPage="environmental" />;
      case 'technological':
        return <Impacts subPage="technological" />;
      case 'applications':
        return <Applications subPage={currentPage.subPage} />;
      case 'mining':
        return <Applications subPage="mining" />;
      case 'construction':
        return <Applications subPage="construction" />;
      case 'specialized':
        return <Applications subPage="specialized" />;
      case 'medicine':
        return <Applications subPage="medicine" />;
      case 'security':
        return <Applications subPage="security" />;
      case 'military':
        return <Applications subPage="military" />;

      case 'future':
        return <Future />;
      case 'about':
        return <About />;
      default:
        return <Home />;
    }
  };

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll('.card')) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    cards.forEach(card => {
      card.classList.add('scroll-reveal');
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, [currentPage.currentPage, currentPage.subPage]);

  useEffect(() => {
    if (currentPage.currentPage === 'history') {
      setShowTimeOverlay(true);
      const timer = window.setTimeout(() => setShowTimeOverlay(false), 3000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentPage.currentPage]);

  return (
    <div className="flex flex-col min-h-screen bg-base-100">
      <Navigation currentPage={currentPage.currentPage} onNavigate={(page, subPage) => setCurrentPage({ currentPage: page, subPage })} />
      <main
        key={`${currentPage.currentPage}${currentPage.subPage ? `-${currentPage.subPage}` : ''}`}
        className="flex-1 p-6 md:p-8 page-fade-transition"
      >
        {renderPage()}
      </main>
      {showTimeOverlay && (
        <div className="time-rewind-overlay">
          <svg
            className="time-rewind-icon"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="time rewind icon"
          >
            <circle cx="32" cy="34" r="18" fill="none" stroke="white" strokeWidth="5" />
            <rect x="27" y="8" width="10" height="8" rx="3" fill="white" />
            <line x1="32" y1="34" x2="32" y2="20" stroke="white" strokeWidth="5" strokeLinecap="round" />
            <line x1="32" y1="34" x2="44" y2="34" stroke="white" strokeWidth="5" strokeLinecap="round" />
            <circle cx="46" cy="18" r="3" fill="white" />
          </svg>
        </div>
      )}
      <footer className="bg-base-200 text-base-content/60 text-center py-4 text-sm border-t border-base-300">
        <p>You're my dynamite © 2025</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
