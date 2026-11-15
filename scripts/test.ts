import { basename, dirname, join } from "node:path";

const root = join(import.meta.dir, "..");
const config = await Bun.file(join(root, "package.json")).json();
const packageFiles = new Set<string>();

for (const workspace of config.workspaces as string[]) {
	const glob = new Bun.Glob(`${workspace}/package.json`);
	for await (const file of glob.scan({ cwd: root })) packageFiles.add(file);
}

const packages = await Promise.all(
	[...packageFiles].sort().map(async file => {
		const config = await Bun.file(join(root, file)).json();
		return {
			name: config.name as string,
			directory: dirname(file),
			hasTests: !!config.scripts?.test
		};
	})
);

const [selection, ...extraArgs] = process.argv.slice(2);
if (extraArgs.length) {
	console.error("Usage: bun run test [package]");
	process.exit(1);
}
const selected = selection
	? packages.filter(
			pkg =>
				basename(pkg.directory) === selection || pkg.name === selection
		)
	: packages.filter(pkg => pkg.hasTests);

if (selection && selected.length === 0) {
	console.error(`Unknown package: ${selection}`);
	process.exit(1);
}
if (selection && !selected[0]?.hasTests) {
	console.error(`Package ${selection} has no test script`);
	process.exit(1);
}

async function streamOutput(
	stream: ReadableStream<Uint8Array>,
	name: string,
	output: NodeJS.WriteStream
) {
	let captured = "";
	let pending = "";
	const decoder = new TextDecoder();
	function write(chunk: string) {
		captured += chunk;
		pending += chunk;
		const lines = pending.split("\n");
		pending = lines.pop() ?? "";
		for (const line of lines) output.write(`${name}: ${line}\n`);
	}
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		write(decoder.decode(value, { stream: true }));
	}
	write(decoder.decode());
	if (pending) output.write(`${name}: ${pending}\n`);
	return captured;
}

const results = await Promise.all(
	selected.map(async pkg => {
		const process = Bun.spawn(["bun", "run", "test"], {
			cwd: join(root, pkg.directory),
			stdout: "pipe",
			stderr: "pipe"
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			streamOutput(process.stdout, pkg.name, globalThis.process.stdout),
			streamOutput(process.stderr, pkg.name, globalThis.process.stderr),
			process.exited
		]);
		return { ...pkg, stdout, stderr, exitCode };
	})
);

console.log("Test results:");
for (const result of results) {
	console.log(
		`${result.exitCode === 0 ? "PASS" : "FAIL"}  ${result.name} (${result.directory})`
	);
}

for (const result of results.filter(result => result.exitCode !== 0)) {
	console.error(`\n--- ${result.name} (${result.directory}) ---`);
	if (result.stdout) console.error(result.stdout.trimEnd());
	if (result.stderr) console.error(result.stderr.trimEnd());
}

if (results.some(result => result.exitCode !== 0)) process.exitCode = 1;
