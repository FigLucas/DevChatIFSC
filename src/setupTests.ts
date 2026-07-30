import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Limpar DOM após cada teste
afterEach(() => {
    cleanup();
});
