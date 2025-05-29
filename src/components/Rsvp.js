import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const Rsvp = () => {
  const { qrId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [guest, setGuest] = useState(null);
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkRsvpStatus = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/rsvp-status`);
        setRsvpEnabled(response.data.rsvpEnabled);
      } catch (err) {
        setError(t('error'));
        console.error('RSVP status error:', err);
      }
    };

    const fetchGuest = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/public/guest/${qrId}`);
        setGuest(response.data);
        setLoading(false);
      } catch (err) {
        setError(t('guestNotFound'));
        setLoading(false);
        console.error('Fetch guest error:', err);
      }
    };

    checkRsvpStatus();
    fetchGuest();
  }, [qrId, t]);

  const handleRsvp = async (willAttend) => {
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/public/rsvp/${qrId}`, { willAttend });
      if (willAttend) {
        navigate(`/invitation/${qrId}`);
      } else {
        setGuest({ ...guest, responded: true, willAttend: false });
      }
    } catch (err) {
      setError(err.response?.data?.message || t('error'));
      console.error('RSVP submit error:', err);
    }
  };

  if (loading) return <div>{t('loading')}</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!guest) return <div>{t('guestNotFound')}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('rsvpTitle')}</h1>
      <p>
        {t('welcome')}, {guest.firstName} {guest.lastName} ({guest.guestType})
      </p>
      
      {guest.responded ? (
        <div>
          <p>{t('alreadyResponded')} {guest.willAttend ? t('willAttend') : t('willNotAttend')}</p>
          {guest.willAttend && (
            <button
              className="bg-orange-500 text-white px-4 py-2 mt-2 rounded"
              onClick={() => navigate(`/invitation/${qrId}`)}
            >
              {t('viewInvitation')}
            </button>
          )}
        </div>
      ) : !rsvpEnabled ? (
        <p>{t('rsvpClosed')}</p>
      ) : (
        <div className="mt-4">
          <button
            className="bg-green-500 text-white px-4 py-2 mr-2 rounded"
            onClick={() => handleRsvp(true)}
          >
            {t('willAttend')}
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={() => handleRsvp(false)}
          >
            {t('willNotAttend')}
          </button>
        </div>
      )}

      {(guest.guestType === 'VIP' || guest.guestType === 'Employee') && guest.willAttend && (
        <PlusOneForm qrId={qrId} />
      )}
    </div>
  );
};

const PlusOneForm = ({ qrId }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/public/add-plusone/${qrId}`, formData);
      setSuccess(t('plusOneAdded'));
      setFormData({ firstName: '', lastName: '', email: '' });
    } catch (err) {
      setError(err.response?.data?.message || t('error'));
      console.error('PlusOne submit error:', err);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold">{t('addPlusOne')}</h2>
      {success && <p className="text-green-500">{success}</p>}
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-2">
        <div className="mb-2">
          <label>{t('firstName')}</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="mb-2">
          <label>{t('lastName')}</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="mb-2">
          <label>{t('email')}</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="border p-2 w-full"
            required
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          {t('register')}
        </button>
      </form>
    </div>
  );
};

export default Rsvp;