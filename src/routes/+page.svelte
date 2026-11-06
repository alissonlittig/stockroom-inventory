<script lang="ts">
  import { base } from '$app/paths';
  import { inv } from '$lib/store.svelte';
  import { dailyFlow, lowStock, money, status, stockValue } from '$lib/inventory';

  const low = $derived(lowStock(inv.products));
  const flow = $derived(dailyFlow(inv.movements));
  const peak = $derived(Math.max(1, ...flow.map((d) => d.in + d.out)));
  const units = $derived(inv.products.reduce((s, p) => s + p.stock, 0));
  const outCount = $derived(inv.products.filter((p) => status(p) === 'out').length);
  const day = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
</script>

<svelte:head><title>Stockroom: inventory for a small shop</title></svelte:head>

<div class="head">
  <div>
    <h1>Overview</h1>
    <p>What is on the shelves, what is running out, and how stock moved over the last two weeks.</p>
  </div>
  <div class="actions"><a class="btn primary" href="{base}/movements">Record stock move</a></div>
</div>

{#if inv.ready}
  <div class="grid kpis">
    <div class="card kpi"><div class="label">Products</div><div class="val">{inv.products.length}</div></div>
    <div class="card kpi"><div class="label">Units on hand</div><div class="val">{units.toLocaleString('en-US')}</div></div>
    <div class="card kpi"><div class="label">Stock value (at cost)</div><div class="val">{money(stockValue(inv.products))}</div></div>
    <div class="card kpi" class:alert={low.length > 0}>
      <div class="label">Needs restocking</div><div class="val">{low.length}</div>
      {#if outCount}<small>{outCount} out of stock</small>{/if}
    </div>
  </div>

  <div class="grid two">
    <section class="card" aria-labelledby="flow">
      <h2 id="flow">Units moved, last 14 days</h2>
      <div class="bars" role="img" aria-label="Daily units in and out over the last 14 days. {flow.map((d) => `${day(d.day)}: ${d.in} in, ${d.out} out`).join('; ')}">
        {#each flow as d}
          <div class="bar">
            <i class="n" style="height:{(d.in / peak) * 100}%"></i>
            <i class="o" style="height:{(d.out / peak) * 100}%"></i>
          </div>
        {/each}
      </div>
      <div class="axis" aria-hidden="true">{#each flow as d}<span>{day(d.day)}</span>{/each}</div>
      <div class="legend"><span><b style="background:var(--navy)"></b>Out</span><span><b style="background:var(--amber)"></b>In</span></div>
    </section>

    <section class="card" aria-labelledby="low">
      <h2 id="low">Low stock alerts</h2>
      {#if low.length}
        <ul class="list">
          {#each low.slice(0, 6) as p (p.id)}
            <li>
              <div><div class="t">{p.name}</div><div class="s"><span class="mono">{p.sku}</span> · {p.stock} of min {p.min} {p.unit}</div></div>
              <span class="badge {status(p)}">{status(p) === 'out' ? 'Out' : 'Low'}</span>
            </li>
          {/each}
        </ul>
        {#if low.length > 6}<p class="muted" style="margin-top:12px"><a href="{base}/products">See all {low.length} in Products</a></p>{/if}
      {:else}
        <p class="empty">Every product is above its minimum.</p>
      {/if}
    </section>
  </div>
{:else}
  <p class="muted" role="status">Loading inventory…</p>
{/if}
