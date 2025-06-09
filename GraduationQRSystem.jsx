import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Users, MapPin, FileText, QrCode, Download, Upload, Save } from 'lucide-react';

const GraduationQRSystem = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [scanMode, setScanMode] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    totalFamily: 3,
    table: '',
    observations: '',
    qrId: ''
  });

  // Cargar datos al iniciar
  useEffect(() => {
    const savedData = localStorage.getItem('graduationQRData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setStudents(parsedData.students || []);
        setLastSaved(parsedData.lastSaved);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Guardar datos automáticamente cuando cambian los estudiantes
  useEffect(() => {
    if (students.length > 0) {
      const dataToSave = {
        students: students,
        lastSaved: new Date().toLocaleString('es-MX')
      };
      localStorage.setItem('graduationQRData', JSON.stringify(dataToSave));
      setLastSaved(dataToSave.lastSaved);
    }
  }, [students]);

  // Exportar a JSON
  const exportToJSON = () => {
    const dataToExport = {
      exportDate: new Date().toLocaleString('es-MX'),
      totalStudents: students.length,
      totalAttendees: students.reduce((sum, student) => sum + student.totalFamily, 0),
      students: students
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graduacion-qr-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['ID_QR', 'Nombre', 'Total_Familia', 'Personas_Extra', 'Mesa', 'Observaciones'];
    const csvContent = [
      headers.join(','),
      ...students.map(student => [
        student.qrId,
        `"${student.name}"`,
        student.totalFamily,
        student.extras,
        `"${student.table}"`,
        `"${student.observations || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graduacion-qr-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar desde JSON
  const importFromJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.students && Array.isArray(importedData.students)) {
          if (confirm(`¿Deseas importar ${importedData.students.length} registros? Esto reemplazará todos los datos actuales.`)) {
            setStudents(importedData.students);
          }
        } else {
          alert('El archivo no tiene el formato correcto');
        }
      } catch (error) {
        alert('Error al leer el archivo. Verifica que sea un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Limpiar todos los datos
  const clearAllData = () => {
    if (confirm('¿Estás seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      setStudents([]);
      localStorage.removeItem('graduationQRData');
      setLastSaved(null);
    }
  };

  // Validar que el ID no esté duplicado
  const isIdDuplicated = (id, excludeStudentId = null) => {
    return students.some(student => 
      student.qrId.toLowerCase() === id.toLowerCase() && 
      student.id !== excludeStudentId
    );
  };

  const handleSubmit = () => {
    if (!formData.qrId.trim()) {
      alert('El ID del código QR es obligatorio');
      return;
    }

    if (isIdDuplicated(formData.qrId.trim(), editingStudent?.id)) {
      alert('Este ID ya está asignado a otro alumno');
      return;
    }

    if (editingStudent) {
      setStudents(prev => prev.map(student => 
        student.id === editingStudent.id 
          ? { ...student, ...formData, qrId: formData.qrId.trim().toUpperCase(), extras: Math.max(0, formData.totalFamily - 3) }
          : student
      ));
    } else {
      const newStudent = {
        id: Date.now(),
        ...formData,
        qrId: formData.qrId.trim().toUpperCase(),
        extras: Math.max(0, formData.totalFamily - 3)
      };
      setStudents(prev => [...prev, newStudent]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      totalFamily: 3,
      table: '',
      observations: '',
      qrId: ''
    });
    setShowForm(false);
    setEditingStudent(null);
  };

  const handleEdit = (student) => {
    setFormData({
      name: student.name,
      totalFamily: student.totalFamily,
      table: student.table,
      observations: student.observations,
      qrId: student.qrId
    });
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      setStudents(prev => prev.filter(student => student.id !== id));
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.qrId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const findStudentByQR = (qrId) => {
    return students.find(student => student.qrId.toLowerCase() === qrId.toLowerCase().trim());
  };

  const [qrSearchResult, setQrSearchResult] = useState(null);
  const [qrInput, setQrInput] = useState('');

  const handleQRSearch = () => {
    const student = findStudentByQR(qrInput);
    setQrSearchResult(student || 'not_found');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Sistema de Control QR</h1>
              <p className="text-gray-600">Ceremonia de Graduación - Primaria Consuelo Martínez</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setScanMode(!scanMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  scanMode 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <QrCode className="w-4 h-4 inline mr-2" />
                {scanMode ? 'Modo Escaneo ON' : 'Modo Escaneo'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={exportToJSON}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="Exportar respaldo en JSON"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  JSON
                </button>
                <button
                  onClick={exportToCSV}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  title="Exportar a Excel/CSV"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  CSV
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  title="Importar respaldo"
                >
                  <Upload className="w-4 h-4 inline mr-1" />
                  Importar
                </button>
              </div>

              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Agregar Alumno
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={importFromJSON}
            accept=".json"
            style={{ display: 'none' }}
          />

          {lastSaved && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-green-700">
                <Save className="w-4 h-4 mr-2" />
                <span className="text-sm">Datos guardados automáticamente</span>
              </div>
              <span className="text-xs text-green-600">Último guardado: {lastSaved}</span>
            </div>
          )}
          {scanMode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                <QrCode className="w-5 h-5 inline mr-2" />
                Escaneo de Código QR - Día del Evento
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Escanea o ingresa el ID del QR (ej: AL241)..."
                  className="flex-1 px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleQRSearch()}
                />
                <button
                  onClick={handleQRSearch}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Buscar
                </button>
              </div>
              {qrSearchResult && (
                <div className="mt-4">
                  {qrSearchResult === 'not_found' ? (
                    <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
                      ❌ ID no encontrado: <strong>{qrInput}</strong>
                    </div>
                  ) : (
                    <div className="bg-white border border-green-300 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-green-800 mb-3">✅ Información del Alumno</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p><strong>Nombre:</strong> {qrSearchResult.name}</p>
                          <p><strong>ID QR:</strong> {qrSearchResult.qrId}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Total Familia:</strong> {qrSearchResult.totalFamily} personas</p>
                          <p><strong>Extras:</strong> {qrSearchResult.extras > 0 ? `${qrSearchResult.extras} personas` : 'Ninguna'}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Mesa:</strong> {qrSearchResult.table}</p>
                        </div>
                        {qrSearchResult.observations && (
                          <div className="md:col-span-2">
                            <p><strong>Observaciones:</strong> {qrSearchResult.observations}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="relative mb-6">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, ID QR o mesa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Total Alumnos</h3>
              <p className="text-2xl font-bold text-blue-800">{students.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">Total Asistentes</h3>
              <p className="text-2xl font-bold text-green-800">
                {students.reduce((sum, student) => sum + student.totalFamily, 0)}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-orange-600">Personas Extra</h3>
              <p className="text-2xl font-bold text-orange-800">
                {students.reduce((sum, student) => sum + student.extras, 0)}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-600">Gestión de Datos</h3>
              <button
                onClick={clearAllData}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded mt-1 hover:bg-red-700 transition-colors"
              >
                Limpiar Todo
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingStudent ? 'Editar Alumno' : 'Agregar Nuevo Alumno'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Alumno *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total de Familia (incluyendo alumno) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalFamily}
                    onChange={(e) => setFormData({...formData, totalFamily: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Extras: {Math.max(0, formData.totalFamily - 3)} personas
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mesa Asignada *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.table}
                    onChange={(e) => setFormData({...formData, table: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Mesa 1, A-1, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID del Código QR *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.qrId}
                    onChange={(e) => setFormData({...formData, qrId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: AL241, AL242, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ingresa el ID exacto del QR que ya tienes impreso
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Notas adicionales..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingStudent ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Lista de Alumnos Registrados</h2>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {students.length === 0 
                ? 'No hay alumnos registrados aún'
                : 'No se encontraron alumnos con esos criterios de búsqueda'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID QR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumno</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Familia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">{student.qrId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{student.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          <span>{student.totalFamily} total</span>
                          {student.extras > 0 && (
                            <span className="ml-2 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">+{student.extras} extras</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                          {student.table}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">{student.observations || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-900">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraduationQRSystem;
