class LRU {
  constructor(size) {
    this._size = size;

    this._keys = new Array(size);
    this._values = {};
  }

  // Does promote key
  get(key) {
    if (this.hasKey(key)) {
      this._promote(key);
      return this._values[key];
    }
  }

  // Does NOT promote a key
  hasKey(key) {
    return key in this._values;
  }

  // Does promote key
  set(key, value) {
    this._promote(key);
    this._values[key] = value;
  }

  _promote(key) {
    const index = this._keys.indexOf(key);
    console.assert(this._keys.length === this._size, "Size got mangled");

    // Adding a new key, drop the tail
    if (index < 0) {
      this._keys.unshift(key);
      this._expire();
      return;
    }

    // Promoting an existing key, move to head
    if (index > 0) {
      this._keys.splice(index, 1);
      this._keys.unshift(key);
      return;
    }

    // key is already at the head
  }

  // Removes all oldest keys
  _expire() {
    for (let i = this._keys.length - 1; i >= this._size; i--) {
      const key = this._keys[i];
      if (key !== undefined) {
        delete this._values[key];
      }
      this._keys.pop();
    }
  }
}

module.exports = {
  LRU,
};
