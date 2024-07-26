declare function $prop<T = any>(defaultValue?: T): T & { as(alias: string): T };
declare namespace $prop {
	function rest<T extends Record<string, unknown>>(): T;

	function bindable<T>(defaultValue?: T): T & { as(alias: string): any };
}
