import React, { useState, useEffect } from 'react';
import logoImg from '../logo.png';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update } from 'firebase/database';
import { 
  Building2, Calendar, Clock, MapPin, CheckCircle, Search, 
  UserCheck, Shield, Plus, FileSpreadsheet, Lock, Sparkles, RefreshCw, UserPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Credenciales Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBDD8SVS0uHnYTlgIMQuIXJzmIYzVSayLA",
  authDomain: "amerian-jujuy-event.firebaseapp.com",
  databaseURL: "https://amerian-jujuy-event-default-rtdb.firebaseio.com",
  projectId: "amerian-jujuy-event",
  storageBucket: "amerian-jujuy-event.firebasestorage.app",
  messagingSenderId: "796737899796",
  appId: "1:796737899796:web:d7cf5876e67a88c4674601"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [view, setView] = useState('guest'); // 'guest' | 'tablet'
  const [canHaveCompanion, setCanHaveCompanion] = useState(false); // Control de link ?plus=1
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
    companionName: '',
    dietary: ''
  });
  const [submittedPass, setSubmittedPass] = useState(null);

  // Estados de la Tablet
  const [searchDni, setSearchDni] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', dni: '', companions: 0, companionName: '', dietary: '' });

  // Detectar parámetros URL (?view=tablet y ?plus=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'tablet') {
      setView('tablet');
    }
    if (params.get('plus') === '1') {
      setCanHaveCompanion(true);
    }
  }, []);

  // Escuchar Firebase en tiempo real
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
    const companionsCount = canHaveCompanion ? (parseInt(formData.companions) || 0) : 0;
    const guestsRef = ref(db, 'guests');
    
    const newGuestRef = push(guestsRef);
    const payload = {
      name: formData.name.toUpperCase().trim(),
      dni: formattedDni,
      email: formData.email.toLowerCase().trim(),
      phone: formData.phone.trim(),
      attending: formData.attending,
      companions: companionsCount,
      companionName: companionsCount > 0 ? (formData.companionName.toUpperCase().trim() || 'ACOMPAÑANTE') : '-',
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
    const compCount = parseInt(newGuest.companions) || 0;

    const guestsRef = ref(db, 'guests');
    const newRef = push(guestsRef);

    set(newRef, {
      name: newGuest.name.toUpperCase().trim(),
      dni: formattedDni,
      email: 'registro.presencial@hotel.com',
      phone: '-',
      attending: 'si',
      companions: compCount,
      companionName: compCount > 0 ? (newGuest.companionName.toUpperCase().trim() || 'ACOMPAÑANTE') : '-',
      dietary: newGuest.dietary ? newGuest.dietary.toUpperCase().trim() : 'NINGUNA',
      present: true,
      checkInTime: timeStr,
      createdAt: now.toISOString()
    });

    setNewGuest({ name: '', dni: '', companions: 0, companionName: '', dietary: '' });
    setShowAddModal(false);
  };

  // Desbloqueo Tablet PIN
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
    const headers = ["NOMBRE", "DNI", "EMAIL", "TELEFONO", "ACOMPAÑANTES", "NOMBRE ACOMPAÑANTE", "RESTRICCIONES", "ESTADO", "HORA LLEGADA"];
    const rows = guests.map(g => [
      `"${g.name}"`,
      `"${g.dni}"`,
      `"${g.email || ''}"`,
      `"${g.phone || ''}"`,
      g.companions,
      `"${g.companionName || '-'}"`,
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

  const handleNumPad = (digit) => {
    setSearchDni(prev => prev + digit);
  };

  // Métricas
  const totalGuests = guests.length;
  const totalPresent = guests.filter(g => g.present).length;
  const totalAbsent = totalGuests - totalPresent;
  const attendanceRate = totalGuests > 0 ? Math.round((totalPresent / totalGuests) * 100) : 0;

  const filteredGuests = guests.filter(g => {
    const searchUpper = searchDni
