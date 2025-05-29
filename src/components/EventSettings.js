import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';
import * as XLSX from 'xlsx';
// Yeni eklenen import: Yükleme göstergesi için GIF dosyası
import loadingGif from '../assets/wait.gif';

const EventSettings = () => {
  const { t } = useTranslation();
  const [guests, setGuests] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    email: '',
    guestType: 'REGULAR',
    selectedInviterId: null,
  });
  const [editGuest, setEditGuest] = useState(null);
  const [addGuestModalOpen, setAddGuestModalOpen] = useState(false);
  const [editGuestModalOpen, setEditGuestModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(() => {});
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [inviters, setInviters] = useState([]);
  const [inviterSearchTerm, setInviterSearchTerm] = useState('');
  const [plusOneName, setPlusOneName] = useState('');
  // Yeni eklenen state: Excel aktarımı sırasında yükleme durumunu takip eder
  const [isExporting, setIsExporting] = useState(false);

  const fetchGuests = async (page, search) => {
    try {
      const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/guests', {
        params: { page: page + 1, limit: 10, search },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setGuests(response.data.guests);
      setPageCount(response.data.totalPages);
      setSelectedGuests([]);
    } catch (error) {
      console.error('Davetli listeleme hatası:', error);
      alert(`${t('error')}: ${error.response?.data?.message || t('fetchGuestsFailed')}`);
    }
  };

  const fetchAllGuests = async (search) => {
    try {
      const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/guests', {
        params: { limit: 'all', search },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.data.guests;
    } catch (error) {
      console.error('Tüm davetlileri alma hatası:', error);
      alert(`${t('error')}: ${error.response?.data?.message || t('fetchAllGuestsFailed')}`);
      return [];
    }
  };

  const fetchInviters = async (search = '') => {
    try {
      console.log('fetchInviters çağrıldı, arama terimi:', search);
      const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/guests/employee-vip', {
        params: { search },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log('Backend\'den gelen davet edenler:', response.data.inviters);
      setInviters(response.data.inviters);
    } catch (error) {
      console.error('Davet eden listeleme hatası:', error);
      alert(`${t('error')}: ${error.response?.data?.message || t('fetchInvitersFailed')}`);
      setInviters([]);
    }
  };

  useEffect(() => {
    if ((addGuestModalOpen && newGuest.guestType === 'PLUSONE') || (editGuestModalOpen && editGuest?.guestType === 'PLUSONE')) {
      console.log('useEffect tetiklendi, inviterSearchTerm:', inviterSearchTerm);
      fetchInviters(inviterSearchTerm);
    } else {
      setInviters([]);
    }
  }, [addGuestModalOpen, newGuest.guestType, editGuestModalOpen, editGuest?.guestType, inviterSearchTerm]);

  const getPlusOneName = async (plusOneQrId) => {
    if (!plusOneQrId || plusOneQrId === 'NA') {
      console.log('PlusOne QR ID boş veya NA:', plusOneQrId);
      return '';
    }
    
    try {
      console.log('PlusOne araniyor, QR ID:', plusOneQrId);
      const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/guests', {
        params: { limit: 'all' },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
            
      const plusOneGuest = response.data.guests.find((guest) => {
        console.log(`Misafir kontrol ediliyor: ${guest.firstName} ${guest.lastName}, QR: ${guest.qrId}, Type: ${guest.guestType}`);
        return guest.qrId === plusOneQrId && guest.guestType === 'PLUSONE';
      });
      
      if (plusOneGuest) {
        const fullName = `${plusOneGuest.firstName} ${plusOneGuest.lastName}`;
        console.log('PlusOne misafir bulundu:', fullName);
        return fullName;
      } else {
        console.log('PlusOne misafir bulunamadı, QR ID:', plusOneQrId);
        const anyGuestWithQrId = response.data.guests.find((guest) => guest.qrId === plusOneQrId);
        if (anyGuestWithQrId) {
          console.log('QR ID ile eşleşen misafir bulundu ama PLUSONE değil:', anyGuestWithQrId);
          return `${anyGuestWithQrId.firstName} ${anyGuestWithQrId.lastName}`;
        }
        return t('unknownGuest');
      }
    } catch (error) {
      console.error('PlusOne ismi alma hatası:', error);
      return t('unknownGuest');
    }
  };

  const handleOpenRsvpLink = (qrId) => {
    if (qrId) {
      window.open(`/rsvp/${qrId}`, '_blank');
    } else {
      alert(t('qrIdNotFound'));
    }
  };

  useEffect(() => {
    fetchGuests(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if ((addGuestModalOpen && newGuest.guestType === 'PLUSONE') || (editGuestModalOpen && editGuest?.guestType === 'PLUSONE')) {
      fetchInviters(inviterSearchTerm);
    }
  }, [addGuestModalOpen, newGuest.guestType, editGuestModalOpen, editGuest?.guestType, inviterSearchTerm]);

  useEffect(() => {
    if (editGuestModalOpen && editGuest?.plusOneQrId && editGuest.plusOneQrId !== 'NA') {
      getPlusOneName(editGuest.plusOneQrId).then((name) => setPlusOneName(name));
    } else {
      setPlusOneName('');
    }
  }, [editGuestModalOpen, editGuest?.plusOneQrId]);

  const handlePageClick = (data) => {
    setCurrentPage(data.selected);
  };

  const handleAddGuest = () => {
    if (!newGuest.firstName || !newGuest.lastName || !newGuest.email || !newGuest.guestType) {
      alert(t('empty_fields'));
      return;
    }
    if (newGuest.guestType === 'PLUSONE' && !newGuest.selectedInviterId) {
      alert(t('inviter_required'));
      return;
    }
    setModalMessage(newGuest.guestType === 'PLUSONE' ? t('confirmAddPlusOne') : t('confirmAddGuest'));
    setModalAction(() => async () => {
      try {
        await axios.post('https://my-backend-app-ndce.onrender.com/api/admin/guests', newGuest, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setNewGuest({ firstName: '', lastName: '', email: '', guestType: 'REGULAR', selectedInviterId: null });
        setInviterSearchTerm('');
        setAddGuestModalOpen(false);
        setModalOpen(false);
        fetchGuests(currentPage, searchTerm);
        alert(newGuest.guestType === 'PLUSONE' ? t('addPlusOneSuccess') : t('participantAdded'));
      } catch (error) {
        console.error('Davetli ekleme hatası:', error);
        alert(`${t('error')}: ${error.response?.data?.message || t('addGuestFailed')}`);
        setModalOpen(false);
      }
    });
    setModalOpen(true);
  };

  const handleExportToExcel = async () => {
    // Yükleme göstergesini göster
    setIsExporting(true);
    try {
      const allGuests = await fetchAllGuests(searchTerm);
      if (!allGuests || allGuests.length === 0) {
        alert(t('noGuestsFound'));
        return;
      }

      const headers = [
        t('firstName'),
        t('lastName'),
        t('email'),
        t('guestType'),
        t('qrId'),
        t('plusOneQrId'),
        t('responded'),
        t('willAttend'),
        t('isCheckedIn'),
        t('checkInTime'),
      ];

      const data = allGuests.map((guest) => ({
        [t('firstName')]: guest.firstName,
        [t('lastName')]: guest.lastName,
        [t('email')]: guest.email,
        [t('guestType')]: guest.guestType,
        [t('qrId')]: guest.qrId || '',
        [t('plusOneQrId')]: guest.plusOneQrId || '',
        [t('responded')]: guest.responded ? t('yes') : t('no'),
        [t('willAttend')]: guest.willAttend ? t('yes') : t('no'),
        [t('isCheckedIn')]: guest.isCheckedIn ? t('yes') : t('no'),
        [t('checkInTime')]: guest.checkInTime ? new Date(guest.checkInTime).toLocaleString() : '',
      }));

      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Guests');
      XLSX.writeFile(wb, `guests_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel aktarma hatası:', error);
      alert(`${t('error')}: ${t('exportToExcel')} ${t('failed')}`);
    } finally {
      // Yükleme göstergesini kaldır
      setIsExporting(false);
    }
  };

  const handleEdit = (guest) => {
    setEditGuest({
      _id: guest._id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      guestType: guest.guestType,
      selectedInviterId: guest.guestType === 'PLUSONE' ? guest.selectedInviterId : null,
      plusOneQrId: guest.plusOneQrId || null,
    });
    setEditGuestModalOpen(true);
  };

  const handleUpdateGuest = () => {
    if (!editGuest.firstName || !editGuest.lastName || !editGuest.email || !editGuest.guestType) {
      alert(t('empty_fields'));
      return;
    }
    if (editGuest.guestType === 'PLUSONE' && !editGuest.selectedInviterId) {
      alert(t('inviter_required'));
      return;
    }
    setModalMessage(t('confirmUpdateGuest'));
    setModalAction(() => async () => {
      try {
        const payload = {
          firstName: editGuest.firstName,
          lastName: editGuest.lastName,
          email: editGuest.email,
          guestType: editGuest.guestType,
          selectedInviterId: editGuest.guestType === 'PLUSONE' ? editGuest.selectedInviterId : null,
        };
        await axios.put(`https://my-backend-app-ndce.onrender.com/api/admin/guests/${editGuest._id}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setEditGuestModalOpen(false);
        setEditGuest(null);
        setPlusOneName('');
        fetchGuests(currentPage, searchTerm);
        alert(t('participantUpdated'));
      } catch (error) {
        console.error('Davetli güncelleme hatası:', error);
        alert(`${t('error')}: ${error.response?.data?.message || t('updateGuestFailed')}`);
      }
      setModalOpen(false);
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    const guest = guests.find((g) => g._id === id);
    setModalMessage(guest.plusOneQrId && guest.plusOneQrId !== 'NA' ? t('confirmDeleteWithPlusOne') : t('confirmDelete'));
    setModalAction(() => async () => {
      try {
        await axios.delete(`https://my-backend-app-ndce.onrender.com/api/admin/guests/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        fetchGuests(currentPage, searchTerm);
        setSelectedGuests((prev) => prev.filter((selectedId) => selectedId !== id));
        alert(t('deleteSuccess'));
      } catch (error) {
        console.error('Davetli silme hatası:', error);
        alert(`${t('error')}: ${error.response?.data?.message || t('deleteFailed')}`);
      }
      setModalOpen(false);
    });
    setModalOpen(true);
  };

  const handleToggleAttend = (id) => {
    const guest = guests.find((g) => g._id === id);
    setModalMessage(guest.willAttend ? t('confirmNotAttend') : t('confirmAttend'));
    setModalAction(() => async () => {
      try {
        await axios.put(`https://my-backend-app-ndce.onrender.com/api/admin/guests/${id}/toggle-attend`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setModalOpen(false);
        fetchGuests(currentPage, searchTerm);
        alert(t('participantUpdated'));
      } catch (error) {
        console.error('Katılım durumu güncelleme hatası:', error);
        alert(`${t('error')}: ${error.response?.data?.message || t('updateGuestFailed')}`);
        setModalOpen(false);
      }
    });
    setModalOpen(true);
  };

  const handleRemoveInvited = (guestId, plusOneQrId) => {
    setModalMessage(t('confirmRemoveInvited'));
    setModalAction(() => async () => {
      let plusOneDeleted = false;
      try {
        if (plusOneQrId && plusOneQrId !== 'NA') {
          try {
            const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/guests', {
              params: { limit: 'all' },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });

            const plusOneGuest = response.data.guests.find((g) => g.qrId === plusOneQrId && g.guestType === 'PLUSONE');

            if (plusOneGuest) {
              await axios.delete(`https://my-backend-app-ndce.onrender.com/api/admin/guests/${plusOneGuest._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              });
              console.log('PlusOne misafir başarıyla silindi:', plusOneGuest._id);
              plusOneDeleted = true;
            } else {
              console.log('PlusOne misafir bulunamadı. QR ID:', plusOneQrId);
            }
          } catch (error) {
            console.error('PlusOne misafir silme hatası:', error.response?.data || error.message);
            console.log('PlusOne silme başarısız, işleme devam ediliyor...');
          }
        } else {
          console.log('PlusOneQrId boş veya NA, silme işlemi atlanıyor.');
        }

        await axios.put(
          `https://my-backend-app-ndce.onrender.com/api/admin/guests/${guestId}`,
          { plusOneQrId: '' },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        console.log('Ana davetlinin plusOneQrId başarıyla temizlendi');

        await fetchGuests(currentPage, searchTerm);
        setPlusOneName('');
        alert(plusOneDeleted ? t('removeInvitedSuccess') : t('removeInvitedSuccessNoPlusOne'));

      } catch (error) {
        console.error('handleRemoveInvited hatası:', error.response?.data || error.message);
        alert(`${t('error')}: ${error.response?.data?.messageKey ? t(error.response.data.messageKey) : t('removeInvitedFailed')}`);
      } finally {
        setModalOpen(false);
      }
    });
    setModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedGuests.length === 0) return;
    setModalMessage(t('confirmBulkDeleteWithPlusOne'));
    setModalAction(() => async () => {
      try {
        await Promise.all(
          selectedGuests.map(async (id) => {
            await axios.delete(`https://my-backend-app-ndce.onrender.com/api/admin/guests/${id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
          })
        );
        fetchGuests(currentPage, searchTerm);
        setSelectedGuests([]);
        alert(t('bulkDeleteSuccess'));
      } catch (error) {
        console.error('Toplu silme hatası:', error);
        alert(`${t('error')}: ${error.response?.data?.message || t('bulkDeleteFailed')}`);
      }
      setModalOpen(false);
    });
    setModalOpen(true);
  };

  const inviterOptions = inviters.map((inviter) => ({
    value: inviter._id,
    label: `${inviter.firstName} ${inviter.lastName}`,
  }));

  const handleRowClick = (id) => {
    setSelectedGuests((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  return (
    <div className="container-custom mt-5">
      <style>
        {`
          .action-buttons {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 4px;
          }

          .actions-column {
            min-width: 150px;
          }
          .btn-canada.btn-sm i {
            font-size: 14px;
          }

          .btn-attend {
            background-color: #28a745;
            color: white;
            border: none;
          }
          .btn-attend:hover {
            background-color: #218838;
          }
          .btn-not-attend {
            background-color: #dc3545;
            color: white;
            border: none;
          }
          .btn-not-attend:hover {
            background-color: #c82333;
          }
          /* Yeni eklenen stiller: Yükleme göstergesi için */
          .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
          }
          .loading-spinner {
            width: 100px;
            height: 100px;
          }
        `}
      </style>
      <div className="row justify-content-center">
        <div className="col-md-11">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">{t('eventSettings')}</h4>
              <div className="filter-container d-flex align-items-center">
                {selectedGuests.length > 0 && (
                  <span
                    onClick={handleBulkDelete}
                    className="text-orange me-3"
                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {t('deleteSelected')}
                  </span>
                )}
                <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                <div className="ms-auto d-flex">
                  <button 
                    onClick={handleExportToExcel} 
                    className="btn btn-canada me-2"
                    disabled={isExporting} // Yükleme sırasında butonu devre dışı bırak
                  >
                    {t('exportToExcel')}
                  </button>
                  <button 
                    onClick={() => setAddGuestModalOpen(true)} 
                    className="btn btn-canada"
                    disabled={isExporting} // Yükleme sırasında butonu devre dışı bırak
                  >
                    {t('addParticipant')}
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-dark table-striped">
                  <thead>
                    <tr>
                      <th>{t('firstName')}</th>
                      <th>{t('lastName')}</th>
                      <th>{t('email')}</th>
                      <th>{t('guestType')}</th>
                      <th >{t('qrId')}</th>
                      <th >{t('plusOneQrId')}</th>
                      <th>{t('responded')}</th>
                      <th>{t('willAttend')}</th>
                      <th>{t('isCheckedIn')}</th>
                      <th>{t('checkInTime')}</th>
                      <th >{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr
                        key={guest._id}
                        className={`participant-row ${selectedGuests.includes(guest._id) ? 'selected-row' : ''}`}
                        onClick={() => handleRowClick(guest._id)}
                      >
                        <td>{guest.firstName}</td>
                        <td>{guest.lastName}</td>
                        <td>{guest.email}</td>
                        <td>{guest.guestType}</td>
                        <td className="qr-id-column">{guest.qrId}</td>
                        <td className="plus-one-qr-id-column">{guest.plusOneQrId || ''}</td>
                        <td>{guest.responded ? t('yes') : t('no')}</td>
                        <td>{guest.willAttend ? t('yes') : t('no')}</td>
                        <td>{guest.isCheckedIn ? t('yes') : t('no')}</td>
                        <td>{guest.checkInTime ? new Date(guest.checkInTime).toLocaleString() : ''}</td>
                        <td className="action-buttons">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAttend(guest._id);
                            }}
                            className={`btn btn-canada btn-sm ${guest.willAttend ? 'btn-not-attend' : 'btn-attend'}`}
                            title={guest.willAttend ? t('notAttend') : t('attend')}
                            disabled={isExporting} // Yükleme sırasında butonu devre dışı bırak
                          >
                            <i className={`fas ${guest.willAttend ? 'fa-times' : 'fa-check'}`}></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(guest);
                            }}
                            className="btn btn-canada btn-sm me-1"
                            title={t('editParticipant')}
                            disabled={isExporting} // Yükleme sırasında butonu devre dışı bırak
                          >
                            <i className="fas fa-pencil-alt"></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(guest._id);
                            }}
                            className="btn btn-canada btn-sm me-1"
                            title={t('delete')}
                            disabled={isExporting} // Yükleme sırasında butonu devre dışı bırak
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRsvpLink(guest.qrId);
                            }}
                            className="btn btn-canada btn-sm"
                            title={t('openRsvpLink')}
                            disabled={isExporting} // Yükleme sırasında butonu devre dışı bırak
                          >
                            <i className="fas fa-link"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination-container">
                <ReactPaginate
                  previousLabel={t('previous')}
                  nextLabel={t('next')}
                  pageCount={pageCount}
                  onPageChange={handlePageClick}
                  containerClassName="pagination justify-content-center"
                  pageClassName="page-item"
                  pageLinkClassName="page-link"
                  previousClassName="page-item"
                  previousLinkClassName="page-link"
                  nextClassName="page-item"
                  nextLinkClassName="page-link"
                  activeClassName="active"
                  disabledClassName="disabled"
                  disabled={isExporting} // Yükleme sırasında sayfalama devre dışı
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Yeni eklenen yükleme göstergesi */}
      {isExporting && (
        <div className="loading-overlay">
          <img src={loadingGif} alt="Yükleniyor..." className="loading-spinner" />
        </div>
      )}
      {addGuestModalOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('addParticipant')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAddGuestModalOpen(false)}
                  disabled={isExporting} // Yükleme sırasında kapatma butonu devre dışı
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-3">
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder={t('firstName')}
                      value={newGuest.firstName}
                      onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                      disabled={isExporting} // Yükleme sırasında input devre dışı
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder={t('lastName')}
                      value={newGuest.lastName}
                      onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                      disabled={isExporting} // Yükleme sırasında input devre dışı
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="email"
                      className="form-control mb-2"
                      placeholder={t('email')}
                      value={newGuest.email}
                      onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                      disabled={isExporting} // Yükleme sırasında input devre dışı
                    />
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-control mb-2"
                      value={newGuest.guestType}
                      onChange={(e) => setNewGuest({ ...newGuest, guestType: e.target.value, selectedInviterId: e.target.value === 'PLUSONE' ? null : null })}
                      disabled={isExporting} // Yükleme sırasında select devre dışı
                    >
                      <option value="REGULAR">REGULAR</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="VIP">VIP</option>
                      <option value="PLUSONE">PLUSONE</option>
                    </select>
                  </div>
                  {newGuest.guestType === 'PLUSONE' && (
                    <div className="col-md-6">
                      <Select
                        options={inviterOptions}
                        onChange={(option) => setNewGuest({ ...newGuest, selectedInviterId: option ? option.value : null })}
                        onInputChange={(input) => setInviterSearchTerm(input)}
                        placeholder={t('selectInviter')}
                        isClearable
                        isSearchable
                        className="react-select-container"
                        classNamePrefix="react-select"
                        noOptionsMessage={() => t('noInvitersAvailable')}
                        isDisabled={isExporting} // Yükleme sırasında Select devre dışı
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-canada-secondary"
                  onClick={() => setAddGuestModalOpen(false)}
                  disabled={isExporting} // Yükleme sırasında buton devre dışı
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-canada" 
                  onClick={handleAddGuest}
                  disabled={isExporting} // Yükleme sırasında buton devre dışı
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editGuestModalOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('editParticipant')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditGuestModalOpen(false)}
                  disabled={isExporting} // Yükleme sırasında kapatma butonu devre dışı
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-3">
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder={t('firstName')}
                      value={editGuest.firstName}
                      onChange={(e) => setEditGuest({ ...editGuest, firstName: e.target.value })}
                      disabled={isExporting} // Yükleme sırasında input devre dışı
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder={t('lastName')}
                      value={editGuest.lastName}
                      onChange={(e) => setEditGuest({ ...editGuest, lastName: e.target.value })}
                      disabled={isExporting} // Yükleme sırasında input devre dışı
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="email"
                      className="form-control mb-2"
                      placeholder={t('email')}
                      value={editGuest.email}
                      onChange={(e) => setEditGuest({ ...editGuest, email: e.target.value })}
                      disabled={isExporting} // Yükleme sırasında input devre dışı
                    />
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-control mb-2"
                      value={editGuest.guestType}
                      onChange={(e) => setEditGuest({ ...editGuest, guestType: e.target.value, selectedInviterId: e.target.value === 'PLUSONE' ? editGuest.selectedInviterId : null })}
                      disabled={isExporting} // Yükleme sırasında select devre dışı
                    >
                      <option value="REGULAR">REGULAR</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="VIP">VIP</option>
                      <option value="PLUSONE">PLUSONE</option>
                    </select>
                  </div>
                  {editGuest.guestType === 'PLUSONE' && (
                    <div className="col-md-6">
                      <Select
                        options={inviterOptions}
                        value={inviterOptions.find((option) => option.value === editGuest.selectedInviterId) || null}
                        onChange={(option) => setEditGuest({ ...editGuest, selectedInviterId: option ? option.value : null })}
                        onInputChange={(input) => setInviterSearchTerm(input)}
                        placeholder={t('selectInviter')}
                        isClearable
                        isSearchable
                        className="react-select-container"
                        classNamePrefix="react-select"
                        noOptionsMessage={() => t('noInvitersAvailable')}
                        isDisabled={isExporting} // Yükleme sırasında Select devre dışı
                      />
                    </div>
                  )}
                  {['EMPLOYEE', 'VIP'].includes(editGuest.guestType) && editGuest.plusOneQrId && editGuest.plusOneQrId !== 'NA' && (
                    <div className="col-md-12 mt-3">
                      <label className="form-label">{t('invitedGuest')}:</label>
                      <div className="d-flex align-items-center">
                        <span>{plusOneName}</span>
                        <button
                          className="btn btn-canada btn-sm ms-2"
                          onClick={() => handleRemoveInvited(editGuest._id, editGuest.plusOneQrId)}
                          disabled={isExporting} // Yükleme sırasında buton devre dışı
                        >
                          {t('removeInvited')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-canada-secondary"
                  onClick={() => setEditGuestModalOpen(false)}
                  disabled={isExporting} // Yükleme sırasında buton devre dışı
                >
                  {t('cancel')}
                </button>
                <button 
                  type="button" 
                  className="btn btn-canada" 
                  onClick={handleUpdateGuest}
                  disabled={isExporting} // Yükleme sırasında buton devre dışı
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalAction}
        message={modalMessage}
        isDisabled={isExporting} // Yükleme sırasında onay modali butonları devre dışı
      />
    </div>
  );
};

export default EventSettings;