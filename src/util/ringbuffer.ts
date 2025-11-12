export class RingBuffer<T> {
  private buf: Array<T | undefined>;
  private head = 0;
  private size = 0;
  private capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error('capacity must be > 0');
    this.capacity = capacity;
    this.buf = new Array<T | undefined>(capacity);
  }

  push(v: T) {
    this.buf[(this.head + this.size) % this.capacity] = v;
    if (this.size < this.capacity) this.size++;
    else this.head = (this.head + 1) % this.capacity;
  }

  toArray(): T[] {
    const out: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const idx = (this.head + i) % this.capacity;
      const v = this.buf[idx];
      if (v !== undefined) out.push(v);
    }
    return out;
  }

  setCapacity(n: number) {
    if (n <= 0) throw new Error('capacity must be > 0');
    const items = this.toArray();
    this.buf = new Array<T | undefined>(n);
    this.head = 0;
    this.size = 0;
    this.capacity = n;
    for (const it of items.slice(-n)) this.push(it);
  }

  get length() {
    return this.size;
  }
  get capacityValue() {
    return this.capacity;
  }
}
