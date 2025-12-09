// Type declarations for SCSS and CSS modules
declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Extend the Window interface for global types
declare global {
  interface Window {
    // Add any global window properties here if needed
  }
}

export {};
