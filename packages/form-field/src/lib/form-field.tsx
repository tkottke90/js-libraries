import { useSignal } from "@preact/signals";
import { forwardRef } from "preact/compat";
import { useCallback, useMemo, useRef } from "preact/hooks";

type HTMLInputTypeProp = HTMLInputElement['type'];

interface useFormFieldOptions<TType extends HTMLInputTypeProp> {
  id?: string;
  error?: string;
  defaultValue?: InputDataType<TType>;
}

type InputDataType<TType extends HTMLInputTypeProp> = 
  TType extends 'number' ? number :
  TType extends 'checkbox' ? boolean :
  TType extends 'date' ? Date :
  TType extends 'datetime-local' ? Date :
  TType extends 'time' ? Date :
  TType extends 'month' ? Date :
  TType extends 'week' ? Date :
  TType extends 'file' ? File[] :
  string;

export function createInputValueProps(type: HTMLInputTypeProp, value: any): Record<string, any> {
  const props: Record<string, any> = {};

  switch(type) {
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
  } else if (type === 'date' || type === 'datetime-local' || type === 'time' || type === 'month' || type === 'week') {
    return new Date() as InputDataType<TType>;
  } else if (type === 'file') {
    return [] as File[] as InputDataType<TType>;
  } else {
    return '' as InputDataType<TType>;
  }
}

export function parseChangeEventValue<TType extends HTMLInputTypeProp>(type: TType, event: Event) {
  const target = event.target as HTMLInputElement;

  switch(type) {
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

export function toJson<TType extends HTMLInputTypeProp>(type: TType, name: string, value: InputDataType<TType>) {
  if (type === 'file') {
    return ({
      [name]: Array.from(value as File[]).map((file) => file.name)
    })
  }

  return ({
    [name]: value
  });
}

export function useFormField<TType extends HTMLInputElement['type']>(
  name: string,
  type: TType = 'text' as TType,
  options?: useFormFieldOptions<TType>
) {
  const data = useSignal<InputDataType<TType>>(options?.defaultValue ?? getInitialValue(type));
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    data.value = options?.defaultValue ?? getInitialValue(type);
  }, [type]);

  const Input = useMemo(() =>
    forwardRef<HTMLInputElement, Record<string, any>>((props, ref) => {
      return (
        <input
          {...props}
          ref={ref}
          type={type}
          name={name}
          id={options?.id ?? name}
          {...createInputValueProps(type, data.value)}
          onChange={(e) => {
            data.value = e.currentTarget.value as InputDataType<TType>;
          }}
        />
      )
    })
  , [type, name, options?.id, data]);

  return {
    element: Input,
    name,
    type,
    data,
    reset,
    id: options?.id ?? name,
    error: options?.error,
    ref: inputRef,
    toJSON: () => toJson(type, name, data.value)
  };
}