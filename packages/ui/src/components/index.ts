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
export { ValueName, type ValueNameProps } from './ValueName';
export {
  InspectorLayout,
  PageHeader,
  StatusFooter,
  WorkspaceFrame,
  type InspectorLayoutProps,
  type PageBackLink,
  type PageHeaderProps,
  type StatusFooterProps,
  type WorkspaceFrameProps,
} from './frame';
export { ModelArea, type ModelAreaProps, type ModelAreaStatus } from './ModelArea';
export {
  RegisterTable,
  type ContentColumn,
  type RegisterColumn,
  type RegisterSelection,
  type RegisterTableProps,
  type SortDirection,
  type ValueColumn,
} from './RegisterTable';
export {
  ActiveFilters,
  SelectionList,
  type ActiveFilter,
  type ActiveFiltersProps,
  type SelectionListProps,
  type SelectionOption,
} from './SelectionList';
export { SideNav, type SideNavItem, type SideNavProps } from './SideNav';
export {
  ChipGroup,
  InlinePanel,
  Inspector,
  MenuButton,
  Pager,
  Switch,
  Tabs,
  type ChipGroupProps,
  type ChipOption,
  type InlinePanelProps,
  type InspectorProps,
  type MenuButtonProps,
  type MenuItem,
  type PagerProps,
  type SwitchProps,
  type TabItem,
  type TabsProps,
} from './workspace';
