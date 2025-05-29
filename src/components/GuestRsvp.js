import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Turnstile from 'react-turnstile';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from './GuestRsvp.module.css';
import TicketHeader from '../assets/TicketHeader.png';
import CanadaFlag from '../assets/canada_flag.png';
import Ticket from './Ticket';

const MapleLeaf = () => (
  <svg className={styles.mapleLeaf} width="50" height="50" viewBox="0 0 100 100" fill="red">
    <path d="M12 2l1.5 4.5h4.5l-1.5 3.5 3.5 1-3.5 1.5 1.5 3.5h-4.5l-1.5 4.5-1.5-4.5h-4.5l1.5-3.5-3.5-1 3.5-1.5-1.5-3.5h4.5l1.5-4.5zM12 6l-.75 2.25h-2.25l.75 1.75-1.75.5 1.75.75-.75 1.75h2.25l.75 2.25.75-2.25h2.25l-.75-1.75 1.75-.75-1.75-.5.75-1.75h-2.25l-.75-2.25z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="#dc2626">
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" />
  </svg>
);

const LocationIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="#dc2626">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
  </svg>
);

const GuestRsvp = () => {
  const { t, i18n } = useTranslation();
  const { qrId } = useParams();
  const navigate = useNavigate();
  const [guest, setGuest] = useState(null);
  const [plusOneGuest, setPlusOneGuest] = useState(null);
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPlusOneForm, setShowPlusOneForm] = useState(false);
  const [showDeclineMessage, setShowDeclineMessage] = useState(false);
  const [plusOneData, setPlusOneData] = useState({ firstName: '', lastName: '', email: '' });
  const [isVerified, setIsVerified] = useState(false);
  const [turnstileError, setTurnstileError] = useState('');
  const turnstileRef = useRef(null);

  const API_URL = 'https://my-backend-app-ndce.onrender.com';
  const TURNSTILE_SITE_KEY = '0x4AAAAAABewhbAkasuFc41y';

  const handleLanguageChange = (event) => {
    const selectedLanguage = event.target.value;
    i18n.changeLanguage(selectedLanguage);
  };

  const verifyTurnstile = async (token) => {
    if (!token) {
      setTurnstileError(t('turnstileNoToken') || "Doğrulama token'ı alınamadı, lütfen tekrar deneyin.");
      setTimeout(() => {
        navigate('/not-found');
      }, 3000);
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
        setTimeout(() => {
          navigate('/not-found');
        }, 3000);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        t('retryOrContact') ||
        'Lütfen sayfayı yenileyip tekrar deneyiniz. Eğer hata devam ediyorsa ankara.rsvp@international.gc.ca adresini kullanarak bizimle iletişime geçiniz.';
      setTurnstileError(errorMessage);
      console.error('Turnstile verification error:', err.response?.data || err.message);
      setTimeout(() => {
        navigate('/not-found');
      }, 3000);
    }
  };

  useEffect(() => {
    const checkRsvpStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/public/rsvp-status`);
        console.log('RSVP durumu alındı:', response.data);
        setRsvpEnabled(response.data.rsvpEnabled);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          t('rsvpStatusError') || 'RSVP durumu alınamadı, lütfen daha sonra tekrar deneyin.';
        setError(errorMessage);
        console.error('checkRsvpStatus hatası:', err.response?.data || err.message);
      }
    };

    const fetchGuest = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/public/guest/${qrId}`);
        console.log('Davetli bilgisi alındı:', response.data);
        setGuest(response.data);
        if (response.data.plusOneQrId) {
          const plusOneResponse = await axios.get(`${API_URL}/api/public/guest/${response.data.plusOneQrId}`);
          console.log('PlusOne bilgisi alındı:', plusOneResponse.data);
          setPlusOneGuest(plusOneResponse.data);
        }
        setLoading(false);
      } catch (err) {
        console.error('fetchGuest hatası:', err.response?.data || err.message);
        setLoading(false);
        navigate('/not-found');
      }
    };

    if (isVerified) {
      checkRsvpStatus();
      fetchGuest();
    }
  }, [qrId, t, navigate, isVerified]);

  useEffect(() => {
    if (guest && guest.willAttend && rsvpEnabled) {
      if (['EMPLOYEE', 'VIP'].includes(guest.guestType) && !guest.plusOneQrId) {
        setShowPlusOneForm(true);
      } else {
        setShowPlusOneForm(false);
      }
    }
  }, [guest, rsvpEnabled]);

  const handleResponse = async (willAttend) => {
    console.log('handleResponse çağrıldı, willAttend:', willAttend);
    try {
      const response = await axios.post(
        `${API_URL}/api/public/rsvp/${qrId}`,
        { willAttend },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('RSVP yanıtı alındı:', response.data);
      setGuest({ ...guest, willAttend, responded: true });
      if (!willAttend) {
        setShowDeclineMessage(true);
        setShowPlusOneForm(false);
        setPlusOneGuest(null);
      } else if (['EMPLOYEE', 'VIP'].includes(guest.guestType) && !guest.plusOneQrId) {
        setShowPlusOneForm(true);
        setShowDeclineMessage(false);
      } else {
        setShowPlusOneForm(false);
        setShowDeclineMessage(false);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || t('error') || 'Bir hata oluştu, lütfen tekrar deneyin.';
      setError(errorMessage);
      console.error('handleResponse hatası:', err.response?.data || err.message);
      alert(errorMessage);
    }
  };

  const handlePlusOneInputChange = (e) => {
    const { name, value } = e.target;
    setPlusOneData({ ...plusOneData, [name]: value });
  };

  const handlePlusOneSubmit = async (e) => {
    e.preventDefault();
    console.log('handlePlusOneSubmit çağrıldı, plusOneData:', plusOneData);
    try {
      const response = await axios.post(
        `${API_URL}/api/public/add-plusone/${qrId}`,
        { ...plusOneData },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('Misafir ekleme yanıtı:', response.data);
      setGuest({ ...guest, plusOneQrId: response.data.plusOne.qrId });
      setPlusOneGuest(response.data.plusOne);
      setPlusOneData({ firstName: '', lastName: '', email: '' });
      setShowPlusOneForm(false);
      setError('');
      navigate(`/rsvp/${qrId}`);
    } catch (err) {
      const errorMessage = err.response?.data?.messageKey
        ? t(err.response.data.messageKey) || err.response.data.message
        : t('retryOrContact') || 'Lütfen sayfayı yenileyip tekrar deneyiniz. Eğer hata devam ediyorsa ankara.rsvp@international.gc.ca adresini kullanarak bizimle iletişime geçiniz.';
      setError(errorMessage);
      console.error('handlePlusOneSubmit hatası:', err.response?.data || err.message);
      alert(errorMessage);
    }
  };

  const handleContinueWithoutGuest = () => {
    console.log('handleContinueWithoutGuest çağrıldı');
    setShowPlusOneForm(false);
    navigate(`/rsvp/${qrId}`);
  };

  const waitForRender = () => {
    return new Promise((resolve) => {
      const checkRender = () => {
        const ticketElement = document.querySelector('#ticket-content');
        if (ticketElement && ticketElement.offsetHeight > 0) {
          resolve();
        } else {
          requestAnimationFrame(checkRender);
        }
      };
      requestAnimationFrame(checkRender);
    });
  };

  const generatePDF = async (guestData, qrId, isPlusOne = false) => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '-9999px';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '595px';
      tempDiv.style.height = '842px';
      tempDiv.style.overflow = 'hidden';
      tempDiv.style.display = 'flex';
      tempDiv.style.flexDirection = 'column';
      tempDiv.style.justifyContent = 'center';
      tempDiv.style.alignItems = 'center';
      tempDiv.style.backgroundColor = '#ffffff';
      document.body.appendChild(tempDiv);

      const ticket = (
        <Ticket
          guest={guestData}
          qrId={qrId}
          isPlusOne={isPlusOne}
          plusOneGuest={plusOneGuest}
        />
      );

      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempDiv);
      root.render(ticket);

      await waitForRender();

      const ticketElement = tempDiv.querySelector('#ticket-content');
      if (!ticketElement) {
        throw new Error('Ticket content not found');
      }

      ticketElement.style.width = '595px';
      ticketElement.style.height = '842px';
      ticketElement.style.overflow = 'hidden';
      ticketElement.style.display = 'flex';
      ticketElement.style.flexDirection = 'column';
      ticketElement.style.justifyContent = 'center';
      ticketElement.style.alignItems = 'center';
      ticketElement.style.padding = '20px';
      ticketElement.style.boxSizing = 'border-box';

      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 595,
        height: 842,
        windowWidth: 595,
        windowHeight: 842,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/png');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      const xOffset = 0;
      const yOffset = (pageHeight - imgHeight) / 2;
      doc.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight, null, 'FAST');

      doc.save(`${guestData.firstName}_${guestData.lastName}${isPlusOne ? '_PlusOne' : ''}_Ticket.pdf`);

      root.unmount();
      document.body.removeChild(tempDiv);
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      alert(t('pdfError') || 'PDF oluşturulamadı, lütfen tekrar deneyin.');
    }
  };

  const handleDownloadOwnTicket = () => {
    generatePDF(guest, qrId);
  };

  const handleDownloadPlusOneTicket = () => {
    if (plusOneGuest && guest.plusOneQrId) {
      generatePDF(plusOneGuest, guest.plusOneQrId, true);
    }
  };

  const LanguageDropdown = () => (
    <select
      className={styles.languageDropdown}
      value={i18n.language}
      onChange={handleLanguageChange}
    >
      <option value="en">English</option>
      <option value="tr">Türkçe</option>
      <option value="fr">Français</option>
    </select>
  );

  if (!isVerified) {
    return (
      <div className={styles.container}>
        <LanguageDropdown />
        <div
          className={styles.containerBackground}
          style={{ backgroundImage: `url(${CanadaFlag})` }}
        ></div>
        <div className={`${styles.mapleLeaf} top-10 left-20`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-20 right-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-40 right-10`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-10 left-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-20 right-60`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-40 left-60`}><MapleLeaf /></div>
        <div className={styles.content}>
          <img src={TicketHeader} alt="Ticket Header" className={styles.ticketHeader} />
          <h1 className={styles.h1}>Canada Day 2025</h1>
          <p className={`${styles.textXl} font-sans`}>
            {t('verifyPrompt') || 'Lütfen doğrulayınız'}
          </p>
          {turnstileError && <p className={styles.textRed500}>{turnstileError}</p>}
          <Turnstile
            ref={turnstileRef}
            sitekey={TURNSTILE_SITE_KEY}
            onVerify={verifyTurnstile}
            size="normal"
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.body}>
        <LanguageDropdown />
        <div className={styles.content}>{t('loading') || 'Yükleniyor'}</div>
      </div>
    );
  }

  if (error && !guest) {
    navigate('/not-found');
    return null;
  }

  if (!rsvpEnabled) {
    if (guest.willAttend) {
      return (
        <div className={styles.container}>
          <LanguageDropdown />
          <div
            className={styles.containerBackground}
            style={{ backgroundImage: `url(${CanadaFlag})` }}
          ></div>
          <div className={`${styles.mapleLeaf} top-10 left-20`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} bottom-20 right-30`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} top-40 right-10`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} bottom-10 left-30`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} top-20 right-60`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} bottom-40 left-60`}><MapleLeaf /></div>
          <div className={styles.content}>
            <img src={TicketHeader} alt="Ticket Header" className={styles.ticketHeader} />
            <h1 className={styles.h1}>Canada Day 2025</h1>
            <p className={`${styles.textXl} font-sans`}>
              {t('invitationHeader') || 'On the occasion of Canada Day, the Ambassador of Canada'}
            </p>
            <p className={`${styles.textXl} ${styles.textXlFontSemibold}`}>
              {t('ambassador') || 'H.E. Kevin Hamilton and Mrs. Tal Hamilton'}
            </p>
            <p className={styles.textXl}>
              {t('requestPresence') || 'request the pleasure of the company of'}
            </p>
            <p className={styles.text2xl}>
              {guest.firstName} {guest.lastName}
              {plusOneGuest && ` ${t('plusOne') || 've'} ${plusOneGuest.firstName} ${plusOneGuest.lastName}`}
            </p>
            <p className={styles.textXl}>
              <CalendarIcon />
              {t('eventDetails') || 'at a reception on Tuesday, 1 July 2025 from 19:00 to 21:00'}
            </p>
            <p className={styles.textLg}>
              <LocationIcon />
              {t('location') || 'Official Residence, Turan Emeksiz 13, G.O.P'}
            </p>
            <p className={styles.textLg}>
              {t('rsvpEmail') || 'RSVP'}: <a href="mailto:ankara.rsvp@international.gc.ca" className={styles.textRed600}>ankara.rsvp@international.gc.ca</a>
            </p>
            {error && <p className={styles.textRed500}>{error}</p>}
            <p className={styles.textLg}>
              {t('downloadTicketPrompt') || 'Aşağıdaki düğmeye tıklayıp biletinizi indirebilirsiniz.'}
            </p>
            <div className={styles.buttonContainer}>
              <button className={styles.bgRed600} onClick={handleDownloadOwnTicket}>
                {t('downloadOwnTicket') || 'Biletimi İndir'}
              </button>
              {['EMPLOYEE', 'VIP'].includes(guest.guestType) && guest.plusOneQrId && plusOneGuest && (
                <button className={styles.bgRed600} onClick={handleDownloadPlusOneTicket}>
                  {t('downloadPlusOneTicket') || 'Misafir Biletini İndir'}
                </button>
              )}
            </div>
            <p className={`${styles.textSm} mt-6`}>
              {t('dressCode') || 'Dress code: Business attire; National dress welcome'}
            </p>
            <p className={styles.textSm}>
              {t('qrCodeNotice') || 'Please present QR code confirmation and ID at the entrance.'}
            </p>
            <p className={styles.textSm}>
              {t('noParking') || 'No parking available. This invitation is non-transferable.'}
            </p>
            <p className={styles.textSm}>
              {t('noMinors') || 'No minors will be allowed.'}
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <LanguageDropdown />
          <div
            className={styles.containerBackground}
            style={{ backgroundImage: `url(${CanadaFlag})` }}
          ></div>
          <div className={`${styles.mapleLeaf} top-10 left-20`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} bottom-20 right-30`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} top-40 right-10`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} bottom-10 left-30`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} top-20 right-60`}><MapleLeaf /></div>
          <div className={`${styles.mapleLeaf} bottom-40 left-60`}><MapleLeaf /></div>
          <div className={styles.content}>
            <img src={TicketHeader} alt="Ticket Header" className={styles.ticketHeader} />
            <h1 className={styles.h1}>Canada Day 2025</h1>
            <p className={`${styles.textXl} font-sans`}>
              {t('rsvpClosedMessage') || 'Üzgünüz fakat kayıtlarımız sona ermiştir. Talep ve sorularınız için ankara.rsvp@international.gc.ca ile iletişime geçebilirsiniz.'}
            </p>
            <p className={styles.textLg}>
              <a href="mailto:ankara.rsvp@international.gc.ca" className={styles.textRed600}>ankara.rsvp@international.gc.ca</a>
            </p>
          </div>
        </div>
      );
    }
  }

  if (showDeclineMessage) {
    return (
      <div className={styles.container}>
        <LanguageDropdown />
        <div
          className={styles.containerBackground}
          style={{ backgroundImage: `url(${CanadaFlag})` }}
        ></div>
        <div className={`${styles.mapleLeaf} top-10 left-20`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-20 right-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-40 right-10`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-10 left-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-20 right-60`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-40 left-60`}><MapleLeaf /></div>
        <div className={styles.content}>
          <img src={TicketHeader} alt="Ticket Header" className={styles.ticketHeader} />
          <h1 className={styles.h1}>Canada Day 2025</h1>
          <p className={`${styles.textXl} font-sans`}>
            {t('declineMessage') || 'Sizleri aramızda göremeyeceğimiz için üzgünüz.'}
          </p>
          <p className={styles.textXl}>
            {t('declineChangeOption') || '15 Haziran 2025 tarihine kadar eğer katılma durumunuz değişirse, yine aynı bağlantıdan katılacağınızı bildirebilirsiniz.'}
          </p>
          <p className={styles.textLg}>
            {t('rsvpEmail') || 'RSVP'}: <a href="mailto:ankara.rsvp@international.gc.ca" className={styles.textRed600}>ankara.rsvp@international.gc.ca</a>
          </p>
        </div>
      </div>
    );
  }

  if (guest.willAttend && (!showPlusOneForm || (['EMPLOYEE', 'VIP'].includes(guest.guestType) && guest.plusOneQrId))) {
    return (
      <div className={styles.container}>
        <LanguageDropdown />
        <div
          className={styles.containerBackground}
          style={{ backgroundImage: `url(${CanadaFlag})` }}
        ></div>
        <div className={`${styles.mapleLeaf} top-10 left-20`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-20 right-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-40 right-10`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-10 left-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-20 right-60`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-40 left-60`}><MapleLeaf /></div>
        <div className={styles.content}>
          <img src={TicketHeader} alt="Ticket Header" className={styles.ticketHeader} />
          <h1 className={styles.h1}>Canada Day 2025</h1>
          <p className={`${styles.textXl} font-sans`}>
            {t('invitationHeader') || 'On the occasion of Canada Day, the Ambassador of Canada'}
          </p>
          <p className={`${styles.textXl} ${styles.textXlFontSemibold}`}>
            {t('ambassador') || 'H.E. Kevin Hamilton and Mrs. Tal Hamilton'}
          </p>
          <p className={styles.textXl}>
            {t('requestPresence') || 'request the pleasure of the company of'}
          </p>
          <p className={styles.text2xl}>
            {guest.firstName} {guest.lastName}
            {plusOneGuest && ` ${t('plusOne') || 've'} ${plusOneGuest.firstName} ${plusOneGuest.lastName}`}
          </p>
          <p className={styles.textXl}>
            <CalendarIcon />
            {t('eventDetails') || 'at a reception on Tuesday, 1 July 2025 from 19:00 to 21:00'}
          </p>
          <p className={styles.textLg}>
            <LocationIcon />
            {t('location') || 'Official Residence, Turan Emeksiz 20, G.O.P'}
          </p>
          <p className={styles.textLg}>
            {t('rsvpEmail') || 'RSVP'}: <a href="mailto:ankara.rsvp@international.gc.ca" className={styles.textRed600}>ankara.rsvp@international.gc.ca</a>
          </p>
          {error && <p className={styles.textRed500}>{error}</p>}
          <p className={styles.textLg}>
            {t('downloadTicketPrompt') || 'Aşağıdaki düğmeye tıklayıp biletinizi indirebilirsiniz.'}
          </p>
          <div className={styles.buttonContainer}>
            <button className={styles.bgRed600} onClick={handleDownloadOwnTicket}>
              {t('downloadOwnTicket') || 'Biletimi İndir'}
            </button>
            {['EMPLOYEE', 'VIP'].includes(guest.guestType) && guest.plusOneQrId && plusOneGuest && (
              <button className={styles.bgRed600} onClick={handleDownloadPlusOneTicket}>
                {t('downloadPlusOneTicket') || 'Misafir Biletini İndir'}
              </button>
            )}
          </div>
          <p className={`${styles.textSm} mt-6`}>
            {t('dressCode') || 'Dress code: Business attire; National dress welcome'}
          </p>
          <p className={styles.textSm}>
            {t('qrCodeNotice') || 'Please present QR code confirmation and ID at the entrance.'}
          </p>
          <p className={styles.textSm}>
            {t('noParking') || 'No parking available. This invitation is non-transferable.'}
          </p>
          <p className={styles.textSm}>
            {t('noMinors') || 'No minors will be allowed.'}
          </p>
        </div>
      </div>
    );
  }

  if (guest.willAttend && ['EMPLOYEE', 'VIP'].includes(guest.guestType) && !guest.plusOneQrId && showPlusOneForm) {
    return (
      <div className={styles.container}>
        <LanguageDropdown />
        <div
          className={styles.containerBackground}
          style={{ backgroundImage: `url(${CanadaFlag})` }}
        ></div>
        <div className={`${styles.mapleLeaf} top-10 left-20`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-20 right-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-40 right-10`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-10 left-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-20 right-60`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-40 left-60`}><MapleLeaf /></div>
        <div className={styles.content}>
          <img src={TicketHeader} alt="Ticket Header" className={styles.ticketHeader} />
          <h1 className={styles.h1}>Canada Day 2025</h1>
          <p className={`${styles.textXl} font-sans`}>
            {t('invitationHeader') || 'On the occasion of Canada Day, the Ambassador of Canada'}
          </p>
          <p className={`${styles.textXl} ${styles.textXlFontSemibold}`}>
            {t('ambassador') || 'H.E. Kevin Hamilton'}
          </p>
          <p className={styles.textXl}>
            {t('requestPresence') || 'request the pleasure of the company of'}
          </p>
          <p className={styles.text2xl}>
            {guest.firstName} {guest.lastName}
          </p>
          <p className={`${styles.textLg} font-sans`}>
            {t('addPlusOnePrompt') || 'If you are bringing a guest, please fill out the form below:'}
          </p>
          {error && <p className={styles.textRed500}>{error}</p>}
          <div className={styles.formContainer}>
            <input
              type="text"
              name="firstName"
              value={plusOneData.firstName}
              onChange={handlePlusOneInputChange}
              placeholder={t('firstName') || 'Misafir Adı'}
              className={styles.input}
            />
            <input
              type="text"
              name="lastName"
              value={plusOneData.lastName}
              onChange={handlePlusOneInputChange}
              placeholder={t('lastName') || 'Misafir Soyadı'}
              className={styles.input}
            />
            <input
              type="email"
              name="email"
              value={plusOneData.email}
              onChange={handlePlusOneInputChange}
              placeholder={t('email') || 'Misafir E-posta'}
              className={styles.input}
            />
            <div className={styles.buttonContainerSmall}>
              <button
                onClick={handlePlusOneSubmit}
                className={styles.bgRed600}
              >
                {t('submitPlusOne') || 'Misafir Ekle'}
              </button>
              <button
                onClick={handleContinueWithoutGuest}
                className={styles.bgWhite}
              >
                {t('continueWithoutGuest') || 'Misafirsiz Devam Et'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!guest.willAttend) {
    return (
      <div className={styles.container}>
        <LanguageDropdown />
        <div
          className={styles.containerBackground}
          style={{ backgroundImage: `url(${CanadaFlag})` }}
        ></div>
        <div className={`${styles.mapleLeaf} top-10 left-20`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-20 right-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-40 right-10`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-10 left-30`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} top-20 right-60`}><MapleLeaf /></div>
        <div className={`${styles.mapleLeaf} bottom-40 left-60`}><MapleLeaf /></div>
        <div className={styles.content}>
          <img src={TicketHeader} alt="Ticket Header" className={styles.ticketHeader} />
          <h1 className={styles.h1}>Canada Day 2025</h1>
          <p className={`${styles.textXl} font-sans`}>
            {t('invitationHeader') || 'On the occasion of Canada Day, the Ambassador of Canada'}
          </p>
          <p className={`${styles.textXl} ${styles.textXlFontSemibold}`}>
            {t('ambassador') || 'H.E. Kevin Hamilton'}
          </p>
          <p className={styles.textXl}>
            {t('requestPresence') || 'request the pleasure of the company of'}
          </p>
          <p className={styles.text2xl}>
            {guest.firstName} {guest.lastName}
          </p>
          <p className={styles.textXl}>
            <CalendarIcon />
            {t('eventDetails') || 'at a reception on Tuesday, 1 July 2025 from 19:00 to 21:00'}
          </p>
          <p className={styles.textLg}>
            <LocationIcon />
            {t('location') || 'Official Residence, Turan Emeksiz 20, G.O.P'}
          </p>
          <p className={styles.textLg}>
            {t('rsvpEmail') || 'RSVP'}: <a href="mailto:ankara.rsvp@international.gc.ca" className={styles.textRed600}>ankara.rsvp@international.gc.ca</a>
          </p>
          {error && <p className={styles.textRed500}>{error}</p>}
          <div className={styles.buttonContainer}>
            <button
              onClick={() => handleResponse(true)}
              className={styles.bgRed600}
              disabled={!guest}
            >
              {t('attend') || 'Katılacağım'}
            </button>
            <button
              onClick={() => handleResponse(false)}
              className={styles.bgWhite}
              disabled={!guest}
            >
              {t('notAttend') || 'Katılmayacağım'}
            </button>
          </div>
          {(guest.guestType === 'EMPLOYEE' || guest.guestType === 'VIP') && (
            <p className={`${styles.textLg} mt-4`}>
              {t('plusOneOption') || 'Katılmayı seçerseniz, bir misafir (+1) ekleme yönteminiz olacaktır.'}
            </p>
          )}
          <p className={`${styles.textSm} mt-6`}>
            {t('dressCode') || 'Dress code: Business attire; National dress welcome'}
          </p>
          <p className={styles.textSm}>
            {t('qrCodeNotice') || 'Please present QR code confirmation and ID at the entrance.'}
          </p>
          <p className={styles.textSm}>
            {t('noParking') || 'No parking available. This invitation is non-transferable.'}
          </p>
          <p className={styles.textSm}>
            {t('noMinors') || 'No minors will be allowed.'}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default GuestRsvp;