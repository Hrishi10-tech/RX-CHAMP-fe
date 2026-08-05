import "@testing-library/jest-dom";

// jsdom doesn't implement matchMedia — required by next-themes and responsive hooks.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

// jsdom lacks ResizeObserver — used by Radix and Recharts.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
