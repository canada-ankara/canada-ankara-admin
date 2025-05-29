import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import ConfirmModal from './ConfirmModal';
import waitGif from '../assets/wait.gif';

const AdminSettings = () => {
  const { t } = useTranslation();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [confirmModalAction, setConfirmModalAction] = useState(() => {});
  const [error, setError] = useState('');
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [failedRows, setFailedRows] = useState([]);
  const [isErrorTableOpen, setIsErrorTableOpen] = useState(false);
  const [errorHeaders, setErrorHeaders] = useState([]);
  const [editedRows, setEditedRows] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkRsvpStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError(`${t('error')}: ${t('noAuthToken')}`);
        setIsErrorModalOpen(true);
        return;
      }

      try {
        const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/public/rsvp-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('RSVP durumu alındı:', response.data);
        setRsvpEnabled(response.data.rsvpEnabled);
        setError('');
      } catch (error) {
        console.error('RSVP durumu alma hatası:', error);
        let errorMessage = t('rsvpStatusFetchFailed');
        if (error.response) {
          if (error.response.status === 401) {
            errorMessage = t('unauthorizedError');
          } else if (error.response.status === 500) {
            errorMessage = error.response.data.message || t('serverError');
          }
        } else if (error.request) {
          errorMessage = t('networkError');
        }
        setError(`${t('error')}: ${errorMessage}`);
        setIsErrorModalOpen(true);
      }
    };

    const checkTelegramStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError(`${t('error')}: ${t('noAuthToken')}`);
        setIsErrorModalOpen(true);
        return;
      }

      try {
        const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/telegram-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Telegram durumu alındı:', response.data);
        setTelegramEnabled(response.data.telegramEnabled);
        setError('');
      } catch (error) {
        console.error('Telegram durumu alma hatası:', error);
        let errorMessage = t('telegramStatusFetchFailed');
        if (error.response) {
          if (error.response.status === 401) {
            errorMessage = t('unauthorizedError');
          } else if (error.response.status === 500) {
            errorMessage = error.response.data.message || t('serverError');
          }
        } else if (error.request) {
          errorMessage = t('networkError');
        }
        setError(`${t('error')}: ${errorMessage}`);
        setIsErrorModalOpen(true);
      }
    };

    checkRsvpStatus();
    checkTelegramStatus();
  }, [t]);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      setError(t('error') + ': ' + t('invalidFileType'));
      setIsErrorModalOpen(true);
      return;
    }
    setIsLoading(true);
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deleteExisting', deleteExisting);

    try {
      const response = await axios.post(
        'https://my-backend-app-ndce.onrender.com/api/admin/guests/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
            'Accept-Language': t('i18n.language'),
          },
        }
      );
      alert(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        setFailedRows(response.data.errors);
        setErrorHeaders(Object.keys(response.data.errors[0].data));
        setEditedRows({});
        setIsErrorTableOpen(true);
      } else {
        setIsFileUploadModalOpen(false);
        setIsImportModalOpen(false);
      }
      setError('');
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('uploadFailed');
      setError(`${t('error')}: ${errorMessage}`);
      setIsErrorModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleImportConfirm = () => {
    setIsConfirmModalOpen(true);
    setConfirmModalAction(() => () => {
      setIsImportModalOpen(false);
      setIsFileUploadModalOpen(true);
      setIsConfirmModalOpen(false);
    });
  };

  const handleResetCheckIns = () => {
    setIsConfirmModalOpen(true);
    setConfirmModalAction(() => async () => {
      try {
        await axios.post(
          'https://my-backend-app-ndce.onrender.com/api/admin/participants/reset-checkins',
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        alert(t('checkInsReset'));
      } catch (error) {
        const errorMessage = error.response?.data?.message || t('resetCheckInsFailed');
        setError(`${t('error')}: ${errorMessage}`);
        setIsErrorModalOpen(true);
      } finally {
        setIsConfirmModalOpen(false);
      }
    });
  };

  // Güncellenmiş handleDeleteAllParticipants fonksiyonu
  const handleDeleteAllParticipants = () => {
    setIsConfirmModalOpen(true);
    setConfirmModalAction(() => async () => {
      try {
        // Önce check-in durumlarını sıfırlama
        await axios.post(
          'https://my-backend-app-ndce.onrender.com/api/admin/participants/reset-checkins',
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        // Ardından katılımcı durumlarını sıfırlama
        await axios.delete('https://my-backend-app-ndce.onrender.com/api/admin/participants', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        alert(t('participantsReset')); // Mevcut çeviri anahtarını kullanıyoruz
      } catch (error) {
        const errorMessage = error.response?.data?.message || t('deleteParticipantsFailed');
        setError(`${t('error')}: ${errorMessage}`);
        setIsErrorModalOpen(true);
      } finally {
        setIsConfirmModalOpen(false);
      }
    });
  };

  // Yeni handleDeleteAllGuests fonksiyonu
  const handleDeleteAllGuests = () => {
    setIsConfirmModalOpen(true);
    setConfirmModalAction(() => async () => {
      try {
        await axios.delete('https://my-backend-app-ndce.onrender.com/api/admin/reset-all', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        alert(t('resetAllSuccess')); // Mevcut çeviri anahtarını kullanıyoruz
      } catch (error) {
        const errorMessage = error.response?.data?.message || t('resetAllFailed');
        setError(`${t('error')}: ${errorMessage}`);
        setIsErrorModalOpen(true);
      } finally {
        setIsConfirmModalOpen(false);
      }
    });
  };

  const handleEndEvent = () => {
    setIsConfirmModalOpen(true);
    setConfirmModalAction(() => async () => {
      try {
        await axios.delete('https://my-backend-app-ndce.onrender.com/api/admin/event/end', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        alert(t('eventEndSuccess'));
      } catch (error) {
        const errorMessage = error.response?.data?.message || t('eventEndFailed');
        setError(`${t('error')}: ${errorMessage}`);
        setIsErrorModalOpen(true);
      } finally {
        setIsConfirmModalOpen(false);
      }
    });
  };

  const handleToggleRsvp = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError(`${t('error')}: ${t('noAuthToken')}`);
      setIsErrorModalOpen(true);
      return;
    }

    try {
      const response = await axios.post(
        'https://my-backend-app-ndce.onrender.com/api/public/admin/toggle-rsvp',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept-Language': t('i18n.language'),
          },
        }
      );
      setRsvpEnabled(response.data.rsvpEnabled);
      setError('');
      alert(t('rsvpToggled', { status: response.data.rsvpEnabled ? t('rsvpEnabled') : t('rsvpDisabled') }));
    } catch (error) {
      console.error('RSVP durumu değiştirme hatası:', error);
      let errorMessage = t('rsvpToggleFailed');
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = t('unauthorizedError');
        } else if (error.response.status === 404) {
          errorMessage = t('endpointNotFound');
        } else if (error.response.status === 500) {
          errorMessage = error.response.data.message || t('serverError');
        }
      } else if (error.request) {
        errorMessage = t('networkError');
      }
      setError(`${t('error')}: ${errorMessage}`);
      setIsErrorModalOpen(true);
    }
  };

  const handleToggleTelegram = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError(`${t('error')}: ${t('noAuthToken')}`);
      setIsErrorModalOpen(true);
      return;
    }

    try {
      const response = await axios.post(
        'https://my-backend-app-ndce.onrender.com/api/admin/toggle-telegram',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept-Language': t('i18n.language'),
          },
        }
      );
      setTelegramEnabled(response.data.telegramEnabled);
      setError('');
      alert(t('telegramToggled', { status: response.data.telegramEnabled ? t('telegramEnabled') : t('telegramDisabled') }));
    } catch (error) {
      console.error('Telegram durumu değiştirme hatası:', error);
      let errorMessage = t('telegramToggleFailed');
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = t('unauthorizedError');
        } else if (error.response.status === 404) {
          errorMessage = t('endpointNotFound');
        } else if (error.response.status === 500) {
          errorMessage = error.response.data.message || t('serverError');
        }
      } else if (error.request) {
        errorMessage = t('networkError');
      }
      setError(`${t('error')}: ${errorMessage}`);
      setIsErrorModalOpen(true);
    }
  };

  const handleRowEdit = (index, field, value) => {
    setEditedRows(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      },
    }));
    console.log(`Edited row ${index}, field ${field} to value: ${value}`);
  };

  const hasEdits = () => {
    return Object.keys(editedRows).length > 0;
  };

  const handleRetry = async (event) => {
    event.preventDefault();
    if (!hasEdits()) return;

    try {
      const editedIndices = Object.keys(editedRows).map(idx => parseInt(idx));
      
      console.log('Error headers:', errorHeaders);
      console.log('Edited rows before retry:', editedRows);

      const rowsToRetry = editedIndices.map(index => {
        const row = failedRows[index];
        const editedData = editedRows[index] || {};

        const qrHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('qr')) || 'qrId';
        const emailHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('email') || h.toLowerCase().replace(/[-_\s]/g, '').includes('eposta') || h.toLowerCase().replace(/[-_\s]/g, '').includes('courriel')) || 'E-mail';
        const firstNameHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('first') || h.toLowerCase().replace(/[-_\s]/g, '').includes('isim') || h.toLowerCase().replace(/[-_\s]/g, '').includes('prenom')) || 'First Name';
        const lastNameHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('last') || h.toLowerCase().replace(/[-_\s]/g, '').includes('soy') || h.toLowerCase().replace(/[-_\s]/g, '').includes('nom')) || 'Last Name';
        const guestTypeHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('guest') || h.toLowerCase().replace(/[-_\s]/g, '').includes('misafir') || h.toLowerCase().replace(/[-_\s]/g, '').includes('type')) || 'Guest Type';

        console.log(`Row ${index} - Headers mapping:`, { qrHeader, emailHeader, firstNameHeader, lastNameHeader, guestTypeHeader });
        console.log(`Row ${index} - Edited data:`, editedData);
        console.log(`Row ${index} - Original row data:`, row.data);

        const emailValue = (editedData[emailHeader] !== undefined ? editedData[emailHeader] : row.data[emailHeader] || '').toString().trim();
        const qrIdValue = (editedData[qrHeader] !== undefined ? editedData[qrHeader] : row.data[qrHeader] || '').toString().trim();
        const firstNameValue = (editedData[firstNameHeader] !== undefined ? editedData[firstNameHeader] : row.data[firstNameHeader] || '').toString().trim();
        const lastNameValue = (editedData[lastNameHeader] !== undefined ? editedData[lastNameHeader] : row.data[lastNameHeader] || '').toString().trim();
        const guestTypeValue = (editedData[guestTypeHeader] !== undefined ? editedData[guestTypeHeader] : row.data[guestTypeHeader] || '').toString().trim();

        console.log(`Row ${index} - Email value after processing:`, emailValue);

        const retryData = {
          row: row.row,
          qrId: qrIdValue,
          email: emailValue,
          firstName: firstNameValue,
          lastName: lastNameValue,
          guestType: guestTypeValue,
        };

        console.log(`Row ${index} - Retry data:`, retryData);

        return retryData;
      });

      console.log('Rows to retry:', rowsToRetry);

      const response = await axios.post(
        'https://my-backend-app-ndce.onrender.com/api/admin/guests/upload/retry',
        { rows: rowsToRetry },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Accept-Language': t('i18n.language'),
          },
        }
      );

      console.log('Retry response:', response.data);

      alert(response.data.message);

      const newErrors = response.data.errors || [];
      const successfulRows = response.data.successfulRows || [];

      const successfulRowNumbers = successfulRows.map(row => row.row);

      const updatedFailedRows = failedRows
        .map((row, index) => {
          if (successfulRowNumbers.includes(row.row)) {
            return null;
          }
          const newError = newErrors.find(err => err.row === row.row);
          if (newError) {
            const editedData = editedRows[index] || {};
            const qrHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('qr')) || 'qrId';
            const emailHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('email') || h.toLowerCase().replace(/[-_\s]/g, '').includes('eposta') || h.toLowerCase().replace(/[-_\s]/g, '').includes('courriel')) || 'E-mail';
            const firstNameHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('first') || h.toLowerCase().replace(/[-_\s]/g, '').includes('isim') || h.toLowerCase().replace(/[-_\s]/g, '').includes('prenom')) || 'First Name';
            const lastNameHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('last') || h.toLowerCase().replace(/[-_\s]/g, '').includes('soy') || h.toLowerCase().replace(/[-_\s]/g, '').includes('nom')) || 'Last Name';
            const guestTypeHeader = errorHeaders.find(h => h.toLowerCase().replace(/[-_\s]/g, '').includes('guest') || h.toLowerCase().replace(/[-_\s]/g, '').includes('misafir') || h.toLowerCase().replace(/[-_\s]/g, '').includes('type')) || 'Guest Type';

            const updatedData = {
              [qrHeader]: (editedData[qrHeader] !== undefined ? editedData[qrHeader] : row.data[qrHeader] || '').toString().trim(),
              [emailHeader]: (editedData[emailHeader] !== undefined ? editedData[emailHeader] : row.data[emailHeader] || '').toString().trim(),
              [firstNameHeader]: (editedData[firstNameHeader] !== undefined ? editedData[firstNameHeader] : row.data[firstNameHeader] || '').toString().trim(),
              [lastNameHeader]: (editedData[lastNameHeader] !== undefined ? editedData[lastNameHeader] : row.data[lastNameHeader] || '').toString().trim(),
              [guestTypeHeader]: (editedData[guestTypeHeader] !== undefined ? editedData[guestTypeHeader] : row.data[guestTypeHeader] || '').toString().trim(),
            };

            return {
              row: newError.row,
              data: updatedData,
              errors: newError.errors,
              errorFields: newError.errorFields,
            };
          }
          return row;
        })
        .filter(row => row !== null);

      const remainingEdits = {};
      updatedFailedRows.forEach((row, idx) => {
        const originalIndex = failedRows.findIndex(r => r.row === row.row);
        if (editedRows[originalIndex]) {
          remainingEdits[idx] = editedRows[originalIndex];
        }
      });

      console.log('Updated failed rows:', updatedFailedRows);
      console.log('Remaining edits:', remainingEdits);

      setFailedRows(updatedFailedRows);
      setEditedRows(remainingEdits);

      if (updatedFailedRows.length > 0) {
        const newHeaders = Object.keys(updatedFailedRows[0].data);
        setErrorHeaders([...new Set(newHeaders)]);
        setIsErrorTableOpen(true);
      } else {
        setIsErrorTableOpen(false);
        setFailedRows([]);
        setIsFileUploadModalOpen(false);
        setIsImportModalOpen(false);
      }
    } catch (error) {
      setError(`${t('error')}: ${error.response?.data?.message || t('retryFailed')}`);
      setIsErrorModalOpen(true);
      console.error('Retry error:', error.response?.data);
    }
  };

  const handleIgnoreErrors = () => {
    setIsErrorTableOpen(false);
    setFailedRows([]);
    setIsFileUploadModalOpen(false);
    setIsImportModalOpen(false);
    setEditedRows({});
  };

  const getInputClass = (row, header) => {
    const errorFields = row.errorFields || [];
    const headerLower = header.toLowerCase().replace(/[-_\s]/g, '');

    console.log(`Row ${row.row} - Header: ${header}, ErrorFields:`, errorFields);

    const isInvalid =
      (errorFields.includes('email') &&
        (headerLower.includes('email') ||
          headerLower.includes('eposta') ||
          headerLower.includes('courriel'))) ||
      (errorFields.includes('firstName') &&
        (headerLower.includes('first') ||
          headerLower.includes('isim') ||
          headerLower.includes('prenom'))) ||
      (errorFields.includes('lastName') &&
        (headerLower.includes('last') ||
          headerLower.includes('soy') ||
          headerLower.includes('nom'))) ||
      (errorFields.includes('guestType') &&
        (headerLower.includes('guest') ||
          headerLower.includes('misafir') ||
          headerLower.includes('type'))) ||
      (errorFields.includes('qrId') &&
        (headerLower.includes('qr') || headerLower.includes('qrid')));

    const inputClass = isInvalid ? 'form-control is-invalid' : 'form-control';
    console.log(`Row ${row.row} - Header: ${header}, Class: ${inputClass}`);

    return inputClass;
  };

  const translateError = (errors) => {
    return errors.map(error => {
      const match = error.match(/(.+?)\s*\(satır:\s*(\d+)\)/) || error.match(/(.+?)\s*\(row:\s*(\d+)\)/) || error.match(/(.+?)\s*\(ligne:\s*(\d+)\)/);
      if (match) {
        const baseError = match[1].trim();
        const rowNumber = match[2];
        const translationKeys = [
          'invalidEmail',
          'missingFirstName',
          'missingLastName',
          'missingQrId',
          'duplicateEmailInFile',
          'duplicateEmailInDb',
          'duplicateQrIdInDb',
          'plusOneNotAllowed',
          'invalidGuestType'
        ];
        for (const key of translationKeys) {
          if (t(key, { row: rowNumber }).includes(baseError)) {
            return t(key, { row: rowNumber });
          }
        }
      }
      return t(error) || error;
    });
  };

  return (
    <div className="container-custom mt-5">
      <style>
        {`
          .error-table-header th {
            background-color: #ffffff !important;
            color: #f97316 !important;
            font-weight: bold !important;
            border-color: #f97316 !important;
          }
          .error-table-header th:hover {
            background-color: #f0f0f0 !important;
          }
        `}
      </style>
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">{t('adminSettings')}</h4>
              <div className="d-flex flex-column">
                <div className="mb-3 d-flex align-items-center form-check-label">
                  <h5 className="me-3 col-md-6">{t('toggleRsvp')}</h5>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input col-md-6"
                      id="rsvpToggle"
                      checked={rsvpEnabled}
                      onChange={handleToggleRsvp}
                    />
                    <label className="form-check-label" htmlFor="rsvpToggle">
                      {rsvpEnabled ? t('rsvpEnabled') : t('rsvpDisabled')}
                    </label>
                  </div>
                </div>
                <div className="mb-3 d-flex align-items-center form-check-label">
                  <h5 className="me-3 col-md-6">{t('toggleTelegram')}</h5>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input col-md-6"
                      id="telegramToggle"
                      checked={telegramEnabled}
                      onChange={handleToggleTelegram}
                    />
                    <label className="form-check-label" htmlFor="telegramToggle">
                      {telegramEnabled ? t('telegramEnabled') : t('telegramDisabled')}
                    </label>
                  </div>
                </div>
                <button
                  onClick={handleImportClick}
                  className="btn btn-canada mb-3"
                >
                  {t('importGuests')}
                </button>
                <button
                  onClick={handleResetCheckIns}
                  className="btn btn-canada mb-3"
                >
                  {t('resetCheckIns')}
                </button>
                <button
                  onClick={handleDeleteAllParticipants}
                  className="btn btn-canada mb-3"
                >
                  {t('deleteAllParticipants')}
                </button>
                {/* Yeni Tüm Misafirleri Sil Butonu */}
                <button
                  onClick={handleDeleteAllGuests}
                  className="btn btn-danger mb-3"
                >
                  {t('deleteAllGuests')}
                </button>
                <button
                  onClick={handleEndEvent}
                  className="btn btn-danger fw-bold"
                >
                  {t('endEvent')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isImportModalOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('importGuests')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsImportModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="form-check mb-3">
                  <input
                    type="radio"
                    name="importOption"
                    id="deleteExisting"
                    value="delete"
                    checked={deleteExisting}
                    onChange={() => setDeleteExisting(true)}
                    className="form-check-input"
                  />
                  <label htmlFor="deleteExisting" className="form-check-label">
                    {t('deleteExistingGuests')}
                  </label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    name="importOption"
                    id="keepExisting"
                    value="keep"
                    checked={!deleteExisting}
                    onChange={() => setDeleteExisting(false)}
                    className="form-check-input"
                  />
                  <label htmlFor="keepExisting" className="form-check-label">
                    {t('keepExistingGuests')}
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-canada-secondary"
                  onClick={() => setIsImportModalOpen(false)}
                >
                  {t('close_button')}
                </button>
                <button
                  type="button"
                  className="btn btn-canada"
                  onClick={handleImportConfirm}
                >
                  {t('continue')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFileUploadModalOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('uploadExcel')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsFileUploadModalOpen(false)}
                  disabled={isLoading}
                ></button>
              </div>
              <div className="modal-body">
                <div
                  {...getRootProps()}
                  className={`dropzone p-5 text-center ${isDragActive ? 'drag-active' : ''}`}
                  style={{
                    border: '2px dashed #f97316',
                    borderRadius: '5px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    pointerEvents: isLoading ? 'none' : 'auto',
                  }}
                >
                  <input {...getInputProps()} disabled={isLoading} />
                  {isDragActive ? (
                    <p>{t('dropFileHere')}</p>
                  ) : (
                    <p>{t('dragDropOrClick')}</p>
                  )}
                </div>
                {error && <div className="text-danger mt-3">{error}</div>}
                <div className="mt-3">
                  <p>{t('excelHeadersInstruction')}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-canada-secondary"
                  onClick={() => setIsFileUploadModalOpen(false)}
                  disabled={isLoading}
                >
                  {t('close_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <img
            src={waitGif}
            alt="Yükleniyor..."
            style={{ width: '100px', height: '100px' }}
          />
        </div>
      )}

      {isErrorTableOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('failedRowsTitle')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsErrorTableOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{t('failedRowsMessage')}</p>
                <div className="error-table-container table-responsive">
                  <table className="table table-bordered">
                    <thead className="error-table-header">
                      <tr>
                        <th className="row-number-column">{t('rowNumber')}</th>
                        {errorHeaders.map((header, index) => (
                          <th
                            key={index}
                            className={
                              header.toLowerCase().includes('qr')
                                ? 'qr-id-column'
                                : header.toLowerCase().includes('email') || header.toLowerCase().includes('eposta') || header.toLowerCase().includes('courriel')
                                ? 'email-column'
                                : header.toLowerCase().includes('first') || header.toLowerCase().includes('isim') || header.toLowerCase().includes('prenom')
                                ? 'first-name-column'
                                : header.toLowerCase().includes('last') || header.toLowerCase().includes('soy') || header.toLowerCase().includes('nom')
                                ? 'last-name-column'
                                : header.toLowerCase().includes('guest') || header.toLowerCase().includes('misafir') || header.toLowerCase().includes('type')
                                ? 'guest-type-column'
                                : ''
                            }
                          >
                            {header}
                          </th>
                        ))}
                        <th className="error-column">{t('error')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedRows.map((row, index) => (
                        <tr key={index}>
                          <td className="row-number-column">{row.row}</td>
                          {errorHeaders.map((header, hIndex) => (
                            <td
                              key={hIndex}
                              className={
                                header.toLowerCase().includes('qr')
                                  ? 'qr-id-column'
                                  : header.toLowerCase().includes('email') || header.toLowerCase().includes('eposta') || header.toLowerCase().includes('courriel')
                                  ? 'email-column'
                                  : header.toLowerCase().includes('first') || header.toLowerCase().includes('isim') || header.toLowerCase().includes('prenom')
                                  ? 'first-name-column'
                                  : header.toLowerCase().includes('last') || header.toLowerCase().includes('soy') || header.toLowerCase().includes('nom')
                                  ? 'last-name-column'
                                  : header.toLowerCase().includes('guest') || header.toLowerCase().includes('misafir') || header.toLowerCase().includes('type')
                                  ? 'guest-type-column'
                                  : ''
                              }
                            >
                              {header.toLowerCase().replace(/[-_\s]/g, '').includes('guest') ||
                              header.toLowerCase().replace(/[-_\s]/g, '').includes('misafir') ||
                              header.toLowerCase().replace(/[-_\s]/g, '').includes('type') ? (
                                <select
                                  className={getInputClass(row, header)}
                                  value={editedRows[index]?.[header] ?? row.data[header] ?? ''}
                                  onChange={(e) => handleRowEdit(index, header, e.target.value)}
                                >
                                  <option value="">{t('selectGuestType')}</option>
                                  <option value="REGULAR">{t('regular')}</option>
                                  <option value="VIP">{t('vip')}</option>
                                  <option value="EMPLOYEE">{t('employee')}</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className={getInputClass(row, header)}
                                  value={editedRows[index]?.[header] ?? row.data[header] ?? ''}
                                  onChange={(e) => handleRowEdit(index, header, e.target.value)}
                                />
                              )}
                            </td>
                          ))}
                          <td className="error-column">
                            <ul>
                              {translateError(row.errors).map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-canada-secondary"
                  onClick={handleIgnoreErrors}
                >
                  {t('ignoreFailedRows')}
                </button>
                <button
                  type="button"
                  className={`btn btn-canada ${!hasEdits() ? 'disabled' : ''}`}
                  onClick={handleRetry}
                  disabled={!hasEdits()}
                >
                  {t('retry')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmModalAction}
        message={t('confirmAction')}
      />

      {isErrorModalOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('error')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsErrorModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{error}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-canada-secondary"
                  onClick={() => setIsErrorModalOpen(false)}
                >
                  {t('close_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;