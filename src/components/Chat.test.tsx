import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Chat from './Chat';

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        token: 'fake-token',
        logout: logoutMock,
    }),
}));

describe('Componente Chat', () => {
    beforeEach(() => {
        logoutMock.mockReset();
        vi.unstubAllGlobals();
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('renderiza a interface e limita o tamanho da pergunta', () => {
        render(<Chat onLogout={vi.fn()} />);

        expect(
            screen.getByText((_content, element) => element?.textContent === 'IFSCChat')
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Campo de mensagem')).toHaveAttribute('maxlength', '2000');
        expect(screen.getByText('Assistente disponível')).toBeInTheDocument();
    });

    it('envia uma pergunta normalizada e exibe a resposta', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ answer: 'Resposta simulada' }),
        });
        vi.stubGlobal('fetch', fetchMock);
        render(<Chat onLogout={vi.fn()} />);

        fireEvent.change(screen.getByLabelText('Campo de mensagem'), {
            target: { value: '  Teste de mensagem  ' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

        expect(await screen.findByText('Resposta simulada')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/chat-api$/);
        expect(options).toEqual(
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ question: 'Teste de mensagem' }),
            })
        );
    });

    it('encerra a sessão quando o token expira', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
        render(<Chat onLogout={vi.fn()} />);

        fireEvent.change(screen.getByLabelText('Campo de mensagem'), {
            target: { value: 'Pergunta' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

        await waitFor(() => expect(logoutMock).toHaveBeenCalledOnce());
    });

    it('chama o encerramento informado pelo contêiner', () => {
        const onLogout = vi.fn();
        render(<Chat onLogout={onLogout} />);

        fireEvent.click(screen.getByTitle('Encerrar sessão'));
        expect(onLogout).toHaveBeenCalledOnce();
    });
});
