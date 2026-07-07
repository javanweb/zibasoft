
import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getBusinessAdvice, searchLocations, editImageStyle, MapResult } from '../services/geminiService';
import { ChatMessage, Appointment, Service, Product, AppView, UserProfile } from '../types';

// --- Login View ---
interface LoginViewProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const toEnglishDigits = (str: string) => {
    const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    let clean = str;
    for (let i = 0; i < 10; i++) {
      clean = clean.replace(persianDigits[i], i.toString()).replace(arabicDigits[i], i.toString());
    }
    return clean;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('لطفا نام و شماره تماس خود را وارد کنید.');
      return;
    }
    
    // Regular expression for standard Iranian mobile phone number (11 digits, starts with 09)
    const cleanPhone = toEnglishDigits(phone.trim()).replace(/\D/g, '');
    const iranianMobileRegex = /^09\d{9}$/;
    if (!iranianMobileRegex.test(cleanPhone)) {
      setError('شماره موبایل نامعتبر است. شماره همراه باید ۱۱ رقم بوده و با ۰۹ شروع شود (مانند: ۰۹۱۲۳۴۵۶۷۸۹).');
      return;
    }
    
    const user: UserProfile = { name, phone: cleanPhone };
    localStorage.setItem('zibasoft_user', JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-100 rounded-full blur-3xl opacity-50"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary-100 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md z-10 border border-slate-100 relative">
        <div className="flex flex-col items-center mb-8">
           <div className="w-20 h-20 bg-gradient-to-tr from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30 mb-4 transform -rotate-3">
             <span className="material-symbols-rounded text-4xl">spa</span>
           </div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tight">زیبــاسافت</h1>
           <p className="text-slate-500 mt-2 text-sm">ورود به پنل مشتریان</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">نام و نام خانوادگی</label>
             <div className="relative">
               <input 
                 type="text"
                 value={name}
                 onChange={e => setName(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                 placeholder="مثلا: مریم رضایی"
               />
               <span className="material-symbols-rounded absolute left-3 top-3 text-slate-400">person</span>
             </div>
           </div>

           <div>
             <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-bold text-slate-700">شماره همراه</label>
               <span className={`text-[10px] font-bold ${phone.length === 11 ? 'text-green-500' : 'text-slate-400'}`}>
                 {phone.length.toLocaleString('fa-IR')} / ۱۱ رقم
               </span>
             </div>
             <div className="relative">
               <input 
                 type="tel"
                 value={phone}
                 maxLength={11}
                 onChange={e => {
                   const rawValue = e.target.value;
                   const englishVal = toEnglishDigits(rawValue);
                   const digitsOnly = englishVal.replace(/\D/g, '');
                   setPhone(digitsOnly);
                   if (error) setError('');
                 }}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-primary-500 focus:bg-white transition-all dir-ltr text-right font-mono"
                 placeholder="09123456789"
               />
               <span className="material-symbols-rounded absolute left-3 top-3 text-slate-400">smartphone</span>
             </div>
           </div>

           {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

           <button 
             type="submit"
             className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary-500/30 transition-all active:scale-[0.98]"
           >
             ورود به حساب کاربری
           </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          با ورود به زیباسافت، قوانین و مقررات استفاده را می‌پذیرید.
        </p>
      </div>
    </div>
  );
};

// --- Customer Dashboard Component ---
interface DashboardProps {
  onNavigate: (view: AppView) => void;
  user: UserProfile;
  appointments: Appointment[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, user, appointments }) => {
  // Filter appointments
  const upcomingAppointments = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED');
  const pastAppointments = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');
  
  // Get the most recently booked upcoming appointment
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[upcomingAppointments.length - 1] : null;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black mb-2">سلام {user.name} عزیز، خوش اومدی! ✨</h1>
            <p className="text-primary-100 text-lg">امیدواریم روز فوق‌العاده‌ای داشته باشی.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 border border-white/20">
             <div className="w-12 h-12 rounded-full bg-gold-400 flex items-center justify-center text-white font-bold text-xl shadow-lg">
               <span className="material-symbols-rounded">diamond</span>
             </div>
             <div>
               <p className="text-sm text-primary-100">امتیاز وفاداری</p>
               <p className="text-2xl font-bold">۱,۲۵۰ <span className="text-sm font-normal opacity-75">امتیاز</span></p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Appointment & Yalda Promo */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">نوبت بعدی شما</h2>
            <button 
              onClick={() => onNavigate(AppView.CALENDAR)}
              className="text-primary-600 text-sm font-bold hover:bg-primary-50 px-3 py-1 rounded-lg transition-colors"
            >
              رزرو نوبت جدید
            </button>
          </div>
          
          {nextAppointment ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary-500"></div>
              <div className="flex flex-col items-center justify-center min-w-[100px] bg-primary-50 rounded-2xl p-4 text-primary-700 text-center">
                {/* Parsing date string or showing simple representation */}
                <span className="text-3xl font-black leading-none">
                  {nextAppointment.date.includes(' ') 
                    ? (nextAppointment.date.split(' ')[1] || '۲۵') 
                    : '۲۵'}
                </span>
                <span className="text-sm font-bold mt-1.5 leading-none">
                  {nextAppointment.date.includes(' ') 
                    ? (nextAppointment.date.split(' ')[2] || nextAppointment.date.split(' ')[0] || 'اردیبهشت') 
                    : nextAppointment.date}
                </span>
                <span className="text-xs mt-2 bg-white px-2 py-0.5 rounded text-primary-600 font-bold">{nextAppointment.time}</span>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{nextAppointment.serviceName}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                      <span className="material-symbols-rounded text-base">person</span>
                      با متخصص: {nextAppointment.staffName}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">در انتظار</span>
                </div>
                
                <div className="h-px bg-slate-100 w-full"></div>
                
                <div className="flex gap-3">
                  <button className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                    تغییر زمان
                  </button>
                  <button className="flex-1 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">
                    تماس با سالن
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center flex flex-col items-center justify-center min-h-[200px]">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                 <span className="material-symbols-rounded text-3xl">event_busy</span>
               </div>
               <h3 className="font-bold text-slate-800 mb-2">هنوز نوبتی رزرو نکرده‌اید</h3>
               <p className="text-slate-500 text-sm mb-6">برای استفاده از خدمات سالن، همین حالا نوبت خود را رزرو کنید.</p>
               <button 
                  onClick={() => onNavigate(AppView.CALENDAR)}
                  className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all"
               >
                 رزرو اولین نوبت
               </button>
            </div>
          )}

          {/* AI Beauty Consultant Promo Card */}
          <div className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-100/50 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30 transform -rotate-2 shrink-0">
                <span className="material-symbols-rounded text-3xl">psychology</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span>مشاور هوشمند زیبایی زیباسافت</span>
                  <span className="bg-primary-100 text-primary-700 text-[10px] px-2 py-0.5 rounded-full font-bold">هوش مصنوعی</span>
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  پوستت نیاز به روتین داره؟ نمی‌دونی چه رنگ مویی بهت میاد؟ همین حالا از مشاور هوشمند بپرس!
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate(AppView.AI_CHAT)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/35 transition-all text-sm whitespace-nowrap active:scale-95"
            >
              شروع مشاوره هوشمند 🌸
            </button>
          </div>

          {/* Yalda Special Offer */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-600 to-red-800 text-white shadow-xl transform transition-transform hover:scale-[1.01] cursor-pointer">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <span className="material-symbols-rounded text-9xl">nutrition</span>
             </div>
             <div className="relative z-10 p-8 flex flex-col items-center text-center space-y-4">
                <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold border border-white/20">
                   🍉 فقط تا ۳۰ آذر
                </div>
                <h2 className="text-3xl font-black">جشنواره یلدا شگفت‌انگیز</h2>
                <p className="text-lg opacity-90 max-w-md mx-auto">
                   همین حالا نوبت خودت رو رزرو کن و برای تمامی خدمات ناخن و مو 
                   <span className="font-black text-2xl mx-2 bg-white text-red-600 px-2 rounded-lg inline-block transform -rotate-3">۲۵٪ تخفیف</span> 
                   بگیر!
                </p>
                <button 
                  onClick={() => onNavigate(AppView.CALENDAR)}
                  className="bg-white text-red-700 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-red-50 transition-colors mt-4"
                >
                  دریافت تخفیف و رزرو
                </button>
             </div>
          </div>
        </div>

        {/* Quick Actions & History */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-4">دسترسی سریع</h3>
             <div className="grid grid-cols-2 gap-3">
               {[
                 { icon: 'calendar_add_on', label: 'رزرو جدید', color: 'bg-blue-50 text-blue-600', action: () => onNavigate(AppView.CALENDAR) },
                 { icon: 'payments', label: 'کیف پول', color: 'bg-green-50 text-green-600', action: () => onNavigate(AppView.WALLET) },
                 { icon: 'favorite', label: 'علاقمندی‌ها', color: 'bg-red-50 text-red-600', action: () => onNavigate(AppView.FAVORITES) },
                 { icon: 'support_agent', label: 'پشتیبانی', color: 'bg-slate-50 text-slate-600', action: () => onNavigate(AppView.SUPPORT) },
               ].map((action, i) => (
                 <button 
                   key={i} 
                   onClick={action.action}
                   className={`${action.color} p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-80 transition-opacity`}
                 >
                    <span className="material-symbols-rounded text-2xl">{action.icon}</span>
                    <span className="text-xs font-bold">{action.label}</span>
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex-1">
             <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                <span>تاریخچه خدمات</span>
                <span className="text-xs text-slate-400 font-normal">آخرین بازدیدها</span>
             </h3>
             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {pastAppointments.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">سابقه نوبتی یافت نشد.</p>
                )}
                {pastAppointments.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm pb-3 border-b border-slate-50 last:border-0 last:pb-0 hover:bg-slate-50 p-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {item.status === 'COMPLETED' ? '✓' : '✗'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">{item.serviceName}</p>
                        <p className="text-xs text-slate-400">{item.date}</p>
                      </div>
                    </div>
                    {item.price && (
                      <span className="font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg text-xs">{item.price.toLocaleString('fa-IR')} ت</span>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Wallet View ---
export const WalletView: React.FC = () => {
  const [balance, setBalance] = useState(540000);
  const [showGateway, setShowGateway] = useState(false);
  const [amount, setAmount] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handlePayment = () => {
    if(!amount) return;
    setShowGateway(true);
  };

  const finalizePayment = () => {
    setBalance(prev => prev + parseInt(amount.replace(/,/g, '')));
    setShowGateway(false);
    setAmount('');
    setShowSuccessModal(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4 border border-slate-100">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                <span className="material-symbols-rounded text-4xl">check_circle</span>
              </div>
              <h3 className="text-lg font-black text-slate-800">تراکنش موفقیت‌آمیز بود! 💸</h3>
              <p className="text-slate-500 text-sm">کیف پول شما با موفقیت شارژ شد و موجودی به روز گردید.</p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                بسیار عالی
              </button>
           </div>
        </div>
      )}
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col items-center text-center">
        <p className="text-slate-400 mb-2">موجودی فعلی کیف پول</p>
        <h2 className="text-4xl font-black mb-6 flex items-center gap-2">
           {balance.toLocaleString('fa-IR')} <span className="text-lg font-medium opacity-70">تومان</span>
        </h2>
        
        <div className="w-full bg-white/10 p-4 rounded-2xl mb-4">
           <input 
             type="number"
             value={amount}
             onChange={e => setAmount(e.target.value)}
             placeholder="مبلغ شارژ به تومان..."
             className="w-full bg-transparent text-white text-center placeholder-slate-400 text-lg font-bold focus:outline-none"
           />
        </div>

        <button 
          onClick={handlePayment}
          className="bg-green-500 hover:bg-green-600 text-white w-full py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
        >
          افزایش موجودی
        </button>
      </div>

      {/* Transactions */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
         <h3 className="font-bold text-slate-800 mb-4">تراکنش‌های اخیر</h3>
         <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                   <span className="material-symbols-rounded">arrow_upward</span>
                 </div>
                 <div>
                   <p className="font-bold text-slate-700">پرداخت بیعانه نوبت</p>
                   <p className="text-xs text-slate-400">۲۵ اردیبهشت ۱۴۰۳</p>
                 </div>
               </div>
               <span className="font-bold text-red-600">- ۱۵۰,۰۰۰ ت</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                   <span className="material-symbols-rounded">add</span>
                 </div>
                 <div>
                   <p className="font-bold text-slate-700">شارژ کیف پول</p>
                   <p className="text-xs text-slate-400">۲۰ اردیبهشت ۱۴۰۳</p>
                 </div>
               </div>
               <span className="font-bold text-green-600">+ ۵۰۰,۰۰۰ ت</span>
            </div>
         </div>
      </div>

      {/* Fake Gateway Overlay */}
      {showGateway && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                 <span className="font-bold text-slate-700">درگاه پرداخت اینترنتی</span>
                 <button onClick={() => setShowGateway(false)} className="text-slate-400 hover:text-slate-600">
                   <span className="material-symbols-rounded">close</span>
                 </button>
              </div>
              <div className="p-8 space-y-6 text-center">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/e/e5/Shaparak_Logo.png" alt="Shaparak" className="h-12 mx-auto grayscale opacity-50 mb-4" />
                 <p className="text-lg font-bold">مبلغ قابل پرداخت:</p>
                 <p className="text-3xl font-black text-primary-600 mb-8">{parseInt(amount || '0').toLocaleString('fa-IR')} ریال</p>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowGateway(false)} className="py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50">انصراف</button>
                    <button onClick={finalizePayment} className="py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 shadow-lg shadow-green-500/30">پرداخت موفق</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Favorites View ---
export const FavoritesView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
         {[
           { title: 'کاشت ناخن پودری', price: '۴۵۰,۰۰۰', img: 'spa' },
           { title: 'رنگ موی ترکیبی', price: '۱,۲۰۰,۰۰۰', img: 'palette' },
           { title: 'پاکسازی پوست VIP', price: '۸۰۰,۰۰۰', img: 'face' },
         ].map((item, i) => (
           <div key={i} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all relative group">
              <button className="absolute top-4 left-4 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                <span className="material-symbols-rounded text-lg">delete</span>
              </button>
              
              <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-2xl flex items-center justify-center mb-4">
                 <span className="material-symbols-rounded text-3xl">{item.img}</span>
              </div>
              
              <h3 className="font-bold text-slate-800 text-lg mb-1">{item.title}</h3>
              <p className="text-slate-500 text-sm mb-4">خدمات تخصصی با مواد درجه یک</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                 <span className="font-bold text-slate-700">{item.price} ت</span>
                 <button className="bg-primary-600 text-white text-xs font-bold px-3 py-2 rounded-lg">رزرو مجدد</button>
              </div>
           </div>
         ))}
       </div>
    </div>
  );
};

// --- Support View ---
export const SupportView: React.FC = () => {
  const [msg, setMsg] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSend = () => {
    if(!msg) return;
    setIsSent(true);
    setMsg('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
       {/* Contact Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm">
               <span className="material-symbols-rounded">call</span>
             </div>
             <div>
               <p className="text-sm text-blue-800 opacity-80">تماس با پذیرش</p>
               <a href="tel:02188888888" className="text-xl font-black text-blue-900 dir-ltr block">021-88888888</a>
             </div>
          </div>
          <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm">
               <span className="material-symbols-rounded">chat</span>
             </div>
             <div>
               <p className="text-sm text-green-800 opacity-80">پشتیبانی واتس‌اپ</p>
               <a href="#" className="text-xl font-black text-green-900 dir-ltr block">09123456789</a>
             </div>
          </div>
       </div>

       {/* Message Form */}
       <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          {isSent ? (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-14 h-14 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                <span className="material-symbols-rounded text-3xl">done_all</span>
              </div>
              <h3 className="font-bold text-slate-800">پیام شما با موفقیت ارسال شد ✨</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                انتقاد، پیشنهاد یا سوال شما ثبت شد. مدیریت سالن در اسرع وقت پاسخ شما را خواهد داد.
              </p>
              <button 
                onClick={() => setIsSent(false)}
                className="text-xs font-bold text-primary-600 bg-primary-50 px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors"
              >
                ارسال پیام دیگر
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                <span className="material-symbols-rounded text-primary-500">mail</span>
                ارسال پیام مستقیم به مدیریت
              </h3>
              
              <div className="space-y-4">
                 <textarea 
                   value={msg}
                   onChange={e => setMsg(e.target.value)}
                   placeholder="انتقاد، پیشنهاد یا سوال خود را اینجا بنویسید..."
                   className="w-full border border-slate-200 rounded-2xl p-4 min-h-[150px] focus:outline-none focus:border-primary-500"
                 />
                 <div className="flex justify-end">
                    <button 
                      onClick={handleSend}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95"
                    >
                      <span>ارسال پیام</span>
                      <span className="material-symbols-rounded text-sm">send</span>
                    </button>
                 </div>
              </div>
            </>
          )}
       </div>
    </div>
  );
};

// --- Booking System (CalendarView) ---
const SERVICES_LIST = [
  { id: 'hair', name: 'خدمات مو', icon: 'content_cut', desc: 'کوتاهی، رنگ، براشینگ', price: 350000 },
  { id: 'nail', name: 'خدمات ناخن', icon: 'spa', desc: 'کاشت، ترمیم، طراحی', price: 450000 },
  { id: 'skin', name: 'پوست و زیبایی', icon: 'face', desc: 'فیشال، پاکسازی', price: 800000 },
  { id: 'makeup', name: 'میکاپ', icon: 'brush', desc: 'شنیون، میکاپ عروس', price: 1200000 },
];

const TIME_SLOTS = [
  { time: '09:00', status: 'available' },
  { time: '10:00', status: 'available' },
  { time: '11:00', status: 'available' },
  { time: '12:00', status: 'available' },
  { time: '13:00', status: 'available' },
  { time: '14:00', status: 'available' },
  { time: '15:00', status: 'available' },
  { time: '16:00', status: 'available' },
  { time: '17:00', status: 'available' },
  { time: '18:00', status: 'available' },
];

interface CalendarViewProps {
  onBook: (appt: Appointment) => void;
  user: UserProfile;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onBook, user }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Generate 5 dynamic upcoming days in Persian format starting from today
  const upcomingDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days.map(d => {
      const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(d);
      const day = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(d);
      const month = new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(d);
      return `${weekday} ${day} ${month}`;
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(upcomingDays[0] || '');

  // Step 1: Service Selection
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">انتخاب نوع خدمت</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SERVICES_LIST.map((srv) => (
          <button
            key={srv.id}
            onClick={() => { setSelectedServiceId(srv.id); setStep(2); }}
            className="bg-white p-6 rounded-3xl border-2 border-slate-100 hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/10 transition-all group text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
              <span className="material-symbols-rounded text-3xl">{srv.icon}</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{srv.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{srv.desc}</p>
              <p className="text-xs font-bold text-primary-600 mt-2">{srv.price.toLocaleString('fa-IR')} ت</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 2: Date & Time Selection
  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setStep(1)} className="p-2 rounded-xl hover:bg-slate-100">
           <span className="material-symbols-rounded">arrow_forward</span>
        </button>
        <h2 className="text-2xl font-bold text-slate-800">انتخاب زمان</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Simple Date Picker */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
           <h3 className="font-bold text-slate-700 mb-4">تقویم</h3>
           <div className="space-y-2">
             {upcomingDays.map((day, i) => (
               <button 
                 key={i}
                 onClick={() => setSelectedDate(day)}
                 className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                   selectedDate === day 
                     ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/10' 
                     : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
                 }`}
               >
                 {day}
               </button>
             ))}
           </div>
        </div>

        {/* Time Grid */}
        <div className="md:col-span-2">
          <h3 className="font-bold text-slate-700 mb-4 flex justify-between">
            <span>ساعت‌های موجود</span>
            <span className="text-xs font-normal text-slate-400">{selectedDate}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TIME_SLOTS.map((slot, i) => (
              <button
                key={i}
                disabled={slot.status === 'reserved'}
                onClick={() => { setSelectedTime(slot.time); setStep(3); }}
                className={`
                  relative p-4 rounded-2xl border text-center transition-all
                  ${slot.status === 'reserved' 
                    ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-white border-slate-200 hover:border-primary-500 hover:shadow-md text-slate-800 cursor-pointer'}
                `}
              >
                <span className="text-lg font-bold font-[Vazirmatn]">{slot.time}</span>
                {slot.status === 'reserved' && (
                  <span className="absolute inset-x-0 bottom-2 text-[10px] text-red-400 font-medium">
                    رزرو شده
                  </span>
                )}
                {slot.status === 'available' && (
                  <span className="absolute inset-x-0 bottom-2 text-[10px] text-green-500 font-medium opacity-0 hover:opacity-100 transition-opacity">
                    انتخاب کنید
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const handleConfirmBooking = () => {
    const service = SERVICES_LIST.find(s => s.id === selectedServiceId);
    if (!service || !selectedTime) return;
    setStep(4);
  };

  const handleCompleteFlow = () => {
    const service = SERVICES_LIST.find(s => s.id === selectedServiceId);
    if (!service || !selectedTime) return;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      customerName: user.name,
      serviceId: service.id,
      serviceName: service.name,
      staffName: 'پرسنل سالن',
      date: selectedDate,
      time: selectedTime,
      status: 'PENDING',
      price: service.price
    };

    onBook(newAppointment);
    setStep(1);
    setSelectedServiceId(null);
    setSelectedTime(null);
    setSelectedDate(upcomingDays[0] || '');
  };

  // Step 3: Confirmation
  const renderStep3 = () => (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setStep(2)} className="p-2 rounded-xl hover:bg-slate-100">
           <span className="material-symbols-rounded">arrow_forward</span>
        </button>
        <h2 className="text-2xl font-bold text-slate-800">تکمیل و ثبت نوبت</h2>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 space-y-6">
        <div className="flex items-center gap-4 bg-primary-50 p-4 rounded-2xl border border-primary-100">
           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary-500 shadow-sm">
             <span className="material-symbols-rounded">event_available</span>
           </div>
           <div>
             <p className="text-slate-500 text-xs mb-1">زمان انتخاب شده</p>
             <p className="font-bold text-slate-800 text-lg">{selectedDate} - ساعت {selectedTime}</p>
           </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">نمونه کار یا عکس مشابه (اختیاری)</label>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
             <span className="material-symbols-rounded text-slate-400 text-4xl mb-2">add_photo_alternate</span>
             <p className="text-sm text-slate-500">برای بارگذاری عکس اینجا کلیک کنید</p>
          </div>
        </div>

        <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">توضیحات تکمیلی</label>
           <textarea 
             value={notes}
             onChange={e => setNotes(e.target.value)}
             className="w-full border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-primary-500 min-h-[100px]"
             placeholder="اگر حساسیت خاصی دارید یا نکته‌ای هست بنویسید..."
           />
        </div>

        <button 
          onClick={handleConfirmBooking}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary-500/30 transition-all transform active:scale-95 hover:-translate-y-0.5"
        >
          تایید و پرداخت بیعانه
        </button>
      </div>
    </div>
  );

  // Step 4: Success confirmation screen
  const renderStep4 = () => (
    <div className="animate-fade-in max-w-md mx-auto text-center space-y-6 py-8">
      <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20 animate-bounce">
        <span className="material-symbols-rounded text-6xl">check_circle</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-800">نوبت شما با موفقیت ثبت شد! 🎉</h2>
        <p className="text-slate-500 text-sm">یک پیامک حاوی کد پیگیری و جزئیات برای شما ارسال شد.</p>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 text-right space-y-3 shadow-sm">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-400 text-xs">خدمت رزرو شده:</span>
          <span className="font-bold text-slate-700 text-sm">
            {SERVICES_LIST.find(s => s.id === selectedServiceId)?.name}
          </span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-400 text-xs">زمان حضور شما:</span>
          <span className="font-bold text-slate-700 text-sm">{selectedDate} - ساعت {selectedTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 text-xs">مبلغ بیعانه پرداخت شده:</span>
          <span className="font-bold text-green-600 text-sm">
            {(SERVICES_LIST.find(s => s.id === selectedServiceId)?.price || 0).toLocaleString('fa-IR')} تومان
          </span>
        </div>
      </div>
      <button 
        onClick={handleCompleteFlow}
        className="w-full bg-slate-850 hover:bg-slate-900 text-white py-4 rounded-xl font-bold text-base transition-colors shadow-lg active:scale-95"
      >
        بسیار عالی، بازگشت به خانه
      </button>
    </div>
  );

  return (
    <div>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
};

// --- Services & Products Manager (Keep as simple list for customer view or hide) ---
const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'کاشت ناخن', price: 450000, durationMin: 120, category: 'ناخن' },
  { id: '2', name: 'کوتاهی مو (ژورنالی)', price: 350000, durationMin: 45, category: 'مو' },
];

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'شامپو رنگساژ', price: 280000, stock: 12, category: 'محصولات مو' },
];

export const ServicesManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  // Simple list view for customers
  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 inline-flex">
        <button 
          onClick={() => setActiveTab('services')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'services' ? 'bg-primary-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          خدمات ما
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'products' ? 'bg-secondary-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          فروشگاه
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTab === 'services' ? (
          MOCK_SERVICES.map(service => (
            <div key={service.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
               <div>
                  <h3 className="font-bold text-slate-800">{service.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{service.durationMin} دقیقه</p>
               </div>
               <div className="font-bold text-primary-600">{service.price.toLocaleString('fa-IR')} ت</div>
            </div>
          ))
        ) : (
          MOCK_PRODUCTS.map(product => (
            <div key={product.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
               <div>
                  <h3 className="font-bold text-slate-800">{product.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{product.category}</p>
               </div>
               <div className="font-bold text-secondary-600">{product.price.toLocaleString('fa-IR')} ت</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Chat Component (Thinking Mode) ---
export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await getBusinessAdvice(userMsg.text);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: e.message || 'خطا در ارتباط با سرور.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <span className="material-symbols-rounded text-primary-500">psychology</span>
        <h3 className="font-bold text-slate-700">مشاور زیبایی هوشمند</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-20">
            <span className="material-symbols-rounded text-6xl opacity-20">auto_awesome</span>
            <p className="mt-2">سوالات زیبایی خود را بپرسید. مثلا: "چه رنگ مویی برای پوست سبزه مناسب است؟"</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-primary-50 text-slate-800 rounded-tr-none' 
                : 'bg-slate-800 text-white rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-end">
            <div className="bg-slate-100 text-slate-500 px-4 py-2 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
              <span className="animate-spin material-symbols-rounded text-sm">hourglass_top</span>
              در حال فکر کردن...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex gap-2 relative">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="سوال خود را بپرسید..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-400 pl-12"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="absolute left-2 top-2 bottom-2 bg-primary-600 hover:bg-primary-700 text-white w-10 h-10 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
          >
            <span className="material-symbols-rounded">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Maps Grounding Component ---
export const MapSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{text: string, links: MapResult[]} | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResults(null);
    try {
      const data = await searchLocations(query, 35.6892, 51.3890);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center space-y-4">
          <span className="material-symbols-rounded text-5xl text-blue-500">pin_drop</span>
          <h2 className="text-xl font-bold text-slate-800">جستجوی اطراف سالن</h2>
          
          <div className="flex gap-2 max-w-lg mx-auto">
             <input 
               value={query} 
               onChange={e => setQuery(e.target.value)}
               placeholder="مثلا: پارکینگ عمومی نزدیک سالن"
               className="flex-1 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
             />
             <button 
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-medium transition-colors"
             >
               {loading ? '...' : 'جستجو'}
             </button>
          </div>
       </div>

       {results && (
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 animate-fade-in">
            <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line">{results.text}</p>
            
            {results.links.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {results.links.map((link, i) => (
                  <a 
                    key={i} 
                    href={link.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    <span className="material-symbols-rounded text-blue-600">map</span>
                    <span className="text-sm font-medium text-blue-800 truncate">{link.title}</span>
                  </a>
                ))}
              </div>
            )}
         </div>
       )}
    </div>
  );
}

// --- Image Edit (Nano Banana) ---
export const SmartMirror: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setResultImage(null);
      setError(null);
    }
  };

  const handleEdit = async () => {
    if (!selectedFile || !prompt || !preview) return;
    setLoading(true);
    setError(null);
    try {
      const base64Data = preview.split(',')[1];
      const mimeType = selectedFile.type;
      const newImage = await editImageStyle(base64Data, mimeType, prompt);
      if (newImage) {
        setResultImage(newImage);
      } else {
        setError("خطا در دریافت پاسخ از هوش مصنوعی. لطفا یکبار دیگر تلاش کنید.");
      }
    } catch (err) {
      setError("خطا در پردازش تصویر. مطمئن شوید حجم تصویر مناسب باشد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <span className="material-symbols-rounded text-primary-500">upload</span>
             آپلود عکس خودتان
           </h3>
           <input 
             type="file" 
             accept="image/*"
             onChange={handleFileChange}
             className="block w-full text-sm text-slate-500
               file:ml-4 file:py-2 file:px-4
               file:rounded-full file:border-0
               file:text-sm file:font-semibold
               file:bg-primary-50 file:text-primary-700
               hover:file:bg-primary-100 mb-4
             "
           />
           {preview && (
             <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-100">
               <img src={preview} alt="Original" className="w-full h-full object-cover" />
             </div>
           )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">چه تغییری می‌خواهید؟</label>
          <textarea 
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="مثلا: رنگ موها را بلوند کن..."
            className="w-full h-24 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-primary-400 text-sm mb-3"
          />
          {error && (
            <div className="text-red-500 text-xs font-bold mb-3 flex items-center gap-1.5 bg-red-50 p-2.5 rounded-xl border border-red-100/50 animate-fade-in">
              <span className="material-symbols-rounded text-sm">warning</span>
              <span>{error}</span>
            </div>
          )}
          <button 
            onClick={handleEdit}
            disabled={!preview || loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/30"
          >
            {loading ? 'در حال پردازش...' : 'مشاهده تغییرات'}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[400px]">
         {!resultImage && !loading && (
           <div className="text-slate-500">
             <span className="material-symbols-rounded text-6xl opacity-30">face_retouching_natural</span>
             <p className="mt-4">نتیجه اینجا نمایش داده می‌شود</p>
           </div>
         )}
         {loading && (
           <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
           </div>
         )}
         {resultImage && (
           <div className="w-full h-full flex flex-col">
             <img src={resultImage} alt="Edited" className="w-full flex-1 object-contain rounded-xl mb-4" />
             <a 
               href={resultImage} 
               download="new-style.png"
               className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors"
             >
               دانلود تصویر
             </a>
           </div>
         )}
      </div>
    </div>
  );
};
