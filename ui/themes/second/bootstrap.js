(function(){
	var link = document.createElement("link");
	link.type = "text/css";
	link.rel = "stylesheet";
	link.href = "themes/" + themeToUse + "/font/font.css";
	document.getElementsByTagName("head")[0].appendChild(link);

	var link = document.createElement("link");
	link.type = "text/css";
	link.rel = "stylesheet";
	link.href = "themes/" + themeToUse + "/css/app.css";
	document.getElementsByTagName("head")[0].appendChild(link);

	var link = document.createElement("script");
	link.type = "text/javascript";
	link.src = "themes/" + themeToUse + "/font/font.js";
	document.getElementsByTagName("head")[0].appendChild(link);
})();