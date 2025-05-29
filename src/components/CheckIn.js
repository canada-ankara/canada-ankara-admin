import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { QRCodeCanvas } from 'qrcode.react';
import ConfirmModal from './ConfirmModal';
import approvedSound from '../assets/approved.mp3';
import rejectedSound from '../assets/rejected.mp3';

const CheckIn = () => {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [qrId, setQrId] = useState('');
  const [error, setError] = useState('');
  const [participant, setParticipant] = useState(null);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [lastScannedQrId, setLastScannedQrId] = useState(''); // Yeni: Son okunan QR ID
  const codeReader = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // Yeni: Çerçeve çizimi için canvas
  const approvedAudio = useRef(new Audio(approvedSound));
  const rejectedAudio = useRef(new Audio(rejectedSound));

  const handleCheckIn = useCallback(async (id) => {
    console.log('Gönderilen QR ID:', id);
    if (!id) {
      setError(`${t('error')}: ${t('qrIdEmpty')}`);
      rejectedAudio.current.play().catch((err) => {
        console.error('Rejected ses çalma hatası:', err);
      });
      return;
    }
    try {
      const response = await axios.post(
        'https://my-backend-app-ndce.onrender.com/api/admin/checkin',
        { qrId: id },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      console.log('Backend yanıtı:', response.data);
      const { guest, alreadyCheckedIn } = response.data;

      if (guest && guest._id) {
        console.log('Katılımcı bulundu, modal açılıyor:', guest);
        setParticipant(guest);
        setAlreadyCheckedIn(alreadyCheckedIn);
        setIsParticipantModalOpen(true);
        setError('');
        approvedAudio.current.play().catch((err) => {
          console.error('Approved ses çalma hatası:', err);
        });
      } else {
        console.log('Katılımcı bulunamadı');
        setError(`${t('error')}: ${t('guestNotFound')}`);
        setParticipant(null);
        setIsParticipantModalOpen(false);
        setAlreadyCheckedIn(false);
        rejectedAudio.current.play().catch((err) => {
          console.error('Rejected ses çalma hatası:', err);
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('guestNotFound');
      console.error('Check-in hatası:', errorMessage, error);
      if (errorMessage === t('alreadyCheckedIn')) {
        const guest = error.response?.data?.guest || null;
        if (guest && guest._id) {
          console.log('Katılımcı zaten check-in yaptı, modal açılıyor:', guest);
          setParticipant(guest);
          setAlreadyCheckedIn(true);
          setIsParticipantModalOpen(true);
          setError('');
          approvedAudio.current.play().catch((err) => {
            console.error('Approved ses çalma hatası:', err);
          });
        } else {
          setError(`${t('error')}: ${errorMessage}`);
          setParticipant(null);
          setIsParticipantModalOpen(false);
          setAlreadyCheckedIn(false);
          rejectedAudio.current.play().catch((err) => {
            console.error('Rejected ses çalma hatası:', err);
          });
        }
      } else {
        setError(`${t('error')}: ${errorMessage}`);
        setParticipant(null);
        setIsParticipantModalOpen(false);
        setAlreadyCheckedIn(false);
        rejectedAudio.current.play().catch((err) => {
          console.error('Rejected ses çalma hatası:', err);
        });
      }
    }
  }, [t]);

  const handleManualCheckIn = (e) => {
    e.preventDefault();
    console.log('Manuel check-in tetiklendi, QR ID:', qrId);
    if (qrId) {
      handleCheckIn(qrId);
    } else {
      setError(`${t('error')}: ${t('qrIdEmpty')}`);
      rejectedAudio.current.play().catch((err) => {
        console.error('Rejected ses çalma hatası:', err);
      });
    }
  };

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();

    if (scanning) {
      const startScanning = async () => {
        const reader = codeReader.current;
        try {
          const videoElement = videoRef.current;
          const canvasElement = canvasRef.current;
          console.log('QR tarama başlatıldı');

          // Video ve canvas boyutlarını eşitle
          const videoWidth = videoElement.offsetWidth;
          const videoHeight = videoElement.offsetHeight;
          canvasElement.width = videoWidth;
          canvasElement.height = videoHeight;

          await reader.decodeFromVideoDevice(null, videoElement, (result, err, controls) => {
            const ctx = canvasElement.getContext('2d');
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height); // Her karede canvas'ı temizle

            if (result) {
              const scannedQrId = result.getText();
              console.log('Taranan QR ID:', scannedQrId);

              // QR kodunun koordinatlarını al
              const points = result.getResultPoints();
              if (points && points.length >= 4) {
                ctx.beginPath();
                ctx.strokeStyle = 'limegreen';
                ctx.lineWidth = 4;
                ctx.moveTo(points[0].getX(), points[0].getY());
                ctx.lineTo(points[1].getX(), points[1].getY());
                ctx.lineTo(points[2].getX(), points[2].getY());
                ctx.lineTo(points[3].getX(), points[3].getY());
                ctx.closePath();
                ctx.stroke();
              }

              // Aynı QR kodunun tekrar okunmasını önle
              if (scannedQrId !== lastScannedQrId) {
                setQrId(scannedQrId);
                setLastScannedQrId(scannedQrId);
                handleCheckIn(scannedQrId);
              }
            }
            if (err && !(err instanceof NotFoundException)) {
              console.error('QR kod okuma hatası:', err);
              setError(`${t('qrCodeReadError')}: ${err.message}`);
              rejectedAudio.current.play().catch((err) => {
                console.error('Rejected ses çalma hatası:', err);
              });
            }
          });
        } catch (err) {
          console.error('Kamera başlatılamadı:', err);
          setError(`${t('cameraStartFailed')}: ${err.message}`);
          setScanning(false);
          rejectedAudio.current.play().catch((err) => {
            console.error('Rejected ses çalma hatası:', err);
          });
        }
      };
      startScanning();
    }

    return () => {
      console.log('QR tarama temizlendi');
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, [scanning, handleCheckIn, lastScannedQrId]);

  const closeParticipantModal = () => {
    console.log('Modal kapatılıyor');
    setIsParticipantModalOpen(false);
    setParticipant(null);
    setAlreadyCheckedIn(false);
    setError('');
    setLastScannedQrId(''); // Modal kapandığında son okunan QR ID sıfırlanır
  };

  return (
    <div className="container-custom mt-5">
      <div className="row justify-content-center">
        <div className="col-md-4">
          <div className="card card-custom">
            <div className="card-body" style={{ padding: '30px' }}>
              <h4 className="card-title text-center mb-4" style={{ color: '#f97316' }}>
                {t('checkIn')}
              </h4>
              <div className="mb-4">
                <div className="d-flex justify-content-center">
                  <button
                    onClick={() => setScanning(!scanning)}
                    className="btn btn-canada"
                  >
                    {scanning ? t('stopScanning') : t('startScanning')}
                  </button>
                </div>
                {scanning && (
                  <div className="video-container mt-3" style={{ position: 'relative', border: '3px solid #f97316', borderRadius: '8px', overflow: 'hidden' }}>
                    <video ref={videoRef} style={{ width: '100%', display: 'block' }} />
                    <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                  </div>
                )}
              </div>
              <form onSubmit={handleManualCheckIn} className="mb-4">
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder={t('qrId')}
                    value={qrId}
                    onChange={(e) => setQrId(e.target.value)}
                    className="form-control input-custom"
                  />
                </div>
                <div className="d-flex justify-content-center">
                  <button type="submit" className="btn btn-canada">
                    {t('checkIn')}
                  </button>
                </div>
              </form>
              {error && (
                <div className="text-danger text-center mb-3">{error}</div>
              )}
              <ConfirmModal
                isOpen={isParticipantModalOpen}
                onClose={closeParticipantModal}
                onConfirm={closeParticipantModal}
                message={
                  participant ? (
                    <div>
                      {alreadyCheckedIn && (
                        <div className="text-danger mb-3" style={{ fontWeight: 'bold' }}>
                          {t('alreadyCheckedIn')}
                        </div>
                      )}
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('firstName')}: </span>
                        {participant.firstName}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('lastName')}: </span>
                        {participant.lastName}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('email')}: </span>
                        {participant.email}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('qrId')}: </span>
                        {participant.qrId}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('isCheckedIn')}: </span>
                        {participant.isCheckedIn ? t('yes') : t('no')}
                      </div>
                      <div style={{ color: '#f97316' }}>
                        <span style={{ color: '#ffffff' }}>{t('checkInTime')}: </span>
                        {participant.checkInTime
                          ? new Date(participant.checkInTime).toLocaleString()
                          : t('none')}
                      </div>
                      <div className="mt-3 d-flex justify-content-center">
                        <QRCodeCanvas value={participant.qrId} size={128} />
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

export default CheckIn;