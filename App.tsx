
import React, { useState, useEffect } from 'react';
import { AppView, UserProfile, Appointment } from './types';
import { 
  Dashboard, AIChat, MapSearch, SmartMirror, 
  CalendarView, ServicesManager, WalletView, 
  FavoritesView, SupportView, LoginView 
} from './components/FeatureViews';
import LiveVoice from './components/LiveVoice';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Initialize with robust history data
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'hist-1',
      customerName: 'مریم رضایی',
      serviceId: 'hair',
      serviceName: 'کوتاهی مو ژورنالی',
      staffName: 'سارا احمدی',
      date: '۱۰ اردیبهشت ۱۴۰۳',
      time: '14:30',
      status: 'COMPLETED',
      price: 350000
    },
    {
      id: 'hist-2',
      customerName: 'مریم رضایی',
      serviceId: 'nail',
      serviceName: 'ترمیم ناخن و ژلیش',
      staffName: 'نازنین کریمی',
      date: '۲۵ فروردین ۱۴۰۳',
      time: '10:00',
      status: 'COMPLETED',
      price: 200000
    },
    {
      id: 'hist-3',
      customerName: 'مریم رضایی',
      serviceId: 'skin',
      serviceName: 'فیشال تخصصی پوست',
      staffName: 'دکتر راد',
      date: '۱۵ اسفند ۱۴۰۲',
      time: '16:00',
      status: 'COMPLETED',
      price: 850000
    },
    {
      id: 'hist-4',
      customerName: 'مریم رضایی',
      serviceId: 'hair',
      serviceName: 'رنگ مو ترکیبی',
      staffName: 'سارا احمدی',
      date: '۲۰ بهمن ۱۴۰۲',
      time: '11:00',
      status: 'COMPLETED',
      price: 1200000
    }
  ]);

  // Check for existing user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('zibasoft_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, []);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    setCurrentView(AppView.DASHBOARD);
  };

  const confirmLogout = () => {
    localStorage.removeItem('zibasoft_user');
    setUser(null);
    setShowLogoutModal(false);
  };

  const handleBookAppointment = (appt: Appointment) => {
    setAppointments(prev => [...prev, appt]);
    // Optionally auto-navigate back to dashboard to see the new appointment
    setCurrentView(AppView.DASHBOARD);
  };

  const NavItem = ({ view, icon, label }: { view: AppView, icon: string, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsSidebarOpen(false); // Close sidebar on mobile select
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view 
          ? 'bg-primary-50 text-primary-700 font-bold shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      <span className="material-symbols-rounded">{icon}</span>
      <span>{label}</span>
    </button>
  );

  // If not logged in, show Login View
  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50/50 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside className={`
        fixed lg:sticky top-0 right-0 h-screen w-72 bg-white border-l border-slate-100 z-50 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-primary-500 to-primary-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
              <span className="material-symbols-rounded">spa</span>
            </div>
            <div>
               <h1 className="text-xl font-black text-slate-800 tracking-tight">زیبــاسافت</h1>
               <p className="text-xs text-slate-400">پنل مشتریان</p>
            </div>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors active:scale-90"
          >
            <span className="material-symbols-rounded text-lg">close</span>
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-160px)] custom-scrollbar">
          <p className="px-4 text-xs font-bold text-slate-400 mb-2 mt-4">منوی اصلی</p>
          <NavItem view={AppView.DASHBOARD} icon="home" label="خانه" />
          <NavItem view={AppView.CALENDAR} icon="calendar_add_on" label="رزرو نوبت" />
          <NavItem view={AppView.SERVICES} icon="manage_search" label="لیست خدمات" />
          <NavItem view={AppView.WALLET} icon="payments" label="کیف پول" />
          
          <p className="px-4 text-xs font-bold text-slate-400 mb-2 mt-6">ابزارهای هوشمند</p>
          <NavItem view={AppView.VOICE_AGENT} icon="mic" label="دستیار صوتی" />
          <NavItem view={AppView.AI_CHAT} icon="psychology" label="مشاوره زیبایی" />
          <NavItem view={AppView.SMART_MIRROR} icon="face_retouching_natural" label="تست مجازی (آینه)" />
          <NavItem view={AppView.MAP_SEARCH} icon="location_on" label="اطراف من" />
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-50 bg-white">
          <div 
            onClick={() => {
              setIsSidebarOpen(false);
              setShowLogoutModal(true);
            }}
            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors active:scale-95"
          >
             <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase">
               {user.name.charAt(0)}
             </div>
             <div className="overflow-hidden flex-1">
               <p className="text-sm font-bold text-slate-700 truncate">{user.name}</p>
               <p className="text-xs text-slate-400 truncate dir-ltr text-right">{user.phone}</p>
             </div>
             <span className="material-symbols-rounded text-slate-400 text-lg">logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content Container */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Responsive Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-600 active:bg-slate-100"
             >
               <span className="material-symbols-rounded">menu</span>
             </button>
             <div>
               <h2 className="text-base lg:text-lg font-black text-slate-800">
                 {currentView === AppView.DASHBOARD && 'داشبورد من'}
                 {currentView === AppView.AI_CHAT && 'مشاور هوشمند زیبایی'}
                 {currentView === AppView.VOICE_AGENT && 'دستیار صوتی سالن'}
                 {currentView === AppView.SMART_MIRROR && 'ویرایشگر چهره هوشمند'}
                 {currentView === AppView.MAP_SEARCH && 'جستجو در نقشه'}
                 {currentView === AppView.CALENDAR && 'رزرو آنلاین نوبت'}
                 {currentView === AppView.SERVICES && 'خدمات و محصولات'}
                 {currentView === AppView.WALLET && 'کیف پول و تراکنش‌ها'}
                 {currentView === AppView.FAVORITES && 'لیست علاقمندی‌ها'}
                 {currentView === AppView.SUPPORT && 'پشتیبانی و تماس'}
               </h2>
               <p className="text-[10px] text-slate-400 lg:hidden font-medium">زیباسافت | مدیریت هوشمند</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Quick Wallet Info in Header on Mobile */}
             <button 
               onClick={() => setCurrentView(AppView.WALLET)}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors text-xs font-bold active:scale-95"
             >
               <span className="material-symbols-rounded text-sm">payments</span>
               <span className="hidden sm:inline">کیف پول</span>
             </button>

             <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 relative active:scale-95 transition-transform">
               <span className="material-symbols-rounded">notifications</span>
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
          </div>
        </header>

        {/* Content Body - Added pb-24 on mobile to prevent overlapping bottom nav */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 relative bg-slate-50/20">
           {currentView === AppView.DASHBOARD && <Dashboard onNavigate={setCurrentView} user={user} appointments={appointments} />}
           {currentView === AppView.AI_CHAT && <AIChat />}
           {currentView === AppView.VOICE_AGENT && <LiveVoice />}
           {currentView === AppView.SMART_MIRROR && <SmartMirror />}
           {currentView === AppView.MAP_SEARCH && <MapSearch />}
           {currentView === AppView.CALENDAR && <CalendarView onBook={handleBookAppointment} user={user} />}
           {currentView === AppView.SERVICES && <ServicesManager />}
           {currentView === AppView.WALLET && <WalletView />}
           {currentView === AppView.FAVORITES && <FavoritesView />}
           {currentView === AppView.SUPPORT && <SupportView />}
        </div>
      </main>

      {/* Modern Android-Style Bottom Navigation Bar (Visible only on mobile/tablet) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-lg border-t border-slate-100/80 z-40 lg:hidden flex justify-around items-center h-20 px-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {/* Home Tab */}
        <button
          onClick={() => setCurrentView(AppView.DASHBOARD)}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 ${
            currentView === AppView.DASHBOARD ? 'text-primary-600 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`px-4 py-1 rounded-full transition-all duration-300 ${
            currentView === AppView.DASHBOARD ? 'bg-primary-50 text-primary-600 scale-105' : 'hover:bg-slate-50'
          }`}>
            <span className="material-symbols-rounded text-[24px]">home</span>
          </div>
          <span className="text-[10px]">خانه</span>
        </button>

        {/* Booking Tab */}
        <button
          onClick={() => setCurrentView(AppView.CALENDAR)}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 ${
            currentView === AppView.CALENDAR ? 'text-primary-600 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`px-4 py-1 rounded-full transition-all duration-300 ${
            currentView === AppView.CALENDAR ? 'bg-primary-50 text-primary-600 scale-105' : 'hover:bg-slate-50'
          }`}>
            <span className="material-symbols-rounded text-[24px]">calendar_today</span>
          </div>
          <span className="text-[10px]">رزرو نوبت</span>
        </button>

        {/* Central Glowing Voice Agent Button (Material FAB Style) */}
        <button
          onClick={() => setCurrentView(AppView.VOICE_AGENT)}
          className="flex flex-col items-center justify-center flex-1 h-full relative -top-3"
        >
          <div className={`w-14 h-14 bg-gradient-to-tr from-primary-500 to-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/35 transition-all duration-300 hover:scale-105 active:scale-90 ${
            currentView === AppView.VOICE_AGENT ? 'ring-4 ring-primary-100 scale-105' : 'animate-pulse hover:shadow-primary-500/50'
          }`}>
            <span className="material-symbols-rounded text-[26px]">mic</span>
          </div>
          <span className="text-[9px] font-black text-primary-600 mt-1">دستیار صوتی</span>
        </button>

        {/* AI Consultation Tab */}
        <button
          onClick={() => setCurrentView(AppView.AI_CHAT)}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 ${
            currentView === AppView.AI_CHAT ? 'text-primary-600 font-bold' : 'text-slate-400'
          }`}
        >
          <div className={`px-4 py-1 rounded-full transition-all duration-300 ${
            currentView === AppView.AI_CHAT ? 'bg-primary-50 text-primary-600 scale-105' : 'hover:bg-slate-50'
          }`}>
            <span className="material-symbols-rounded text-[24px]">psychology</span>
          </div>
          <span className="text-[10px]">مشاوره هوشمند</span>
        </button>

        {/* More Menu Toggle (Triggers Sidebar Drawer) */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <div className="px-4 py-1 rounded-full hover:bg-slate-50">
            <span className="material-symbols-rounded text-[24px]">widgets</span>
          </div>
          <span className="text-[10px]">بیشتر</span>
        </button>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center border border-slate-100">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <span className="material-symbols-rounded text-3xl">logout</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">خروج از حساب کاربری</h3>
              <p className="text-slate-500 text-sm mb-6">آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟</p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setShowLogoutModal(false)}
                   className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                 >
                   انصراف
                 </button>
                 <button 
                   onClick={confirmLogout}
                   className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-colors"
                 >
                   بله، خروج
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
