import { CircleAlert } from 'lucide-react';
import { holdsNumberCharacter } from './copy-kind';
import { Icon } from './Icon';

export interface FieldErrorProps {
  /** The element id the field points to with `aria-describedby`. */
  readonly id: string;
  /** The message: fixed copy from the catalogue ("Fill in this field to create the project."). */
  readonly message: string;
}

/**
 * An inline field error (guardrails rule 7: "Continue stays enabled and shows an inline error on each
 * empty required field"; G7-6; US-INTAKE-02 AC2). It sits under its field, tied to it by
 * `aria-describedby` with the field marked `aria-invalid`, and says what to do. It is never a dialog
 * and never disables anything. The kit has no error hue (status colours are proposals pending the
 * owner's OK, D-19): an icon, the words and the field's brighter border carry it, not colour alone.
 * Its words are fixed copy, so it holds no number.
 */
export function FieldError({ id, message }: FieldErrorProps) {
  if (holdsNumberCharacter(message)) {
    throw new Error('FieldError: an error message is fixed copy and holds no number.');
  }
  return (
    <p className="sov-field-error" id={id}>
      <Icon icon={CircleAlert} size="small" />
      <span>{message}</span>
    </p>
  );
}
