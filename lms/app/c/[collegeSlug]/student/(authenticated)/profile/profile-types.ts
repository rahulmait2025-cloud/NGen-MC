export type ProfileField = {
  label: string;
  key: string;
  value: string | null;
  icon: string;
  editable?: boolean;
  placeholder?: string;
  capitalize?: boolean;
  isLink?: boolean;
  maxLength?: number;
};
