import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Chat from './Chat';
import { AuthProvider } from '../context/AuthContext';

// Mock do contexto de autenticação
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ answer: 'Resposta simulada' }),
    })
);

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        token: 'fake-token',
    }),
    AuthProvider: ({ children }) => <div>{children}</div>,
}));

describe('Componente Chat', () => {
    it('deve renderizar a interface do chat', () => {
        render(
            <AuthProvider>
                <Chat onLogout={() => {}} />
            </AuthProvider>
        );
        expect(screen.getByText('DevChat')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Digite sua pergunta...')).toBeInTheDocument();
        expect(screen.getByText('Olá! Como posso te ajudar hoje?')).toBeInTheDocument();
    });

    it('deve enviar mensagem e receber resposta', async () => {
        render(
            <AuthProvider>
                <Chat onLogout={() => {}} />
            </AuthProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('Digite sua pergunta...'), {
            target: { value: 'Teste de mensagem' },
        });
        fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

        await waitFor(() => {
            expect(screen.getByText('Teste de mensagem')).toBeInTheDocument();
            expect(screen.getByText('Resposta simulada')).toBeInTheDocument();
        });
    });

    it('deve mostrar erro ao falhar no envio da mensagem', async () => {
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 500,
            })
        );

        render(
            <AuthProvider>
                <Chat onLogout={() => {}} />
            </AuthProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('Digite sua pergunta...'), {
            target: { value: 'Teste de erro' },
        });
        fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

        await waitFor(() => {
            expect(screen.getByText('Desculpe, não consegui processar sua pergunta.')).toBeInTheDocument();
        });
    });

    it('deve chamar onLogout ao clicar no botão de sair', () => {
        const mockLogout = vi.fn();
        render(
            <AuthProvider>
                <Chat onLogout={mockLogout} />
            </AuthProvider>
        );

        fireEvent.click(screen.getByText('Sair'));
        expect(mockLogout).toHaveBeenCalled();
    });
});