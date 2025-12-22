import { useSignal } from '@preact/signals';
import { JSX } from 'preact';
import { ChangeEvent, ComponentType, forwardRef } from 'preact/compat';
import { useCallback, useMemo, useRef } from 'preact/hooks';

type HTMLInputTypeProp = HTMLInputElement['type'];

interface useFormFieldOptions<TType extends HTMLInputTypeProp> {
  /**
   * Custom id for the field.  If not provided, the name will be used.
   */
  id?: string;

  /**
   * Error message to display to the user when the field is invalid.
   */
  error?: string;

  /**
   * Initial value for the field.
   */
  defaultValue?: InputDataType<TType>;

  /**
   * Custom element to use instead of the default `input` element.  This can be a string representing a native element or a custom component.
   */
  element?: keyof JSX.IntrinsicElements | ComponentType<any>;
}

type InputDataType<TType extends HTMLInputTypeProp> = TType extends 'number'
  ? number
  : TType extends 'checkbox'
  ? boolean
  : TType extends 'date'
  ? Date
  : TType extends 'datetime-local'
  ? Date
  : TType extends 'time'
  ? Date
  : TType extends 'month'
  ? Date
  : TType extends 'week'
  ? Date
  : TType extends 'file'
  ? File[]
  : string;

export function createInputValueProps(
  type: HTMLInputTypeProp,
  value: any
): Record<string, any> {
  const props: Record<string, any> = {};

  switch (type) {
    case 'checkbox': {
      props.defaultChecked = value === true;
      props.checked = value === true;
      break;
    }
    case 'date':
    case 'datetime-local':
    case 'time':
    case 'month':
    case 'week': {
      props.defaultValue = value.toISOString();
      props.value = value.toISOString();
      break;
    }

    case 'file': {
      props.files = value;
      break;
    }

    default: {
      props.defaultValue = value;
      props.value = value;
      break;
    }
  }

  return props;
}

export function getInitialValue<TType extends HTMLInputTypeProp>(type: TType) {
  if (type === 'number') {
    return 0 as InputDataType<TType>;
  } else if (type === 'checkbox') {
    return false as InputDataType<TType>;
  } else if (
    type === 'date' ||
    type === 'datetime-local' ||
    type === 'time' ||
    type === 'month' ||
    type === 'week'
  ) {
    return new Date() as InputDataType<TType>;
  } else if (type === 'file') {
    return [] as File[] as InputDataType<TType>;
  } else {
    return '' as InputDataType<TType>;
  }
}

export function parseChangeEventValue<TType extends HTMLInputTypeProp>(
  type: TType,
  event: Event
) {
  const target = event.target as HTMLInputElement;

  switch (type) {
    case 'number': {
      return Number(target.value);
    }
    case 'checkbox': {
      return target.checked;
    }
    case 'date':
    case 'datetime-local':
    case 'time':
    case 'month':
    case 'week': {
      return new Date(target.value);
    }

    case 'file': {
      return target.files;
    }

    default: {
      return target.value;
    }
  }
}

export function toJson<TType extends HTMLInputTypeProp>(
  type: TType,
  name: string,
  value: InputDataType<TType>
) {
  if (type === 'file') {
    return {
      [name]: Array.from(value as File[]).map((file) => file.name),
    };
  }

  return {
    [name]: value,
  };
}

/**
 * A Preact hook for managing form field state with type-safe input handling.
 *
 * This hook provides a complete solution for form field management, including:
 * - Type-specific data handling (text, number, checkbox, date, file, etc.)
 * - Automatic value prop generation based on input type
 * - Built-in reset functionality
 * - JSON serialization support
 * - Custom element support (use any HTML element or custom component)
 * - Preact signals for reactive state management
 *
 * @template TType - The HTML input type (e.g., 'text', 'number', 'checkbox', 'date', 'file')
 *
 * @param {string} name - The name attribute for the input field. Also used as the default id if not specified in options.
 * @param {TType} [type='text'] - The input type. Determines the data type and behavior of the field.
 *   Supported types:
 *   - 'text', 'email', 'password', 'tel', 'url', 'search' - Returns string values
 *   - 'number' - Returns number values, automatically parses string input
 *   - 'checkbox' - Returns boolean values, uses checked/defaultChecked props
 *   - 'date', 'datetime-local', 'time', 'month', 'week' - Returns Date objects, converts to/from ISO strings
 *   - 'file' - Returns File[] array, uses files prop instead of value
 * @param {useFormFieldOptions<TType>} [options] - Optional configuration object
 * @param {string} [options.id] - Custom id for the field. If not provided, uses the name parameter.
 * @param {string} [options.error] - Error message to display when the field is invalid.
 * @param {InputDataType<TType>} [options.defaultValue] - Initial value for the field. Type depends on the input type:
 *   - text types: string (default: '')
 *   - number: number (default: 0)
 *   - checkbox: boolean (default: false)
 *   - date types: Date (default: new Date())
 *   - file: File[] (default: [])
 * @param {keyof JSX.IntrinsicElements | ComponentType<any>} [options.element='input'] - Custom element to render instead of the default input element.
 *   Can be a string (e.g., 'textarea', 'select') or a custom Preact component.
 *
 * @returns {Object} Form field object with the following properties:
 * @returns {ComponentType} element - A Preact component that renders the form field. Accepts all standard HTML input props.
 *   The component automatically includes name, type, id, and appropriate value props (value/checked/files).
 * @returns {string} name - The name of the field (same as the name parameter).
 * @returns {TType} type - The input type (same as the type parameter).
 * @returns {Signal<InputDataType<TType>>} data - A Preact signal containing the current field value.
 *   The value type is determined by the input type (string, number, boolean, Date, or File[]).
 * @returns {() => void} reset - Function to reset the field to its default value or type-specific initial value.
 * @returns {string} id - The id of the field (from options.id or defaults to name).
 * @returns {string | undefined} error - The error message (from options.error).
 * @returns {RefObject<HTMLInputElement>} ref - A ref object for accessing the underlying DOM element.
 * @returns {() => Record<string, any>} toJSON - Function that returns a JSON-serializable object with the field name as key and current value.
 *   For file inputs, returns an array of filenames instead of File objects.
 *
 * @example
 * // Basic text input
 * const username = useFormField('username', 'text');
 * return <username.element placeholder="Enter username" />;
 * // Access value: username.data.value
 *
 * @example
 * // Number input with default value
 * const age = useFormField('age', 'number', { defaultValue: 18 });
 * return <age.element min={0} max={120} />;
 * // Access value: age.data.value (type: number)
 *
 * @example
 * // Checkbox with error handling
 * const terms = useFormField('terms', 'checkbox', {
 *   error: 'You must accept the terms'
 * });
 * return (
 *   <div>
 *     <terms.element />
 *     {terms.error && <span>{terms.error}</span>}
 *   </div>
 * );
 *
 * @example
 * // Date input
 * const birthdate = useFormField('birthdate', 'date');
 * return <birthdate.element />;
 * // Access value: birthdate.data.value (type: Date)
 *
 * @example
 * // File input
 * const avatar = useFormField('avatar', 'file');
 * return <avatar.element accept="image/*" />;
 * // Access files: avatar.data.value (type: File[])
 *
 * @example
 * // Custom element (textarea)
 * const bio = useFormField('bio', 'text', {
 *   element: 'textarea'
 * });
 * return <bio.element rows={5} />;
 *
 * @example
 * // Reset functionality
 * const email = useFormField('email', 'email', {
 *   defaultValue: 'user@example.com'
 * });
 * const handleReset = () => email.reset();
 * return (
 *   <div>
 *     <email.element />
 *     <button onClick={handleReset}>Reset</button>
 *   </div>
 * );
 *
 * @example
 * // JSON serialization for form submission
 * const form = {
 *   username: useFormField('username', 'text'),
 *   age: useFormField('age', 'number'),
 *   agreed: useFormField('agreed', 'checkbox')
 * };
 *
 * const handleSubmit = () => {
 *   const data = {
 *     ...form.username.toJSON(),
 *     ...form.age.toJSON(),
 *     ...form.agreed.toJSON()
 *   };
 *   // data = { username: "...", age: 25, agreed: true }
 * };
 */
export function useFormField<TType extends HTMLInputElement['type']>(
  name: string,
  type: TType = 'text' as TType,
  options?: useFormFieldOptions<TType>
) {
  const data = useSignal<InputDataType<TType>>(
    options?.defaultValue ?? getInitialValue(type)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    data.value = options?.defaultValue ?? getInitialValue(type);
  }, [type]);

  const ElementComponent = options?.element ?? 'input';

  const Input = useMemo(
    () =>
      forwardRef<HTMLInputElement, Record<string, any>>((props, ref) => {
        return (
          <ElementComponent
            {...props}
            ref={ref}
            type={type}
            name={name}
            id={options?.id ?? name}
            {...createInputValueProps(type, data.value)}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              data.value = e.currentTarget.value as InputDataType<TType>;
            }}
          />
        );
      }),
    [type, name, options?.id, options?.element, data]
  );

  return {
    element: Input,
    name,
    type,
    data,
    reset,
    id: options?.id ?? name,
    error: options?.error,
    ref: inputRef,
    toJSON: () => toJson(type, name, data.value),
  };
}
