import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthContext';

function TestComponent() {
    const { token, login, logout, loading } = useAuth();
    return (
        <div>
            <span data-testid="token">{token || 'null'}</span>
            <span data-testid="loading">{loading.toString()}</span>
            <button onClick={() => login('test-token', 60)}>Login</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.useRealTimers();
    });

    it('inicia sem sessão', async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
        expect(screen.getByTestId('token')).toHaveTextContent('null');
    });

    it('mantém o token apenas no armazenamento da sessão', () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        fireEvent.click(screen.getByText('Login'));

        expect(screen.getByTestId('token')).toHaveTextContent('test-token');
        expect(sessionStorage.getItem('ifsc-chat-session')).toContain('test-token');
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('remove token ao sair', () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        fireEvent.click(screen.getByText('Login'));
        fireEvent.click(screen.getByText('Logout'));

        expect(screen.getByTestId('token')).toHaveTextContent('null');
        expect(sessionStorage.getItem('ifsc-chat-session')).toBeNull();
    });

    it('descarta automaticamente uma sessão expirada', async () => {
        vi.useFakeTimers();
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        fireEvent.click(screen.getByText('Login'));

        await act(async () => {
            vi.advanceTimersByTime(60_001);
        });

        expect(screen.getByTestId('token')).toHaveTextContent('null');
    });
});
