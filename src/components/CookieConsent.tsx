import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, BarChart3, Settings, Info, Check } from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  preferences: boolean;
}

interface CookieConsentProps {
  onConsentChange?: (preferences: CookiePreferences) => void;
  showOnlyIfNeeded?: boolean;
  retentionDays?: number;
}

// Simple focus trap utility
const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus when dialog closes
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  return containerRef;
};

const CookieConsent: React.FC<CookieConsentProps> = ({ 
  onConsentChange, 
  showOnlyIfNeeded = true,
  retentionDays = 30
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: false,
    preferences: false
  });

  const dialogRef = useFocusTrap(isVisible);

  // Schema validation for stored preferences
  const isValidPreferences = (obj: any): obj is CookiePreferences => {
    return obj && 
           typeof obj === 'object' &&
           typeof obj.essential === 'boolean' &&
           typeof obj.analytics === 'boolean' &&
           typeof obj.preferences === 'boolean';
  };

  // Check if user needs to see consent dialog
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie-consent');
    const consentTimestamp = localStorage.getItem('cookie-consent-timestamp');
    
    let needsConsent = false;

    if (savedConsent && consentTimestamp) {
      try {
        const consentDate = new Date(parseInt(consentTimestamp, 10));
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - retentionDays);
        
        // Check if consent has expired
        if (consentDate < expiryDate) {
          needsConsent = true;
        } else {
          // Try to parse and validate saved preferences
          const savedPrefs = JSON.parse(savedConsent);
          if (isValidPreferences(savedPrefs)) {
            setPreferences(savedPrefs);
            onConsentChange?.(savedPrefs);
          } else {
            needsConsent = true;
          }
        }
      } catch {
        // Invalid timestamp or JSON - need new consent
        needsConsent = true;
      }
    } else {
      // No previous consent found
      needsConsent = true;
    }

    setIsVisible(showOnlyIfNeeded ? needsConsent : true);
  }, [showOnlyIfNeeded, onConsentChange, retentionDays]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isVisible) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isVisible]);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    localStorage.setItem('cookie-consent-timestamp', Date.now().toString());
    setPreferences(prefs);
    onConsentChange?.(prefs);
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      preferences: true
    };
    saveConsent(allAccepted);
  };

  const handleAcceptEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      preferences: false
    };
    saveConsent(essentialOnly);
  };

  const handleCustomSave = () => {
    saveConsent(preferences);
  };

  const togglePreference = (key: Exclude<keyof CookiePreferences, 'essential'>) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Note: We don't close on Escape to ensure users make a choice
      // This is for GDPR compliance - users should explicitly consent
      e.preventDefault();
    }
  };

  const handleClose = () => {
    // Save essential-only preferences when closing without explicit choice
    // This ensures compliance while respecting user's desire to dismiss
    handleAcceptEssential();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/20">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-notice-title"
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b border-blue-100 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" aria-hidden="true" />
              <div>
                <h3 id="cookie-notice-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Privacy-First Cookie Notice
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  We use minimal cookies to improve your experience
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              aria-label="Accept essential cookies and close"
              title="Closes dialog and accepts essential cookies only"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showDetails ? (
            // Simple view
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                PDfree.tools uses only essential cookies for security and functionality. 
                We also offer optional privacy-friendly analytics (no personal data collected) 
                to help us improve our tools.
              </p>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                      What makes us different:
                    </p>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• No advertising trackers or third-party cookies</li>
                      <li>• No personal data collection</li>
                      <li>• No email required</li>
                      <li>• All analytics are aggregated and anonymous</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Accept All
                </button>
                <button
                  onClick={handleAcceptEssential}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className="sm:w-auto bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium py-3 px-6 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </button>
              </div>
            </div>
          ) : (
            // Detailed view
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Essential Cookies
                        </h4>
                        <span className="ml-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded">
                          Required
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Necessary for security, preventing abuse, and remembering your preferences during your session. 
                        These cannot be disabled.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Examples: Security tokens, rate limiting, session preferences
                      </p>
                    </div>
                    <div className="ml-4">
                      <div 
                        className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-center"
                        role="switch"
                        aria-checked="true"
                        aria-label="Essential cookies (always enabled)"
                      >
                        <div className="w-4 h-4 bg-white rounded-full translate-x-3"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Privacy-Friendly Analytics
                        </h4>
                        <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                          Optional
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Cookieless analytics to understand which tools are most helpful. 
                        No personal data collected, no cross-site tracking.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Provider: Plausible Analytics (GDPR compliant, no cookies)
                      </p>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => togglePreference('analytics')}
                        className={`w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          preferences.analytics 
                            ? 'bg-blue-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={preferences.analytics}
                        aria-label={`${preferences.analytics ? 'Disable' : 'Enable'} privacy-friendly analytics`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.analytics ? 'translate-x-7' : 'translate-x-1'
                        }`}></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Preference Settings
                        </h4>
                        <span className="ml-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium px-2 py-1 rounded">
                          Optional
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Remember your settings like dark mode preference and default tool options 
                        across visits.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Examples: Theme preference, default quality settings
                      </p>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => togglePreference('preferences')}
                        className={`w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                          preferences.preferences 
                            ? 'bg-purple-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={preferences.preferences}
                        aria-label={`${preferences.preferences ? 'Disable' : 'Enable'} preference storage`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.preferences ? 'translate-x-7' : 'translate-x-1'
                        }`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">
                      <strong>We never use:</strong> Advertising trackers, social media pixels, 
                      cross-site tracking, or behavioral profiling systems.
                    </p>
                    <p>
                      You can change these preferences anytime. This notice will reappear in {retentionDays} days. 
                      Read our full{' '}
                      <a 
                        href="/privacy" 
                        className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:underline"
                      >
                        Privacy Policy
                      </a>{' '}
                      for more details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCustomSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save Preferences
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="sm:w-auto bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Back to Simple View
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Closing this dialog will save essential cookies only. 
            This notice reappears every {retentionDays} days for compliance.
          </p>
        </div>
      </div>
    </div>
  );
};

// Hook for using cookie preferences in other components
export const useCookiePreferences = () => {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    preferences: false
  });

  const isValidPreferences = (obj: any): obj is CookiePreferences => {
    return obj && 
           typeof obj === 'object' &&
           typeof obj.essential === 'boolean' &&
           typeof obj.analytics === 'boolean' &&
           typeof obj.preferences === 'boolean';
  };

  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie-consent');
    if (savedConsent) {
      try {
        const prefs = JSON.parse(savedConsent);
        if (isValidPreferences(prefs)) {
          setPreferences(prefs);
        }
      } catch {
        // Invalid stored preferences, use defaults
      }
    }
  }, []);

  const updatePreferences = (newPrefs: CookiePreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem('cookie-consent', JSON.stringify(newPrefs));
    localStorage.setItem('cookie-consent-timestamp', Date.now().toString());
  };

  return { preferences, updatePreferences };
};

// Settings button for footer or corner placement
export const CookieSettingsButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
      aria-label="Cookie settings"
    >
      <Settings className="h-4 w-4 mr-1" />
      Cookie Settings
    </button>
  );
};

// Context provider for app-wide cookie consent management
export const CookieConsentProvider: React.FC<{ 
  children: React.ReactNode;
  retentionDays?: number;
}> = ({ children, retentionDays = 30 }) => {
  const [showConsent, setShowConsent] = useState(false);
  const { preferences, updatePreferences } = useCookiePreferences();

  const handleConsentChange = (prefs: CookiePreferences) => {
    updatePreferences(prefs);
    // Here you can trigger analytics initialization, etc.
    if (prefs.analytics && window.plausible) {
      // Initialize Plausible if analytics are enabled
      console.log('Analytics enabled');
    }
  };

  const openCookieSettings = () => {
    setShowConsent(true);
  };

  return (
    <>
      {children}
      {showConsent && (
        <CookieConsent 
          onConsentChange={handleConsentChange}
          showOnlyIfNeeded={false}
          retentionDays={retentionDays}
        />
      )}
      <CookieSettingsButton onClick={openCookieSettings} />
    </>
  );
};

// Demo component for testing
const CookieConsentDemo: React.FC = () => {
  const [currentPreferences, setCurrentPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    preferences: false
  });

  const handleConsentChange = (prefs: CookiePreferences) => {
    setCurrentPreferences(prefs);
    console.log('Cookie preferences updated:', prefs);
  };

  const resetConsent = () => {
    localStorage.removeItem('cookie-consent');
    localStorage.removeItem('cookie-consent-timestamp');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Cookie Consent Management Demo
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Preferences
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Essential Cookies:</span>
              <span className={`font-medium ${currentPreferences.essential ? 'text-green-600' : 'text-red-600'}`}>
                {currentPreferences.essential ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Analytics:</span>
              <span className={`font-medium ${currentPreferences.analytics ? 'text-green-600' : 'text-red-600'}`}>
                {currentPreferences.analytics ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Preferences:</span>
              <span className={`font-medium ${currentPreferences.preferences ? 'text-green-600' : 'text-red-600'}`}>
                {currentPreferences.preferences ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={resetConsent}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Reset Consent (Reload to See Dialog)
          </button>
        </div>

        <CookieConsentProvider>
          <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              The cookie settings button will appear in your app footer or wherever you place it.
            </p>
          </div>
        </CookieConsentProvider>
      </div>
    </div>
  );
};

export default CookieConsentDemo;