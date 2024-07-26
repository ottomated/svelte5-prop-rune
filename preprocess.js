import * as acorn from 'acorn';
import { tsPlugin } from 'acorn-typescript';
import { walk } from 'zimmerframe';
import MagicString from 'magic-string';

const Parser = acorn.Parser.extend(tsPlugin({ allowSatisfies: true }));

/** @typedef {{name: string, type?: string, alias?: string, defaultValue?: import('estree').Expression, bindable: boolean, rest: boolean}} Prop */

/**
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export default function preprocess() {
	return {
		name: '@o7/runes',
		script: ({ content, attributes, filename }) => {
			if (filename.includes('node_modules')) return;
			if (filename.includes('.svelte-kit')) return;

			if (attributes.lang !== 'ts') return;
			if (!/\$prop[.(]/.test(content)) return;

			const s = new MagicString(content, { filename });

			const ast = Parser.parse(content, {
				sourceType: 'module',
				ecmaVersion: 13,
				locations: true,
			});

			/** @type {{props: Prop[], insertLoc: number | null}} */
			const state = {
				props: [],
				insertLoc: null,
			};

			walk(ast, state, {
				/**
				 * @param {import('estree').VariableDeclaration} node
				 */
				VariableDeclaration(node, { state }) {
					let declCount = node.declarations.length;

					for (const decl of node.declarations) {
						if (decl.id.type !== 'Identifier') continue;
						const prop = parseProp(decl);
						prop.name = decl.id.name;
						if (decl.id.typeAnnotation) {
							prop.type = s.original.slice(
								decl.id.typeAnnotation.typeAnnotation.start,
								decl.id.typeAnnotation.typeAnnotation.end
							);
						}
						if (!prop) continue;
						declCount--;
						state.props.push(prop);
						if (state.insertLoc === null) state.insertLoc = decl.start;
						s.remove(decl.start, decl.end);
					}
					if (declCount === 0) {
						s.remove(node.start, node.end);
					}
				},
			});
			if (state.props.length === 0) return;

			/** @type {Prop | undefined} */
			let restProp;
			for (const prop of state.props) {
				if (!prop.rest) continue;
				if (restProp) throw new Error('Only one $prop.rest() is allowed');
				restProp = prop;
			}

			const declarations = [];
			const typeDeclarations = [];

			for (const prop of state.props) {
				if (prop.rest) continue;
				const { name, alias, defaultValue, bindable, type } = prop;
				let decl;
				if (alias) decl = `${alias}: ${name}`;
				else decl = name;

				const defaultValueStr = defaultValue
					? s.original.slice(defaultValue.start, defaultValue.end)
					: '';

				if (bindable) {
					decl += ` = $bindable(${defaultValueStr})`;
				} else if (defaultValue !== undefined) {
					decl += ` = ${defaultValueStr}`;
				}
				declarations.push(decl + ',');
				typeDeclarations.push(`${name}: ${type ?? 'unknown'}`);
			}

			let restTypeDeclaration = '';
			if (restProp) {
				declarations.push(`...${restProp.name}`);
				if (restProp.type) restTypeDeclaration = ` & ${restProp.type}`;
			}

			const props = `const {
${declarations.join('\n')}
}: {
${typeDeclarations.join('\n')}
}${restTypeDeclaration} = $props();`;

			console.log(props);

			s.appendLeft(state.insertLoc, props);

			return {
				code: s.toString(),
				map: s.generateMap(),
			};
		},
	};
}

/**
 * @param {import('estree').VariableDeclarator} decl
 * @returns {Prop | undefined}
 */
function parseProp(decl) {
	if (!decl.init) return;
	if (decl.init.type !== 'CallExpression') return;

	let basePropCall = decl.init;
	/** @type {string | undefined} */
	let alias;

	// Detect $prop.as()
	if (
		decl.init.callee.type === 'MemberExpression' &&
		decl.init.callee.object.type === 'CallExpression'
	) {
		basePropCall = decl.init.callee.object;
		if (decl.init.callee.property.type !== 'Identifier') return;
		if (decl.init.callee.property.name !== 'as')
			throw new Error(
				`$prop(...).${decl.init.callee.property.name} is not supported`
			);
		const args = decl.init.arguments;
		if (args.length !== 1)
			throw new Error(`$prop(...).as(...) requires exactly one argument`);
		if (args[0].type !== 'Literal')
			throw new Error(
				`$prop(...).as(...) requires a string literal as argument`
			);
		alias = args[0].raw;
	}
	// Don't allow $prop.rest().as()
	const prop = parsePropCall(basePropCall, alias === undefined);

	prop.alias = alias;
	return prop;
}

/**
 * @param {import('estree').CallExpression} call
 * @param {boolean} acceptRest
 * @return {Prop | undefined}
 */
function parsePropCall(call, acceptRest) {
	const callee = call.callee;
	if (callee.type === 'Identifier' && callee.name === '$prop') {
		return {
			defaultValue: getDefaultValue(call),
			bindable: false,
			rest: false,
		};
	}
	if (
		callee.type !== 'MemberExpression' ||
		callee.object.type !== 'Identifier' ||
		callee.object.name !== '$prop' ||
		callee.property.type !== 'Identifier'
	)
		return;

	const property = callee.property.name;
	if (property === 'bindable') {
		return {
			defaultValue: getDefaultValue(call, '$prop.bindable'),
			bindable: true,
			rest: false,
		};
	}
	if (property === 'rest' && acceptRest) {
		if (call.arguments.length > 0)
			throw new Error(`$prop.rest does not accept arguments`);
		return {
			defaultValue: undefined,
			bindable: false,
			rest: true,
		};
	}
}

/**
 * @param {import('estree').CallExpression} call
 * @param {string} name
 * @returns {import('estree').Expression | undefined}
 */
function getDefaultValue(call, name = '$prop') {
	if (call.arguments.length > 1)
		throw new Error(`${name} only accepts one argument`);
	if (call.arguments.length === 1) {
		if (call.arguments[0].type === 'SpreadElement') {
			throw new Error(`${name} does not accept spread elements`);
		}
		return call.arguments[0];
	}
}
