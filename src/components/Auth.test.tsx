import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Auth from './Auth';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ login: loginMock }),
}));

describe('Componente Auth', () => {
    beforeEach(() => {
        loginMock.mockReset();
        vi.unstubAllGlobals();
    });

    it('renderiza o formulário de login acessível', () => {
        render(<Auth />);

        expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
        expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
        expect(screen.getByLabelText('Senha')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
    });

    it('não revela se o usuário ou a senha estão incorretos', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
        render(<Auth />);

        fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'desconhecido' } });
        fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha' } });
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.');
    });

    it('inicia a sessão quando a API retorna um token', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ access_token: 'token-seguro', expires_in: 1800 }),
            })
        );
        render(<Auth />);

        fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha' } });
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

        await waitFor(() => expect(loginMock).toHaveBeenCalledWith('token-seguro', 1800));
    });

    it('permite alternar a visibilidade da senha', () => {
        render(<Auth />);
        const password = screen.getByLabelText('Senha');

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
        expect(password).toHaveAttribute('type', 'text');
        expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
    });
});
