import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { StatusBadge } from './StatusBadge';
import { mockService } from '../services/mockService';
import type { User, UserStatus } from '../services/mockService';
import { formatQ } from '../utils/format';

type ManagedRole = 'institutional_client' | 'sales_advisor';

interface UserFormState {
  name: string;
  email: string;
  role: ManagedRole;
  status: UserStatus;
  credential: string;
  institution: string;
  nit: string;
  creditLine: string;
  validated: boolean;
}

interface Notice {
  type: 'success' | 'error';
  message: string;
}

const roleLabels: Record<ManagedRole, string> = {
  institutional_client: 'Cliente Institucional',
  sales_advisor: 'Asesor de Ventas',
};

const createEmptyForm = (): UserFormState => ({
  name: '',
  email: '',
  role: 'institutional_client',
  status: 'activo',
  credential: '',
  institution: '',
  nit: '',
  creditLine: '',
  validated: false,
});

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    // TODO: Conectar con el Controlador/Backend → GET /api/admin/users
    const data = await mockService.getManagedUsers();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.name, user.email, user.institution ?? '', user.nit ?? '', user.credential ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [users, search]);

  const stats = useMemo(
    () => ({
      total: users.length,
      institutional: users.filter((user) => user.role === 'institutional_client').length,
      validated: users.filter(
        (user) => user.role === 'institutional_client' && user.validated,
      ).length,
      advisors: users.filter((user) => user.role === 'sales_advisor').length,
    }),
    [users],
  );

  const updateField = <K extends keyof UserFormState,>(
    field: K,
    value: UserFormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setNotice(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role === 'sales_advisor' ? 'sales_advisor' : 'institutional_client',
      status: user.status ?? 'activo',
      credential: user.credential ?? '',
      institution: user.institution ?? '',
      nit: user.nit ?? '',
      creditLine: user.creditLine !== undefined ? String(user.creditLine) : '',
      validated: user.validated ?? false,
    });
    setNotice(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!form.name.trim() || !form.email.trim()) {
      setNotice({ type: 'error', message: 'El nombre y el correo son obligatorios.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setNotice({ type: 'error', message: 'Ingresa un correo electrónico válido.' });
      return;
    }
    if (form.credential.trim().length < 6) {
      setNotice({
        type: 'error',
        message: 'La credencial de acceso debe tener al menos 6 caracteres.',
      });
      return;
    }

    const creditLineValue = Number(form.creditLine);

    if (form.role === 'institutional_client') {
      if (!form.institution.trim() || !form.nit.trim()) {
        setNotice({
          type: 'error',
          message: 'La razón social y el NIT son obligatorios para cuentas institucionales.',
        });
        return;
      }
      if (!Number.isFinite(creditLineValue) || creditLineValue <= 0) {
        setNotice({
          type: 'error',
          message: 'La línea de crédito autorizada debe ser mayor a cero.',
        });
        return;
      }
    }

    const payload: Omit<User, 'id'> = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      status: form.status,
      credential: form.credential.trim(),
      institution:
        form.role === 'institutional_client' ? form.institution.trim() : undefined,
      nit: form.role === 'institutional_client' ? form.nit.trim() : undefined,
      creditLine:
        form.role === 'institutional_client' ? creditLineValue : undefined,
      validated: form.role === 'institutional_client' ? form.validated : false,
    };

    setSaving(true);

    // TODO: Conectar con el Controlador/Backend → POST /api/admin/users | PUT /api/admin/users/:id
    if (editingId !== null) {
      await mockService.updateManagedUser(editingId, payload);
    } else {
      await mockService.createManagedUser(payload);
    }

    await loadUsers();
    setSaving(false);
    setModalOpen(false);
    setNotice({
      type: 'success',
      message:
        editingId !== null
          ? 'Cuenta actualizada correctamente.'
          : 'Cuenta creada correctamente.',
    });
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `¿Eliminar la cuenta "${user.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    // TODO: Conectar con el Controlador/Backend → DELETE /api/admin/users/:id
    await mockService.deleteManagedUser(user.id);
    await loadUsers();
    setNotice({ type: 'success', message: 'Cuenta eliminada del sistema.' });
  };

  const toggleStatus = async (user: User) => {
    const nextStatus: UserStatus = user.status === 'activo' ? 'inactivo' : 'activo';
    // TODO: Conectar con el Controlador/Backend → PATCH /api/admin/users/:id/status
    await mockService.updateManagedUser(user.id, { status: nextStatus });
    await loadUsers();
    setNotice({
      type: 'success',
      message: `La cuenta "${user.name}" quedó ${nextStatus}.`,
    });
  };

  const validateAccount = async (user: User) => {
    // TODO: Conectar con el Controlador/Backend → PATCH /api/admin/users/:id/validate
    await mockService.updateManagedUser(user.id, { validated: true });
    await loadUsers();
    setNotice({
      type: 'success',
      message: `Cuenta institucional "${user.name}" validada correctamente.`,
    });
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Cuentas gestionadas', value: stats.total.toString(), detail: 'institucionales y asesores' },
          { label: 'Institucionales', value: stats.institutional.toString(), detail: 'mayoristas registrados' },
          { label: 'Cuentas validadas', value: stats.validated.toString(), detail: 'habilitadas para crédito' },
          { label: 'Asesores de ventas', value: stats.advisors.toString(), detail: 'con acceso comercial' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">{card.label}</p>
            <p className="text-2xl font-extrabold text-editorial-primary mt-2">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.detail}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-editorial-primary">Gestión de usuarios (RBAC)</h2>
            <p className="text-xs text-gray-500 mt-1">
              Administra cuentas institucionales y asesores de ventas, sus credenciales y
              validaciones.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cuenta, NIT o credencial..."
              className="w-full sm:w-72 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={openCreateModal}
              className="bg-editorial-primary text-white font-semibold px-4 py-2.5 rounded-lg shadow hover:bg-editorial-secondary transition whitespace-nowrap"
            >
              + Nueva cuenta
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Cargando cuentas gestionables...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No se encontraron cuentas con ese criterio de búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-editorial-beige/60 text-editorial-primary">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Cuenta</th>
                  <th className="text-left font-semibold px-3 py-3">Rol asignado</th>
                  <th className="text-left font-semibold px-3 py-3">Datos institucionales</th>
                  <th className="text-right font-semibold px-3 py-3">Línea de crédito</th>
                  <th className="text-center font-semibold px-3 py-3">Estado</th>
                  <th className="text-right font-semibold px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const managedRole: ManagedRole =
                    user.role === 'sales_advisor' ? 'sales_advisor' : 'institutional_client';
                  const isInstitutional = managedRole === 'institutional_client';
                  return (
                    <tr key={user.id} className="align-middle hover:bg-gray-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-editorial-primary">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-1">
                          Credencial: {user.credential ?? '—'}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge tone={isInstitutional ? 'gold' : 'blue'}>
                          {roleLabels[managedRole]}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-4">
                        {isInstitutional ? (
                          <>
                            <p className="text-xs font-semibold text-editorial-primary">
                              {user.institution ?? 'Sin razón social'}
                            </p>
                            <p className="text-xs text-gray-500">NIT: {user.nit ?? '—'}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Acceso a bandeja de cotizaciones
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right whitespace-nowrap">
                        {isInstitutional ? (
                          <span className="font-semibold text-editorial-secondary">
                            {formatQ(user.creditLine ?? 0)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No aplica</span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge tone={user.status === 'activo' ? 'green' : 'gray'}>
                            {user.status === 'activo' ? 'Activo' : 'Inactivo'}
                          </StatusBadge>
                          {isInstitutional && (
                            <StatusBadge tone={user.validated ? 'green' : 'amber'}>
                              {user.validated ? 'Validada' : 'Sin validar'}
                            </StatusBadge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="text-xs font-semibold text-editorial-primary border border-editorial-primary/30 px-3 py-1.5 rounded-lg hover:bg-editorial-beige transition"
                          >
                            Editar
                          </button>
                          {isInstitutional && !user.validated && (
                            <button
                              type="button"
                              onClick={() => validateAccount(user)}
                              className="text-xs font-semibold text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition"
                            >
                              Validar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleStatus(user)}
                            className="text-xs font-semibold text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition"
                          >
                            {user.status === 'activo' ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-editorial-primary">
                  {editingId !== null ? 'Editar cuenta' : 'Nueva cuenta gestionada'}
                </h2>
                <p className="text-xs text-gray-500">
                  Asignación de roles, validación institucional y credenciales de acceso.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 transition text-xl leading-none"
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre / Razón social *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rol asignado *
                  </label>
                  <select
                    value={form.role}
                    onChange={(event) =>
                      updateField('role', event.target.value as ManagedRole)
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  >
                    <option value="institutional_client">Cliente Institucional / Mayorista</option>
                    <option value="sales_advisor">Asesor de Ventas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estado de la cuenta
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField('status', event.target.value as UserStatus)
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Credencial de acceso *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={form.credential}
                    onChange={(event) => updateField('credential', event.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    En producción la credencial se almacenará hasheada en el backend.
                  </p>
                </div>

                {form.role === 'institutional_client' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Institución / empresa *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.institution}
                        onChange={(event) => updateField('institution', event.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        NIT institucional *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.nit}
                        onChange={(event) => updateField('nit', event.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Línea de crédito autorizada (Q) *
                      </label>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        required
                        value={form.creditLine}
                        onChange={(event) => updateField('creditLine', event.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.validated}
                          onChange={(event) =>
                            updateField('validated', event.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-editorial-primary focus:ring-editorial-primary"
                        />
                        Cuenta institucional validada
                      </label>
                    </div>
                  </>
                )}

                {form.role === 'sales_advisor' && (
                  <div className="sm:col-span-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                    Los asesores de ventas acceden a la bandeja de solicitudes y a la emisión de
                    cotizaciones. No requieren línea de crédito ni validación institucional.
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving
                    ? 'Guardando...'
                    : editingId !== null
                      ? 'Guardar cambios'
                      : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
