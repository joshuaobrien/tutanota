window.hotReload = () => {
	for (let [name] of System.entries()) {
		System.delete(name)
	}
	System.import('./app.js')
}
window.hotReload()
