import React from 'react';
import notFoundImage from '../assets/404.png';

const NotFound = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'white',
      }}
    >
      <img
        src={notFoundImage}
        alt="404 Not Found"
        style={{
          maxWidth: '100%',
          maxHeight: '80vh',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export default NotFound;