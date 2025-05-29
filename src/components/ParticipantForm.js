import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const ParticipantForm = ({ onSuccess, editParticipant }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    guestType: 'Regular',
    selectedInviterId: '',
  });
  const [inviters, setInviters] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editParticipant) {
      setFormData({
        firstName: editParticipant.firstName,
        lastName: editParticipant.lastName,
        email: editParticipant.email,
        guestType: editParticipant.guestType,
        selectedInviterId: editParticipant.selectedInviterId || '',
      });
    }
  }, [editParticipant]);

  useEffect(() => {
    const fetchInviters = async () => {
      try {
        const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/guests/employee-vip', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setInviters(response.data.inviters);
      } catch (error) {
        console.error('Davet edenler alınamadı:', error);
      }
    };
    fetchInviters();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = t('firstNameRequired');
    if (!formData.lastName) newErrors.lastName = t('lastNameRequired');
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('emailInvalid');
    }
    if (formData.guestType === 'PlusOne' && !formData.selectedInviterId) {
      newErrors.selectedInviterId = t('inviterRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = editParticipant
        ? `https://my-backend-app-ndce.onrender.com/api/admin/guests/${editParticipant._id}`
        : 'https://my-backend-app-ndce.onrender.com/api/admin/guests';
      const method = editParticipant ? 'put' : 'post';

      await axios({
        method,
        url,
        data: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      onSuccess();
      alert(editParticipant ? t('updateSuccess') : t('addSuccess'));
    } catch (error) {
      alert(`${t('error')}: ${error.response?.data?.message || t('operationFailed')}`);
    }
  };

  return (
    <form id="participantForm" onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="firstName" className="form-label">{t('firstName')}</label>
        <input
          type="text"
          className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
        />
        {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="lastName" className="form-label">{t('lastName')}</label>
        <input
          type="text"
          className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
        />
        {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="email" className="form-label">{t('email')}</label>
        <input
          type="email"
          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="guestType" className="form-label">{t('guestType')}</label>
        <select
          className="form-select"
          id="guestType"
          name="guestType"
          value={formData.guestType}
          onChange={handleChange}
        >
          <option value="Employee">{t('employee')}</option>
          <option value="Regular">{t('regular')}</option>
          <option value="VIP">{t('vip')}</option>
          <option value="PlusOne">{t('plusone')}</option>
        </select>
      </div>
      {formData.guestType === 'PlusOne' && (
        <div className="mb-3">
          <label htmlFor="selectedInviterId" className="form-label">{t('selectInviter')}</label>
          <select
            className={`form-select ${errors.selectedInviterId ? 'is-invalid' : ''}`}
            id="selectedInviterId"
            name="selectedInviterId"
            value={formData.selectedInviterId}
            onChange={handleChange}
          >
            <option value="">{t('selectInviter')}</option>
            {inviters.map((inviter) => (
              <option key={inviter._id} value={inviter._id}>
                {inviter.firstName} {inviter.lastName}
              </option>
            ))}
          </select>
          {errors.selectedInviterId && (
            <div className="invalid-feedback">{errors.selectedInviterId}</div>
          )}
        </div>
      )}
      <button type="submit" className="btn btn-primary">
        {t('save')}
      </button>
    </form>
  );
};

export default ParticipantForm;