import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Auth from './Auth';
import { AuthProvider } from '../context/AuthContext';

// Mock do contexto de autenticação
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        login: vi.fn(),
    }),
    AuthProvider: ({ children }) => <div>{children}</div>,
}));

describe('Componente Auth', () => {
    it('deve renderizar o formulário de login', () => {
        render(
            <AuthProvider>
                <Auth />
            </AuthProvider>
        );
        expect(screen.getByText('Login')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
        expect(screen.getByText('Entrar')).toBeInTheDocument();
    });

    it('deve mostrar erro ao submeter formulário com email inválido', async () => {
        render(
            <AuthProvider>
                <Auth />
            </AuthProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'email-invalido' } });
        fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: '1234' } });
        fireEvent.click(screen.getByText('Entrar'));

        await waitFor(() => {
            expect(screen.getByText('Email ou senha inválidos')).toBeInTheDocument();
        });
    });

    it('deve chamar login ao submeter formulário com dados válidos', async () => {
        const mockLogin = vi.fn();
        vi.spyOn(require('../context/AuthContext'), 'useAuth').mockReturnValueOnce({
            login: mockLogin,
        });

        render(
            <AuthProvider>
                <Auth />
            </AuthProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'teste@exemplo.com' } });
        fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'senha123' } });
        fireEvent.click(screen.getByText('Entrar'));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('fake-token-123');
        });
    });

    it('deve desabilitar botão de login enquanto carregando', async () => {
        render(
            <AuthProvider>
                <Auth />
            </AuthProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'teste@exemplo.com' } });
        fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'senha123' } });
        fireEvent.click(screen.getByText('Entrar'));

        await waitFor(() => {
            expect(screen.getByText('Entrando...')).toBeInTheDocument();
            expect(screen.getByText('Entrar')).toBeDisabled();
        });
    });
});