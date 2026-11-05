import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown, Select } from 'antd';
import { CaptureButton } from './capture-button';

function camera() {
  const capture = vi.fn(() => new Promise<never>(() => {}));
  const notify = vi.fn();
  return {
    capture,
    notify,
    element: (
      <CaptureButton
        capture={capture}
        notify={notify}
        text={key => key}
        getContext={() => ({ path: '/', title: 'Test' })}
      />
    ),
  };
}

it('keeps an Ant Design Select open and focused when clicking capture', async () => {
  const user = userEvent.setup();
  const { element, capture } = camera();
  render(
    <>
      <Select options={[{ value: 'doctor', label: 'Doctor' }]} />
      {element}
    </>,
  );
  const input = screen.getByRole('combobox');
  await user.click(input);
  expect(input).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('button', { name: 'capture' }));
  expect(capture).toHaveBeenCalledTimes(1);
  expect(input).toHaveFocus();
  expect(input).toHaveAttribute('aria-expanded', 'true');
});

it('keeps an Ant Design action dropdown open when clicking capture', async () => {
  const user = userEvent.setup();
  const { element, capture } = camera();
  const onOpenChange = vi.fn();
  render(
    <>
      <Dropdown
        onOpenChange={onOpenChange}
        trigger={['click']}
        menu={{ items: [{ key: 'edit', label: 'Edit' }] }}
      >
        <button>Actions</button>
      </Dropdown>
      <button>Outside</button>
      {element}
    </>,
  );
  await user.click(screen.getByRole('button', { name: 'Actions' }));
  expect(screen.getByRole('button', { name: 'Actions' })).toHaveClass('ant-dropdown-open');
  onOpenChange.mockClear();
  await user.click(screen.getByRole('button', { name: 'capture' }));
  expect(capture).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Actions' })).toHaveClass('ant-dropdown-open');
  expect(onOpenChange).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
});

it('requests a delayed capture on Shift + click and announces only when the adapter is ready', () => {
  const { element, capture, notify } = camera();
  render(element);
  fireEvent.click(screen.getByRole('button', { name: 'capture' }), { shiftKey: true });
  expect(capture).toHaveBeenCalledWith(expect.any(AbortSignal), {
    delayMs: 5000,
    onDelayStart: expect.any(Function),
  });
  expect(notify).not.toHaveBeenCalled();
});
