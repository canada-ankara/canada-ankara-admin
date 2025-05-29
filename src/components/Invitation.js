import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
//import 'jspdf-autotable';

const Invitation = () => {
  const { t } = useTranslation();
  const { qrId } = useParams();
  const navigate = useNavigate();
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState('');
  const [plusOne, setPlusOne] = useState({ firstName: '', lastName: '' });
  const [showPlusOneForm, setShowPlusOneForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // reCAPTCHA v3 token'ını al
  const generateRecaptchaToken = async (action) => {
    try {
      if (!window.grecaptcha) {
        throw new Error('reCAPTCHA script not loaded');
      }
      return await new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute('6LdJKkUrAAAAAEQasES6KBMGeIcdsiPzxJdLjPlm', { action })
            .then((token) => {
              console.log(`reCAPTCHA v3 Token for ${action}:`, token);
              resolve(token);
            })
            .catch((err) => reject(err));
        });
      });
    } catch (err) {
      console.error('reCAPTCHA v3 Error:', err);
      throw err;
    }
  };

  const fetchGuest = async (token) => {
    if (!token) {
      setError(t('please_complete_recaptcha') || 'reCAPTCHA token bulunamadı');
      setIsLoading(false);
      return;
    }
    try {
      console.log('Fetching guest for qrId:', qrId);
      const response = await axios.get(`https://my-backend-app-ndce.onrender.com/api/public/invitation/${qrId}`, {
        headers: {
          'X-reCAPTCHA-Token': token,
        },
      });
      console.log('Guest response:', response.data);
      setGuest(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching guest:', err);
      setError(t(err.response?.data?.message) || t('guestNotFound') || 'Davetli bulunamadı');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadRecaptcha = () => {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=6LdJKkUrAAAAAEQasES6KBMGeIcdsiPzxJdLjPlm';
      script.async = true;
      script.onload = async () => {
        try {
          const token = await generateRecaptchaToken('fetch_guest');
          fetchGuest(token);
        } catch (err) {
          setError(t('invalid_recaptcha') || 'reCAPTCHA doğrulama başarısız');
          setIsLoading(false);
        }
      };
      script.onerror = () => {
        console.error('Failed to load reCAPTCHA script');
        setError(t('serverError') || 'Sunucu hatası oluştu');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    loadRecaptcha();
  }, [fetchGuest, t]);

  const handleRsvp = async (attending) => {
    try {
      const newToken = await generateRecaptchaToken('rsvp');
      console.log('Sending RSVP for qrId:', qrId, 'attending:', attending);
      const response = await axios.post(
        'https://my-backend-app-ndce.onrender.com/api/public/rsvp',
        {
          qrId,
          attending,
          plusOne: showPlusOneForm ? [plusOne] : [],
        },
        {
          headers: {
            'X-reCAPTCHA-Token': newToken,
          },
        }
      );
      console.log('RSVP response:', response.data);
      alert(t(response.data.message));
      if (attending) {
        navigate('/confirmation');
      }
    } catch (err) {
      console.error('Error in RSVP:', err);
      const errorMessage = err.response?.data?.message
        ? t(err.response.data.message) + (err.response.data.details ? ` (Details: ${err.response.data.details})` : '')
        : t('error_rsvp') || 'RSVP işlemi başarısız';
      setError(errorMessage);
    }
  };

  const handlePlusOneSubmit = (e) => {
    e.preventDefault();
    setShowPlusOneForm(false);
  };

  const generatePDF = () => {
    if (!guest) return;
    const doc = new jsPDF();
    doc.text(t('invitationTitle') || 'Davetiye', 20, 20);
    doc.autoTable({
      startY: 30,
      head: [[t('metric'), t('value')]],
      body: [
        [t('firstName'), guest.firstName],
        [t('lastName'), guest.lastName],
        [t('guestType'), guest.guestType],
        [t('qrId'), guest.qrId],
      ],
    });
    doc.save(`${guest.firstName}_${guest.lastName}_invitation.pdf`);
  };

  if (error) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-danger">{error}</div>
        <button
          className="btn btn-canada"
          onClick={async () => {
            try {
              const token = await generateRecaptchaToken('fetch_guest');
              fetchGuest(token);
            } catch (err) {
              setError(t('invalid_recaptcha') || 'reCAPTCHA doğrulama başarısız');
            }
          }}
        >
          {t('tryAgain') || 'Tekrar Dene'}
        </button>
      </div>
    );
  }

  if (isLoading || !guest) {
    return <div className="text-center mt-5">{t('loading') || 'Yükleniyor'}</div>;
  }

  return (

    
    <div className="container mt-5">
      <h2>{t('invitationTitle') || 'Davetiye'}</h2>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">{t('welcome') || 'Hoş geldiniz'}, {guest.firstName} {guest.lastName}</h5>
          <p>{t('guestType') || 'Davetli Türü'}: {guest.guestType}</p>
          <p>{t('qrId') || 'QR ID'}: {guest.qrId}</p>
          {(guest.guestType === 'VIP' || guest.guestType === 'Employee') && (
            <>
              {!showPlusOneForm ? (
                <div className="invitation-actions">
                  <button
                    className="btn-canada mr-2"
                    onClick={() => handleRsvp(true)}
                  >
                    {t('attending') || 'Katılacağım'}
                  </button>
                  <button
                    className="btn-canada-secondary mr-2"
                    onClick={() => handleRsvp(false)}
                  >
                    {t('not_attending') || 'Katılmayacağım'}
                  </button>
                  <button
                    className="btn-canada-info"
                    onClick={() => setShowPlusOneForm(true)}
                  >
                    {t('add_plus_one') || 'Artı Bir Ekle'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePlusOneSubmit}>
                  <div className="mb-3">
                    <label className="form-label">{t('plus_one_name') || 'Artı Bir Adı'}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={plusOne.firstName}
                      onChange={(e) => setPlusOne({ ...plusOne, firstName: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('plus_one_surname') || 'Artı Bir Soyadı'}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={plusOne.lastName}
                      onChange={(e) => setPlusOne({ ...plusOne, lastName: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-canada">
                    {t('submit_plus_one') || 'Artı Bir Kaydet'}
                  </button>
                </form>
              )}
            </>
          )}
          <button className="btn-canada-success mt-3" onClick={generatePDF}>
            {t('downloadPDF') || 'Davetiyeyi İndir'}
          </button>
        </div>
      </div>
    </div>

  );
};

export default Invitation;