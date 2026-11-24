/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    /** Set by a page to change every phone link on it, see src/lib/phone.ts. */
    line?: import('./lib/phone').Line;
  }
}
