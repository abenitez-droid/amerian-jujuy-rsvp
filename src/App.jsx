import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update } from 'firebase/database';
import { 
  Building2, Calendar, Clock, MapPin, CheckCircle, Search, 
  UserCheck, Shield, Plus, FileSpreadsheet, Lock, Sparkles, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Configuración con TUS credenciales reales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBDD8SVS0uHnYTlgIMQuIXJzmIYzVSayLA",
  authDomain: "amerian-jujuy-event.firebaseapp.com",
  databaseURL: "https://amerian-jujuy-event-default-rtdb.firebaseio.com",
  projectId: "amerian-jujuy-event",
  storageBucket: "amerian-jujuy-event.firebasestorage.app",
  messagingSenderId: "796737899796",
  appId: "1:796737899796:web:d7cf5876e67a88c4674601"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [view, setView] = useState('guest'); // 'guest' | 'tablet'
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Estados de Invitados
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Formulario Invitado
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    attending: 'si',
    companions: 0,
    dietary: ''
  });
  const [submittedPass, setSubmittedPass] = useState(null);

  // Estados de la Tablet
  const [searchDni, setSearchDni] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', dni: '', companions: 0, dietary: '' });

  // Detectar parámetro ?view=tablet en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'tablet') {
      setView('tablet');
    }
  }, []);

  // Escuchar la base de datos Firebase en Tiempo Real
  useEffect(() => {
    const guestsRef = ref(db, 'guests');
    const unsubscribe = onValue(guestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const guestList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setGuests(guestList.reverse());
      } else {
        setGuests([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Enviar Confirmación (Invitado)
  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dni) return;

    const formattedDni = formData.dni.replace(/\D/g, '');
    const guestsRef = ref(db, 'guests');
    
    const newGuestRef = push(guestsRef);
    const payload = {
      name: formData.name.toUpperCase().trim(),
      dni: formattedDni,
      email: formData.email.toLowerCase().trim(), // Mail en minúsculas
      phone: formData.phone.trim(),
      attending: formData.attending,
      companions: parseInt(formData.companions) || 0,
      dietary: formData.dietary ? formData.dietary.toUpperCase().trim() : 'NINGUNA',
      present: false,
      checkInTime: null,
      createdAt: new Date().toISOString()
    };

    set(newGuestRef, payload);
    setSubmittedPass({ ...payload, id: newGuestRef.key });

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  // Marcar Presente (Tablet)
  const handleCheckIn = (guestId) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-2digit', minute: '2-2digit' }) + ' hs';
    
    const guestRef = ref(db, `guests/${guestId}`);
    update(guestRef, {
      present: true,
      checkInTime: timeStr
    });
  };

  // Agregar Invitado Manual (Tablet)
  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!newGuest.name || !newGuest.dni) return;

    const formattedDni = newGuest.dni.replace(/\D/g, '');
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-2digit', minute: '2-2digit' }) + ' hs';

    const guestsRef = ref(db, 'guests');
    const newRef = push(guestsRef);

    set(newRef, {
      name: newGuest.name.toUpperCase().trim(),
      dni: formattedDni,
      email: 'registro.presencial@hotel.com',
      phone: '-',
      attending: 'si',
      companions: parseInt(newGuest.companions) || 0,
      dietary: newGuest.dietary ? newGuest.dietary.toUpperCase().trim() : 'NINGUNA',
      present: true,
      checkInTime: timeStr,
      createdAt: now.toISOString()
    });

    setNewGuest({ name: '', dni: '', companions: 0, dietary: '' });
    setShowAddModal(false);
  };

  // Desbloqueo por PIN de la Tablet
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === '2026') {
      setView('tablet');
      setShowPinModal(false);
      setPin('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ["NOMBRE", "DNI", "EMAIL", "TELEFONO", "ACOMPAÑANTES", "RESTRICCIONES", "ESTADO", "HORA LLEGADA"];
    const rows = guests.map(g => [
      `"${g.name}"`,
      `"${g.dni}"`,
      `"${g.email || ''}"`,
      `"${g.phone || ''}"`,
      g.companions,
      `"${g.dietary || 'NINGUNA'}"`,
      g.present ? "PRESENTE" : "AUSENTE",
      `"${g.checkInTime || '-'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ASISTENCIA_AMERIAN_JUJUY.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Teclado numérico táctil
  const handleNumPad = (digit) => {
    setSearchDni(prev => prev + digit);
  };

  // Métricas
  const totalGuests = guests.length;
  const totalPresent = guests.filter(g => g.present).length;
  const totalAbsent = totalGuests - totalPresent;
  const attendanceRate = totalGuests > 0 ? Math.round((totalPresent / totalGuests) * 100) : 0;

  const filteredGuests = guests.filter(g => {
    const searchUpper = searchDni.toUpperCase();
    const matchesDni = g.dni.includes(searchDni.replace(/\D/g, '')) || g.name.includes(searchUpper);
    if (filter === 'present') return matchesDni && g.present;
    if (filter === 'absent') return matchesDni && !g.present;
    return matchesDni;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-black">
      
      {/* NAVBAR */}
      <header className="border-b border-amber-900/30 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center text-black font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold tracking-wider text-amber-100">AMÉRIAN</h1>
              <p className="text-xs text-amber-400/80 tracking-widest uppercase">Hotel & Suites Jujuy</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {view === 'guest' ? (
              <button
                onClick={() => setShowPinModal(true)}
                className="text-xs text-neutral-500 hover:text-amber-400 p-2 flex items-center space-x-1 transition"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Acceso Recepción</span>
              </button>
            ) : (
              <button
                onClick={() => setView('guest')}
                className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
              >
                Ver Formulario Invitado
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MODAL PIN TABLET */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-center">
              <Shield className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-amber-100">Acceso Control Tablet</h3>
              <p className="text-xs text-neutral-400">Ingresa el PIN de seguridad (Por defecto: 2026)</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                className="w-full text-center text-2xl tracking-widest py-2 rounded-xl bg-neutral-950 border border-amber-500/30 text-amber-200 focus:outline-none focus:border-amber-400"
              />
              {pinError && <p className="text-xs text-red-400 text-center">PIN Incorrecto</p>}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="w-1/2 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISTA 1: INVITADO (RSVP) */}
      {view === 'guest' && (
        <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
          
          {/* Tarjeta Invitación */}
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
            
            <p className="text-xs text-amber-400 tracking-widest uppercase font-semibold">Gran Inauguración</p>
            <h2 className="text-3xl sm:text-4xl font-serif text-amber-100 font-bold">Amérian Hotel Jujuy</h2>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-md mx-auto">
              Nos complace invitarle a la velada inaugural de nuestro nuevo hotel. Una noche de distinción, gastronomía y celebración.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800 text-xs">
              <div className="flex items-center justify-center space-x-2 text-neutral-300">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Viernes 14 Nov</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-neutral-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>20:00 Hs</span>
              </div>
              <div className="col-span-2 flex items-center justify-center space-x-2 text-neutral-300">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>San Salvador de Jujuy</span>
              </div>
            </div>
          </div>

          {/* Formulario RSVP o Pase */}
          {!submittedPass ? (
            <form onSubmit={handleGuestSubmit} className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <h3 className="text-lg font-serif text-amber-200 font-semibold border-b border-neutral-800 pb-2">
                Confirmación de Asistencia
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    placeholder="EJ. CARLOS MENDOZA"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Número de DNI / Documento *</label>
                  <input
                    type="text"
                    required
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    placeholder="35123456"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                      placeholder="nombre@ejemplo.com"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 lowercase focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Teléfono Móvil</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="388..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">¿Asistirá?</label>
                    <select
                      value={formData.attending}
                      onChange={(e) => setFormData({ ...formData, attending: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 uppercase focus:outline-none focus:border-amber-500"
                    >
                      <option value="si">SÍ, ASISTIRÉ</option>
                      <option value="no">NO PODRÉ ASISTIR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Acompañantes</label>
                    <select
                      value={formData.companions}
                      onChange={(e) => setFormData({ ...formData, companions: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 uppercase focus:outline-none focus:border-amber-500"
                    >
                      <option value="0">SOLO YO</option>
                      <option value="1">+1 ACOMPAÑANTE</option>
                      <option value="2">+2 ACOMPAÑANTES</option>
                      <option value="3">+3 ACOMPAÑANTES</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Restricción Alimentaria (Opcional)</label>
                  <input
                    type="text"
                    value={formData.dietary}
                    onChange={(e) => setFormData({ ...formData, dietary: e.target.value.toUpperCase() })}
                    placeholder="CELÍACO, VEGETARIANO, VEGANO, ALERGIA..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>CONFIRMAR MI ASISTENCIA</span>
              </button>
            </form>
          ) : (
            /* PASE DIGITAL */
            <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-500/50 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fade-in">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-serif text-amber-100 font-bold">¡CONFIRMACIÓN EXITOSA!</h3>
                <p className="text-xs text-neutral-400 mt-1">Tu lugar ha sido reservado en el evento.</p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-left text-xs space-y-2">
                <p className="text-neutral-400">TITULAR: <span className="text-neutral-100 font-semibold">{submittedPass.name}</span></p>
                <p className="text-neutral-400">DNI: <span className="text-neutral-100 font-semibold">{submittedPass.dni}</span></p>
                <p className="text-neutral-400">ACOMPAÑANTES: <span className="text-neutral-100 font-semibold">{submittedPass.companions}</span></p>
              </div>

              <p className="text-xs text-amber-400/80 italic">
                El día del evento solo debes indicar tu DNI en la recepción.
              </p>

              <button
                onClick={() => setSubmittedPass(null)}
                className="text-xs text-neutral-500 hover:text-neutral-300 underline"
              >
                Cargar otra respuesta
              </button>
            </div>
          )}

        </main>
      )}

      {/* VISTA 2: TABLET CONTROL (RECEPCIÓN) */}
      {view === 'tablet' && (
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          
          {/* Header Tablet & Métricas */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-xl font-bold text-amber-200 flex items-center space-x-2">
                <span>CONTROL DE RECEPCIÓN</span>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">EN VIVO</span>
              </h2>
              <p className="text-xs text-neutral-400">Búsqueda rápida por DNI o Nombre</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-2 w-full md:w-auto text-center">
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <p className="text-xs text-neutral-400">TOTAL</p>
                <p className="text-lg font-bold text-neutral-100">{totalGuests}</p>
              </div>
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <p className="text-xs text-green-400">PRESENTES</p>
                <p className="text-lg font-bold text-green-400">{totalPresent}</p>
              </div>
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <p className="text-xs text-amber-400">AUSENTES</p>
                <p className="text-lg font-bold text-amber-400">{totalAbsent}</p>
              </div>
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <p className="text-xs text-neutral-400">ASISTENCIA</p>
                <p className="text-lg font-bold text-amber-200">{attendanceRate}%</p>
              </div>
            </div>

            <div className="flex space-x-2 w-full md:w-auto">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 md:flex-none px-3 py-2 bg-amber-500 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-1 hover:bg-amber-400"
              >
                <Plus className="w-4 h-4" />
                <span>AGREGAR VIP</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex-1 md:flex-none px-3 py-2 bg-neutral-800 text-neutral-200 rounded-xl text-xs flex items-center justify-center space-x-1 hover:bg-neutral-700"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>EXPORTAR CSV</span>
              </button>
            </div>
          </div>

          {/* Buscador & Teclado Táctil */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Panel de Búsqueda y Teclado Táctil */}
            <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value.toUpperCase())}
                  placeholder="INGRESE DNI O NOMBRE..."
                  className="w-full bg-neutral-950 border border-amber-500/40 rounded-xl pl-10 pr-4 py-2.5 text-lg font-mono text-amber-200 uppercase focus:outline-none"
                />
              </div>

              {/* Teclado Táctil para Tablet */}
              <div>
                <p className="text-xs text-neutral-400 mb-2 font-semibold">Teclado Rápido DNI</p>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Borrar', '0', 'Limpiar'].map((btn) => (
                    <button
                      key={btn}
                      onClick={() => {
                        if (btn === 'Borrar') setSearchDni(prev => prev.slice(0, -1));
                        else if (btn === 'Limpiar') setSearchDni('');
                        else handleNumPad(btn);
                      }}
                      className="py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-sm transition active:scale-95"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtros */}
              <div className="flex space-x-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition ${filter === 'all' ? 'bg-amber-500 text-black' : 'text-neutral-400'}`}
                >
                  TODOS ({guests.length})
                </button>
                <button
                  onClick={() => setFilter('present')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition ${filter === 'present' ? 'bg-green-500 text-black' : 'text-neutral-400'}`}
                >
                  PRESENTES ({totalPresent})
                </button>
                <button
                  onClick={() => setFilter('absent')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition ${filter === 'absent' ? 'bg-amber-600 text-black' : 'text-neutral-400'}`}
                >
                  AUSENTES ({totalAbsent})
                </button>
              </div>
            </div>

            {/* Lista de Invitados */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-neutral-300">
                LISTA DE INVITADOS ({filteredGuests.length})
              </h3>

              {loading ? (
                <div className="py-12 text-center text-neutral-500 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sincronizando con Firebase...</span>
                </div>
              ) : filteredGuests.length === 0 ? (
                <div className="py-12 text-center text-neutral-500">
                  <p>No se encontraron invitados con esa búsqueda.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredGuests.map((g) => (
                    <div
                      key={g.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                        g.present 
                          ? 'bg-green-950/20 border-green-500/30' 
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-neutral-100">{g.name}</span>
                          <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md font-mono">
                            DNI: {g.dni}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-neutral-400">
                          <span>Acompañantes: <strong className="text-neutral-200">{g.companions}</strong></span>
                          {g.dietary && g.dietary !== 'NINGUNA' && (
                            <span className="text-amber-400 font-semibold">Alimentación: {g.dietary}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        {g.present ? (
                          <div className="text-right">
                            <span className="inline-flex items-center space-x-1 text-xs font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>PRESENTE</span>
                            </span>
                            <p className="text-[10px] text-neutral-400 mt-1">{g.checkInTime}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(g.id)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition shadow-md active:scale-95"
                          >
                            MARCAR PRESENTE
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </main>
      )}

      {/* MODAL AGREGAR GUEST EN PUERTA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-amber-100">ACREDITACIÓN EXPRESS EN PUERTA</h3>
            
            <form onSubmit={handleManualAdd} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value.toUpperCase() })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-neutral-100 uppercase"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">DNI / Documento</label>
                <input
                  type="text"
                  required
                  value={newGuest.dni}
                  onChange={(e) => setNewGuest({ ...newGuest, dni: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-neutral-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-400 mb-1">Acompañantes</label>
                  <input
                    type="number"
                    min="0"
                    value={newGuest.companions}
                    onChange={(e) => setNewGuest({ ...newGuest, companions: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Restricciones</label>
                  <input
                    type="text"
                    value={newGuest.dietary}
                    onChange={(e) => setNewGuest({ ...newGuest, dietary: e.target.value.toUpperCase() })}
                    placeholder="NINGUNA"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-neutral-100 uppercase"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-neutral-800 text-neutral-300"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400"
                >
                  INGRESAR Y ACREDITAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
