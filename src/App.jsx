import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update } from 'firebase/database';
import { 
  Building2, Calendar, Clock, MapPin, CheckCircle, Search, 
  UserCheck, Users, Shield, Plus, FileSpreadsheet, Lock, Sparkles, RefreshCw
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
      name: formData.name,
      dni: formattedDni,
      email: formData.email,
      phone: formData.phone,
      attending: formData.attending,
      companions: parseInt(formData.companions) || 0,
      dietary: formData.dietary,
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
      name: newGuest.name,
      dni: formattedDni,
      email: 'Registro Presencial',
      phone: '-',
      attending: 'si',
      companions: parseInt(newGuest.companions) || 0,
      dietary: newGuest.dietary || 'Ninguna',
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
    const headers = ["Nombre", "DNI", "Email", "Telefono", "Acompañantes", "Restricciones", "Estado", "Hora Llegada"];
    const rows = guests.map(g => [
      `"${g.name}"`,
      `"${g.dni}"`,
      `"${g.email || ''}"`,
      `"${g.phone || ''}"`,
      g.companions,
      `"${g.dietary || 'Ninguna'}"`,
      g.present ? "PRESENTE" : "AUSENTE",
      `"${g.checkInTime || '-'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `asistencia_amerian_jujuy.csv`);
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
    const matchesDni = g.dni.includes(searchDni.replace(/\D/g, '')) || g.name.toLowerCase().includes(searchDni.toLowerCase());
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
              <h1 className="text-lg font-serif font-bold tracking-wider text-amber-100">AMÉRAN</h1>
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
              <h3 className="text-lg font-bold text-amber-100">Acceso Control
