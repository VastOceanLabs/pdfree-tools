import React, { useState, useEffect, createContext, useContext } from "react";
import { FileText, Scissors, Minimize2, Download, Home } from "lucide-react";

// === Import the actual tool pages ===
import MergePdf from "./pages/MergePdf";
import SplitPdfPage from "./pages/SplitPdf";
import CompressPdf from "./pages/CompressPdf";

// ================= Router plumbing =================

type RouterContextType = {
  currentPath: string;
  navigate: (path: string) => void;
};
const RouterContext = createContext<RouterContextType | null>(null);

const getPath = () =>
  typeof window !== "undefined" ? window.location.pathname : "/";

const RouterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPath, setCurrentPath] = useState(getPath);

  useEffect(() => {
    const onPop = () => setCurrentPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (path: string) => {
    if (path === currentPath) return;
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

const useRouter = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used within RouterProvider");
  return ctx;
};

// ================= Small helpers =================

const Link: React.FC<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }
> = ({ to, children, ...rest }) => {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
};

// optional, keeps canonical/description tidy if you want it
const DocumentHead: React.FC<{
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
}> = ({ title, description, canonical, noindex }) => {
  useEffect(() => {
    document.title = title;

    let metaDesc = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    let link = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (canonical) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    } else if (link) {
      link.remove();
    }

    let robots = document.querySelector(
      'meta[name="robots"]'
    ) as HTMLMetaElement | null;
    if (noindex) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex, nofollow";
    } else if (robots) {
      robots.content = "index, follow";
    }
  }, [title, description, canonical, noindex]);

  return null;
};

// ================= Pages =================

const HomePage: React.FC = () => {
  return (
    <>
      <DocumentHead
        title="Free PDF Tools | PDfree.tools"
        description="Professional PDF tools that work entirely in your browser. 100% free, no email required."
        canonical="https://pdfree.tools/"
      />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8 flex items-center gap-2 text-slate-700">
          <Home className="w-5 h-5" />
          <span>PDfree.tools</span>
        </header>

        <h1 className="text-3xl font-bold mb-2">Free PDF Tools</h1>
        <p className="text-slate-600 mb-8">
          100% free • No email required • Files deleted in 1 hour
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            to="/merge-pdf"
            className="block rounded-2xl border p-6 hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Merge PDF</h2>
            </div>
            <p className="text-slate-600">
              Combine multiple PDF files into one document.
            </p>
          </Link>

          <Link
            to="/split-pdf"
            className="block rounded-2xl border p-6 hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <Scissors className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Split PDF</h2>
            </div>
            <p className="text-slate-600">
              Extract pages or split into multiple documents.
            </p>
          </Link>

          <Link
            to="/compress-pdf"
            className="block rounded-2xl border p-6 hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <Minimize2 className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Compress PDF</h2>
            </div>
            <p className="text-slate-600">
              Reduce PDF file size while maintaining quality.
            </p>
          </Link>
        </div>
      </div>
    </>
  );
};

// tiny placeholders for not-yet-built converters
const PDFToWord: React.FC = () => (
  <Scaffold title="PDF to Word">
    <p>Tool implementation coming soon…</p>
  </Scaffold>
);
const WordToPDF: React.FC = () => (
  <Scaffold title="Word to PDF">
    <p>Tool implementation coming soon…</p>
  </Scaffold>
);
const PDFToImage: React.FC = () => (
  <Scaffold title="PDF to Image">
    <p>Tool implementation coming soon…</p>
  </Scaffold>
);
const ImageToPDF: React.FC = () => (
  <Scaffold title="Image to PDF">
    <p>Tool implementation coming soon…</p>
  </Scaffold>
);

// simple wrapper to keep detail pages consistent
const Scaffold: React.FC<{ title: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => {
  const { navigate } = useRouter();
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate("/")}
        className="text-sm text-slate-600 hover:underline mb-6 inline-flex items-center gap-2"
      >
        ← Back to Home
      </button>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="rounded-2xl border p-6">{children}</div>
    </div>
  );
};

const NotFoundPage: React.FC = () => {
  const tools = [
    { name: "Merge PDF", path: "/merge-pdf", icon: FileText },
    { name: "Split PDF", path: "/split-pdf", icon: Scissors },
    { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
    { name: "PDF to Word", path: "/pdf-to-word", icon: Download },
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="text-slate-600 mb-6">Page not found.</p>
      <Link to="/" className="text-blue-600 hover:underline mb-8 inline-block">
        Back to Homepage
      </Link>
      <h2 className="text-xl font-semibold mb-3">Popular PDF Tools</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.path}
              to={t.path}
              className="rounded-2xl border p-4 hover:shadow-sm flex items-center gap-3"
            >
              <Icon className="w-5 h-5" />
              {t.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// ================= Router =================

const AppRouter: React.FC = () => {
  const { currentPath } = useRouter();
  const path = currentPath;

  switch (path) {
    case "/":
      return <HomePage />;

    case "/merge-pdf":
    case "/merge":
      return (
        <Scaffold title="Merge PDF">
          <MergePdf />
        </Scaffold>
      );

    case "/split-pdf":
    case "/split":
      return (
        <Scaffold title="Split PDF">
          <SplitPdfPage />
        </Scaffold>
      );

    case "/compress-pdf":
    case "/compress":
      return (
        <Scaffold title="Compress PDF">
          <CompressPdf />
        </Scaffold>
      );

    case "/pdf-to-word":
    case "/pdf-to-doc":
      return <PDFToWord />;

    case "/word-to-pdf":
    case "/doc-to-pdf":
      return <WordToPDF />;

    case "/pdf-to-image":
    case "/pdf-to-jpg":
      return <PDFToImage />;

    case "/image-to-pdf":
    case "/jpg-to-pdf":
      return <ImageToPDF />;

    default:
      return <NotFoundPage />;
  }
};

// ================= App =================

export default function App() {
  return (
    <RouterProvider>
      <AppRouter />
    </RouterProvider>
  );
}
