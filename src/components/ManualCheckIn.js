import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar';
import ConfirmModal from './ConfirmModal';

const ManualCheckIn = () => {
  const { t } = useTranslation();
  const [guests, setGuests] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [guest, setGuest] = useState(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  const fetchGuests = async (page, search) => {
    try {
      const response = await axios.get(`https://my-backend-app-ndce.onrender.com/api/admin/guests`, {
        params: { page: page + 1, limit: 10, search, attending: true },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setGuests(response.data.guests);
      setPageCount(response.data.totalPages);
    } catch (error) {
      alert(`${t('error')}: ${error.response?.data?.message || 'Davetliler alınamadı'}`);
    }
  };

  useEffect(() => {
    fetchGuests(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handlePageClick = (data) => {
    setCurrentPage(data.selected);
  };

  const handleCheckIn = async (id) => {
    try {
      const qrId = guests.find(g => g._id === id).qrId;
      const response = await axios.post(
        'https://my-backend-app-ndce.onrender.com/api/admin/checkin',
        { qrId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setGuest(response.data.guest);
      setAlreadyCheckedIn(response.data.alreadyCheckedIn);
      setIsGuestModalOpen(true);
      fetchGuests(currentPage, searchTerm);
    } catch (error) {
      alert(`${t('error')}: ${error.response?.data?.message || t('checkInFailed')}`);
    }
  };

  const closeGuestModal = () => {
    setIsGuestModalOpen(false);
    setGuest(null);
    setAlreadyCheckedIn(false);
  };

  return (
    <div className="container-custom mt-5">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">{t('manualCheckIn')}</h4>
              <div className="filter-container d-flex align-items-center">
                <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </div>
              <div className="table-responsive">
                <table className="table table-dark table-striped">
                  <thead>
                    <tr>
                      <th>{t('firstName')}</th>
                      <th>{t('lastName')}</th>
                      <th>{t('guestType')}</th>
                      <th>{t('willAttend')}</th>
                      <th>{t('isCheckedIn')}</th>
                      <th>{t('checkInTime')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest._id}>
                        <td>{guest.firstName}</td>
                        <td>{guest.lastName}</td>
                        <td>{guest.guestType}</td>
                        <td>{guest.willAttend ? t('yes') : t('no')}</td>
                        <td>{guest.isCheckedIn ? t('yes') : t('no')}</td>
                        <td>
                          {guest.checkInTime
                            ? new Date(guest.checkInTime).toLocaleString()
                            : t('none')}
                        </td>
                        <td className="action-buttons">
                          <button
                            onClick={() => handleCheckIn(guest._id)}
                            className="btn btn-canada btn-sm"
                            disabled={guest.isCheckedIn}
                            title={t('checkIn')}
                          >
                            <i className="fas fa-check"></i>
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
                />
              </div>
              <ConfirmModal
                isOpen={isGuestModalOpen}
                onClose={closeGuestModal}
                onConfirm={closeGuestModal}
                message={
                  guest ? (
                    <div>
                      {alreadyCheckedIn && (
                        <div className="text-danger mb-3" style={{ fontWeight: 'bold' }}>
                          {t('alreadyCheckedIn')}
                        </div>
                      )}
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('firstName')}: </span>
                        {guest.firstName}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('lastName')}: </span>
                        {guest.lastName}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('guestType')}: </span>
                        {guest.guestType}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('isCheckedIn')}: </span>
                        {guest.isCheckedIn ? t('yes') : t('no')}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('checkInTime')}: </span>
                        {guest.checkInTime
                          ? new Date(guest.checkInTime).toLocaleString()
                          : t('none')}
                      </div>
                    </div>
                  ) : (
                    <div>{t('noParticipantData')}</div>
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualCheckIn;