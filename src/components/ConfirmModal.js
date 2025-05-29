import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ConfirmModal = ({ isOpen, onClose, onConfirm, message, showCancel = true, confirmText, cancelText }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('confirmationTitle')}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div>{message}</div> {/* <p> yerine <div> kullanıldı */}
          </div>
          <div className="modal-footer">
            {showCancel && (
              <button type="button" className="btn btn-canada-secondary" onClick={onClose}>
                {cancelText || t('cancel')}
              </button>
            )}
            <button type="button" className="btn btn-canada" onClick={onConfirm}>
              {confirmText || t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  message: PropTypes.node.isRequired, // string yerine node
  showCancel: PropTypes.bool,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
};

export default ConfirmModal;