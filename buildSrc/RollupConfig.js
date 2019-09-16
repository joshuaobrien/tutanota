const babel = require("rollup-plugin-babel")
const SystemConfig = require('./SystemConfig.js')
const commonjs = require("rollup-plugin-commonjs")

function resolveLibs() {
	return {
		name: "resolve-libs",
		resolveId(source) {
			return SystemConfig.dependencyMap[source]
		}
	}
}

module.exports = {
	input: {
		input: ["src/app.js", "src/api/worker/WorkerImpl.js"],
		plugins: [
			babel({
				plugins: [
					// Using Flow plugin and not preset to run before class-properties and avoid generating strange property code
					"@babel/plugin-transform-flow-strip-types",
					"@babel/plugin-proposal-class-properties",
					"@babel/plugin-syntax-dynamic-import"
				]
			}),
			resolveLibs(),
			commonjs({
				exclude: "src/**",
			}),
		],
	},
	output: {format: "system", dir: "build"},
}
