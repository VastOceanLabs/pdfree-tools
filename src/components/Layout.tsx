import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {/* PDF Icon */}
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <h1 className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                  PDfree.tools
                </h1>
              </div>
              
              {/* Free Badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200">
                100% Free
              </span>
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <a 
                href="/" 
                className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
              >
                Tools
              </a>
              <a 
                href="/blog" 
                className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
              >
                Blog
              </a>
              <a 
                href="/privacy" 
                className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
              >
                Privacy
              </a>
            </nav>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Open main menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {/* Page Title Section (if provided) */}
        {title && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {title}
                </h1>
                {description && (
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">PDfree.tools</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Free PDF tools with no email required, no limits, and complete privacy.
              </p>
            </div>

            {/* Tools Column */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tools</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/merge-pdf" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Merge PDF</a></li>
                <li><a href="/split-pdf" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Split PDF</a></li>
                <li><a href="/compress-pdf" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Compress PDF</a></li>
                <li><a href="/rotate-pdf" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Rotate PDF</a></li>
              </ul>
            </div>

            {/* Convert Column */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Convert</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/pdf-to-jpg" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">PDF to JPG</a></li>
                <li><a href="/jpg-to-pdf" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">JPG to PDF</a></li>
                <li><a href="/protect-pdf" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Protect PDF</a></li>
                <li><a href="/blog" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">How-to Guides</a></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Terms of Service</a></li>
                <li><a href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">Contact</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 PDfree.tools. All rights reserved.
              </p>
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Files auto-deleted after 1 hour
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">All systems operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}