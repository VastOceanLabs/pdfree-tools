import React, { useState, useCallback, useRef } from 'react';
import { 
  Lock, 
  Shield, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  EyeOff,
  FileText,
  Clock,
  Zap,
  Key,
  AlertTriangle,
  Smartphone,
  Monitor,
  Globe,
  Users,
  Star
} from 'lucide-react';

// Types
type EncryptionLevel = 'standard' | 'aes128' | 'aes256';

type Permissions = {
  printing: boolean;
  modifying: boolean;
  copying: boolean;
  annotating: boolean;
  fillingForms: boolean;
  contentAccessibility: boolean;
};

type PermissionKey = keyof Permissions;

interface ProtectionOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: Permissions & {
    documentAssembly?: boolean;
    degradedPrinting?: boolean;
  };
  encryptionLevel?: EncryptionLevel;
}

interface ProtectionResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  encryptionLevel?: string;
  requiresServer?: boolean;
  processingTime?: number;
}

// Constants
const ENCRYPTION_LABELS: Record<EncryptionLevel, string> = {
  aes256: 'AES-256',
  aes128: 'AES-128',
  standard: 'Standard (40-bit)',
};

const PERMISSION_OPTIONS: Array<{ key: PermissionKey; label: string; description: string }> = [
  { key: 'printing', label: 'Allow Printing', description: 'Users can print the document' },
  { key: 'modifying', label: 'Allow Modifications', description: 'Users can edit content' },
  { key: 'copying', label: 'Allow Copying Text', description: 'Users can copy text and images' },
  { key: 'annotating', label: 'Allow Comments', description: 'Users can add annotations' },
  { key: 'fillingForms', label: 'Allow Form Filling', description: 'Users can fill interactive forms' },
  { key: 'contentAccessibility', label: 'Screen Reader Access', description: 'Enable for accessibility (recommended)' }
];

const encryptionOptions: Array<{
  value: EncryptionLevel;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { value: 'aes256', label: 'AES-256', description: 'Highest security (recommended)', icon: Shield },
  { value: 'aes128', label: 'AES-128', description: 'Strong security, faster processing', icon: Zap },
  { value: 'standard', label: 'Standard', description: 'Basic protection, maximum compatibility', icon: Key }
];

// Password strength checker
const checkPasswordStrength = (password: string) => {
  let score = 0;
  let feedback = [];
  
  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Lowercase letter');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Uppercase letter');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Number');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Special character');
  
  const strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : score <= 4 ? 'strong' : 'very-strong';
  
  return { score, strength, feedback };
};

export default function ProtectPdf() {
  // State management
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProtectionResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>('aes256');
  const [permissions, setPermissions] = useState<Permissions>({
    printing: true,
    modifying: false,
    copying: false,
    annotating: true,
    fillingForms: true,
    contentAccessibility: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password strength
  const passwordStrength = checkPasswordStrength(password);
  const passwordMatch = password === confirmPassword && confirmPassword.length > 0;
  
  // File upload handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      setFile(pdfFile);
      setResult(null);
    }
  }, []);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResult(null);
    }
  }, []);
  
  // Process PDF protection
  const protectPdf = async () => {
    if (!file) {
      setResult({ success: false, error: 'Please select a PDF file' });
      return;
    }
    
    if (!password) {
      setResult({ success: false, error: 'Please enter a password' });
      return;
    }
    
    if (password !== confirmPassword) {
      setResult({ success: false, error: 'Passwords do not match' });
      return;
    }
    
    setProcessing(true);
    setResult(null);
    
    try {
      // Mock processing - in real implementation, this would use the protectPdf utility
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({
        success: true,
        data: new Uint8Array(), // Mock data
        encryptionLevel: ENCRYPTION_LABELS[encryptionLevel],
        processingTime: 1.8
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Protection failed'
      });
    } finally {
      setProcessing(false);
    }
  };
  
  // Download protected PDF
  const downloadProtected = () => {
    if (!result?.success || !result.data || typeof window === 'undefined') return;
    
    const blob = new Blob([result.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file ? `protected_${file.name}` : 'protected.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Reset state
  const reset = () => {
    setFile(null);
    setResult(null);
    setPassword('');
    setConfirmPassword('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* SEO Schema and Meta would be handled by parent component */}
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Password Protect PDF Free
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Add password protection to your PDF files securely
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  100% Free
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  No Email Required
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li><a href="/" className="text-blue-600 hover:text-blue-700">Home</a></li>
            <li className="text-slate-400">/</li>
            <li className="text-slate-600 dark:text-slate-400">Protect PDF</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Zone */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                1. Select PDF File
              </h2>
              
              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    Drop your PDF file here
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    or click to browse files
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Choose File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Select PDF file"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                    Maximum file size: 100MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Password Settings */}
            {file && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  2. Set Password Protection
                </h2>
                
                <div className="space-y-4">
                  {/* Password Input */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      User Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                        placeholder="Enter secure password"
                        aria-describedby="password-strength password-help"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div id="password-strength" className="mt-2" aria-live="polite">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex space-x-1 flex-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`h-2 flex-1 rounded ${
                                  level <= passwordStrength.score
                                    ? passwordStrength.strength === 'weak'
                                      ? 'bg-red-400'
                                      : passwordStrength.strength === 'medium'
                                      ? 'bg-yellow-400'
                                      : passwordStrength.strength === 'strong'
                                      ? 'bg-blue-400'
                                      : 'bg-green-400'
                                    : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-medium ${
                            passwordStrength.strength === 'weak'
                              ? 'text-red-600 dark:text-red-400'
                              : passwordStrength.strength === 'medium'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : passwordStrength.strength === 'strong'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {passwordStrength.strength === 'very-strong' ? 'Very Strong' : 
                             passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                          </span>
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Missing: {passwordStrength.feedback.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                    <p id="password-help" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      This password will be required to open the PDF
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white ${
                        confirmPassword && !passwordMatch
                          ? 'border-red-300 dark:border-red-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                      placeholder="Confirm your password"
                    />
                    {confirmPassword && !passwordMatch && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Passwords do not match</span>
                      </p>
                    )}
                  </div>

                  {/* Encryption Level */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Encryption Level
                    </label>
                    <div className="space-y-3">
                      {encryptionOptions.map((option) => (
                        <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="encryption"
                            value={option.value}
                            checked={encryptionLevel === option.value}
                            onChange={(e) => setEncryptionLevel(e.target.value as EncryptionLevel)}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <option.icon className="w-4 h-4 text-slate-500" />
                              <span className="font-medium text-slate-900 dark:text-white">{option.label}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {option.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Permissions */}
            {file && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  3. Advanced Permissions (Optional)
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PERMISSION_OPTIONS.map((permission) => (
                    <label key={permission.key} className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <input
                        type="checkbox"
                        checked={permissions[permission.key]}
                        onChange={(e) => setPermissions(prev => ({
                          ...prev,
                          [permission.key]: e.target.checked
                        }))}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {permission.label}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Process Button */}
            {file && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <button
                  onClick={protectPdf}
                  disabled={!password || !passwordMatch || processing}
                  className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Protecting PDF...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Protect PDF</span>
                    </>
                  )}
                </button>
                
                {(!password || !passwordMatch) && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                    {!password ? 'Please enter a password to continue' : 'Passwords must match to continue'}
                  </p>
                )}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6" aria-live="polite">
                {result.success ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      PDF Protected Successfully!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Your PDF has been protected with {result.encryptionLevel} encryption
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={downloadProtected}
                        className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download Protected PDF</span>
                      </button>
                      <button
                        onClick={reset}
                        className="inline-flex items-center justify-center space-x-2 px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        <span>Protect Another PDF</span>
                      </button>
                    </div>
                    
                    {/* File Deletion Notice */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Auto-deletion in 59 minutes</span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Your original file will be automatically deleted from our servers
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Protection Failed
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {result.error || 'An error occurred while protecting your PDF'}
                    </p>
                    <button
                      onClick={() => setResult(null)}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <span>Try Again</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ad Placeholder */}
            <div className="bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
              <div className="text-slate-500 dark:text-slate-400 text-sm">
                Advertisement
              </div>
              <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                300 x 250
              </div>
            </div>

            {/* Legal Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Important Legal Notice
                  </h3>
                  <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
                    <p>• Only protect PDFs you own or have permission to modify</p>
                    <p>• Password protection may not prevent all unauthorized access</p>
                    <p>• Keep your password secure and backed up safely</p>
                    <p>• We cannot recover lost passwords</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                How It Works
              </h3>
              <div className="space-y-4">
                <div className="flex space-x-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">Upload PDF</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Select your PDF file</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">Set Password</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Choose a strong password</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">Download</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Get your protected PDF</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Tools */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Related Tools
              </h3>
              <div className="space-y-3">
                <a href="/tools/unlock" className="block p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-slate-900 dark:text-white font-medium">Unlock PDF</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Remove password protection</p>
                </a>
                <a href="/tools/compress" className="block p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-orange-600" />
                    <span className="text-slate-900 dark:text-white font-medium">Compress PDF</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Reduce file size</p>
                </a>
                <a href="/tools/merge" className="block p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-slate-900 dark:text-white font-medium">Merge PDFs</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Combine multiple files</p>
                </a>
              </div>
            </div>

            {/* Privacy Assurance */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  Your Privacy Matters
                </h3>
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-2">
                <p>✓ All processing happens securely</p>
                <p>✓ Files auto-deleted after 1 hour</p>
                <p>✓ No email or registration required</p>
                <p>✓ No data collection or tracking</p>
              </div>
            </div>

            {/* Mobile App Promotion */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex space-x-1">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <Monitor className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-medium text-slate-800 dark:text-slate-200">
                  Works Everywhere
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Access all PDF tools from any device - mobile, tablet, or desktop. No app installation required.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                How secure is the password protection?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We use industry-standard AES encryption up to 256-bit. Your password becomes the encryption key, so choose a strong one.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Can I recover a forgotten password?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No, we cannot recover passwords. This ensures maximum security, but means you must keep your password safe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                What encryption levels are available?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We offer Standard (40-bit), AES-128, and AES-256 encryption. AES-256 provides the highest security level.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Are there file size limits?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Free users can protect PDFs up to 100MB. The processing happens securely in your browser when possible.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Signals Footer */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>Available in 20+ languages</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Used by 2M+ people monthly</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>4.8/5 average rating</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}