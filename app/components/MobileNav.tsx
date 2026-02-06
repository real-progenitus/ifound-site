'use client';

import { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  links: NavLink[];
}

export default function MobileNav({ links }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="flex items-center justify-between px-10 pt-6 min-[600px]:hidden relative z-50">
        <a href="/" className="flex items-center">
          <img
            src="/favicon.png"
            alt="Logo"
            width={60}
            height={60}
            className="h-16 w-16 object-contain"
          />
          <span className="text-white text-2xl font-semibold">ifound</span>
        </a>

        {/* Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col gap-1.5 w-8 h-8 items-center justify-center"
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-0.5 bg-white rounded-full transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''
              }`}
          />
          <span
            className={`w-6 h-0.5 bg-white rounded-full transition-all duration-300 ${isOpen ? 'opacity-0' : ''
              }`}
          />
          <span
            className={`w-6 h-0.5 bg-white rounded-full transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
          />
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-[#38B6FF] z-40 min-[600px]:hidden transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{ top: '88px' }}
      >
        <nav className="flex flex-col items-center justify-center gap-8 h-full px-6">
          <div className="absolute top-8">
            <LanguageSwitcher />
          </div>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-white text-2xl font-medium hover:text-white/80 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
