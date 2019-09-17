const SystemConfig = require('./SystemConfig.js')

module.exports = {
	output: {format: "system"},
	resolveLibs: function () {
		return {
			name: "resolve-libs",
			resolveId(source) {
				return SystemConfig.dependencyMap[source]
			}
		}
	}
}
