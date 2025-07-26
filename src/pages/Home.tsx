"use client";

import React, { memo } from 'react';
import { 
  FileText, 
  Download, 
  Archive, 
  FileImage, 
  Scissors, 
  Copy, 
  Lock,
  Shield,
  Clock,
  Zap,
  Users,
  Star,
  ChevronRight,
  Upload,
  Settings,
  CheckCircle
} from 'lucide-react';
import type { ComponentType } from 'react';

type Tool = {
  id: 'compress' | 'merge' | 'split' | 'convert' | 'protect' | 'unlock' | 'edit';
  name: string;
  description: string;
  icon: ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  href: string;
};

type Benefit = {
  icon: ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
};

type Step = {
  number: string;
  title: string;
  description: string;
  icon: ComponentType<React.SVGProps<SVGSVGElement>>;
};

const tools: Tool[] = [
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce PDF file size without losing quality',
    icon: Archive,
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    href: '/tools/compress'
  },
  {
    id: 'merge',
    name: 'Merge PDFs',
    description: 'Combine multiple PDF files into one',
    icon: Copy,
    color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    href: '/tools/merge'
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Extract pages or split into multiple files',
    icon: Scissors,
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    href: '/tools/split'
  },
  {
    id: 'convert',
    name: 'PDF to Image',
    description: 'Convert PDF pages to JPG, PNG images',
    icon: FileImage,
    color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    href: '/tools/convert'
  },
  {
    id: 'protect',
    name: 'Protect PDF',
    description: 'Add password protection to PDF files',
    icon: Lock,
    color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    href: '/tools/protect'
  },
  {
    id: 'unlock',
    name: 'Unlock PDF',
    description: 'Remove password protection from PDFs',
    icon: FileText,
    color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    href: '/tools/unlock'
  },
  {
    id: 'edit',
    name: 'Edit PDF',
    description: 'Add text, images, and annotations',
    icon: Settings,
    color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    href: '/tools/edit'
  }
] satisfies Tool[];

const benefits: Benefit[] = [
  {
    icon: Shield,
    title: 'Complete Privacy',
    description: 'Basic tools process files locally in your browser. Advanced tools use secure temporary processing.'
  },
  {
    icon: Clock,
    title: 'Auto-Delete',
    description: 'Any files processed on our servers are automatically deleted after 1 hour. Zero data retention.'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Client-side processing for basic tools means instant results without waiting for uploads.'
  },
  {
    icon: Users,
    title: 'No Registration',
    description: 'Start using all tools immediately. No email required, no account needed.'
  }
] satisfies Benefit[];

const steps: Step[] = [
  {
    number: '1',
    title: 'Upload Your PDF',
    description: 'Drag & drop or click to select your PDF file',
    icon: Upload
  },
  {
    number: '2', 
    title: 'Choose Your Tool',
    description: 'Select from our 7 professional PDF tools',
    icon: Settings
  },
  {
    number: '3',
    title: 'Download Results',
    description: 'Get your processed file instantly',
    icon: Download
  }
] satisfies Step[];

// Memoized component for better performance
const ToolCard = memo(({ tool }: { tool: Tool }) => {
  const IconComponent = tool.icon;
  
  return (
    <a 
      href={tool.href}
      className="group bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={`Use ${tool.name} tool - ${tool.description}`}
    >
      <div className={`inline-flex p-3 rounded-lg ${tool.color} mb-4 group-hover:scale-110 transition-transform duration-200`}>
        <IconComponent className="h-6 w-6" aria-hidden="true" focusable="false" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {tool.name}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
        {tool.description}
      </p>
      
      <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300">
        Use Tool
        <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" focusable="false" />
      </div>
    </a>
  );
});

ToolCard.displayName = 'ToolCard';

const Home = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "PDfree.tools",
            "description": "Free PDF tools that work entirely in your browser. No email required, unlimited usage, complete privacy.",
            "url": "https://pdfreee.tools",
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "Compress PDF",
              "Merge PDFs", 
              "Split PDF",
              "PDF to Image",
              "Protect PDF",
              "Unlock PDF",
              "Edit PDF"
            ]
          })
        }}
      />

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" aria-hidden="true" focusable="false" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                PDfree.tools
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <nav aria-label="Primary" className="hidden md:flex space-x-8">
              <a 
                href="#tools" 
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-current="page"
              >
                Tools
              </a>
              <a 
                href="#how-it-works" 
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                How It Works
              </a>
              <a 
                href="/blog" 
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                Blog
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Free PDF Tools
                <span className="block text-blue-600">No Email Required</span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Professional PDF processing tools that work entirely in your browser. 
                <strong className="text-gray-900 dark:text-white"> 100% free, unlimited usage, complete privacy.</strong>
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-8 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" focusable="false" />
                  <span>No Email Required</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" focusable="false" />
                  <span>Files Auto-Deleted</span>
                </div>
                <div className="flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" focusable="false" />
                  <span>Lightning Fast</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" focusable="false" />
                  <span>100% Free</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="#tools"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Start Using Tools Now
                  <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" focusable="false" />
                </a>
                <a 
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  See How It Works
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section id="tools" className="py-16 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Professional PDF Tools
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Everything you need to work with PDFs. Basic tools work offline in your browser for maximum privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose PDfree.tools?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                We prioritize your privacy and productivity with professional-grade tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
                      <IconComponent className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" focusable="false" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {benefit.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Get professional PDF results in three simple steps. No learning curve required.
              </p>
            </div>

            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={index} className="text-center relative">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-xl font-bold mb-4">
                        {step.number}
                      </div>
                      
                      <div className="inline-flex p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm mb-4">
                        <IconComponent className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" focusable="false" />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {step.title}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-300">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              {/* Connector lines using CSS Grid approach */}
              <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600 -z-10" 
                   style={{ 
                     background: `repeating-linear-gradient(
                       to right, 
                       transparent 0%, 
                       transparent 33.33%, 
                       currentColor 33.33%, 
                       currentColor 66.66%, 
                       transparent 66.66%, 
                       transparent 100%
                     )` 
                   }} 
              />
            </div>
          </div>
        </section>

        {/* Trust Signals & File Deletion Policy */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-8 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" aria-hidden="true" focusable="false" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Your Privacy is Our Priority
              </h2>
              
              <div className="text-lg text-gray-700 dark:text-gray-300 space-y-3 max-w-2xl mx-auto">
                <p>
                  <strong>🔒 Basic tools process files entirely in your browser</strong> - no uploads required
                </p>
                <p>
                  <strong>⚡ Advanced tools use secure temporary processing</strong> - files auto-deleted after 1 hour
                </p>
                <p>
                  <strong>🚫 No email collection, no user accounts, no tracking cookies</strong>
                </p>
                <p>
                  <strong>🔐 GDPR & CCPA compliant</strong> - read our privacy policy
                </p>
              </div>

              <div className="mt-8">
                <a 
                  href="/privacy" 
                  className="inline-flex items-center text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                >
                  Read Full Privacy Policy
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" focusable="false" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <FileText className="h-8 w-8 text-blue-400" aria-hidden="true" focusable="false" />
                <span className="ml-2 text-xl font-bold">PDfree.tools</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Professional PDF tools that prioritize your privacy. No email required, 
                files processed locally when possible, completely free forever.
              </p>
              <p className="text-sm text-gray-500">
                © {currentYear} PDfree.tools. All rights reserved.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Tools</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/tools/compress" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">Compress PDF</a></li>
                <li><a href="/tools/merge" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">Merge PDFs</a></li>
                <li><a href="/tools/split" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">Split PDF</a></li>
                <li><a href="/tools/convert" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">PDF to Image</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/about" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">About</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">Terms of Service</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;