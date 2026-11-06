<script lang="ts">
  import { inv, download } from '$lib/store.svelte';
  import { byCategory, lowStock, money, movementsCsv, productsCsv, stockValue, topMovers } from '$lib/inventory';

  const cats = $derived(byCategory(inv.products));
  const maxV = $derived(Math.max(1, ...cats.map((c) => c.value)));
  const top = $derived(topMovers(inv.snapshot));
  const maxT = $derived(Math.max(1, ...top.map((t) => t.qty)));
  const low = $derived(lowStock(inv.products));
  const retail = $derived(inv.products.reduce((s, p) => s + p.stock * p.price, 0));
  let confirmReset = $state(false);
</script>

<svelte:head><title>Reports · Stockroom</title></svelte:head>

<div class="head">
  <div><h1>Reports</h1><p>Where the money is sitting, what sells, and what to reorder. Export any of it as CSV.</p></div>
  <div class="actions">
    <button class="btn" onclick={() => download('stockroom-products.csv', productsCsv(inv.products))}>Products CSV</button>
    <button class="btn" onclick={() => download('stockroom-movements.csv', movementsCsv(inv.snapshot))}>Movements CSV</button>
    <button class="btn primary" onclick={() => download('stockroom-reorder.csv', productsCsv(low))} disabled={!low.length}>Reorder list CSV</button>
  </div>
</div>

{#if inv.ready}
  <div class="grid kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="card kpi"><div class="label">Value at cost</div><div class="val">{money(stockValue(inv.products))}</div></div>
    <div class="card kpi"><div class="label">Value at retail</div><div class="val">{money(retail)}</div></div>
    <div class="card kpi"><div class="label">Potential margin</div><div class="val">{retail ? Math.round(((retail - stockValue(inv.products)) / retail) * 100) : 0}%</div></div>
  </div>

  <div class="grid two" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))">
    <section class="card" aria-labelledby="cat">
      <h2 id="cat">Stock value by category</h2>
      <div class="hbar">
        {#each cats as c (c.category)}
          <div class="r">
            <div class="top"><span>{c.category} <span class="muted" style="font-weight:400">· {c.items} {c.items === 1 ? "item" : "items"}, {c.units} units</span></span><span>{money(c.value)}</span></div>
            <div class="track" role="presentation"><div class="fill" style="width:{(c.value / maxV) * 100}%"></div></div>
          </div>
        {/each}
      </div>
    </section>

    <section class="card" aria-labelledby="top">
      <h2 id="top">Top sellers <span class="muted" style="font-weight:500">units out</span></h2>
      {#if top.length}
        <div class="hbar">
          {#each top as t (t.product.id)}
            <div class="r">
              <div class="top"><span>{t.product.name}</span><span>{t.qty}</span></div>
              <div class="track" role="presentation"><div class="fill" style="width:{(t.qty / maxT) * 100}%;background:var(--amber)"></div></div>
            </div>
          {/each}
        </div>
      {:else}<p class="empty">No sales recorded yet.</p>{/if}
    </section>
  </div>

  <section class="card" style="margin-top:16px" aria-labelledby="re">
    <h2 id="re">Reorder list <span class="muted" style="font-weight:500">{low.length} products</span></h2>
    {#if low.length}
      <div class="tablewrap">
        <table class="stack">
          <thead><tr><th>Product</th><th class="num">On hand</th><th class="num">Minimum</th><th class="num">Suggested order</th></tr></thead>
          <tbody>
            {#each low as p (p.id)}
              <tr>
                <td class="name">{p.name}<div class="muted mono">{p.sku}</div></td>
                <td class="num" data-label="On hand">{p.stock}</td>
                <td class="num" data-label="Minimum">{p.min}</td>
                <td class="num" data-label="Suggested order"><b>{p.min * 2 - p.stock}</b> {p.unit}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:12px;font-size:.85rem">Suggested order brings each item back to twice its minimum.</p>
    {:else}<p class="empty">Nothing to reorder.</p>{/if}
  </section>

  <section class="card" style="margin-top:16px" aria-labelledby="data">
    <h2 id="data">Your data</h2>
    <p class="muted" style="margin-bottom:14px">Saved only in this browser (localStorage). Nothing is sent anywhere.</p>
    {#if confirmReset}
      <div class="actions"><span style="align-self:center;font-weight:600">Replace everything with the demo data?</span>
        <button class="btn danger" onclick={() => { inv.reset(); confirmReset = false; }}>Yes, reset</button>
        <button class="btn" onclick={() => (confirmReset = false)}>Cancel</button></div>
    {:else}
      <button class="btn" onclick={() => (confirmReset = true)}>Reset to demo data</button>
    {/if}
  </section>
{:else}
  <p class="muted" role="status">Loading…</p>
{/if}
