<script lang="ts">
  import '../app.css';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { inv } from '$lib/store.svelte';
  import { lowStock } from '$lib/inventory';

  let { children } = $props();
  onMount(() => inv.init());

  const links = [
    { href: '/', label: 'Overview', d: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
    { href: '/products', label: 'Products', d: 'M21 8l-9-5-9 5v8l9 5 9-5zM3.3 7.7L12 12.5l8.7-4.8M12 12.5V21' },
    { href: '/movements', label: 'Stock moves', d: 'M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3' },
    { href: '/reports', label: 'Reports', d: 'M4 20V10m6 10V4m6 16v-7m4 7H2' }
  ];
  const isHere = (h: string) => (h === '/' ? page.url.pathname === `${base}/` || page.url.pathname === base : page.url.pathname.startsWith(`${base}${h}`));
  const alerts = $derived(inv.ready ? lowStock(inv.products).length : 0);
</script>

<a class="skip" href="#main">Skip to content</a>
<div class="shell">
  <aside class="side">
    <a class="brand" href="{base}/" aria-label="Stockroom home">
      <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#fca311"/><path d="M7 12h18v13H7zM9 7h14v5H9z" fill="none" stroke="#14213d" stroke-width="2" stroke-linejoin="round"/><path d="M13 17h6" stroke="#14213d" stroke-width="2" stroke-linecap="round"/></svg>
      Stockroom
    </a>
    <nav class="nav" aria-label="Main">
      {#each links as l}
        <a href="{base}{l.href === '/' ? '/' : l.href}" aria-current={isHere(l.href) ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={l.d} /></svg>
          {l.label}{#if l.href === '/' && alerts}<span class="sr-only"> ({alerts} alerts)</span>{/if}
        </a>
      {/each}
    </nav>
    <p class="foot">Demo data for a fictional shop. Everything stays in this browser.</p>
  </aside>
  <main class="main" id="main" tabindex="-1">
    <div class="topbar">
      <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#14213d"/><path d="M7 12h18v13H7zM9 7h14v5H9z" fill="none" stroke="#fca311" stroke-width="2" stroke-linejoin="round"/><path d="M13 17h6" stroke="#fca311" stroke-width="2" stroke-linecap="round"/></svg>
      Stockroom
    </div>
    {@render children()}
  </main>
</div>
