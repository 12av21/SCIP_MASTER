const fs = require('fs');

function writeFiles() {
  const topbar = getTopBarContent();
  const sidebar = getSidebarContent();
  
  fs.writeFileSync('E:/projects/SCIP_MASTER/frontend/src/components/layout/TopBar.tsx', topbar, 'utf8');
  fs.writeFileSync('E:/projects/SCIP_MASTER/frontend/src/components/layout/Sidebar.tsx', sidebar, 'utf8');
  console.log('Both files written successfully');
}

function getTopBarContent() {
  return `// SCIP Layout - Government Portal Top Bar
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
`;
}
