import React from 'react';
import '../CSS/Modal.css';

const Modal = ({ message, onClose, onConfirm, buttonText, onButtonClick, isYesNo, show }) => {
  if (!show) return null;

  const handleYesClick = () => {
    onConfirm(true);
    onClose();
  };

  const handleNoClick = () => {
    onConfirm(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        {isYesNo ? (
          <>
            <button onClick={handleYesClick}>Yes</button>
            <button onClick={handleNoClick}>No</button>
          </>
        ) : (
          <button onClick={onButtonClick}>{buttonText}</button>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Modal;
