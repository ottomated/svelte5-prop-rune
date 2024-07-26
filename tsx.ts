import { svelte2tsx } from 'svelte2tsx';

const file = await Bun.file('./src/routes/Comp.svelte');
const code = await file.text();

console.log(svelte2tsx(code).code);
