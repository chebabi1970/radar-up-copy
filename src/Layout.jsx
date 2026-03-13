import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Menu,
  X,
  LogOut,
  MessageCircle,
  HelpCircle,
  Calculator,
  BarChart3,
  CreditCard,
  Upload
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NotificationBell from '@/components/NotificationBell';
import TrialBanner from '@/components/trial/TrialBanner';

const navigation = [
  { name: 'Home', href: 'Home', icon: LayoutDashboard },
  { name: 'Clientes', href: 'Clientes', icon: Users },
  { name: 'Casos', href: 'Casos', icon: FolderOpen },
  { name: 'Analítico', href: 'DashboardAnalitico', icon: BarChart3 },
  { name: 'Calculadora', href: 'Calculadora', icon: Calculator },
  { name: 'Ajuda', href: 'Ajuda', icon: HelpCircle },
  { name: 'FAQ', href: 'FAQ', icon: MessageCircle },
  { name: 'Assinatura', href: 'Assinatura', icon: CreditCard },
  { name: 'Admin', href: 'Admin', icon: Users, adminOnly: true },
];
const WHATSAPP_NUMBER = '+5511984848700'; // Atualize com seu número
const WHATSAPP_MESSAGE = 'Olá! Preciso de suporte com a plataforma RADAR UP.';
export default function Layout({ children, currentPageName }) {
  // ========== SECURITY META TAGS ==========
  React.useEffect(() => {
    const securityHeaders = [
      { httpEquiv: 'Content-Security-Policy', content: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://qtrypzzcjebvfcihiynt.supabase.co wss://qtrypzzcjebvfcihiynt.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; frame-src 'self' https:;" },
      { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
      { httpEquiv: 'X-Frame-Options', content: 'DENY' },
      { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' },
      { httpEquiv: 'Strict-Transport-Security', content: 'max-age=31536000; includeSubDomains; preload' },
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { name: 'permissions-policy', content: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()' }
    ];

    securityHeaders.forEach(header => {
      const selector = header.httpEquiv 
        ? `meta[http-equiv="${header.httpEquiv}"]`
        : `meta[name="${header.name}"]`;
      
      if (!document.querySelector(selector)) {
        const meta = document.createElement('meta');
        if (header.httpEquiv) meta.httpEquiv = header.httpEquiv;
        if (header.name) meta.name = header.name;
        meta.content = header.content;
        document.head.appendChild(meta);
      }
    });
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [inactivityTimer, setInactivityTimer] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // ========== AUTO-LOGOUT POR INATIVIDADE (30 minutos) ==========
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutos
    let timer;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        base44.auth.logout();
        alert('Você foi desconectado por inatividade.');
      }, INACTIVITY_TIME);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69837481d21b7c5da35b451b/71a683b7b_Designsemnome10.png" alt="Radar UP" className="h-10 w-10 object-contain" />
              <span className="font-bold text-slate-900">RADAR UP</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') return null;
              
              const isActive = currentPageName === item.href || currentPageName === item.name || (item.href === 'Home' && !currentPageName);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Notification Bell - Desktop Sidebar */}
          <div className="p-4 border-t border-slate-100 hidden lg:block">
           <NotificationBell />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-600 hover:text-slate-900"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3 text-slate-400" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69837481d21b7c5da35b451b/71a683b7b_Designsemnome10.png" alt="Radar UP" className="h-8 w-8 object-contain" />
              <span className="font-bold text-slate-900">RADAR UP</span>
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* Trial Banner */}
        {currentPageName !== 'Home' && <TrialBanner />}

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>

      {/* Floating Support Button */}
      <a 
        href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center justify-center"
        title="Suporte via WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}