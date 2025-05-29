import React from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './Ticket.module.css';
import TicketHeader from '../assets/TicketHeader.png';
import CanadaFlag from '../assets/canada_flag.png';

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

const Ticket = ({ guest, qrId, isPlusOne = false, plusOneGuest }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.container} id="ticket-content">
      <div
        className={styles.containerBackground}
        style={{ backgroundImage: `url(${CanadaFlag})` }}
      ></div>
      <div className={`${styles.mapleLeaf} ${styles.top10} ${styles.left20}`}><MapleLeaf /></div>
      <div className={`${styles.mapleLeaf} ${styles.bottom20} ${styles.right30}`}><MapleLeaf /></div>
      <div className={`${styles.mapleLeaf} ${styles.top40} ${styles.right10}`}><MapleLeaf /></div>
      <div className={`${styles.mapleLeaf} ${styles.bottom10} ${styles.left30}`}><MapleLeaf /></div>
      <div className={`${styles.mapleLeaf} ${styles.top20} ${styles.right60}`}><MapleLeaf /></div>
      <div className={`${styles.mapleLeaf} ${styles.bottom40} ${styles.left60}`}><MapleLeaf /></div>
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
          {isPlusOne && ` (${t('plusOne') || 've'})`}
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
        <div className={styles.qrContainer}>
          <div className={styles.qrFrame}>
            <QRCodeCanvas value={qrId} size={200} level="H" />
          </div>
          <div className={styles.qrIdFrame}>
            <span className={styles.qrIdText}>{qrId}</span>
          </div>
        </div>
        <p className={`${styles.textSm} ${styles.mt6}`}>
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
};

export default Ticket;