import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SectionTitle } from '../components/common/SectionTitle';
import { Badge } from '../components/common/Badge';
import {
  USER_ROLE_LABELS,
  DEPARTMENT_TYPE_LABELS,
} from '../lib/constants';
import type { UserProfile, UserRole, DepartmentType } from '../types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ROLE_OPTIONS: UserRole[] = ['admin', 'compliance_officer', 'department_user', 'viewer'];
const DEPARTMENT_OPTIONS: DepartmentType[] = [
  'compliance',
  'casino_marketing',
  'vip_marketing',
  'aco',
  'str_committee',
  'it',
  'executive',
];

// ---------------------------------------------------------------------------
// Hook: useUsers
// ---------------------------------------------------------------------------
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as UserProfile[];
    },
  });
}

// ---------------------------------------------------------------------------
// Hook: useCreateUser
// ---------------------------------------------------------------------------
function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: {
      email: string;
      password: string;
      full_name: string;
      department: DepartmentType;
      role: UserRole;
    }) => {
      // Step 1: Create auth user via Edge Function (requires service_role)
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'create-user',
        {
          body: {
            email: user.email,
            password: user.password,
            full_name: user.full_name,
            department: user.department,
            role: user.role,
          },
        }
      );
      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);
      return fnData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Hook: useUpdateUser
// ---------------------------------------------------------------------------
function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<UserProfile, 'role' | 'department' | 'is_active'>>;
    }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Add User Modal
// ---------------------------------------------------------------------------
interface AddUserModalProps {
  onClose: () => void;
  onSubmit: (user: {
    email: string;
    password: string;
    full_name: string;
    department: DepartmentType;
    role: UserRole;
  }) => void;
  loading: boolean;
  error?: string | null;
}

function AddUserModal({ onClose, onSubmit, loading, error }: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('compliance');
  const [role, setRole] = useState<UserRole>('viewer');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password, full_name: fullName, department, role });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Add User</h3>
          <button className="modal__close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {error && (
              <div className="form-error mb-md">{error}</div>
            )}
            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="new-email">
                Email
              </label>
              <input
                id="new-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@solaire.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="new-password">
                Temporary Password
              </label>
              <input
                id="new-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="new-name">
                Full Name
              </label>
              <input
                id="new-name"
                className="form-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Last Name, First Name"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label--required" htmlFor="new-department">
                  Department
                </label>
                <select
                  id="new-department"
                  className="form-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                >
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {DEPARTMENT_TYPE_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label form-label--required" htmlFor="new-role">
                  Role
                </label>
                <select
                  id="new-role"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {USER_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function UsersPage() {
  const { isAdmin } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [editDepartment, setEditDepartment] = useState<DepartmentType>('compliance');

  const { data: users, isLoading, isError } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  // Access control
  if (!isAdmin) {
    return (
      <div>
        <SectionTitle>User Management</SectionTitle>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#B22600', fontWeight: 600, fontSize: '1.125rem', marginBottom: 8 }}>
            Access Denied
          </p>
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem' }}>
            You do not have permission to manage users. Admin access is required.
          </p>
        </div>
      </div>
    );
  }

  const handleAddUser = (user: {
    email: string;
    password: string;
    full_name: string;
    department: DepartmentType;
    role: UserRole;
  }) => {
    createUser.mutate(user, {
      onSuccess: () => {
        setShowAddModal(false);
      },
    });
  };

  const handleStartEdit = (user: UserProfile) => {
    setEditingUser(user.id);
    setEditRole(user.role);
    setEditDepartment(user.department);
  };

  const handleSaveEdit = (id: string) => {
    updateUser.mutate(
      { id, updates: { role: editRole, department: editDepartment } },
      {
        onSuccess: () => {
          setEditingUser(null);
        },
      }
    );
  };

  const handleToggleActive = (user: UserProfile) => {
    updateUser.mutate({
      id: user.id,
      updates: { is_active: !user.is_active },
    });
  };

  return (
    <div>
      <SectionTitle
        action={
          <button className="btn btn--primary btn--sm" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        }
      >
        User Management
      </SectionTitle>

      {/* Error state */}
      {isError && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#B22600', fontWeight: 600 }}>Failed to load users.</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem' }}>Loading users...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && users && users.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__title">No users</div>
          <p className="empty-state__description">
            No user profiles found. Click "Add User" to create one.
          </p>
        </div>
      )}

      {/* User table */}
      {!isLoading && !isError && users && users.length > 0 && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td style={{ fontWeight: 600 }}>{user.full_name ?? '\u2014'}</td>

                  {/* Department */}
                  <td>
                    {editingUser === user.id ? (
                      <select
                        className="form-select"
                        value={editDepartment}
                        onChange={(e) =>
                          setEditDepartment(e.target.value as DepartmentType)
                        }
                        style={{ width: 150, padding: '6px 10px', fontSize: '0.75rem' }}
                      >
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {DEPARTMENT_TYPE_LABELS[d]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      DEPARTMENT_TYPE_LABELS[user.department]
                    )}
                  </td>

                  {/* Role */}
                  <td>
                    {editingUser === user.id ? (
                      <select
                        className="form-select"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        style={{ width: 150, padding: '6px 10px', fontSize: '0.75rem' }}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {USER_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant={user.role === 'admin' ? 'high-risk' : 'default'}>
                        {USER_ROLE_LABELS[user.role]}
                      </Badge>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <Badge variant={user.is_active ? 'submitted' : 'archived'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex gap-xs">
                      {editingUser === user.id ? (
                        <>
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => handleSaveEdit(user.id)}
                            disabled={updateUser.isPending}
                          >
                            {updateUser.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => setEditingUser(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => handleStartEdit(user)}
                          >
                            Edit
                          </button>
                          <button
                            className={`btn btn--sm ${
                              user.is_active ? 'btn--danger' : 'btn--ghost'
                            }`}
                            onClick={() => handleToggleActive(user)}
                            disabled={updateUser.isPending}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => {
            setShowAddModal(false);
            createUser.reset();
          }}
          onSubmit={handleAddUser}
          loading={createUser.isPending}
          error={createUser.error?.message ?? null}
        />
      )}
    </div>
  );
}
