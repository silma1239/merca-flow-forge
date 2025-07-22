import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  // Se ainda está carregando, não faz nada
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Carregando...</h1>
          <p className="text-muted-foreground">Aguarde enquanto verificamos suas credenciais.</p>
        </div>
      </div>
    );
  }

  // Redireciona para página inicial se o usuário não estiver autenticado 
  // ou não for administrador
  if (!user || userRole?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Se o usuário estiver autenticado e for administrador, renderiza o conteúdo
  return <>{children}</>;
}