
import React, { useState } from 'react';

type View = 'dashboard' | 'generator' | 'assets' | 'sequences' | 'campaigns' | 'audiences' | 'settings';

interface HeaderProps {
  currentView: View;
  onNavigate: (view: View) => void;
  userEmail: string;
  onSignOut: () => void;
}

const NavItem: React.FC<{ 
    id: View; 
    label: string; 
    icon: React.ReactNode; 
    active: boolean; 
    onClick: () => void 
}> = ({ id, label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
            active 
            ? 'bg-brand-red/10 text-brand-red font-semibold border-r-2 border-brand-red' 
            : 'text-brand-subtext hover:bg-brand-medium hover:text-white'
        }`}
    >
        <div className={`${active ? 'text-brand-red' : 'text-brand-subtext group-hover:text-white'}`}>
            {icon}
        </div>
        <span>{label}</span>
    </button>
);

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, userEmail, onSignOut }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNav = (view: View) => {
      onNavigate(view);
      setIsMobileMenuOpen(false);
  };
  
  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    { 
      id: 'generator', 
      label: 'AI Generator',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
    },
    { 
      id: 'assets', 
      label: 'Asset Library',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
    },
    { 
      id: 'sequences', 
      label: 'Sequences',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    { 
      id: 'audiences', 
      label: 'Audiences',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    { 
      id: 'campaigns', 
      label: 'Campaigns',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
    },
    { 
      id: 'settings', 
      label: 'Settings',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    }
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-brand-dark/95 backdrop-blur-md border-b border-brand-border z-50 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <svg className="h-8 w-8 text-brand-red" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm-1.28 2L12 11.58 5.28 6zM4 18V7.39l7.44 4.96a1 1 0 001.12 0L20 7.39V18z"/></svg>
            <h1 className="text-xl font-bold text-white tracking-tight">Email<span className="text-brand-red">.AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-brand-subtext hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 h-screen bg-brand-dark border-r border-brand-border sticky top-0 z-40">
          <div className="p-6 mb-4">
             <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-brand-red/20 rounded-lg flex items-center justify-center text-brand-red">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm-1.28 2L12 11.58 5.28 6zM4 18V7.39l7.44 4.96a1 1 0 001.12 0L20 7.39V18z"/></svg>
                 </div>
                 <div>
                     <h1 className="text-xl font-bold text-white leading-none">EmailCourse</h1>
                     <span className="text-xs text-brand-subtext font-medium tracking-widest">GENERATOR</span>
                 </div>
             </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
              {navItems.map(item => (
                  <NavItem 
                    key={item.id}
                    {...item}
                    active={currentView === item.id}
                    onClick={() => onNavigate(item.id)}
                  />
              ))}
          </nav>

          <div className="p-6 border-t border-brand-border">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-medium/50 mb-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-red to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                      {userEmail.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                      <p className="text-sm font-bold text-white truncate">User Account</p>
                      <p className="text-xs text-brand-subtext truncate" title={userEmail}>{userEmail}</p>
                  </div>
              </div>
              <button 
                onClick={onSignOut}
                className="w-full py-2 text-xs font-bold text-brand-subtext hover:text-white border border-brand-border rounded hover:bg-brand-border transition-colors"
              >
                  Sign Out
              </button>
          </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
              <div className="relative w-64 bg-brand-medium h-full shadow-2xl flex flex-col p-4 animate-slide-in">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-xl font-bold text-white">Menu</h2>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-brand-subtext">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <nav className="space-y-2 flex-1">
                    {navItems.map(item => (
                        <NavItem 
                            key={item.id}
                            {...item}
                            active={currentView === item.id}
                            onClick={() => handleNav(item.id)}
                        />
                    ))}
                  </nav>
                  <div className="pt-4 border-t border-brand-border">
                       <p className="text-xs text-brand-subtext mb-2 truncate">{userEmail}</p>
                       <button onClick={onSignOut} className="w-full py-2 text-center text-sm bg-brand-dark rounded text-white">Sign Out</button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default Header;
