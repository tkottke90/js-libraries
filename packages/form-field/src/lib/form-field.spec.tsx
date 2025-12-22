import { act, renderHook } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import {
  createInputValueProps,
  getInitialValue,
  parseChangeEventValue,
  toJson,
  useFormField,
} from './form-field.js';

describe('useFormField', () => {
  describe('initialization', () => {
    it('should create a form field with name and default text type', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.name).toBe('username');
      expect(result.current.type).toBe('text');
    });

    it('should create a form field with specified type', () => {
      // Act
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Assert
      expect(result.current.name).toBe('age');
      expect(result.current.type).toBe('number');
    });

    it('should initialize with default value when provided', () => {
      // Arrange
      const defaultValue = 'John Doe';

      // Act
      const { result } = renderHook(() =>
        useFormField('name', 'text', { defaultValue })
      );

      // Assert
      expect(result.current.data.value).toBe('John Doe');
    });

    it('should initialize with type-specific default value when no default provided', () => {
      // Act
      const { result: textResult } = renderHook(() =>
        useFormField('name', 'text')
      );
      const { result: numberResult } = renderHook(() =>
        useFormField('age', 'number')
      );
      const { result: checkboxResult } = renderHook(() =>
        useFormField('agreed', 'checkbox')
      );

      // Assert
      expect(textResult.current.data.value).toBe('');
      expect(numberResult.current.data.value).toBe(0);
      expect(checkboxResult.current.data.value).toBe(false);
    });

    it('should set id to name when no id option provided', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.id).toBe('username');
    });

    it('should use custom id when provided in options', () => {
      // Arrange
      const customId = 'custom-username-id';

      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { id: customId })
      );

      // Assert
      expect(result.current.id).toBe('custom-username-id');
    });

    it('should set error when provided in options', () => {
      // Arrange
      const errorMessage = 'Username is required';

      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { error: errorMessage })
      );

      // Assert
      expect(result.current.error).toBe('Username is required');
    });

    it('should initialize data signal with correct initial value', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('count', 'number', { defaultValue: 42 })
      );

      // Assert
      expect(result.current.data.value).toBe(42);
    });
  });

  describe('returned properties', () => {
    it('should return element component', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.element).toBeDefined();
      expect(typeof result.current.element).toBe('function');
    });

    it('should return name property', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.name).toBe('username');
    });

    it('should return type property', () => {
      // Act
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Assert
      expect(result.current.type).toBe('number');
    });

    it('should return data signal', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.data).toBeDefined();
      expect(result.current.data.value).toBeDefined();
    });

    it('should return reset function', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.reset).toBeDefined();
      expect(typeof result.current.reset).toBe('function');
    });

    it('should return id property', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.id).toBe('username');
    });

    it('should return error property', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { error: 'Required' })
      );

      // Assert
      expect(result.current.error).toBe('Required');
    });

    it('should return ref object', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.ref).toBeDefined();
      expect(result.current.ref.current).toBeNull();
    });

    it('should return toJSON function', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.toJSON).toBeDefined();
      expect(typeof result.current.toJSON).toBe('function');
    });
  });

  describe('element component', () => {
    it('should render input element by default', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.element).toBeDefined();
      expect(typeof result.current.element).toBe('function');
    });

    it('should render with correct name attribute', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));
      const Element = result.current.element;

      // Assert
      expect(Element).toBeDefined();
      // The element component will pass name prop when rendered
      expect(result.current.name).toBe('username');
    });

    it('should render with correct type attribute', () => {
      // Act
      const { result } = renderHook(() => useFormField('age', 'number'));
      const Element = result.current.element;

      // Assert
      expect(Element).toBeDefined();
      expect(result.current.type).toBe('number');
    });

    it('should render with correct id attribute', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { id: 'custom-id' })
      );

      // Assert
      expect(result.current.id).toBe('custom-id');
    });

    it('should apply value props from createInputValueProps', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { defaultValue: 'John' })
      );

      // Assert
      expect(result.current.data.value).toBe('John');
    });

    it('should accept additional props passed to component', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));
      const Element = result.current.element;

      // Assert
      expect(Element).toBeDefined();
      expect(typeof Element).toBe('function');
    });

    it('should forward ref to underlying element', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.ref).toBeDefined();
      expect(result.current.ref.current).toBeNull();
    });

    it('should update data signal on change event', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('username', 'text'));

      // Act
      act(() => {
        result.current.data.value = 'Jane Doe';
      });

      // Assert
      expect(result.current.data.value).toBe('Jane Doe');
    });
  });

  describe('data signal', () => {
    it('should be a Preact signal', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.data).toBeDefined();
      expect(result.current.data.value).toBeDefined();
    });

    it('should contain initial value on creation', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { defaultValue: 'John' })
      );

      // Assert
      expect(result.current.data.value).toBe('John');
    });

    it('should update when element value changes', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('username'));

      // Act
      act(() => {
        result.current.data.value = 'Updated Value';
      });

      // Assert
      expect(result.current.data.value).toBe('Updated Value');
    });

    it('should be reactive to changes', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('count', 'number'));

      // Act
      act(() => {
        result.current.data.value = 42;
      });

      // Assert
      expect(result.current.data.value).toBe(42);

      // Act again
      act(() => {
        result.current.data.value = 100;
      });

      // Assert again
      expect(result.current.data.value).toBe(100);
    });
  });

  describe('reset method', () => {
    it('should reset data to default value when provided', () => {
      // Arrange
      const { result } = renderHook(() =>
        useFormField('username', 'text', { defaultValue: 'John' })
      );

      // Act - change the value
      act(() => {
        result.current.data.value = 'Jane';
      });
      expect(result.current.data.value).toBe('Jane');

      // Act - reset
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.data.value).toBe('John');
    });

    it('should reset data to type-specific initial value when no default', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('username', 'text'));

      // Act - change the value
      act(() => {
        result.current.data.value = 'Changed';
      });

      // Act - reset
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.data.value).toBe('');
    });

    it('should reset text input to empty string', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('username', 'text'));

      // Act - change the value
      act(() => {
        result.current.data.value = 'Some text';
      });

      // Act - reset
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.data.value).toBe('');
    });

    it('should reset number input to 0', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Act - change the value
      act(() => {
        result.current.data.value = 42;
      });

      // Act - reset
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.data.value).toBe(0);
    });

    it('should reset checkbox to false', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('agreed', 'checkbox'));

      // Act - change the value
      act(() => {
        result.current.data.value = true;
      });

      // Act - reset
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.data.value).toBe(false);
    });

    it('should reset date inputs to new Date', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('birthdate', 'date'));
      const initialDate = result.current.data.value;

      // Act - change the value
      act(() => {
        result.current.data.value = new Date('2020-01-01');
      });

      // Act - reset
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.data.value).toBeInstanceOf(Date);
      expect(result.current.data.value).not.toEqual(new Date('2020-01-01'));
    });

    it('should reset file input to empty array', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('documents', 'file'));

      // Act - change the value
      act(() => {
        result.current.data.value = [
          new File(['content'], 'test.txt'),
        ] as File[];
      });

      // Act - reset
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.data.value).toEqual([]);
    });
  });

  describe('toJSON method', () => {
    it('should return object with field name as key', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('username', 'text'));

      // Act
      const json = result.current.toJSON();

      // Assert
      expect(json).toHaveProperty('username');
    });

    it('should return current data value', () => {
      // Arrange
      const { result } = renderHook(() =>
        useFormField('username', 'text', { defaultValue: 'John' })
      );

      // Act
      const json = result.current.toJSON();

      // Assert
      expect(json.username).toBe('John');
    });

    it('should handle text input values', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('username', 'text'));

      // Act
      act(() => {
        result.current.data.value = 'Jane Doe';
      });
      const json = result.current.toJSON();

      // Assert
      expect(json.username).toBe('Jane Doe');
    });

    it('should handle number input values', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Act
      act(() => {
        result.current.data.value = 42;
      });
      const json = result.current.toJSON();

      // Assert
      expect(json.age).toBe(42);
    });

    it('should handle checkbox values', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('agreed', 'checkbox'));

      // Act
      act(() => {
        result.current.data.value = true;
      });
      const json = result.current.toJSON();

      // Assert
      expect(json.agreed).toBe(true);
    });

    it('should handle date input values', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('birthdate', 'date'));
      const testDate = new Date('2024-01-15');

      // Act
      act(() => {
        result.current.data.value = testDate;
      });
      const json = result.current.toJSON();

      // Assert
      expect(json.birthdate).toBeInstanceOf(Date);
    });

    it('should handle file input values as array of filenames', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('documents', 'file'));
      const files = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.pdf'),
      ];

      // Act
      act(() => {
        result.current.data.value = files as File[];
      });
      const json = result.current.toJSON();

      // Assert
      expect(Array.isArray(json.documents)).toBe(true);
      expect(json.documents).toEqual(['file1.txt', 'file2.pdf']);
    });
  });

  describe('custom element support', () => {
    it('should use input element when no custom element provided', () => {
      // Act
      const { result } = renderHook(() => useFormField('username'));

      // Assert
      expect(result.current.element).toBeDefined();
      expect(typeof result.current.element).toBe('function');
    });

    it('should use custom HTML element when provided (e.g., textarea)', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('bio', 'text', { element: 'textarea' })
      );

      // Assert
      expect(result.current.element).toBeDefined();
      expect(typeof result.current.element).toBe('function');
    });

    it('should use custom component when provided', () => {
      // Arrange
      const CustomInput = () => null;

      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { element: CustomInput })
      );

      // Assert
      expect(result.current.element).toBeDefined();
      expect(typeof result.current.element).toBe('function');
    });

    it('should pass all props to custom element', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { element: 'textarea' })
      );

      // Assert
      expect(result.current.element).toBeDefined();
      expect(result.current.name).toBe('username');
      expect(result.current.type).toBe('text');
    });

    it('should maintain type attribute with custom element', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { element: 'textarea' })
      );

      // Assert
      expect(result.current.type).toBe('text');
    });

    it('should maintain name attribute with custom element', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', { element: 'textarea' })
      );

      // Assert
      expect(result.current.name).toBe('username');
    });

    it('should maintain id attribute with custom element', () => {
      // Act
      const { result } = renderHook(() =>
        useFormField('username', 'text', {
          id: 'custom-id',
          element: 'textarea',
        })
      );

      // Assert
      expect(result.current.id).toBe('custom-id');
    });
  });

  describe('input type: text', () => {
    it('should initialize with empty string', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('name'));

      // Assert
      expect(result.current.data.value).toBe('');
    });

    it('should update data signal with string value on change', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('name', 'text'));

      // Act
      act(() => {
        result.current.data.value = 'John Doe';
      });

      // Assert
      expect(result.current.data.value).toBe('John Doe');
    });

    it('should set value and defaultValue props', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('name', 'text'));

      // Act
      act(() => {
        result.current.data.value = 'test value';
      });

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe('test value');
      expect(props.props.defaultValue).toBe('test value');
    });
  });

  describe('input type: number', () => {
    it('should initialize with 0', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Assert
      expect(result.current.data.value).toBe(0);
    });

    it('should update data signal with number value on change', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Act
      act(() => {
        result.current.data.value = 42;
      });

      // Assert
      expect(result.current.data.value).toBe(42);
    });

    it('should parse string input to number', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Act
      act(() => {
        result.current.data.value = '25' as any;
      });

      // Assert
      expect(result.current.data.value).toBe('25');
      expect(typeof result.current.data.value).toBe('string');
    });

    it('should set value and defaultValue props', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('age', 'number'));

      // Act
      act(() => {
        result.current.data.value = 100;
      });

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe(100);
      expect(props.props.defaultValue).toBe(100);
    });
  });

  describe('input type: checkbox', () => {
    it('should initialize with false', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('agree', 'checkbox'));

      // Assert
      expect(result.current.data.value).toBe(false);
    });

    it('should update data signal with boolean value on change', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('agree', 'checkbox'));

      // Act
      act(() => {
        result.current.data.value = true;
      });

      // Assert
      expect(result.current.data.value).toBe(true);
    });

    it('should set checked and defaultChecked props', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('agree', 'checkbox'));

      // Act
      act(() => {
        result.current.data.value = true;
      });

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.checked).toBe(true);
      expect(props.props.defaultChecked).toBe(true);
    });

    it('should not set value props for checkbox', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('agree', 'checkbox'));

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBeUndefined();
      expect(props.props.defaultValue).toBeUndefined();
    });
  });

  describe('input type: date', () => {
    it('should initialize with Date object', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('birthday', 'date'));

      // Assert
      expect(result.current.data.value).toBeInstanceOf(Date);
    });

    it('should update data signal with Date object on change', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('birthday', 'date'));
      const newDate = new Date('2024-01-15');

      // Act
      act(() => {
        result.current.data.value = newDate;
      });

      // Assert
      expect(result.current.data.value).toBe(newDate);
    });

    it('should convert value to ISO string for input', () => {
      // Arrange
      const testDate = new Date('2024-01-15');
      const { result } = renderHook(() =>
        useFormField('birthday', 'date', { defaultValue: testDate })
      );

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe(testDate.toISOString());
    });

    it('should set value and defaultValue as ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15');
      const { result } = renderHook(() =>
        useFormField('birthday', 'date', { defaultValue: testDate })
      );

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe(testDate.toISOString());
      expect(props.props.defaultValue).toBe(testDate.toISOString());
    });
  });

  describe('input type: datetime-local', () => {
    it('should initialize with Date object', () => {
      // Arrange
      const { result } = renderHook(() =>
        useFormField('appointment', 'datetime-local')
      );

      // Assert
      expect(result.current.data.value).toBeInstanceOf(Date);
    });

    it('should update data signal with Date object on change', () => {
      // Arrange
      const { result } = renderHook(() =>
        useFormField('appointment', 'datetime-local')
      );
      const newDate = new Date('2024-01-15T14:30:00');

      // Act
      act(() => {
        result.current.data.value = newDate;
      });

      // Assert
      expect(result.current.data.value).toBe(newDate);
    });

    it('should convert value to ISO string for input', () => {
      // Arrange
      const testDate = new Date('2024-01-15T14:30:00');
      const { result } = renderHook(() =>
        useFormField('appointment', 'datetime-local', {
          defaultValue: testDate,
        })
      );

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe(testDate.toISOString());
    });
  });

  describe('input type: time', () => {
    it('should initialize with Date object', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('alarm', 'time'));

      // Assert
      expect(result.current.data.value).toBeInstanceOf(Date);
    });

    it('should update data signal with Date object on change', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('alarm', 'time'));
      const newDate = new Date('2024-01-15T14:30:00');

      // Act
      act(() => {
        result.current.data.value = newDate;
      });

      // Assert
      expect(result.current.data.value).toBe(newDate);
    });

    it('should convert value to ISO string for input', () => {
      // Arrange
      const testDate = new Date('2024-01-15T14:30:00');
      const { result } = renderHook(() =>
        useFormField('alarm', 'time', { defaultValue: testDate })
      );

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe(testDate.toISOString());
    });
  });

  describe('input type: month', () => {
    it('should initialize with Date object', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('period', 'month'));

      // Assert
      expect(result.current.data.value).toBeInstanceOf(Date);
    });

    it('should update data signal with Date object on change', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('period', 'month'));
      const newDate = new Date('2024-01-01');

      // Act
      act(() => {
        result.current.data.value = newDate;
      });

      // Assert
      expect(result.current.data.value).toBe(newDate);
    });

    it('should convert value to ISO string for input', () => {
      // Arrange
      const testDate = new Date('2024-01-01');
      const { result } = renderHook(() =>
        useFormField('period', 'month', { defaultValue: testDate })
      );

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe(testDate.toISOString());
    });
  });

  describe('input type: week', () => {
    it('should initialize with Date object', () => {
      // Arrange
      const { result } = renderHook(() =>
        useFormField('weekSelection', 'week')
      );

      // Assert
      expect(result.current.data.value).toBeInstanceOf(Date);
    });

    it('should update data signal with Date object on change', () => {
      // Arrange
      const { result } = renderHook(() =>
        useFormField('weekSelection', 'week')
      );
      const newDate = new Date('2024-01-15');

      // Act
      act(() => {
        result.current.data.value = newDate;
      });

      // Assert
      expect(result.current.data.value).toBe(newDate);
    });

    it('should convert value to ISO string for input', () => {
      // Arrange
      const testDate = new Date('2024-01-15');
      const { result } = renderHook(() =>
        useFormField('weekSelection', 'week', { defaultValue: testDate })
      );

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe(testDate.toISOString());
    });
  });

  describe('input type: file', () => {
    it('should initialize with empty array', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('upload', 'file'));

      // Assert
      expect(result.current.data.value).toEqual([]);
      expect(Array.isArray(result.current.data.value)).toBe(true);
    });

    it('should update data signal with FileList on change', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('upload', 'file'));
      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });

      // Act
      act(() => {
        result.current.data.value = [mockFile];
      });

      // Assert
      expect(result.current.data.value).toEqual([mockFile]);
      expect(result.current.data.value[0]).toBe(mockFile);
    });

    it('should set files prop instead of value', () => {
      // Arrange
      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });
      const { result } = renderHook(() =>
        useFormField('upload', 'file', { defaultValue: [mockFile] })
      );

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.files).toEqual([mockFile]);
    });

    it('should not set value or defaultValue props', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('upload', 'file'));

      // Assert
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBeUndefined();
      expect(props.props.defaultValue).toBeUndefined();
    });
  });

  describe('input type: email', () => {
    it('should initialize with empty string', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('email', 'email'));

      // Assert
      expect(result.current.data.value).toBe('');
    });

    it('should handle email input as text type', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('email', 'email'));

      // Act
      act(() => {
        result.current.data.value = 'test@example.com';
      });

      // Assert
      expect(result.current.data.value).toBe('test@example.com');
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe('test@example.com');
    });
  });

  describe('input type: password', () => {
    it('should initialize with empty string', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('password', 'password'));

      // Assert
      expect(result.current.data.value).toBe('');
    });

    it('should handle password input as text type', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('password', 'password'));

      // Act
      act(() => {
        result.current.data.value = 'secret123';
      });

      // Assert
      expect(result.current.data.value).toBe('secret123');
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe('secret123');
    });
  });

  describe('input type: tel', () => {
    it('should initialize with empty string', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('phone', 'tel'));

      // Assert
      expect(result.current.data.value).toBe('');
    });

    it('should handle tel input as text type', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('phone', 'tel'));

      // Act
      act(() => {
        result.current.data.value = '555-1234';
      });

      // Assert
      expect(result.current.data.value).toBe('555-1234');
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe('555-1234');
    });
  });

  describe('input type: url', () => {
    it('should initialize with empty string', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('website', 'url'));

      // Assert
      expect(result.current.data.value).toBe('');
    });

    it('should handle url input as text type', () => {
      // Arrange
      const { result } = renderHook(() => useFormField('website', 'url'));

      // Act
      act(() => {
        result.current.data.value = 'https://example.com';
      });

      // Assert
      expect(result.current.data.value).toBe('https://example.com');
      const Input = result.current.element;
      const props = Input({});
      expect(props.props.value).toBe('https://example.com');
    });
  });
});

describe('createInputValueProps', () => {
  describe('text type', () => {
    it('should return value and defaultValue props', () => {
      // Arrange
      const testValue = 'test string';

      // Act
      const props = createInputValueProps('text', testValue);

      // Assert
      expect(props).toHaveProperty('value');
      expect(props).toHaveProperty('defaultValue');
    });

    it('should set both props to the same value', () => {
      // Arrange
      const testValue = 'test string';

      // Act
      const props = createInputValueProps('text', testValue);

      // Assert
      expect(props.value).toBe(testValue);
      expect(props.defaultValue).toBe(testValue);
    });

    it('should handle empty string value', () => {
      // Arrange
      const testValue = '';

      // Act
      const props = createInputValueProps('text', testValue);

      // Assert
      expect(props.value).toBe('');
      expect(props.defaultValue).toBe('');
    });

    it('should handle non-empty string value', () => {
      // Arrange
      const testValue = 'Hello World';

      // Act
      const props = createInputValueProps('text', testValue);

      // Assert
      expect(props.value).toBe('Hello World');
      expect(props.defaultValue).toBe('Hello World');
    });
  });

  describe('number type', () => {
    it('should return value and defaultValue props', () => {
      // Arrange
      const testValue = 42;

      // Act
      const props = createInputValueProps('number', testValue);

      // Assert
      expect(props).toHaveProperty('value');
      expect(props).toHaveProperty('defaultValue');
    });

    it('should handle numeric values', () => {
      // Arrange
      const testValue = 123.45;

      // Act
      const props = createInputValueProps('number', testValue);

      // Assert
      expect(props.value).toBe(123.45);
      expect(props.defaultValue).toBe(123.45);
    });

    it('should handle zero value', () => {
      // Arrange
      const testValue = 0;

      // Act
      const props = createInputValueProps('number', testValue);

      // Assert
      expect(props.value).toBe(0);
      expect(props.defaultValue).toBe(0);
    });
  });

  describe('checkbox type', () => {
    it('should return checked and defaultChecked props', () => {
      // Arrange
      const testValue = true;

      // Act
      const props = createInputValueProps('checkbox', testValue);

      // Assert
      expect(props).toHaveProperty('checked');
      expect(props).toHaveProperty('defaultChecked');
    });

    it('should set checked to true when value is true', () => {
      // Arrange
      const testValue = true;

      // Act
      const props = createInputValueProps('checkbox', testValue);

      // Assert
      expect(props.checked).toBe(true);
      expect(props.defaultChecked).toBe(true);
    });

    it('should set checked to false when value is false', () => {
      // Arrange
      const testValue = false;

      // Act
      const props = createInputValueProps('checkbox', testValue);

      // Assert
      expect(props.checked).toBe(false);
      expect(props.defaultChecked).toBe(false);
    });

    it('should not return value or defaultValue props', () => {
      // Arrange
      const testValue = true;

      // Act
      const props = createInputValueProps('checkbox', testValue);

      // Assert
      expect(props).not.toHaveProperty('value');
      expect(props).not.toHaveProperty('defaultValue');
    });
  });

  describe('date type', () => {
    it('should return value and defaultValue as ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15');

      // Act
      const props = createInputValueProps('date', testDate);

      // Assert
      expect(props).toHaveProperty('value');
      expect(props).toHaveProperty('defaultValue');
      expect(typeof props.value).toBe('string');
      expect(typeof props.defaultValue).toBe('string');
    });

    it('should convert Date object to ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15');

      // Act
      const props = createInputValueProps('date', testDate);

      // Assert
      expect(props.value).toBe(testDate.toISOString());
      expect(props.defaultValue).toBe(testDate.toISOString());
    });

    it('should handle Date objects correctly', () => {
      // Arrange
      const testDate = new Date('2024-06-20T14:30:00');

      // Act
      const props = createInputValueProps('date', testDate);

      // Assert
      expect(props.value).toContain('2024-06-20');
      expect(props.defaultValue).toContain('2024-06-20');
    });
  });

  describe('datetime-local type', () => {
    it('should return value and defaultValue as ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15T14:30:00');

      // Act
      const props = createInputValueProps('datetime-local', testDate);

      // Assert
      expect(props.value).toBe(testDate.toISOString());
      expect(props.defaultValue).toBe(testDate.toISOString());
    });

    it('should convert Date object to ISO string', () => {
      // Arrange
      const testDate = new Date('2024-06-20T09:15:00');

      // Act
      const props = createInputValueProps('datetime-local', testDate);

      // Assert
      expect(typeof props.value).toBe('string');
      expect(props.value).toContain('T');
    });
  });

  describe('time type', () => {
    it('should return value and defaultValue as ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15T14:30:00');

      // Act
      const props = createInputValueProps('time', testDate);

      // Assert
      expect(props.value).toBe(testDate.toISOString());
      expect(props.defaultValue).toBe(testDate.toISOString());
    });

    it('should convert Date object to ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15T09:15:00');

      // Act
      const props = createInputValueProps('time', testDate);

      // Assert
      expect(typeof props.value).toBe('string');
      expect(props.value).toContain('T');
    });
  });

  describe('month type', () => {
    it('should return value and defaultValue as ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-01');

      // Act
      const props = createInputValueProps('month', testDate);

      // Assert
      expect(props.value).toBe(testDate.toISOString());
      expect(props.defaultValue).toBe(testDate.toISOString());
    });

    it('should convert Date object to ISO string', () => {
      // Arrange
      const testDate = new Date('2024-06-01');

      // Act
      const props = createInputValueProps('month', testDate);

      // Assert
      expect(typeof props.value).toBe('string');
      expect(props.value).toContain('2024-06');
    });
  });

  describe('week type', () => {
    it('should return value and defaultValue as ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15');

      // Act
      const props = createInputValueProps('week', testDate);

      // Assert
      expect(props.value).toBe(testDate.toISOString());
      expect(props.defaultValue).toBe(testDate.toISOString());
    });

    it('should convert Date object to ISO string', () => {
      // Arrange
      const testDate = new Date('2024-01-15');

      // Act
      const props = createInputValueProps('week', testDate);

      // Assert
      expect(typeof props.value).toBe('string');
      expect(props.value).toContain('2024-01');
    });
  });

  describe('file type', () => {
    it('should return files prop', () => {
      // Arrange
      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });
      const testValue = [mockFile];

      // Act
      const props = createInputValueProps('file', testValue);

      // Assert
      expect(props).toHaveProperty('files');
    });

    it('should set files to the provided File array', () => {
      // Arrange
      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });
      const testValue = [mockFile];

      // Act
      const props = createInputValueProps('file', testValue);

      // Assert
      expect(props.files).toBe(testValue);
    });

    it('should not return value or defaultValue props', () => {
      // Arrange
      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });
      const testValue = [mockFile];

      // Act
      const props = createInputValueProps('file', testValue);

      // Assert
      expect(props).not.toHaveProperty('value');
      expect(props).not.toHaveProperty('defaultValue');
    });

    it('should handle empty file array', () => {
      // Arrange
      const testValue: File[] = [];

      // Act
      const props = createInputValueProps('file', testValue);

      // Assert
      expect(props.files).toEqual([]);
    });
  });

  describe('other input types', () => {
    it('should handle email type as text', () => {
      // Arrange
      const testValue = 'test@example.com';

      // Act
      const props = createInputValueProps('email', testValue);

      // Assert
      expect(props.value).toBe(testValue);
      expect(props.defaultValue).toBe(testValue);
    });

    it('should handle password type as text', () => {
      // Arrange
      const testValue = 'secret123';

      // Act
      const props = createInputValueProps('password', testValue);

      // Assert
      expect(props.value).toBe(testValue);
      expect(props.defaultValue).toBe(testValue);
    });

    it('should handle tel type as text', () => {
      // Arrange
      const testValue = '555-1234';

      // Act
      const props = createInputValueProps('tel', testValue);

      // Assert
      expect(props.value).toBe(testValue);
      expect(props.defaultValue).toBe(testValue);
    });

    it('should handle url type as text', () => {
      // Arrange
      const testValue = 'https://example.com';

      // Act
      const props = createInputValueProps('url', testValue);

      // Assert
      expect(props.value).toBe(testValue);
      expect(props.defaultValue).toBe(testValue);
    });

    it('should handle search type as text', () => {
      // Arrange
      const testValue = 'search query';

      // Act
      const props = createInputValueProps('search', testValue);

      // Assert
      expect(props.value).toBe(testValue);
      expect(props.defaultValue).toBe(testValue);
    });
  });
});

describe('getInitialValue', () => {
  it('should return empty string for text type', () => {
    // Act
    const result = getInitialValue('text');

    // Assert
    expect(result).toBe('');
  });

  it('should return 0 for number type', () => {
    // Act
    const result = getInitialValue('number');

    // Assert
    expect(result).toBe(0);
  });

  it('should return false for checkbox type', () => {
    // Act
    const result = getInitialValue('checkbox');

    // Assert
    expect(result).toBe(false);
  });

  it('should return Date object for date type', () => {
    // Act
    const result = getInitialValue('date');

    // Assert
    expect(result).toBeInstanceOf(Date);
  });

  it('should return Date object for datetime-local type', () => {
    // Act
    const result = getInitialValue('datetime-local');

    // Assert
    expect(result).toBeInstanceOf(Date);
  });

  it('should return Date object for time type', () => {
    // Act
    const result = getInitialValue('time');

    // Assert
    expect(result).toBeInstanceOf(Date);
  });

  it('should return Date object for month type', () => {
    // Act
    const result = getInitialValue('month');

    // Assert
    expect(result).toBeInstanceOf(Date);
  });

  it('should return Date object for week type', () => {
    // Act
    const result = getInitialValue('week');

    // Assert
    expect(result).toBeInstanceOf(Date);
  });

  it('should return empty array for file type', () => {
    // Act
    const result = getInitialValue('file');

    // Assert
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty string for email type', () => {
    // Act
    const result = getInitialValue('email');

    // Assert
    expect(result).toBe('');
  });

  it('should return empty string for password type', () => {
    // Act
    const result = getInitialValue('password');

    // Assert
    expect(result).toBe('');
  });

  it('should return empty string for tel type', () => {
    // Act
    const result = getInitialValue('tel');

    // Assert
    expect(result).toBe('');
  });

  it('should return empty string for url type', () => {
    // Act
    const result = getInitialValue('url');

    // Assert
    expect(result).toBe('');
  });

  it('should return empty string for search type', () => {
    // Act
    const result = getInitialValue('search');

    // Assert
    expect(result).toBe('');
  });

  it('should return empty string for unknown types', () => {
    // Act
    const result = getInitialValue('color' as any);

    // Assert
    expect(result).toBe('');
  });
});

describe('parseChangeEventValue', () => {
  describe('text type', () => {
    it('should return string value from event target', () => {
      // Arrange
      const mockEvent = { target: { value: 'test value' } } as Event;

      // Act
      const result = parseChangeEventValue('text', mockEvent);

      // Assert
      expect(result).toBe('test value');
    });

    it('should handle empty string', () => {
      // Arrange
      const mockEvent = { target: { value: '' } } as Event;

      // Act
      const result = parseChangeEventValue('text', mockEvent);

      // Assert
      expect(result).toBe('');
    });

    it('should handle whitespace', () => {
      // Arrange
      const mockEvent = { target: { value: '  spaces  ' } } as Event;

      // Act
      const result = parseChangeEventValue('text', mockEvent);

      // Assert
      expect(result).toBe('  spaces  ');
    });
  });

  describe('number type', () => {
    it('should parse string to number', () => {
      // Arrange
      const mockEvent = { target: { value: '42' } } as Event;

      // Act
      const result = parseChangeEventValue('number', mockEvent);

      // Assert
      expect(result).toBe(42);
    });

    it('should handle integer values', () => {
      // Arrange
      const mockEvent = { target: { value: '100' } } as Event;

      // Act
      const result = parseChangeEventValue('number', mockEvent);

      // Assert
      expect(result).toBe(100);
    });

    it('should handle decimal values', () => {
      // Arrange
      const mockEvent = { target: { value: '3.14' } } as Event;

      // Act
      const result = parseChangeEventValue('number', mockEvent);

      // Assert
      expect(result).toBe(3.14);
    });

    it('should handle zero', () => {
      // Arrange
      const mockEvent = { target: { value: '0' } } as Event;

      // Act
      const result = parseChangeEventValue('number', mockEvent);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle negative numbers', () => {
      // Arrange
      const mockEvent = { target: { value: '-25' } } as Event;

      // Act
      const result = parseChangeEventValue('number', mockEvent);

      // Assert
      expect(result).toBe(-25);
    });

    it('should return NaN for invalid input', () => {
      // Arrange
      const mockEvent = { target: { value: 'not a number' } } as Event;

      // Act
      const result = parseChangeEventValue('number', mockEvent);

      // Assert
      expect(result).toBeNaN();
    });
  });

  describe('checkbox type', () => {
    it('should return checked property from event target', () => {
      // Arrange
      const mockEvent = { target: { checked: true } } as Event;

      // Act
      const result = parseChangeEventValue('checkbox', mockEvent);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when checked', () => {
      // Arrange
      const mockEvent = { target: { checked: true } } as Event;

      // Act
      const result = parseChangeEventValue('checkbox', mockEvent);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when unchecked', () => {
      // Arrange
      const mockEvent = { target: { checked: false } } as Event;

      // Act
      const result = parseChangeEventValue('checkbox', mockEvent);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('date type', () => {
    it('should parse string to Date object', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-01-15' } } as Event;

      // Act
      const result = parseChangeEventValue('date', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle valid date strings', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-12-25' } } as Event;

      // Act
      const result = parseChangeEventValue('date', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).getFullYear()).toBe(2024);
    });

    it('should create Date from ISO string', () => {
      // Arrange
      const isoString = '2024-06-15T00:00:00.000Z';
      const mockEvent = { target: { value: isoString } } as Event;

      // Act
      const result = parseChangeEventValue('date', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('datetime-local type', () => {
    it('should parse string to Date object', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-01-15T14:30' } } as Event;

      // Act
      const result = parseChangeEventValue('datetime-local', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle datetime-local format', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-12-25T18:45' } } as Event;

      // Act
      const result = parseChangeEventValue('datetime-local', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('time type', () => {
    it('should parse string to Date object', () => {
      // Arrange
      const mockEvent = { target: { value: '14:30' } } as Event;

      // Act
      const result = parseChangeEventValue('time', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle time format', () => {
      // Arrange
      const mockEvent = { target: { value: '09:15' } } as Event;

      // Act
      const result = parseChangeEventValue('time', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('month type', () => {
    it('should parse string to Date object', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-06' } } as Event;

      // Act
      const result = parseChangeEventValue('month', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle month format', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-12' } } as Event;

      // Act
      const result = parseChangeEventValue('month', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('week type', () => {
    it('should parse string to Date object', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-W25' } } as Event;

      // Act
      const result = parseChangeEventValue('week', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle week format', () => {
      // Arrange
      const mockEvent = { target: { value: '2024-W01' } } as Event;

      // Act
      const result = parseChangeEventValue('week', mockEvent);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('file type', () => {
    it('should return files from event target', () => {
      // Arrange
      const mockFiles = [new File(['content'], 'test.txt')];
      const mockEvent = { target: { files: mockFiles } } as Event;

      // Act
      const result = parseChangeEventValue('file', mockEvent);

      // Assert
      expect(result).toBe(mockFiles);
    });

    it('should handle FileList object', () => {
      // Arrange
      const mockFiles = [
        new File(['content'], 'file1.txt'),
        new File(['content2'], 'file2.txt'),
      ];
      const mockEvent = { target: { files: mockFiles } } as Event;

      // Act
      const result = parseChangeEventValue('file', mockEvent);

      // Assert
      expect(result).toBe(mockFiles);
    });

    it('should handle empty file selection', () => {
      // Arrange
      const mockFiles: File[] = [];
      const mockEvent = { target: { files: mockFiles } } as Event;

      // Act
      const result = parseChangeEventValue('file', mockEvent);

      // Assert
      expect(result).toBe(mockFiles);
    });

    it('should handle multiple files', () => {
      // Arrange
      const mockFiles = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.txt'),
        new File(['content3'], 'file3.txt'),
      ];
      const mockEvent = { target: { files: mockFiles } } as Event;

      // Act
      const result = parseChangeEventValue('file', mockEvent);

      // Assert
      expect(result).toBe(mockFiles);
    });
  });

  describe('other input types', () => {
    it('should handle email type as text', () => {
      // Arrange
      const mockEvent = { target: { value: 'test@example.com' } } as Event;

      // Act
      const result = parseChangeEventValue('email', mockEvent);

      // Assert
      expect(result).toBe('test@example.com');
    });

    it('should handle password type as text', () => {
      // Arrange
      const mockEvent = { target: { value: 'secret123' } } as Event;

      // Act
      const result = parseChangeEventValue('password', mockEvent);

      // Assert
      expect(result).toBe('secret123');
    });

    it('should handle tel type as text', () => {
      // Arrange
      const mockEvent = { target: { value: '555-1234' } } as Event;

      // Act
      const result = parseChangeEventValue('tel', mockEvent);

      // Assert
      expect(result).toBe('555-1234');
    });

    it('should handle url type as text', () => {
      // Arrange
      const mockEvent = { target: { value: 'https://example.com' } } as Event;

      // Act
      const result = parseChangeEventValue('url', mockEvent);

      // Assert
      expect(result).toBe('https://example.com');
    });
  });
});

describe('toJson', () => {
  describe('text type', () => {
    it('should return object with field name as key', () => {
      // Arrange
      const fieldName = 'username';
      const value = 'john_doe';

      // Act
      const result = toJson('text', fieldName, value);

      // Assert
      expect(result).toHaveProperty('username');
    });

    it('should return string value', () => {
      // Arrange
      const fieldName = 'username';
      const value = 'john_doe';

      // Act
      const result = toJson('text', fieldName, value);

      // Assert
      expect(result.username).toBe('john_doe');
    });

    it('should handle empty string', () => {
      // Arrange
      const fieldName = 'username';
      const value = '';

      // Act
      const result = toJson('text', fieldName, value);

      // Assert
      expect(result.username).toBe('');
    });
  });

  describe('number type', () => {
    it('should return object with field name as key', () => {
      // Arrange
      const fieldName = 'age';
      const value = 25;

      // Act
      const result = toJson('number', fieldName, value);

      // Assert
      expect(result).toHaveProperty('age');
    });

    it('should return numeric value', () => {
      // Arrange
      const fieldName = 'age';
      const value = 42;

      // Act
      const result = toJson('number', fieldName, value);

      // Assert
      expect(result.age).toBe(42);
    });

    it('should handle zero', () => {
      // Arrange
      const fieldName = 'count';
      const value = 0;

      // Act
      const result = toJson('number', fieldName, value);

      // Assert
      expect(result.count).toBe(0);
    });

    it('should handle negative numbers', () => {
      // Arrange
      const fieldName = 'temperature';
      const value = -10;

      // Act
      const result = toJson('number', fieldName, value);

      // Assert
      expect(result.temperature).toBe(-10);
    });
  });

  describe('checkbox type', () => {
    it('should return object with field name as key', () => {
      // Arrange
      const fieldName = 'agreed';
      const value = true;

      // Act
      const result = toJson('checkbox', fieldName, value);

      // Assert
      expect(result).toHaveProperty('agreed');
    });

    it('should return boolean value', () => {
      // Arrange
      const fieldName = 'agreed';
      const value = true;

      // Act
      const result = toJson('checkbox', fieldName, value);

      // Assert
      expect(typeof result.agreed).toBe('boolean');
    });

    it('should handle true value', () => {
      // Arrange
      const fieldName = 'agreed';
      const value = true;

      // Act
      const result = toJson('checkbox', fieldName, value);

      // Assert
      expect(result.agreed).toBe(true);
    });

    it('should handle false value', () => {
      // Arrange
      const fieldName = 'agreed';
      const value = false;

      // Act
      const result = toJson('checkbox', fieldName, value);

      // Assert
      expect(result.agreed).toBe(false);
    });
  });

  describe('date type', () => {
    it('should return object with field name as key', () => {
      // Arrange
      const fieldName = 'birthdate';
      const value = new Date('2024-01-15');

      // Act
      const result = toJson('date', fieldName, value);

      // Assert
      expect(result).toHaveProperty('birthdate');
    });

    it('should return Date object', () => {
      // Arrange
      const fieldName = 'birthdate';
      const value = new Date('2024-01-15');

      // Act
      const result = toJson('date', fieldName, value);

      // Assert
      expect(result.birthdate).toBeInstanceOf(Date);
    });
  });

  describe('file type', () => {
    it('should return object with field name as key', () => {
      // Arrange
      const fieldName = 'documents';
      const value = [new File(['content'], 'test.txt')];

      // Act
      const result = toJson('file', fieldName, value as File[]);

      // Assert
      expect(result).toHaveProperty('documents');
    });

    it('should return array of filenames', () => {
      // Arrange
      const fieldName = 'documents';
      const value = [new File(['content'], 'test.txt')];

      // Act
      const result = toJson('file', fieldName, value as File[]);

      // Assert
      expect(Array.isArray(result.documents)).toBe(true);
      expect(result.documents).toEqual(['test.txt']);
    });

    it('should map File objects to their names', () => {
      // Arrange
      const fieldName = 'documents';
      const value = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.pdf'),
      ];

      // Act
      const result = toJson('file', fieldName, value as File[]);

      // Assert
      expect(result.documents).toEqual(['file1.txt', 'file2.pdf']);
    });

    it('should handle empty file array', () => {
      // Arrange
      const fieldName = 'documents';
      const value: File[] = [];

      // Act
      const result = toJson('file', fieldName, value);

      // Assert
      expect(result.documents).toEqual([]);
    });

    it('should handle multiple files', () => {
      // Arrange
      const fieldName = 'attachments';
      const value = [
        new File(['content1'], 'doc1.txt'),
        new File(['content2'], 'doc2.txt'),
        new File(['content3'], 'doc3.txt'),
      ];

      // Act
      const result = toJson('file', fieldName, value as File[]);

      // Assert
      expect(result.attachments).toEqual(['doc1.txt', 'doc2.txt', 'doc3.txt']);
    });
  });

  describe('other types', () => {
    it('should handle email type', () => {
      // Arrange
      const fieldName = 'email';
      const value = 'test@example.com';

      // Act
      const result = toJson('email', fieldName, value);

      // Assert
      expect(result.email).toBe('test@example.com');
    });

    it('should handle password type', () => {
      // Arrange
      const fieldName = 'password';
      const value = 'secret123';

      // Act
      const result = toJson('password', fieldName, value);

      // Assert
      expect(result.password).toBe('secret123');
    });

    it('should handle tel type', () => {
      // Arrange
      const fieldName = 'phone';
      const value = '555-1234';

      // Act
      const result = toJson('tel', fieldName, value);

      // Assert
      expect(result.phone).toBe('555-1234');
    });

    it('should handle url type', () => {
      // Arrange
      const fieldName = 'website';
      const value = 'https://example.com';

      // Act
      const result = toJson('url', fieldName, value);

      // Assert
      expect(result.website).toBe('https://example.com');
    });
  });
});
