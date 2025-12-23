# @tkottke90/form-field

> A lightweight, type-safe Preact hook for effortless form field management

## 📦 Overview

`@tkottke90/form-field` eliminates the boilerplate of managing form field state in Preact applications. Instead of manually wiring up state, change handlers, and value props for each input, `useFormField` provides a complete solution in a single line of code.

Built on `@preact/signals` for optimal reactivity and performance, this library handles all HTML input types with full TypeScript support and type safety.

## ✨ Features

- 🎨 **Simple, declarative API** - One hook call per field
- 🔒 **Type-safe** - Automatic type inference based on input type
- ⚡ **Preact Signals** - Built-in reactivity and performance
- 🔄 **Reset functionality** - Built-in reset to default values
- 📤 **JSON serialization** - Easy form submission to APIs
- 🎭 **Custom elements** - Support for textarea, select, and custom components
- 📝 **Select elements** - Full support for single and multi-select with TypeScript discriminated unions

## 📥 Installation

```bash
# npm
npm install @tkottke90/form-field

# yarn
yarn add @tkottke90/form-field

# pnpm
pnpm add @tkottke90/form-field
```

**Peer Dependencies:**

- `preact` >= 10.0.0
- `@preact/signals` >= 1.0.0

## 🚀 Quick Start

```tsx
import { useFormField } from '@tkottke90/form-field';

function MyForm() {
  const username = useFormField('username', 'text');
  const age = useFormField('age', 'number', { defaultValue: 18 });
  const agreed = useFormField('agreed', 'checkbox');

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = {
      ...username.toJSON(),
      ...age.toJSON(),
      ...agreed.toJSON(),
    };

    console.log(formData); // { username: "...", age: 18, agreed: true }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={username.id}>Username</label>
      <username.element placeholder="Enter username" />

      <label htmlFor={age.id}>Age</label>
      <age.element min={0} max={120} />

      <label htmlFor={agreed.id}>
        <agreed.element />I agree to the terms
      </label>

      <button type="submit">Submit</button>
    </form>
  );
}
```

## 📚 API Reference

### `useFormField(name, type, options?)`

The main hook for creating form fields.

#### Parameters

| Parameter | Type                         | Required | Default  | Description                                                |
| --------- | ---------------------------- | -------- | -------- | ---------------------------------------------------------- |
| `name`    | `string`                     | ✅ Yes   | -        | Field name (used for `name` and `id` attributes)           |
| `type`    | `HTMLInputTypeProp`          | ❌ No    | `'text'` | Input type (see [Supported Types](#supported-input-types)) |
| `options` | `useFormFieldOptions<TType>` | ❌ No    | `{}`     | Configuration options (see below)                          |

#### Options Object

The options object uses **TypeScript discriminated unions** to provide type-safe configuration based on the element type.

##### Common Options (All Elements)

| Option         | Type                   | Description                              |
| -------------- | ---------------------- | ---------------------------------------- |
| `defaultValue` | `InputDataType<TType>` | Initial value for the field              |
| `id`           | `string`               | Custom ID (defaults to `name` parameter) |

##### Input Element Options

When `element` is **not** `'select'`:

| Option    | Type                                                | Description                                           |
| --------- | --------------------------------------------------- | ----------------------------------------------------- |
| `element` | `keyof JSX.IntrinsicElements \| ComponentType<any>` | Custom element (e.g., `'textarea'`, custom component) |

##### Select Element Options

When `element` is `'select'`:

| Option     | Type       | Description                                     |
| ---------- | ---------- | ----------------------------------------------- |
| `element`  | `'select'` | Must be `'select'` for select elements          |
| `multiple` | `boolean`  | Enable multi-select (only available for select) |

**TypeScript ensures** that `multiple` is only available when `element: 'select'`.

#### Return Value

Returns an object with the following properties:

| Property  | Type                           | Description                            |
| --------- | ------------------------------ | -------------------------------------- |
| `element` | `ComponentType`                | Renderable component for the input     |
| `name`    | `string`                       | Field name                             |
| `type`    | `HTMLInputTypeProp`            | Input type                             |
| `data`    | `Signal<InputDataType<TType>>` | Preact signal containing current value |
| `reset`   | `() => void`                   | Function to reset to default value     |
| `id`      | `string`                       | Field ID                               |
| `ref`     | `Ref`                          | Ref to underlying DOM element          |
| `toJSON`  | `() => Record<string, any>`    | Serialize to JSON object               |

### Supported Input Types

The library supports all standard HTML input types with automatic type handling:

| Type               | Data Type            | Description                          |
| ------------------ | -------------------- | ------------------------------------ |
| `'text'`           | `string`             | Text input (default)                 |
| `'number'`         | `number`             | Numeric input with automatic parsing |
| `'checkbox'`       | `boolean`            | Checkbox with `checked` prop         |
| `'date'`           | `Date`               | Date picker with Date object         |
| `'datetime-local'` | `Date`               | Date and time picker                 |
| `'time'`           | `Date`               | Time picker                          |
| `'month'`          | `Date`               | Month picker                         |
| `'week'`           | `Date`               | Week picker                          |
| `'file'`           | `File[]`             | File input with array of files       |
| `'email'`          | `string`             | Email input                          |
| `'password'`       | `string`             | Password input                       |
| `'tel'`            | `string`             | Telephone input                      |
| `'url'`            | `string`             | URL input                            |
| `'search'`         | `string`             | Search input                         |
| `'select'`         | `string \| string[]` | Select element (single or multi)     |

## 💡 Usage Examples

### Basic Text Input

```tsx
const username = useFormField('username', 'text', {
  defaultValue: 'John Doe',
});

<div>
  <label htmlFor={username.id}>Username</label>
  <username.element placeholder="Enter your username" />
  <p>Current value: {username.data.value}</p>
</div>;
```

### Number Input

```tsx
const age = useFormField('age', 'number', {
  defaultValue: 25,
});

<div>
  <label htmlFor={age.id}>Age</label>
  <age.element min={0} max={120} />
  <p>You are {age.data.value} years old</p>
</div>;
```

### Checkbox Input

```tsx
const agreed = useFormField('agreed', 'checkbox', {
  defaultValue: false,
});

<label>
  <agreed.element />I agree to the terms and conditions
</label>;

{
  agreed.data.value && <p>Thank you for agreeing!</p>;
}
```

### Date Input

```tsx
const birthdate = useFormField('birthdate', 'date', {
  defaultValue: new Date('1990-01-01'),
});

<div>
  <label htmlFor={birthdate.id}>Date of Birth</label>
  <birthdate.element />
  <p>Selected: {birthdate.data.value.toLocaleDateString()}</p>
</div>;
```

### File Input

```tsx
const documents = useFormField('documents', 'file');

<div>
  <label htmlFor={documents.id}>Upload Documents</label>
  <documents.element multiple accept=".pdf,.doc,.docx" />
  <p>Selected {documents.data.value.length} file(s)</p>
  <ul>
    {documents.data.value.map((file) => (
      <li key={file.name}>{file.name}</li>
    ))}
  </ul>
</div>;
```

### Single Select Element

```tsx
const country = useFormField('country', 'select', {
  element: 'select',
  defaultValue: 'US',
});

<div>
  <label htmlFor={country.id}>Country</label>
  <country.element>
    <option value="">Select a country</option>
    <option value="US">United States</option>
    <option value="CA">Canada</option>
    <option value="UK">United Kingdom</option>
    <option value="AU">Australia</option>
  </country.element>
  <p>Selected: {country.data.value}</p>
</div>;
```

### Multi-Select Element

```tsx
const countries = useFormField('countries', 'select', {
  element: 'select',
  multiple: true, // ✅ TypeScript-safe: only available for select
  defaultValue: ['US', 'CA'],
});

<div>
  <label htmlFor={countries.id}>
    Countries (hold Ctrl/Cmd to select multiple)
  </label>
  <countries.element size={5}>
    <option value="US">United States</option>
    <option value="CA">Canada</option>
    <option value="UK">United Kingdom</option>
    <option value="AU">Australia</option>
    <option value="DE">Germany</option>
  </countries.element>
  <p>Selected: {countries.data.value.join(', ')}</p>
</div>;
```

### Custom Element (Textarea)

```tsx
const bio = useFormField('bio', 'text', {
  element: 'textarea',
  defaultValue: '',
});

<div>
  <label htmlFor={bio.id}>Biography</label>
  <bio.element rows={5} cols={50} placeholder="Tell us about yourself..." />
  <p>{bio.data.value.length} characters</p>
</div>;
```

### Custom Component

```tsx
import { forwardRef } from 'preact/compat';

const StyledInput = forwardRef((props, ref) => (
  <input
    {...props}
    ref={ref}
    className="custom-input"
    style={{ border: '2px solid blue', padding: '8px' }}
  />
));

const email = useFormField('email', 'email', {
  element: StyledInput,
});

<div>
  <label htmlFor={email.id}>Email</label>
  <email.element placeholder="you@example.com" />
</div>;
```

### Form Submission with JSON Serialization

```tsx
function RegistrationForm() {
  const username = useFormField('username', 'text');
  const email = useFormField('email', 'email');
  const age = useFormField('age', 'number', { defaultValue: 18 });
  const country = useFormField('country', 'select', { element: 'select' });
  const interests = useFormField('interests', 'select', {
    element: 'select',
    multiple: true,
  });
  const agreed = useFormField('agreed', 'checkbox');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Combine all fields into a single object
    const formData = {
      ...username.toJSON(), // { username: "..." }
      ...email.toJSON(), // { email: "..." }
      ...age.toJSON(), // { age: 25 }
      ...country.toJSON(), // { country: "US" }
      ...interests.toJSON(), // { interests: ["sports", "music"] }
      ...agreed.toJSON(), // { agreed: true }
    };

    // Submit to API
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      console.log('Registration successful!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <username.element placeholder="Username" />
      <email.element placeholder="Email" />
      <age.element min={13} max={120} />

      <country.element>
        <option value="">Select country</option>
        <option value="US">United States</option>
        <option value="CA">Canada</option>
      </country.element>

      <interests.element size={4}>
        <option value="sports">Sports</option>
        <option value="music">Music</option>
        <option value="reading">Reading</option>
        <option value="gaming">Gaming</option>
      </interests.element>

      <label>
        <agreed.element />I agree to terms
      </label>

      <button type="submit">Register</button>
    </form>
  );
}
```

### Reset Functionality

```tsx
function ProfileForm() {
  const name = useFormField('name', 'text', { defaultValue: 'John Doe' });
  const bio = useFormField('bio', 'text', {
    element: 'textarea',
    defaultValue: 'Software developer',
  });

  const handleReset = () => {
    name.reset(); // Resets to 'John Doe'
    bio.reset(); // Resets to 'Software developer'
  };

  return (
    <form>
      <name.element />
      <bio.element rows={4} />

      <button type="button" onClick={handleReset}>
        Reset to Defaults
      </button>
    </form>
  );
}
```

### Form Validation

```tsx
function LoginForm() {
  const [validationErrors, setValidationErrors] = useState({});

  const email = useFormField('email', 'email');
  const password = useFormField('password', 'password');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const newErrors = {};
    if (!email.data.value.includes('@')) {
      newErrors.email = 'Invalid email address';
    }
    if (password.data.value.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      return;
    }

    // Clear errors and submit
    setValidationErrors({});
    // Submit...
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor={email.id}>Email</label>
        <email.element />
        {validationErrors.email && (
          <span className="error">{validationErrors.email}</span>
        )}
      </div>

      <div>
        <label htmlFor={password.id}>Password</label>
        <password.element />
        {validationErrors.password && (
          <span className="error">{validationErrors.password}</span>
        )}
      </div>

      <button type="submit">Login</button>
    </form>
  );
}
```

## 🔷 TypeScript Usage

### Type Safety with Discriminated Unions

The library uses TypeScript discriminated unions to ensure type-safe configuration:

```typescript
// ✅ Valid: multiple option available for select
const countries = useFormField('countries', 'select', {
  element: 'select',
  multiple: true, // TypeScript allows this
});

// ❌ Invalid: multiple not available for text inputs
const name = useFormField('name', 'text', {
  multiple: true, // TypeScript error!
});

// ✅ Valid: element can be any HTML element for non-select types
const bio = useFormField('bio', 'text', {
  element: 'textarea', // Works fine
});
```

### Automatic Type Inference

The hook automatically infers the correct data type based on the input type:

```typescript
const text = useFormField('name', 'text');
text.data.value; // Type: string

const num = useFormField('age', 'number');
num.data.value; // Type: number

const check = useFormField('agreed', 'checkbox');
check.data.value; // Type: boolean

const date = useFormField('birthdate', 'date');
date.data.value; // Type: Date

const files = useFormField('docs', 'file');
files.data.value; // Type: File[]

const select = useFormField('country', 'select', { element: 'select' });
select.data.value; // Type: string

const multiSelect = useFormField('countries', 'select', {
  element: 'select',
  multiple: true,
});
multiSelect.data.value; // Type: string[]
```

### Type-Safe Default Values

Default values are type-checked based on the input type:

```typescript
// ✅ Valid
const age = useFormField('age', 'number', {
  defaultValue: 25, // number
});

const agreed = useFormField('agreed', 'checkbox', {
  defaultValue: true, // boolean
});

const countries = useFormField('countries', 'select', {
  element: 'select',
  multiple: true,
  defaultValue: ['US', 'CA'], // string[]
});

// ❌ Invalid - TypeScript errors
const invalid1 = useFormField('age', 'number', {
  defaultValue: 'twenty-five', // Error: string not assignable to number
});

const invalid2 = useFormField('countries', 'select', {
  element: 'select',
  multiple: true,
  defaultValue: 'US', // Error: string not assignable to string[]
});
```

## 📊 Comparison with Traditional Approaches

### Before (Traditional React/Preact)

```tsx
function TraditionalForm() {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [country, setCountry] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      username,
      age,
      agreed,
      country,
      interests,
    };

    await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        name="age"
        type="number"
        value={age}
        onChange={(e) => setAge(Number(e.target.value))}
      />

      <input
        name="agreed"
        type="checkbox"
        checked={agreed}
        onChange={(e) => setAgreed(e.target.checked)}
      />

      <select
        name="country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      >
        <option value="US">United States</option>
        <option value="CA">Canada</option>
      </select>

      <select
        name="interests"
        multiple
        value={interests}
        onChange={(e) =>
          setInterests(Array.from(e.target.selectedOptions, (opt) => opt.value))
        }
      >
        <option value="sports">Sports</option>
        <option value="music">Music</option>
      </select>

      <button type="submit">Submit</button>
    </form>
  );
}
```

### After (With `useFormField`)

```tsx
function ModernForm() {
  const username = useFormField('username', 'text');
  const age = useFormField('age', 'number');
  const agreed = useFormField('agreed', 'checkbox');
  const country = useFormField('country', 'select', { element: 'select' });
  const interests = useFormField('interests', 'select', {
    element: 'select',
    multiple: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      ...username.toJSON(),
      ...age.toJSON(),
      ...agreed.toJSON(),
      ...country.toJSON(),
      ...interests.toJSON(),
    };

    await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <username.element />
      <age.element />
      <agreed.element />

      <country.element>
        <option value="US">United States</option>
        <option value="CA">Canada</option>
      </country.element>

      <interests.element>
        <option value="sports">Sports</option>
        <option value="music">Music</option>
      </interests.element>

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Benefits

- ✅ **90% less boilerplate** - No manual state declarations or change handlers
- ✅ **Type-safe** - Automatic type inference and validation
- ✅ **Consistent API** - Same pattern for all input types
- ✅ **Built-in features** - Reset and JSON serialization included
- ✅ **Easier to maintain** - Less code means fewer bugs
- ✅ **Better DX** - IntelliSense and autocomplete support

## 🎯 Best Practices

### 1. Use Descriptive Field Names

```tsx
// ✅ Good - clear and descriptive
const emailAddress = useFormField('emailAddress', 'email');
const phoneNumber = useFormField('phoneNumber', 'tel');

// ❌ Avoid - too generic
const field1 = useFormField('field1', 'email');
const input = useFormField('input', 'tel');
```

### 2. Provide Default Values for Better UX

```tsx
// ✅ Good - sensible defaults
const country = useFormField('country', 'select', {
  element: 'select',
  defaultValue: 'US', // Most common selection
});

const age = useFormField('age', 'number', {
  defaultValue: 18, // Minimum age
});
```

### 3. Use TypeScript for Type Safety

```tsx
// ✅ Good - explicit types when needed
interface FormData {
  username: string;
  age: number;
  interests: string[];
}

const username = useFormField('username', 'text');
const age = useFormField('age', 'number');
const interests = useFormField('interests', 'select', {
  element: 'select',
  multiple: true,
});

// TypeScript ensures correct types
const data: FormData = {
  username: username.data.value, // string
  age: age.data.value, // number
  interests: interests.data.value, // string[]
};
```

### 4. Leverage Preact Signals for Reactivity

```tsx
// ✅ Good - direct signal access for computed values
const price = useFormField('price', 'number', { defaultValue: 100 });
const quantity = useFormField('quantity', 'number', { defaultValue: 1 });

// Computed value using signals
const total = computed(() => price.data.value * quantity.data.value);

<p>Total: ${total.value}</p>;
```

### 5. Group Related Fields

```tsx
// ✅ Good - organize related fields
function AddressForm() {
  const street = useFormField('street', 'text');
  const city = useFormField('city', 'text');
  const state = useFormField('state', 'select', { element: 'select' });
  const zip = useFormField('zip', 'text');

  const getAddressData = () => ({
    ...street.toJSON(),
    ...city.toJSON(),
    ...state.toJSON(),
    ...zip.toJSON()
  });

  return (/* form fields */);
}
```

### 6. Validate Before Submission

```tsx
// ✅ Good - validate before submission
const email = useFormField('email', 'email');
const [isValid, setIsValid] = useState(true);

const validateEmail = () => {
  const valid = email.data.value.includes('@');
  setIsValid(valid);
  return valid;
};

const handleSubmit = (e) => {
  e.preventDefault();
  if (validateEmail()) {
    // Submit form
  }
};
```

### 7. Use Reset for Form Clearing

```tsx
// ✅ Good - reset all fields after successful submission
const handleSubmit = async (e) => {
  e.preventDefault();

  const response = await submitForm(/* data */);

  if (response.ok) {
    // Clear form
    username.reset();
    email.reset();
    message.reset();
  }
};
```

## 🚀 Advanced Usage

### Dynamic Form Fields

```tsx
function DynamicForm() {
  const [fieldCount, setFieldCount] = useState(1);
  const fields = Array.from({ length: fieldCount }, (_, i) =>
    useFormField(`field_${i}`, 'text')
  );

  return (
    <form>
      {fields.map((field, i) => (
        <div key={i}>
          <label>Field {i + 1}</label>
          <field.element />
        </div>
      ))}
      <button type="button" onClick={() => setFieldCount((c) => c + 1)}>
        Add Field
      </button>
    </form>
  );
}
```

### Conditional Fields

```tsx
function ConditionalForm() {
  const accountType = useFormField('accountType', 'select', {
    element: 'select',
    defaultValue: 'personal',
  });

  const companyName = useFormField('companyName', 'text');
  const taxId = useFormField('taxId', 'text');

  return (
    <form>
      <accountType.element>
        <option value="personal">Personal</option>
        <option value="business">Business</option>
      </accountType.element>

      {accountType.data.value === 'business' && (
        <>
          <companyName.element placeholder="Company Name" />
          <taxId.element placeholder="Tax ID" />
        </>
      )}
    </form>
  );
}
```

### Form State Management

```tsx
function FormWithState() {
  const username = useFormField('username', 'text');
  const email = useFormField('email', 'email');

  // Track form dirty state
  const isDirty = computed(() =>
    username.data.value !== '' || email.data.value !== ''
  );

  // Warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty.value) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (/* form */);
}
```

### Accessing the Underlying DOM Element

```tsx
function FormWithRef() {
  const username = useFormField('username', 'text');

  const focusInput = () => {
    username.ref.current?.focus();
  };

  return (
    <div>
      <username.element />
      <button type="button" onClick={focusInput}>
        Focus Username
      </button>
    </div>
  );
}
```

## 🧪 Testing

### Testing with Vitest and Testing Library

```tsx
import { render, screen, fireEvent } from '@testing-library/preact';
import { renderHook, act } from '@testing-library/preact';
import { useFormField } from '@tkottke90/form-field';

describe('useFormField', () => {
  it('should update value on change', () => {
    const { result } = renderHook(() => useFormField('test', 'text'));

    act(() => {
      result.current.data.value = 'new value';
    });

    expect(result.current.data.value).toBe('new value');
  });

  it('should reset to default value', () => {
    const { result } = renderHook(() =>
      useFormField('test', 'text', { defaultValue: 'default' })
    );

    act(() => {
      result.current.data.value = 'changed';
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data.value).toBe('default');
  });

  it('should serialize to JSON correctly', () => {
    const { result } = renderHook(() => useFormField('username', 'text'));

    act(() => {
      result.current.data.value = 'john_doe';
    });

    const json = result.current.toJSON();
    expect(json).toEqual({ username: 'john_doe' });
  });
});
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Thomas Kottke](https://github.com/tkottke90)

## 🔗 Links

- [GitHub Repository](https://github.com/tkottke90/js-helper-packages)
- [npm Package](https://www.npmjs.com/package/@tkottke90/form-field)
- [Report Issues](https://github.com/tkottke90/js-helper-packages/issues)

## 📝 Changelog

### v1.0.0 (Latest)

- ✨ Initial release
- ✅ Support for all HTML input types
- ✅ Select element support (single and multi-select)
- ✅ TypeScript discriminated unions for type safety
- ✅ Preact Signals integration
- ✅ Reset functionality
- ✅ JSON serialization
- ✅ Custom element support
- ✅ 213 comprehensive tests

## 🛠️ Development

### Building

```bash
nx build form-field
```

### Running Tests

```bash
nx test form-field
```

### Running Tests in Watch Mode

```bash
nx test form-field --watch
```

---

Made with ❤️ by [Thomas Kottke](https://github.com/tkottke90)
