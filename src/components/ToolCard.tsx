import React from 'react';
import { 
  FileText, 
  Archive, 
  GitMerge, 
  Scissors, 
  Lock, 
  Unlock, 
  ImageIcon,
  ArrowRight,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Tool data type definition
export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  keywords: string[];
  relatedTools?: string[]; // IDs of related tools
  featured?: boolean;
  processingTime?: string; // e.g., "< 5 seconds"
}

// Tool Card Props
interface ToolCardProps {
  tool: Tool;
  allTools?: Tool[]; // For related tool suggestions
  showRelated?: boolean;
  className?: string;
  priority?: boolean; // For loading optimization
}

// Sample tool data - would typically come from a data file or CMS
export const sampleTools: Tool[] = [
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining quality. Free unlimited compression with no email required.',
    icon: Archive,
    href: '/compress-pdf',
    keywords: ['compress', 'reduce size', 'optimize', 'smaller'],
    relatedTools: ['merge-pdf', 'split-pdf'],
    featured: true,
    processingTime: '< 10 seconds'
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one document. Drag, drop, reorder and merge instantly.',
    icon: GitMerge,
    href: '/merge-pdf',
    keywords: ['combine', 'join', 'merge', 'unite'],
    relatedTools: ['split-pdf', 'compress-pdf'],
    processingTime: '< 5 seconds'
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Extract pages or split PDF into multiple files. Choose specific pages or split by range.',
    icon: Scissors,
    href: '/split-pdf',
    keywords: ['split', 'extract', 'separate', 'divide'],
    relatedTools: ['merge-pdf', 'compress-pdf'],
    processingTime: '< 5 seconds'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert PDF pages to high-quality JPG images. Download individual pages or zip file.',
    icon: ImageIcon,
    href: '/pdf-to-jpg',
    keywords: ['convert', 'image', 'jpg', 'picture'],
    relatedTools: ['compress-pdf', 'split-pdf'],
    processingTime: '< 15 seconds'
  },
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    description: 'Add password protection to your PDF files. Encrypt and secure sensitive documents.',
    icon: Lock,
    href: '/protect-pdf',
    keywords: ['password', 'encrypt', 'secure', 'protect'],
    relatedTools: ['unlock-pdf'],
    processingTime: '< 5 seconds'
  },
  {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    description: 'Remove password protection from PDF files. Works with user passwords instantly.',
    icon: Unlock,
    href: '/unlock-pdf',
    keywords: ['remove password', 'decrypt', 'unlock', 'access'],
    relatedTools: ['protect-pdf'],
    processingTime: '< 3 seconds'
  },
  {
    id: 'edit-pdf',
    name: 'Edit PDF',
    description: 'Add text, images, and annotations to PDF files. Professional editing tools online.',
    icon: FileText,
    href: '/edit-pdf',
    keywords: ['edit', 'modify', 'annotate', 'text'],
    relatedTools: ['compress-pdf', 'protect-pdf'],
    processingTime: '< 5 seconds'
  }
];

// Related Tools Mini Component
const RelatedTools: React.FC<{ relatedToolIds: string[], allTools: Tool[] }> = ({ 
  relatedToolIds, 
  allTools 
}) => {
  const relatedTools = allTools.filter(tool => relatedToolIds.includes(tool.id));
  
  if (relatedTools.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
        Related tools:
      </p>
      <div className="flex flex-wrap gap-2">
        {relatedTools.slice(0, 2).map((relatedTool) => {
          const Icon = relatedTool.icon;
          return (
            <a
              key={relatedTool.id}
              href={relatedTool.href}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label={`Try ${relatedTool.name} tool`}
            >
              <Icon className="w-3 h-3" aria-hidden="true" />
              {relatedTool.name}
            </a>
          );
        })}
      </div>
    </div>
  );
};

// Main ToolCard Component
const ToolCard: React.FC<ToolCardProps> = ({ 
  tool, 
  allTools = sampleTools, 
  showRelated = true, 
  className = '',
  priority = false 
}) => {
  const IconComponent = tool.icon;
  
  return (
    <article
      className={`
        group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 
        transition-all duration-200 ease-in-out
        hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1
        focus-within:shadow-lg focus-within:border-blue-300 dark:focus-within:border-blue-600 focus-within:-translate-y-1
        ${className}
      `}
      aria-labelledby={`tool-${tool.id}-name`}
      aria-describedby={`tool-${tool.id}-description`}
    >
      {/* Featured Badge */}
      {tool.featured && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Zap className="w-3 h-3" aria-hidden="true" />
            Popular
          </div>
        </div>
      )}

      {/* Main Card Link */}
      <a
        href={tool.href}
        className="block p-6 h-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 rounded-lg"
        aria-label={`Open ${tool.name}`}
        {...(priority ? { 'data-priority': 'true' } : {})}
      >
        <div className="flex flex-col h-full">
          {/* Icon and Title Section */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors duration-200">
                <IconComponent 
                  className="w-6 h-6 text-blue-600 dark:text-blue-400" 
                  aria-hidden="true" 
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 
                id={`tool-${tool.id}-name`}
                className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200"
              >
                {tool.name}
              </h3>
              
              {tool.processingTime && (
                <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                  <Zap className="w-3 h-3" aria-hidden="true" />
                  {tool.processingTime}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p 
            id={`tool-${tool.id}-description`}
            className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed flex-1 mb-4"
          >
            {tool.description}
          </p>

          {/* Action Area */}
          <div className="flex items-center justify-between mt-auto">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200">
              Try now for free
            </span>
            <ArrowRight 
              className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 group-hover:translate-x-1 transition-all duration-200" 
              aria-hidden="true" 
            />
          </div>

          {/* Related Tools */}
          {showRelated && tool.relatedTools && tool.relatedTools.length > 0 && (
            <RelatedTools 
              relatedToolIds={tool.relatedTools} 
              allTools={allTools} 
            />
          )}
        </div>
      </a>
    </article>
  );
};

// Usage Examples Component (for documentation)
export const ToolCardExamples: React.FC = () => {
  return (
    <div className="space-y-8 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            PDF Tools - 100% Free, No Email Required
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Professional PDF tools with unlimited usage. All files processed securely and deleted automatically.
          </p>
        </div>

        {/* 7-Tool Grid for Homepage */}
        <section aria-labelledby="tools-grid-heading">
          <h2 id="tools-grid-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Choose Your PDF Tool
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sampleTools.map((tool, index) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                allTools={sampleTools}
                showRelated={true}
                priority={index < 3} // First 3 tools get priority loading
              />
            ))}
          </div>
        </section>

        {/* Single Tool Example */}
        <section className="mt-12" aria-labelledby="single-tool-heading">
          <h2 id="single-tool-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Featured Tool Example
          </h2>
          
          <div className="max-w-md">
            <ToolCard
              tool={sampleTools[0]}
              allTools={sampleTools}
              showRelated={true}
              priority={true}
            />
          </div>
        </section>

        {/* Compact Grid Example */}
        <section className="mt-12" aria-labelledby="compact-grid-heading">
          <h2 id="compact-grid-heading" className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Compact Grid (No Related Tools)
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleTools.slice(0, 4).map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                showRelated={false}
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ToolCard;