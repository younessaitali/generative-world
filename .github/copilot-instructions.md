# Copilot Instructions for Nuxt.js Performance Project

## Project Architecture

This is a **Nuxt.js 4** application with **@nuxt/ui** integration. The codebase follows Vue 3 Composition API patterns with TypeScript.

### Key Stack
- **Framework**: Nuxt.js 4 with Vue 3, TypeScript, auto-imports
- **UI**: @nuxt/ui (component library)
- **Tooling**: ESLint, pnpm package manager
- **Structure**: Standard Nuxt layout with `app/` directory

## Development Standards

### Core Patterns
- **ALWAYS** use Composition API + `<script setup>`, NEVER use Options API
- **ALWAYS** use TypeScript for type safety, prefer `interface` over `type` for defining types
- **ALWAYS** Keep types alongside your code
- Keep unit and integration tests alongside the file they test: `Button.vue` + `Button.spec.ts`
- **ALWAYS** use TailwindCSS classes rather than manual CSS
- **DO NOT** hard code colors, use Tailwind's color system
- **ALWAYS** use named functions when declaring methods, use arrow functions only for callbacks
- **ALWAYS** prefer named exports over default exports
- **ALWAYS** check if a function exists in VueUse before implementing custom utilities or event handlers
- ONLY add meaningful comments that explain why something is done, not what it does
- Dev server runs on `http://localhost:3000` with HMR enabled. NEVER launch it yourself

### Data Fetching & State Management
- API functions: MUST export individual functions that fetch data (`api/users.ts`, `api/posts.ts`)
- Global state: Use Pinia stores for global state (NOT data fetching)
- Data fetching: Use Pinia Colada queries (`queries/users.ts`, `queries/posts.ts`)

### Vue Component Conventions
- Name files consistently using PascalCase (`UserProfile.vue`)
- **ALWAYS** use PascalCase for component names in source code
- **ALWAYS** use TypeScript for all Vue components with `<script setup lang="ts">`
- **ALWAYS** place the `<script setup lang="ts">` tag at the top of .vue files (before template and style)
- **ALWAYS** use `useTemplateRef<ElementType>('refName')` for template refs, NOT `ref(null)`
- Compose names from the most general to the most specific: `SearchButtonClear.vue` not `ClearSearchButton.vue`
- **ALWAYS** define props with `defineProps<{ propOne: number }>()` and TypeScript types, WITHOUT `const props =`
- Use `const props =` ONLY if props are used in the script block
- Destructure props to declare default values
- **ALWAYS** define emits with `const emit = defineEmits<{ eventName: [argOne: type]; otherEvent: [] }>()` for type safety
- **ALWAYS** use camelCase in JS for props and emits, even if they are kebab-case in templates
- **ALWAYS** use kebab-case in templates for props and emits
- **ALWAYS** use the prop shorthand if possible: `<MyComponent :count />` instead of `<MyComponent :count="count" />`
- **ALWAYS** Use the shorthand for slots: `<template #default>` instead of `<template v-slot:default>`
- **ALWAYS** use explicit `<template>` tags for ALL used slots
- **ALWAYS** use `defineModel<type>({ required, get, set, default })` to define allowed v-model bindings in components

### defineModel Examples

```vue
<script setup lang="ts">
// ✅ Simple two-way binding for modelvalue
const title = defineModel<string>()

// ✅ With options and modifiers
const [title, modifiers] = defineModel<string>({
  default: 'default value',
  required: true,
  get: (value) => value.trim(), // transform value before binding
  set: (value) => {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
    return value
  },
})

// ✅ Multiple v-model bindings
const firstName = defineModel<string>('firstName')
const age = defineModel<number>('age')
</script>

<template>
  <!-- Usage: <UserForm v-model:first-name="user.firstName" v-model:age="user.age" /> -->
</template>
```

### File-Based Routing (Nuxt)
- **AVOID** files named `index.vue`, instead use a group and give them a meaningful name like `pages/(home).vue`
- **ALWAYS** use explicit names for route params: prefer `userId` over `id`, `postSlug` over `slug`, etc.
- Use `.` in filenames to create `/` without route nesting: `users.edit.vue` → `/users/edit`
- Use double brackets `[[paramName]]` for optional route parameters
- Use the `+` modifier after a closing bracket `]` to make a parameter repeatable: `/posts.[[slug]]+.vue`
- Within a page component, use `definePage()` to customize the route's properties like `meta`, `name`, `path`, `alias`, etc
- **ALWAYS** refer to the `typed-router.d.ts` file to find route names and parameters
- Prefer named route locations for type safety: `router.push({ name: '/users/[userId]', params: { userId } })`
- Pass the name of the route to `useRoute('/users/[userId]')` to get stricter types


## API Endpoint Development

- Use `defineEventHandler` for simple server API endpoints (e.g., in `server/api/`).
- For endpoints requiring input validation (query parameters, request body), use `defineValidatedEventHandler`.
  - Define validation schemas using Zod/v4 as specified in the "Input Validation" section.
- For logic that needs to be applied across multiple endpoints (e.g., authentication checks, role validation), create reusable utilities or middleware functions.
  - Encapsulate common logic within these utilities.
  - Compose these utilities within your event handlers.
  - Follow existing project patterns for creating such reusable utilities (like the pattern used for authentication checks).
- **ALWAYS** use TypeScript for type safety in your event handlers.

## Essential Commands

```bash
# Development (auto-starts on localhost:3000)
pnpm dev

# Production build
pnpm build
pnpm preview

# Install dependencies
pnpm install

# Testing
pnpm run test
pnpm exec vitest run <test-files>  # add --coverage to check missing test coverage
```

## Project Structure

```
app/
├── app.vue           # Root component with NuxtWelcome
├── pages/            # File-based routing
│   ├── (home).vue    # Index page using group for better name
│   ├── users.vue     # Layout for all routes in users/
│   └── users/
│       └── [userId].vue
├── components/       # Reusable Vue components
│   ├── ui/          # Base UI components (buttons, inputs, etc.)
│   ├── layout/      # Layout components (header, footer, sidebar)
│   └── features/    # Feature-specific components
│       └── home/    # EXAMPLE of components specific to the homepage
├── composables/      # Composition functions
├── api/             # MUST export individual functions that fetch data
│   ├── users.ts     # EXAMPLE file for user-related API functions
│   └── posts.ts     # EXAMPLE file for post-related API functions
├── stores/          # Pinia stores for global state (NOT data fetching)
├── queries/         # Pinia Colada queries for data fetching
│   ├── users.ts     # EXAMPLE file for user-related queries
│   └── posts.ts     # EXAMPLE file for post-related queries
├── plugins/         # Vue plugins
├── utils/           # Global utility pure functions
├── assets/          # Static assets
└── public/          # Public static files (favicon, robots.txt, etc.)
```

## Development Workflow

**ALWAYS** follow this workflow when implementing a new feature or fixing a bug:

1. Plan your tasks, review them with user. Include tests when possible
2. Write code, following the project structure and conventions above
3. **ALWAYS test implementations work**:
   - Write tests for logic and components
   - Use the Playwright MCP server to test like a real user
4. Stage your changes with `git add` once a feature works
5. Review changes and analyze the need of refactoring

### Testing Workflow

#### Unit and Integration Tests
- Test critical logic first
- Split the code if needed to make it testable
- Keep unit and integration tests alongside the file they test: `Button.vue` + `Button.spec.ts`

#### Using Playwright MCP Server
1. Navigate to the relevant page
2. Wait for content to load completely
3. Test primary user interactions
4. Test secondary functionality (error states, edge cases)
5. Check the JS console for errors or warnings
   - If you see errors, investigate and fix them immediately
   - If you see warnings, document them and consider fixing if they affect user experience
6. Document any bugs found and fix them immediately

## Research & Documentation
- **NEVER hallucinate or guess URLs**
- **ALWAYS** try accessing the `llms.txt` file first to find relevant documentation
- **ALWAYS** follow existing links in table of contents or documentation indices
- Verify examples and patterns from documentation before using

## Package Management
- Prefer pnpm over npm or yarn
- If the project has a package-lock.json, use npm
- If the project has a yarn.lock, use yarn
- Use aliases that automatically use the right package manager:
  - `ni` for installing packages
  - `nb` for running build scripts
  - `t` for running ALL tests
  - `nr <script-name>` to run any other build script
  - `nun` for uninstalling packages

## Key Dependencies
- Auto-imported utilities (Nuxt convention)
- @nuxt/ui components available globally
- Vue Router with typed routes
- ESLint integration for code quality
- Playwright MCP server for browser automation and testing

## MCP Servers
You have these MCP servers configured globally:
- **Playwright**: Browser automation for visual testing and UI interactions. Use this server when testing UI changes (Playwright can navigate, screenshot, and interact)

Note: These are user-level servers available in all your projects.

## Configuration Files
- `nuxt.config.ts`: Modules include @nuxt/eslint, @nuxt/ui
- `eslint.config.mjs`: Uses Nuxt's built-in ESLint config
- `tsconfig.json`: References Nuxt's generated TypeScript configs

## Commit Messages

- Use conventional commit format: `type(scope): message`
- Types include: feat, fix, docs, style, refactor, test, chore
- Keep commit messages concise but descriptive
- Reference issue numbers when applicable
- Use present tense in commit messages
