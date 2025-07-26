import React from 'react';
import { Helmet } from 'react-helmet-async';

// Types for different page types and their SEO requirements
export interface SEOProps {
  // Basic Meta Data
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  
  // Page Type
  pageType?: 'homepage' | 'tool' | 'blog' | 'about' | 'privacy' | 'terms';
  
  // Tool-specific data
  toolData?: {
    name: string;
    description: string;
    category: string;
    inputFormat?: string;
    outputFormat?: string;
    features: string[];
    steps?: HowToStep[];
  };
  
  // FAQ data for rich snippets
  faqData?: FAQItem[];
  
  // Breadcrumb data
  breadcrumbs?: BreadcrumbItem[];
  
  // Article/Blog specific
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
    readingTime?: number;
  };
  
  // Social Media
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  
  // Additional meta
  noIndex?: boolean;
  noFollow?: boolean;
}

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

// Site-wide constants
const SITE_CONFIG = {
  siteName: 'PDfree.tools',
  siteUrl: 'https://pdfree.tools',
  description: 'Free online PDF tools with unlimited usage. Convert, compress, merge, split PDFs without email registration. 100% privacy-focused.',
  author: 'PDfree.tools Team',
  twitterHandle: '@pdfreetoolscom',
  ogImage: '/images/og-default.png',
  favicon: '/favicon.ico',
  themeColor: '#3B82F6'
};

// Helper function to ensure absolute URLs
const abs = (url?: string): string => {
  if (!url) return SITE_CONFIG.siteUrl;
  return url.startsWith('http') ? url : `${SITE_CONFIG.siteUrl}${url}`;
};

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  canonicalUrl,
  pageType = 'homepage',
  toolData,
  faqData,
  breadcrumbs,
  article,
  ogImage,
  ogImageAlt,
  twitterCard = 'summary_large_image',
  noIndex = false,
  noFollow = false
}) => {
  // Generate dynamic title based on page type and content
  const generateTitle = (): string => {
    if (title) {
      return pageType === 'blog' 
        ? `${title} | ${SITE_CONFIG.siteName} Blog`
        : `${title} | ${SITE_CONFIG.siteName}`;
    }
    
    switch (pageType) {
      case 'homepage':
        return `${SITE_CONFIG.siteName} - Free PDF Tools Online | No Email Required`;
      case 'tool':
        if (toolData) {
          return `${toolData.name} - Free Online PDF Tool | ${SITE_CONFIG.siteName}`;
        }
        return `Free PDF Tool | ${SITE_CONFIG.siteName}`;
      case 'blog':
        return `${SITE_CONFIG.siteName} Blog`;
      default:
        return `${SITE_CONFIG.siteName} - Free PDF Tools`;
    }
  };

  // Generate dynamic description
  const generateDescription = (): string => {
    if (description) return description;
    
    switch (pageType) {
      case 'homepage':
        return SITE_CONFIG.description;
      case 'tool':
        if (toolData) {
          return `${toolData.description} Free online tool with unlimited usage. No email required, files deleted after 1 hour. 100% privacy-focused.`;
        }
        return 'Free online PDF tool with unlimited usage. No email required.';
      default:
        return SITE_CONFIG.description;
    }
  };

  // Generate keywords string with deduplication
  const generateKeywords = (): string => {
    const baseKeywords = ['PDF tools', 'free PDF', 'online PDF', 'no email required', 'unlimited PDF'];
    const toolKeywords = toolData ? [
      toolData.name.toLowerCase(),
      `free ${toolData.category.toLowerCase()}`,
      `online ${toolData.category.toLowerCase()}`
    ] : [];
    
    // Deduplicate keywords
    const allKeywords = Array.from(new Set([...baseKeywords, ...keywords, ...toolKeywords]));
    return allKeywords.join(', ');
  };

  // Generate canonical URL (always absolute)
  const getCanonicalUrl = (): string => {
    return abs(canonicalUrl);
  };

  // Generate robots content with smart defaults
  const getRobotsContent = (): string => {
    const directives: string[] = [];
    const isLegalPage = pageType === 'privacy' || pageType === 'terms';
    const shouldNoIndex = noIndex ?? isLegalPage; // Default noindex for legal pages
    
    if (shouldNoIndex) directives.push('noindex');
    if (noFollow) directives.push('nofollow');
    if (directives.length === 0) directives.push('index', 'follow');
    
    return directives.join(', ');
  };

  // Generate WebApplication Schema
  const generateWebApplicationSchema = (): Record<string, unknown> => {
    return {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": SITE_CONFIG.siteName,
      "url": SITE_CONFIG.siteUrl,
      "description": SITE_CONFIG.description,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Any",
      "permissions": "none",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "PDF Conversion",
        "PDF Compression",
        "PDF Merging",
        "PDF Splitting",
        "No Registration Required",
        "Unlimited Usage",
        "Privacy Focused"
      ],
      "screenshot": abs("/images/app-screenshot.png"),
      "author": {
        "@type": "Organization",
        "name": SITE_CONFIG.author
      }
    };
  };

  // Generate HowTo Schema for tools
  const generateHowToSchema = (): Record<string, unknown> | null => {
    if (!toolData || !toolData.steps) return null;

    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": `How to ${toolData.name}`,
      "description": toolData.description,
      "image": abs(ogImage) || abs(`/images/tools/${toolData.name.toLowerCase().replace(/\s+/g, '-')}.png`),
      "totalTime": "PT2M",
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": "0"
      },
      "supply": [
        {
          "@type": "HowToSupply",
          "name": "PDF file"
        }
      ],
      "tool": [
        {
          "@type": "HowToTool",
          "name": SITE_CONFIG.siteName
        }
      ],
      "step": toolData.steps.map((step, index) => ({
        "@type": "HowToStep",
        "position": index + 1,
        "name": step.name,
        "text": step.text,
        "image": step.image ? abs(step.image) : undefined
      }))
    };
  };

  // Generate FAQ Schema
  const generateFAQSchema = (): Record<string, unknown> | null => {
    if (!faqData || faqData.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  };

  // Generate Breadcrumb Schema
  const generateBreadcrumbSchema = (): Record<string, unknown> | null => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": abs(crumb.url)
      }))
    };
  };

  // Generate Article Schema for blog posts
  const generateArticleSchema = (): Record<string, unknown> | null => {
    if (pageType !== 'blog' || !article) return null;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": generateTitle(),
      "description": generateDescription(),
      "image": abs(ogImage) || abs(SITE_CONFIG.ogImage),
      "author": {
        "@type": "Person",
        "name": article.author || SITE_CONFIG.author
      },
      "publisher": {
        "@type": "Organization",
        "name": SITE_CONFIG.siteName,
        "logo": {
          "@type": "ImageObject",
          "url": abs("/images/logo.png")
        }
      },
      "datePublished": article.publishedTime,
      "dateModified": article.modifiedTime || article.publishedTime,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": getCanonicalUrl()
      }
    };
  };

  // Combine all schema data with proper typing
  const generateStructuredData = (): Record<string, unknown>[] => {
    const schemas: Record<string, unknown>[] = [];
    
    // Always include WebApplication schema
    schemas.push(generateWebApplicationSchema());
    
    // Add conditional schemas
    const howToSchema = generateHowToSchema();
    if (howToSchema) schemas.push(howToSchema);
    
    const faqSchema = generateFAQSchema();
    if (faqSchema) schemas.push(faqSchema);
    
    const breadcrumbSchema = generateBreadcrumbSchema();
    if (breadcrumbSchema) schemas.push(breadcrumbSchema);
    
    const articleSchema = generateArticleSchema();
    if (articleSchema) schemas.push(articleSchema);
    
    return schemas;
  };

  const finalTitle = generateTitle();
  const finalDescription = generateDescription();
  const finalKeywords = generateKeywords();
  const finalCanonicalUrl = getCanonicalUrl();
  const finalOgImage = abs(ogImage) || abs(SITE_CONFIG.ogImage);
  const structuredData = generateStructuredData();

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content={SITE_CONFIG.author} />
      <meta name="robots" content={getRobotsContent()} />
      <link rel="canonical" href={finalCanonicalUrl} />
      
      {/* Viewport and Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content={SITE_CONFIG.themeColor} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={pageType === 'blog' ? 'article' : 'website'} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={finalCanonicalUrl} />
      <meta property="og:site_name" content={SITE_CONFIG.siteName} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:image:alt" content={ogImageAlt || finalTitle} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_AU" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={SITE_CONFIG.twitterHandle} />
      <meta name="twitter:creator" content={SITE_CONFIG.twitterHandle} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalOgImage} />
      <meta name="twitter:image:alt" content={ogImageAlt || finalTitle} />
      
      {/* Article-specific meta tags */}
      {pageType === 'blog' && article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:modified_time" content={article.modifiedTime || article.publishedTime} />
          <meta property="article:author" content={article.author || SITE_CONFIG.author} />
          {article.tags?.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Favicon and Icons */}
      <link rel="icon" href={SITE_CONFIG.favicon} />
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      
      {/* DNS Prefetch for Performance */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      
      {/* Structured Data (JSON-LD) */}
      {structuredData.map((schema: Record<string, unknown>, index: number) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema, null, 2)
          }}
        />
      ))}
    </Helmet>
  );
};

// Utility function to generate tool-specific SEO props
export const generateToolSEO = (
  toolName: string,
  toolDescription: string,
  category: string,
  features: string[],
  steps?: HowToStep[]
): SEOProps => {
  return {
    pageType: 'tool',
    title: `${toolName} - Free Online PDF Tool`,
    description: `${toolDescription} Free online tool with unlimited usage. No email required, files deleted after 1 hour. 100% privacy-focused.`,
    keywords: [
      toolName.toLowerCase(),
      `free ${category.toLowerCase()}`,
      `online ${category.toLowerCase()}`,
      'no registration',
      'unlimited usage'
    ],
    toolData: {
      name: toolName,
      description: toolDescription,
      category,
      features,
      steps
    }
  };
};

// Utility function for homepage SEO
export const generateHomepageSEO = (): SEOProps => {
  return {
    pageType: 'homepage',
    // No title here - let component generate: "PDfree.tools - Free PDF Tools Online | No Email Required"
    description: 'Free online PDF tools with unlimited usage. Convert, compress, merge, split PDFs without email registration. 100% privacy-focused.',
    keywords: [
      'free PDF tools',
      'online PDF converter',
      'PDF compress',
      'PDF merge',
      'PDF split',
      'no email required',
      'unlimited PDF tools'
    ]
  };
};

// Utility function for blog post SEO
export const generateBlogSEO = (
  title: string,
  description: string,
  publishedTime: string,
  author: string,
  tags: string[] = [],
  modifiedTime?: string
): SEOProps => {
  return {
    pageType: 'blog',
    title,
    description,
    keywords: tags,
    article: {
      publishedTime,
      modifiedTime,
      author,
      tags
    }
  };
};

export default SEO;