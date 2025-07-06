# Liquid Section Renderer

A Web Component that utilizes Shopify's [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering) to dynamically render Shopify sections via AJAX requests. For those that are newer to the Section Rendering API, when should you consider using it? There are two most common scenarios that often overlap that include the following:

- To avoid redundant logic between Liquid and JavaScript (eg. product price display)
- Some data is easier accessible in Liquid with linked objects such as products and variants

## Browser Support

This component works in all modern browsers. For older browser support, include the following polyfills:

- Custom Elements: Include @webcomponents/custom-elements
- URL/URLSearchParams: Include url-polyfill for IE11 support

## Installation

### NPM

```bash
npm install liquid-section-renderer
yarn add liquid-section-renderer
```

To import into your project:

```js
import 'liquid-section-renderer';
```

### Manual

Copy the contents of `liquid-section-renderer/dist/liquid-section-renderer.min.js` into your project into the `assets/liquid-section-renderer.js` directory. Then include the JS file into your theme as follows:

```html
<script src="{{ 'liquid-section-renderer.js' | asset_url }}" defer></script>
```

## Examples

### Basic Usage

In the below example, this component finds the closest parent with the class `shopify-section` and replaces the section, including the `<liquid-section-renderer>` element. It also infers that to use the current page's pathname to fetch content from. If you wish to be more specific in what is replaced, then see the following examples.

```html
<section id="shopify-section-template--16489904341079__main" class="shopify-section section">
  <!-- Section content before -->

  <liquid-section-renderer>
    <button trigger>
      Click to replace Shopify section
    </button>
  </liquid-section-renderer>

  <!-- Section content after -->
</section>
```

### Render Specific URL

In the below example, this component will make a request to the specified URL using the `render-url` attribute. As well as specifying which section file (eg. `sections/main-product`) to get the data from, and where in the DOM to replace the content using the `destination` attribute. This is useful if you want to get specific content such as product data from a single product.

```html
<liquid-section-renderer
  render-url="/products/example-product?variant=10101010"
>
  <button
    trigger
    section="main-product"
    destination="#product-content"
  >
    Update Product
  </button>

  <div id="product-content">
    <!-- Content replaced here -->
  </div>
</liquid-section-renderer>
```

### Multiple Destination Updates

This example is similar to the last, but the `updates` attribute replaces the `section` and `destination` attributes. This allows you to fetch content from a single URL while fetching multiple sections and updating multiple destinations, each mapped individually. This is useful in scenarios such as using a variant selector to update price and badges separately, when updating the entire section would break events or other functionality.

```html
<liquid-section-renderer
  render-url="/products/example-product?variant=10101010"
>
  <button
    trigger
    updates='[
      {"section": "product-info", "destination": "#product-info"},
      {"section": "product-recommendations", "destination": "#recommendations"}
    ]'
    update-mode="replace"
  >
    Update Multiple
  </button>

  <div id="product-info">
    <!-- Content replaced here -->
  </div>

  <div id="recommendations">
    <!-- Content replaced here -->
  </div>
</liquid-section-renderer>
```

### Trigger on Page Initialization

In the following example, the component will trigger on page initialization. This is useful in scenarios such as using Shopify's Product Recommendations API. In this instance we would be looking for a section file named `sections/render-product-recommendation`, and the destination would be the trigger element itself.

```html
<liquid-section-renderer
  render-url="{{ routes.product_recommendations_url }}?product_id={{ product.id }}&limit=4&intent=related"
>
  <div
    trigger-init
    section="render-product-recommendation"
    destination="[data-product-recommendations]"
    data-product-recommendations
  >
    <!-- Content will be rendered here -->
  </div>
</liquid-section-renderer>
```

### Trigger with Intersection Observer

We can easily replace `trigger-init` with `trigger-intersect` to trigger the section update when the element becomes visible in the viewport. We can also use the `intersect-margin` attribute to specify in pixels how closer the element needs to be to the viewport to trigger the section update.

```html
<liquid-section-renderer
  render-url="{{ routes.product_recommendations_url }}?product_id={{ product.id }}&limit=4&intent=related"
  intersect-margin="200"
>
  <div
    trigger-intersect
    section="render-product-recommendation"
    destination="[data-product-recommendations]"
    data-product-recommendations
  >
    <!-- Content will be rendered here -->
  </div>
</liquid-section-renderer>
```

### Multiple Render URLS

In the following example demonstrates how the `render-url` can be set on the trigger element, allowing for interactions such as paginated collection pages where multiple URLs are needed.

```html
<liquid-section-renderer>
  <button
    trigger
    render-url="{{ paginate_prev_url }}"
  >
    Load previous products
  </button>

  <!-- Products grid here -->

  <button
    trigger
    render-url="{{ paginate_next_url }}"
  >
    Load next products
  </button>
</liquid-section-renderer>
```

### Dynamic Attribute Updates

The following examples demonstrates how the its possible to dynamically update attributes such as the `render-url` such as to use it with search. This example utilizes [Alpine JS](https://alpinejs.dev/) for the dynamic input data.

```html
<liquid-section-renderer
  id="Search"
  x-data="{ query: '' }"
  :render-url="`{{ routes.predictive_search_url }}?q=${query}&resources[type]=product`"
  loading-selector="#searchInput"
  loading-class="opacity-50"
>
  <div class="max-w-screen-xl mx-auto flex flex-col items-center justify-center gap-4 py-6">
    <h3>Predictive Search</h3>

    <input
      name="q"
      id="searchInput"
      x-model="query"
      class="border rounded py-2 px-6 transition-[opacity,color]"
      placeholder="Search: product name"
      section="render-predictive-search"
      destination="#searchResult"
      update-mode="replace"
      trigger
    />

    <div id="searchResult" x-show="query.length > 0"></div>
  </div>
</liquid-section-renderer>
```

## Parent Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `debounce` | `Integer` | `300` | The time to wait in milliseconds before sending request after a trigger event. |
| `history-mode` | `String` | `replace` | Controls URL history behavior. Accepts `add`/`push`, or `replace`. |
| `intersect-margin` | `Integer` | `0` | Margin in pixels around the viewport for intersection observer triggers. Helps with lazy loading sections that are close to the viewport. |
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

Apply the following CSS to your main stylesheet:

```css
[cloak] {
  display: none;
}
```

Add the attribute on your loading element as follows:

```html
<liquid-section-renderer
  loading-selector="#loading"
>
  <!-- Your content -->
  <div id="loading" cloak>Loading...</div>
</liquid-section-renderer>
```
