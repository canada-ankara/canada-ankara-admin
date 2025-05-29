import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import ConfirmModal from './ConfirmModal';

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalAction, setConfirmModalAction] = useState(() => {});
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    roles: [],
  });
  const [errors, setErrors] = useState({});

  const validRoles = ['Admin', 'Editor', 'UserEditor', 'GuestEditor', 'ParticipantEditor', 'CheckInEditor'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('https://my-backend-app-ndce.onrender.com/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers(response.data.users);
    } catch (error) {
      alert(`${t('error')}: ${t(error.response?.data?.messageKey) || t('usersFetchFailed')}`);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = t('usernameRequired');
    if (!editUser && !formData.password) newErrors.password = t('passwordRequired');
    if (!formData.roles || formData.roles.length === 0) newErrors.roles = t('rolesRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        roles: checked
          ? [...prev.roles, value]
          : prev.roles.filter(role => role !== value),
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setErrors({ ...errors, [name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = editUser
        ? `https://my-backend-app-ndce.onrender.com/api/admin/users/${editUser._id}`
        : 'https://my-backend-app-ndce.onrender.com/api/admin/users';
      const method = editUser ? 'put' : 'post';
      await axios({
        method,
        url,
        data: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      fetchUsers();
      setIsModalOpen(false);
      setEditUser(null);
      setFormData({ username: '', password: '', roles: [] });
      alert(editUser ? t('userUpdateSuccess') : t('userAddSuccess'));
    } catch (error) {
      alert(`${t('error')}: ${t(error.response?.data?.messageKey) || t('operationFailed')}`);
    }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setFormData({
      username: user.username,
      password: '',
      roles: user.roles,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setIsConfirmModalOpen(true);
    setConfirmModalAction(() => () => {
      axios
        .delete(`https://my-backend-app-ndce.onrender.com/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        .then(() => {
          fetchUsers();
          setIsConfirmModalOpen(false);
          alert(t('userDeleteSuccess'));
        })
        .catch((error) => {
          alert(`${t('error')}: ${t(error.response?.data?.messageKey) || t('userDeleteFailed')}`);
          setIsConfirmModalOpen(false);
        });
    });
  };

  return (
    <div className="container-custom mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">{t('users')}</h4>
              <div className="filter-container d-flex align-items-center">
                <button
                  onClick={() => {
                    setEditUser(null);
                    setFormData({ username: '', password: '', roles: [] });
                    setIsModalOpen(true);
                  }}
                  className="btn btn-canada ms-auto"
                >
                  {t('addUser')}
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-dark table-striped">
                  <thead>
                    <tr>
                      <th>{t('username')}</th>
                      <th>{t('roles')}</th>
                      <th>{t('createdAt')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>{user.username}</td>
                        <td>{user.roles.join(', ')}</td>
                        <td>{new Date(user.createdAt).toLocaleString()}</td>
                        <td className="action-buttons">
                          <button
                            onClick={() => handleEdit(user)}
                            className="btn btn-canada btn-sm"
                            title={t('editUser')}
                          >
                            <i className="fas fa-pencil-alt"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="btn btn-canada btn-sm"
                            title={t('delete')}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editUser ? t('editUser') : t('addUser')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form id="userForm" onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">{t('username')}</label>
                    <input
                      type="text"
                      className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                    />
                    {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">{t('password')}</label>
                    <input
                      type="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={editUser}
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('roles')}</label>
                    {validRoles.map((role) => (
                      <div key={role} className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`role-${role}`}
                          name="roles"
                          value={role}
                          checked={formData.roles.includes(role)}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor={`role-${role}`}>
                          {t(role.toLowerCase())}
                        </label>
                      </div>
                    ))}
                    {errors.roles && <div className="text-danger">{errors.roles}</div>}
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-canada-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t('close_button')}
                </button>
                <button type="submit" form="userForm" className="btn btn-canada">
                  {editUser ? t('save') : t('addUser')}
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
        message={t('confirmDeleteUser')}
      />
    </div>
  );
};

export default Users;