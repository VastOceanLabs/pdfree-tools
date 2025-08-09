import React, { useState, useEffect, createContext, useContext } from "react";
import { FileText, Scissors, Minimize2, Download, Home, Lock, RotateCcw, Image } from "lucide-react";

// === Actual tool pages ===
import MergePdf from "./pages/MergePdf";
import SplitPdfPage from "./pages/SplitPdf";
import CompressPdf from "./pages/CompressPdf";
import JpgToPdf from "./pages/JpgToPdf";
import PdfToJpgPage from "./pages/PdfToJpg";
import ProtectPdf from "./pages/ProtectPdf";
import RotatePdf from "./pages/RotatePdf";

// ================= Router plumbing =================

type RouterContextType = {
  currentPath: string;
  navigate: (path: string) => void;
};
const RouterContext = createContext<RouterContextType | null>(null);

const getPath = () =>
  typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";

const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(getPath);

  useEffect(() => {
    const onPop = () => setCurrentPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (path: string) => {
    const clean = path.replace(/\/+$/, "") || "/";
    if (clean === currentPath) return;
    window.history.pushState({}, "", clean);
    setCurrentPath(clean);
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

const DocumentHead: React.FC<{
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
}> = ({ title, description, canonical, noindex }) => {
  useEffect(() => {
    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
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

    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
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

// ================= Layout helpers =================

const Scaffold: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => {
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
      <div className="rounded-2xl border p-6 bg-white">{children}</div>
    </div>
  );
};

// ================= Pages =================

const HomePage: React.FC = () => {
  const cards = [
    { to: "/merge-pdf", icon: FileText, title: "Merge PDF", desc: "Combine multiple PDFs into one." },
    { to: "/split-pdf", icon: Scissors, title: "Split PDF", desc: "Extract pages or split ranges." },
    { to: "/compress-pdf", icon: Minimize2, title: "Compress PDF", desc: "Reduce PDF file size." },
    { to: "/jpg-to-pdf", icon: Image, title: "Image to PDF", desc: "Convert JPG/PNG to PDF." },
    { to: "/pdf-to-jpg", icon: Download, title: "PDF to Image", desc: "Export pages as images." },
    { to: "/protect-pdf", icon: Lock, title: "Protect PDF", desc: "Add password protection." },
    { to: "/rotate-pdf", icon: RotateCcw, title: "Rotate PDF", desc: "Rotate pages and save." },
  ];

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
          100% free • No email required • Files processed locally in your browser
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.to} to={c.to} className="block rounded-2xl border p-6 hover:shadow-md">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">{c.title}</h2>
                </div>
                <p className="text-slate-600">{c.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

// simple placeholders for not-yet-built converters (keep routing stable)
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

const NotFoundPage: React.FC = () => {
  const tools = [
    { name: "Merge PDF", path: "/merge-pdf", icon: FileText },
    { name: "Split PDF", path: "/split-pdf", icon: Scissors },
    { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
    { name: "PDF to Image", path: "/pdf-to-jpg", icon: Download },
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
          const Icon = t.icon as any;
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
  const path = currentPath || "/";

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

    // Additional functions from src/pages
    case "/jpg-to-pdf":
    case "/image-to-pdf":
      return (
        <Scaffold title="Image to PDF">
          <JpgToPdf />
        </Scaffold>
      );

    case "/pdf-to-jpg":
    case "/pdf-to-image":
      return (
        <Scaffold title="PDF to Image">
          <PdfToJpgPage />
        </Scaffold>
      );

    case "/protect-pdf":
      return (
        <Scaffold title="Protect PDF">
          <ProtectPdf />
        </Scaffold>
      );

    case "/rotate-pdf":
      return (
        <Scaffold title="Rotate PDF">
          <RotatePdf />
        </Scaffold>
      );

    // Placeholders kept for now (if you add pages later, swap them in)
    case "/pdf-to-word":
    case "/pdf-to-doc":
      return <PDFToWord />;

    case "/word-to-pdf":
    case "/doc-to-pdf":
      return <WordToPDF />;

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
