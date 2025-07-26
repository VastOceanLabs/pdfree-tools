import React, { useState, useEffect, createContext, useContext } from 'react';
import { FileText, Scissors, Minimize2, Download, Home, Search, ArrowRight } from 'lucide-react';

// Router context for managing navigation state
interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

// Safe window location getter for SSR compatibility
const getPath = () => (typeof window !== 'undefined' ? window.location.pathname : '/');

// Router provider component
const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(getPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

// Hook to access router context
const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context;
};

// Route mapping for canonical URLs
const CANONICAL_ROUTES: Record<string, string> = {
  '/merge': '/merge-pdf',
  '/split': '/split-pdf',
  '/compress': '/compress-pdf',
  '/pdf-to-doc': '/pdf-to-word',
  '/doc-to-pdf': '/word-to-pdf',
  '/pdf-to-jpg': '/pdf-to-image',
  '/jpg-to-pdf': '/image-to-pdf',
};

// Get canonical URL for a given path
const getCanonicalUrl = (path: string): string => {
  const canonicalPath = CANONICAL_ROUTES[path] || path;
  return `https://pdfree.tools${canonicalPath}`;
};

// Custom component for managing document head
const DocumentHead: React.FC<{
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
}> = ({ title, description, canonical, noindex }) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical;
    } else if (canonicalLink) {
      canonicalLink.remove();
    }

    // Handle robots meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow';
    } else if (robotsMeta) {
      robotsMeta.content = 'index, follow';
    }
  }, [title, description, canonical, noindex]);

  return null;
};

// Properly typed Link component
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
}

const Link: React.FC<LinkProps> = ({ to, children, ...rest }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};

// Homepage component
const HomePage: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <DocumentHead
        title="PDfree.tools - Free PDF Tools Online | No Email Required"
        description="Free PDF tools online. Merge, split, compress, convert PDF files. No email required, unlimited use, files deleted after 1 hour. 100% secure and private."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Free PDF Tools
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Professional PDF tools that work entirely in your browser. No email required, unlimited use, and your files are automatically deleted after 1 hour.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full">
              ✓ 100% Free
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              ✓ No Email Required
            </span>
            <span className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full">
              ✓ Files Deleted in 1 Hour
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Sample tool cards */}
          <Link to="/merge-pdf" className="group block">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group-hover:border-blue-300 border border-transparent">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600">Merge PDF</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Combine multiple PDF files into one document</p>
            </div>
          </Link>

          <Link to="/split-pdf" className="group block">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group-hover:border-blue-300 border border-transparent">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Scissors className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-green-600">Split PDF</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Extract pages or split into multiple documents</p>
            </div>
          </Link>

          <Link to="/compress-pdf" className="group block">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group-hover:border-blue-300 border border-transparent">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Minimize2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-orange-600">Compress PDF</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Reduce file size while maintaining quality</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Tool page components
const MergePDF: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentHead
        title="Merge PDF Files Free Online - No Email Required | PDfree.tools"
        description="Merge PDF files online for free. Combine multiple PDFs into one document. No email signup, unlimited use, secure processing."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Merge PDF Files</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Combine multiple PDF files into a single document. No email required, completely free.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Tool Implementation Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              This tool will allow you to merge multiple PDF files into one document.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SplitPDF: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentHead
        title="Split PDF Files Free Online - No Email Required | PDfree.tools"
        description="Split PDF files online for free. Extract pages or split into multiple documents. No email signup, unlimited use, secure processing."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Split PDF Files</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Extract pages or split PDF files into multiple documents. No email required, completely free.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Tool Implementation Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              This tool will allow you to split PDF files into multiple documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompressPDF: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentHead
        title="Compress PDF Files Free Online - No Email Required | PDfree.tools"
        description="Compress PDF files online for free. Reduce file size while maintaining quality. No email signup, unlimited use, secure processing."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Compress PDF Files</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Reduce PDF file size while maintaining quality. No email required, completely free.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Minimize2 className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Tool Implementation Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              This tool will allow you to compress PDF files to reduce their size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Other tool components with proper canonical URL handling
const PDFToWord: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentHead
        title="PDF to Word Converter Free Online - No Email Required | PDfree.tools"
        description="Convert PDF to Word documents online for free. Maintain formatting and layout. No email signup, unlimited use, secure processing."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">PDF to Word Converter</h1>
        <p className="text-gray-600 dark:text-gray-300">Tool implementation coming soon...</p>
      </div>
    </div>
  );
};

const WordToPDF: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentHead
        title="Word to PDF Converter Free Online - No Email Required | PDfree.tools"
        description="Convert Word documents to PDF online for free. Preserve formatting and layout. No email signup, unlimited use, secure processing."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Word to PDF Converter</h1>
        <p className="text-gray-600 dark:text-gray-300">Tool implementation coming soon...</p>
      </div>
    </div>
  );
};

const PDFToImage: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentHead
        title="PDF to Image Converter Free Online - No Email Required | PDfree.tools"
        description="Convert PDF to images (JPG, PNG) online for free. High-quality image extraction. No email signup, unlimited use, secure processing."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">PDF to Image Converter</h1>
        <p className="text-gray-600 dark:text-gray-300">Tool implementation coming soon...</p>
      </div>
    </div>
  );
};

const ImageToPDF: React.FC = () => {
  const { currentPath } = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentHead
        title="Image to PDF Converter Free Online - No Email Required | PDfree.tools"
        description="Convert images to PDF online for free. Support JPG, PNG, and more formats. No email signup, unlimited use, secure processing."
        canonical={getCanonicalUrl(currentPath)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Image to PDF Converter</h1>
        <p className="text-gray-600 dark:text-gray-300">Tool implementation coming soon...</p>
      </div>
    </div>
  );
};

// Properly typed tool data for consistency
interface PopularTool {
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}

// 404 Error Page with helpful suggestions
const NotFoundPage: React.FC = () => {
  const popularTools: PopularTool[] = [
    { name: 'Merge PDF', path: '/merge-pdf', icon: FileText, description: 'Combine multiple PDF files' },
    { name: 'Split PDF', path: '/split-pdf', icon: Scissors, description: 'Extract pages from PDF' },
    { name: 'Compress PDF', path: '/compress-pdf', icon: Minimize2, description: 'Reduce PDF file size' },
    { name: 'PDF to Word', path: '/pdf-to-word', icon: Download, description: 'Convert PDF to editable document' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <DocumentHead
        title="Page Not Found - PDfree.tools"
        description="The page you're looking for doesn't exist. Explore our free PDF tools including merge, split, compress, and convert."
        noindex={true}
      />
      
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Icon */}
        <div className="w-24 h-24 mx-auto mb-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Search className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        
        {/* Error Message */}
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist. But don't worry - we have plenty of free PDF tools to help you!
        </p>
        
        {/* Home Button */}
        <div className="mb-12">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <Home className="w-5 h-5" />
            Back to Homepage
          </Link>
        </div>
        
        {/* Popular Tools */}
        <div className="text-left">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Popular PDF Tools
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {popularTools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="group bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-800 transition-colors">
                      <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {tool.name}
                        </h4>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        
        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Looking for something specific?</strong> All our tools are 100% free with no email required. 
            Your files are automatically deleted after 1 hour for your privacy.
          </p>
        </div>
      </div>
    </div>
  );
};

// Custom router component that manages all routing
const AppRouter: React.FC = () => {
  const { currentPath } = useRouter();

  // Route matching
  const renderRoute = () => {
    const path = currentPath;
    
    switch (path) {
      case '/':
        return <HomePage />;
      case '/merge-pdf':
      case '/merge':
        return <MergePDF />;
      case '/split-pdf':
      case '/split':
        return <SplitPDF />;
      case '/compress-pdf':
      case '/compress':
        return <CompressPDF />;
      case '/pdf-to-word':
      case '/pdf-to-doc':
        return <PDFToWord />;
      case '/word-to-pdf':
      case '/doc-to-pdf':
        return <WordToPDF />;
      case '/pdf-to-image':
      case '/pdf-to-jpg':
        return <PDFToImage />;
      case '/image-to-pdf':
      case '/jpg-to-pdf':
        return <ImageToPDF />;
      default:
        return <NotFoundPage />;
    }
  };

  return <div className="App">{renderRoute()}</div>;
};

// Main App component
function App() {
  return (
    <RouterProvider>
      <AppRouter />
    </RouterProvider>
  );
}

export default App;