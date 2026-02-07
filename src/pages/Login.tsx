import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Languages,
  Mic,
  Sparkles,
} from "lucide-react";

// Generate user ID from email
function generateUserId(email: string) {
  return `user-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

// Get display name from email
function getDisplayName(email: string) {
  const localPart = email.split('@')[0];
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useUser();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    // Create user from email
    const userData = {
      userId: generateUserId(email),
      name: getDisplayName(email),
      email,
      socketId: "", // Will be set when socket connects
    };

    login(userData);
    setIsLoading(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Languages className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              LinguaFlow
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome
            </h1>
            <p className="text-gray-600">Sign in to continue your journey</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-white/80 backdrop-blur border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-2xl shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 bg-white/80 backdrop-blur border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-2xl shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            Any email works – instant access, no signup needed
          </p>
        </div>
      </div>

      {/* Right Side - Features */}
      <div className="hidden lg:flex lg:w-3/5 relative items-center justify-center p-16">
        <div className="max-w-2xl w-full">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Seamless Communication
            </h2>
            <p className="text-xl text-gray-600">
              Break barriers with AI-powered language tools
            </p>
          </div>

          {/* Feature Cards with Connecting Line */}
          <div className="relative">
            {/* Connecting Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              <path
                d="M 80 80 Q 300 180, 520 180 T 80 320"
                stroke="url(#gradient)"
                strokeWidth="2"
                fill="none"
                strokeDasharray="8 4"
                opacity="0.4"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>

            {/* Translate - Top Left */}
            <div className="relative mb-12 flex justify-start">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20 max-w-sm hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Languages className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Translate</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Real-time translation across 100+ languages with context-aware AI
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcribe - Middle Right */}
            <div className="relative mb-12 flex justify-end">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20 max-w-sm hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Mic className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Transcribe</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Convert speech to text with industry-leading accuracy and speed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Synthesize - Bottom Left */}
            <div className="relative flex justify-start">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20 max-w-sm hover:shadow-2xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Synthesize</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Generate natural-sounding voices that bring your text to life
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
