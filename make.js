const options = require('commander')
const Promise = require('bluebird')
const path = require("path")
const fs = Promise.Promise.promisifyAll(require("fs-extra"))
const env = require('./buildSrc/env.js')
const LaunchHtml = require('./buildSrc/LaunchHtml.js')
const SystemConfig = require('./buildSrc/SystemConfig.js')
const os = require("os")
const spawn = require('child_process').spawn
const commonjs = require("rollup-plugin-commonjs")
// const desktopBuilder = require("./buildSrc/DesktopBuilder")

const rollup = require("rollup")
const babel = require("rollup-plugin-babel")

function resolveLibs() {
	return {
		name: "resolve-libs",
		resolveId(source) {
			return SystemConfig.dependencyMap[source]
		}
	}
}

const commonInputOptions = {
	plugins: [
		babel({
			presets: ["@babel/preset-flow"],
			plugins: ["@babel/plugin-proposal-class-properties", "@babel/plugin-syntax-dynamic-import"]
		}),
		resolveLibs(),
		commonjs({
			exclude: "src/**",
			// namedExports: {
			// 	'luxon': ['DateTime'],
			// 	'./libs/luxon.js': ['DateTime']
			// }
		}),
		// commonjs({
		// 	namedExports: {
		// 		'luxon': ['DateTime'],
		// 		'./libs/luxon.js': ['DateTime']
		// 	}
		// }),
	]
}

const outputOptions = {format: "system", dir: "build", sourcemap: "inline"}

async function createHtml(env) {
	let filenamePrefix
	switch (env.mode) {
		case "App":
			filenamePrefix = "app"
			break
		case "Browser":
			filenamePrefix = "index"
			break
		case "Desktop":
			filenamePrefix = "desktop"
	}
	let imports = SystemConfig.baseDevDependencies.concat([`${filenamePrefix}Bootstrap.js`])
	await _writeFile(`./build/${filenamePrefix}Bootstrap.js`, [
		`window.whitelabelCustomizations = null`,
		`window.env = ${JSON.stringify(env, null, 2)}`,
		// `System.config(env.systemConfig)`,
		`System.import('./app.js')`
	].join("\n"))
	const html = await LaunchHtml.renderHtml(imports, env)
	await _writeFile(`./build/${filenamePrefix}.html`, html)
}

function _writeFile(targetFile, content) {
	return fs.mkdirsAsync(path.dirname(targetFile)).then(() => fs.writeFileAsync(targetFile, content, 'utf-8'))
}

function prepareAssets() {
	let restUrl
	return Promise.resolve()
	              .then(() => fs.copyAsync(path.join(__dirname, '/resources/favicon'), path.join(__dirname, '/build/images')))
	              .then(() => fs.copyAsync(path.join(__dirname, '/resources/images/'), path.join(__dirname, '/build/images')))
	              .then(() => fs.copyAsync(path.join(__dirname, '/libs'), path.join(__dirname, '/build/libs')))
	              .then(async function () {
		              if (options.stage === 'test') {
			              restUrl = 'https://test.tutanota.com'
		              } else if (options.stage === 'prod') {
			              restUrl = 'https://mail.tutanota.com'
		              } else if (options.stage === 'local') {
			              restUrl = "http://" + os.hostname().split(".")[0] + ":9000"
		              } else { // host
			              restUrl = options.host
		              }

		              await fs.copyFileAsync(path.join(__dirname, "/src/api/worker/WorkerBootstrap.js"), path.join(__dirname, '/build/WorkerBootstrap.js'))

		              return Promise.all([
			              createHtml(env.create(SystemConfig.devConfig(true), (options.stage
				              === 'local') ? null : restUrl, version, "Browser")),
			              createHtml(env.create(SystemConfig.devConfig(true), restUrl, version, "App")),
			              createHtml(env.create(SystemConfig.devConfig(false), restUrl, version, "Desktop"))
		              ])
	              })
}

async function build() {
	prepareAssets()

	const mainBundle = await rollup.rollup(Object.assign({}, commonInputOptions, {
			input: "src/app.js",
		})
	)
	await mainBundle.write(outputOptions)

	const workerBundle = await rollup.rollup(Object.assign({}, commonInputOptions, {
			input: "src/api/worker/WorkerImpl.js",
		})
	)
	await workerBundle.write(outputOptions)
}

const packageJSON = require('./package.json')
const version = packageJSON.version
let start = new Date().getTime()

options
	.usage('[options] [test|prod|local|host <url>], "local" is default')
	.arguments('[stage] [host]')
	.option('-c, --clean', 'Clean build directory')
	.option('-w, --watch', 'Watch build dir and rebuild if necessary')
	.option('-d, --desktop', 'assemble & start desktop client')
	.action(function (stage, host) {
		if (!["test", "prod", "local", "host", undefined].includes(stage)
			|| (stage !== "host" && host)
			|| (stage === "host" && !host)) {
			options.outputHelp()
			process.exit(1)
		}
		options.stage = stage || "local"
		options.host = host
	})
	.parse(process.argv)

build()

// const packageJSON = require('./package.json')
// const version = packageJSON.version
// let start = new Date().getTime()
//
// options
// 	.usage('[options] [test|prod|local|host <url>], "local" is default')
// 	.arguments('[stage] [host]')
// 	.option('-c, --clean', 'Clean build directory')
// 	.option('-w, --watch', 'Watch build dir and rebuild if necessary')
// 	.option('-d, --desktop', 'assemble & start desktop client')
// 	.action(function (stage, host) {
// 		if (!["test", "prod", "local", "host", undefined].includes(stage)
// 			|| (stage !== "host" && host)
// 			|| (stage === "host" && !host)) {
// 			options.outputHelp()
// 			process.exit(1)
// 		}
// 		options.stage = stage || "local"
// 		options.host = host
// 	})
// 	.parse(process.argv)
//
// let promise = Promise.resolve()
//
// if (options.clean) {
// 	promise = builder.clean()
// }
//
//
// let watch = !options.watch ? undefined : () => {}
//
// promise
// 	.then(prepareAssets)
// 	.then(() => builder.build(["src"], watch))
// 	.then(startDesktop)
// 	.then(() => {
// 		let now = new Date().getTime()
// 		let time = Math.round((now - start) / 1000 * 100) / 100
// 		console.log(`\n >>> Build completed in ${time}s\n`)
// 	})
// 	.then(() => {
// 		if (options.watch) {
// 			require('chokidar-socket-emitter')({port: 9082, path: 'build', relativeTo: 'build'})
// 		}
// 	})
//
// function prepareAssets() {
// 	let restUrl
// 	return Promise.resolve()
// 	              .then(() => fs.copyAsync(path.join(__dirname, '/resources/favicon'), path.join(__dirname, '/build/images')))
// 	              .then(() => fs.copyAsync(path.join(__dirname, '/resources/images/'), path.join(__dirname, '/build/images')))
// 	              .then(() => fs.copyAsync(path.join(__dirname, '/libs'), path.join(__dirname, '/build/libs')))
// 	              .then(() => {
// 		              if (options.stage === 'test') {
// 			              restUrl = 'https://test.tutanota.com'
// 		              } else if (options.stage === 'prod') {
// 			              restUrl = 'https://mail.tutanota.com'
// 		              } else if (options.stage === 'local') {
// 			              restUrl = "http://" + os.hostname().split(".")[0] + ":9000"
// 		              } else { // host
// 			              restUrl = options.host
// 		              }
//
// 		              return Promise.all([
// 			              createHtml(env.create(SystemConfig.devConfig(true), (options.stage === 'local') ? null : restUrl, version, "Browser")),
// 			              createHtml(env.create(SystemConfig.devConfig(true), restUrl, version, "App")),
// 			              createHtml(env.create(SystemConfig.devConfig(false), restUrl, version, "Desktop"))
// 		              ])
// 	              })
// }
//
// function startDesktop() {
// 	if (options.desktop) {
// 		console.log("Trying to start desktop client...")
// 		const packageJSON = require('./buildSrc/electron-package-json-template.js')(
// 			"",
// 			"0.0.1",
// 			"http://localhost:9000",
// 			path.join(__dirname, "/resources/desktop-icons/logo-solo-red.png"),
// 			false
// 		)
// 		const content = JSON.stringify(packageJSON)
// 		return fs.writeFileAsync("./build/package.json", content, 'utf-8')
// 		         .then(() => {
// 			         return desktopBuilder.trace(
// 				         ['./src/desktop/DesktopMain.js', './src/desktop/preload.js'],
// 				         __dirname,
// 				         path.join(__dirname, '/build/')
// 			         )
// 		         })
// 		         .then(() => {
// 			         spawn("/bin/sh", ["-c", "npm start"], {
// 				         stdio: ['ignore', 'inherit', 'inherit'],
// 				         detached: false
// 			         })
// 		         })
// 	}
// }
