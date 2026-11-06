<script lang="ts">
  import { inv, download } from '$lib/store.svelte';
  import { movementsCsv } from '$lib/inventory';

  let type = $state<'in' | 'out'>('out');
  let productId = $state('');
  let qty = $state('1');
  let note = $state('');
  let error = $state('');
  let ok = $state('');

  const chosen = $derived(inv.products.find((p) => p.id === productId));
  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  function submit(e: SubmitEvent) {
    e.preventDefault();
    ok = '';
    const err = inv.move({ productId, type, qty: Number(qty), note: note.trim() });
    error = err ?? '';
    if (!err && chosen) {
      ok = `${type === 'in' ? 'Added' : 'Removed'} ${qty} ${chosen.unit}. ${chosen.name} now has ${chosen.stock}.`;
      qty = '1';
      note = '';
    }
  }
</script>

<svelte:head><title>Stock moves · Stockroom</title></svelte:head>

<div class="head">
  <div><h1>Stock moves</h1><p>Log deliveries coming in and sales or write-offs going out. Stock can never drop below zero.</p></div>
  <div class="actions"><button class="btn" onclick={() => download('stockroom-movements.csv', movementsCsv(inv.snapshot))}>Export CSV</button></div>
</div>

<div class="grid two moves">
  <form class="card" onsubmit={submit} style="display:grid;gap:16px;align-content:start">
    <h2>New movement</h2>
    <fieldset style="border:0;padding:0;margin:0;min-width:0">
      <legend class="sr-only">Movement type</legend>
      <div class="seg">
        <label><input type="radio" name="t" value="out" bind:group={type} /><span>Stock out</span></label>
        <label><input type="radio" name="t" value="in" bind:group={type} /><span>Stock in</span></label>
      </div>
    </fieldset>
    <label class="field">Product
      <select bind:value={productId} required>
        <option value="" disabled>Choose a product</option>
        {#each inv.products as p (p.id)}<option value={p.id}>{p.name} ({p.stock} {p.unit})</option>{/each}
      </select>
    </label>
    <label class="field">Quantity<input type="number" min="1" step="1" inputmode="numeric" bind:value={qty} required /></label>
    <label class="field">Note <span class="hint">optional</span><input bind:value={note} maxlength="80" placeholder={type === 'in' ? 'Supplier delivery' : 'Counter sale'} autocomplete="off" /></label>
    {#if error}<p class="err" role="alert">{error}</p>{/if}
    {#if ok}<p class="okmsg" role="status">{ok}</p>{/if}
    <button class="btn primary">Record {type === 'in' ? 'delivery' : 'sale / write-off'}</button>
  </form>

  <section class="card" aria-labelledby="hist">
    <h2 id="hist">History <span class="muted" style="font-weight:500">{inv.movements.length} entries</span></h2>
    {#if inv.ready && inv.movements.length}
      <div class="tablewrap" style="max-height:560px;overflow-y:auto">
        <table class="stack">
          <thead><tr><th>When</th><th>Product</th><th>Type</th><th class="num">Qty</th></tr></thead>
          <tbody>
            {#each inv.movements.slice(0, 60) as m (m.id)}
              {@const p = inv.products.find((x) => x.id === m.productId)}
              <tr>
                <td data-label="When">{fmt(m.at)}</td>
                <td class="name">{p?.name ?? '(deleted)'}{#if m.note}<div class="muted" style="font-weight:400;font-size:.85rem">{m.note}</div>{/if}</td>
                <td data-label="Type"><span class="badge {m.type === 'in' ? 'ok' : 'low'}">{m.type === 'in' ? 'In' : 'Out'}</span></td>
                <td class="num" data-label="Qty">{m.type === 'in' ? '+' : '−'}{m.qty}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="empty">No movements yet.</p>
    {/if}
  </section>
</div>
