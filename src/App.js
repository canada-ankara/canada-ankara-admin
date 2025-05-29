import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { jwtDecode } from 'jwt-decode';
import Turnstile from 'react-turnstile'; // Turnstile bileşeni eklendi
import Navbar from './components/Navbar';
import Home from './components/Home';
import CheckIn from './components/CheckIn';
import ParticipantList from './components/ParticipantList';
import Users from './components/Users';
import EventSettings from './components/EventSettings';
import ManualCheckIn from './components/ManualCheckIn';
import Invitation from './components/Invitation';
import AdminSettings from './components/AdminSettings';
import Confirmation from './components/Confirmation';
import GuestRsvp from './components/GuestRsvp';
import NotFound from './components/NotFound';

const App = () => {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false); // Turnstile doğrulama durumu
  const [turnstileError, setTurnstileError] = useState(''); // Turnstile hata mesajı
  const navigate = useNavigate();
  const location = useLocation();
  const [roles, setRoles] = useState([]);
  const isAlertShown = useRef(false); // Uyarı gösterilip gösterilmediğini takip etmek için
  const turnstileRef = useRef(null); // Turnstile referansı
  const TURNSTILE_SITE_KEY = '0x4AAAAAABewhbAkasuFc41y'; // GuestRsvp.js'den alınan site anahtarı
  const API_URL = 'https://my-backend-app-ndce.onrender.com'; // GuestRsvp.js'den alınan API URL

  // Tek uyarı gösterimi için debounce fonksiyonu
  const showAlertOnce = (message) => {
    if (!isAlertShown.current) {
      isAlertShown.current = true;
      alert(message);
      // 2 saniye sonra uyarıyı tekrar gösterme iznini sıfırla
      setTimeout(() => {
        isAlertShown.current = false;
      }, 2000);
    }
  };

  const verifyTurnstile = async (token) => {
    if (!token) {
      setTurnstileError(t('turnstileNoToken') || 'Doğrulama tokenı alınamadı, lütfen tekrar deneyin.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/admin/verify-turnstile`,
        { response: token },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.data.success) {
        setIsVerified(true);
        setTurnstileError('');
      } else {
        setTurnstileError(
          response.data.message ||
          t('turnstileVerificationFailed') ||
          'Doğrulama başarısız oldu, lütfen tekrar deneyin.'
        );
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        t('retryOrContact') ||
        'Lütfen sayfayı yenileyip tekrar deneyiniz. Eğer hata devam ediyorsa ankara.rsvp@international.gc.ca adresini kullanarak bizimle iletişime geçiniz.';
      setTurnstileError(errorMessage);
      console.error('Turnstile verification error:', err.response?.data || err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Login öncesi token ve rolleri sıfırla
      setToken(null);
      setRoles([]);
      localStorage.removeItem('token');
      isAlertShown.current = false; // Uyarıyı sıfırla
      const response = await axios.post('https://my-backend-app-ndce.onrender.com/api/admin/login', {
        username,
        password,
      });
      setToken(response.data.token);
      setRoles(response.data.roles || []);
      localStorage.setItem('token', response.data.token);
      navigate('/checkin');
    } catch (error) {
      showAlertOnce(`${t('error')}: ${t(error.response?.data?.messageKey) || 'Giriş başarısız'}`);
    }
  };

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  // Sayaç 0'a ulaştığında veya token geçersizse yönlendirme
  const handleTimerEnd = () => {
    setToken(null);
    setRoles([]);
    localStorage.removeItem('token');
    showAlertOnce(t('session_expired')); // Tek uyarı için yeni fonksiyonu kullan
    navigate('/login', { replace: true });
  };

  // Axios Interceptor for handling 401 errors
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        handleTimerEnd(); // handleTimerEnd'i çağır, bu zaten tek uyarıyı yönetir
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }
  );

  // Token yenileme fonksiyonu
  const refreshToken = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        const decoded = jwtDecode(storedToken);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeLeft = decoded.exp - currentTime;
        if (timeLeft < 300) { // Son 5 dakika içinde yenile
          const response = await axios.post('https://my-backend-app-ndce.onrender.com/api/admin/refresh', {}, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setToken(response.data.token);
          setRoles(response.data.roles || []);
          localStorage.setItem('token', response.data.token);
        }
      }
    } catch (error) {
      console.error('Token yenileme hatası:', error);
      handleTimerEnd();
    }
  };

  // Token yenileme için periyodik kontrol
  useEffect(() => {
    const interval = setInterval(() => {
      refreshToken();
    }, 60000); // Her 1 dakikada kontrol et
    return () => clearInterval(interval);
  }, []);

  // Token geçerliliğini kontrol et
  const checkTokenValidity = () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        setToken(storedToken);
        setRoles(decoded.roles || []);
      } catch (error) {
        console.error('Invalid token:', error);
        handleTimerEnd(); // handleTimerEnd zaten tek uyarıyı yönetir
      }
    } else if (!isPublicRoute(location.pathname) && location.pathname !== '/login' && !isNotFoundRoute()) {
      handleTimerEnd(); // handleTimerEnd zaten tek uyarıyı yönetir
    }
  };

  // Uyku modundan çıkışta token kontrolü
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTokenValidity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    checkTokenValidity(); // İlk yüklemede kontrol

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname]);

  const hasAccess = (requiredRoles) => {
    return roles.some((role) => requiredRoles.includes(role));
  };

  const isPublicRoute = (path) => {
    return (
      path.startsWith('/invitation') ||
      path === '/confirmation' ||
      path.startsWith('/rsvp') ||
      path === '/'
    );
  };

  // Yanlış URL'leri kontrol etmek için yardımcı fonksiyon
  const isNotFoundRoute = () => {
    const definedRoutes = [
      '/',
      '/login',
      '/checkin',
      '/manual-checkin',
      '/participants',
      '/users',
      '/settings',
      '/admin-settings',
      '/confirmation',
    ];
    return (
      !definedRoutes.includes(location.pathname) &&
      !location.pathname.startsWith('/invitation') &&
      !location.pathname.startsWith('/rsvp')
    );
  };

  // Login ekranı
  if (!token && !isPublicRoute(location.pathname) && location.pathname !== '/login' && !isNotFoundRoute()) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#000000' }}>
        <div className="card" style={{ width: '24rem' }}>
          <div className="card-body">
            <h2 className="login-title">{t('title_main')}</h2>
            <h3 className="login-subtitle">{t('title_sub')}</h3>
            <div className="language-select-container">
              <select
                className="language-select"
                value={i18n.language}
                onChange={handleLanguageChange}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <h4 className="card-title text-center">{t('login')}</h4>
            {turnstileError && <p className="text-danger text-center">{turnstileError}</p>}
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder={t('username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="mb-3">
                <input
                  type="password"
                  placeholder={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="mb-3 d-flex justify-content-center">
                <Turnstile
                  ref={turnstileRef}
                  sitekey={TURNSTILE_SITE_KEY}
                  onVerify={verifyTurnstile}
                  size="normal"
                />
              </div>
              <button type="submit" className="btn btn-canada w-100" disabled={!isVerified}>
                {t('login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Navbar sadece /rsvp/:qrId ve NotFound rotası dışında gösterilir */}
      {!location.pathname.startsWith('/rsvp') && !isNotFoundRoute() && (
        <Navbar
          token={token}
          setToken={setToken}
          onTimerEnd={handleTimerEnd}
          handleLanguageChange={handleLanguageChange}
          currentLanguage={i18n.language}
        />
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={
          <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#000000' }}>
            <div className="card">
              <div className="card-body">
                <h2 className="login-title">{t('title_main')}</h2>
                <h3 className="login-subtitle">{t('title_sub')}</h3>
                <div className="language-select-container">
                  <select
                    className="language-select"
                    value={i18n.language}
                    onChange={handleLanguageChange}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                <h4 className="card-title text-center">{t('login')}</h4>
                {turnstileError && <p className="text-danger text-center">{turnstileError}</p>}
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder={t('username')}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="password"
                      placeholder={t('password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="mb-3 d-flex justify-content-center">
                    <Turnstile
                      ref={turnstileRef}
                      sitekey={TURNSTILE_SITE_KEY}
                      onVerify={verifyTurnstile}
                      size="normal"
                    />
                  </div>
                  <button type="submit" className="btn btn-canada w-100" disabled={!isVerified}>
                    {t('login')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        } />
        <Route
          path="/checkin"
          element={
            hasAccess(['Admin', 'Editor', 'CheckInEditor']) ? (
              <CheckIn />
            ) : (
              <div className="text-center mt-5">{t('unauthorized')}</div>
            )
          }
        />
        <Route
          path="/manual-checkin"
          element={
            hasAccess(['Admin', 'Editor', 'CheckInEditor']) ? (
              <ManualCheckIn />
            ) : (
              <div className="text-center mt-5">{t('unauthorized')}</div>
            )
          }
        />
        <Route
          path="/participants"
          element={
            hasAccess(['Admin', 'Editor', 'ParticipantEditor']) ? (
              <ParticipantList />
            ) : (
              <div className="text-center mt-5">{t('unauthorized')}</div>
            )
          }
        />
        <Route
          path="/users"
          element={
            hasAccess(['Admin', 'UserEditor']) ? (
              <Users />
            ) : (
              <div className="text-center mt-5">{t('unauthorized')}</div>
            )
          }
        />
        <Route
          path="/settings"
          element={
            hasAccess(['Admin', 'Editor', 'GuestEditor']) ? (
              <EventSettings />
            ) : (
              <div className="text-center mt-5">{t('unauthorized')}</div>
            )
          }
        />
        <Route
          path="/admin-settings"
          element={
            hasAccess(['Admin']) ? (
              <AdminSettings />
            ) : (
              <div className="text-center mt-5">{t('unauthorized')}</div>
            )
          }
        />
        <Route path="/invitation/:qrId" element={<Invitation />} />
        <Route path="/rsvp/:qrId" element={<GuestRsvp />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;