import {
  parseTags
} from "./chunk-QXNHU4SB.js";

// shared/tag-autocomplete.js
var MAX_SUGGESTIONS = 30;
function buildTagInputSuggestions(value, tags) {
  const start = value.lastIndexOf(",") + 1;
  const partial = value.slice(start);
  const spacing = partial.match(/^\s*/)[0];
  const prefix = value.slice(0, start) + spacing;
  const query = partial.slice(spacing.length).toLowerCase();
  const used = new Set(parseTags(value.slice(0, start)).map((tag) => tag.toLowerCase()));
  const suggestions = [];
  for (const tag of tags) {
    const name = tag.toLowerCase();
    if (!used.has(name) && name.startsWith(query)) {
      const separator = start && !partial ? " " : "";
      suggestions.push(`${prefix}${separator}${tag}`);
      if (suggestions.length === MAX_SUGGESTIONS) break;
    }
  }
  return suggestions;
}
function attachTagAutocomplete({ input, datalist, status, getTags }) {
  let availableTags = [];
  let loaded = false;
  let pending;
  function render() {
    const options = buildTagInputSuggestions(input.value, availableTags).map((value) => {
      const option = input.ownerDocument.createElement("option");
      option.value = value;
      return option;
    });
    datalist.replaceChildren(...options);
  }
  async function load() {
    if (loaded || pending) return;
    const request = new AbortController();
    pending = request;
    status.textContent = "Loading tags...";
    try {
      const tags = await getTags(request.signal);
      if (pending !== request) return;
      availableTags = tags;
      render();
      loaded = true;
      status.textContent = tags.length ? `${tags.length} available tags loaded.` : "No tags are available on this site.";
    } catch (error) {
      if (pending === request) {
        status.textContent = error.message || "Tags could not be loaded.";
      }
    } finally {
      if (pending === request) pending = void 0;
    }
  }
  input.addEventListener("focus", load);
  input.addEventListener("pointerdown", load);
  input.addEventListener("input", render);
  return function reset() {
    pending?.abort();
    pending = void 0;
    loaded = false;
    availableTags = [];
    datalist.replaceChildren();
    status.textContent = "";
  };
}

export {
  attachTagAutocomplete
};
