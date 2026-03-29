import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Page } from '../app';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page, subPage?: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showAplus, setShowAplus] = useState(false);

  const isActive = (page: Page) => currentPage === page;

  return (
    <>
      <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div
              role="button"
              tabIndex={0}
              className="text-xl md:text-2xl font-bold text-primary cursor-pointer"
              onClick={() => setShowAplus(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowAplus(true);
                }
              }}
            >
              🧨 You're my Dynamite
            </div>
          
          <ul className="flex flex-wrap gap-1 md:gap-2 items-center text-sm md:text-base">
            {/* Home */}
            <li>
              <button
                onClick={() => {
                  onNavigate('home');
                  setOpenDropdown(null);
                }}
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('home') ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-base-content'
                }`}
              >
                Home
              </button>
            </li>

            {/* History */}
            <li>
              <button
                onClick={() => {
                  onNavigate('history');
                  setOpenDropdown(null);
                }}
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('history') ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-base-content'
                }`}
              >
                History and Evolution
              </button>
            </li>

            {/* Impacts with dropdown */}
            <li className="relative group">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'impacts' ? null : 'impacts')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                  ['impacts', 'social', 'economic', 'technological'].includes(currentPage)
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300 text-base-content'
                }`}
              >
                Impacts <ChevronDown size={16} className="transition group-hover:rotate-180" />
              </button>
              {openDropdown === 'impacts' && (
                <div className="absolute left-0 mt-2 w-48 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      onNavigate('social');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 first:rounded-t-lg"
                  >
                    Social
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('economic');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200"
                  >
                    Economic
                  </button>
                  {/* <button
                    onClick={() => {
                      onNavigate('environmental');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200"
                  >
                    Environmental
                  </button> */}
                  <button
                    onClick={() => {
                      onNavigate('technological');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 last:rounded-b-lg"
                  >
                    Technological
                  </button>
                </div>
              )}
            </li>

            {/* Applications with dropdown */}
            <li className="relative group">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'applications' ? null : 'applications')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                  ['applications', 'mining', 'construction', 'medicine', 'specialized', 'security', 'military'].includes(currentPage)
                    ? 'bg-primary text-primary-content' 
                    : 'hover:bg-base-300 text-base-content'
                }`}
              >
                Applications <ChevronDown size={16} className="transition group-hover:rotate-180" />
              </button>


              {openDropdown === 'applications' && (
                <div className="absolute left-0 mt-2 w-48 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50">
                          
                  <button
                    onClick={() => {
                      onNavigate('mining');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 first:rounded-t-lg"
                  >
                    Education
                  </button>



                  <button
                    onClick={() => {
                      onNavigate('construction');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200"
                  >
                    Industry
                  </button>



                  <button
                    onClick={() => {
                      onNavigate('specialized');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 last:rounded-b-lg"
                  >
                    Media
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('medicine');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 last:rounded-b-lg"
                  >
                    Medicine
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('security');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 last:rounded-b-lg"
                  >
                    Security
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('military');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 last:rounded-b-lg"
                  >
                    Military
                  </button>

                </div>
              )}
            </li>

            {/* Future */}
            <li>
              <button
                onClick={() => {
                  onNavigate('future');
                  setOpenDropdown(null);
                }}
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('future') ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-base-content'
                }`}
              >
                Implication
              </button>
            </li>

            {/* About */}
            <li>
              <button
                onClick={() => {
                  onNavigate('about');
                  setOpenDropdown(null);
                }}
                className={`px-3 py-2 rounded-lg transition ${
                  isActive('about') ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-base-content'
                }`}
              >
                About
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    {showAplus && (
      <div className="aplus-overlay" onAnimationEnd={() => setShowAplus(false)}>
        <div className="aplus-text">Please give us A+</div>
      </div>
    )}
    </>
  );
};
