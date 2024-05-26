String.prototype.template = function (d) {
	return this.replace(/\{([^\}]+)\}/g, function (m, n) {
		var o = d, p = n.split('|')[0].split('.');
		for (var i = 0; i < p.length; i++) {
			o = typeof o[p[i]] === "function" ? o[p[i]]() : o[p[i]];
			if (typeof o === "undefined" || o === null) return n.indexOf('|') !== -1 ? n.split('|')[1] : m;
		}
		return o;
	})
};

String.prototype.nodeFromTemplate = function (d, containerElement = 'div') {
	const e = document.createElement(containerElement)
	const html = this.template(d)
	e.innerHTML = html;
	return e.firstElementChild;
};
