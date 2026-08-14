self.onmessage = event => {
  try {
    self.postMessage({ id: event.data.id, text: JSON.stringify(event.data.value, null, event.data.pretty ? 2 : 0) });
  } catch (error) {
    self.postMessage({ id: event.data.id, error: error.message || 'JSON serialization failed' });
  }
};
