const fs = require('fs');

const parts = [];

// TopBar part 1
parts.push(`// SCIP Layout - Government Portal Top Bar
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
  Shield,
  Flag,
  UserCheck,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Info,
  Home,
  FileText,
  BarChart2
} from 'lucide-react';

interface TopBarProps {
  currentTab: string;
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onMenuClick,
  isMobileMenuOpen
}) => {
  const { user, role, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const mockNotifications = [
    { id: 1, type: 'alert', title: 'New Incident Report', message: 'High priority incident reported in Sector 7', time: '2m ago', read: false },
    { id: 2, type: 'info', title: 'System Update', message: 'SCIP Intelligence Agent v2.1 deployed', time: '1h ago', read: false },
    { id: 3, type: 'success', title: 'Report Verified', message: 'Your report #SCIP-2024-0892 has been verified', time: '3h ago', read: true },
    { id: 4, type: 'warning', title: 'Recurrence Alert', message: 'Pattern detected in Zone 12 - similar to Incident #0847', time: '5h ago', read: true },
  ];

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target)) {
        setRoleSwitcherOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
`);