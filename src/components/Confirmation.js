import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Confirmation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-body text-center">
          <h2>{t('rsvp_confirmed')}</h2>
          <p>{t('rsvp_confirmation_message')}</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            {t('back_to_home')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;