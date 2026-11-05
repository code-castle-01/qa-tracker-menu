import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import './qa-button.css';

/** Shared QA platform appearance, including links and the floating camera. */
export function QaButton({ className, ...props }: ButtonProps) {
  return <Button {...props} className={['qa-button', className].filter(Boolean).join(' ')} />;
}
