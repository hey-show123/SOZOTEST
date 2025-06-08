'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AdminContextType = {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
};

const ADMIN_PASSWORD = 'sozo1234'; // 実際の運用では環境変数などを使用してください

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行される初期化処理
  useEffect(() => {
    setIsClient(true);
    
    // ローカルストレージから認証状態を復元
    try {
      const adminState = localStorage.getItem('adminAuth');
      if (adminState === 'true') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('認証状態の読み込みエラー:', error);
    }
  }, []);

  // 管理者ログイン
  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      try {
        localStorage.setItem('adminAuth', 'true');
      } catch (error) {
        console.error('認証状態の保存エラー:', error);
      }
      return true;
    }
    return false;
  };

  // 管理者ログアウト
  const logout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem('adminAuth');
    } catch (error) {
      console.error('認証状態の削除エラー:', error);
    }
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
} 