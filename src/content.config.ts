import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

// -----------------------------------------------------------------------------
// Content collections. ALL copy lives here — components render from these,
// nothing is hardcoded. Every field is stubbed with a [[COPY: <key>]] marker so
// the real copy deck can be dropped in by key without touching components.
// -----------------------------------------------------------------------------

// Global site metadata (single JSON entry).
const site = defineCollection({
  loader: file('./src/content/site.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    tagline: z.string(),
    author: z.string(),
    email: z.string(),
    description: z.string(),
    // Ordered nav / route list. Also feeds the ⌘K command palette.
    nav: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        keywords: z.string().optional(),
      }),
    ),
  }),
});

// Homepage flow sections: hero → selected work → experience → contact.
// `order` controls render sequence on `/`.
const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: z.object({
    section: z.enum(['hero', 'selected-work', 'experience', 'contact']),
    order: z.number(),
    heading: z.string(),
    lede: z.string().optional(),
    note: z.string().optional(),
    // Free-form structured items for list-shaped sections (e.g. experience roles).
    items: z
      .array(
        z.object({
          title: z.string(),
          meta: z.string().optional(),
          body: z.string().optional(),
          href: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

// Project deep-dive pages. `slug` maps to /projects/<slug>.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    role: z.string().optional(),
    period: z.string().optional(),
    summary: z.string(),
    stack: z.array(z.string()).optional(),
    links: z
      .array(z.object({ label: z.string(), href: z.string() }))
      .optional(),
  }),
});

// The /now page (single markdown entry).
const now = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/now' }),
  schema: z.object({
    heading: z.string(),
    updated: z.string(),
  }),
});

export const collections = { site, sections, projects, now };
