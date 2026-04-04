export interface FormState {
  message?: string;
  success?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
}

export const EMPTY_FORM_STATE: FormState = {};
