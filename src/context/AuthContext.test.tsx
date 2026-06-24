import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

// Componente de teste para usar o contexto
function TestComponent() {
    const { token, login, logout, loading } = useAuth();
    return (
        <div>
            <span data-testid="token">{token || 'null'}</span>
            <span data-testid="loading">{loading.toString()}</span>
            <button onClick={() => login('test-token')}>Login</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

describe('AuthContext', () => {
    it('deve iniciar com token nulo e loading true', () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        expect(screen.getByTestId('token').textContent).toBe('null');
        expect(screen.getByTestId('loading').textContent).toBe('true');
    });

    it('deve atualizar token ao fazer login', () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        fireEvent.click(screen.getByText('Login'));
        expect(screen.getByTestId('token').textContent).toBe('test-token');
    });

    it('deve remover token ao fazer logout', () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        fireEvent.click(screen.getByText('Login'));
        fireEvent.click(screen.getByText('Logout'));
        expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('deve carregar token do localStorage ao iniciar', () => {
        localStorage.setItem('token', 'stored-token');
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        expect(screen.getByTestId('token').textContent).toBe('stored-token');
        localStorage.removeItem('token');
    });
});