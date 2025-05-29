import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import TitleImage from '../assets/Title.png'; // Görseli import ediyoruz

const Navbar = ({ setToken, onTimerEnd }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const roles = token ? (jwtDecode(token).roles || []) : [];
  const [timeLeft, setTimeLeft] = useState(() => {
    if (token) {
      const decoded = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp - currentTime;
    }
    return 0;
  });

  // Sayaç formatlama (mm:ss)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Kullanıcı etkileşimlerinde sayacı sıfırla
  const resetTimer = useCallback(() => {
    setTimeLeft(3600);
  }, []);

  // Etkileşimleri dinle
  useEffect(() => {
    const events = ['click', 'keydown', 'mousemove'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);

  // Sayaç geri sayımı
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [token, onTimerEnd]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    closeMenu();
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    navigate('/');
    closeMenu();
  };

  const handleLogin = () => {
    navigate('/login');
    closeMenu();
  };

  const closeMenu = () => {
    const navbarNav = document.getElementById('navbarNav');
    if (navbarNav && navbarNav.classList.contains('show')) {
      navbarNav.classList.remove('show');
    }
  };

  const hasAccess = (requiredRoles) => {
    return roles.some((role) => requiredRoles.includes(role));
  };

  const menuItems = [
    { path: '/checkin', label: t('checkIn'), roles: ['Admin', 'Editor', 'CheckInEditor'] },
    { path: '/manual-checkin', label: t('manualCheckIn'), roles: ['Admin', 'Editor', 'CheckInEditor'] },
    { path: '/participants', label: t('participants'), roles: ['Admin', 'Editor', 'ParticipantEditor'] },
    { path: '/settings', label: t('eventSettings'), roles: ['Admin', 'Editor', 'GuestEditor'] },
    { path: '/users', label: t('users'), roles: ['Admin', 'UserEditor'] },
    { path: '/admin-settings', label: t('adminSettings'), roles: ['Admin'] },
  ];

  // Yetkili menü öğelerini filtrele
  const accessibleMenuItems = menuItems.filter((item) => hasAccess(item.roles));

  // Dil eşleme (mapping)
  const languageNames = {
    tr: 'Türkçe',
    en: 'English',
    fr: 'Français',
  };

  // Seçili dilin tam adını al
  const currentLanguageName = languageNames[i18n.language] || 'Türkçe';

  // Tüm Hooks çağrılarından sonra kontrol yapıyoruz
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <>
      <style>
        {`
          .dropdown-item.text-center {
            text-align: center !important;
          }
          .navbar-nav.flex-column .nav-item {
            margin: 0 !important;
            padding: 0 !important;
          }
          .navbar-nav.flex-column .nav-link.text-center,
          .navbar-nav.flex-column .btn.text-center {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            text-align: center;
          }
          .navbar-nav.flex-column .dropdown-toggle::after {
            margin-left: 0.5rem;
          }
          .navbar-logo {
            max-width: 120px; /* Görselin maksimum genişliği */
            height: auto; /* Oranı korumak için */
            aspect-ratio: 3 / 1; /* 2x1 oranı */
            animation: zoomInOut 8s ease-in-out infinite; /* Animasyon süresini 8 saniyeye çıkardık */
          }
          @keyframes zoomInOut {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }
          @media (max-width: 576px) {
            .navbar-logo {
              max-width: 80px; /* Mobil ekranlar için daha küçük boyut */
            }
          }
        `}
      </style>
      <nav className="navbar navbar-expand-lg">
        <div className="container-custom d-flex align-items-center justify-content-between">
          <NavLink
            className="navbar-brand d-flex align-items-center"
            to="/"
            onClick={closeMenu}
            style={{ color: '#e94e1b' }}
          >
            <img
              src={TitleImage} // Import edilen görseli kullanıyoruz
              alt="Uygulama Logosu"
              className="navbar-logo"
            />
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <button
              className="btn btn-canada back-button d-lg-none"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-label="Close menu"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <ul className="navbar-nav w-100 flex-column flex-lg-row">
              {token &&
                accessibleMenuItems.map((item) => (
                  <li key={item.path} className="nav-item me-lg-2">
                    <NavLink className="nav-link text-center" to={item.path} onClick={closeMenu}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              <li className="nav-item dropdown me-lg-2">
                <button
                  className="nav-link dropdown-toggle btn btn-link text-center"
                  id="languageDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {currentLanguageName}
                </button>
                <ul className="dropdown-menu" aria-labelledby="languageDropdown">
                  <li>
                    <button className="dropdown-item text-center" onClick={() => changeLanguage('tr')}>
                      Türkçe
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item text-center" onClick={() => changeLanguage('en')}>
                      English
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item text-center" onClick={() => changeLanguage('fr')}>
                      Français
                    </button>
                  </li>
                </ul>
              </li>
              {token ? (
                <li className="nav-item">
                  <button className="btn btn-canada text-center" onClick={handleLogout}>
                    {t('logout')}
                  </button>
                </li>
              ) : (
                <li className="nav-item">
                  <button className="btn btn-canada text-center" onClick={handleLogin}>
                    {t('login')}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;