/**
 * The UI kit's components (prompt 3 section 6, "ui/"; phase 3). This entry holds no brand file, so a
 * Node script (the kit's harness page generator, tests/e2e/pages/ui/) can import it; the app imports
 * the package root, which adds the logo.
 */
export { ActionRow, type ActionRowProps } from './ActionRow';
export { Badge, type BadgeProps } from './Badge';
export { Banner, type BannerProps } from './Banner';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button';
export { CalendarDate, type CalendarDateProps } from './CalendarDate';
export { Card, type CardProps } from './Card';
export {
  Choice,
  ChoiceCard,
  ChoiceGroup,
  type ChoiceCardProps,
  type ChoiceCardShape,
  type ChoiceGroupProps,
  type ChoiceProps,
  type ChoiceType,
} from './Choice';
export { copyKindOfLine, type CopyKindMarker } from './copy-kind';
export { DemoLine, type DemoLineProps } from './DemoLine';
export { Dropzone, type DropzoneLabels, type DropzoneProps } from './Dropzone';
export { FieldError, type FieldErrorProps } from './FieldError';
export { Icon, type IconComponent, type IconProps, type IconSize } from './Icon';
export * as KitIcons from './icons';
export { NotAvailableYet, type NotAvailableYetProps } from './NotAvailableYet';
export { Notice, NoticeRegion, type NoticeProps, type NoticeRegionProps } from './Notice';
export { Price, type PriceProps } from './Price';
export { Progress, type ProgressProps } from './Progress';
export { SelectField, type SelectFieldProps, type SelectOption } from './SelectField';
export { SkipForNow, type SkipForNowProps, type SkippableQuestion } from './SkipForNow';
export { StatusLine, type StatusLineProps } from './StatusLine';
export { Stepper, type StepperLabels, type StepperProps } from './Stepper';
export { TextField, type TextFieldProps } from './TextField';
export { Value, type ValueActionLabels, type ValueLayout, type ValueProps } from './Value';
