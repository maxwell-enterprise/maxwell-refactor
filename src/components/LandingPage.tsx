
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types/index';
import { PUBLIC_PROGRAMS, PUBLIC_STORE, PUBLIC_ARTICLES, DISCOUNT_DATA } from '../constants';
import { Menu, X, ArrowRight, ShoppingBag, LogIn, Tag } from 'lucide-react';
import MaxwellScoutWidget from './scout/MaxwellScoutWidget';
import ModernLogin from './auth/ModernLogin';

interface LandingPageProps {
  onLogin: (role: UserRole, provider: 'google' | 'email') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // --- VARIABLE INJECTION STATE ---
  const [dynamicGreeting, setDynamicGreeting] = useState({
      title: 'Leaders Change the World',
      subtitle: 'Join the world\'s most influential leadership community. Access proven strategies, connect with mentors, and grow your potential.'
  });

  useEffect(() => {
      // Logic: If query params exist (simulating a personalized link click), inject variables
      const params = new URLSearchParams(window.location.search);
      const memberName = params.get('member_name') || params.get('name');
      
      if (memberName) {
          setDynamicGreeting({
              title: `Welcome Back, <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">${memberName}</span>`,
              subtitle: `We are ready to continue your growth journey. Check out the special offers curated just for you below.`
          });
      }
  }, []);

  const featuredOffers = useMemo(() => {
      return DISCOUNT_DATA.filter(d => d.isFeatured);
  }, []);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Navbar */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex flex-col items-start cursor-pointer">
              <img 
                  src="https://www.maxwellleadership.com/wp-content/themes/jm/assets/images/logo.svg" 
                  alt="Maxwell Leadership" 
                  className="h-7 w-auto"
              />
              <span className="text-[9px] uppercase tracking-[0.35em] text-blue-700 font-bold mt-1 ml-0.5">Indonesia</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8 items-center">
              <a href="#offers" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Offers</a>
              <a href="#programs" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Programs</a>
              <a href="#store" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Store</a>
              <a href="#articles" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Insights</a>
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
              >
                <LogIn size={16} className="mr-2" />
                Sign In
              </button>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-xl animate-fade-in-down">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <a href="#offers" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Offers</a>
              <a href="#programs" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Programs</a>
              <a href="#store" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Store</a>
              <a href="#articles" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Insights</a>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button 
                  onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img 
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000" 
            alt="Leadership Background" 
            className="w-full h-full object-cover opacity-10"
           />
           <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/50 to-slate-50"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
            Elevate Your Influence
          </div>
          {/* Dynamic Title Injection */}
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-tight mb-6"
            dangerouslySetInnerHTML={{ __html: dynamicGreeting.title }}
          >
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed">
            {dynamicGreeting.subtitle}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-full bg-slate-900 text-white font-semibold text-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all">
              Start Your Journey
            </button>
            <button className="px-8 py-4 rounded-full bg-white text-slate-700 border border-slate-200 font-semibold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all">
              Explore Programs
            </button>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-slate-200 pt-8">
            <div>
              <div className="text-3xl font-bold text-slate-900">5M+</div>
              <div className="text-sm text-slate-500">Leaders Trained</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">160+</div>
              <div className="text-sm text-slate-500">Countries</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">40+</div>
              <div className="text-sm text-slate-500">Years of Legacy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">#1</div>
              <div className="text-sm text-slate-500">Leadership Brand</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- LIMITED TIME OFFERS --- */}
      {featuredOffers.length > 0 && (
          <section id="offers" className="py-12 bg-indigo-50 border-y border-indigo-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-8">
                      <span className="text-indigo-600 font-bold tracking-wider uppercase text-xs">Limited Time Only</span>
                      <h2 className="text-3xl font-bold text-slate-900 mt-2">Special Offers</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {featuredOffers.map(offer => (
                          <div key={offer.id} className="bg-white rounded-xl p-6 shadow-md border-2 border-indigo-100 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-transform">
                              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                  {offer.type === 'BUNDLE_VOLUME' ? 'BUNDLE' : 'PROMO'}
                              </div>
                              <div className="mb-4">
                                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                                      <Tag size={24} />
                                  </div>
                                  <h3 className="font-bold text-lg text-slate-900">{offer.title}</h3>
                                  <p className="text-sm text-slate-500 mt-1">{offer.description}</p>
                              </div>
                              
                              <div className="mt-auto pt-4 border-t border-slate-100">
                                  <div className="flex justify-between items-end mb-3">
                                      <div className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">Code: {offer.code}</div>
                                      <div className="text-right">
                                          <div className="text-sm font-bold text-indigo-600">
                                              {offer.type === 'PERCENTAGE' ? `Save ${offer.value}%` : 
                                               offer.type === 'FIXED_AMOUNT' ? `Save ${formatIDR(offer.value)}` : 
                                               `Buy ${offer.minQty}+ Save ${offer.value}%`}
                                          </div>
                                      </div>
                                  </div>
                                  <button className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                                      Claim Offer
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>
      )}

      {/* Programs Section */}
      <section id="programs" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Signature Programs</h2>
              <p className="mt-2 text-slate-500">Pathways designed for every stage of your growth.</p>
            </div>
            <a href="#" className="hidden md:flex items-center text-blue-600 font-medium hover:underline mt-4 md:mt-0">
              View all programs <ArrowRight size={16} className="ml-1" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PUBLIC_PROGRAMS.map((prog, idx) => (
              <div key={idx} className="group bg-slate-50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-slate-100">
                <div className="h-48 overflow-hidden relative">
                  <img src={prog.image} alt={prog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900">
                    {prog.price}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{prog.title}</h3>
                  <p className="text-slate-600 text-sm mb-6 line-clamp-2">{prog.desc}</p>
                  <button className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-900 hover:text-white hover:border-transparent transition-all">
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Store Preview */}
      <section id="store" className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 font-semibold tracking-wider uppercase text-xs">Shop</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">Resources for Growth</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {PUBLIC_STORE.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all group">
                <div className="aspect-[3/4] bg-slate-100 rounded-lg mb-4 overflow-hidden">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="text-xs text-slate-400 mb-1">{item.category}</div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h4>
                <div className="flex justify-between items-center">
                   <span className="text-blue-600 font-bold text-sm">{item.price}</span>
                   <button className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-colors">
                     <ShoppingBag size={14} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Articles / Insights */}
      <section id="articles" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Latest Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PUBLIC_ARTICLES.map((article, idx) => (
              <div key={idx} className="flex flex-col border-b border-slate-100 pb-8 md:border-none md:pb-0">
                <span className="text-xs font-bold text-blue-600 mb-2 uppercase">{article.category}</span>
                <h3 className="text-xl font-bold text-slate-900 mb-3 hover:text-blue-600 cursor-pointer">{article.title}</h3>
                <div className="mt-auto flex items-center text-sm text-slate-500">
                  <span>{article.author}</span>
                  <span className="mx-2">•</span>
                  <span>{article.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <span className="text-2xl font-bold text-white mb-4 block">Maxwell<span className="font-light">Leadership</span></span>
            <p className="max-w-sm mb-6">Empowering men and women to lead with purpose and integrity in every sphere of life.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Academy</a></li>
              <li><a href="#" className="hover:text-white">Events</a></li>
              <li><a href="#" className="hover:text-white">Coaching</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Connect</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-xs text-center md:text-left">
          © 2025 Maxwell Leadership Enterprise. All rights reserved.
        </div>
      </footer>

      {/* Maxwell Scout Widget */}
      <MaxwellScoutWidget />

      {/* Modern Login Modal */}
      {showLoginModal && (
        <ModernLogin 
            onLogin={(role, provider) => {
                setShowLoginModal(false);
                onLogin(role, provider);
            }} 
            onClose={() => setShowLoginModal(false)} 
        />
      )}
    </div>
  );
};

export default LandingPage;
