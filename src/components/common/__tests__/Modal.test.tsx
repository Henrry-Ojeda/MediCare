import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('no renderiza contenido cuando isOpen es false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Título de prueba">
        <p>Contenido oculto</p>
      </Modal>
    );
    expect(screen.queryByText('Contenido oculto')).not.toBeInTheDocument();
  });

  it('renderiza título y llama onClose al presionar el botón cerrar', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Nuevo Paciente">
        <p>Formulario</p>
      </Modal>
    );
    expect(screen.getByText('Nuevo Paciente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cerrar modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
