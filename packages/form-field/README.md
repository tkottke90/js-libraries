# Preact Form Field

The _React_ paradigm is interesting because it strips away a lot of the statefullnes inherent in HTML.  Instead of storing state for an input in the `<input>` element itself we are forced to store it in our own state management.  With forms this has always been a bit of a pain.

To help with that management I have created this simple hook which wraps both the input and the state management in a single hook.  This allows you to easily create a form field with a single line of code.

```tsx
import { useFormField } from '@tkottke-js-helpers/form-field';

export function MyComponent() {
  const NameInput = useFormField('name');
  const DateOfBirthInput = useFormField('dateOfBirth', 'date'); 

  return (
    <form onSubmit={(e: SubmitEvent) => {
      e.preventDefault();

      // You can access the name and value of the field directly
      console.log(NameInput.name, ': ', NameInput.data.value);

      // Or you can use the toJSON method to get a serializable object which includes the name and value
      // for use with fetch or other APIs
      console.dir({
        ...NameInput.toJSON()
      })

    }}>
      <label htmlFor={NameInput.id}>
        Name
      </label>
      <NameInput.element />

      <label htmlFor={DateOfBirthInput.id}>
        Date of Birth
      </label>
      <DateOfBirthInput.element />
    </form>
  );
}
```
## useFormField

The `useFormField` hook is the main export of this library.  It takes three arguments:

1. `name` - The name of the field.  This is used as the `name` and `id` attributes of the input element.
2. `type` - The type of the field.  This is used as the `type` attribute of the input element.  Defaults to `text`.
3. `options` - An optional object which can be used to provide a default value, error message, and custom id.
4. `options.defaultValue` - The default value of the field.  This is used as the initial value of the `data` signal.  Defaults to an empty string.
5. `options.error` - An optional error message which can be used to display an error to the user.
6. `options.id` - An optional custom id for the field.  Defaults to the `name` parameter.
7. `options.element` - An optional custom element to use instead of the default `input` element.  This can be a string representing a native element or a custom component.

The hook returns an object with the following properties:

1. `element` - A custom element which can be rendered to create the input element.  This element will automatically update the `data` signal when the user changes the value of the input.
2. `name` - The name of the field.
3. `type` - The type of the field.
4. `data` - A Preact signal which contains the current value of the field.  This signal is automatically updated when the user changes the value of the input.
5. `reset` - A function which can be called to reset the `data` signal to its initial value.
6. `id` - The id of the field.  This is either the `options.id` parameter or the `name` parameter if no custom id was provided.
7. `error` - The error message provided in the `options.error` parameter.
8. `ref` - A ref which can be passed to the `element` to gain access to the underlying input element.
9. `toJSON` - A function which can be called to get a serializable object which includes the name and value of the field.  This is useful for use with fetch or other APIs.


## Building

Run `nx build form-field` to build the library.

## Running unit tests

Run `nx test form-field` to execute the unit tests via [Vitest](https://vitest.dev/).
