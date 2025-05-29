import React from 'react';
import { useTranslation } from 'react-i18next';

const SearchBar = ({ searchTerm, setSearchTerm }) => {
  const { t } = useTranslation();

  return (
    <input
      type="text"
      className="form-control search-input"
      placeholder={t('searchPlaceholder')}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
};

export default SearchBar;