# Liquid Section Renderer

A Web Component that utilizes Shopify's [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering) to dynamically render Shopify sections via AJAX requests.

## Browser Support

This component works in all modern browsers. For older browser support, include the following polyfills:

- Custom Elements: Include @webcomponents/custom-elements
- URL/URLSearchParams: Include url-polyfill for IE11 support

## Basic Usage

```html
<style>
  [cloak] {
    display: none;
  }
</style>

<liquid-section-renderer
  id="exampleRenders"
  render-url="/products/example-product?variant=10101010"
  loading-selector="#loading"
  loading-class="is-loading"
  debounce="300"
  scoped="false"
>
  <!-- Single section update -->
  <button
    trigger
    section="main-product"
    destination="#product-section"
    update-mode="replace"
  >
    Update Product
  </button>

  <!-- Multiple section updates -->
  <button
    trigger
    updates='[
      {"section": "main-product", "destination": "#product-section"},
      {"section": "product-recommendations", "destination": "#recommendations"}
    ]'
    update-mode="replace"
  >
    Update Multiple Sections
  </button>

  <div id="loading" cloak>...Loading</div>
</liquid-section-renderer>
```

## Installation

Copy the contents of `liquid-section-renderer.js` into your project into the `assets/liquid-section-renderer.js` directory. Then include the JS file into your theme as follows:

```html
<script src="{{ 'liquid-section-renderer.js' | asset_url }}" defer></script>
```

## Parent Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `debounce` | `Integer` | `300` | The time to wait in milliseconds before sending request after a trigger event. |
| `history-mode` | `String` | `replace` | Controls URL history behavior. Accepts `add`/`push`, or `replace`. |
| `intersect-margin` | `Integer` | `0` | Margin in pixels around the viewport for intersection observer triggers. |
| `intersect-threshold` | `Integer` | `10` | Percentage (1-100) of element that needs to be visible to trigger intersection observer. |
| `id` | `String` | `random` | A unique identifier for the component. |
| `loading-selector` | `String` | `none` | Uses `querySelector` to find the loading element. If not set, no loading indicator will be shown. |
| `loading-class` | `String` | `none` | Class to add to loading element while loading. If unset and a `loading-selector` is provided, the component will inline `display: none`. |
| `render-url` | `String` | `location.pathname` | Specify the URL to request the section from. |
| `scoped` | `Boolean` | `true` | If set `false`, `querySelector` is scoped the entire `document`, otherwise is scoped to the component. |
| `timeout` | `Integer` | `5000` | The time to wait for a response in milliseconds before cancelling the request. |
| `update-url` | `String` | `none` | Update the URL after section is updated. |
| `update-title` | `String` | `none` | Update the page title if updating page URL. |

## Trigger Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `destination` | `String` | `none` | Uses `querySelector` for the element to update with new section content. |
| `query` | `String` | `none` | Uses `querySelector` to find element within section. If not found, uses entire section. |
| `section` | `String` | `none` | The file name reference of the section to render found in `sections/<file-name>.liquid`. |
| `trigger` | `Boolean` | `none` | Determines which element triggers a section update. |
| `trigger-init` | `Boolean` | `none` | Immediately runs at end of component initialization. |
| `trigger-intersect` | `Boolean` | `none` | Triggers when element becomes visible in viewport based on intersection observer settings. |
| `intersect-once` | `Boolean` | `true` | Controls whether the intersection observer trigger fires only once or every time it is intersecting. |
| `render-url` | `String` | `none` | Override the parent component's `render-url` for this specific trigger. |
| `update-mode` | `String` | `replace` | How the new section content is inserted. Accepts `replace`, `append`/`after`, or `prepend`/`before`. |
| `updates` | `Array` | `none` | Array of section/destination pairs for updating multiple sections. |

## Updates Array

The following are the included attributes within the `updates` array.

```html
<button
  updates='[
    {
     "destination": "#SectionId",
     "section": "section-file-name",
     "updateMode": "replace",
     "query": "[data-items]"
    }
  ]'
>
  Trigger
</button>
```

## Event Listeners

The component automatically binds appropriate events based on the trigger element as follows. To note, all events have `event.preventDefault()` applied to avoid unintended actions or form submissions.

| Element Type | Event |
|-------------|-------|
| `button` | `click` |
| `form` | `submit` |
| `input` | `input` |
| `select` | `change` |
| `textarea` | `input` |
| `*` | `click` |

## Window Events

The component dispatches the following events during the section rendering lifecycle. A randomly generated `id` is included in the detail object to differentiate events.

| Event Name | Description |
|------------|-------------|
| `liquid-render-init` | Fired when the component is initialized |
| `liquid-render-destroying` | Fired at beginning of the component being destroyed |
| `liquid-render-started` | Fired when a section render request begins |
| `liquid-render-ended` | Fired after a section render request ends |
| `liquid-render-error` | Fired when a section render request fails |

## Error Handling

The component includes built-in error handling for the following scenarios:

- If neither `updates` array nor both `section` and `destination` attributes are provided, an error will be thrown
- If the provided `updates` array structure is invalid, an error will be thrown
- If a section render request fails or times out, a `liquid-render-error` event will be dispatched

## Hiding Loading Selector on Page Load

If you have are not using classes to hide/show your loading element and wish for the component to hide it using inline `display: none`, you can use the `cloak` attribute to hide the loading element, before the component is initialized. Once the component is initialized, the `cloak` attribute will be removed from the loading element.

Apply the following CSS into your main stylesheet:

```css
[cloak] {
  display: none;
}
```

Thank add the attribute on your loading element as follows:

```html
<liquid-section-renderer
  loading-selector="#loading"
>
  <!-- Your content -->
  <div id="loading" cloak>Loading...</div>
</liquid-section-renderer>
```
