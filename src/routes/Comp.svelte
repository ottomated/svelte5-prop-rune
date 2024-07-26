<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	// const {
	//   title,
	//   subtitle,
	// }: {
	//   title: string;
	//   subtitle: string;
	// } = $props();
	const bindable1: string = $prop.bindable();
	const title: string = $prop('test');
	const typeError: string = $prop(1);
	const subtitle: string = $prop();
	const bound: string = $prop.bindable('fallback');
	const bound2: string = $prop.bindable('fallback').as('bounded');
	const class_: string = $prop().as('class');
	const rest: HTMLButtonAttributes = $prop.rest();

	// const {
	// 	bindable1 = $bindable(),
	// 	title = 'test',
	// 	typeError = 1,
	// 	subtitle,
	// 	bound = $bindable('fallback'),
	// 	bounded: bound2 = $bindable('fallback'),
	// 	class: class_,
	// 	...rest
	// }: {
	// 	bindable1: string;
	// 	title: string;
	// 	typeError: string;
	// 	subtitle: string;
	// 	bound: string;
	// 	bounded: string;
	// 	class: string;
	// } & HTMLButtonAttributes = $props();
</script>

<h1 class={class_}>{title}</h1>
<h2>{subtitle}</h2>
