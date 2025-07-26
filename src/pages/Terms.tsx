<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - PDfree.tools | Free PDF Tools Online</title>
    <meta name="description" content="Terms of Service for PDfree.tools - prohibited content policy, DMCA process, liability limitations, and service disclaimers for our free PDF tools.">
    <meta name="robots" content="index, follow">
    <meta name="author" content="PDfree.tools">
    <meta name="theme-color" content="#3B82F6" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#1E293B" media="(prefers-color-scheme: dark)">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Terms of Service - PDfree.tools">
    <meta property="og:description" content="Legal terms and conditions for using PDfree.tools free PDF processing services.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://pdffree.tools/terms">
    <meta property="og:image" content="https://pdffree.tools/assets/og/terms.png">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="https://pdffree.tools/assets/og/terms.png">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://pdffree.tools/terms">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        :root {
            /* Design system colors */
            --primary-blue: #3B82F6;
            --success-green: #10B981;
            --warning-orange: #F59E0B;
            --error-red: #EF4444;
            
            /* Neutral grays */
            --gray-50: #F8FAFC;
            --gray-100: #F1F5F9;
            --gray-200: #E2E8F0;
            --gray-300: #CBD5E1;
            --gray-600: #64748B;
            --gray-700: #334155;
            --gray-800: #1E293B;
            --gray-900: #0F172A;
            
            /* Dark mode colors */
            --dark-bg: #0F172A;
            --dark-surface: #1E293B;
            --dark-border: #334155;
            --dark-text: #F1F5F9;
            --dark-text-secondary: #94A3B8;
            
            /* Spacing system (8px base) */
            --space-1: 0.5rem;   /* 8px */
            --space-2: 1rem;     /* 16px */
            --space-3: 1.5rem;   /* 24px */
            --space-4: 2rem;     /* 32px */
            --space-6: 3rem;     /* 48px */
            --space-8: 4rem;     /* 64px */
            
            /* Typography */
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --font-size-sm: 0.875rem;
            --font-size-base: 1rem;
            --font-size-lg: 1.125rem;
            --font-size-xl: 1.25rem;
            --font-size-2xl: 1.5rem;
            --font-size-3xl: 1.875rem;
            --font-size-4xl: 2.25rem;
            
            /* Border radius */
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 12px;
            
            /* Shadows */
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
        
        /* Light mode (default) */
        :root {
            --bg-color: var(--gray-50);
            --surface-color: white;
            --border-color: var(--gray-200);
            --text-color: var(--gray-900);
            --text-secondary: var(--gray-600);
        }
        
        /* Dark mode */
        @media (prefers-color-scheme: dark) {
            :root {
                --bg-color: var(--dark-bg);
                --surface-color: var(--dark-surface);
                --border-color: var(--dark-border);
                --text-color: var(--dark-text);
                --text-secondary: var(--dark-text-secondary);
            }
        }
        
        /* Reset and base styles */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--font-family);
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--bg-color);
            min-height: 100vh;
            font-size: var(--font-size-base);
        }
        
        /* Focus outline styles for accessibility */
        *:focus {
            outline: 2px solid var(--primary-blue);
            outline-offset: 2px;
        }
        
        *:focus:not(:focus-visible) {
            outline: none;
        }
        
        /* Skip link for screen readers */
        .skip-link {
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-blue);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: var(--radius-sm);
            z-index: 1000;
        }
        
        .skip-link:focus {
            top: 6px;
        }
        
        /* Header */
        .header {
            background: var(--surface-color);
            border-bottom: 1px solid var(--border-color);
            padding: var(--space-2) 0;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(8px);
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--space-2);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .logo {
            font-size: var(--font-size-xl);
            font-weight: 700;
            color: var(--primary-blue);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: var(--space-1);
        }
        
        .logo:hover {
            color: #2563EB;
        }
        
        .nav-links {
            display: flex;
            gap: var(--space-4);
            align-items: center;
        }
        
        .nav-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        
        .nav-link:hover {
            color: var(--text-color);
        }
        
        /* Main content */
        .main {
            max-width: 800px;
            margin: 0 auto;
            padding: var(--space-6) var(--space-2);
            min-height: calc(100vh - 200px);
        }
        
        /* Page header */
        .page-header {
            text-align: center;
            margin-bottom: var(--space-6);
            padding-bottom: var(--space-4);
            border-bottom: 2px solid var(--border-color);
        }
        
        .page-title {
            font-size: var(--font-size-4xl);
            font-weight: 700;
            color: var(--text-color);
            margin-bottom: var(--space-2);
        }
        
        .page-subtitle {
            font-size: var(--font-size-lg);
            color: var(--text-secondary);
            margin-bottom: var(--space-3);
        }
        
        .last-updated {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            background: var(--gray-100);
            padding: var(--space-2);
            border-radius: var(--radius-md);
            text-align: center;
        }
        
        @media (prefers-color-scheme: dark) {
            .last-updated {
                background: var(--dark-surface);
            }
        }
        
        /* Content sections */
        .content-section {
            margin-bottom: var(--space-6);
        }
        
        .section-title {
            font-size: var(--font-size-2xl);
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: var(--space-3);
            padding-bottom: var(--space-1);
            border-bottom: 2px solid var(--primary-blue);
        }
        
        .subsection {
            margin-bottom: var(--space-4);
        }
        
        .subsection h3 {
            font-size: var(--font-size-xl);
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: var(--space-2);
        }
        
        .content-text {
            color: var(--text-color);
            margin-bottom: var(--space-2);
            line-height: 1.7;
        }
        
        .content-text strong {
            color: var(--text-color);
            font-weight: 600;
        }
        
        /* Lists */
        .terms-list {
            list-style: none;
            margin: var(--space-3) 0;
        }
        
        .terms-list li {
            margin-bottom: var(--space-2);
            padding-left: var(--space-3);
            position: relative;
            color: var(--text-color);
            line-height: 1.7;
        }
        
        .terms-list li::before {
            content: "•";
            color: var(--primary-blue);
            position: absolute;
            left: 0;
            font-weight: bold;
            font-size: var(--font-size-lg);
        }
        
        .numbered-list {
            list-style: decimal;
            margin: var(--space-3) 0;
            padding-left: var(--space-4);
        }
        
        .numbered-list li {
            margin-bottom: var(--space-2);
            color: var(--text-color);
            line-height: 1.7;
        }
        
        /* Highlight boxes */
        .highlight-box {
            background: linear-gradient(135deg, #EBF4FF 0%, #F0F9FF 100%);
            border: 1px solid #BFDBFE;
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            margin: var(--space-4) 0;
        }
        
        @media (prefers-color-scheme: dark) {
            .highlight-box {
                background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%);
                border-color: #3B82F6;
            }
        }
        
        .highlight-title {
            font-weight: 600;
            color: var(--primary-blue);
            margin-bottom: var(--space-2);
            display: flex;
            align-items: center;
            gap: var(--space-1);
        }
        
        @media (prefers-color-scheme: dark) {
            .highlight-title {
                color: #93C5FD;
            }
        }
        
        .warning-box {
            background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
            border: 1px solid #F59E0B;
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            margin: var(--space-4) 0;
        }
        
        @media (prefers-color-scheme: dark) {
            .warning-box {
                background: linear-gradient(135deg, #92400E 0%, #B45309 100%);
                border-color: #F59E0B;
            }
        }
        
        .warning-title {
            font-weight: 600;
            color: #92400E;
            margin-bottom: var(--space-2);
            display: flex;
            align-items: center;
            gap: var(--space-1);
        }
        
        @media (prefers-color-scheme: dark) {
            .warning-title {
                color: #FCD34D;
            }
        }
        
        /* Links */
        .content-link {
            color: var(--primary-blue);
            text-decoration: underline;
            text-underline-offset: 2px;
        }
        
        .content-link:hover {
            color: #2563EB;
            text-decoration-thickness: 2px;
        }
        
        .contact-email {
            color: var(--primary-blue);
            text-decoration: none;
            font-weight: 600;
            font-size: var(--font-size-lg);
            border: 2px solid var(--primary-blue);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-md);
            display: inline-block;
            transition: all 0.2s ease;
        }
        
        .contact-email:hover {
            background: var(--primary-blue);
            color: white;
        }
        
        /* Footer */
        .footer {
            background: var(--surface-color);
            border-top: 1px solid var(--border-color);
            padding: var(--space-4) 0;
            margin-top: var(--space-8);
            text-align: center;
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: var(--space-4);
            margin-bottom: var(--space-3);
            flex-wrap: wrap;
        }
        
        .footer-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        
        .footer-link:hover {
            color: var(--primary-blue);
        }
        
        .footer p {
            color: var(--text-secondary);
            font-size: var(--font-size-sm);
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .nav-links {
                gap: var(--space-2);
            }
            
            .page-title {
                font-size: var(--font-size-3xl);
            }
            
            .section-title {
                font-size: var(--font-size-xl);
            }
            
            .main {
                padding: var(--space-4) var(--space-2);
            }
            
            .footer-links {
                gap: var(--space-2);
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
        
        /* Print styles */
        @media print {
            .header, .footer {
                display: none;
            }
            
            .main {
                max-width: none;
                padding: 0;
            }
            
            .highlight-box, .warning-box {
                border: 2px solid #000;
                background: none;
            }
        }
    </style>
</head>

<body>
    <a href="#main" class="skip-link">Skip to main content</a>
    
    <header class="header">
        <div class="header-content">
            <a href="/" class="logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    <path d="M14 2v6h6"/>
                    <path d="M16 13H8"/>
                    <path d="M16 17H8"/>
                    <path d="M10 9H8"/>
                </svg>
                PDfree.tools
            </a>
            <nav class="nav-links" aria-label="Main navigation">
                <a href="/" class="nav-link">Home</a>
                <a href="/tools" class="nav-link">Tools</a>
                <a href="/privacy" class="nav-link">Privacy</a>
                <a href="/terms" class="nav-link" aria-current="page">Terms</a>
                <a href="/contact" class="nav-link">Contact</a>
            </nav>
        </div>
    </header>

    <main id="main" class="main">
        <div class="page-header">
            <h1 class="page-title">Terms of Service</h1>
            <p class="page-subtitle">Legal terms and conditions for using PDfree.tools</p>
            <div class="last-updated">
                <p><strong>Last Updated:</strong> July 25, 2025</p>
                <p><strong>Effective Date:</strong> July 25, 2025</p>
            </div>
        </div>

        <section class="content-section">
            <h2 class="section-title">1. Service Operator & Acceptance of Terms</h2>
            
            <div class="subsection">
                <h3>Service Operator</h3>
                <p class="content-text">PDfree.tools is operated as an independent web service. For legal inquiries and service-related matters, please contact us at <a href="mailto:legal@pdffree.tools" class="content-link">legal@pdffree.tools</a>.</p>
            </div>
            
            <div class="subsection">
                <h3>Acceptance of Terms</h3>
                <p class="content-text">By accessing or using PDfree.tools ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.</p>
                
                <p class="content-text"><strong>Key Points:</strong></p>
                <ul class="terms-list">
                    <li>These Terms apply to all users of PDfree.tools</li>
                    <li>By uploading files, you accept these Terms</li>
                    <li>We may update these Terms with notice</li>
                    <li>Continued use after updates constitutes acceptance</li>
                </ul>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">2. Description of Service</h2>
            
            <div class="subsection">
                <p class="content-text">PDfree.tools provides free, web-based PDF processing tools including but not limited to:</p>
                <ul class="terms-list">
                    <li><strong>PDF Merging:</strong> Combine multiple PDF files into one</li>
                    <li><strong>PDF Splitting:</strong> Extract pages or divide PDFs</li>
                    <li><strong>PDF Rotation:</strong> Rotate pages in any direction</li>
                    <li><strong>PDF Compression:</strong> Reduce file size while maintaining quality</li>
                    <li><strong>Format Conversion:</strong> Convert between PDF and image formats</li>
                    <li><strong>PDF Protection:</strong> Add password protection to documents</li>
                    <li><strong>Additional Tools:</strong> Various other PDF manipulation features</li>
                </ul>
            </div>

            <div class="highlight-box">
                <div class="highlight-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.181 10.5a.75.75 0 00-1.06 1.061l1.5 1.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
                    </svg>
                    Service Promise
                </div>
                <p><strong>Our Commitment:</strong> Free, unlimited use with no email registration required. Files are automatically deleted after 1 hour for your privacy and security.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">3. Prohibited Content Policy</h2>
            
            <div class="subsection">
                <h3>Strictly Prohibited Content</h3>
                <p class="content-text">You may NOT upload, process, or distribute content that:</p>
                <ol class="numbered-list">
                    <li><strong>Contains malware, viruses, or malicious code</strong> that could harm our systems or other users</li>
                    <li><strong>Violates copyright, trademark, or other intellectual property rights</strong> without proper authorization</li>
                    <li><strong>Contains child sexual abuse material (CSAM)</strong> or any content exploiting minors</li>
                    <li><strong>Promotes or incites violence, terrorism, or hate speech</strong> against individuals or groups</li>
                    <li><strong>Contains personal information of others</strong> without their consent (doxxing)</li>
                    <li><strong>Violates privacy laws</strong> including GDPR, CCPA, or other data protection regulations</li>
                    <li><strong>Contains illegal content</strong> under US law or the laws of your jurisdiction</li>
                    <li><strong>Infringes on others' rights</strong> including publicity, privacy, or moral rights</li>
                    <li><strong>Contains spam, phishing attempts,</strong> or fraudulent content</li>
                    <li><strong>Violates any applicable laws or regulations</strong></li>
                </ol>
            </div>

            <div class="subsection">
                <h3>Content Guidelines</h3>
                <p class="content-text">When using our service, you must:</p>
                <ul class="terms-list">
                    <li>Only upload content you own or have permission to process</li>
                    <li>Respect intellectual property rights of others</li>
                    <li>Ensure compliance with applicable privacy laws</li>
                    <li>Use the service for legitimate, lawful purposes only</li>
                    <li>Not attempt to circumvent our security measures</li>
                </ul>
            </div>

            <div class="warning-box">
                <div class="warning-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                    </svg>
                    Important Notice
                </div>
                <p><strong>Violations of this policy may result in immediate termination of service access and potential legal action.</strong> We cooperate with law enforcement when required by law.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">4. DMCA Copyright Policy</h2>
            
            <div class="subsection">
                <h3>Copyright Compliance</h3>
                <p class="content-text">PDfree.tools respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA). We will respond to valid DMCA takedown notices.</p>
            </div>

            <div class="subsection">
                <h3>Filing a DMCA Notice</h3>
                <p class="content-text">If you believe your copyrighted work has been processed through our service without authorization, please send a DMCA notice containing:</p>
                <ol class="numbered-list">
                    <li><strong>Your contact information:</strong> Name, address, phone number, and email</li>
                    <li><strong>Description of copyrighted work:</strong> Identify the work you claim has been infringed</li>
                    <li><strong>Location of infringing material:</strong> URL or specific location where the content was processed</li>
                    <li><strong>Good faith statement:</strong> That you believe the use is not authorized by the copyright owner</li>
                    <li><strong>Accuracy statement:</strong> That the information is accurate and you are authorized to act</li>
                    <li><strong>Physical or electronic signature:</strong> Of the copyright owner or authorized agent</li>
                </ol>
            </div>

            <div class="subsection">
                <h3>DMCA Agent Contact</h3>
                <p class="content-text">Send DMCA notices to our designated agent:</p>
                <p style="margin: var(--space-3) 0;">
                    <strong>Email:</strong> <a href="mailto:dmca@pdffree.tools" class="content-link">dmca@pdffree.tools</a><br>
                    <strong>Response Time:</strong> We will respond within 24-48 hours
                </p>
            </div>

            <div class="subsection">
                <h3>Counter-Notifications</h3>
                <p class="content-text">If you believe content was removed in error, you may file a counter-notification. Please note that filing a false counter-notification may result in legal liability.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">5. Service Availability & Uptime Disclaimers</h2>
            
            <div class="subsection">
                <h3>Service Availability</h3>
                <p class="content-text">While we strive to provide reliable service, PDfree.tools is provided "as is" without uptime guarantees:</p>
                <ul class="terms-list">
                    <li><strong>No uptime guarantees:</strong> We do not guarantee 100% availability</li>
                    <li><strong>Maintenance windows:</strong> Scheduled maintenance may cause temporary outages</li>
                    <li><strong>Technical issues:</strong> Unexpected downtime may occur due to technical problems</li>
                    <li><strong>Third-party dependencies:</strong> Our service relies on cloud infrastructure that may experience outages</li>
                    <li><strong>Best effort basis:</strong> We will make reasonable efforts to maintain service availability</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Service Modifications</h3>
                <p class="content-text">We reserve the right to:</p>
                <ul class="terms-list">
                    <li>Modify, suspend, or discontinue any part of the service</li>
                    <li>Implement usage limits or restrictions</li>
                    <li>Change features or functionality with or without notice</li>
                    <li>Perform maintenance that may temporarily interrupt service</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Data Loss Disclaimer</h3>
                <p class="content-text"><strong>Important:</strong> While we automatically delete files after 1 hour for privacy, technical issues may result in earlier or unexpected data loss. Always keep backups of important files.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">6. Liability Limitations</h2>
            
            <div class="subsection">
                <h3>Disclaimer of Warranties</h3>
                <p class="content-text">PDfree.tools is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied, including but not limited to:</p>
                <ul class="terms-list">
                    <li>Merchantability, fitness for a particular purpose, or non-infringement</li>
                    <li>Accuracy, reliability, or completeness of the service</li>
                    <li>Uninterrupted or error-free operation</li>
                    <li>Security or freedom from harmful components</li>
                    <li>Compliance with your specific requirements</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Limitation of Liability</h3>
                <p class="content-text">To the maximum extent permitted by law, PDfree.tools and its operators shall not be liable for:</p>
                <ol class="numbered-list">
                    <li><strong>Indirect, incidental, special, consequential, or punitive damages</strong></li>
                    <li><strong>Loss of profits, data, use, goodwill, or other intangible losses</strong></li>
                    <li><strong>Damages resulting from unauthorized access to or use of our servers</strong></li>
                    <li><strong>Interruption or cessation of transmission to or from the service</strong></li>
                    <li><strong>Bugs, viruses, trojan horses, or similar harmful components</strong></li>
                    <li><strong>Errors or omissions in content or loss/damage from use of posted content</strong></li>
                </ol>
            </div>

            <div class="subsection">
                <h3>Maximum Liability</h3>
                <p class="content-text">In jurisdictions that do not allow the exclusion of certain warranties or limitations of liability, our liability shall be limited to the maximum extent permitted by law. <strong>Since our service is provided free of charge, our total liability to you for any damages shall not exceed $0 USD.</strong></p>
            </div>

            <div class="warning-box">
                <div class="warning-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                    </svg>
                    User Responsibility
                </div>
                <p><strong>You use PDfree.tools at your own risk.</strong> Always maintain backups of important documents and verify processed files meet your requirements before using them for critical purposes.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">7. User Responsibilities</h2>
            
            <div class="subsection">
                <h3>Acceptable Use</h3>
                <p class="content-text">As a user of PDfree.tools, you are responsible for:</p>
                <ul class="terms-list">
                    <li><strong>Legal compliance:</strong> Ensuring your use complies with all applicable laws</li>
                    <li><strong>Content ownership:</strong> Only uploading files you own or have permission to process</li>
                    <li><strong>Data security:</strong> Protecting sensitive information in your files</li>
                    <li><strong>Respectful usage:</strong> Not abusing or overloading our systems</li>
                    <li><strong>Accurate information:</strong> Providing truthful information when contacting us</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Prohibited Activities</h3>
                <p class="content-text">You may not:</p>
                <ol class="numbered-list">
                    <li>Attempt to gain unauthorized access to our systems or other users' files</li>
                    <li>Use automated tools to abuse our service (excessive API calls, scraping)</li>
                    <li>Reverse engineer, decompile, or disassemble our software</li>
                    <li>Remove or modify any proprietary notices or labels</li>
                    <li>Use the service for any illegal or unauthorized purpose</li>
                    <li>Interfere with or disrupt the service or servers</li>
                    <li>Upload content that violates our Prohibited Content Policy</li>
                </ol>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">8. Privacy & Data Handling</h2>
            
            <div class="subsection">
                <h3>Privacy Policy Integration</h3>
                <p class="content-text">Your privacy is important to us. Our data handling practices are detailed in our <a href="/privacy" class="content-link">Privacy Policy</a>, which is incorporated into these Terms by reference.</p>
            </div>

            <div class="subsection">
                <h3>Key Privacy Points</h3>
                <ul class="terms-list">
                    <li><strong>No account required:</strong> We don't collect personal information for basic usage</li>
                    <li><strong>Automatic deletion:</strong> Files are deleted after 1 hour</li>
                    <li><strong>No content analysis:</strong> We don't read or analyze your file contents</li>
                    <li><strong>Minimal data collection:</strong> Only technical data necessary for service operation</li>
                    <li><strong>No data sales:</strong> We never sell user data to third parties</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>File Security</h3>
                <p class="content-text">While we implement security measures to protect your files during processing, <strong>you should not upload highly sensitive or confidential information</strong> that could cause harm if accessed by unauthorized parties.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">9. Intellectual Property</h2>
            
            <div class="subsection">
                <h3>Your Content</h3>
                <p class="content-text">You retain all rights to files you upload to PDfree.tools. By using our service, you grant us a limited, temporary license to:</p>
                <ul class="terms-list">
                    <li>Process your files to provide the requested service</li>
                    <li>Store files temporarily during processing (maximum 1 hour)</li>
                    <li>Use necessary technical means to deliver processed files to you</li>
                </ul>
                <p class="content-text">This license expires when your files are automatically deleted after 1 hour.</p>
            </div>

            <div class="subsection">
                <h3>Our Service</h3>
                <p class="content-text">PDfree.tools, including its design, functionality, and underlying technology, is protected by intellectual property laws. You may not:</p>
                <ul class="terms-list">
                    <li>Copy, modify, or create derivative works of our service</li>
                    <li>Use our branding, logos, or trademarks without permission</li>
                    <li>Attempt to recreate our service functionality</li>
                    <li>Remove or obscure any proprietary notices</li>
                </ul>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">10. Termination</h2>
            
            <div class="subsection">
                <h3>Termination by You</h3>
                <p class="content-text">You may stop using PDfree.tools at any time. Since no account is required, simply discontinuing use constitutes termination.</p>
            </div>

            <div class="subsection">
                <h3>Termination by Us</h3>
                <p class="content-text">We may restrict or terminate your access to PDfree.tools if:</p>
                <ul class="terms-list">
                    <li>You violate these Terms of Service</li>
                    <li>You upload prohibited content</li>
                    <li>You abuse our systems or attempt unauthorized access</li>
                    <li>Required by law or legal process</li>
                    <li>Necessary to protect our rights or the rights of others</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>Effect of Termination</h3>
                <p class="content-text">Upon termination:</p>
                <ul class="terms-list">
                    <li>Your right to access the service immediately ceases</li>
                    <li>Any files in our system continue to be deleted per our 1-hour policy</li>
                    <li>Provisions regarding liability, indemnification, and dispute resolution survive</li>
                </ul>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">11. Indemnification</h2>
            
            <div class="subsection">
                <p class="content-text">You agree to indemnify, defend, and hold harmless PDfree.tools, its operators, and affiliates from any claims, damages, losses, or expenses (including reasonable attorney fees) arising from:</p>
                <ol class="numbered-list">
                    <li>Your use of the service in violation of these Terms</li>
                    <li>Your upload of content that infringes third-party rights</li>
                    <li>Your violation of any laws or regulations</li>
                    <li>Your negligent or wrongful conduct</li>
                    <li>Any false or misleading information you provide</li>
                </ol>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">12. Dispute Resolution</h2>
            
            <div class="subsection">
                <h3>Governing Law</h3>
                <p class="content-text">These Terms are governed by the laws of the United States and the State of California, without regard to conflict of law principles.</p>
            </div>

            <div class="subsection">
                <h3>Dispute Resolution Process</h3>
                <p class="content-text">Before filing any legal action, you agree to:</p>
                <ol class="numbered-list">
                    <li>Contact us at <a href="mailto:legal@pdffree.tools" class="content-link">legal@pdffree.tools</a> to discuss the issue</li>
                    <li>Allow 30 days for good faith negotiation to resolve the dispute</li>
                    <li>Consider mediation before pursuing litigation</li>
                </ol>
            </div>

            <div class="subsection">
                <h3>Jurisdiction</h3>
                <p class="content-text">Any legal action relating to these Terms must be filed in the state or federal courts located in California, and you consent to the jurisdiction of such courts.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">13. Additional Provisions</h2>
            
            <div class="subsection">
                <h3>Entire Agreement</h3>
                <p class="content-text">These Terms, together with our Privacy Policy, constitute the entire agreement between you and PDfree.tools regarding your use of the service.</p>
            </div>

            <div class="subsection">
                <h3>Severability</h3>
                <p class="content-text">If any provision of these Terms is found unenforceable, the remaining provisions will continue in full force and effect.</p>
            </div>

            <div class="subsection">
                <h3>No Waiver</h3>
                <p class="content-text">Our failure to enforce any provision of these Terms does not constitute a waiver of our right to enforce it later.</p>
            </div>

            <div class="subsection">
                <h3>Assignment</h3>
                <p class="content-text">You may not assign your rights under these Terms. We may assign our rights and obligations to any party without notice.</p>
            </div>

            <div class="subsection">
                <h3>Force Majeure</h3>
                <p class="content-text">We are not liable for any failure to perform due to circumstances beyond our reasonable control, including natural disasters, war, terrorism, or government actions.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">14. Changes to Terms</h2>
            
            <div class="subsection">
                <p class="content-text">We may update these Terms to reflect changes in our service, legal requirements, or business practices. When we make changes:</p>
                <ul class="terms-list">
                    <li>We'll update the "Last Updated" date at the top of this page</li>
                    <li>Significant changes will be announced on our homepage</li>
                    <li>We'll maintain an archive of previous versions</li>
                    <li>Your continued use constitutes acceptance of the updated Terms</li>
                </ul>
                
                <p class="content-text">If you disagree with any changes, please discontinue using the service.</p>
            </div>
        </section>

        <section class="content-section">
            <h2 class="section-title">15. Contact Information</h2>
            
            <div class="subsection">
                <h3>Legal & Compliance Inquiries</h3>
                <p class="content-text">For questions about these Terms, legal matters, or compliance issues:</p>
                
                <div style="margin: var(--space-4) 0;">
                    <p><strong>General Legal:</strong> <a href="mailto:legal@pdffree.tools" class="contact-email">legal@pdffree.tools</a></p>
                    <p><strong>DMCA Claims:</strong> <a href="mailto:dmca@pdffree.tools" class="contact-email">dmca@pdffree.tools</a></p>
                    <p><strong>Privacy Issues:</strong> <a href="mailto:privacy@pdffree.tools" class="contact-email">privacy@pdffree.tools</a></p>
                </div>
                
                <p class="content-text">
                    <strong>Response Time:</strong> We typically respond to legal inquiries within 24-48 hours<br>
                    <strong>Business Hours:</strong> Monday-Friday, 9 AM - 5 PM PST
                </p>
            </div>
        </section>

        <div class="highlight-box" style="margin-top: var(--space-6);">
            <div class="highlight-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"/>
                </svg>
                Thank You for Using PDfree.tools
            </div>
            <p>These Terms help us provide a safe, reliable, and free service for everyone. By following these guidelines, you help us maintain a platform that respects user privacy and enables productive PDF processing for millions of users worldwide.</p>
        </div>
    </main>

    <footer class="footer">
        <div class="footer-links">
            <a href="/" class="footer-link">Home</a>
            <a href="/tools" class="footer-link">All Tools</a>
            <a href="/about" class="footer-link">About</a>
            <a href="/privacy" class="footer-link">Privacy Policy</a>
            <a href="/terms" class="footer-link" aria-current="page">Terms of Service</a>
            <a href="/contact" class="footer-link">Contact</a>
        </div>
        <p>&copy; 2025 PDfree.tools. Built with privacy in mind.</p>
    </footer>
</body>
</html>