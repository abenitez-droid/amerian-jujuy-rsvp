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

  // Detectar
